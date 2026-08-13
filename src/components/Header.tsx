import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Wrench, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const [isHeaderDark, setIsHeaderDark] = useState(false);
  const [isTransparent, setIsTransparent] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeBoxStyle, setActiveBoxStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const navRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, setAccountPanelOpen, setLoginModalOpen, studioProjects } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      let scrollContainer = document.getElementById('discover-scroll-container');
      
      if (location.pathname.startsWith('/browse')) {
        setIsHeaderDark(false);
        setIsTransparent(false);
        return;
      }

      // Check scroll position for transparency
      let scrolledAmount = 0;
      if (scrollContainer) {
        scrolledAmount = scrollContainer.scrollTop;
      } else {
        scrolledAmount = window.scrollY;
      }
      setIsScrolled(scrolledAmount > 10);

      // Find the dark section on the home page
      const isHomePage = location.pathname === '/';
      
      if (!user && isHomePage) {
        setIsHeaderDark(true);
        setIsTransparent(false);
      } else {
        const darkSection = document.getElementById('home-dark-section');
        if (darkSection) {
          const rect = darkSection.getBoundingClientRect();
          setIsHeaderDark(rect.top <= 88 && rect.bottom >= 88);
          setIsTransparent(rect.top > 88);
        } else {
          setIsHeaderDark(false);
          setIsTransparent(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check for the discover-scroll-container in a slight timeout just in case it renders after
    let scrollContainer = document.getElementById('discover-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      setTimeout(() => {
        scrollContainer = document.getElementById('discover-scroll-container');
        if (scrollContainer) {
          scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        }
      }, 100);
    }
    
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollContainer) scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname, user?.id]);

  useEffect(() => {
    // Measure active link for sliding box
    if (navRef.current) {
      // Need a slight delay to ensure DOM is updated after path change
      setTimeout(() => {
        if (!navRef.current) return;
        const activeLink = navRef.current.querySelector('.active') as HTMLElement;
        if (activeLink && activeLink.tagName === 'A') { // Ensure it's the anchor tag
          setActiveBoxStyle({
            left: activeLink.offsetLeft,
            width: activeLink.offsetWidth,
            opacity: 1
          });
        } else {
          setActiveBoxStyle(prev => ({ ...prev, opacity: 0 }));
        }
      }, 50);
    }
  }, [location.pathname, user]);

  const isHomePage = location.pathname === '/';
  const isAdmin = user && (user.email === 'dadacomposer@gmail.com' || user.email === 'licensing@tomfoxcatalog.com');
  
  let headerBgClass = '';
  let borderClass = 'border-b-2 border-black/10';
  
  if (isHomePage) {
    if (isTransparent) {
      headerBgClass = 'bg-transparent text-black';
      borderClass = 'border-transparent';
    } else if (isHeaderDark) {
      headerBgClass = (!user && !isScrolled) ? 'bg-transparent text-white' : 'bg-black/95 backdrop-blur-xl text-white';
      borderClass = (!user && !isScrolled) ? 'border-transparent' : 'border-b-2 border-white/10';
    } else {
      headerBgClass = 'bg-[#fafafa]/85 backdrop-blur-xl text-black';
      borderClass = 'border-b-2 border-black/10';
    }
  } else {
    // Solid light mode (no glass effect)
    headerBgClass = 'bg-[#fafafa] text-black shadow-sm';
    borderClass = 'border-b border-black/5';
  }

  return (
    <header className={`fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-6 py-6 transition-colors duration-300 no-radius !rounded-none ${headerBgClass} ${borderClass}`}>
      <div className="flex items-baseline cursor-pointer z-10 !rounded-none">
        <Link to="/">
          <img 
            src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" 
            alt="Tom Fox" 
            className={`h-6 md:h-8 object-contain transition-all duration-300 ${isHeaderDark ? 'invert' : ''}`} 
          />
        </Link>
      </div>
      
      <nav ref={navRef} className="hidden md:flex items-center gap-10 font-bold uppercase text-xs tracking-widest relative z-10">
        <div 
          className={`absolute h-8 top-1/2 -translate-y-1/2 transition-all duration-500 ease-out pointer-events-none ${isHeaderDark ? 'bg-white/20' : 'bg-black/5'}`} 
          style={{ 
            left: `${activeBoxStyle.left - 12}px`, 
            width: `${activeBoxStyle.width + 24}px`, 
            opacity: activeBoxStyle.opacity 
          }} 
        />
        <NavLink to="/" className={({isActive}) => `transition-colors relative z-10 py-2 ${isActive ? 'active ' + (isHeaderDark ? 'text-white' : 'text-black') : (isHeaderDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')}`}>Discover</NavLink>
        <NavLink to="/browse" className={({isActive}) => `transition-colors relative z-10 py-2 ${isActive ? 'active ' + (isHeaderDark ? 'text-white' : 'text-black') : (isHeaderDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')}`}>Browse</NavLink>
        <NavLink to="/playlists" className={({isActive}) => `transition-colors relative z-10 py-2 ${isActive ? 'active ' + (isHeaderDark ? 'text-white' : 'text-black') : (isHeaderDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')}`}>Playlists</NavLink>
        {user && (
          <div className="flex items-center gap-10">
            <NavLink to="/my-music" className={({isActive}) => `transition-colors relative z-10 py-2 ${isActive ? 'active ' + (isHeaderDark ? 'text-white' : 'text-black') : (isHeaderDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')}`}>My Music</NavLink>
          </div>
        )}
        {(!user || profile?.subscription_status !== 'active') && settings.subscriptions_enabled && (
          <>
            <NavLink to="/pricing" className={({isActive}) => `transition-colors relative z-10 py-2 ${isActive ? 'active ' + (isHeaderDark ? 'text-white' : 'text-black') : (isHeaderDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')}`}>Pricing</NavLink>
            <NavLink to="/enterprise" className={({isActive}) => `transition-colors relative z-10 py-2 ${isActive ? 'active ' + (isHeaderDark ? 'text-white' : 'text-black') : (isHeaderDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')}`}>Enterprise</NavLink>
          </>
        )}
        {isAdmin && (
          <Link 
            to="/admin" 
            className={`flex items-center justify-center ml-4 w-8 h-8 rounded-full transition-colors relative z-10 ${isHeaderDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-black'}`}
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

      {/* Mobile Controls */}
      <div className="flex md:hidden items-center gap-4 z-20">
        {user ? (
          <button 
            onClick={() => setAccountPanelOpen(true)}
            className="is-avatar w-8 h-8 aspect-square flex items-center justify-center shrink-0 bg-black/5 border border-black/10 hover:border-black/30 transition-all overflow-hidden"
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
          </button>
        ) : (
          <button onClick={() => setLoginModalOpen(true)} className={`flex items-center gap-2 transition-colors ${isHeaderDark ? 'text-white' : 'text-black'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
        )}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className={`p-2 transition-colors ${isHeaderDark ? 'text-white' : 'text-black'}`}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-full left-0 w-full shadow-xl flex flex-col p-6 gap-6 md:hidden z-10 border-b ${isHeaderDark ? 'bg-[#111111] border-white/10' : 'bg-[#fafafa] border-black/10'}`}
          >
            <NavLink to="/" className={({isActive}) => `font-bold uppercase text-xl tracking-widest transition-colors ${isActive ? (isHeaderDark ? 'text-white' : 'text-black') : (isHeaderDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')}`}>Discover</NavLink>
            <NavLink to="/browse" className={({isActive}) => `font-bold uppercase text-xl tracking-widest transition-colors ${isActive ? (isHeaderDark ? 'text-white' : 'text-black') : (isHeaderDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')}`}>Browse</NavLink>
            <NavLink to="/playlists" className={({isActive}) => `font-bold uppercase text-xl tracking-widest transition-colors ${isActive ? (isHeaderDark ? 'text-white' : 'text-black') : (isHeaderDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')}`}>Playlists</NavLink>
            {user && (
              <NavLink to="/my-music" className={({isActive}) => `font-bold uppercase text-xl tracking-widest transition-colors ${isActive ? (isHeaderDark ? 'text-white' : 'text-black') : (isHeaderDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')}`}>My Music</NavLink>
            )}
            {(!user || profile?.subscription_status !== 'active') && settings.subscriptions_enabled && (
              <>
                <NavLink to="/pricing" className={({isActive}) => `font-bold uppercase text-xl tracking-widest transition-colors ${isActive ? (isHeaderDark ? 'text-white' : 'text-black') : (isHeaderDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')}`}>Pricing</NavLink>
                <NavLink to="/enterprise" className={({isActive}) => `font-bold uppercase text-xl tracking-widest transition-colors ${isActive ? (isHeaderDark ? 'text-white' : 'text-black') : (isHeaderDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')}`}>Enterprise</NavLink>
              </>
            )}
            {isAdmin && (
              <Link to="/admin" className={`font-bold uppercase text-xl tracking-widest flex items-center gap-2 ${isHeaderDark ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'}`}>
                <Wrench className="w-5 h-5" />
                Admin Panel
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
