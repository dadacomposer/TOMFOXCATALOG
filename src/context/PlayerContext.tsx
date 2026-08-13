import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { getPreviewTimings } from '../lib/audioUtils';
import { supabase } from '../lib/supabase';
import { analytics } from '../lib/analytics';
import { useAuth } from './AuthContext';

export type Track = {
  id: string;
  file_name: string;
  duration?: number;
  key?: string;
  artwork_url?: string;
  r2_url?: string;
  waveform_data?: number[];
  is_hidden?: boolean;
  album?: string;
  composers?: string[];
  parent_track_id?: string;
  track_type?: 'main' | 'version' | 'stem';
  subgenre?: string | string[];
  moods?: string | string[];
  scenarios?: string | string[];
  instruments?: string | string[];
  textures?: string | string[];
  human_tags?: string | string[];
  humanly_reviewed?: boolean;
  pro_registered?: boolean;
  frequency_audio_registered?: boolean;
  versions?: Track[];
  [key: string]: any;
};

type PlayerContextType = {
  currentTrack: Track | null;
  currentPlaylist: Track[];
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  progress: number;
  pendingSeek: number | null;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  playTrack: (track: Track, playlist?: Track[], source?: 'top' | 'browse' | 'playlist' | 'suggested') => void;
  playPlaylist: (playlist: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  playNextTrack: () => void;
  playPrevTrack: () => void;
  stopPlayback: () => void;
  setPendingSeek: (seek: number | null) => void;
  setProgress: (prog: number) => void;
  isPreviewMode: boolean;
  setIsPreviewMode: (mode: boolean) => void;
  isCurrentPreviewDormant: boolean;
  setIsCurrentPreviewDormant: (mode: boolean) => void;
  fallbackPlaylist: Track[];
  setFallbackPlaylist: (playlist: Track[]) => void;
  currentSource: 'top' | 'browse' | 'playlist' | 'suggested' | null;
  setCurrentSource: (source: 'top' | 'browse' | 'playlist' | 'suggested' | null) => void;
  setCurrentPlaylist: (playlist: Track[]) => void;
  returnTrackId: string | null;
  setReturnTrackId: (id: string | null) => void;
  selectedTrackForDetails: Track | null;
  setSelectedTrackForDetails: (track: Track | null) => void;
  volume: number;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  isShuffleEnabled: boolean;
  setIsShuffleEnabled: (enabled: boolean) => void;
  isRepeatEnabled: boolean;
  setIsRepeatEnabled: (enabled: boolean) => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isCurrentPreviewDormant, setIsCurrentPreviewDormant] = useState(false);
  const [fallbackPlaylist, setFallbackPlaylist] = useState<Track[]>([]);
  const [currentSource, setCurrentSource] = useState<'top' | 'browse' | 'playlist' | 'suggested' | null>(null);
  const [returnTrackId, setReturnTrackId] = useState<string | null>(null);
  const [selectedTrackForDetails, setSelectedTrackForDetails] = useState<Track | null>(null);
  const [volume, setVolume] = useState(1);
  const [lastVolume, setLastVolume] = useState(1);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleMute = useCallback(() => {
    if (volume === 0) {
      setVolume(lastVolume || 1);
    } else {
      setLastVolume(volume);
      setVolume(0);
    }
  }, [volume, lastVolume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, currentTrack]);

  const handleSetPreviewMode = (mode: boolean) => {
    setIsPreviewMode(mode);
    if (currentTrack && currentSource !== 'top') {
      const timings = mode ? getPreviewTimings(currentTrack) : null;
      if (timings) {
        setPendingSeek(timings.startPct);
      } else {
        setPendingSeek(null);
      }
    }
  };

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Autoplay prevented", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (currentTrack?.id) {
      supabase.rpc('increment_play_count', { track_id: currentTrack.id }).then(({ error }) => {
        if (error) console.error("Failed to increment play count:", error);
      });
      // Telemetry: Start
      analytics.trackPlayStart(currentTrack.id, user?.id);
    }
  }, [currentTrack?.id, user?.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentTrack && audioRef.current) {
      interval = setInterval(() => {
        if (audioRef.current && !audioRef.current.paused) {
          analytics.trackPlayPing(currentTrack.id, Math.floor(audioRef.current.currentTime), user?.id);
        }
      }, 10000); // Ping every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentTrack]);

  const applyPreview = (track: Track, overridePreviewMode?: boolean) => {
    const isPreviewActive = overridePreviewMode !== undefined ? overridePreviewMode : isPreviewMode;
    if (isPreviewActive) {
      const timings = getPreviewTimings(track);
      if (timings) {
        setPendingSeek(timings.startPct);
      } else {
        setPendingSeek(null);
      }
    } else {
      setPendingSeek(null);
    }
  };

  const playTrack = (track: Track, playlist?: Track[], source?: 'top' | 'browse' | 'playlist' | 'suggested') => {
    setIsCurrentPreviewDormant(false);
    if (source === 'top' || source === 'suggested') {
      setIsPreviewMode(false);
      applyPreview(track, false);
      setCurrentSource(source);
    } else {
      applyPreview(track);
      if (source) setCurrentSource(source);
    }
    
    setCurrentTrack(track);
    if (playlist) setCurrentPlaylist(playlist);
    setIsPlaying(true);
  };

  const playPlaylist = (playlist: Track[], startIndex = 0) => {
    if (playlist.length > 0) {
      applyPreview(playlist[startIndex]);
      setCurrentPlaylist(playlist);
      setCurrentTrack(playlist[startIndex]);
      setIsPlaying(true);
    }
  };

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    setIsPlaying(prev => !prev);
  }, [currentTrack]);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentTrack(null);
    setIsPlaying(false);
  }, []);

  const playNextTrack = useCallback(() => {
    setIsCurrentPreviewDormant(false);
    if (!currentPlaylist.length || !currentTrack) return;
    
    // Check if the current track is a version
    if (currentTrack.parent_track_id) {
      const parentIndex = currentPlaylist.findIndex(t => t.id === currentTrack.parent_track_id);
      if (parentIndex !== -1) {
        const parentTrack = currentPlaylist[parentIndex];
        if (parentTrack.versions && parentTrack.versions.length > 0) {
          const versionIndex = parentTrack.versions.findIndex((v: any) => v.id === currentTrack.id);
          if (versionIndex >= 0 && versionIndex < parentTrack.versions.length - 1) {
            // Play next version
            const nextVersion = parentTrack.versions[versionIndex + 1];
            applyPreview(nextVersion);
            setCurrentTrack(nextVersion);
            setIsPlaying(true);
            return;
          }
        }
        // No more versions, play the next main track
        if (parentIndex < currentPlaylist.length - 1) {
          const nextMainTrack = currentPlaylist[parentIndex + 1];
          applyPreview(nextMainTrack);
          setCurrentTrack(nextMainTrack);
          setIsPlaying(true);
          return;
        }
      }
    }

    if (isRepeatEnabled) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
        setProgress(0);
      }
      return;
    }

    if (isShuffleEnabled && currentPlaylist.length > 1) {
      const currentIdx = currentPlaylist.findIndex(t => t.id === currentTrack.id);
      let randomIndex = Math.floor(Math.random() * currentPlaylist.length);
      // Try to avoid playing the exact same track again if possible
      if (randomIndex === currentIdx) {
        randomIndex = (randomIndex + 1) % currentPlaylist.length;
      }
      const nextTrack = currentPlaylist[randomIndex];
      applyPreview(nextTrack);
      setCurrentTrack(nextTrack);
      setIsPlaying(true);
      return;
    }

    const currentIndex = currentPlaylist.findIndex(t => t.id === currentTrack.id);
    
    if (currentIndex >= 0 && currentIndex < currentPlaylist.length - 1) {
      const nextTrack = currentPlaylist[currentIndex + 1];
      applyPreview(nextTrack);
      setCurrentTrack(nextTrack);
      setIsPlaying(true);
    } else if (currentIndex === -1 && currentPlaylist.length > 0) {
      // The current track is no longer in the active playlist (e.g. search changed or playlist closed).
      // Play the very first track of the new queue!
      const nextTrack = currentPlaylist[0];
      applyPreview(nextTrack);
      setCurrentTrack(nextTrack);
      setIsPlaying(true);
    } else if (currentIndex === currentPlaylist.length - 1 && returnTrackId) {
      // We reached the end of the temporary playlist.
      // We should resume from the track AFTER the returnTrackId.
      const returnIndex = currentPlaylist.findIndex(t => t.id === returnTrackId);
      if (returnIndex >= 0 && returnIndex < currentPlaylist.length - 1) {
        const nextTrack = currentPlaylist[returnIndex + 1];
        applyPreview(nextTrack);
        setCurrentTrack(nextTrack);
        setIsPlaying(true);
        setReturnTrackId(null); // Consumed
      }
    } else if ((currentSource === 'top' || currentSource === 'suggested') && fallbackPlaylist.length > 0) {
      // Fallback to Browse section
      setIsPreviewMode(true);
      setCurrentSource('browse');
      const nextTrack = fallbackPlaylist[0];
      applyPreview(nextTrack, true);
      setCurrentPlaylist(fallbackPlaylist);
      setCurrentTrack(nextTrack);
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent('scrollToBrowse'));
    } else {
      if (currentPlaylist.length > 0) {
        setIsShuffleEnabled(true);
        let randomIndex = Math.floor(Math.random() * currentPlaylist.length);
        // Avoid playing the exact same track again if possible
        const currentIdx = currentPlaylist.findIndex(t => t.id === currentTrack.id);
        if (randomIndex === currentIdx && currentPlaylist.length > 1) {
          randomIndex = (randomIndex + 1) % currentPlaylist.length;
        }
        const nextTrack = currentPlaylist[randomIndex];
        applyPreview(nextTrack);
        setCurrentTrack(nextTrack);
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    }
  }, [currentPlaylist, currentTrack, currentSource, fallbackPlaylist, returnTrackId, isShuffleEnabled, isRepeatEnabled]);

  const playPrevTrack = () => {
    if (!currentPlaylist.length || !currentTrack) return;
    
    if (audioRef.current && audioRef.current.currentTime > 3) {
      setIsCurrentPreviewDormant(true);
      setPendingSeek(0);
      return;
    }

    // Check if the current track is a version
    if (currentTrack.parent_track_id) {
      const parentIndex = currentPlaylist.findIndex(t => t.id === currentTrack.parent_track_id);
      if (parentIndex !== -1) {
        const parentTrack = currentPlaylist[parentIndex];
        if (parentTrack.versions && parentTrack.versions.length > 0) {
          const versionIndex = parentTrack.versions.findIndex((v: any) => v.id === currentTrack.id);
          if (versionIndex > 0) {
            // Play previous version
            const prevVersion = parentTrack.versions[versionIndex - 1];
            applyPreview(prevVersion);
            setCurrentTrack(prevVersion);
            setIsPlaying(true);
            return;
          } else {
            // Play the parent track
            applyPreview(parentTrack);
            setCurrentTrack(parentTrack);
            setIsPlaying(true);
            return;
          }
        }
      }
    }

    if (isShuffleEnabled && currentPlaylist.length > 1) {
      const currentIdx = currentPlaylist.findIndex(t => t.id === currentTrack.id);
      let randomIndex = Math.floor(Math.random() * currentPlaylist.length);
      if (randomIndex === currentIdx) {
        randomIndex = (randomIndex + 1) % currentPlaylist.length;
      }
      const prevTrack = currentPlaylist[randomIndex];
      applyPreview(prevTrack);
      setCurrentTrack(prevTrack);
      setIsPlaying(true);
      return;
    }

    const currentIndex = currentPlaylist.findIndex(t => t.id === currentTrack.id);
    if (currentIndex > 0) {
      setIsCurrentPreviewDormant(false);
      const prevTrack = currentPlaylist[currentIndex - 1];
      applyPreview(prevTrack);
      setCurrentTrack(prevTrack);
      setIsPlaying(true);
    } else if (currentIndex === -1 && currentPlaylist.length > 0) {
      setIsCurrentPreviewDormant(false);
      const prevTrack = currentPlaylist[0];
      applyPreview(prevTrack);
      setCurrentTrack(prevTrack);
      setIsPlaying(true);
    }
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      currentPlaylist,
      isPlaying,
      progress,
      pendingSeek,
      audioRef,
      playTrack,
      playPlaylist,
      togglePlay,
      setIsPlaying,
      playNextTrack,
      playPrevTrack,
      stopPlayback,
      setPendingSeek,
      setProgress,
      isPreviewMode,
      setIsPreviewMode: handleSetPreviewMode,
      isCurrentPreviewDormant,
      setIsCurrentPreviewDormant,
      fallbackPlaylist,
      setFallbackPlaylist,
      currentSource,
      setCurrentSource,
      setCurrentPlaylist,
      returnTrackId,
      setReturnTrackId,
      selectedTrackForDetails,
      setSelectedTrackForDetails,
      volume,
      setVolume,
      toggleMute,
      isShuffleEnabled,
      setIsShuffleEnabled,
      isRepeatEnabled,
      setIsRepeatEnabled
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
