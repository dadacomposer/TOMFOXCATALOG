import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { getPreviewTimings } from '../lib/audioUtils';
import { supabase } from '../lib/supabase';

export type Track = {
  id: string;
  file_name: string;
  duration?: number;
  bpm?: number | null;
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
  versions?: Track[];
  [key: string]: any;
};

type PlayerContextType = {
  currentTrack: Track | null;
  currentPlaylist: Track[];
  isPlaying: boolean;
  progress: number;
  pendingSeek: number | null;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  playTrack: (track: Track, playlist?: Track[], source?: 'top' | 'browse' | 'playlist') => void;
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
  currentSource: 'top' | 'browse' | 'playlist' | null;
  setCurrentSource: (source: 'top' | 'browse' | 'playlist' | null) => void;
  setCurrentPlaylist: (playlist: Track[]) => void;
  returnTrackId: string | null;
  setReturnTrackId: (id: string | null) => void;
  selectedTrackForDetails: Track | null;
  setSelectedTrackForDetails: (track: Track | null) => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isCurrentPreviewDormant, setIsCurrentPreviewDormant] = useState(false);
  const [fallbackPlaylist, setFallbackPlaylist] = useState<Track[]>([]);
  const [currentSource, setCurrentSource] = useState<'top' | 'browse' | 'playlist' | null>(null);
  const [returnTrackId, setReturnTrackId] = useState<string | null>(null);
  const [selectedTrackForDetails, setSelectedTrackForDetails] = useState<Track | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    }
  }, [currentTrack?.id]);

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

  const playTrack = (track: Track, playlist?: Track[], source?: 'top' | 'browse' | 'playlist') => {
    setIsCurrentPreviewDormant(false);
    if (source === 'top') {
      setIsPreviewMode(false);
      applyPreview(track, false);
      setCurrentSource('top');
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

  const togglePlay = () => {
    if (!currentTrack) return;
    setIsPlaying(!isPlaying);
  };

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

    const currentIndex = currentPlaylist.findIndex(t => t.id === currentTrack.id);
    
    if (currentIndex >= 0 && currentIndex < currentPlaylist.length - 1) {
      const nextTrack = currentPlaylist[currentIndex + 1];
      applyPreview(nextTrack);
      setCurrentTrack(nextTrack);
      setIsPlaying(true);
    } else if ((currentIndex === -1 || currentIndex === currentPlaylist.length - 1) && returnTrackId) {
      // The current track is not in the current playlist OR we reached the end of the temporary playlist.
      // We should resume from the track AFTER the returnTrackId.
      // Note: if currentIndex === -1, we are already in the restored playlist, so we just use currentPlaylist.
      // If we are at the end, we still need the original playlist. Wait, if we are at the end, currentPlaylist is still the temporary one!
      // So this won't work perfectly if currentPlaylist hasn't been restored.
      // We rely on GlobalPlayer's onEnded for automatic transition. 
      // For manual Next, it's safer to let GlobalPlayer handle it, or we just stop.
      // But if currentIndex === -1, it means we restored the original playlist.
      const returnIndex = currentPlaylist.findIndex(t => t.id === returnTrackId);
      if (returnIndex >= 0 && returnIndex < currentPlaylist.length - 1) {
        const nextTrack = currentPlaylist[returnIndex + 1];
        applyPreview(nextTrack);
        setCurrentTrack(nextTrack);
        setIsPlaying(true);
        setReturnTrackId(null); // Consumed
      }
    } else if (currentSource === 'top' && fallbackPlaylist.length > 0) {
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
      setIsPlaying(false);
    }
  }, [currentPlaylist, currentTrack, currentSource, fallbackPlaylist, returnTrackId]);

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

    const currentIndex = currentPlaylist.findIndex(t => t.id === currentTrack.id);
    if (currentIndex > 0) {
      setIsCurrentPreviewDormant(false);
      const prevTrack = currentPlaylist[currentIndex - 1];
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
      playNextTrack,
      playPrevTrack,
      stopPlayback,
      setPendingSeek,
      setProgress,
      isPreviewMode,
      setIsPreviewMode,
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
      setSelectedTrackForDetails
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
