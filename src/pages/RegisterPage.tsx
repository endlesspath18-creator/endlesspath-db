import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { UserPlus, Smartphone, Mail, ArrowRight, Loader2, AlertCircle, Shield, User as UserIcon } from 'lucide-react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  createUserWithEmailAndPassword,
  updateProfile
} from '../firebase';
import { auth, db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserRole, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function RegisterPage() {
  const { signInWithGoogle, user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regMethod, setRegMethod] = useState<'choice' | 'phone' | 'email' | 'profile-setup'>('choice');

  // Common Registration State
  const [role, setRole] = useState<UserRole>('user');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Phone Auth State
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  // Email Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Provider Onboarding State
  const [kycIdType, setKycIdType] = useState('Aadhar');
  const [kycIdNumber, setKycIdNumber] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [experience, setExperience] = useState('');

  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'provider' && profile.providerStatus === 'pending_payment') {
        navigate('/premium');
      } else {
        navigate('/');
      }
    } else if (user && !profile) {
      setRegMethod('profile-setup');
      if (user.displayName) setName(user.displayName);
      if (user.phoneNumber) setPhone(user.phoneNumber);
    }
  }, [user, profile, navigate]);

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  };

  const handleGoogleReg = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setError(error.message || 'Failed to register with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone) return setError('Please enter a phone number');
    setLoading(true);
    setError(null);
    setupRecaptcha();
    const appVerifier = (window as any).recaptchaVerifier;
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);
      (window as any).confirmationResult = confirmationResult;
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

  const handleEmailReg = async () => {
    if (!email || !password || !name) return setError('Please fill all fields');
    setLoading(true);
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
    } catch (error: any) {
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetup = async () => {
    if (!user) return;
    if (!name) return setError('Please enter your name');
    
    if (role === 'provider') {
      if (!kycIdNumber || !bankAccount || !bankIfsc || !businessName) {
        return setError('Please fill all provider details');
      }
    }

    setLoading(true);
    setError(null);
    try {
      const isAdminEmail = user.email === 'endlesspath18@gmail.com';
      const newProfile: UserProfile = {
        uid: user.uid,
        name,
        email: user.email || '',
        phone: phone || user.phoneNumber || '',
        role: isAdminEmail ? 'admin' : role,
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        walletBalance: 0,
        ...(role === 'provider' && !isAdminEmail && {
          providerStatus: 'pending_payment',
          kycDetails: {
            idType: kycIdType,
            idNumber: kycIdNumber,
          },
          bankDetails: {
            accountHolder: bankHolder || name,
            accountNumber: bankAccount,
            ifscCode: bankIfsc,
            bankName: bankName,
          },
          businessDetails: {
            businessName,
            experience,
          }
        })
      };
      await setDoc(doc(db, 'users', user.uid), newProfile);
      await refreshProfile();
      
      if (role === 'provider' && !isAdminEmail) {
        navigate('/premium');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center pt-12 pb-24">
      <div className="w-20 h-20 neu-surface flex items-center justify-center mb-8">
        <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-sm">
          <UserPlus className="text-white" size={28} />
        </div>
      </div>

      <h2 className="text-3xl font-bold text-black uppercase tracking-widest mb-2">Create Account</h2>
      <p className="text-gray-400 mb-10 text-center px-4 font-medium">
        Join our community of professionals and service seekers.
      </p>

      {error && (
        <div className="w-full mb-6 p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-3 text-black text-sm font-bold">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div id="recaptcha-container"></div>

      <div className="w-full space-y-6">
        {regMethod === 'choice' && (
          <>
            <button
              onClick={handleGoogleReg}
              disabled={loading}
              className="w-full btn-secondary flex items-center justify-center gap-3 py-4"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              )}
              <span>Register with Google</span>
            </button>

            <button
              onClick={() => setRegMethod('phone')}
              className="w-full btn-secondary flex items-center justify-center gap-3 py-4"
            >
              <Smartphone size={20} className="text-gray-600" />
              <span>Register with Phone Number</span>
            </button>

            <button
              onClick={() => setRegMethod('email')}
              className="w-full btn-secondary flex items-center justify-center gap-3 py-4"
            >
              <Mail size={20} className="text-gray-600" />
              <span>Register with Email</span>
            </button>
          </>
        )}

        {regMethod === 'phone' && (
          <div className="space-y-6">
            {step === 'phone' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 px-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 234 567 890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Verify OTP</span>}
                </button>
              </>
            )}
            <button
              onClick={() => {
                setRegMethod('choice');
                setStep('phone');
                setError(null);
              }}
              className="w-full text-sm text-gray-500 font-bold"
            >
              Back to options
            </button>
          </div>
        )}

        {regMethod === 'email' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 px-1">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full neu-input py-4"
                />
              </div>
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
              onClick={handleEmailReg}
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-3 py-4"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Register</span>}
            </button>
            <button
              onClick={() => {
                setRegMethod('choice');
                setError(null);
              }}
              className="w-full text-sm text-gray-500 font-bold"
            >
              Back to options
            </button>
          </div>
        )}

        {regMethod === 'profile-setup' && (
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-center font-bold text-black uppercase tracking-widest text-xs">Almost there! Complete your profile.</p>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full neu-input py-4 font-bold text-black"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="+1 234 567 890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full neu-input py-4 font-bold text-black"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">I want to be a:</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={cn(
                      'flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300',
                      role === 'user' ? 'bg-black text-white border-black border' : 'neu-surface'
                    )}
                  >
                    <UserIcon className={role === 'user' ? 'text-white' : 'text-gray-400'} />
                    <span className={cn('text-xs font-bold uppercase tracking-widest', role === 'user' ? 'text-white' : 'text-gray-400')}>Customer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('provider')}
                    className={cn(
                      'flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300',
                      role === 'provider' ? 'bg-black text-white border-black border' : 'neu-surface'
                    )}
                  >
                    <Shield className={role === 'provider' ? 'text-white' : 'text-gray-400'} />
                    <span className={cn('text-xs font-bold uppercase tracking-widest', role === 'provider' ? 'text-white' : 'text-gray-400')}>Provider</span>
                  </button>
                </div>
              </div>

              {role === 'provider' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-6 pt-4 border-t border-gray-100"
                >
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Business Details</h4>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Business Name</label>
                      <input
                        type="text"
                        placeholder="Elite Services Co."
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full neu-input py-4 font-bold text-black"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Experience (Years)</label>
                      <input
                        type="number"
                        placeholder="5"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full neu-input py-4 font-bold text-black"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">KYC Verification</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">ID Type</label>
                        <select
                          value={kycIdType}
                          onChange={(e) => setKycIdType(e.target.value)}
                          className="w-full neu-input py-4 font-bold text-black appearance-none"
                        >
                          <option>Aadhar</option>
                          <option>PAN</option>
                          <option>Voter ID</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">ID Number</label>
                        <input
                          type="text"
                          placeholder="XXXX-XXXX-XXXX"
                          value={kycIdNumber}
                          onChange={(e) => setKycIdNumber(e.target.value)}
                          className="w-full neu-input py-4 font-bold text-black"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Bank Payout Details</h4>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Account Number</label>
                      <input
                        type="text"
                        placeholder="000000000000"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full neu-input py-4 font-bold text-black"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">IFSC Code</label>
                        <input
                          type="text"
                          placeholder="BANK0001234"
                          value={bankIfsc}
                          onChange={(e) => setBankIfsc(e.target.value)}
                          className="w-full neu-input py-4 font-bold text-black"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Bank Name</label>
                        <input
                          type="text"
                          placeholder="HDFC Bank"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full neu-input py-4 font-bold text-black"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <button
              onClick={handleProfileSetup}
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-3 py-4"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Complete Registration</span>}
            </button>
          </div>
        )}

        {regMethod !== 'profile-setup' && (
          <div className="pt-8 text-center">
            <p className="text-sm text-gray-400 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-black font-bold underline uppercase tracking-widest text-xs">
                Login Now
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
