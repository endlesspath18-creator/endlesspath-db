import { z } from 'zod';

export const createOrderSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  receipt: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  type: z.enum(['booking', 'premium', 'wallet', 'registration']),
  bookingData: z.record(z.string(), z.any()).optional(),
});
