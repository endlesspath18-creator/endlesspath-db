import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Booking } from '../types';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Trash2, Receipt, CreditCard, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function BookingsPage() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    // Query ONLY for bookings made BY the user
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];
      setBookings(bookingsData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      }));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bookings'));

    return unsubscribe;
  }, [profile]);

  const handleCancel = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'cancelled',
      });
      setShowCancelConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-black bg-gray-50 border border-gray-200';
      case 'confirmed': return 'text-black bg-gray-100 border border-black';
      case 'completed': return 'text-white bg-black';
      case 'cancelled': return 'text-gray-400 bg-gray-50 border border-gray-100';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'confirmed': return CheckCircle;
      case 'completed': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return AlertCircle;
    }
  };

  return (
    <div className="space-y-8 pt-4 pb-24">
      <h2 className="text-2xl font-bold text-black uppercase tracking-widest">My Bookings</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin shadow-sm"></div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 text-gray-400 space-y-4">
          <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto">
            <Calendar className="text-gray-300" size={40} />
          </div>
          <p className="font-bold">No bookings found.</p>
          <Link to="/" className="text-black font-bold text-sm underline uppercase tracking-widest">Explore Services</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => {
            const StatusIcon = getStatusIcon(booking.status);
            return (
              <div key={booking.id} className="neu-surface p-6 flex flex-col gap-5 relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg text-black group-hover:text-gray-600 transition-colors">{booking.serviceName}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      <Receipt size={12} />
                      <span>ID: {booking.id.slice(0, 8)}</span>
                    </div>
                  </div>
                  <div className={cn("px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest shadow-sm", getStatusColor(booking.status))}>
                    <StatusIcon size={12} />
                    <span>{booking.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="space-y-1">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Date</p>
                    <div className="flex items-center gap-2 text-xs text-black font-bold">
                      <Calendar size={14} className="text-black" />
                      <span>{booking.bookingTime?.toDate?.().toLocaleDateString() || 'Pending...'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Time</p>
                    <div className="flex items-center gap-2 text-xs text-black font-bold">
                      <Clock size={14} className="text-black" />
                      <span>{booking.bookingTime?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}</span>
                    </div>
                  </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-2 px-1">
                  <div className="flex justify-between text-[11px] text-gray-400 font-bold">
                    <span>Base Price</span>
                    <span>₹{booking.basePrice?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-400 font-bold">
                    <span>Platform Fee (5%)</span>
                    <span>+₹{booking.platformFee?.toFixed(2) || '0.00'}</span>
                  </div>
                  {booking.discount > 0 && (
                    <div className="flex justify-between text-[11px] text-black font-bold">
                      <div className="flex items-center gap-1">
                        <Crown size={10} />
                        <span>Premium Discount</span>
                      </div>
                      <span>-₹{booking.discount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="h-px bg-gray-100 my-1" />
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="text-black" />
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Paid</span>
                    </div>
                    <span className="text-lg font-bold text-black">₹{booking.totalPrice?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>

                {booking.status === 'pending' && (
                  <button
                    onClick={() => setShowCancelConfirm(booking.id)}
                    className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 self-end hover:text-black hover:bg-gray-50 px-4 py-2 rounded-xl transition-all"
                  >
                    <Trash2 size={14} />
                    Cancel Booking
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirm && (
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
                <h3 className="text-xl font-bold text-black uppercase tracking-widest">Cancel Booking?</h3>
                <p className="text-gray-400 text-sm font-medium">Are you sure you want to cancel this service booking? This action cannot be undone.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowCancelConfirm(null)}
                  className="btn-secondary py-4 font-bold uppercase tracking-widest text-xs"
                >
                  No, Keep
                </button>
                <button
                  onClick={() => handleCancel(showCancelConfirm)}
                  className="btn-primary bg-black py-4 font-bold uppercase tracking-widest text-xs"
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
