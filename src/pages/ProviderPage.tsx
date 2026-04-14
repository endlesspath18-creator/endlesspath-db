import { useState, useEffect, FormEvent } from 'react';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Service, Booking } from '../types';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Tag, DollarSign, FileText, LayoutGrid, AlertCircle, Loader2, CheckCircle2, X, Calendar, Clock, User, CheckCircle, XCircle, Crown } from 'lucide-react';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  { id: 'mechanic', name: 'Mechanic' },
  { id: 'ac', name: 'AC Repair' },
  { id: 'carpentry', name: 'Carpentry' },
  { id: 'plumbing', name: 'Plumbing' },
  { id: 'electrical', name: 'Electrical' },
];

export default function ProviderPage() {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('mechanic');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState<{ id: string, status: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'services' | 'earnings'>('requests');

  useEffect(() => {
    if (!profile) return;

    // Fetch Services
    const servicesQ = query(
      collection(db, 'services'),
      where('providerId', '==', profile.uid)
    );

    const unsubscribeServices = onSnapshot(servicesQ, (snapshot) => {
      const servicesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Service[];
      setServices(servicesData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'services'));

    // Fetch Incoming Bookings
    const bookingsQ = query(
      collection(db, 'bookings'),
      where('providerId', '==', profile.uid)
    );

    const unsubscribeBookings = onSnapshot(bookingsQ, (snapshot) => {
      const bookingsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];
      setBookings(bookingsData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bookings'));

    // Fetch Transactions
    const transactionsQ = query(
      collection(db, 'transactions'),
      where('providerId', '==', profile.uid)
    );

    const unsubscribeTransactions = onSnapshot(transactionsQ, (snapshot) => {
      const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(transData);
    });

    return () => {
      unsubscribeServices();
      unsubscribeBookings();
      unsubscribeTransactions();
    };
  }, [profile]);

  if (profile?.role === 'provider' && profile?.providerStatus === 'pending_approval') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center shadow-sm animate-pulse">
          <Clock className="text-black" size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-black uppercase tracking-widest">Approval Pending</h2>
          <p className="text-gray-400 font-medium max-w-xs mx-auto">Your registration is being reviewed by our team. We'll notify you once your account is activated.</p>
        </div>
        <div className="neu-surface p-6 w-full max-w-sm space-y-4">
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            <CheckCircle2 className="text-green-500" size={20} />
            <span>Registration Fee Paid</span>
          </div>
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            <Loader2 className="text-black animate-spin" size={20} />
            <span>KYC Verification in progress</span>
          </div>
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            <Clock className="text-gray-300" size={20} />
            <span>Dashboard Activation</span>
          </div>
        </div>
      </div>
    );
  }

  const totalEarnings = bookings
    .filter(b => b.status === 'completed' && b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.providerEarnings || 0), 0);

  const pendingPayouts = transactions
    .filter(t => t.type === 'payout' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const completedPayouts = transactions
    .filter(t => t.type === 'payout' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: newStatus,
      });
      setShowStatusConfirm(null);
      setSuccessMessage(`Booking ${newStatus} successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleAddService = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!name || !price || !category) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'services'), {
        name,
        category,
        price: parseFloat(price),
        description,
        providerId: profile.uid,
        providerName: profile.name || 'Professional Provider',
        createdAt: serverTimestamp(),
      });
      setName('');
      setPrice('');
      setDescription('');
      setIsAdding(false);
      setSuccessMessage('Service added successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'services');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'services', id));
      setShowDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `services/${id}`);
    }
  };

  if (profile?.servicesDisabled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 px-6">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500">
          <AlertCircle size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-black uppercase tracking-widest">Services Disabled</h2>
          <p className="text-gray-500 text-sm font-medium">Your provider hub has been restricted due to an expired subscription. Please renew your premium membership to resume managing services and receiving bookings.</p>
        </div>
        <Link to="/premium" className="w-full btn-primary py-4 flex items-center justify-center gap-2">
          <Crown size={20} />
          <span>Renew Subscription</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-4 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-black uppercase tracking-widest">Provider Hub</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'requests' ? 'services' : 'requests')}
            className="p-3 rounded-xl neu-surface text-gray-400 hover:text-black transition-all"
          >
            {activeTab === 'requests' ? <LayoutGrid size={24} /> : <Calendar size={24} />}
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className={cn(
              "p-3 rounded-xl neu-surface text-black transition-all duration-300",
              isAdding && "neu-surface-pressed rotate-45"
            )}
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Premium Upgrade Reminder */}
      {profile.role === 'provider' && !profile.isPremium && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="neu-surface p-6 bg-black text-white border-black relative overflow-hidden group"
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Crown className="text-white" size={18} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Upgrade to Premium</h3>
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Reduce commission to 5% & get priority listing</p>
            </div>
            <Link 
              to="/premium" 
              className="px-4 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-sm"
            >
              Upgrade
            </Link>
          </div>
        </motion.div>
      )}

      {/* UPI ID Reminder */}
      {!profile.upiId && (
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3 text-black font-bold shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="text-xs">Add UPI ID in settings to receive payouts.</span>
          </div>
          <Link to="/settings" className="text-[10px] bg-black text-white px-3 py-1.5 rounded-lg uppercase tracking-widest">Add Now</Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 p-1.5 neu-surface-pressed rounded-2xl">
        <button
          onClick={() => setActiveTab('requests')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
            activeTab === 'requests' ? "bg-black text-white shadow-sm" : "text-gray-400"
          )}
        >
          <Calendar size={14} />
          Requests
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
            activeTab === 'services' ? "bg-black text-white shadow-sm" : "text-gray-400"
          )}
        >
          <LayoutGrid size={14} />
          Services
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
            activeTab === 'earnings' ? "bg-black text-white shadow-sm" : "text-gray-400"
          )}
        >
          <DollarSign size={14} />
          Earnings
        </button>
      </div>

      <AnimatePresence mode="wait">
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-2xl bg-green-50 border border-green-100 flex items-center gap-3 text-green-600 font-bold shadow-sm mb-6"
          >
            <CheckCircle2 size={20} />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onSubmit={handleAddService}
            className="neu-surface p-6 space-y-6 relative overflow-hidden mb-8"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-black" />
            <h3 className="text-lg font-bold text-black uppercase tracking-widest mb-2">New Service</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                <Tag size={12} className="text-black" /> Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Full AC Servicing"
                className="w-full neu-input py-4 font-bold text-black"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                <LayoutGrid size={12} className="text-black" /> Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full neu-input py-4 appearance-none font-bold text-black"
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-white">{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                <DollarSign size={12} className="text-black" /> Price (₹)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full neu-input py-4 font-bold text-black"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                <FileText size={12} className="text-black" /> Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what's included..."
                className="w-full neu-input py-4 h-24 resize-none font-bold text-black"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-3 py-5 mt-4 font-bold uppercase tracking-widest text-xs"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
              <span>{loading ? 'Adding...' : 'Add Service'}</span>
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeTab === 'earnings' ? (
          <motion.div
            key="earnings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 gap-6">
              <div className="neu-surface p-8 bg-black text-white relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
                <div className="relative z-10 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Total Earnings</p>
                  <h3 className="text-5xl font-bold">₹{totalEarnings.toFixed(2)}</h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 pt-4">
                    <CheckCircle size={12} className="text-white" />
                    <span>Net earnings after platform commission</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="neu-surface p-6 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending Payouts</p>
                  <p className="text-2xl font-bold text-black">₹{pendingPayouts.toFixed(2)}</p>
                </div>
                <div className="neu-surface p-6 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completed</p>
                  <p className="text-2xl font-bold text-black">₹{completedPayouts.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-black uppercase tracking-widest">Recent Transactions</h4>
              {transactions.length === 0 ? (
                <div className="neu-surface py-12 text-center text-gray-400">
                  <p className="text-xs font-bold uppercase tracking-widest">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map(t => (
                    <div key={t.id} className="neu-surface p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-black uppercase tracking-widest">{t.type}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{t.createdAt?.toDate?.().toLocaleDateString()}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className={cn("text-sm font-bold", t.type === 'payout' ? "text-red-500" : "text-green-500")}>
                          {t.type === 'payout' ? '-' : '+'}₹{t.amount.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : activeTab === 'requests' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-black uppercase tracking-widest">New Requests</h3>
            <span className="text-xs text-gray-400 font-bold">{bookings.length} total</span>
          </div>
          
          {bookings.length === 0 ? (
            <div className="neu-surface py-20 text-center text-gray-400 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                <Calendar className="text-gray-300" size={32} />
              </div>
              <p className="font-bold">No incoming requests yet.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {bookings.map((booking) => (
                <motion.div 
                  layout
                  key={booking.id} 
                  className="neu-surface p-5 flex flex-col gap-4 relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-lg text-black group-hover:text-gray-600 transition-colors">{booking.serviceName}</h4>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        <User size={12} className="text-black" />
                        <span>{booking.userName || 'Customer'}</span>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm",
                      booking.status === 'pending' ? 'bg-gray-50 text-black border border-gray-200' :
                      booking.status === 'confirmed' ? 'bg-black text-white' :
                      booking.status === 'completed' ? 'bg-gray-100 text-black' :
                      'bg-gray-50 text-gray-400 border border-gray-100'
                    )}>
                      {booking.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2 text-[10px] text-black font-bold">
                      <Calendar size={14} className="text-black" />
                      <span>{booking.bookingTime?.toDate?.().toLocaleDateString() || 'Pending...'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-black font-bold">
                      <Clock size={14} className="text-black" />
                      <span>{booking.bookingTime?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}</span>
                    </div>
                  </div>

                  {booking.status === 'pending' && (
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                        className="flex-1 btn-primary py-4 font-bold uppercase tracking-widest text-xs"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setShowStatusConfirm({ id: booking.id, status: 'cancelled' })}
                        className="flex-1 bg-gray-50 text-gray-400 border border-gray-200 py-4 rounded-xl font-bold uppercase tracking-widest text-xs active:scale-95 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {booking.status === 'confirmed' && (
                    <button
                      onClick={() => handleStatusUpdate(booking.id, 'completed')}
                      className="w-full btn-primary py-4 font-bold uppercase tracking-widest text-xs"
                    >
                      Mark as Completed
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-black uppercase tracking-widest">My Services</h3>
          {services.length === 0 ? (
            <div className="neu-surface py-20 text-center text-gray-400 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                <AlertCircle className="text-gray-300" size={32} />
              </div>
              <p className="font-bold">You haven't added any services yet.</p>
              <button onClick={() => setIsAdding(true)} className="text-black font-bold text-sm underline uppercase tracking-widest">Add your first service</button>
            </div>
          ) : (
            <div className="grid gap-6">
              {services.map((service) => (
                <motion.div 
                  layout
                  key={service.id} 
                  className="neu-surface p-5 flex flex-col gap-4 relative group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-lg text-black group-hover:text-gray-600 transition-colors">{service.name}</h4>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{service.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-black font-bold text-lg">₹{service.price}</p>
                      <button
                        onClick={() => setShowDeleteConfirm(service.id)}
                        className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-black transition-all mt-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2 font-medium">{service.description}</p>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      )}
      </AnimatePresence>

      {/* Status Confirmation Modal */}
      <AnimatePresence>
        {showStatusConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="neu-surface p-8 max-w-sm w-full space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto">
                <XCircle className="text-black" size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-black uppercase tracking-widest">Reject Request?</h3>
                <p className="text-gray-400 text-sm font-medium">Are you sure you want to reject this service request? This will notify the customer.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowStatusConfirm(null)}
                  className="btn-secondary py-4 font-bold uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusUpdate(showStatusConfirm.id, showStatusConfirm.status)}
                  className="btn-primary bg-black py-4 font-bold uppercase tracking-widest text-xs"
                >
                  Yes, Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="neu-surface p-8 max-w-sm w-full space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto">
                <Trash2 className="text-black" size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-black uppercase tracking-widest">Delete Service?</h3>
                <p className="text-gray-400 text-sm font-medium">This action cannot be undone. Are you sure you want to remove this service?</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="btn-secondary py-4 font-bold uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="btn-primary bg-black py-4 font-bold uppercase tracking-widest text-xs"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
