import React, { useRef, useEffect } from 'react';

// ─── Styles per KaleidoscopeBackground ───────────────────────────────────────
// Estratto dal componente per evitare re-injection ad ogni render
const _kmStyle = `
  .km-3d-wrapper {
    transform: perspective(800px) rotateX(60deg) rotateZ(-15deg) scale(1.4);
    transform-style: preserve-3d;
    contain: strict;
  }
`;
let _kmStyleInjected = false;
function injectKmStyles() {
  if (_kmStyleInjected || typeof document === 'undefined') return;
  _kmStyleInjected = true;
  const el = document.createElement('style');
  el.textContent = _kmStyle;
  document.head.appendChild(el);
}

export const KaleidoscopeBackground = ({ 
  isActive, 
  gradientClass, 
  spinClass 
}: { 
  isActive?: boolean; 
  gradientClass: string; 
  spinClass: string;
}) => {
  injectKmStyles();
  const maskId = `concentric-mask-${isActive ? 'active' : 'idle'}`;
  // 3 anelli invece di 4 — durata 12s (intervallo 4s invariato)
  const ringDelays = [0, 4, 8];
  
  return (
    <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${isActive ? 'opacity-0 group-hover:opacity-100' : 'opacity-100 group-hover:opacity-0'}`}>
      
      {/*
        Il wrapper 3D è ora un singolo elemento con il trasform completo
        (perspective inclusa). Così il browser crea UN SOLO layer GPU
        invece di due livelli annidati (perspective wrapper + rotateX wrapper).
      */}
      <div className="absolute inset-0 overflow-visible">
        <div className="absolute inset-[-50%] origin-center km-3d-wrapper">
          
          {/* SVG Mask Definition */}
          <svg className="absolute w-0 h-0" aria-hidden="true">
            <defs>
              <mask id={maskId}>
                {ringDelays.map((delay, i) => (
                  <circle key={i} cx="400" cy="520" r="0" fill="none" stroke="white">
                    <animate attributeName="r" values="0;800" dur="12s" begin={`-${delay}s`} repeatCount="indefinite" />
                    <animate attributeName="stroke-width" values="0;100;100" keyTimes="0;0.083;1" dur="12s" begin={`-${delay}s`} repeatCount="indefinite" />
                  </circle>
                ))}
              </mask>
            </defs>
          </svg>

          {/* Base Layer — nessun will-change (non è animato direttamente) */}
          <div className="absolute inset-0">
            <div className={`absolute inset-0 origin-center ${spinClass}`}>
              {/* blur 40px → 24px: ~40% meno costoso su GPU, impatto visivo minimo */}
              <div className={`absolute inset-0 ${gradientClass} blur-[24px] scale-150`} />
            </div>
          </div>

          {/* Mirror Layer (Reversed, Masked) */}
          <div 
            className="absolute inset-0" 
            style={{ 
              maskImage: `url(#${maskId})`, 
              WebkitMaskImage: `url(#${maskId})` 
            }}
          >
            <div className="absolute inset-0 origin-center" style={{ transform: 'scaleX(-1)' }}>
              <div className={`absolute inset-0 origin-center ${spinClass}`}>
                <div className={`absolute inset-0 ${gradientClass} blur-[24px] scale-150`} />
              </div>
            </div>
          </div>
          
          {/* Subtle glass edges — opacity 30 (era 40), sync a 12s */}
          <div className="absolute inset-0 z-10 opacity-30 mix-blend-overlay pointer-events-none">
            <svg viewBox="0 0 800 1040" className="w-full h-full">
              {ringDelays.map((delay, i) => (
                <circle key={i} cx="400" cy="520" r="0" fill="none" stroke="white">
                  <animate attributeName="r" values="0;800" dur="12s" begin={`-${delay}s`} repeatCount="indefinite" />
                  <animate attributeName="stroke-width" values="0;1.5;1.5" keyTimes="0;0.083;1" dur="12s" begin={`-${delay}s`} repeatCount="indefinite" />
                </circle>
              ))}
            </svg>
          </div>
          
          {/* Center glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#FFD700]/10 rounded-full blur-[16px] mix-blend-overlay pointer-events-none z-20" />
        </div>
      </div>
    </div>
  );
};

// ─── Styles per FeaturedSun ───────────────────────────────────────────────────
// Singleton: iniettato una sola volta nel <head>, non ad ogni render React
export const FeaturedSun = ({ isHovered }: { isHovered: boolean }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !svg.pauseAnimations) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          svg.unpauseAnimations();
        } else {
          svg.pauseAnimations();
        }
      },
      { threshold: 0 }
    );
    
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  // 4 anelli sfalsati (durata totale 30s)
  const ringDelays = ['0s', '-7.5s', '-15s', '-22.5s'];
  
  const generatePlanetsForRing = (ringIndex: number) => {
    const angles = [];
    // 24 pianetini: tantissimi, ma matematicamente spaziati per non sovrapporsi
    for(let i = 0; i < 24; i++) {
      // 150 gradi divisi in 23 intervalli = ~6.5 gradi garantiti di distanza
      const angle = -75 + (i * 150 / 23) + (Math.sin(i * 3.14 + ringIndex) * 1.5); 
      // Variazione drastica: da piccolissima polvere (0.5) a pianeti più grandi (3.5)
      const r = 0.5 + (Math.abs(Math.sin(i * 7 + ringIndex)) * 3);
      angles.push({ angle, r });
    }
    return angles;
  };

  return (
    <svg 
      ref={svgRef}
      className="absolute bottom-0 left-0 w-full h-[80px] z-10 pointer-events-none overflow-visible" 
      viewBox="0 0 400 80" 
      preserveAspectRatio="xMidYMax slice"
      style={{ willChange: 'transform', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
    >
      <defs>
        <linearGradient id="arch-gradient-dark" x1="0" y1="80" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#222E50" />
          <stop offset="60%"  stopColor="#7E7036" />
          <stop offset="100%" stopColor="#9C8942" />
        </linearGradient>
        <linearGradient id="arch-gradient" x1="0" y1="80" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#222E50" />
          <stop offset="60%"  stopColor="#D5C15E" />
          <stop offset="100%" stopColor="#E9D985" />
        </linearGradient>
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="96%" stopColor="#E9D985" stopOpacity="1" />
          <stop offset="100%" stopColor="#E9D985" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* Glow Statico: Radial Gradient invece di Tailwind CSS blur per massimizzare le performance GPU */}
      <circle cx="0" cy="640" r="624" fill="url(#sun-glow)" className={`transition-opacity duration-1000 ${isHovered ? 'opacity-30' : 'opacity-0'}`} />

      <g>
        {ringDelays.map((delay, i) => {
          // L'anello ruota in una singola direzione per creare la spirale
          const dir = i % 2 === 0 ? 1 : -1;
          const driftDeg = dir * 25; // Ampiezza della curva orbitale
          const planets = generatePlanetsForRing(i);
          return (
            <React.Fragment key={i}>
              {/* Wave Ring con animazione nativa SVG (SMIL) */}
              <circle 
                cx="0" cy="640" r="580" 
                fill="none" stroke="#E9D985" strokeWidth="0.3" opacity="0" 
              >
                <animate attributeName="r" values="580; 1000" dur="30s" begin={delay} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0; 0.8; 0" keyTimes="0; 0.1; 1" dur="30s" begin={delay} repeatCount="indefinite" />
              </circle>
              
              {/* Planet Rotator: Sincronizzato a 30s, va SOLO in una direzione e poi si resetta in modo invisibile */}
              <g>
                <animateTransform attributeName="transform" type="rotate" values={`0 0 640; ${driftDeg} 0 640`} dur="30s" begin={delay} repeatCount="indefinite" />
                {planets.map((p, pIdx) => (
                  <g key={pIdx} transform={`rotate(${p.angle}, 0, 640)`}>
                    <circle cx="0" cy="60" r={p.r} fill="#E9D985" opacity="0">
                      <animate attributeName="cy" values="60; -360" dur="30s" begin={delay} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0; 1; 0" keyTimes="0; 0.1; 1" dur="30s" begin={delay} repeatCount="indefinite" />
                    </circle>
                  </g>
                ))}
              </g>
            </React.Fragment>
          );
        })}
      </g>

      {/* Dark Sun (Idle) */}
      <circle cx="0" cy="640" r="600" fill="url(#arch-gradient-dark)" />
      {/* Bright Sun (Hover) */}
      <circle cx="0" cy="640" r="600" fill="url(#arch-gradient)" className={`transition-opacity duration-1000 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
    </svg>
  );
};
