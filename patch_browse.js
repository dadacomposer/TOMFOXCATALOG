const fs = require('fs');
let code = fs.readFileSync('src/pages/Browse.tsx', 'utf-8');

// Replace local state with usePlayer
code = code.replace(
  /const \[currentTrack, setCurrentTrack\] = useState<Track \| null>\(null\);\s*const \[isPlaying, setIsPlaying\] = useState\(false\);\s*const \[progress, setProgress\] = useState\(0\);\s*const \[pendingSeek, setPendingSeek\] = useState<number \| null>\(null\);\s*const \[isPreviewMode, setIsPreviewMode\] = useState\(true\);\s*const audioRef = useRef<HTMLAudioElement \| null>\(null\);/,
  `const { currentTrack, isPlaying, progress, pendingSeek, setPendingSeek, setProgress, togglePlay, playTrack } = usePlayer();\n  const [isPreviewMode, setIsPreviewMode] = useState(true);`
);

// Remove local useEffect for auto-play
code = code.replace(
  /useEffect\(\(\) => {\s*if \(currentTrack && audioRef\.current\) {\s*audioRef\.current\.play\(\)\.catch\(e => console\.error\("Autoplay prevented", e\)\);\s*setIsPlaying\(true\);\s*}\s*}\s*, \[currentTrack\]\);/,
  ''
);

// Replace handlePlayPause, handleSeek, etc.
code = code.replace(
  /const handlePlayPause = \(track: Track, source\?: 'top' \| 'browse'\) => \{[\s\S]*?\n  \};\n\n  const handleSeek = \(track: Track, percentage: number\) => \{[\s\S]*?\n  \};/,
  `const handlePlayPause = (track: Track, source?: 'top' | 'browse') => {
    const effectiveSource = source || currentSource;
    if (source) setCurrentSource(source);
    
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      const queue = source === 'top' ? trendingTracks : displayedTracks;
      playTrack(track, queue);
      
      const shouldPreview = isPreviewMode && effectiveSource !== 'top';
      if (shouldPreview) {
        const timings = getPreviewTimings(track);
        if (timings) {
          setPendingSeek(timings.startPct);
        } else {
          setProgress(0);
        }
      } else {
        setProgress(0);
      }
    }
  };

  const handleSeek = (track: Track, percentage: number) => {
    if (currentTrack?.id === track.id) {
       setPendingSeek(percentage); // global player will handle the actual seek logic
    } else {
       const queue = currentSource === 'top' ? trendingTracks : displayedTracks;
       playTrack(track, queue);
       setPendingSeek(percentage);
    }
  };`
);

// We need to keep handleTimeUpdate for preview logic maybe? Or maybe global player should handle it.
// Wait, the preview logic auto-skips to next track. The GlobalPlayer can't easily know if we are in preview mode...
// But we can simplify for now or let GlobalPlayer do it if we move isPreviewMode to PlayerContext.
// Let's just remove handleTimeUpdate since GlobalPlayer already updates progress.
code = code.replace(
  /const handleTimeUpdate = \(\) => \{[\s\S]*?\n  \};\n/,
  ''
);

// Remove the local player UI (lines with {/* PLAYER */} down to the end)
code = code.replace(/\{\/\* PLAYER \*\/\}(.|\n)*?(?=<\/div>\n  \);\n\})/, '');

// Add usePlayer import
code = code.replace(
  /import \{ Play, Pause/g,
  `import { usePlayer } from '../context/PlayerContext';\nimport { Play, Pause`
);

fs.writeFileSync('src/pages/Browse.tsx', code);
