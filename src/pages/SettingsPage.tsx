import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { 
  User, 
  Mail, 
  Smartphone, 
  Shield, 
  LogOut, 
  Edit3, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Crown, 
  ArrowRight, 
  Star, 
  Wallet, 
  Plus, 
  Loader2,
  Bell,
  Moon,
  HelpCircle,
  MessageSquare,
  FileText,
  ChevronRight,
  Globe,
  Lock,
  Trash2,
  MapPin,
  CreditCard,
  Briefcase,
  Clock,
  Map,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { processPayment, loadRazorpay } from '../lib/razorpay';

type SettingsSection = 'main' | 'account' | 'preferences' | 'notifications' | 'payments' | 'business';

export default function SettingsPage() {
  const { profile, logout, refreshProfile } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isToppingUp, setIsToppingUp] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    upiId: profile?.upiId || '',
    businessName: profile?.businessDetails?.businessName || '',
    experience: profile?.businessDetails?.experience || '',
    address: profile?.businessDetails?.address || '',
    workingRadius: profile?.businessDetails?.workingRadius || 10,
    autoAccept: profile?.businessDetails?.autoAccept || false,
    notifications: {
      push: profile?.settings?.notifications?.push ?? true,
      email: profile?.settings?.notifications?.email ?? true,
      sms: profile?.settings?.notifications?.sms ?? false,
      promotional: profile?.settings?.notifications?.promotional ?? false,
    },
    preferences: {
      theme: profile?.settings?.preferences?.theme || 'light',
      language: profile?.settings?.preferences?.language || 'English',
      fontSize: profile?.settings?.preferences?.fontSize || 'Medium',
    }
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        upiId: profile.upiId || '',
        businessName: profile.businessDetails?.businessName || '',
        experience: profile.businessDetails?.experience || '',
        address: profile.businessDetails?.address || '',
        workingRadius: profile.businessDetails?.workingRadius || 10,
        autoAccept: profile.businessDetails?.autoAccept || false,
        notifications: {
          push: profile.settings?.notifications?.push ?? true,
          email: profile.settings?.notifications?.email ?? true,
          sms: profile.settings?.notifications?.sms ?? false,
          promotional: profile.settings?.notifications?.promotional ?? false,
        },
        preferences: {
          theme: profile.settings?.preferences?.theme || 'light',
          language: profile.settings?.preferences?.language || 'English',
          fontSize: profile.settings?.preferences?.fontSize || 'Medium',
        }
      });
    }
  }, [profile]);

  const handleUpdate = async (updates: any) => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'users', profile.uid), updates);
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Update error:', err);
      setError('Failed to update settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;
    if (!window.confirm('Are you absolutely sure? This will permanently delete your account and all associated data.')) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', profile.uid));
      logout();
    } catch (err) {
      setError('Failed to delete account. You may need to re-authenticate.');
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsToppingUp(true);
    setError(null);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Razorpay SDK failed to load');

      await processPayment(
        {
          amount: amount * 100,
          name: 'Wallet Top-up',
          description: `Adding ₹${amount} to your Endless Path wallet`,
          prefill: {
            name: profile?.name || '',
            email: profile?.email || '',
            contact: profile?.phone || '',
          },
          handler: () => {
            setSuccess(true);
            setTopUpAmount('');
            setIsToppingUp(false);
            setTimeout(() => setSuccess(false), 5000);
          }
        },
        'wallet',
        { amount }
      );
    } catch (err: any) {
      console.error('Top-up error:', err);
      setError(err.message || 'Payment failed');
    } finally {
      setIsToppingUp(false);
    }
  };

  if (!profile) return null;

  const SettingItem = ({ icon: Icon, label, value, onClick, danger }: any) => (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-4 neu-surface active:neu-surface-pressed transition-all group",
        danger && "hover:border-red-100"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-2.5 rounded-xl transition-all duration-300",
          danger ? "bg-red-50 text-red-500" : "bg-gray-50 text-black border border-gray-100 group-hover:bg-black group-hover:text-white"
        )}>
          <Icon size={18} className="transition-colors" />
        </div>
        <div className="text-left">
          <p className={cn("text-xs font-bold", danger ? "text-red-500" : "text-black")}>{label}</p>
          {value && <p className="text-[10px] text-gray-400 font-medium">{value}</p>}
        </div>
      </div>
      <ChevronRight size={16} className={cn("transition-colors", danger ? "text-red-300 group-hover:text-red-500" : "text-gray-300 group-hover:text-black")} />
    </button>
  );

  const ToggleItem = ({ icon: Icon, label, enabled, onToggle }: any) => (
    <div className="w-full flex items-center justify-between p-4 neu-surface">
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
          <Icon size={18} className="text-black" />
        </div>
        <p className="text-xs font-bold text-black">{label}</p>
      </div>
      <button 
        onClick={onToggle}
        className={cn(
          "w-10 h-5 rounded-full relative transition-all duration-300",
          enabled ? "bg-black" : "bg-gray-200"
        )}
      >
        <div className={cn(
          "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300",
          enabled ? "left-6" : "left-1"
        )} />
      </button>
    </div>
  );

  const SectionHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <div className="flex items-center gap-4 mb-6">
      <button onClick={onBack} className="p-2 rounded-xl neu-surface hover:bg-black hover:text-white transition-all">
        <X size={18} />
      </button>
      <h3 className="text-xl font-bold text-black uppercase tracking-widest">{title}</h3>
    </div>
  );

  return (
    <div className="space-y-8 pt-4 pb-32">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-black uppercase tracking-widest">Settings</h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-black/5 rounded-full border border-black/10">
          <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
          <span className="text-[9px] font-bold text-black uppercase tracking-widest">Live Sync</span>
        </div>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-2xl bg-green-50 border border-green-100 flex items-center gap-3 text-green-600 font-bold shadow-sm"
          >
            <CheckCircle2 size={20} />
            <span>Settings updated successfully!</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 font-bold shadow-sm"
          >
            <AlertCircle size={20} className="flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeSection === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Profile Header */}
            <div className="flex items-center gap-5 p-2">
              <div className="relative">
                <div className="w-20 h-20 rounded-full neu-surface p-1 relative z-10">
                  <img
                    src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.name}&background=000&color=fff`}
                    alt={profile.name}
                    className="w-full h-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {profile.isPremium && (
                  <div className="absolute -top-1 -right-1 z-20 w-7 h-7 rounded-full bg-black flex items-center justify-center shadow-sm border-2 border-white">
                    <Crown className="text-white" size={12} />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-black tracking-tight">{profile.name}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{profile.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[8px] bg-black text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{profile.role}</span>
                  {profile.isPremium && (
                    <span className="text-[8px] bg-gray-100 text-black px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-black/10">Elite</span>
                  )}
                </div>
              </div>
            </div>

            {/* Wallet Quick Access */}
            {profile.role === 'user' && (
              <div className="neu-surface p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gray-50 text-black border border-gray-100">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Wallet Balance</p>
                      <p className="text-lg font-bold text-black">₹{(profile.walletBalance || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsToppingUp(!isToppingUp)}
                    className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-black hover:border-black transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                
                <AnimatePresence>
                  {isToppingUp && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-2 pt-2">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                          className="flex-1 neu-input py-2 px-4 text-xs border-gray-200 focus:border-black"
                        />
                        <button
                          onClick={handleTopUp}
                          disabled={loading}
                          className="bg-black text-white py-2 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-gray-900 transition-all flex items-center gap-2"
                        >
                          {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                          <span>Top Up</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Main Menu */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">Account & Security</h4>
                <div className="space-y-2">
                  <SettingItem icon={User} label="Personal Information" value="Name, Phone, Email" onClick={() => setActiveSection('account')} />
                  {profile.role === 'provider' && (
                    <SettingItem icon={Briefcase} label="Business Profile" value="Business Name, Experience, Radius" onClick={() => setActiveSection('business')} />
                  )}
                  <SettingItem icon={Lock} label="Security" value="Password, Sessions, 2FA" onClick={() => setActiveSection('account')} />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">Preferences</h4>
                <div className="space-y-2">
                  <SettingItem icon={Bell} label="Notifications" value="Push, Email, SMS" onClick={() => setActiveSection('notifications')} />
                  <SettingItem icon={Moon} label="App Appearance" value="Theme, Language, Font" onClick={() => setActiveSection('preferences')} />
                  <SettingItem icon={Wallet} label="Payments & Wallet" value="Saved Methods, History" onClick={() => setActiveSection('payments')} />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">Support</h4>
                <div className="space-y-2">
                  <SettingItem icon={HelpCircle} label="Help Center" onClick={() => {}} />
                  <SettingItem icon={MessageSquare} label="Contact Support" onClick={() => {}} />
                  <SettingItem icon={FileText} label="Privacy Policy" onClick={() => {}} />
                  <SettingItem icon={Trash2} label="Delete Account" danger onClick={handleDeleteAccount} />
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-3 py-5 neu-surface text-black font-black uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-all duration-300"
                >
                  <LogOut size={20} />
                  <span>Logout Account</span>
                </button>
                <p className="text-[9px] text-center text-gray-400 mt-4 font-bold uppercase tracking-widest">Endless Path v1.1.0</p>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'account' && (
          <motion.div
            key="account"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <SectionHeader title="Personal Info" onBack={() => setActiveSection('main')} />
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full neu-input py-3 px-4 text-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full neu-input py-3 px-4 text-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full neu-input py-3 px-4 text-sm font-bold bg-gray-50 text-gray-400"
                />
              </div>

              <button
                onClick={() => handleUpdate({ name: formData.name, phone: formData.phone })}
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-3 py-4 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                <span>Save Changes</span>
              </button>
            </div>
          </motion.div>
        )}

        {activeSection === 'business' && profile.role === 'provider' && (
          <motion.div
            key="business"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <SectionHeader title="Business Profile" onBack={() => setActiveSection('main')} />
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Business Name</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full neu-input py-3 px-4 text-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Experience (Years)</label>
                <input
                  type="text"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full neu-input py-3 px-4 text-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Working Radius (km)</label>
                <input
                  type="number"
                  value={formData.workingRadius}
                  onChange={(e) => setFormData({ ...formData, workingRadius: parseInt(e.target.value) })}
                  className="w-full neu-input py-3 px-4 text-sm font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">UPI ID for Payouts</label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  placeholder="name@upi"
                  className="w-full neu-input py-3 px-4 text-sm font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-4 neu-surface">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-black" />
                  <div>
                    <p className="text-xs font-bold text-black">Auto-Accept Bookings</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Skip manual confirmation</p>
                  </div>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, autoAccept: !formData.autoAccept })}
                  className={cn(
                    "w-10 h-5 rounded-full relative transition-all duration-300",
                    formData.autoAccept ? "bg-black" : "bg-gray-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300",
                    formData.autoAccept ? "left-6" : "left-1"
                  )} />
                </button>
              </div>

              <button
                onClick={() => handleUpdate({ 
                  upiId: formData.upiId,
                  businessDetails: {
                    businessName: formData.businessName,
                    experience: formData.experience,
                    workingRadius: formData.workingRadius,
                    autoAccept: formData.autoAccept
                  }
                })}
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-3 py-4 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                <span>Save Business Info</span>
              </button>
            </div>
          </motion.div>
        )}

        {activeSection === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <SectionHeader title="Notifications" onBack={() => setActiveSection('main')} />
            
            <div className="space-y-3">
              <ToggleItem 
                icon={Bell} 
                label="Push Notifications" 
                enabled={formData.notifications.push}
                onToggle={() => setFormData({ ...formData, notifications: { ...formData.notifications, push: !formData.notifications.push } })}
              />
              <ToggleItem 
                icon={Mail} 
                label="Email Alerts" 
                enabled={formData.notifications.email}
                onToggle={() => setFormData({ ...formData, notifications: { ...formData.notifications, email: !formData.notifications.email } })}
              />
              <ToggleItem 
                icon={Smartphone} 
                label="SMS Notifications" 
                enabled={formData.notifications.sms}
                onToggle={() => setFormData({ ...formData, notifications: { ...formData.notifications, sms: !formData.notifications.sms } })}
              />
              <ToggleItem 
                icon={Star} 
                label="Promotional Offers" 
                enabled={formData.notifications.promotional}
                onToggle={() => setFormData({ ...formData, notifications: { ...formData.notifications, promotional: !formData.notifications.promotional } })}
              />

              <button
                onClick={() => handleUpdate({ settings: { ...profile.settings, notifications: formData.notifications } })}
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-3 py-4 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                <span>Save Preferences</span>
              </button>
            </div>
          </motion.div>
        )}

        {activeSection === 'preferences' && (
          <motion.div
            key="preferences"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <SectionHeader title="App Preferences" onBack={() => setActiveSection('main')} />
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Theme Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {['light', 'dark', 'system'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFormData({ ...formData, preferences: { ...formData.preferences, theme: t as any } })}
                      className={cn(
                        "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all",
                        formData.preferences.theme === t ? "bg-black text-white border-black" : "bg-white text-gray-400 border-gray-100"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Language</label>
                <select
                  value={formData.preferences.language}
                  onChange={(e) => setFormData({ ...formData, preferences: { ...formData.preferences, language: e.target.value } })}
                  className="w-full neu-input py-3 px-4 text-sm font-bold appearance-none"
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>

              <button
                onClick={() => handleUpdate({ settings: { ...profile.settings, preferences: formData.preferences } })}
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-3 py-4 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                <span>Save Preferences</span>
              </button>
            </div>
          </motion.div>
        )}

        {activeSection === 'payments' && (
          <motion.div
            key="payments"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <SectionHeader title="Payments & Wallet" onBack={() => setActiveSection('main')} />
            
            <div className="space-y-6">
              <div className="neu-surface p-5 bg-black text-white border-black">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Available Balance</p>
                <p className="text-3xl font-black mt-1">₹{(profile.walletBalance || 0).toFixed(2)}</p>
                <div className="flex gap-2 mt-6">
                  <button onClick={() => setIsToppingUp(true)} className="flex-1 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest">Add Funds</button>
                  <button className="flex-1 py-3 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20">Withdraw</button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2">Saved Methods</h4>
                <div className="p-4 neu-surface flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} />
                    <div>
                      <p className="text-xs font-bold text-black">Razorpay Saved Cards</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Managed by Razorpay</p>
                    </div>
                  </div>
                  <Check size={16} className="text-black" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
