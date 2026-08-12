import React, { useRef } from 'react';

interface WaveformViewProps {
  data: number[] | null;
  isPlaying?: boolean;
  progress?: number; // 0 to 100
  onSeek?: (percentage: number) => void;
  previewStartPct?: number; // 0 to 100
  previewEndPct?: number; // 0 to 100
  isDark?: boolean;
}

export default function WaveformView({ data, isPlaying = false, progress = 0, onSeek, previewStartPct, previewEndPct, isDark = false }: WaveformViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) return;
    e.stopPropagation();
    if (!onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    onSeek(percentage);
  };
  const [lastStart, setLastStart] = React.useState(previewStartPct);
  const [lastEnd, setLastEnd] = React.useState(previewEndPct);

  React.useEffect(() => {
    if (previewStartPct !== undefined) setLastStart(previewStartPct);
    if (previewEndPct !== undefined) setLastEnd(previewEndPct);
  }, [previewStartPct, previewEndPct]);

  const [barCount, setBarCount] = React.useState<number>(0);

  React.useEffect(() => {
    if (!containerRef.current) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        // 2px bar + 2px gap = 4px per bar
        const maxBars = Math.floor(width / 4);
        
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setBarCount(maxBars);
        }, 100); // 100ms debounce to prevent layout thrashing during animations
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  const resampledData = React.useMemo(() => {
    if (!data || data.length === 0 || barCount <= 0) return [];
    const resampled: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const origIdx = Math.floor((i / barCount) * data.length);
      resampled.push(data[Math.min(origIdx, data.length - 1)]);
    }
    return resampled;
  }, [data, barCount]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center opacity-30">
        <div className={`w-full h-[2px] ${isDark ? 'bg-white/20' : 'bg-black/20'} rounded-full`}></div>
      </div>
    );
  }

  const isActive = previewStartPct !== undefined && previewEndPct !== undefined;
  const renderStart = previewStartPct ?? lastStart ?? 0;
  const renderEnd = previewEndPct ?? lastEnd ?? 0;

  return (
    <div 
      ref={containerRef}
      onClick={handleClick}
      className="w-full h-full cursor-pointer group/waveform relative"
    >
      <div 
        className={`absolute h-[140%] top-[-20%] ${isDark ? 'bg-white/10' : 'bg-black/[0.08]'} rounded-xl transition-opacity duration-300 pointer-events-none ${isActive ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
          left: `${renderStart}%`, 
          width: `${Math.max(0, renderEnd - renderStart)}%`,
          zIndex: 0
        }} 
      />
      <div className="absolute inset-0 flex items-center gap-[2px]">
        {resampledData.map((val, idx) => {
          const height = Math.max(8, val);
          const isPlayed = progress > 0 && (idx / resampledData.length) * 100 <= progress;
          
          let colorClass = '';
          if (isDark) {
            colorClass = isPlayed ? 'bg-white opacity-100' : 'bg-white/20 group-hover/waveform:bg-white/40';
          } else {
            colorClass = isPlayed ? 'bg-black opacity-100' : 'bg-black/20 group-hover/waveform:bg-black/40';
          }

          return (
            <div 
              key={idx}
              style={{ height: `${height}%`, zIndex: 1 }}
              className={`w-[2px] rounded-full transition-colors shrink-0 ${colorClass}`}
            />
          );
        })}
      </div>
    </div>
  );
}
