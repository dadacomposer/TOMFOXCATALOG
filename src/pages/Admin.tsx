import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, ArrowRight, Lock, User, AlertTriangle, Eye, EyeOff, Music, Users, FileText, Ticket, BarChart3, LogOut, ExternalLink, Settings, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DadaLogo } from '../components/shared/DadaLogo';
import AdminTracks from '../components/admin/AdminTracks';
import AdminUsers from '../components/admin/AdminUsers';
import AdminTickets from '../components/admin/AdminTickets';
import AdminSettings from '../components/admin/AdminSettings';
import AdminFeatures from '../components/admin/AdminFeatures';
import AdminTomFoxStudio from '../components/admin/AdminTomFoxStudio';
import { usePlayer } from '../context/PlayerContext';

export default function Admin() {
  const { currentTrack } = usePlayer();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Username, 2: Login Password, 3: Set Password
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Prevent indexing of admin page
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');
    
    return () => {
      meta.setAttribute('content', 'index, follow');
    };
  }, []);

  // Check for existing auth session in supabase
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Verify they actually have admin privileges in the database
          const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
          if (profile?.is_admin) {
            setIsAuthenticated(true);
            const email = session.user.email || '';
            if (email === 'dadacomposer@gmail.com') setUsername('danielangelucci');
            if (email === 'admin@tomfox.com') setUsername('tomfox');
          } else {
            // If they are logged in but not an admin (e.g., a normal user), sign them out of the admin panel context
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const hashPassword = async (pass: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pass);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setError('');
    setIsLoading(true);
    
    try {
      const u = username.toLowerCase().trim();
      
      if (u === 'danielangelucci' || u === 'tomfox' || u === 'dadacomposer@gmail.com' || u === 'admin@tomfox.com') {
        setStep(2);
      } else {
        setError('Invalid username or email');
      }
    } catch (err: any) {
      console.error(err);
      setError('An error occurred checking username');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setError('');
    setIsLoading(true);
    
    try {
      const u = username.toLowerCase().trim();
      let email = u;
      if (u === 'danielangelucci') email = 'dadacomposer@gmail.com';
      if (u === 'tomfox') email = 'admin@tomfox.com';
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) throw signInError;
      
      if (data.session) {
        sessionStorage.setItem('isAdminAuth', 'true');
        setIsAuthenticated(true);
      } else {
        setError('Invalid password');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const hash = await hashPassword(password);
      const { data: success, error: rpcError } = await supabase.rpc('set_tomfox_password', { p_hash: hash });
      
      if (rpcError) throw rpcError;
      
      if (success) {
        setStep(2);
        setPassword('');
        setError('');
      } else {
        setError('Failed to set password. It may already be set.');
      }
    } catch (err: any) {
      console.error(err);
      setError('An error occurred setting password');
    } finally {
      setIsLoading(false);
    }
  };

  const [activeSection, setActiveSection] = useState<'tracks' | 'users' | 'licenses' | 'tickets' | 'settings' | 'features' | 'studio'>('tracks');

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/40 text-xs font-bold uppercase tracking-widest">Verifying Access...</div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    const renderSection = () => {
      switch (activeSection) {
        case 'tracks':
          return <AdminTracks setActiveSection={setActiveSection} />;
        case 'users':
          return <AdminUsers setActiveSection={setActiveSection} />;
        case 'licenses':
          return <div className="p-8 text-center text-black/50">Licenses Management - Coming soon</div>;
        case 'tickets':
          return <AdminTickets />;
        case 'features':
          return <AdminFeatures />;
        case 'studio':
          return <AdminTomFoxStudio />;
        case 'settings':
          return <AdminSettings />;
        default:
          return null;
      }
    };

    return (
      <div className={`h-[100dvh] overflow-hidden overscroll-none bg-[#fafafa] text-black pt-20 flex transition-all duration-500 ease-out ${currentTrack ? 'pb-[90px]' : ''}`}>
        <header className="fixed top-0 left-0 w-full h-20 bg-white border-b-2 border-black/10 z-50 flex items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <img 
              src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" 
              alt="Tom Fox" 
              className="h-7" 
            />
            <div className="hidden sm:block border-l border-black/10 pl-6">
              <p className="text-[9px] text-black/40 uppercase tracking-widest font-bold mb-0.5">Logged In</p>
              <h1 className="text-xs font-bold tracking-tight text-black truncate max-w-[150px]">
                {username === 'danielangelucci' ? 'Daniel Angelucci' : username === 'tomfox' ? 'Tom Fox' : (username || 'Admin')}
              </h1>
            </div>
          </div>
          <div id="admin-navbar-center" className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"></div>
          <div></div>
        </header>
        {/* Sidebar Placeholder */}
        <div className="w-[72px] shrink-0 hidden sm:block" />

        {/* Sidebar */}
        <div className="absolute sm:left-0 top-20 bottom-0 w-[72px] hover:w-64 bg-white border-r border-black/10 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out group z-40 flex flex-col">
          
          <nav className="px-3 py-6 space-y-1 flex-grow">
            <button
              onClick={() => setActiveSection('tracks')}
              className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${activeSection === 'tracks' ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
              title="Tracks"
            >
              <div className="w-6 h-6 shrink-0 flex items-center justify-center"><Music className="w-5 h-5" /></div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Tracks</span>
            </button>
            <button
              onClick={() => setActiveSection('users')}
              className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${activeSection === 'users' ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
              title="Users"
            >
              <div className="w-6 h-6 shrink-0 flex items-center justify-center"><Users className="w-5 h-5" /></div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Users</span>
            </button>
            <button
              className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden text-black/60 opacity-50 grayscale cursor-not-allowed`}
              title="Licenses"
            >
              <div className="w-6 h-6 shrink-0 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Licenses</span>
            </button>
            <button
              onClick={() => setActiveSection('tickets')}
              className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${activeSection === 'tickets' ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
              title="Tickets"
            >
              <div className="w-6 h-6 shrink-0 flex items-center justify-center"><Ticket className="w-5 h-5" /></div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Tickets</span>
            </button>
            <button
              onClick={() => setActiveSection('studio')}
              className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${activeSection === 'studio' ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
              title="Studio"
            >
              <div className="w-6 h-6 shrink-0 flex items-center justify-center"><DadaLogo className="w-5 h-5" /></div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Studio</span>
            </button>
            <button
              onClick={() => setActiveSection('features')}
              className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${activeSection === 'features' ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
              title="Public Content"
            >
              <div className="w-6 h-6 shrink-0 flex items-center justify-center"><Settings className="w-5 h-5" /></div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Public Content</span>
            </button>
            
            <div className={`pt-6 mt-6 border-t border-black/10 flex flex-col gap-1`}>
              <button
                onClick={() => setActiveSection('settings')}
                className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${activeSection === 'settings' ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
                title="Settings"
              >
                <div className="w-6 h-6 shrink-0 flex items-center justify-center"><Settings className="w-5 h-5" /></div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Settings</span>
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.reload();
                }}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden text-red-500/60 hover:bg-red-50 hover:text-red-500"
                title="Sign Out"
              >
                <div className="w-6 h-6 shrink-0 flex items-center justify-center"><LogOut className="w-5 h-5" /></div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Sign Out</span>
              </button>
              <Link 
                to="/"
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden text-black/40 hover:bg-black/5 hover:text-black"
                title="View Site"
              >
                <div className="w-6 h-6 shrink-0 flex items-center justify-center"><ExternalLink className="w-5 h-5" /></div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">View Site</span>
              </Link>
            </div>
          </nav>
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#fafafa]">
          <main className={`flex-1 flex flex-col min-h-0 ${activeSection === 'studio' ? 'p-4 pb-0' : 'p-8 pb-0'}`}>
            {renderSection()}
          </main>

          <footer className="w-full bg-white border-t border-black/10 py-4 px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold uppercase tracking-widest text-black/40 shrink-0">
            <span>© {new Date().getFullYear()} Tom Fox Catalog</span>
            <Link to="/" className="text-black/60 hover:text-black transition-colors flex items-center gap-2">
              Return to Public Site <ExternalLink className="w-3 h-3" />
            </Link>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-black flex flex-col items-center justify-center p-4 relative z-50">
      
      <div className="absolute top-8 left-8 md:top-12 md:left-12">
        <Link to="/">
          <img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" alt="Tom Fox" className="h-6 md:h-8 hover:opacity-80 transition-opacity" />
        </Link>
      </div>

      <div className="w-full max-w-md">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tighter uppercase mb-2">Admin Portal</h1>
          <p className="text-sm text-black/50 uppercase tracking-widest font-bold">Authorized personnel only</p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-3xl border border-black/10 relative overflow-hidden shadow-2xl">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleUsernameSubmit}>
              <div className="mb-8">
                <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-3">
                  Username or Email
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#f5f5f5] border border-transparent focus:border-black/20 rounded-xl py-4 pl-12 pr-4 text-black placeholder-black/30 focus:outline-none transition-colors select-text"
                    placeholder="Enter your credentials"
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !username.trim()}
                className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {isLoading ? 'Verifying...' : 'Continue'}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleLoginSubmit}>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-black/50">
                    Password
                  </label>
                  <button 
                    type="button" 
                    onClick={() => { setStep(1); setPassword(''); setError(''); }}
                    className="text-xs text-black/40 hover:text-black font-bold uppercase tracking-widest transition-colors"
                  >
                    Change user
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#f5f5f5] border border-transparent focus:border-black/20 rounded-xl py-4 pl-12 pr-12 text-black placeholder-black/30 focus:outline-none transition-colors font-mono select-text"
                    placeholder="Enter password"
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 hover:text-black transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !password}
                className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {isLoading ? 'Authenticating...' : 'Secure Login'}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleSetupPassword}>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Set Your Password</h2>
                <p className="text-sm text-black/60 mb-6">
                  Welcome Tom. This is your first login. Please set a secure password for your admin account.
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl text-xs leading-relaxed mb-6 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <strong className="block mb-1 font-bold tracking-widest uppercase">Important Warning</strong>
                    Once established, this password cannot be modified from this panel. The developers will never know your password as it is stored using a one-way cryptographic hash. Do not lose it.
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-3">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#f5f5f5] border border-transparent focus:border-black/20 rounded-xl py-4 pl-12 pr-12 text-black placeholder-black/30 focus:outline-none transition-colors font-mono select-text"
                        placeholder="Create a strong password"
                        autoFocus
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 hover:text-black transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-black/50 mb-3">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-[#f5f5f5] border border-transparent focus:border-black/20 rounded-xl py-4 pl-12 pr-4 text-black placeholder-black/30 focus:outline-none transition-colors font-mono select-text"
                        placeholder="Repeat your password"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !password || password !== confirmPassword}
                className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {isLoading ? 'Saving...' : 'Establish Password'}
              </button>
            </form>
          )}

        </div>
        
        <div className="mt-8 text-center">
          <Link to="/" className="text-xs text-black/30 hover:text-black/60 transition-colors uppercase tracking-widest font-bold">
            Return to Public Site
          </Link>
        </div>

      </div>
    </div>
  );
}

