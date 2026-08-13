import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, User, Music, Users, FileText, Ticket, LogOut, ExternalLink, Settings, Tag, BarChart, ListMusic, Palette } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { DadaLogo } from '../components/shared/DadaLogo';
import NotFound from './NotFound';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { Wrench } from 'lucide-react';

export default function Admin() {
  const { currentTrack } = usePlayer();
  const { user, profile, loading, setAccountPanelOpen, setLoginModalOpen } = useAuth();
  const location = useLocation();
  const isAdminTheaterRoute = /^\/admin\/studio\/[^/]+/.test(location.pathname);

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

  const isAdmin = user && (user.email === 'dadacomposer@gmail.com' || user.email === 'licensing@tomfoxcatalog.com' || (profile as any)?.is_admin);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] text-black flex items-center justify-center p-4">
        <div className="text-black/40 text-xs font-bold uppercase tracking-widest">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <NotFound />;
  }


  return (
    <div className={`h-[100dvh] overflow-hidden overscroll-none bg-[#fafafa] text-black pt-20 flex ${currentTrack ? 'pb-[90px]' : ''}`}>
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-6 py-6 bg-white border-b-2 border-black/10">
        <div className="flex items-baseline cursor-pointer">
          <Link to="/">
            <img 
              src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" 
              alt="Tom Fox" 
              className="h-6 md:h-8 object-contain" 
            />
          </Link>
        </div>
        <div id="admin-navbar-center" className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"></div>
        
        <nav className="hidden md:flex items-center gap-10 font-bold uppercase text-xs tracking-widest relative z-10">
          {!isAdminTheaterRoute && (
            <>
              <Link to="/" className="transition-colors hover:text-black/50">Discover</Link>
              <Link to="/browse" className="transition-colors hover:text-black/50">Browse</Link>
              <Link to="/playlists" className="transition-colors hover:text-black/50">Playlists</Link>
              <Link to="/my-music" className="transition-colors hover:text-black/50">My Music</Link>
            </>
          )}
          <Link 
            to="/admin" 
            className="flex items-center justify-center ml-4 w-8 h-8 rounded-full transition-colors hover:bg-black/5 text-black"
            title="Admin Panel"
          >
            <Wrench className="w-4 h-4" />
          </Link>
          {user ? (
            <button 
              onClick={() => setAccountPanelOpen(true)}
              className="is-avatar ml-2 w-8 h-8 aspect-square flex items-center justify-center shrink-0 bg-black/5 border border-black/10 hover:border-black/30 transition-all overflow-hidden"
            >
              {profile?.avatar_url || user.user_metadata?.avatar_url ? (
                <img 
                  src={profile?.avatar_url || user.user_metadata?.avatar_url} 
                  className="w-full h-full object-cover" 
                  alt="User" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('fallback-avatar');
                  }}
                />
              ) : (
                <User className="w-4 h-4 text-black/60" />
              )}
              <svg className="hidden fallback-svg text-black/40 w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          ) : null}
        </nav>
      </header>
      {/* Sidebar Placeholder */}
      <div className="w-[72px] shrink-0 hidden sm:block" />

      {/* Sidebar */}
      <div className="absolute sm:left-0 top-20 bottom-0 w-[72px] hover:w-64 bg-white border-r border-black/10 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out group z-40 flex flex-col">
        <nav className="px-3 py-6 space-y-1 flex-grow">
          <NavLink
            to="/admin/tracks"
            className={({ isActive }) => `w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${isActive ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
            title="Tracks"
          >
            <div className="w-6 h-6 shrink-0 flex items-center justify-center"><Music className="w-5 h-5" /></div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Tracks</span>
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) => `w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${isActive ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
            title="Users"
          >
            <div className="w-6 h-6 shrink-0 flex items-center justify-center"><Users className="w-5 h-5" /></div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Users</span>
          </NavLink>
          <NavLink
            to="/admin/licensing"
            className={({ isActive }) => `w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${isActive ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
            title="Licensing"
          >
            <div className="w-6 h-6 shrink-0 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Licensing</span>
          </NavLink>

          <NavLink
            to="/admin/statistics"
            className={({ isActive }) => `w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${isActive ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
            title="Statistics"
          >
            <div className="w-6 h-6 shrink-0 flex items-center justify-center"><BarChart className="w-5 h-5" /></div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Statistics</span>
          </NavLink>


          <NavLink
            to="/admin/studio"
            className={({ isActive }) => `w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${isActive ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
            title="Studio"
          >
            <div className="w-6 h-6 shrink-0 flex items-center justify-center"><DadaLogo className="w-5 h-5" /></div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Studio</span>
          </NavLink>
          <NavLink
            to="/admin/features"
            className={({ isActive }) => `w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${isActive ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
            title="Content"
          >
            <div className="w-6 h-6 shrink-0 flex items-center justify-center"><Palette className="w-5 h-5" /></div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Content</span>
          </NavLink>
          
          <div className={`pt-6 mt-6 border-t border-black/10 flex flex-col gap-1`}>
            <NavLink
              to="/admin/settings"
              className={({ isActive }) => `w-full flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden ${isActive ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
              title="Settings"
            >
              <div className="w-6 h-6 shrink-0 flex items-center justify-center"><Settings className="w-5 h-5" /></div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Settings</span>
            </NavLink>
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
        <main className={`flex-1 flex flex-col min-h-0 ${isAdminTheaterRoute ? 'p-4 pb-0' : 'p-8 pb-0'}`}>
          <Outlet />
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
