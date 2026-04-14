import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { LogIn, Smartphone, Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithEmailAndPassword 
} from '../firebase';
import { auth } from '../firebase';
import { cn } from '../lib/utils';

export default function LoginPage() {
  const { signInWithGoogle, user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'choice' | 'phone' | 'email'>('choice');
  const [error, setError] = useState<string | null>(null);

  // Phone Auth State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  // Email Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user && profile) {
      navigate('/');
    } else if (user && !profile) {
      navigate('/register');
    }

    return () => {
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    };
  }, [user, profile, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else {
        setError(error.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber) return setError('Please enter a phone number');
    setLoading(true);
    setError(null);
    setupRecaptcha();
    const appVerifier = (window as any).recaptchaVerifier;
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      (window as any).confirmationResult = confirmationResult;
      setVerificationId(confirmationResult.verificationId);
      setStep('otp');
    } catch (error: any) {
      setError(error.message || 'Failed to send OTP');
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return setError('Please enter the OTP');
    setLoading(true);
    setError(null);
    try {
      const confirmationResult = (window as any).confirmationResult;
      await confirmationResult.confirm(otp);
    } catch (error: any) {
      setError(error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) return setError('Please fill all fields');
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setError(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center pt-12 pb-24">
      <div className="w-20 h-20 neu-surface flex items-center justify-center mb-8">
        <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-sm">
          <LogIn className="text-white" size={28} />
        </div>
      </div>

      <h2 className="text-3xl font-bold text-black uppercase tracking-widest mb-2">Welcome Back</h2>
      <p className="text-gray-400 mb-10 text-center px-4 font-medium">
        Access premium services and manage your bookings with ease.
      </p>

      {error && (
        <div className="w-full mb-6 p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-3 text-black text-sm font-bold">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div id="recaptcha-container"></div>

      <div className="w-full space-y-6">
        {authMethod === 'choice' && (
          <>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full btn-secondary flex items-center justify-center gap-3 py-4"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              )}
              <span>Continue with Google</span>
            </button>

            <button
              onClick={() => setAuthMethod('phone')}
              className="w-full btn-secondary flex items-center justify-center gap-3 py-4"
            >
              <Smartphone size={20} className="text-gray-600" />
              <span>Login with Phone Number</span>
            </button>

            <button
              onClick={() => setAuthMethod('email')}
              className="w-full btn-secondary flex items-center justify-center gap-3 py-4"
            >
              <Mail size={20} className="text-gray-600" />
              <span>Login with Email</span>
            </button>
          </>
        )}

        {authMethod === 'phone' && (
          <div className="space-y-6">
            {step === 'phone' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 px-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 234 567 890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full neu-input py-4"
                  />
                </div>
                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center gap-3 py-4"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Send OTP</span>}
                  <ArrowRight size={20} />
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 px-1">Enter OTP</label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full neu-input py-4 text-center tracking-[1em] font-bold text-xl"
                    maxLength={6}
                  />
                </div>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center gap-3 py-4"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Verify & Login</span>}
                </button>
              </>
            )}
            <button
              onClick={() => {
                setAuthMethod('choice');
                setStep('phone');
                setError(null);
              }}
              className="w-full text-sm text-gray-500 font-bold"
            >
              Back to options
            </button>
          </div>
        )}

        {authMethod === 'email' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 px-1">Email</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full neu-input py-4"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 px-1">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full neu-input py-4"
                />
              </div>
            </div>
            <button
              onClick={handleEmailLogin}
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-3 py-4"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Login</span>}
            </button>
            <button
              onClick={() => {
                setAuthMethod('choice');
                setError(null);
              }}
              className="w-full text-sm text-gray-500 font-bold"
            >
              Back to options
            </button>
          </div>
        )}

        <div className="pt-8 text-center">
          <p className="text-sm text-gray-400 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-black font-bold underline uppercase tracking-widest text-xs">
              Register Now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
