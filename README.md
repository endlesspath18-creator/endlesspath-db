# Endless Path - Enterprise-Grade Marketplace

Endless Path is a premium marketplace application built for scalability, reliability, and security. It features a robust booking system, secure payment processing via Razorpay, and an elite provider hub.

## Key Features
- **Secure Booking System**: Real-time availability and booking with server-side verification.
- **Razorpay Integration**: PCI-DSS compliant payment processing for bookings and premium subscriptions.
- **Elite Provider Hub**: Specialized dashboard for service providers to manage requests.
- **Premium Membership**: Exclusive benefits and discounts for Pro members.

## Architecture
- **Frontend**: React 18 with Vite, Tailwind CSS, and Motion for animations.
- **Backend**: Express.js server with Firebase Admin SDK, Helmet, and Rate Limiting.
- **Database**: Firestore (Enterprise Edition) with real-time listeners.
- **Authentication**: Firebase Auth with Google Login and ID Token verification.

## Security & Reliability
- **Auth Verification**: All API requests are verified using Firebase ID Tokens.
- **Input Validation**: Strict schema validation with Zod.
- **Circuit Breakers**: Opossum circuit breakers for external payment services.
- **Rate Limiting**: DoS protection with Express Rate Limit.
- **Idempotency**: Payment verification is idempotent to prevent duplicate charges.
- **Observability**: Structured logging with Winston and health monitoring.

## Getting Started
1. Install dependencies: `npm install`
2. Configure environment variables in `.env`.
3. Start the development server: `npm run dev`

## Documentation
- [Production Readiness Checklist](PRODUCTION_READINESS.md)
- [Firestore Indexes](FIRESTORE_INDEXES.md)
- [Security Policy](SECURITY.md)
- [Contributing Guide](CONTRIBUTING.md)
