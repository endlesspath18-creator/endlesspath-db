import { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { Crown, CheckCircle2, Loader2, ShieldCheck, Zap, Sparkles, CreditCard, AlertCircle } from 'lucide-react';
import { doc, updateDoc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { processPayment } from '../lib/razorpay';
import { PlatformConfig } from '../types';

export default function PremiumPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'quarterly'>('annual');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'platformConfig', 'settings'), (snapshot) => {
      if (snapshot.exists()) {
        setPlatformConfig(snapshot.data() as PlatformConfig);
      }
    });
    return () => unsubscribe();
  }, []);

  const plans = {
    monthly: {
      id: 'monthly',
      name: 'Monthly Pro',
      price: 300,
      tax: 0, // Making it flat 300 as requested
      duration: '1 Month',
      description: 'Maintain your active status and access all features'
    }
  };

  const activePlan = plans.monthly;
  const totalAmount = activePlan.price;

  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    
    try {
      const isProviderRegistration = profile.role === 'provider' && profile.providerStatus === 'pending_payment';
      
      await processPayment({
        amount: Math.round(totalAmount * 100), // in paise
        name: isProviderRegistration ? 'Provider Registration' : 'Endless Path Pro',
        description: `${activePlan.name} Membership`,
        prefill: {
          name: profile.name,
          email: profile.email,
          contact: profile.phone || '',
        },
        handler: async (response: any) => {
          console.log('Payment Success:', response);
          
          const nextExpiry = new Date();
          nextExpiry.setMonth(nextExpiry.getMonth() + 1);

          const updates: any = {
            isPremium: true,
            premiumUntil: nextExpiry,
            servicesDisabled: false // Re-enable services upon payment
          };

          if (isProviderRegistration) {
            updates.providerStatus = 'pending_approval';
          }

          await updateDoc(doc(db, 'users', profile.uid), updates);
          await refreshProfile();
          setSuccess(true);
          setLoading(false);
          
          if (isProviderRegistration) {
            navigate('/provider');
          }
        }
      }, isProviderRegistration ? 'registration' : 'premium', {
        uid: profile.uid,
        duration: 'monthly',
        amount: totalAmount
      });
    } catch (err: any) {
      console.error('Razorpay initialization error:', err);
      setError(err.message || 'Failed to open payment gateway. Please check your connection.');
      setLoading(false);
    }
  };

  if (success || profile?.isPremium) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center shadow-sm animate-pulse">
          <Crown className="text-white" size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-black">You're Active!</h2>
          <p className="text-black font-bold uppercase tracking-widest text-sm">Endless Path Pro Member</p>
        </div>
        <div className="neu-surface p-6 w-full space-y-4">
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            <CheckCircle2 className="text-black" size={20} />
            <span>Full access to platform features</span>
          </div>
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            <CheckCircle2 className="text-black" size={20} />
            <span>Priority support enabled</span>
          </div>
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            <CheckCircle2 className="text-black" size={20} />
            <span>Verified badge active</span>
          </div>
        </div>
        <p className="text-xs text-gray-400">Your subscription is active until {profile?.premiumUntil?.toDate?.()?.toLocaleDateString() || 'next month'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-4 pb-24">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-black">Go Pro</h2>
        <p className="text-gray-400 text-sm">Maintain your active status and unlock all features.</p>
      </div>

      <div className="bg-black p-8 rounded-[32px] text-white space-y-8 shadow-sm relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
        
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">{activePlan.name}</p>
            <h3 className="text-5xl font-bold">₹{activePlan.price}</h3>
          </div>
          <Crown size={40} className="text-white/20" />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Zap size={18} />
            </div>
            <span className="font-bold">Active Service Listing</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <span className="font-bold">Verified Professional Status</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <span className="font-bold">Full Platform Access</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-xs font-bold">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">Secure Checkout</h4>
        <div className="neu-surface p-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 font-medium">Subscription Fee</span>
            <span className="text-black font-bold">₹{activePlan.price.toFixed(2)}</span>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex items-center justify-between text-lg">
            <span className="font-bold text-black">Total Amount</span>
            <span className="font-bold text-black">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full btn-primary py-5 flex items-center justify-center gap-3 text-lg"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              <span>Processing Payment...</span>
            </>
          ) : (
            <>
              <CreditCard size={24} />
              <span>Pay ₹{totalAmount.toFixed(2)} Now</span>
            </>
          )}
        </button>
        <p className="text-[10px] text-center text-gray-500 px-8">
          By clicking pay, you agree to Endless Path Terms of Service. Secure 256-bit SSL encrypted payment.
        </p>
      </div>
    </div>
  );
}
