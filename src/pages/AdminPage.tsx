import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, getDocs, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Booking, Transaction, PlatformConfig } from '../types';
import { 
  Users, 
  CreditCard, 
  ShieldCheck, 
  ShieldAlert, 
  TrendingUp, 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Calendar,
  ChevronRight,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCcw,
  Settings,
  Save,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'providers' | 'bookings' | 'payments' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // Platform Config Form State
  const [configForm, setConfigForm] = useState<PlatformConfig>({
    commissionRate: 10,
    providerRegistrationFee: 500,
    maintenanceMode: false,
    currency: 'INR',
    updatedAt: new Date()
  });

  useEffect(() => {
    setLoading(true);
    
    // Listen to all users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as UserProfile[];
      setUsers(usersData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    // Listen to all bookings
    const unsubscribeBookings = onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')), (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(bookingsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bookings'));

    // Listen to all transactions
    const unsubscribeTransactions = onSnapshot(query(collection(db, 'transactions'), orderBy('createdAt', 'desc')), (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as Transaction[];
      setTransactions(transactionsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    // Listen to platform config
    const unsubscribeConfig = onSnapshot(doc(db, 'platformConfig', 'settings'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as PlatformConfig;
        setPlatformConfig(data);
        setConfigForm(data);
      } else {
        // Initialize if doesn't exist
        setDoc(doc(db, 'platformConfig', 'settings'), configForm);
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'platformConfig/settings'));

    return () => {
      unsubscribeUsers();
      unsubscribeBookings();
      unsubscribeTransactions();
      unsubscribeConfig();
    };
  }, []);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await setDoc(doc(db, 'platformConfig', 'settings'), {
        ...configForm,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setSavingConfig(false);
    }
  };

  const togglePremium = async (userId: string, currentStatus: boolean) => {
    setUpdatingUser(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        isPremium: !currentStatus,
        premiumUntil: !currentStatus ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null // 90 days if enabling
      });
    } catch (error) {
      console.error('Error updating premium status:', error);
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleProviderApproval = async (userId: string, status: 'approved' | 'rejected') => {
    setUpdatingUser(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        providerStatus: status
      });
    } catch (error) {
      console.error('Error updating provider status:', error);
    } finally {
      setUpdatingUser(null);
    }
  };

  const stats = {
    totalUsers: users.length,
    premiumUsers: users.filter(u => u.isPremium).length,
    totalRevenue: bookings.filter(b => b.paymentStatus === 'paid').reduce((acc, b) => acc + b.totalPrice, 0),
    totalCommission: bookings.filter(b => b.paymentStatus === 'paid').reduce((acc, b) => acc + (b.commissionAmount || 0), 0),
    registrationRevenue: transactions.filter(t => t.type === 'registration' && t.status === 'paid').reduce((acc, t) => acc + t.amount, 0),
    totalBookings: bookings.length,
    pendingBookings: bookings.filter(b => b.status === 'pending').length,
    pendingApprovals: users.filter(u => u.providerStatus === 'pending_approval').length
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingProviders = users.filter(u => u.providerStatus === 'pending_approval');

  const filteredBookings = bookings.filter(b => 
    b.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.userName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-black" size={40} />
        <p className="text-gray-400 font-bold">Loading Admin Console...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-black uppercase tracking-widest">Admin Console</h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-black/5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
          <span className="text-[10px] font-bold text-black uppercase tracking-widest">Live System</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-50 border border-gray-100 rounded-2xl overflow-x-auto no-scrollbar">
        {(['overview', 'users', 'providers', 'bookings', 'payments', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 min-w-[80px] py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all relative",
              activeTab === tab ? "bg-black shadow-sm text-white" : "text-gray-400 hover:text-black"
            )}
          >
            {tab}
            {tab === 'providers' && stats.pendingApprovals > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center border-2 border-white">
                {stats.pendingApprovals}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="neu-surface p-4 space-y-2">
                <Users className="text-black" size={20} />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Total Users</p>
                  <p className="text-xl font-bold text-black">{stats.totalUsers}</p>
                </div>
              </div>
              <div className="neu-surface p-4 space-y-2">
                <CreditCard className="text-black" size={20} />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Premium</p>
                  <p className="text-xl font-bold text-black">{stats.premiumUsers}</p>
                </div>
              </div>
              <div className="neu-surface p-4 space-y-2">
                <TrendingUp className="text-black" size={20} />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Platform Earnings</p>
                  <p className="text-xl font-bold text-black">₹{(stats.totalCommission + stats.registrationRevenue).toLocaleString()}</p>
                </div>
              </div>
              <div className="neu-surface p-4 space-y-2">
                <Calendar className="text-black" size={20} />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Bookings</p>
                  <p className="text-xl font-bold text-black">{stats.totalBookings}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="neu-surface p-6 space-y-4">
                <h3 className="text-sm font-bold text-black uppercase tracking-widest">Revenue Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Booking Commissions</span>
                    <span className="text-sm font-bold text-black">₹{stats.totalCommission.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Registration Fees</span>
                    <span className="text-sm font-bold text-black">₹{stats.registrationRevenue.toLocaleString()}</span>
                  </div>
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-black uppercase tracking-widest">Total Net Revenue</span>
                    <span className="text-lg font-bold text-black">₹{(stats.totalCommission + stats.registrationRevenue).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'providers' && (
          <motion.div
            key="providers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-black uppercase tracking-widest">Pending Approvals ({pendingProviders.length})</h3>
              {pendingProviders.length === 0 ? (
                <div className="neu-surface py-12 text-center text-gray-400">
                  <p className="text-xs font-bold uppercase tracking-widest">No pending approvals</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingProviders.map(provider => (
                    <div key={provider.uid} className="neu-surface p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gray-50 overflow-hidden border border-gray-100">
                            <img src={provider.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${provider.uid}`} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-black">{provider.name}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{provider.businessDetails?.businessName || 'Independent Provider'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Fee Paid</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{provider.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">KYC: {provider.kycDetails?.idType}</p>
                          <p className="text-xs font-bold text-black">{provider.kycDetails?.idNumber}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Experience</p>
                          <p className="text-xs font-bold text-black">{provider.businessDetails?.experience} Years</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Bank Details</p>
                        <p className="text-xs font-bold text-black">{provider.bankDetails?.bankName} - {provider.bankDetails?.accountNumber}</p>
                        <p className="text-[10px] text-gray-400 font-medium">IFSC: {provider.bankDetails?.ifscCode}</p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleProviderApproval(provider.uid, 'approved')}
                          disabled={updatingUser === provider.uid}
                          className="flex-1 py-3 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          {updatingUser === provider.uid ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleProviderApproval(provider.uid, 'rejected')}
                          disabled={updatingUser === provider.uid}
                          className="flex-1 py-3 bg-gray-50 text-red-500 border border-red-100 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          {updatingUser === provider.uid ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full neu-input pl-12 py-3 text-sm"
              />
            </div>

            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.uid} className="neu-surface p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-50 overflow-hidden border border-gray-100">
                      <img 
                        src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-black">{user.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md border",
                          user.role === 'admin' ? "bg-black text-white border-black" : 
                          user.role === 'provider' ? "bg-gray-100 text-black border-gray-200" : "bg-gray-50 text-gray-400 border-gray-100"
                        )}>
                          {user.role}
                        </span>
                        {user.isPremium && (
                          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-black text-white">
                            Premium
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => togglePremium(user.uid, !!user.isPremium)}
                    disabled={updatingUser === user.uid}
                    className={cn(
                      "p-2.5 rounded-xl transition-all border",
                      user.isPremium 
                        ? "bg-gray-50 text-black border-gray-200 hover:bg-gray-100" 
                        : "bg-black text-white border-black hover:bg-gray-900"
                    )}
                  >
                    {updatingUser === user.uid ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : user.isPremium ? (
                      <ShieldAlert size={18} />
                    ) : (
                      <ShieldCheck size={18} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'bookings' && (
          <motion.div
            key="bookings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full neu-input pl-12 py-3 text-sm"
              />
            </div>

            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="neu-surface p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-black">{booking.serviceName}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        By {booking.userName}
                      </p>
                    </div>
                    <div className={cn(
                      "text-[9px] font-bold uppercase px-2 py-1 rounded-lg border",
                      booking.status === 'completed' ? "bg-black text-white border-black" :
                      booking.status === 'cancelled' ? "bg-gray-50 text-gray-400 border-gray-100" :
                      "bg-gray-100 text-black border-gray-200"
                    )}>
                      {booking.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Price Paid</p>
                      <p className="text-sm font-bold text-black">₹{booking.totalPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Payment</p>
                      <div className="flex items-center gap-1">
                        {booking.paymentStatus === 'paid' ? (
                          <CheckCircle2 size={12} className="text-black" />
                        ) : (
                          <XCircle size={12} className="text-gray-400" />
                        )}
                        <span className="text-xs font-bold text-black capitalize">{booking.paymentStatus}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                      <Calendar size={12} />
                      <span>{new Date(booking.bookingTime).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[9px] text-gray-400 font-mono">
                      ID: {booking.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'payments' && (
          <motion.div
            key="payments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full neu-input pl-12 py-3 text-sm"
              />
            </div>

            <div className="space-y-4">
              {transactions.filter(t => t.orderId.includes(searchQuery) || t.userId.includes(searchQuery)).map((tx) => (
                <div key={tx.orderId} className="neu-surface p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-xl border",
                        tx.status === 'paid' ? "bg-black text-white border-black" : "bg-gray-50 text-gray-400 border-gray-100"
                      )}>
                        {tx.status === 'paid' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-black capitalize">{tx.type} Payment</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{tx.orderId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-black">₹{tx.amount.toFixed(2)}</p>
                      <p className={cn(
                        "text-[9px] font-bold uppercase tracking-widest",
                        tx.status === 'paid' ? "text-black" : "text-gray-400"
                      )}>{tx.status}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      User: {tx.userId.slice(0, 8)}...
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : 'Just now'}
                    </div>
                  </div>

                  {tx.status === 'paid' && (
                    <button 
                      className="w-full py-2 bg-gray-50 text-gray-600 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-gray-100 flex items-center justify-center gap-2"
                      onClick={() => {/* TODO: Implement refund logic */}}
                    >
                      <RefreshCcw size={14} />
                      Issue Refund
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="neu-surface p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="p-2 rounded-xl bg-black text-white">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black uppercase tracking-widest">Platform Configuration</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Global rules and fees</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    value={configForm.commissionRate}
                    onChange={(e) => setConfigForm({ ...configForm, commissionRate: parseFloat(e.target.value) })}
                    className="w-full neu-input py-3 px-4 text-sm font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Provider Registration Fee (₹)</label>
                  <input
                    type="number"
                    value={configForm.providerRegistrationFee}
                    onChange={(e) => setConfigForm({ ...configForm, providerRegistrationFee: parseFloat(e.target.value) })}
                    className="w-full neu-input py-3 px-4 text-sm font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Default Currency</label>
                  <input
                    type="text"
                    value={configForm.currency}
                    onChange={(e) => setConfigForm({ ...configForm, currency: e.target.value })}
                    className="w-full neu-input py-3 px-4 text-sm font-bold"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={18} className="text-black" />
                    <div>
                      <p className="text-xs font-bold text-black">Maintenance Mode</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Disable platform access</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfigForm({ ...configForm, maintenanceMode: !configForm.maintenanceMode })}
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-all duration-300",
                      configForm.maintenanceMode ? "bg-black" : "bg-gray-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300",
                      configForm.maintenanceMode ? "left-6" : "left-1"
                    )} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="w-full btn-primary flex items-center justify-center gap-3 py-4"
              >
                {savingConfig ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                <span>Save Platform Settings</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
