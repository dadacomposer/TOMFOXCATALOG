import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchPlaylists, fetchTrendingTracks, fetchPlaylistTracks, fetchSuggestedPlaylists, fetchRecentlyPlayedTracks } from '../lib/supabase';
import { Play, Pause, TrendingUp, Loader2, Star } from 'lucide-react';
import PlaylistIsland from '../components/PlaylistIsland';
import TrackArtwork from '../components/TrackArtwork';
import PlaylistArtwork from '../components/PlaylistArtwork';
import Footer from '../components/Footer';
import { getComposers } from '../utils/trackUtils';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useLicense } from '../context/LicenseContext';
import { useSettings } from '../context/SettingsContext';
import { FeaturedSun } from '../components/TopPicksEffects';

const cardStyles = [
  { baseColor: 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#38BDF8]/40 bg-[length:300%_300%] bg-left-top group-hover:bg-right-bottom', bgIdle: 'bg-[#38BDF8]/20', bgHover: 'bg-[#38BDF8]/40' },
  { baseColor: 'bg-gradient-to-br from-[#18181B] via-[#3F3F46] to-[#A78BFA]/40 bg-[length:300%_300%] bg-left-top group-hover:bg-right-bottom', bgIdle: 'bg-[#A78BFA]/20', bgHover: 'bg-[#A78BFA]/40' },
  { baseColor: 'bg-gradient-to-br from-[#09090B] via-[#1E1B4B] to-[#F472B6]/40 bg-[length:300%_300%] bg-left-top group-hover:bg-right-bottom', bgIdle: 'bg-[#F472B6]/20', bgHover: 'bg-[#F472B6]/40' },
  { baseColor: 'bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#34D399]/40 bg-[length:300%_300%] bg-left-top group-hover:bg-right-bottom', bgIdle: 'bg-[#34D399]/20', bgHover: 'bg-[#34D399]/40' },
  { baseColor: 'bg-gradient-to-br from-[#1C0901] via-[#451A03] to-[#FBBF24]/40 bg-[length:300%_300%] bg-left-top group-hover:bg-right-bottom', bgIdle: 'bg-[#FBBF24]/20', bgHover: 'bg-[#FBBF24]/40' },
  { baseColor: 'bg-gradient-to-br from-[#022C22] via-[#064E3B] to-[#6EE7B7]/40 bg-[length:300%_300%] bg-left-top group-hover:bg-right-bottom', bgIdle: 'bg-[#6EE7B7]/20', bgHover: 'bg-[#6EE7B7]/40' },
  { baseColor: 'bg-gradient-to-br from-[#2E1065] via-[#4C1D95] to-[#C084FC]/40 bg-[length:300%_300%] bg-left-top group-hover:bg-right-bottom', bgIdle: 'bg-[#C084FC]/20', bgHover: 'bg-[#C084FC]/40' },
  { baseColor: 'bg-gradient-to-br from-[#4A044E] via-[#701A75] to-[#E879F9]/40 bg-[length:300%_300%] bg-left-top group-hover:bg-right-bottom', bgIdle: 'bg-[#E879F9]/20', bgHover: 'bg-[#E879F9]/40' },
  { baseColor: 'bg-gradient-to-br from-[#172554] via-[#1E3A8A] to-[#60A5FA]/40 bg-[length:300%_300%] bg-left-top group-hover:bg-right-bottom', bgIdle: 'bg-[#60A5FA]/20', bgHover: 'bg-[#60A5FA]/40' },
  { baseColor: 'bg-gradient-to-br from-[#450A0A] via-[#7F1D1D] to-[#F87171]/40 bg-[length:300%_300%] bg-left-top group-hover:bg-right-bottom', bgIdle: 'bg-[#F87171]/20', bgHover: 'bg-[#F87171]/40' }
];

const cleanTitle = (filename: string) => {
  let base = filename.replace(/\.(mp3|wav|aif|aiff)$/i, '');
  base = base.replace(/^\d+[\s_-]*/, '');
  base = base.replace(/^[A-Z0-9]+_/, '');
  base = base.replace(/_(bpm|key|v\d).*$/i, '');
  base = base.replace(/_/g, ' ');
  return base;
};

const ScrollArrows = ({ scrollRef, isDark, offsetY = 0 }: { scrollRef: React.RefObject<HTMLDivElement | null>, isDark?: boolean, offsetY?: number }) => {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
      }
    };

    checkScroll();
    
    // Slight delay to ensure content is fully rendered
    setTimeout(checkScroll, 100);

    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      const observer = new ResizeObserver(checkScroll);
      observer.observe(el);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        observer.disconnect();
      };
    }
  }, [scrollRef]);

  const btnClass = isDark 
    ? "bg-black/50 backdrop-blur border border-white/20 text-white/50 hover:text-white hover:bg-white/10"
    : "bg-white border border-black/10 text-black/50 hover:text-black hover:bg-white";

  return (
    <>
      <button 
        className={`absolute left-12 top-1/2 w-10 h-10 no-radius rounded-full shadow-lg flex items-center justify-center z-30 transition-all ${canScrollLeft ? 'opacity-0 group-hover/section:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${btnClass}`}
        style={{ borderRadius: '50%', transform: `translateY(calc(-50% - ${offsetY}px))` }}
        onClick={(e) => {
          e.stopPropagation();
          scrollRef.current?.scrollBy({ left: -600, behavior: 'smooth' });
        }}
      >
        <svg className="w-5 h-5 -ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button 
        className={`absolute right-12 top-1/2 w-10 h-10 no-radius rounded-full shadow-lg flex items-center justify-center z-30 transition-all ${canScrollRight ? 'opacity-0 group-hover/section:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${btnClass}`}
        style={{ borderRadius: '50%', transform: `translateY(calc(-50% - ${offsetY}px))` }}
        onClick={(e) => {
          e.stopPropagation();
          scrollRef.current?.scrollBy({ left: 600, behavior: 'smooth' });
        }}
      >
        <svg className="w-5 h-5 -mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </>
  );
};

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const playlistUrlId = searchParams.get('playlist');
  
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<any[]>([]);
  const [suggestedPlaylists, setSuggestedPlaylists] = useState<any[]>([]);
  const [recentlyPlayedTracks, setRecentlyPlayedTracks] = useState<any[]>([]);
  
  const [isFeaturedHovered, setIsFeaturedHovered] = useState(false);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());

  const topPicksRef = useRef<HTMLDivElement>(null);
  const trendingRef = useRef<HTMLDivElement>(null);
  const suggestedRef = useRef<HTMLDivElement>(null);
  const recentlyPlayedRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { openLicenseModal } = useLicense();
  const { settings } = useSettings();
  const { 
    playTrack, playPlaylist, currentTrack, isPlaying, togglePlay, 
    progress, setPendingSeek, setCurrentSource, setSelectedTrackForDetails
  } = usePlayer();

  useEffect(() => {
    async function loadData() {
      const [pData, tData] = await Promise.all([
        fetchPlaylists(),
        fetchTrendingTracks()
      ]);
      setPlaylists(pData);
      setTrendingTracks(tData);
      setLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadSuggested() {
      if (user?.id) {
        const [results, recentResults] = await Promise.all([
          fetchSuggestedPlaylists(user.id),
          fetchRecentlyPlayedTracks(user.id)
        ]);
        setSuggestedPlaylists(results as any[]);
        setRecentlyPlayedTracks(recentResults as any[]);
      } else {
        setSuggestedPlaylists([]);
        setRecentlyPlayedTracks([]);
      }
    }
    loadSuggested();
  }, [user?.id]);

  useEffect(() => {
    if (currentTrack && user?.id) {
      setRecentlyPlayedTracks(prev => {
        const filtered = prev.filter(t => t.id !== currentTrack.id);
        return [currentTrack, ...filtered].slice(0, 16);
      });
    }
  }, [currentTrack, user?.id]);

  const trendingTrackIds = new Set(trendingTracks.map(t => t.id));

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPendingSeek(parseFloat(e.target.value));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTrackClick = (e: React.MouseEvent, track: any, source: "playlist" | "top" | "browse" | "suggested") => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      const next = new Set(selectedTrackIds);
      if (next.has(track.id)) next.delete(track.id);
      else next.add(track.id);
      setSelectedTrackIds(next);
      return;
    }
    
    if (currentTrack?.file_name === track.file_name) {
      togglePlay();
    } else {
      const list = source === 'top' ? trendingTracks : []; // Suggested is now playlists
      playTrack(track, list, source);
    }
  };

  const handleTrackDragStart = (e: React.DragEvent, trackId: string) => {
    let idsToDrag = selectedTrackIds.has(trackId) ? Array.from(selectedTrackIds) : [trackId];
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'tracks', ids: idsToDrag }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className={`flex flex-col w-full min-h-screen pt-[88px] ${!user ? 'pb-[69px] bg-black text-white' : 'pb-[120px] bg-[#fafafa] text-black'} relative no-radius !rounded-none`}>
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
          trendingTrackIds={trendingTrackIds}
        />
      )}
      
      {/* Dark Section Wrapper (Welcome + Top Picks) */}
      <div 
        id={!user ? 'home-dark-section' : undefined}
        className={`w-full flex flex-col transition-colors duration-700 -mt-[88px] pt-[88px] no-radius !rounded-none ${!user ? 'bg-black text-white pb-12 relative overflow-hidden' : 'bg-[#fafafa] text-black pb-12'}`}
      >
        {/* Full-section Sun Animation (Only when Dark Mode / Unauthenticated) */}
        {!user && settings?.top_picks_animation_enabled !== false && (
          <div
            className="absolute inset-0 pointer-events-none z-30"
            style={{ mixBlendMode: 'screen', transform: 'translateZ(0)' }}
          >
            <FeaturedSun isHovered={isFeaturedHovered} />
          </div>
        )}

        {/* Welcome Section (Only for Unauthenticated Users) */}
        {!user && (
          <div className="w-full pt-4 md:pt-8 pb-4 md:pb-8 flex flex-col md:flex-row items-center md:items-center justify-between px-8 md:px-16 relative z-40 pointer-events-none">
            <h1 className="text-xl md:text-3xl lg:text-[40px] font-black uppercase tracking-tight text-center md:text-left max-w-4xl z-20 leading-[1.1] text-white">
              A curated collection of original music.<br/><span className="text-white/60">Press play and explore the sound.</span>
            </h1>
          </div>
        )}

        {/* Top Picks For You */}
        <div className={`w-full pb-8 relative group/section no-radius !rounded-none ${!user ? 'pt-6' : 'pt-12 overflow-hidden'}`}>
          {/* Constrained Sun Animation (Only when Light Mode / Authenticated) */}
          {user && settings?.top_picks_animation_enabled !== false && (
            <div
              className="absolute inset-0 pointer-events-none z-30"
              style={{ mixBlendMode: 'screen', transform: 'translateZ(0)' }}
            >
              <FeaturedSun isHovered={isFeaturedHovered} />
            </div>
          )}
          <div className={`w-full relative ${!user ? 'z-40' : 'z-10'} px-8`}>
            <ScrollArrows scrollRef={topPicksRef} isDark={!user} offsetY={8} />
          <div ref={topPicksRef} className="flex gap-6 w-full overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-4">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className={`flex flex-col p-4 rounded-[32px] shrink-0 snap-start ${!user ? 'w-[280px]' : 'w-[340px]'}`}>
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
              ))
            ) : (
              playlists
                .filter(pl => pl.top_pick_position !== null && pl.top_pick_position !== undefined)
                .sort((a, b) => (a.top_pick_position || 99) - (b.top_pick_position || 99))
                .slice(0, 10)
                .map((pl, idx) => {
                  const style = cardStyles[idx % cardStyles.length];
                  
                  // Check if this playlist is currently playing
                  const isThisPlaylistPlaying = isPlaying && playingPlaylistId === pl.id;

                  const handlePlayTopPick = async (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (isThisPlaylistPlaying) {
                      togglePlay();
                      return;
                    }
                    if (playingPlaylistId === pl.id && !isPlaying) {
                      togglePlay();
                      return;
                    }
                    setLoadingPlaylistId(pl.id);
                    const tracks = await fetchPlaylistTracks(pl.id);
                    if (tracks && tracks.length > 0) {
                      playPlaylist(tracks);
                      setCurrentSource('playlist');
                      setPlayingPlaylistId(pl.id);
                    }
                    setLoadingPlaylistId(null);
                  };

                  return (
                    <div 
                      key={pl.id} 
                      className={`relative shrink-0 snap-start aspect-[3/4] rounded-[32px] overflow-hidden cursor-pointer group shadow-sm hover:shadow-xl transition-all duration-500 border border-transparent hover:border-white/10 ${style.baseColor} ${!user ? 'w-[280px]' : 'w-[340px]'}`}
                      onClick={() => setSearchParams({ playlist: pl.id })}
                      onMouseEnter={() => setIsFeaturedHovered(true)}
                      onMouseLeave={() => setIsFeaturedHovered(false)}
                    >
                      {/* Dark overlay specifically for Welcome section context */}
                      {!user && <div className="absolute inset-0 bg-black/40 z-[15] pointer-events-none group-hover:bg-black/20 transition-colors duration-500" />}

                      {/* Animated Mesh Background (Idle State) */}
                      <div className="absolute inset-[-100%] animate-[spin_16s_linear_infinite] origin-[45%_55%] pointer-events-none">
                        <div className={`absolute inset-0 ${style.bgIdle} blur-[100px] scale-150`} />
                      </div>
                      
                      {/* Animated Mesh Background (Active State) */}
                      <div className="absolute inset-[-100%] animate-[spin_8s_linear_infinite] origin-[45%_55%] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                        <div className={`absolute inset-0 ${style.bgHover} blur-[100px] scale-150`} />
                      </div>
                      
                      
                      {/* Logo */}
                      <img 
                        src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" 
                        alt="Tom Fox" 
                        className="absolute top-6 right-6 h-[18px] object-contain invert opacity-90 mix-blend-plus-lighter z-20"
                      />

                      {/* Bottom Content */}
                      <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col justify-end h-[60%] bg-gradient-to-t from-black/80 via-black/30 to-transparent z-20">
                        <div className="flex items-end justify-between w-full mt-auto">
                          <span className={`text-white font-medium tracking-tight ${!user ? 'text-sm' : 'text-lg'} drop-shadow-md leading-[1.1] max-w-[80%]`}>
                            {pl.title}
                          </span>
                          
                          {/* Play Button */}
                          <button 
                            className="w-10 h-10 shrink-0 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-xl hover:bg-white/30"
                            onClick={handlePlayTopPick}
                          >
                            {loadingPlaylistId === pl.id ? (
                               <Loader2 className="w-4 h-4 text-white animate-spin" />
                            ) : isThisPlaylistPlaying ? (
                               <Pause className="w-4 h-4 text-white fill-white" />
                            ) : (
                               <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Trending Tracks */}
      <div className={`w-full px-8 pt-12 pb-12 flex flex-col relative group/section no-radius !rounded-none ${!user ? 'bg-[#111] text-white' : 'bg-transparent text-black'}`}>
        <h2 className={`text-[22px] font-medium uppercase tracking-tighter mb-6 ${!user ? 'text-white' : 'text-black'}`}>Trending tracks</h2>
        
        {loading ? (
          <div className="w-full overflow-x-auto overscroll-x-none pb-4 hide-scrollbar -mx-4 px-4">
            <div className="grid grid-rows-2 grid-flow-col auto-cols-[300px] gap-x-6 gap-y-4 content-start min-w-min">
              {[...Array(16)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-2 rounded select-none">
                  <div className={`w-12 h-12 rounded relative overflow-hidden shrink-0 animate-pulse ${!user ? 'bg-white/10' : 'bg-[#e5e5e5]'}`} />
                  <div className="flex flex-col gap-2 w-full max-w-[160px]">
                    <div className={`h-3.5 rounded w-3/4 animate-pulse ${!user ? 'bg-white/10' : 'bg-[#e5e5e5]'}`} />
                    <div className={`h-2.5 rounded w-1/2 animate-pulse ${!user ? 'bg-white/10' : 'bg-[#e5e5e5]'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : trendingTracks.length === 0 ? (
          <div className={`font-sans text-[11px] uppercase tracking-widest ${!user ? 'text-white/30' : 'text-black/30'}`}>Nessuna traccia trovata.</div>
        ) : (
          <div className="w-full relative">
            <ScrollArrows scrollRef={trendingRef} isDark={!user} offsetY={8} />
            <div ref={trendingRef} className="w-full overflow-x-auto overscroll-x-none pb-4 hide-scrollbar -mx-4 px-4">
              <div className="grid grid-rows-2 grid-flow-col auto-cols-[300px] gap-x-6 gap-y-2 content-start min-w-min">
            {trendingTracks.slice(0, 16).map((track, i) => {
              const isThisPlaying = currentTrack?.file_name === track.file_name && isPlaying;
              return (
                <div 
                  key={i} 
                  className={`flex items-center gap-3 group cursor-pointer p-2 rounded transition-colors select-none border ${selectedTrackIds.has(track.id) ? (!user ? 'bg-white/10 border-white/20' : 'bg-black/5 border-black/10') : (!user ? 'border-transparent hover:bg-white/5 hover:border-white/10' : 'border-transparent hover:bg-black/5 hover:border-black/5')}`}
                  onClick={(e) => handleTrackClick(e, track, 'top')}
                  draggable
                  onDragStart={(e) => handleTrackDragStart(e, track.id)}
                >
                  <div className={`w-12 h-12 rounded relative overflow-hidden flex items-center justify-center shrink-0 ${!user ? 'bg-white/5' : 'bg-black/5'}`}>
                    <TrackArtwork track={track} className="absolute inset-0 w-full h-full" />
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {isThisPlaying ? <Pause className="w-5 h-5 fill-white text-white" /> : <Play className="w-5 h-5 fill-white text-white" style={{ transform: 'translateX(4.166%)' }} />}
                    </div>
                    {trendingTrackIds.has(track.id) && (
                      <div className="absolute bottom-0 right-0 bg-[#facc15] text-black w-3 h-3 rounded-tl flex items-center justify-center z-10 pointer-events-none">
                        <TrendingUp className="w-2 h-2" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden w-full">
                    <div 
                      className={`font-medium text-[14px] truncate hover:underline underline-offset-2 cursor-pointer ${!user ? 'text-white/90' : 'text-black/90'}`}
                      onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); setSelectedTrackForDetails(track); }}
                    >
                      {cleanTitle(track.file_name)}
                    </div>
                    <div className={`font-sans text-[12px] flex items-center gap-1 mt-0.5 truncate ${!user ? 'text-white/50' : 'text-black/50'}`}>
                       {getComposers(track.composers)}
                    </div>
                  </div>
                </div>
              );
            })}
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Suggested For You */}
      {suggestedPlaylists.length > 0 && (
        <div className="w-full px-8 pt-4 pb-12 flex flex-col relative group/section no-radius !rounded-none">
          <h2 className="text-[22px] font-medium uppercase tracking-tighter mb-6 text-black">Suggested for you</h2>
          
          <div className="w-full relative">
            <ScrollArrows scrollRef={suggestedRef} offsetY={8} />
            <div ref={suggestedRef} className="flex gap-6 md:gap-8 w-full overflow-x-auto overscroll-x-none pb-4 hide-scrollbar">
              {suggestedPlaylists.map((pl) => (
                <div 
                  key={pl.id} 
                  className="flex flex-col bg-transparent hover:bg-[#f6f6f6] p-4 rounded-[32px] group cursor-pointer transition-all duration-300 border border-transparent hover:border-black/5 relative shrink-0 w-[240px] sm:w-[260px] md:w-[280px]"
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
          </div>
        </div>
      )}

      {/* Recently Played */}
      {recentlyPlayedTracks.length > 0 && (
        <div className="w-full px-8 pt-4 pb-12 flex flex-col relative group/section no-radius !rounded-none">
          <h2 className="text-[22px] font-medium uppercase tracking-tighter mb-6 text-black">Recently Played</h2>
          
          <div className="w-full relative">
            <ScrollArrows scrollRef={recentlyPlayedRef} offsetY={16} />
            <div ref={recentlyPlayedRef} className="w-full overflow-x-auto overscroll-x-none pb-8 hide-scrollbar -mx-4 px-4">
              <div className="grid grid-rows-2 grid-flow-col auto-cols-[300px] gap-x-6 gap-y-2 content-start min-w-min">
                {recentlyPlayedTracks.map((track, i) => {
                  const isThisPlaying = currentTrack?.file_name === track.file_name && isPlaying;
                  return (
                    <div 
                      key={`${track.id}-${i}`} 
                      className={`flex items-center gap-3 group cursor-pointer p-2 rounded transition-colors select-none border border-transparent ${selectedTrackIds.has(track.id) ? 'bg-black/5 border-black/10' : 'hover:bg-black/5 hover:border-black/5'}`}
                      onClick={(e) => handleTrackClick(e, track, 'top')}
                      draggable
                      onDragStart={(e) => handleTrackDragStart(e, track.id)}
                    >
                      <div className="w-12 h-12 rounded relative overflow-hidden flex items-center justify-center shrink-0 bg-black/5">
                        <TrackArtwork track={track} className="absolute inset-0 w-full h-full" />
                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          {isThisPlaying ? <Pause className="w-5 h-5 fill-white text-white" /> : <Play className="w-5 h-5 fill-white text-white" style={{ transform: 'translateX(4.166%)' }} />}
                        </div>
                      </div>
                      <div className="flex flex-col overflow-hidden w-full">
                        <div 
                          className="font-medium text-[14px] truncate text-black/90 hover:underline underline-offset-2 cursor-pointer"
                          onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) return; e.stopPropagation(); setSelectedTrackForDetails(track); }}
                        >
                          {cleanTitle(track.file_name)}
                        </div>
                        <div className="text-[11px] text-black/50 truncate">
                          {getComposers(track)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* About Section (Unauthenticated Only) */}
      {!user && (
        <div className="w-full bg-[#111] text-white pt-32 pb-32 px-8 flex flex-col items-center justify-center group/section no-radius !rounded-none">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] mb-16 text-center text-white/50">About</h2>
          
          <div className="w-full max-w-[1400px] flex flex-col md:flex-row items-center justify-between gap-12 md:gap-24 mb-16 px-4 md:px-12">
            <div className="w-full md:w-[45%] flex justify-start">
              <img 
                src="/assets/tom-fox-about.jpg" 
                alt="Tom Fox" 
                className="w-full aspect-[4/3] object-cover rounded-[32px] shadow-2xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-700" 
              />
            </div>
            
            <div className="w-full md:w-[55%] flex flex-col justify-center gap-8 text-left py-4">
              <p className="font-sans text-base md:text-[17px] leading-[2.2] text-white/80 font-light tracking-wide">
                Tom Fox is a US based composer and sound designer who has worked with brands like Adidas and Anthropic.
              </p>
              <p className="font-sans text-base md:text-[17px] leading-[2.2] text-white/80 font-light tracking-wide">
                His most important work, however, is giving YouTubers and creators music designed to move, push, thrill, and provide propulsion.
              </p>
              <p className="font-sans text-base md:text-[17px] leading-[2.2] text-white/80 font-light tracking-wide">
                His musical research is hybrid—blending traditional instruments with electronic elements, minimalism, and distortion.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center mt-8">
            <span className="font-sans text-sm uppercase tracking-widest text-white/50">
              If you need to get in touch for licensing or just to learn more,
            </span>
            <button 
              onClick={() => openLicenseModal()}
              className="font-sans text-sm uppercase tracking-widest font-bold border-b border-white hover:text-white/60 hover:border-white/60 transition-colors"
            >
              click here
            </button>
          </div>
        </div>
      )}

      <Footer isMinimized={!!user} isDark={!user} />
    </div>
  );
}
