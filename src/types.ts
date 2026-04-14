export type UserRole = 'user' | 'provider' | 'admin';
export type ProviderStatus = 'pending_payment' | 'pending_approval' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  name?: string;
  email?: string;
  phone?: string;
  role: UserRole;
  photoURL?: string;
  createdAt: any;
  isPremium?: boolean;
  premiumUntil?: any;
  servicesDisabled?: boolean;
  walletBalance?: number;
  upiId?: string;
  isVerified?: boolean;
  providerStatus?: ProviderStatus;
  kycDetails?: {
    idType: string;
    idNumber: string;
    documentUrl?: string;
  };
  bankDetails?: {
    accountHolder: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  businessDetails?: {
    businessName?: string;
    experience?: string;
    address?: string;
    workingRadius?: number;
    autoAccept?: boolean;
  };
  settings?: {
    notifications?: {
      push: boolean;
      email: boolean;
      sms: boolean;
      promotional: boolean;
    };
    preferences?: {
      theme: 'light' | 'dark' | 'system';
      language: string;
      fontSize: string;
    };
  };
}

export interface PlatformConfig {
  commissionRate: number;
  providerRegistrationFee: number;
  maintenanceMode: boolean;
  currency: string;
  updatedAt: any;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  providerId: string;
  providerName?: string;
  createdAt: any;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  serviceId: string;
  serviceName?: string;
  userId: string;
  userName?: string;
  providerId: string;
  status: BookingStatus;
  bookingTime: any;
  createdAt: any;
  basePrice: number;
  platformFee: number;
  discount: number;
  totalPrice: number;
  commissionAmount: number;
  providerEarnings: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentId?: string;
}

export interface Transaction {
  orderId: string;
  paymentId?: string;
  userId: string;
  providerId?: string;
  amount: number;
  adminAmount?: number;
  providerAmount?: number;
  currency: string;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  type: 'registration' | 'booking' | 'topup' | 'payout';
  metadata?: any;
  createdAt: any;
  verifiedAt?: any;
}

export interface Refund {
  id: string;
  refundId: string;
  paymentId: string;
  amount: number;
  notes?: string;
  status: string;
  createdAt: any;
}
