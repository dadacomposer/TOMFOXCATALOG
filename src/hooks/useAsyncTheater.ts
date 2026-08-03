import { useState, useRef, useEffect, useCallback } from 'react';

type UseAsyncTheaterProps = {
  isVaulted?: boolean;
};

export function useAsyncTheater({ isVaulted = false }: UseAsyncTheaterProps = {}) {
  // Media refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRefs = useRef<{ [trackId: string]: HTMLAudioElement }>({});

  // Sync state
  const [activeTrackId, setActiveTrackId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Comment interception state
  const [isTypingComment, setIsTypingComment] = useState(false);
  const [draftTimecode, setDraftTimecode] = useState<number | null>(null);
  const [interceptedKey, setInterceptedKey] = useState('');

  const getActiveMedia = useCallback(() => {
    return audioRefs.current[activeTrackId] || videoRef.current;
  }, [activeTrackId]);

  // The Sync Loop
  useEffect(() => {
    let rAF: number;
    const syncLoop = () => {
      const video = videoRef.current;
      if (!video) {
        rAF = requestAnimationFrame(syncLoop);
        return;
      }

      const activeMedia = audioRefs.current[activeTrackId] || video;
      if (!activeMedia) {
        rAF = requestAnimationFrame(syncLoop);
        return;
      }

      // Sync play/pause state of all media elements based on global isPlaying
      if (isPlaying) {
        if (video.paused) video.play().catch(() => {});
        Object.keys(audioRefs.current).forEach(trackId => {
          const audio = audioRefs.current[trackId];
          if (audio && audio.paused) audio.play().catch(() => {});
        });
      } else {
        if (!video.paused) video.pause();
        Object.keys(audioRefs.current).forEach(trackId => {
          const audio = audioRefs.current[trackId];
          if (audio && !audio.paused) audio.pause();
        });
      }

      // Prevent drift by syncing to master time
      const masterTime = activeMedia.currentTime;
      setCurrentTime(masterTime);
      
      if (Number.isFinite(activeMedia.duration)) {
        setDuration(activeMedia.duration);
      }

      if (activeMedia !== video) {
        const diff = Math.abs(video.currentTime - masterTime);
        if (diff > 0.05) {
          video.currentTime = masterTime;
        }
      }

      // Sync all audio tracks to masterTime
      Object.keys(audioRefs.current).forEach(trackId => {
        const audio = audioRefs.current[trackId];
        if (audio) {
          const diff = Math.abs(audio.currentTime - masterTime);
          if (diff > 0.05) {
            audio.currentTime = masterTime;
          }
        }
      });

      rAF = requestAnimationFrame(syncLoop);
    };
    
    rAF = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(rAF);
  }, [activeTrackId, isPlaying]);

  // Update Mute status when track changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
    }
    Object.keys(audioRefs.current).forEach(trackId => {
      const audio = audioRefs.current[trackId];
      if (audio) {
        audio.muted = (trackId !== activeTrackId);
      }
    });
  }, [activeTrackId]);

  // Freeze if vaulted
  useEffect(() => {
    if (isVaulted) {
      setIsPlaying(false);
      if (videoRef.current) videoRef.current.pause();
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) audio.pause();
      });
    }
  }, [isVaulted]);

  const togglePlay = useCallback(() => {
    if (isVaulted) return;
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) audio.pause();
      });
      setIsPlaying(false);
    } else {
      video.play().catch(() => {});
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) audio.play().catch(() => {});
      });
      setIsPlaying(true);
    }
  }, [isPlaying, isVaulted]);

  const jumpTo = useCallback((time: number) => {
    if (Number.isFinite(time)) {
      if (videoRef.current) videoRef.current.currentTime = time;
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) audio.currentTime = time;
      });
      setCurrentTime(time);
    }
  }, []);

  const handleTrackSelect = useCallback((trackId: string) => {
    if (trackId === activeTrackId) {
      if (!isVaulted) togglePlay();
      return;
    }

    setActiveTrackId(trackId);

    if (videoRef.current) {
      videoRef.current.muted = true;
    }
    Object.keys(audioRefs.current).forEach(tId => {
      const audio = audioRefs.current[tId];
      if (audio) {
        audio.muted = (tId !== trackId);
      }
    });

    if (!isVaulted) {
      videoRef.current?.play().catch(() => {});
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) audio.play().catch(() => {});
      });
      setIsPlaying(true);
    }
  }, [activeTrackId, isVaulted, togglePlay]);

  // Global Keyboard Listener for Comments
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e || !e.key) return;
      if (isVaulted) return;
      const activeEl = document.activeElement;
      const isTypingInField = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (isTypingInField) return;

      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
        return;
      }

      const isAlphanumeric = e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey;
      if (isAlphanumeric) {
        e.preventDefault();
        
        const video = videoRef.current;
        const activeMedia = getActiveMedia();
        if (video) video.pause();
        Object.values(audioRefs.current).forEach(audio => {
          if (audio) audio.pause();
        });
        setIsPlaying(false);

        const currTime = activeMedia ? activeMedia.currentTime : 0;
        
        setIsTypingComment(true);
        setDraftTimecode(currTime);
        setInterceptedKey(e.key);

        setTimeout(() => {
          const textarea = document.getElementById('studio-comment-textarea') as HTMLTextAreaElement;
          if (textarea) {
            textarea.focus();
            textarea.value = e.key;
            textarea.setSelectionRange(1, 1);
          }
        }, 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, activeTrackId, isVaulted, getActiveMedia, togglePlay]);

  const resetCommentInterception = () => {
    setIsTypingComment(false);
    setDraftTimecode(null);
    setInterceptedKey('');
  };

  return {
    videoRef,
    audioRefs,
    activeTrackId,
    currentTime,
    duration,
    isPlaying,
    isTypingComment,
    draftTimecode,
    interceptedKey,
    togglePlay,
    jumpTo,
    handleTrackSelect,
    resetCommentInterception,
    setIsTypingComment,
    setDraftTimecode,
    setActiveTrackId
  };
}
