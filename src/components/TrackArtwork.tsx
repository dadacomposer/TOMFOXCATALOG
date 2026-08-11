import React, { useState } from 'react';
import { Track } from '../context/PlayerContext';
import { getComposers } from '../utils/trackUtils';

interface TrackArtworkProps {
  track: Track;
  className?: string;
}

export default function TrackArtwork({ track, className = '' }: TrackArtworkProps) {
  const [hasError, setHasError] = useState(false);

  if (!track) return null;

  if (track.artwork_url && !hasError) {
    return (
      <img 
        src={track.artwork_url} 
        alt={track.file_name || 'Artwork'} 
        className={`object-cover select-none pointer-events-none ${className}`}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className={`@container isolate flex flex-col bg-white border border-black/5 overflow-hidden no-radius select-none pointer-events-none ${className}`}>
      
      {/* Top Header Section */}
      <div className="flex-none px-[3cqw] pt-[3cqw] pb-[4cqw] bg-white z-10 w-full border-b-[max(1px,0.2cqw)] border-black/10">
          <div className="flex justify-between items-end w-full">
             {/* Left: TF */}
             <div className="flex items-end text-[18cqw] leading-[0.75] font-sans font-normal tracking-tighter text-black select-none">
                TF
             </div>
             {/* Right: Text Block */}
             <div className="flex flex-col text-right w-fit max-w-[60%] justify-end pb-[0.5cqw]">
                <div className="text-[1.8cqw] text-black/70 pb-[0.3cqw] whitespace-nowrap uppercase truncate max-w-[40cqw] inline-block">
                   {getComposers(track.composers).toUpperCase()}
                </div>
                <div className="border-t-[max(1px,0.1cqw)] border-black/20 pt-[0.3cqw] pb-[0.3cqw] text-[1.8cqw] text-black/70 whitespace-nowrap uppercase">
                   HELLO@TOMFOX.SITE
                </div>
                <div className="border-t-[max(1px,0.1cqw)] border-black/20 pt-[0.3cqw] pb-[0.3cqw] text-[1.8cqw] text-black/70 whitespace-nowrap uppercase">
                   TOMFOX.SITE
                </div>
                <div className="border-t-[max(1px,0.1cqw)] border-black/20 pt-[0.3cqw] text-[1.8cqw] text-black/70 whitespace-nowrap uppercase">
                   ARLINGTON, VIRGINIA, USA
                </div>
             </div>
          </div>
      </div>

      {/* Middle Empty Section */}
      <div className="flex-grow w-full bg-white relative">
      </div>

      {/* Bottom Section */}
      <div className="flex-none px-[3cqw] pb-[3cqw] bg-white z-10 w-full pt-[4cqw] border-t-[max(1px,0.2cqw)] border-black/10">
          <div className="text-right text-[1.8cqw] text-black/70 whitespace-nowrap">
             ALL RIGHTS RESERVED
          </div>
      </div>

      {/* Global Paper Grain Overlay for the whole card */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-40 z-10"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      ></div>
    </div>
  );
}
