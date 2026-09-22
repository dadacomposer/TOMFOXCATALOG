import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Home from './Home';
import Browse from './Browse';
import GlobalSearchBar from '../components/GlobalSearchBar';
import { usePlayer } from '../context/PlayerContext';

export default function DiscoverBrowseWrapper() {
  const location = useLocation();
  const isBrowse = location.pathname.startsWith('/browse');
  const { currentTrack } = usePlayer();
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const navHeight = isMobile ? 73 : 81; // 73px for mobile (24+24+24+1), 81px for desktop (24+32+24+1)
  const playerHeight = currentTrack ? 90 : 0;

  const isDiscover = location.pathname === '/';
  const searchBarHeight = 69; // 68px for py-6 + input, 1px for border-t

  // Height calculation for translate-y:
  return (
    <div className="relative flex-1 w-full overflow-hidden flex flex-col bg-[#fafafa] no-radius !rounded-none">
      
      {/* Background Layer: Discover (Home) */}
      <div 
        className="absolute inset-0 z-0 overflow-y-auto overscroll-none"
        id="discover-scroll-container"
      >
        <Home />
      </div>
      
      {/* Foreground Layer: Search Bar + Browse */}
      <div 
        className={`discover-browse-panel absolute inset-x-0 z-10 flex flex-col motion-page no-radius !rounded-none`}
        style={{ 
          // On Discover the search bar is the visible edge of this panel. Keep
          // that edge directly above the persistent player instead of allowing
          // the player to cover it. Browse keeps its existing full-height panel
          // and transition behaviour.
          bottom: isDiscover ? `${playerHeight}px` : 0,
          height: `calc(100dvh - ${navHeight + (isDiscover ? playerHeight : 0)}px)`,
          transform: isBrowse ? 'translateY(0)' : `translateY(calc(100% - ${searchBarHeight}px))`
        }}
      >
        {/* We keep GlobalSearchBar sticky at the top of this sliding panel */}
        <div className="shrink-0 bg-[#fafafa] border-t border-black/5 shadow-sm no-radius !rounded-none z-50 relative">
          <GlobalSearchBar />
        </div>
        
        {/* Browse Page Container */}
        <div className="flex-1 w-full bg-[#fafafa] overflow-hidden flex flex-col no-radius !rounded-none">
          <Browse />
        </div>
      </div>
      
    </div>
  );
}
