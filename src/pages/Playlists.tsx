import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchPlaylists, supabase } from '../lib/supabase';
import { ChevronRight, Star, Search } from 'lucide-react';
import PlaylistArtwork from '../components/PlaylistArtwork';
import PlaylistIsland from '../components/PlaylistIsland';
import { AnimatePresence } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

type Playlist = {
  id: string;
  title: string;
  description: string;
  is_featured?: boolean;
  human_tags?: string[];
  track_count?: number;
  track_ids?: string[];
  categories?: string[];
  created_at?: string;
};

export default function Playlists() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const playlistUrlId = searchParams.get('playlist');
  const { settings } = useSettings();
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  
  const { playTrack, currentSource, audioRef, setIsCurrentPreviewDormant, setPendingSeek, progress } = usePlayer();
  const { user, loading: authLoading, setLoginModalOpen } = useAuth();

  const handleSeek = (track: any, percentage: number) => {
    if (audioRef?.current) {
      const duration = audioRef.current.duration || 0;
      audioRef.current.currentTime = (percentage / 100) * duration;
    } else {
      playTrack(track, [], currentSource || undefined);
      setIsCurrentPreviewDormant(true);
      setPendingSeek(percentage);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    async function load() {
      try {
        const [data, contentData] = await Promise.all([
          fetchPlaylists(),
          supabase.from('page_content').select('content').eq('page_id', 'playlists').single()
        ]);
        
        setPlaylists(data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPlaylists = useMemo(() => {
    let result = playlists.filter(pl => 
      pl.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        break;
      case 'a-z':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'z-a':
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'relevance':
      default:
        // Use the original fetch order (which is by sort_order / created_at)
        break;
    }
    
    return result;
  }, [playlists, searchQuery, sortBy]);

  return (
    <div className="relative flex flex-col w-full min-h-screen pt-[84px] md:pt-[80px] bg-[#fafafa] text-black">
      {/* HUGE DRIBBBLE LOGO WATERMARK */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <img src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" className="absolute top-10 -right-20 w-[120%] md:w-[60%] opacity-[0.02] rotate-12 select-none mix-blend-multiply" alt="" />
      </div>
      
      <AnimatePresence>
        {playlistUrlId && (
          <PlaylistIsland 
            id={playlistUrlId}
            onClose={() => {
              searchParams.delete('playlist');
              setSearchParams(searchParams);
            }}
            progress={progress}
            handleSeek={handleSeek}
            formatTime={formatTime}
            trendingTrackIds={new Set()}
          />
        )}
      </AnimatePresence>

      <div 
        className={`sticky top-[84px] md:top-[80px] z-30 bg-[#fafafa]/85 backdrop-blur-xl w-full px-8 md:px-12 lg:px-24 flex flex-col border-b border-black/10 py-4 mb-16 shadow-sm focus-within:border-black/30 group/searchbar`}
      >
        <div className="flex items-center w-full">
          <div className="group-hover/searchbar:text-black/80 group-focus-within/searchbar:text-black transition-colors z-10">
            <Search className="w-5 h-5 mr-4 shrink-0 transition-colors text-black/50" />
          </div>
          
          <div className="relative flex-grow flex items-center">
            <input 
              type="text" 
              placeholder="SEARCH PLAYLISTS..." 
              className="w-full bg-transparent outline-none font-medium uppercase text-[13px] tracking-widest placeholder:text-black/30 text-black relative z-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-[1px] h-4 bg-black/10 mx-4" />
          <div className="relative flex items-center gap-2 z-20 shrink-0" ref={sortDropdownRef}>
            <span className="text-[10px] font-medium tracking-widest uppercase text-black/40 hidden md:inline">Sort</span>
            <button 
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-black outline-none cursor-pointer"
            >
              {sortBy === 'relevance' ? 'Relevance' : sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : sortBy === 'a-z' ? 'A-Z' : 'Z-A'}
              <svg className={`w-3 h-3 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            
            {isSortDropdownOpen && (
              <div className="absolute top-full right-0 mt-4 w-48 bg-white border border-black/10 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                {[
                  { id: 'relevance', label: 'Relevance' },
                  { id: 'newest', label: 'Newest' },
                  { id: 'oldest', label: 'Oldest' },
                  { id: 'a-z', label: 'A-Z' },
                  { id: 'z-a', label: 'Z-A' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setSortBy(opt.id); setIsSortDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 no-radius !rounded-none ${sortBy === opt.id ? 'bg-black/5 text-black' : 'text-black/60 hover:bg-black/5 hover:text-black'}`}
                  >
                    {sortBy === opt.id ? <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <div className="w-3 h-3 shrink-0" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Playlists Grid / Rows */}
      <div className="w-full px-8 md:px-12 lg:px-24 pb-24 overflow-hidden relative z-10">
        {loading ? (
          <div className="mb-16">
            <div className="flex overflow-x-hidden gap-6 md:gap-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col p-4 rounded-[32px] shrink-0 w-[280px] sm:w-[320px] md:w-[340px]">
                  <div className="relative w-full aspect-[1.15] mb-6">
                     <div className="absolute top-0 right-0 w-[72%] aspect-square rounded-[28px] bg-[#e5e5e5] animate-pulse" />
                     <div className="absolute top-0 right-[9%] w-[72%] aspect-square rounded-[28px] bg-[#e5e5e5] animate-pulse" />
                     <div className="absolute top-0 right-[18%] w-[72%] aspect-square rounded-[28px] bg-[#e5e5e5] animate-pulse" />
                     <div className="absolute top-0 left-0 w-[72%] aspect-square rounded-[28px] bg-[#e5e5e5] animate-pulse" />
                  </div>
                  <div className="flex flex-col px-2 pb-2 gap-2 mt-2">
                    <div className="h-5 bg-[#e5e5e5] rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-[#e5e5e5] rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredPlaylists.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-20 opacity-50">
             <Search className="w-12 h-12 mb-4" />
             <p className="font-bold uppercase tracking-widest text-sm">No playlists found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
            {filteredPlaylists.map((pl) => (
              <div 
                key={pl.id} 
                className="flex flex-col bg-transparent hover:bg-[#f6f6f6] p-4 rounded-[32px] group cursor-pointer transition-all duration-300 border border-transparent hover:border-black/5 relative"
                onClick={() => setSearchParams({ playlist: pl.id })}
              >
                
                <div className={`relative w-full mb-6 ${settings.public_artwork_frames_enabled ? 'aspect-[1.15]' : 'aspect-square'}`}>
                   {pl.is_featured && (
                     <div className="absolute bottom-2 left-2 z-30 bg-yellow-400 text-black p-2 rounded-full shadow-lg pointer-events-none">
                       <Star className="w-4 h-4 fill-black" />
                     </div>
                   )}
                   {settings.public_artwork_frames_enabled ? (
                    <>
                      <PlaylistArtwork playlist={pl as any} className="absolute top-0 right-0 w-[78%] aspect-square shadow-md group-hover:scale-[1.02] transition-transform cursor-pointer z-0" />
                      <PlaylistArtwork playlist={pl as any} className="absolute top-[3%] right-[11%] w-[78%] aspect-square shadow-md group-hover:scale-[1.02] transition-transform cursor-pointer z-10" />
                      <PlaylistArtwork playlist={pl as any} className="absolute top-[6%] left-0 w-[78%] aspect-square shadow-xl group-hover:scale-[1.02] transition-transform cursor-pointer z-20" />
                    </>
                  ) : (
                    <PlaylistArtwork playlist={pl as any} className="absolute top-0 left-0 w-[100%] h-[100%] shadow-md group-hover:scale-[1.02] transition-transform cursor-pointer z-20 rounded-[32px]" />
                  )}
                </div>
                <div className="flex flex-col px-2 pb-2 mt-2">
                  <h3 className="font-bold text-[18px] uppercase tracking-tighter text-black truncate mb-1">
                    {pl.title}
                  </h3>
                  <div className="font-sans text-[11px] uppercase tracking-widest text-black/50 line-clamp-2 leading-relaxed">
                    {pl.track_count || 0} tracks
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      {!user && !authLoading && (
        <div className="w-full bg-[#f6f6f6] py-32 px-8 md:px-12 lg:px-24 flex flex-col items-center justify-center text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter leading-[0.95] mb-6 max-w-3xl">
            Keep exploring.
          </h2>
          <p className="font-sans text-black/50 uppercase tracking-widest text-sm mb-12 max-w-xl">
            Create a free account to start saving your favorite tracks, or explore our entire catalog right now.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={() => setLoginModalOpen(true)}
              className="px-10 py-5 bg-black text-white font-bold uppercase text-xs tracking-widest hover:bg-black/80 transition-colors rounded-full shadow-lg"
            >
              Create Free Account
            </button>
            <button 
              onClick={() => navigate('/browse')}
              className="px-10 py-5 bg-white text-black font-bold uppercase text-xs tracking-widest hover:bg-black/5 border border-black/10 transition-colors rounded-full"
            >
              Browse Catalog
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
