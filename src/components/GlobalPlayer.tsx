import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2, Minimize2, FileCheck2, Download, ShoppingBag, TrendingUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import WaveformView from './WaveformView';
import { usePlayer } from '../context/PlayerContext';
import { getPreviewTimings, parseWaveform } from '../lib/audioUtils';
import { useDownload } from '../context/DownloadContext';
import { useLicense } from '../context/LicenseContext';
import { fetchSimilarTracks } from '../lib/supabase';
import TrackArtwork from './TrackArtwork';
import { Track } from '../context/PlayerContext';
import { DEFAULT_ARTWORK, DEFAULT_ARTIST } from '../config';
import { useSettings } from '../context/SettingsContext';

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
  if (Array.isArray(t)) return t;
  try {
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    return [t];
  }
  return [t];
};

export default function GlobalPlayer() {
  const location = useLocation();
  const isSharedPage = location.pathname.startsWith('/share');
  
  const { currentTrack, currentPlaylist, isPlaying, progress, pendingSeek, setPendingSeek, setProgress, togglePlay, playNextTrack, playPrevTrack, audioRef, isPreviewMode, setIsPreviewMode, isCurrentPreviewDormant, setIsCurrentPreviewDormant, playTrack, setCurrentPlaylist, returnTrackId, setReturnTrackId, setSelectedTrackForDetails } = usePlayer();
  const { openDownloadModal } = useDownload();
  const { openLicenseModal } = useLicense();
  const { settings } = useSettings();
  const [isSimilarExpanded, setIsSimilarExpanded] = React.useState(false);
  const [referenceTrack, setReferenceTrack] = React.useState<Track | null>(null);
  const [similarTracks, setSimilarTracks] = React.useState<Track[]>([]);
  const [isSimilarLoading, setIsSimilarLoading] = React.useState(false);
  const [similarOffset, setSimilarOffset] = React.useState(0);
  const [hasMoreSimilar, setHasMoreSimilar] = React.useState(true);
  const [isBuffering, setIsBuffering] = React.useState(false);
  const originalPlaylistRef = React.useRef<Track[]>([]);

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
    if (originalPlaylistRef.current.length > 0) {
      setCurrentPlaylist(originalPlaylistRef.current);
    }
  };

  const handleNextTrack = () => {
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
    if (isSimilarExpanded && referenceTrack) {
      setIsSimilarLoading(true);
      setSimilarOffset(0);
      fetchSimilarTracks(referenceTrack.id, 10, 0).then(tracks => {
        setSimilarTracks(tracks);
        setHasMoreSimilar(tracks.length === 10);
        setIsSimilarLoading(false);
      });
    } else if (!isSimilarExpanded) {
      setSimilarTracks([]);
      setSimilarOffset(0);
      setHasMoreSimilar(true);
    }
  }, [isSimilarExpanded, referenceTrack]);

  const handleLoadMoreSimilar = () => {
    if (!referenceTrack || isSimilarLoading) return;
    setIsSimilarLoading(true);
    const nextOffset = similarOffset === 0 ? 10 : similarOffset + 5;
    fetchSimilarTracks(referenceTrack.id, 5, nextOffset).then(tracks => {
      setSimilarTracks(prev => {
        // filter out potential duplicates to be safe
        const newTracks = tracks.filter(t => !prev.find(p => p.id === t.id));
        return [...prev, ...newTracks];
      });
      setSimilarOffset(nextOffset);
      setHasMoreSimilar(tracks.length === 5);
      setIsSimilarLoading(false);
    });
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

  const baseBg = isSharedPage ? 'bg-[#111111]' : 'bg-[#fafafa]/85 backdrop-blur-xl';
  const baseText = isSharedPage ? 'text-white' : 'text-black';
  const baseBorder = isSharedPage ? 'border-white/10' : 'border-black/10';
  const secondaryText = isSharedPage ? 'text-white/60' : 'text-black/60';

  return (
    <div className={`fixed bottom-0 left-0 w-full flex flex-col ${baseBg} ${baseText} border-t ${baseBorder} z-[90] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${currentTrack ? 'translate-y-0' : 'translate-y-[100%]'} ${isSimilarExpanded ? 'h-[75vh]' : 'h-[90px]'}`}>

      {/* Main Player Bar FIRST so it's at the top of the expanded panel */}
      <div className={`w-full h-[90px] shrink-0 flex items-center px-4 md:px-6 gap-4 md:gap-8 transition-colors relative z-10 ${isSimilarExpanded ? `border-b ${baseBorder} ${isSharedPage ? 'bg-[#1a1a1a]' : 'bg-white/50'}` : ''}`}>
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
        />
      )}
      <div className="flex items-center gap-4 w-auto md:w-[240px] shrink-0">
        <div 
          className={`w-12 h-12 rounded overflow-hidden flex items-center justify-center relative hidden sm:flex border ${baseBorder} ${isSharedPage ? 'bg-white/5' : 'bg-black/5'} cursor-pointer group`}
          onClick={() => currentTrack && setSelectedTrackForDetails(currentTrack)}
        >
          {currentTrack && <TrackArtwork track={currentTrack} className="w-full h-full group-hover:scale-105 transition-transform" />}
        </div>
        <div className="flex flex-col overflow-hidden">
          <div 
            className="font-bold truncate text-[14px] cursor-pointer hover:underline underline-offset-2"
            onClick={() => currentTrack && setSelectedTrackForDetails(currentTrack)}
          >
            {currentTrack ? cleanTitle(currentTrack.file_name) : ''}
          </div>
          <div className={`font-sans text-[11px] ${secondaryText} truncate`}>
            {currentTrack?.composers 
              ? currentTrack.composers.filter(c => c.trim() !== '').join(', ')
              : 'Tom Fox'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <button onClick={playPrevTrack} className={`${isSharedPage ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'} transition-colors`}><SkipBack className="w-5 h-5 fill-current" /></button>
        {isBuffering ? (
          <button disabled className={`w-10 h-10 flex items-center justify-center rounded-lg ${isSharedPage ? 'bg-white text-black' : 'bg-black text-white'} transition-colors`}>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </button>
        ) : (
          <button onClick={togglePlay} className={`w-10 h-10 flex items-center justify-center rounded-lg ${isSharedPage ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'} transition-colors`}>
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" style={{ transform: 'translateX(4.166%)' }} />}
          </button>
        )}
        <button onClick={handleNextTrack} className={`${isSharedPage ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'} transition-colors`}><SkipForward className="w-5 h-5 fill-current" /></button>
      </div>
      <div className="flex-grow flex items-center">
        <div className="flex-grow mx-8 h-8 flex items-center">
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
        <div className={`font-sans text-[11px] ${secondaryText} uppercase tracking-widest w-12 text-right`}>{audioRef.current ? formatTime(audioRef.current.currentTime) : '0:00'}</div>
      </div>
      <div className="shrink-0 flex items-center gap-4 ml-4">
        {location.pathname.startsWith('/admin') && (
          <div className="flex items-center gap-3 cursor-pointer group/preview mr-2" onClick={() => setIsPreviewMode(!isPreviewMode)}>
            <span className={`text-[10px] font-bold tracking-widest uppercase transition-colors ${isPreviewMode ? 'text-black group-hover/preview:text-black/70' : 'text-black/30 group-hover/preview:text-black/60'}`}>Preview</span>
            <div 
              className={`preview-toggle w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center shadow-inner ${isPreviewMode ? 'bg-[#111111] group-hover/preview:bg-[#333]' : 'bg-[#e0e0e0] group-hover/preview:bg-[#d0d0d0]'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute shadow-[0_1px_4px_rgba(0,0,0,0.2)] ${isPreviewMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>
        )}
        {!isSharedPage && (
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
            className={`hidden xl:flex items-center gap-2 font-sans text-[11px] uppercase tracking-widest transition-colors ${isSimilarExpanded && currentTrack?.id === referenceTrack?.id ? 'text-black' : 'text-black/60 hover:text-black'}`}
          >
            <FileCheck2 className="w-4 h-4" /> Show Similar
          </button>
        )}
        <button className={`${isSharedPage ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'} ml-2`}><Volume2 className="w-5 h-5" /></button>
        {!isSharedPage && (
          <div className="flex gap-2 ml-4">
            <button className="flex items-center gap-2 px-4 py-2 border border-black/10 rounded hover:border-black/30 transition-colors bg-white font-sans text-[11px] uppercase tracking-widest" onClick={(e) => { if (currentTrack) openDownloadModal(currentTrack, e); }}>
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            {location.pathname !== '/admin' && settings.free_watermarks_enabled && (
              <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-black/90 transition-colors font-sans text-[11px] uppercase tracking-widest" onClick={() => { if (currentTrack) { openLicenseModal(currentTrack); } }}>
                <ShoppingBag className="w-3.5 h-3.5" /> License
              </button>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Expanded Similar Tracks View */}
      <div className={`w-full overflow-hidden flex flex-col transition-all duration-500 ${isSimilarExpanded ? 'opacity-100 flex-grow' : 'opacity-0 h-0'}`}>
        {referenceTrack && (
          <div className="flex items-center gap-6 px-6 py-6 border-b border-black/10 shrink-0 bg-black/5">
            <div className="w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-black/10 shadow-sm relative bg-white">
              <TrackArtwork track={referenceTrack} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <div className="font-sans text-[10px] text-black/50 uppercase tracking-widest mb-1">Based on track</div>
              <div className="font-bold text-3xl tracking-tight leading-none mb-1">{cleanTitle(referenceTrack.file_name)}</div>
              <div className="font-sans text-[13px] text-black/60">Similar tracks selected for you</div>
            </div>
            <div className="ml-auto">
              <button onClick={closeSimilar} className="text-black/40 hover:text-black p-2 rounded-full hover:bg-black/5 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}
        <div className="flex-grow overflow-y-auto hide-scrollbar px-4 py-4">
          {isSimilarLoading && similarTracks.length === 0 ? (
            // Initial Skeleton Loader
            [...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-2 mb-2 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-black/5 shrink-0" />
                <div className="flex flex-col gap-2 w-48 shrink-0">
                  <div className="h-3 bg-black/10 rounded w-full" />
                  <div className="h-2 bg-black/5 rounded w-2/3" />
                </div>
                <div className="flex-grow h-4 bg-black/5 rounded" />
              </div>
            ))
          ) : (
            // Tracks List
            <>
              {similarTracks.map(track => (
                <div 
                  key={track.id}
                  className="flex items-center gap-4 hover:bg-[#f6f6f6] p-2 rounded-xl group transition-colors cursor-pointer select-none mb-1"
                  onClick={() => handlePlaySimilar(track)}
                >
                  <div className="w-12 h-12 rounded bg-black/5 overflow-hidden flex items-center justify-center relative shrink-0">
                    <TrackArtwork track={track} className="absolute inset-0 w-full h-full" />
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${currentTrack?.id === track.id && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {currentTrack?.id === track.id && isPlaying ? (
                        <Pause className="w-5 h-5 fill-white text-white" />
                      ) : (
                        <Play className="w-5 h-5 fill-white text-white" style={{ transform: 'translateX(4.166%)' }} />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col justify-center w-[20%] shrink-0 pr-4">
                    <div className={`font-bold truncate text-[14px] ${currentTrack?.id === track.id ? 'text-black' : ''}`}>{cleanTitle(track.file_name)}</div>
                    <div className="font-sans text-[12px] text-black/50 mt-0.5">
                      {track.composers 
                        ? track.composers.filter(c => c.trim() !== '').join(', ')
                        : 'Tom Fox'}
                    </div>
                  </div>
                  
                  {/* Tags */}
                  <div className="hidden md:flex items-center gap-2 shrink-0 w-[24%] overflow-hidden">
                    {(() => {
                      const human = parseTags((track as any).human_tags);
                      const subgenres = parseTags(track.subgenre);
                      const moods = parseTags(track.moods);
                      const scenarios = parseTags(track.scenarios);
                      const movement = parseTags(track.movement);
                      
                      const all = [...human, ...subgenres, ...moods, ...scenarios, ...movement];
                      const unique = Array.from(new Set(all));
                      const tags = unique.slice(0, 2);
                      
                      if (tags.length === 0) return null;

                      return tags.map((t, idx) => (
                        <span key={idx} onClick={e => e.stopPropagation()} className="px-2 py-1 bg-black/5 rounded text-[10px] font-bold text-black/60 uppercase tracking-widest whitespace-nowrap cursor-default">
                          {t}
                        </span>
                      ));
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

                  {/* Download and License buttons */}
                  <div className="hidden md:flex items-center justify-end gap-2 pr-4 shrink-0 w-[280px]">
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-black/10 rounded hover:border-black/30 transition-colors bg-white font-sans text-[10px] uppercase tracking-widest" onClick={(e) => { e.stopPropagation(); openDownloadModal(track, e); }}>
                      <Download className="w-3 h-3" /> Download
                    </button>
                    {settings.free_watermarks_enabled && (
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded hover:bg-black/90 transition-colors font-sans text-[10px] uppercase tracking-widest" onClick={(e) => { e.stopPropagation(); openLicenseModal(track); }}>
                        <ShoppingBag className="w-3 h-3" /> License
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Load More Skeleton */}
              {isSimilarLoading && similarTracks.length > 0 && (
                [...Array(5)].map((_, i) => (
                  <div key={`load-more-${i}`} className="flex items-center gap-4 p-2 mb-2 animate-pulse">
                    <div className="w-10 h-10 rounded-lg bg-black/5 shrink-0" />
                    <div className="flex flex-col gap-2 w-48 shrink-0">
                      <div className="h-3 bg-black/10 rounded w-full" />
                      <div className="h-2 bg-black/5 rounded w-2/3" />
                    </div>
                    <div className="flex-grow h-4 bg-black/5 rounded" />
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
    </div>
  );
}
