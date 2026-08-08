import React from 'react';
import { useSettings } from '../context/SettingsContext';

type PlaylistArtworkProps = {
  playlist: any;
  className?: string;
  forcePreviewFrames?: boolean;
};

export default function PlaylistArtwork({ playlist, className = '', forcePreviewFrames }: PlaylistArtworkProps) {
  const { settings } = useSettings();

  const framesEnabled = forcePreviewFrames !== undefined ? forcePreviewFrames : settings.public_artwork_frames_enabled;

  if (!framesEnabled) {
    return (
      <div className={`relative overflow-hidden aspect-square ${className}`}>
        {playlist?.cover_url ? (
          <img 
            src={playlist.cover_url} 
            className="w-full h-full object-cover select-none pointer-events-none" 
            alt={playlist.title || 'Playlist Artwork'} 
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-[#f4f4f4] flex items-center justify-center">
            <img 
              src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" 
              className="w-[50%] h-[50%] object-contain opacity-20 select-none pointer-events-none" 
              alt="Placeholder"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`@container isolate flex flex-col bg-white border border-black/5 overflow-hidden no-radius select-none pointer-events-none ${className}`}>
      
      {/* Top Header Section */}
      <div className="flex-none px-[3cqw] pt-[3cqw] pb-[4cqw] bg-white z-10 w-full">
          <div className="flex justify-between items-end w-full">
             {/* Left: TF */}
             <div className="flex items-end text-[18cqw] leading-[0.75] font-sans font-normal tracking-tighter text-black select-none">
                TF
             </div>
             {/* Right: Text Block */}
             <div className="flex flex-col text-right w-fit max-w-[60%] justify-end pb-[0.5cqw]">
                <div className="text-[1.8cqw] text-black/70 pb-[0.3cqw] whitespace-nowrap uppercase">
                   TOM FOX
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

      {/* Middle Image Section */}
      <div className="flex-grow w-full bg-white relative">
         {playlist?.cover_url ? (
            <div className="absolute inset-0 w-full h-full">
               <img 
                  src={playlist.cover_url} 
                  className="w-full h-full object-cover contrast-[0.85] saturate-[0.8] brightness-[0.95] sepia-[15%] select-none pointer-events-none" 
                  alt={playlist.title} 
               />
               {/* Paper grain noise overlay */}
               <div 
                 className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-50"
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
               ></div>
               {/* Inner shadow to simulate printed edge pressing */}
               <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.1)] pointer-events-none"></div>
            </div>
         ) : (
            <div className="absolute inset-0 w-full h-full bg-[#f4f4f4] overflow-hidden flex items-center justify-center">
               <img 
                 src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" 
                 className="w-[150%] h-[150%] object-contain opacity-10 select-none pointer-events-none" 
                 alt="Placeholder"
               />
               <div 
                 className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-50"
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
               ></div>
               <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.05)] pointer-events-none"></div>
            </div>
         )}
      </div>

      {/* Bottom Section */}
      <div className="flex-none px-[3cqw] pb-[3cqw] bg-white z-10 w-full pt-[4cqw]">
          <div className="text-right text-[1.8cqw] text-black/70 whitespace-nowrap">
             ALL RIGHTS RESERVED
          </div>
      </div>

      {/* Global Paper Grain Overlay for the whole card */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-25 z-50"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      ></div>

    </div>
  );
}
