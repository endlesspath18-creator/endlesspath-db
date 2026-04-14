/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, Component, ErrorInfo, useMemo, useCallback, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, getDocFromServer, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { UserProfile, UserRole } from './types';
import { Home, LogIn, User as UserIcon, Calendar, PlusSquare, LogOut, Settings, AlertCircle, Crown, Shield } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ErrorBoundary from './components/ErrorBoundary';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

// --- Page Error Boundary ---
interface PageErrorBoundaryProps {
  children: ReactNode;
}

interface PageErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PageErrorBoundary extends React.Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  constructor(props: PageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Page error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="neu-surface p-8 m-4 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <AlertCircle className="text-red-500" size={24} />
          </div>
          <h3 className="text-lg font-bold text-[#1c1917]">Page failed to load</h3>
          <p className="text-gray-500 text-xs">We encountered an error while rendering this screen.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-secondary py-2 px-4 text-xs"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (auth.currentUser) {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        setProfile(null);
      }
    }
  };

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            
            // Self-healing: Ensure admin email has admin role
            if (firebaseUser.email === 'endlesspath18@gmail.com' && data.role !== 'admin') {
              try {
                await updateDoc(docRef, { role: 'admin' });
              } catch (err) {
                console.error("Failed to auto-upgrade admin role:", err);
              }
            }

            // Subscription Check (Lazy)
            if (data.premiumUntil) {
              const expiryDate = data.premiumUntil.toDate();
              const gracePeriod = 3 * 24 * 60 * 60 * 1000; // 3 days
              const now = Date.now();
              
              if (now > expiryDate.getTime() + gracePeriod) {
                if (!data.servicesDisabled) {
                  try {
                    await updateDoc(docRef, { servicesDisabled: true, isPremium: false });
                  } catch (err) {
                    console.error("Failed to disable services:", err);
                  }
                }
              } else if (now > expiryDate.getTime()) {
                // Expired but within grace period
                if (data.isPremium) {
                  try {
                    await updateDoc(docRef, { isPremium: false });
                  } catch (err) {
                    console.error("Failed to update premium status:", err);
                  }
                }
              }
            }
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile sync error:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Components ---

const NavItem = memo(({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active?: boolean }) => {
  return (
    <Link to={to} className={cn(
      "flex flex-col items-center justify-center gap-1 transition-all duration-300",
      active ? "text-black scale-110" : "text-gray-400"
    )}>
      <div className={cn(
        "p-2 rounded-xl transition-all duration-300",
        active ? "bg-black text-white shadow-sm" : ""
      )}>
        <Icon size={22} />
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
    </Link>
  );
});

// --- Page Container ---
const PageContainer = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  
  useEffect(() => {
    // Page initialization logic
    console.log(`Page mounted: ${location.pathname}`);
    
    return () => {
      // Page disposal logic
      console.log(`Page unmounted: ${location.pathname}`);
    };
  }, [location.pathname]);

  return (
    <PageErrorBoundary>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="w-full"
      >
        {children}
      </motion.div>
    </PageErrorBoundary>
  );
};

// --- Backend Health Check ---
const useBackendHealth = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/health`);
        setIsHealthy(res.ok);
      } catch (err) {
        setIsHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return isHealthy;
};

function Layout({ children }: { children: ReactNode }) {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const isHealthy = useBackendHealth();

  const navItems = useMemo(() => {
    if (!profile) return null;
    return (
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[calc(448px-3rem)] h-16 glass-card px-4 flex items-center justify-between z-20">
        <NavItem to="/" icon={Home} label="Book" active={location.pathname === '/'} />
        {profile.role === 'user' && (
          <NavItem to="/bookings" icon={Calendar} label="My Bookings" active={location.pathname === '/bookings'} />
        )}
        {profile.role === 'provider' && (
          <NavItem to="/provider" icon={PlusSquare} label="Hub" active={location.pathname === '/provider'} />
        )}
        {(profile.role === 'admin' || user?.email === 'endlesspath18@gmail.com') && (
          <NavItem to="/admin" icon={Shield} label="Admin" active={location.pathname === '/admin'} />
        )}
        {profile.role === 'user' && (
          <NavItem to="/premium" icon={Crown} label={profile.isPremium ? "Pro" : "Upgrade"} active={location.pathname === '/premium'} />
        )}
        <NavItem to="/settings" icon={Settings} label="Settings" active={location.pathname === '/settings'} />
      </nav>
    );
  }, [profile, user, location.pathname]);

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white shadow-2xl relative overflow-hidden border-x border-gray-100">
      {/* Health Status Indicator */}
      {isHealthy === false && (
        <div className="bg-red-500 text-white text-[10px] py-1 px-4 text-center animate-pulse z-50">
          Backend connection lost. Some features may be unavailable.
        </div>
      )}

      {/* Header */}
      <header className="p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[1.25rem] overflow-hidden neu-surface p-1 shadow-sm border border-gray-100">
            <img 
              src="https://picsum.photos/seed/endlesspath/200/200" 
              alt="Endless Path Logo" 
              className="w-full h-full object-cover rounded-[1rem]"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-black flex items-center gap-1">
              Endless <span className="text-black">Path</span>
            </h1>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em]">Premium Marketplace</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {profile?.role === 'user' && profile?.isPremium && (
            <Link to="/premium" className="p-2 rounded-xl bg-black text-white shadow-sm">
              <Crown size={20} />
            </Link>
          )}
          {profile && (
            <button onClick={logout} className="p-2.5 rounded-xl neu-surface text-black active:neu-surface-pressed">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      {navItems}
    </div>
  );
}

// --- Pages (Placeholders) ---
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import BookingsPage from './pages/BookingsPage';
import SettingsPage from './pages/SettingsPage';
import ProviderPage from './pages/ProviderPage';
import PremiumPage from './pages/PremiumPage';
import AdminPage from './pages/AdminPage';

function PrivateRoute({ children, role }: { children: ReactNode, role?: UserRole }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && profile?.role !== role) {
    // Special case for admin email
    if (role === 'admin' && user?.email === 'endlesspath18@gmail.com') {
      return <>{children}</>;
    }
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/login" element={<PageContainer><LoginPage /></PageContainer>} />
              <Route path="/register" element={<PageContainer><RegisterPage /></PageContainer>} />
              <Route path="/" element={<PrivateRoute><PageContainer><HomePage /></PageContainer></PrivateRoute>} />
              <Route path="/bookings" element={<PrivateRoute><PageContainer><BookingsPage /></PageContainer></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><PageContainer><SettingsPage /></PageContainer></PrivateRoute>} />
              <Route path="/premium" element={<PrivateRoute><PageContainer><PremiumPage /></PageContainer></PrivateRoute>} />
              <Route path="/provider" element={<PrivateRoute role="provider"><PageContainer><ProviderPage /></PageContainer></PrivateRoute>} />
              <Route path="/admin" element={<PrivateRoute role="admin"><PageContainer><AdminPage /></PageContainer></PrivateRoute>} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
