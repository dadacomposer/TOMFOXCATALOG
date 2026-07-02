import React, { useRef } from 'react';

interface WaveformViewProps {
  data: number[] | null;
  isPlaying?: boolean;
  progress?: number; // 0 to 100
  onSeek?: (percentage: number) => void;
  previewStartPct?: number; // 0 to 100
  previewEndPct?: number; // 0 to 100
}

export default function WaveformView({ data, isPlaying = false, progress = 0, onSeek, previewStartPct, previewEndPct }: WaveformViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
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

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center opacity-30">
        <div className="w-full h-[2px] bg-black/20 rounded-full"></div>
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
      className="w-full h-full flex items-center justify-between cursor-pointer group/waveform relative"
    >
      <div 
        className={`absolute h-[150%] top-[-25%] bg-black/5 rounded-lg transition-opacity duration-300 pointer-events-none ${isActive ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
          left: `${renderStart}%`, 
          width: `${Math.max(0, renderEnd - renderStart)}%`,
          zIndex: 0
        }} 
      >
        <div className="absolute inset-0 rounded-lg border-[1.5px] border-black/30" />
      </div>
      {data.map((val, idx) => {
        // val is already 0-100. We ensure a minimum height of 8% for flatlines.
        const height = Math.max(8, val);
        
        // Progress is 0 to 100. idx / data.length is 0 to 1.
        const isPlayed = progress > 0 && (idx / data.length) * 100 <= progress;
        const colorClass = isPlayed ? 'bg-black opacity-100' : 'bg-black/20 group-hover/waveform:bg-black/40';

        return (
          <div 
            key={idx}
            style={{ height: `${height}%`, zIndex: 1 }}
            className={`w-[2px] rounded-full transition-colors ${colorClass}`}
          />
        );
      })}
    </div>
  );
}
