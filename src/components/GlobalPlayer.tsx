import React from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Minimize2, Download, ShoppingBag, TrendingUp, Shuffle, Repeat, Zap, MoreHorizontal, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import WaveformView from './WaveformView';
import { usePlayer } from '../context/PlayerContext';
import { getComposers } from '../utils/trackUtils';
import { getPreviewTimings, parseWaveform } from '../lib/audioUtils';
import { useUserPlaylists } from '../context/UserPlaylistsContext';
import { useAuth } from '../context/AuthContext';
import { useDownload } from '../context/DownloadContext';
import { useLicense } from '../context/LicenseContext';
import TrackActionButtons from './TrackActionButtons';
import { fetchSimilarTracks } from '../lib/supabase';
import TrackArtwork from './TrackArtwork';
import { Track } from '../context/PlayerContext';
import { DEFAULT_ARTWORK, DEFAULT_ARTIST } from '../config';
import { useSettings } from '../context/SettingsContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const cleanTitle = (filename: string) => {
  if (!filename) return 'Unknown Track';
  const noExt = filename.replace(/\.(mp3|wav|aif|aiff|m4a|ogg|flac)\s*$/i, '').trim();
  const cleaned = noExt.replace(/^\d+\s*-?\s*/, '').trim();
  return cleaned.length > 0 ? cleaned : noExt;
};

const parseTags = (t: string[] | string | undefined): string[] => {
  if (!t) return [];
  let arr: any[] = [];
  if (Array.isArray(t)) {
    arr = t;
  } else {
    try { 
      arr = JSON.parse(t); 
      if (!Array.isArray(arr)) arr = [arr];
    } catch(e) { 
      arr = typeof t === 'string' ? t.split(',') : []; 
    }
  }
  return arr.filter(s => typeof s === 'string' && s.trim().length > 0).map(s => s.trim());
};

type ExpandedTags = {
  trackId: string;
  tags: string[];
  anchor: { top: number; right: number };
};

export default function GlobalPlayer() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSharedPage = location.pathname.startsWith('/share');
  
  const { currentTrack, currentPlaylist, isPlaying, setIsPlaying, progress, pendingSeek, setPendingSeek, setProgress, togglePlay, playNextTrack, playPrevTrack, audioRef, isPreviewMode, setIsPreviewMode, isCurrentPreviewDormant, setIsCurrentPreviewDormant, playTrack, setCurrentPlaylist, returnTrackId, setReturnTrackId, setSelectedTrackForDetails, volume, setVolume, toggleMute, isShuffleEnabled, setIsShuffleEnabled, isRepeatEnabled, setIsRepeatEnabled, isSimilarPanelExpanded: isSimilarExpanded, setIsSimilarPanelExpanded: setIsSimilarExpanded } = usePlayer();
  const { openDownloadModal } = useDownload();
  const { openLicenseModal } = useLicense();
  const { settings } = useSettings();
  const { profile, isLoginModalOpen } = useAuth();
  const [isMobileControlsOpen, setIsMobileControlsOpen] = React.useState(false);
  const [referenceTrack, setReferenceTrack] = React.useState<Track | null>(null);
  const [similarTracks, setSimilarTracks] = React.useState<Track[]>([]);
  const [isSimilarLoading, setIsSimilarLoading] = React.useState(false);
  const [similarOffset, setSimilarOffset] = React.useState(0);
  const [hasMoreSimilar, setHasMoreSimilar] = React.useState(true);
  const [isBuffering, setIsBuffering] = React.useState(false);
  const [expandedTags, setExpandedTags] = React.useState<ExpandedTags | null>(null);
  const expandedTagsRef = React.useRef<HTMLDivElement>(null);
  const originalPlaylistRef = React.useRef<Track[]>([]);
  const similarRequestRef = React.useRef(0);
  const similarLoadMoreRef = React.useRef(false);
  const mobileControlsCloseRef = React.useRef<HTMLButtonElement>(null);

  useLockBodyScroll(isMobileControlsOpen);

  const expandSimilar = () => {
    if (!isSimilarExpanded) {
      originalPlaylistRef.current = currentPlaylist;
      setReturnTrackId(currentTrack?.id || null);
      setReferenceTrack(currentTrack);
      setIsSimilarExpanded(true);
    } else if (currentTrack?.id !== referenceTrack?.id) {
      setReferenceTrack(currentTrack);
    }
  };

  const closeSimilar = () => {
    setIsSimilarExpanded(false);
    setExpandedTags(null);
    if (originalPlaylistRef.current.length > 0) {
      setCurrentPlaylist(originalPlaylistRef.current);
    }
  };

  React.useEffect(() => {
    if (currentTrack) return;

    // A stopped player must not leave a hidden Similar panel or phone controls
    // reserving space on a subsequent route.
    setIsSimilarExpanded(false);
    setIsMobileControlsOpen(false);
  }, [currentTrack, setIsSimilarExpanded]);

  // Similar-panel visibility is shared with Discover so its search bar can
  // reserve the right amount of space. Clear that shared UI state when this
  // player is absent on a route (for example Studio) so it cannot reappear as
  // an empty expanded panel after returning to the catalog.
  React.useEffect(() => () => {
    setIsSimilarExpanded(false);
  }, [setIsSimilarExpanded]);

  // TrackActionButtons can open the global login dialog for signed-out users.
  // Its overlay deliberately sits below the player sheet, so relinquish this
  // layer first rather than leaving the login form visually unreachable.
  React.useEffect(() => {
    if (isLoginModalOpen) setIsMobileControlsOpen(false);
  }, [isLoginModalOpen]);

  React.useEffect(() => {
    if (!isMobileControlsOpen) return;

    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => {
      if (mediaQuery.matches) setIsMobileControlsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileControlsOpen(false);
    };
    const focusFrame = requestAnimationFrame(() => mobileControlsCloseRef.current?.focus());

    closeOnDesktop();
    mediaQuery.addEventListener('change', closeOnDesktop);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      mediaQuery.removeEventListener('change', closeOnDesktop);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileControlsOpen]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expandedTagsRef.current && !expandedTagsRef.current.contains(event.target as Node)) {
        setExpandedTags(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (!expandedTags) return;

    // Keep the tag menu anchored to its row instead of letting it float over
    // a different row while the Similar Tracks panel scrolls.
    const closeOnScroll = () => setExpandedTags(null);
    document.addEventListener('scroll', closeOnScroll, true);
    return () => document.removeEventListener('scroll', closeOnScroll, true);
  }, [expandedTags]);

  const handleSimilarTagClick = (tag: string, event: React.MouseEvent) => {
    event.stopPropagation();
    closeSimilar();
    navigate(`/browse?tag=${encodeURIComponent(tag)}`);
  };

  const handleNextTrack = () => {
    if (isRepeatEnabled) {
      playNextTrack();
      return;
    }
    
    if (isSimilarExpanded && currentPlaylist === similarTracks) {
      const idx = similarTracks.findIndex(t => t.id === currentTrack?.id);
      if (idx === similarTracks.length - 1) {
        // Reached the end of similar tracks
        closeSimilar();
        const returnIdx = originalPlaylistRef.current.findIndex(t => t.id === returnTrackId);
        if (returnIdx >= 0 && returnIdx < originalPlaylistRef.current.length - 1) {
           playTrack(originalPlaylistRef.current[returnIdx + 1], originalPlaylistRef.current, 'browse');
           setReturnTrackId(null);
        }
        return;
      }
    }
    playNextTrack();
  };

  React.useEffect(() => {
    const requestId = ++similarRequestRef.current;
    let cancelled = false;
    similarLoadMoreRef.current = false;

    if (isSimilarExpanded && referenceTrack) {
      setIsSimilarLoading(true);
      setSimilarOffset(0);
      void fetchSimilarTracks(referenceTrack.id, 10, 0).then(tracks => {
        if (cancelled || similarRequestRef.current !== requestId) return;
        setSimilarTracks(tracks);
        setHasMoreSimilar(tracks.length === 10);
      }).catch(error => {
        if (!cancelled && similarRequestRef.current === requestId) {
          console.error('Error loading similar tracks:', error);
          setSimilarTracks([]);
          setHasMoreSimilar(false);
        }
      }).finally(() => {
        if (!cancelled && similarRequestRef.current === requestId) setIsSimilarLoading(false);
      });
    } else if (!isSimilarExpanded) {
      setSimilarTracks([]);
      setSimilarOffset(0);
      setHasMoreSimilar(true);
    }

    return () => { cancelled = true; };
  }, [isSimilarExpanded, referenceTrack]);

  const handleLoadMoreSimilar = async () => {
    if (!referenceTrack || isSimilarLoading || similarLoadMoreRef.current || !hasMoreSimilar) return;

    const requestId = similarRequestRef.current;
    similarLoadMoreRef.current = true;
    setIsSimilarLoading(true);
    const nextOffset = similarOffset === 0 ? 10 : similarOffset + 5;
    try {
      const tracks = await fetchSimilarTracks(referenceTrack.id, 5, nextOffset);
      if (similarRequestRef.current !== requestId) return;
      setSimilarTracks(prev => {
        // filter out potential duplicates to be safe
        const newTracks = tracks.filter(t => !prev.find(p => p.id === t.id));
        return [...prev, ...newTracks];
      });
      setSimilarOffset(nextOffset);
      setHasMoreSimilar(tracks.length === 5);
    } catch (error) {
      if (similarRequestRef.current === requestId) {
        console.error('Error loading more similar tracks:', error);
        setHasMoreSimilar(false);
      }
    } finally {
      if (similarRequestRef.current === requestId) {
        similarLoadMoreRef.current = false;
        setIsSimilarLoading(false);
      }
    }
  };

  const handlePlaySimilar = (track: Track) => {
    // When playing a similar track, we pass the current similarTracks as the playlist context.
    playTrack(track, similarTracks, 'browse');
  };
  const handleTimeUpdate = () => {
    if (audioRef.current && currentTrack) {
      const pct = (audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100;
      setProgress(pct);
      
      if (isPreviewMode && !isCurrentPreviewDormant) {
        const timings = getPreviewTimings(currentTrack);
        if (timings && pct >= timings.endPct) {
          playNextTrack();
        }
      }
    }
  };

  const handleSeek = (percentage: number) => {
    setIsCurrentPreviewDormant(true);
    setIsBuffering(true); // Assuming seeking will cause buffering
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (percentage / 100) * audioRef.current.duration;
      setProgress(percentage);
    } else {
      setPendingSeek(percentage);
      setProgress(percentage);
    }
  };

  React.useEffect(() => {
    if (pendingSeek !== null && audioRef.current && audioRef.current.readyState >= 1) {
      if (audioRef.current.duration) {
        audioRef.current.currentTime = (pendingSeek / 100) * audioRef.current.duration;
        setPendingSeek(null);
      }
    }
  }, [pendingSeek, setPendingSeek, audioRef]);

  const getNextTrack = () => {
    if (!currentPlaylist.length || !currentTrack) return null;
    const idx = currentPlaylist.findIndex(t => t.id === currentTrack.id);
    if (idx >= 0 && idx < currentPlaylist.length - 1) return currentPlaylist[idx + 1];
    return null;
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  React.useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack ? cleanTitle(currentTrack.file_name) : 'Unknown Track',
        artist: DEFAULT_ARTIST,
        artwork: [
          { src: currentTrack?.artwork_url || DEFAULT_ARTWORK, sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (!isPlaying) togglePlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (isPlaying) togglePlay();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrevTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNextTrack();
      });
    }
    
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, [currentTrack, isPlaying, togglePlay, playNextTrack, playPrevTrack]);

  // On phones an opaque surface is both clearer over content and much cheaper
  // to composite while the waveform is updating. md+ preserves the glass UI.
  const baseBg = isSharedPage ? 'bg-[#111111]' : 'bg-[#fafafa] md:bg-[#fafafa]/85 md:backdrop-blur-xl';
  const baseText = isSharedPage ? 'text-white' : 'text-black';
  const baseBorder = isSharedPage ? 'border-white/10' : 'border-black/10';
  const secondaryText = isSharedPage ? 'text-white/60' : 'text-black/60';

  return (
    <div className={`global-player fixed bottom-0 left-0 w-full flex flex-col ${baseBg} ${baseText} border-t ${baseBorder} z-[90] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] motion-drawer no-radius !rounded-none ${currentTrack ? 'translate-y-0' : 'translate-y-[100%]'} ${isSimilarExpanded ? 'h-[75vh] max-md:h-[76dvh]' : 'h-[90px] max-md:h-[76px]'}`}>

      {/* Main Player Bar FIRST so it's at the top of the expanded panel */}
      <div className={`w-full h-[90px] max-md:h-[76px] shrink-0 flex items-center px-4 max-md:px-3 md:px-6 gap-4 max-md:gap-2 md:gap-8 transition-colors relative z-10 ${isSimilarExpanded ? `border-b ${baseBorder} ${isSharedPage ? 'bg-[#1a1a1a]' : 'bg-white/50'}` : ''}`}>
      {getNextTrack() && (
        <audio preload="auto" src={getNextTrack()?.r2_url} className="hidden" muted />
      )}
      {currentTrack && (
        <audio 
          ref={audioRef} 
          src={currentTrack.r2_url} 
          onLoadedMetadata={() => {
            if (pendingSeek !== null && audioRef.current && audioRef.current.duration) {
              audioRef.current.currentTime = (pendingSeek / 100) * audioRef.current.duration;
              setPendingSeek(null);
            }
          }}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleNextTrack}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onLoadStart={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}
      <div className="flex items-center gap-4 max-md:gap-2 w-auto max-md:flex-1 max-md:min-w-0 md:w-[280px] shrink-0">
        <div 
          className={`w-12 h-12 rounded overflow-hidden flex items-center justify-center relative hidden sm:flex border ${baseBorder} ${isSharedPage ? 'bg-white/5' : 'bg-black/5'} cursor-pointer group`}
          onClick={() => currentTrack && setSelectedTrackForDetails(currentTrack)}
        >
          {currentTrack && <TrackArtwork track={currentTrack} className="w-full h-full group-hover:scale-105 transition-transform" />}
        </div>
        <div className="flex flex-col overflow-hidden">
          <div 
            className="font-bold truncate text-[14px] max-md:text-[12px] cursor-pointer hover:underline underline-offset-2 pr-4 max-md:pr-0"
            onClick={() => currentTrack && setSelectedTrackForDetails(currentTrack)}
          >
            {currentTrack ? cleanTitle(currentTrack.file_name) : ''}
          </div>
          <div className={`font-sans text-[11px] max-md:hidden ${secondaryText} truncate`}>
            {getComposers(currentTrack?.composers)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 max-md:gap-1 shrink-0">
        <button 
          onClick={() => setIsShuffleEnabled(!isShuffleEnabled)} 
          className={`max-md:hidden transition-colors ${isShuffleEnabled ? (isSharedPage ? 'text-white' : 'text-black') : (isSharedPage ? 'text-white/30 hover:text-white/60' : 'text-black/30 hover:text-black/60')}`}
          title="Shuffle"
        >
          <Shuffle className="w-4 h-4" />
        </button>
        <button onClick={playPrevTrack} className={`${isSharedPage ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'} transition-colors`}><SkipBack className="w-5 h-5 max-md:w-4 max-md:h-4 fill-current" /></button>
        {isBuffering ? (
          <button disabled className={`w-10 h-10 max-md:w-9 max-md:h-9 flex items-center justify-center rounded-lg ${isSharedPage ? 'bg-white text-black' : 'bg-black text-white'} transition-colors`}>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </button>
        ) : (
          <button 
            className={`w-10 h-10 max-md:w-9 max-md:h-9 flex items-center justify-center rounded-lg ${isSharedPage ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'} transition-colors`}
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" style={{ transform: 'translateX(4.166%)' }} />}
          </button>
        )}
        <button onClick={handleNextTrack} className={`${isSharedPage ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'} transition-colors`}><SkipForward className="w-5 h-5 max-md:w-4 max-md:h-4 fill-current" /></button>
        <button 
          onClick={() => setIsRepeatEnabled(!isRepeatEnabled)} 
          className={`max-md:hidden transition-colors ${isRepeatEnabled ? (isSharedPage ? 'text-white' : 'text-black') : (isSharedPage ? 'text-white/30 hover:text-white/60' : 'text-black/30 hover:text-black/60')}`}
          title="Repeat"
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-grow max-md:flex-grow-0 flex items-center">
        {/* 2. Find Similar Tracks */}
        {!isSharedPage && currentTrack && (
          <button 
            onClick={() => {
              if (!isSimilarExpanded) {
                expandSimilar();
              } else {
                if (currentTrack?.id !== referenceTrack?.id) {
                  expandSimilar();
                } else {
                  closeSimilar();
                }
              }
            }} 
            className={`flex items-center justify-center p-1.5 rounded-full transition-colors mr-6 max-md:mr-0 ${isSimilarExpanded && currentTrack?.id === referenceTrack?.id ? 'text-black bg-black/10' : 'text-black/40 hover:text-black hover:bg-black/5'}`}
            title="Find Similar"
          >
            <Zap className="w-4 h-4" />
          </button>
        )}

              {/* 3. Toggle Preview */}
        <div className="hidden md:flex items-center gap-3 cursor-pointer group/preview" onClick={() => setIsPreviewMode(!isPreviewMode)}>
          <span className={`hidden md:block text-[10px] font-bold tracking-widest uppercase transition-colors ${isPreviewMode ? (isSharedPage ? 'text-white' : 'text-black group-hover/preview:text-black/70') : (isSharedPage ? 'text-white/50' : 'text-black/30 group-hover/preview:text-black/60')}`}>Preview</span>
          <div 
            className={`preview-toggle w-9 h-5 rounded-full p-[2px] transition-colors relative flex items-center shadow-inner ${isPreviewMode ? (isSharedPage ? 'bg-white/30 group-hover/preview:bg-white/40' : 'bg-[#111111] group-hover/preview:bg-[#333]') : (isSharedPage ? 'bg-white/10 group-hover/preview:bg-white/20' : 'bg-[#e0e0e0] group-hover/preview:bg-[#d0d0d0]')}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform absolute shadow-[0_1px_4px_rgba(0,0,0,0.2)] ${isPreviewMode ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>

              <div className="hidden md:flex flex-grow mx-8 h-8 items-center">
          {currentTrack && (
            <WaveformView 
              data={parseWaveform(currentTrack.waveform_data)} 
              isPlaying={isPlaying} 
              progress={progress} 
              onSeek={handleSeek}
              previewStartPct={isPreviewMode ? getPreviewTimings(currentTrack)?.startPct : undefined}
              previewEndPct={isPreviewMode ? getPreviewTimings(currentTrack)?.endPct : undefined}
              isDark={isSharedPage}
            />
          )}
        </div>
        {!isSharedPage && currentTrack && (
          <div className="hidden md:flex items-center mr-4 shrink-0">
            <TrackActionButtons trackId={currentTrack.id} />
          </div>
        )}
        {/* 1. Volume Controls */}
        <div className="relative group/volume hidden md:flex items-center shrink-0 mr-4">
          <button 
            onClick={toggleMute} 
            className={`p-1.5 rounded-full transition-colors flex items-center justify-center shrink-0 ${isSharedPage ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-black/40 hover:text-black hover:bg-black/5'}`}
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-3 opacity-0 invisible group-hover/volume:opacity-100 group-hover/volume:visible transition-all duration-200 ease-out z-50">
            <div className={`w-8 h-28 rounded-xl shadow-lg border flex items-center justify-center relative ${isSharedPage ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-black/10'}`}>
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={volume} 
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className={`w-20 h-1 rounded-lg appearance-none cursor-pointer transform -rotate-90 origin-center [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full ${isSharedPage ? 'accent-white bg-white/20 [&::-webkit-slider-thumb]:bg-white' : 'accent-black bg-black/10 [&::-webkit-slider-thumb]:bg-black'}`} 
              />
            </div>
          </div>
        </div>

        
        <div className={`hidden md:block font-sans text-[11px] ${secondaryText} uppercase tracking-widest w-20 text-right shrink-0`}>
          {audioRef.current ? formatTime(audioRef.current.currentTime) : '0:00'} / {audioRef.current?.duration ? formatTime(audioRef.current.duration) : (currentTrack?.duration ? formatTime(currentTrack.duration) : '0:00')}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-4 max-md:gap-0 max-md:ml-1 ml-4">
        
        {/* 4. Download and License */}
        {!isSharedPage && (
          <div className="flex gap-4 max-md:gap-0 ml-2 max-md:ml-0">
            {profile?.can_download !== false && (
              <button className="hidden md:flex p-1.5 hover:bg-black/5 rounded-full transition-colors items-center justify-center text-black/40 hover:text-black shrink-0" onClick={(e) => { if (currentTrack) openDownloadModal(currentTrack, e); }}>
                <Download className="w-4 h-4" />
              </button>
            )}
            {location.pathname !== '/admin' && (
              <button className="flex items-center gap-2 max-md:justify-center max-md:w-9 max-md:h-9 max-md:px-0 max-md:py-0 px-4 py-2 bg-black text-white rounded hover:bg-black/90 transition-colors font-sans text-[11px] uppercase tracking-widest" onClick={() => { if (currentTrack) openLicenseModal(currentTrack); }}>
                <ShoppingBag className="w-3.5 h-3.5" /> <span className="max-md:hidden">License</span>
              </button>
            )}
          </div>
        )}
      </div>
      {!isSharedPage && currentTrack && (
        <button
          type="button"
          onClick={() => setIsMobileControlsOpen(true)}
          aria-label="Open player controls"
          aria-expanded={isMobileControlsOpen}
          aria-controls="mobile-player-controls"
          className="hidden max-md:flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black/60 transition-colors hover:bg-black/5 hover:text-black"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      )}
      </div>

      {/* Expanded Similar Tracks View */}
      <div className={`w-full overflow-hidden flex flex-col motion-drawer ${isSimilarExpanded ? 'opacity-100 flex-grow' : 'opacity-0 h-0'}`}>
        {referenceTrack && (
          <div className="flex items-center gap-6 max-md:gap-3 px-6 max-md:px-4 py-6 max-md:py-3 border-b border-black/10 shrink-0 bg-black/5">
            <div className="w-24 h-24 max-md:w-12 max-md:h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-black/10 shadow-sm relative bg-white">
              <TrackArtwork track={referenceTrack} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="font-sans text-[10px] text-black/50 uppercase tracking-widest mb-1">Based on track</div>
              <div className="font-bold text-3xl max-md:text-lg truncate tracking-tight leading-none mb-1">{cleanTitle(referenceTrack.file_name)}</div>
              <div className="font-sans text-[13px] max-md:text-[11px] text-black/60">Similar tracks selected for you</div>
            </div>
            <div className="ml-auto">
              <button onClick={closeSimilar} className="text-black/40 hover:text-black p-2 rounded-full hover:bg-black/5 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}
        <div className="flex-grow max-md:min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] hide-scrollbar px-4 max-md:px-3 py-4">
          {isSimilarLoading && similarTracks.length === 0 ? (
            // Initial Skeleton Loader
            [...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-2 mb-1 rounded-xl border border-transparent">
                <div className="w-12 h-12 rounded shrink-0 bg-black/5 animate-pulse" />
                <div className="flex flex-col justify-center w-[20%] shrink-0 pr-4 gap-2">
                  <div className="h-3.5 bg-black/5 rounded w-3/4 animate-pulse" />
                  <div className="h-2.5 bg-black/5 rounded w-1/2 animate-pulse" />
                </div>
                <div className="hidden md:flex items-center gap-2 shrink-0 w-[24%]">
                  <div className="h-5 w-12 bg-black/5 rounded animate-pulse" />
                  <div className="h-5 w-16 bg-black/5 rounded animate-pulse" />
                </div>
                <div className="hidden md:flex flex-grow h-8 items-center pr-4">
                  <div className="h-3 w-full bg-black/5 rounded animate-pulse opacity-50" />
                </div>
                <div className="flex items-center justify-end pr-2 md:pr-4 shrink-0 w-auto gap-1.5 md:gap-2">
                  <div className="hidden md:block w-8 h-2.5 bg-black/5 rounded animate-pulse mr-2" />
                  <div className="hidden md:block w-4 h-4 bg-black/5 rounded-full animate-pulse mr-2 md:mr-4" />
                  <div className="w-16 h-8 md:w-20 md:h-9 bg-black/5 rounded animate-pulse" />
                </div>
              </div>
            ))
          ) : (
            // Tracks List
            <>
              {similarTracks.map(track => (
                <div 
                  key={track.id}
                  className="flex items-center gap-4 max-md:gap-2 hover:bg-[#f6f6f6] p-2 rounded-xl group transition-colors cursor-pointer select-none mb-1"
                  onClick={() => handlePlaySimilar(track)}
                >
                  <div className="w-12 h-12 max-md:w-10 max-md:h-10 rounded bg-black/5 overflow-hidden flex items-center justify-center relative shrink-0">
                    <TrackArtwork track={track} className="absolute inset-0 w-full h-full" />
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${currentTrack?.id === track.id && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {currentTrack?.id === track.id && isPlaying ? (
                        <Pause className="w-5 h-5 fill-white text-white" />
                      ) : (
                        <Play className="w-5 h-5 fill-white text-white" style={{ transform: 'translateX(4.166%)' }} />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col justify-center w-[20%] max-md:w-auto max-md:min-w-0 max-md:flex-1 shrink-0 pr-4 max-md:pr-0">
                    <div 
                      className={`font-bold truncate text-[14px] hover:underline cursor-pointer ${currentTrack?.id === track.id ? 'text-black' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedTrackForDetails(track); }}
                    >
                      {cleanTitle(track.file_name)}
                    </div>
                    <div className="font-sans text-[11px] text-black/40 truncate">
                      {getComposers(track.composers)}
                    </div>
                  </div>
                  
                  {/* Tags */}
                  <div className="hidden md:flex items-center gap-2 shrink-0 w-[24%] relative">
                    {(() => {
                      const human = parseTags((track as any).human_tags);
                      const subgenres = parseTags(track.subgenre);
                      const moods = parseTags(track.moods);
                      const scenarios = parseTags(track.scenarios);
                      const movement = parseTags(track.movement);
                      
                      const all = [...human, ...subgenres, ...moods, ...scenarios, ...movement];
                      const unique = Array.from(new Set(all));
                      const tags = unique.slice(0, 6);
                      const remainingTags = unique.slice(6);
                      
                      if (tags.length === 0) return <span className="text-[10px] text-black/30 font-bold uppercase tracking-widest">Tagging...</span>;

                      return (
                        <>
                          <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap flex-1" style={{ maskImage: 'linear-gradient(to right, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)' }}>
                            {tags.map((t, idx) => (
                              <span
                                key={idx}
                                onClick={event => handleSimilarTagClick(t, event)}
                                className="px-1.5 py-0.5 shrink-0 bg-black/5 hover:bg-black/10 rounded text-[9px] font-medium text-black/60 hover:text-black uppercase tracking-widest cursor-pointer transition-colors"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                          {remainingTags.length > 0 && (
                            <div className="relative shrink-0">
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setExpandedTags(expandedTags?.trackId === track.id ? null : {
                                    trackId: track.id,
                                    tags: remainingTags,
                                    anchor: { top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) }
                                  });
                                }}
                                className="px-1.5 py-0.5 shrink-0 bg-black/5 hover:bg-black/10 rounded text-[9px] font-medium text-black/60 hover:text-black uppercase tracking-widest cursor-pointer transition-colors"
                              >
                                +{remainingTags.length}
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Waveform */}
                  <div className="hidden md:flex flex-grow h-8 items-center pr-4 opacity-70 group-hover:opacity-100 transition-opacity">
                     <WaveformView 
                      data={parseWaveform(track.waveform_data)} 
                      isPlaying={currentTrack?.id === track.id && isPlaying} 
                      progress={currentTrack?.id === track.id ? progress : 0} 
                      onSeek={(percentage) => handleSeek(percentage)}
                      previewStartPct={isPreviewMode ? getPreviewTimings(track)?.startPct : undefined}
                      previewEndPct={isPreviewMode ? getPreviewTimings(track)?.endPct : undefined}
                    />
                  </div>

                  {/* Action Buttons, Duration, Download and License buttons */}
                  <div className={`flex items-center justify-end pr-2 md:pr-4 shrink-0 w-auto gap-1.5 md:gap-2`}>
                    <div className="max-md:[&>div]:gap-1"><TrackActionButtons trackId={track.id} /></div>
                    <div className="hidden md:block text-[11px] font-sans font-medium text-black/40 tracking-wider w-auto min-w-[40px] text-right mr-2">
                      {track.duration ? formatTime(track.duration) : '0:00'}
                    </div>
                    <div className="hidden md:flex w-[50px] justify-center shrink-0">
                    </div>
                    {profile?.can_download !== false && (
                      <button className="hidden md:flex p-1.5 hover:bg-black/5 rounded-full transition-colors items-center justify-center text-black/40 hover:text-black shrink-0 mr-2 md:mr-4" onClick={(e) => { e.stopPropagation(); openDownloadModal(track, e); }}>
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button className="flex items-center justify-center gap-1.5 md:gap-2 w-8 h-8 px-0 md:w-auto md:h-auto md:px-4 py-1.5 md:py-2 bg-black text-white rounded hover:bg-black/90 transition-colors font-sans text-[10px] md:text-[11px] uppercase tracking-widest shrink-0" onClick={(e) => { e.stopPropagation(); openLicenseModal(track); }}>
                      <ShoppingBag className="w-3.5 h-3.5" /> <span className="hidden md:inline">License</span>
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Load More Skeleton */}
              {isSimilarLoading && similarTracks.length > 0 && (
                [...Array(5)].map((_, i) => (
                  <div key={`load-more-${i}`} className="flex items-center gap-4 p-2 mb-1 rounded-xl border border-transparent">
                    <div className="w-12 h-12 rounded shrink-0 bg-black/5 animate-pulse" />
                    <div className="flex flex-col justify-center w-[20%] shrink-0 pr-4 gap-2">
                      <div className="h-3.5 bg-black/5 rounded w-3/4 animate-pulse" />
                      <div className="h-2.5 bg-black/5 rounded w-1/2 animate-pulse" />
                    </div>
                    <div className="hidden md:flex items-center gap-2 shrink-0 w-[24%]">
                      <div className="h-5 w-12 bg-black/5 rounded animate-pulse" />
                      <div className="h-5 w-16 bg-black/5 rounded animate-pulse" />
                    </div>
                    <div className="hidden md:flex flex-grow h-8 items-center pr-4">
                      <div className="h-3 w-full bg-black/5 rounded animate-pulse opacity-50" />
                    </div>
                    <div className="flex items-center justify-end pr-2 md:pr-4 shrink-0 w-auto gap-1.5 md:gap-2">
                      <div className="hidden md:block w-8 h-2.5 bg-black/5 rounded animate-pulse mr-2" />
                      <div className="hidden md:block w-4 h-4 bg-black/5 rounded-full animate-pulse mr-2 md:mr-4" />
                      <div className="w-16 h-8 md:w-20 md:h-9 bg-black/5 rounded animate-pulse" />
                    </div>
                  </div>
                ))
              )}

              {/* Load More Button */}
              {!isSimilarLoading && hasMoreSimilar && similarTracks.length > 0 && (
                <div className="flex justify-center mt-6 mb-8">
                  <button 
                    onClick={handleLoadMoreSimilar} 
                    className="px-6 py-2 border border-black/10 bg-white rounded-full text-xs font-bold uppercase tracking-widest text-black/60 hover:text-black hover:border-black/30 transition-colors shadow-sm"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {isMobileControlsOpen && currentTrack && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[140] hidden max-md:flex items-end" role="presentation">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm motion-overlay"
            onClick={() => setIsMobileControlsOpen(false)}
          />
          <section
            id="mobile-player-controls"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-player-controls-title"
            className="relative flex max-h-[min(82dvh,38rem)] w-full flex-col overflow-hidden rounded-t-[28px] border-t border-black/10 bg-[#fafafa] text-black shadow-[0_-20px_60px_rgba(0,0,0,0.2)] motion-surface"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-5 py-4">
              <div className="min-w-0 pr-4">
                <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-black/40">Now playing</p>
                <h2 id="mobile-player-controls-title" className="mt-1 truncate text-sm font-bold uppercase tracking-tight">
                  {cleanTitle(currentTrack.file_name)}
                </h2>
              </div>
              <button
                ref={mobileControlsCloseRef}
                type="button"
                aria-label="Close player controls"
                onClick={() => setIsMobileControlsOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-black transition-colors active:bg-black/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
              <div className="flex flex-col gap-5">
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <button
                    type="button"
                    aria-pressed={isPreviewMode}
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span>
                      <span className="block text-[10px] font-medium uppercase tracking-widest text-black/40">Playback mode</span>
                      <span className="mt-1 block text-sm font-bold uppercase tracking-tight">Preview</span>
                    </span>
                    <span className={`preview-toggle relative flex h-5 w-9 items-center rounded-full p-[2px] shadow-inner ${isPreviewMode ? 'bg-black' : 'bg-[#e0e0e0]'}`}>
                      <span className={`absolute h-4 w-4 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition-transform ${isPreviewMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </span>
                  </button>

                  <div className="mt-5 h-12">
                    <WaveformView
                      data={parseWaveform(currentTrack.waveform_data)}
                      isPlaying={isPlaying}
                      progress={progress}
                      onSeek={handleSeek}
                      previewStartPct={isPreviewMode ? getPreviewTimings(currentTrack)?.startPct : undefined}
                      previewEndPct={isPreviewMode ? getPreviewTimings(currentTrack)?.endPct : undefined}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-black/45">
                    <span>{audioRef.current ? formatTime(audioRef.current.currentTime) : '0:00'}</span>
                    <span>{audioRef.current?.duration ? formatTime(audioRef.current.duration) : (currentTrack.duration ? formatTime(currentTrack.duration) : '0:00')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={isShuffleEnabled}
                    onClick={() => setIsShuffleEnabled(!isShuffleEnabled)}
                    className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 text-left text-[10px] font-medium uppercase tracking-widest transition-colors ${isShuffleEnabled ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black/65 active:bg-black/5'}`}
                  >
                    <Shuffle className="h-4 w-4" /> Shuffle
                  </button>
                  <button
                    type="button"
                    aria-pressed={isRepeatEnabled}
                    onClick={() => setIsRepeatEnabled(!isRepeatEnabled)}
                    className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 text-left text-[10px] font-medium uppercase tracking-widest transition-colors ${isRepeatEnabled ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black/65 active:bg-black/5'}`}
                  >
                    <Repeat className="h-4 w-4" /> Repeat
                  </button>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4">
                  <button
                    type="button"
                    aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                    onClick={toggleMute}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 text-black transition-colors active:bg-black/10"
                  >
                    {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <label className="min-w-0 flex-1">
                    <span className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-black/40">Volume</span>
                    <input
                      aria-label="Volume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(event) => setVolume(parseFloat(event.target.value))}
                      className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-black/10 accent-black"
                    />
                  </label>
                  <span className="w-9 text-right text-[10px] font-medium tabular-nums text-black/50">{Math.round(volume * 100)}%</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-4">
                  <span>
                    <span className="block text-[10px] font-medium uppercase tracking-widest text-black/40">Library</span>
                    <span className="mt-1 block text-sm font-bold uppercase tracking-tight">Save this track</span>
                  </span>
                  <TrackActionButtons trackId={currentTrack.id} />
                </div>

                {profile?.can_download !== false && (
                  <button
                    type="button"
                    onClick={(event) => {
                      setIsMobileControlsOpen(false);
                      openDownloadModal(currentTrack, event);
                    }}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-[10px] font-medium uppercase tracking-widest text-black transition-colors active:bg-black/5"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>,
        document.body
      )}
      {expandedTags && typeof document !== 'undefined' && createPortal(
        <div
          ref={expandedTagsRef}
          className="fixed z-[100] w-64 p-2 bg-white border border-black/10 shadow-lg rounded-xl flex flex-wrap gap-2"
          style={{ top: expandedTags.anchor.top, right: expandedTags.anchor.right }}
          onClick={event => event.stopPropagation()}
        >
          {expandedTags.tags.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              onClick={event => handleSimilarTagClick(tag, event)}
              className="px-1.5 py-0.5 bg-black/5 hover:bg-black/10 rounded text-[9px] font-medium text-black/60 hover:text-black uppercase tracking-widest whitespace-nowrap cursor-pointer transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
