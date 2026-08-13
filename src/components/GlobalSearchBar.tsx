import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useSearchBar } from '../context/SearchBarContext';
import { usePlayer } from '../context/PlayerContext';

export default function GlobalSearchBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { rightContent, bottomContent, isAnimating, setIsAnimating } = useSearchBar();
  const { currentTrack } = usePlayer();

  const isDiscover = location.pathname === '/';
  const isBrowse = location.pathname.startsWith('/browse');

  const [query, setQuery] = useState(searchParams.get('q') || '');
  
  // Sync URL query when moving to Browse
  useEffect(() => {
    if (isBrowse) {
      setQuery(searchParams.get('q') || '');
    }
  }, [searchParams, isBrowse]);

  if (!isDiscover && !isBrowse) return null;

  const handleClear = () => {
    setQuery('');
    if (isBrowse) {
      navigate('/browse');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (isDiscover) {
        setIsAnimating(true);
        setTimeout(() => {
          setIsAnimating(false);
          const target = query.trim() ? `/browse?q=${encodeURIComponent(query.trim())}` : '/browse';
          navigate(target);
        }, 600); // slightly faster for better UX
      } else {
        const target = query.trim() ? `/browse?q=${encodeURIComponent(query.trim())}` : '/browse';
        navigate(target, { replace: true });
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (isDiscover && val.trim()) {
      navigate(`/browse?q=${encodeURIComponent(val.trim())}`);
    } else if (isBrowse) {
      const params = new URLSearchParams(searchParams);
      if (val.trim()) {
        params.set('q', val);
      } else {
        params.delete('q');
      }
      navigate({ search: params.toString() }, { replace: true });
    }
  };

  const isAtBottom = isDiscover;

  return (
    <div className={`search-bar w-full px-8 flex flex-col py-6 focus-within:border-black/30 group/searchbar relative z-40 no-radius !rounded-none`}>
      <div className="flex max-md:flex-col md:items-center w-full !rounded-none gap-4 md:gap-0">
        <div className="flex items-center w-full flex-grow">
          <div 
            className="cursor-pointer group-hover/searchbar:text-black/80 group-focus-within/searchbar:text-black transition-colors z-10 text-black/50" 
            onClick={() => {
              if (isDiscover) {
                handleKeyDown({ key: 'Enter', preventDefault: () => {} } as any);
              }
            }}
          >
            <Search className="w-5 h-5 mr-4 shrink-0 transition-colors" />
          </div>
          
          <div className="relative flex-grow flex items-center">
            <input 
              type="text" 
              placeholder="DESCRIBE THE MUSIC YOU NEED..." 
              className="w-full bg-transparent outline-none font-medium uppercase text-[13px] tracking-widest placeholder:text-black/30 text-black relative z-10"
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
            <div className="absolute left-0 top-0 bottom-0 flex items-center pointer-events-none z-0">
               <span className="invisible whitespace-pre font-medium uppercase text-[13px] tracking-widest">{query}</span>
               {!isBrowse && query.trim() !== '' && (
                 <span className="ml-2 text-[10px] uppercase font-medium text-black/40 tracking-widest animate-pulse whitespace-nowrap">Press Enter ↵</span>
               )}
            </div>
          </div>

          {query.trim() !== '' && (
            <div className="flex items-center ml-2 z-10">
              <button 
                onClick={handleClear}
                className="text-black/40 hover:text-black transition-colors rounded-full p-1 hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Browse specific actions injects here */}
        {!isAtBottom && (
          <div id="searchbar-right-portal" className="flex items-center max-md:w-full max-md:justify-between max-md:pt-4 max-md:border-t max-md:border-black/5 empty:hidden gap-4 shrink-0 z-10 relative animate-in fade-in duration-500 delay-200 fill-mode-both" />
        )}
      </div>

      {/* Browse specific filters injects here */}
      {!isAtBottom && (
        <div id="searchbar-bottom-portal" className="w-full animate-in fade-in duration-500 delay-300 fill-mode-both" />
      )}
    </div>
  );
}
