import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Wrench } from 'lucide-react';

export default function Header() {
  const [isHeaderDark, setIsHeaderDark] = useState(false);
  const [isTransparent, setIsTransparent] = useState(false);
  const location = useLocation();
  const { user, profile, setAccountPanelOpen, setLoginModalOpen, studioProjects } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {

    const handleScroll = () => {
      // Find the dark section on the home page
      const darkSection = document.getElementById('home-dark-section');
      if (darkSection) {
        const rect = darkSection.getBoundingClientRect();
        setIsHeaderDark(rect.top <= 88 && rect.bottom >= 88);
        setIsTransparent(rect.top > 88);
      } else {
        setIsHeaderDark(false);
        setIsTransparent(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location]);

  const isHomePage = location.pathname === '/';
  const isAdmin = user && (user.email === 'dadacomposer@gmail.com' || user.email === 'licensing@tomfoxcatalog.com');
  
  let headerBgClass = '';
  let borderClass = 'border-b-2 border-black/10';
  
  if (isHomePage) {
    if (isTransparent) {
      headerBgClass = 'bg-transparent text-black';
      borderClass = 'border-transparent';
    } else if (isHeaderDark) {
      headerBgClass = 'bg-black text-white';
      borderClass = 'border-b-2 border-white/10';
    } else {
      headerBgClass = 'bg-[#fafafa]/85 backdrop-blur-xl text-black';
      borderClass = 'border-b-2 border-black/10';
    }
  } else {
    headerBgClass = isHeaderDark 
      ? 'bg-black/85 backdrop-blur-xl text-white' 
      : 'bg-[#fafafa]/85 backdrop-blur-xl text-black';
    borderClass = isHeaderDark ? 'border-b-2 border-white/10' : 'border-b-2 border-black/10';
  }

  return (
    <header className={`fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-6 py-6 transition-colors duration-300 ${headerBgClass} ${borderClass}`}>
      <div className="flex items-baseline cursor-pointer">
        <Link to={user ? "/browse" : "/"}>
          <img 
            src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" 
            alt="Tom Fox" 
            className={`h-6 md:h-8 object-contain transition-all duration-300 ${isHeaderDark ? 'invert' : ''}`} 
          />
        </Link>
      </div>
      
      <nav className="hidden md:flex items-center gap-10 font-bold uppercase text-xs tracking-widest">
        <Link to="/browse" className={`transition-colors ${isHeaderDark ? 'hover:text-white/50' : 'hover:text-black/50'}`}>Browse</Link>
        <Link to="/playlists" className={`transition-colors ${isHeaderDark ? 'hover:text-white/50' : 'hover:text-black/50'}`}>Playlists</Link>
        {user && (
          <div className="flex items-center gap-10">
            <Link to="/my-music" className={`transition-colors ${isHeaderDark ? 'hover:text-white/50' : 'hover:text-black/50'}`}>My Music</Link>
          </div>
        )}
        {(!user || profile?.subscription_status !== 'active') && settings.subscriptions_enabled && (
          <>
            <Link to="/pricing" className={`transition-colors ${isHeaderDark ? 'hover:text-white/50' : 'hover:text-black/50'}`}>Pricing</Link>
            <Link to="/enterprise" className={`transition-colors ${isHeaderDark ? 'hover:text-white/50' : 'hover:text-black/50'}`}>Enterprise</Link>
          </>
        )}
        {isAdmin && (
          <Link 
            to="/admin" 
            className={`flex items-center justify-center ml-4 w-8 h-8 rounded-full transition-colors ${isHeaderDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
            title="Admin Panel"
          >
            <Wrench className="w-4 h-4" />
          </Link>
        )}
        {user ? (
        <button 
          onClick={() => setAccountPanelOpen(true)}
          className="is-avatar ml-2 w-8 h-8 aspect-square flex items-center justify-center shrink-0 bg-black/5 border border-black/10 hover:border-black/30 transition-all overflow-hidden"
        >
          {profile?.avatar_url || user.user_metadata?.avatar_url ? (
            <img 
              src={profile?.avatar_url || user.user_metadata?.avatar_url} 
              alt="Profile" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('fallback-avatar');
              }}
            />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          )}
          {/* Fallback SVG for when image fails to load, normally hidden via CSS unless parent has .fallback-avatar */}
          <svg className="hidden fallback-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      ) : (
          <button onClick={() => setLoginModalOpen(true)} className={`ml-4 flex items-center gap-2 transition-colors ${isHeaderDark ? 'hover:text-white/50' : 'hover:text-black/50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Sign Up</span>
          </button>
        )}
      </nav>
    </header>
  );
}
