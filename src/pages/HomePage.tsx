import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where, getDocs, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Service, Booking, PlatformConfig } from '../types';
import { Wrench, Wind, Hammer, Droplets, Zap, Search, Clock, CheckCircle, AlertCircle, Loader2, X, CheckCircle2, Info, Crown, ArrowRight, CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { processPayment } from '../lib/razorpay';

const CATEGORIES = [
  { id: 'mechanic', name: 'Mechanic', icon: Wrench, color: 'bg-black' },
  { id: 'ac', name: 'AC Repair', icon: Wind, color: 'bg-black' },
  { id: 'carpentry', name: 'Carpentry', icon: Hammer, color: 'bg-black' },
  { id: 'plumbing', name: 'Plumbing', icon: Droplets, color: 'bg-black' },
  { id: 'electrical', name: 'Electrical', icon: Zap, color: 'bg-black' },
];

export default function HomePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [activeBookings, setActiveBookings] = useState<Record<string, boolean>>({});
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);
  const [showBusyAlert, setShowBusyAlert] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);

  const fetchServices = () => {
    setLoading(true);
    setError(null);
    const q = query(collection(db, 'services'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const servicesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Service[];
      setServices(servicesData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching services:", err);
      setError("Failed to load services. Please check your connection.");
      setLoading(false);
    });
    return unsubscribe;
  };

  useEffect(() => {
    if (profile?.role === 'provider') {
      navigate('/provider');
      return;
    }

    const unsubscribe = fetchServices();

    // Listen to platform config
    const unsubscribeConfig = onSnapshot(doc(db, 'platformConfig', 'settings'), (snapshot) => {
      if (snapshot.exists()) {
        setPlatformConfig(snapshot.data() as PlatformConfig);
      }
    });

    // Listen for active bookings to show "Busy" status
    const bookingsQ = query(collection(db, 'bookings'), where('status', 'in', ['pending', 'confirmed']));
    const unsubscribeBookings = onSnapshot(bookingsQ, (snapshot) => {
      const busyServices: Record<string, boolean> = {};
      snapshot.docs.forEach((doc) => {
        const booking = doc.data() as Booking;
        busyServices[booking.serviceId] = true;
      });
      setActiveBookings(busyServices);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bookings'));

    return () => {
      unsubscribe();
      unsubscribeConfig();
      unsubscribeBookings();
    };
  }, [profile, navigate]);

  const handleBooking = async (service: Service) => {
    if (!profile || !bookingDate || !bookingTime) return;
    if (activeBookings[service.id]) {
      setShowBusyAlert(true);
      setTimeout(() => setShowBusyAlert(false), 3000);
      return;
    }

    setBookingLoading(service.id);
    try {
      // Pricing Logic
      const basePrice = service.price;
      const platformFee = basePrice * 0.05; // 5% platform fee
      const discount = profile.isPremium ? basePrice * 0.10 : 0; // 10% discount for premium
      const totalPrice = basePrice + platformFee - discount;

      // Commission Logic
      const commissionRate = platformConfig?.commissionRate || 10;
      const finalCommissionRate = profile.isPremium ? commissionRate / 2 : commissionRate;
      const commissionAmount = totalPrice * (finalCommissionRate / 100);
      const providerEarnings = totalPrice - commissionAmount;

      // Combine date and time
      const scheduledTime = new Date(`${bookingDate}T${bookingTime}`);

      // Double check if it's still available
      const q = query(
        collection(db, 'bookings'), 
        where('serviceId', '==', service.id), 
        where('status', 'in', ['pending', 'confirmed'])
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setShowBusyAlert(true);
        setTimeout(() => setShowBusyAlert(false), 3000);
        return;
      }

      // Razorpay Payment
      await processPayment({
        amount: Math.round(totalPrice * 100), // in paise
        name: 'Endless Path Booking',
        description: `Booking for ${service.name}`,
        prefill: {
          name: profile.name,
          email: profile.email,
          contact: profile.phone || '',
        },
        handler: async (response: any) => {
          console.log('Booking Payment Success:', response);
          setShowBookingSuccess(true);
          setSelectedService(null);
          setIsConfirming(false);
          setBookingDate('');
          setBookingTime('');
          setTimeout(() => setShowBookingSuccess(false), 3000);
        },
      }, 'booking', {
        serviceId: service.id,
        serviceName: service.name,
        userId: profile.uid,
        userName: profile.name,
        providerId: service.providerId,
        status: 'pending',
        bookingTime: scheduledTime.toISOString(),
        basePrice,
        platformFee,
        discount,
        totalPrice,
        commissionAmount,
        providerEarnings,
      });
    } catch (error) {
      console.error('Error in booking process:', error);
    } finally {
      setBookingLoading(null);
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesCategory = selectedCategory ? s.category === selectedCategory : true;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAvailability = showAvailableOnly ? !activeBookings[s.id] : true;
    return matchesCategory && matchesSearch && matchesAvailability;
  });

  if (profile?.servicesDisabled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 px-6">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500">
          <AlertCircle size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-black uppercase tracking-widest">Services Disabled</h2>
          <p className="text-gray-500 text-sm font-medium">Your account has been restricted due to an expired subscription. Please renew your premium membership to continue booking services.</p>
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
      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
        <input
          type="text"
          placeholder="Search for services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full neu-input pl-12 py-4 focus:border-black transition-all duration-300"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Premium Banner */}
      {!profile?.isPremium && profile?.role === 'user' && (
        <Link to="/premium" className="block premium-gradient p-6 rounded-[24px] text-white relative overflow-hidden shadow-red-glow group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="flex justify-between items-center relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-amber-300" />
                <span className="text-xs font-bold uppercase tracking-widest opacity-90">Endless Path Pro</span>
              </div>
              <h3 className="text-xl font-bold">Get 10% OFF Every Booking</h3>
              <p className="text-[10px] font-medium opacity-70">Upgrade to Pro for just ₹1/quarter</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowRight size={20} />
            </div>
          </div>
        </Link>
      )}

      {/* Categories */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-black uppercase tracking-widest">Categories</h3>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowAvailableOnly(!showAvailableOnly)}
              className={cn(
                "text-[10px] font-bold px-3 py-1 rounded-full border transition-all",
                showAvailableOnly 
                  ? "bg-black text-white border-black" 
                  : "bg-white text-gray-400 border-gray-200"
              )}
            >
              Available Only
            </button>
            {selectedCategory && (
              <button 
                onClick={() => setSelectedCategory(null)}
                className="text-xs font-bold text-black underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300",
                selectedCategory === cat.id ? "bg-black text-white border border-black" : "neu-surface"
              )}
            >
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shadow-sm", selectedCategory === cat.id ? "bg-white text-black" : "bg-black text-white")}>
                <cat.icon size={24} />
              </div>
              <span className={cn("text-xs font-bold whitespace-nowrap", selectedCategory === cat.id ? "text-white" : "text-gray-400")}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Quick Booking Section */}
      {!selectedCategory && !searchQuery && filteredServices.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-black uppercase tracking-widest flex items-center gap-2">
              <Zap size={18} className="text-black" />
              Quick Booking
            </h3>
            <Link to="/bookings" className="text-[10px] text-black font-bold uppercase tracking-widest hover:underline">View History</Link>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {filteredServices.slice(0, 2).map((service) => (
              <motion.div
                key={`quick-${service.id}`}
                whileHover={{ scale: 1.02 }}
                className="neu-surface p-4 border-l-4 border-black flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <h4 className="font-bold text-black text-sm">{service.name}</h4>
                  <p className="text-[10px] text-gray-500 font-bold">₹{service.price}</p>
                </div>
                <button
                  onClick={() => setSelectedService(service)}
                  className="btn-primary px-4 py-2 text-[10px] uppercase tracking-widest font-bold"
                >
                  Book Now
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Alerts */}
      <AnimatePresence>
        {showBookingSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-2xl bg-green-50 border border-green-100 flex items-center gap-3 text-green-600 font-bold shadow-sm"
          >
            <CheckCircle2 size={20} />
            <span>Booking request sent successfully!</span>
          </motion.div>
        )}
        {showBusyAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 font-bold shadow-sm"
          >
            <AlertCircle size={20} />
            <span>This service is currently busy. Please try again later.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Services List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-black uppercase tracking-widest">
            {selectedCategory ? `${CATEGORIES.find(c => c.id === selectedCategory)?.name} Services` : 'Recommended'}
          </h3>
          <span className="text-xs text-gray-400 font-bold">{filteredServices.length} found</span>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-black" size={40} />
            <p className="text-gray-400 font-bold">Finding best services...</p>
          </div>
        ) : error ? (
          <div className="neu-surface py-20 text-center text-gray-400 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="text-red-400" size={32} />
            </div>
            <p className="font-bold">{error}</p>
            <button onClick={fetchServices} className="btn-primary px-6 py-2">Retry</button>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="neu-surface py-20 text-center text-gray-400 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
              <AlertCircle className="text-gray-300" size={32} />
            </div>
            <p className="font-bold">No services found matching your criteria.</p>
            <button onClick={() => {setSelectedCategory(null); setSearchQuery('');}} className="text-black font-bold text-sm underline">Reset all filters</button>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredServices.map((service) => (
              <motion.div 
                layout
                key={service.id} 
                className="neu-surface p-5 flex flex-col gap-4 relative overflow-hidden group"
              >
                {activeBookings[service.id] && (
                  <div className="absolute top-0 right-0 bg-black text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest">
                    Busy
                  </div>
                )}
                
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-lg text-black group-hover:text-gray-600 transition-colors">{service.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{service.providerName || 'Elite Professional'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-black font-bold text-xl">₹{service.price}</p>
                    <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">Service Cost</p>
                  </div>
                </div>

                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed font-medium">{service.description}</p>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase">
                        <Clock size={12} className="text-black" />
                        <span>30-45 mins</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-black font-bold uppercase">
                        <CheckCircle size={12} />
                        <span>Verified</span>
                      </div>
                    </div>
                    {profile?.role === 'user' && (
                      <button
                        onClick={() => setSelectedService(service)}
                        disabled={!!bookingLoading || activeBookings[service.id]}
                        className={cn(
                          "px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-sm",
                          activeBookings[service.id] 
                            ? "bg-gray-100 text-gray-300 cursor-not-allowed" 
                            : "btn-primary active:scale-95"
                        )}
                      >
                        {bookingLoading === service.id ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : activeBookings[service.id] ? (
                          'Busy'
                        ) : (
                          'Book Now'
                        )}
                      </button>
                    )}
                  </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="neu-surface p-8 max-w-sm w-full space-y-6"
            >
              {!isConfirming ? (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-black">Confirm Booking</h3>
                    <button 
                      onClick={() => {
                        setSelectedService(null);
                        setIsConfirming(false);
                      }} 
                      className="text-gray-400 hover:text-black"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Service</p>
                      <p className="text-black font-bold">{selectedService.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Date</label>
                        <input 
                          type="date" 
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full neu-input py-2 px-3 text-xs"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Time</label>
                        <input 
                          type="time" 
                          value={bookingTime}
                          onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full neu-input py-2 px-3 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 px-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400 font-medium">Base Price</span>
                        <span className="text-black font-bold">₹{selectedService.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 font-medium">Platform Fee (5%)</span>
                          <Info size={12} className="text-gray-300" />
                        </div>
                        <span className="text-black font-bold">+₹{(selectedService.price * 0.05).toFixed(2)}</span>
                      </div>
                      {profile?.isPremium && (
                        <div className="flex justify-between text-sm text-black font-bold">
                          <div className="flex items-center gap-1.5">
                            <Crown size={12} />
                            <span>Premium Discount (10%)</span>
                          </div>
                          <span>-₹{(selectedService.price * 0.10).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="h-px bg-gray-100 my-2" />
                      <div className="flex justify-between text-lg">
                        <span className="font-bold text-black">Total Amount</span>
                        <span className="font-bold text-black">
                          ₹{(selectedService.price + (selectedService.price * 0.05) - (profile?.isPremium ? selectedService.price * 0.10 : 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsConfirming(true)}
                    disabled={!!bookingLoading || !bookingDate || !bookingTime}
                    className="w-full btn-primary py-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CreditCard size={20} />
                    <span>Review & Pay</span>
                  </button>
                  <p className="text-[9px] text-center text-gray-400 font-medium">Secure tokenized payment via Endless Path Gateway.</p>
                </>
              ) : (
                <>
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-black">
                      <AlertCircle size={32} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-black">Confirm Details</h3>
                      <p className="text-sm text-gray-400 font-medium">Please confirm your booking for <strong>{selectedService.name}</strong> on <strong>{bookingDate}</strong> at <strong>{bookingTime}</strong>.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleBooking(selectedService)}
                      disabled={!!bookingLoading}
                      className="w-full btn-primary py-4 flex items-center justify-center gap-3"
                    >
                      {bookingLoading ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <>
                          <CheckCircle2 size={20} />
                          <span>Yes, Confirm & Pay</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setIsConfirming(false)}
                      disabled={!!bookingLoading}
                      className="w-full py-3 text-gray-400 font-bold text-sm hover:text-black transition-colors"
                    >
                      Go Back
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
