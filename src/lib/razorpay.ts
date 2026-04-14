export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id?: string;
  handler: (response: any) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes?: Record<string, string>;
  theme: {
    color: string;
  };
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

import { auth } from '../firebase';

export const processPayment = async (options: Partial<RazorpayOptions>, type: 'booking' | 'premium' | 'wallet' | 'registration', extraData?: any) => {
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
  
  if (!key || key === 'rzp_test_mock_key') {
    console.warn('Razorpay Key ID is missing or using mock key. Payment may not open correctly.');
  }

  try {
    // Ensure Razorpay script is loaded
    if (!window.Razorpay) {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Failed to load Razorpay SDK');
    }

    const user = auth.currentUser;
    if (!user) throw new Error('User must be authenticated to process payment');
    
    const idToken = await user.getIdToken();
    const apiUrl = import.meta.env.VITE_API_URL || '';

    // 1. Create order on server
    const orderResponse = await fetch(`${apiUrl}/api/payments/create-order`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        amount: options.amount,
        currency: options.currency || 'INR',
        receipt: `receipt_${Date.now()}`,
        metadata: {
          type,
          ...extraData
        }
      }),
    });

    const contentType = orderResponse.headers.get("content-type");
    if (!orderResponse.ok) {
      let errorMessage = 'Failed to create order';
      if (contentType && contentType.includes("application/json")) {
        const errorData = await orderResponse.json();
        errorMessage = errorData.error || errorMessage;
      } else {
        const textError = await orderResponse.text();
        console.error('Server error (non-JSON):', textError);
        errorMessage = `Server Error: ${orderResponse.status} ${orderResponse.statusText}`;
      }
      throw new Error(errorMessage);
    }

    if (!contentType || !contentType.includes("application/json")) {
      throw new Error('Invalid response from server (expected JSON)');
    }

    const orderData = await orderResponse.json();

    const razorpayOptions: RazorpayOptions = {
      key,
      amount: orderData.amount,
      currency: orderData.currency,
      name: options.name || 'Endless Path',
      description: options.description || 'Payment for services',
      order_id: orderData.id,
      image: options.image || 'https://picsum.photos/seed/endlesspath/200/200',
      handler: async (response: any) => {
        // 2. Verify payment on server
        const verifyResponse = await fetch(`${apiUrl}/api/payments/verify`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            bookingData: extraData,
            type,
          }),
        });

        const verifyContentType = verifyResponse.headers.get("content-type");
        if (verifyResponse.ok) {
          if (options.handler) options.handler(response);
        } else {
          let errorMessage = 'Payment verification failed';
          if (verifyContentType && verifyContentType.includes("application/json")) {
            const errorData = await verifyResponse.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const textError = await verifyResponse.text();
            console.error('Verification error (non-JSON):', textError);
            errorMessage = `Verification Error: ${verifyResponse.status}`;
          }
          throw new Error(errorMessage);
        }
      },
      prefill: options.prefill || {
        name: '',
        email: '',
        contact: '',
      },
      theme: {
        color: '#ef4444', // accent-red
      },
      ...options,
    };

    const rzp = new window.Razorpay(razorpayOptions);
    rzp.open();
  } catch (error) {
    console.error('Error in payment process:', error);
    throw error;
  }
};
