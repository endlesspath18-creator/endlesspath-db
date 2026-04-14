import express from "express";
import path from "path";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import fs from "fs";
import helmet from "helmet";
import cors from "cors";
import { apiLimiter, paymentLimiter } from "./server/middleware/rateLimit.js";
import { authenticate, AuthenticatedRequest } from "./server/middleware/auth.js";
import { errorHandler } from "./server/middleware/error.js";
import logger from "./server/utils/logger.js";
import { createOrderSchema, verifyPaymentSchema } from "./server/utils/validation.js";
import CircuitBreaker from "opossum";

dotenv.config();

// Load Firebase Config
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
}

// Initialize Firebase Admin
const adminApp = !admin.apps.length 
  ? admin.initializeApp({
      projectId: firebaseConfig.projectId || process.env.VITE_FIREBASE_PROJECT_ID,
    })
  : admin.app();

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId || process.env.VITE_FIREBASE_DATABASE_ID);

const razorpay = new Razorpay({
  key_id: process.env.VITE_RAZORPAY_KEY_ID || "rzp_test_mock_key",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_test_mock_secret",
});

// Circuit Breaker for Razorpay
const razorpayBreakerOptions = {
  timeout: 5000, // 5s timeout
  errorThresholdPercentage: 50, // 50% failure rate opens the circuit
  resetTimeout: 30000, // 30s before trying again
};

const createOrderBreaker = new CircuitBreaker(async (options: any) => {
  return await razorpay.orders.create(options);
}, razorpayBreakerOptions);

createOrderBreaker.fallback(() => {
  throw new Error("Payment service is currently unavailable. Please try again later.");
});

// Idempotency Cache
const idempotencyCache = new Map<string, boolean>();

const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
}));

const allowedOrigins = [
  process.env.APP_URL,
  'https://endlesspath-db.vercel.app',
  'https://phenomenal-duckanoo-7ae04d.netlify.app',
  'https://69de63614d2ceb1a41f9db60--phenomenal-duckanoo-7ae04d.netlify.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

// Health Check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
const apiRouter = express.Router();
apiRouter.use(apiLimiter);
apiRouter.use(authenticate);

// Create Razorpay Order
apiRouter.post("/payments/create-order", paymentLimiter, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { amount, currency = "INR", receipt, metadata } = createOrderSchema.parse(req.body);
    
    const options = {
      amount: Math.round(amount),
      currency,
      receipt,
      notes: metadata,
    };

    const order = await createOrderBreaker.fire(options);
    
    // Log transaction attempt
    await db.collection('transactions').doc(order.id).set({
      orderId: order.id,
      userId: req.user?.uid,
      providerId: metadata?.providerId || null,
      amount: amount / 100, // Store in actual currency units
      currency,
      status: 'created',
      type: metadata?.type || 'unknown',
      metadata,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info('Razorpay order created', { orderId: order.id, userId: req.user?.uid });
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// Verify Razorpay Payment
apiRouter.post("/payments/verify", paymentLimiter, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      bookingData,
      type 
    } = verifyPaymentSchema.parse(req.body);

    const idempotencyKey = `payment_${razorpay_payment_id}`;
    if (idempotencyCache.has(idempotencyKey)) {
      return res.json({ status: "ok", message: "Already processed" });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_mock_secret";
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      idempotencyCache.set(idempotencyKey, true);

      const batch = db.batch();
      const transactionRef = db.collection('transactions').doc(razorpay_order_id);
      
      batch.update(transactionRef, {
        paymentId: razorpay_payment_id,
        status: 'paid',
        verifiedAt: FieldValue.serverTimestamp(),
      });

      if (type === 'booking') {
        const formattedBookingData = { ...bookingData };
        if (formattedBookingData.bookingTime) {
          formattedBookingData.bookingTime = Timestamp.fromDate(new Date(formattedBookingData.bookingTime as any));
        }
        const bookingRef = db.collection('bookings').doc();
        batch.set(bookingRef, {
          ...formattedBookingData,
          paymentStatus: 'paid',
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          userId: req.user?.uid,
          createdAt: FieldValue.serverTimestamp(),
        });

        // Update transaction with split amounts
        batch.update(transactionRef, {
          adminAmount: formattedBookingData.commissionAmount || 0,
          providerAmount: formattedBookingData.providerEarnings || 0,
          providerId: formattedBookingData.providerId,
        });
      } else if (type === 'premium' || type === 'registration') {
        const uid = req.user?.uid;
        if (!uid) throw new Error("User ID missing from token");

        const duration = bookingData?.duration || 'monthly';
        const premiumUntil = new Date();
        
        if (duration === 'monthly') {
          premiumUntil.setMonth(premiumUntil.getMonth() + 1);
        } else if (duration === 'quarterly') {
          premiumUntil.setMonth(premiumUntil.getMonth() + 3);
        } else {
          premiumUntil.setFullYear(premiumUntil.getFullYear() + 1);
        }
        
        const userRef = db.collection('users').doc(uid);
        const userUpdates: any = {
          isPremium: true,
          premiumUntil: Timestamp.fromDate(premiumUntil),
          servicesDisabled: false, // Re-enable services upon payment
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (type === 'registration') {
          userUpdates.providerStatus = 'pending_approval';
        }

        batch.update(userRef, userUpdates);
      } else if (type === 'wallet') {
        const uid = req.user?.uid;
        if (!uid) throw new Error("User ID missing from token");
        
        const amount = bookingData?.amount || 0;
        const userRef = db.collection('users').doc(uid);
        batch.update(userRef, {
          walletBalance: FieldValue.increment(amount),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      res.json({ status: "ok" });
    } else {
      await db.collection('transactions').doc(razorpay_order_id).update({
        status: 'failed',
        error: 'Invalid signature',
      });
      res.status(400).json({ error: "Invalid signature" });
    }
  } catch (error) {
    next(error);
  }
});

// Razorpay Webhook
app.post("/api/payments/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_webhook_secret";
  const signature = req.headers["x-razorpay-signature"];

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(req.body)
    .digest("hex");

  if (expectedSignature === signature) {
    const event = JSON.parse(req.body);
    logger.info('Razorpay Webhook received', { event: event.event });

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      
      // Update transaction status if not already updated by verify API
      const transactionRef = db.collection('transactions').doc(orderId);
      const doc = await transactionRef.get();
      if (doc.exists && doc.data()?.status !== 'paid') {
        await transactionRef.update({
          paymentId: payment.id,
          status: 'paid',
          method: payment.method,
          webhookProcessedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    res.json({ status: "ok" });
  } else {
    res.status(400).json({ error: "Invalid signature" });
  }
});

// Refund API
apiRouter.post("/payments/refund", async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { paymentId, amount, notes } = req.body;
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
      notes,
    });

    await db.collection('refunds').add({
      refundId: refund.id,
      paymentId,
      amount,
      notes,
      status: refund.status,
      createdAt: FieldValue.serverTimestamp(),
    });

    res.json(refund);
  } catch (error) {
    next(error);
  }
});

app.use("/api", apiRouter);

// Error Handling
app.use(errorHandler);

export default app;
