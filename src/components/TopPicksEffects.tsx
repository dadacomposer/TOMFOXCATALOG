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

// ─── FeaturedSun — Canvas 2D (GPU-accelerated) ───────────────────────────────
// Sostituisce SVG SMIL (~204 animation timers sul CPU main thread) con Canvas 2D:
//  • Un singolo requestAnimationFrame   → vs 204 SMIL timers separati
//  • IntersectionObserver               → RAF sospeso quando fuori schermo
//  • Hover: interpolazione esponenziale → replica CSS transition-opacity 1000ms
//  • Gradients cachati per resize       → zero allocazioni per frame
//  • Geometria pianeti pre-computata    → calcolo eseguito una sola volta
//  • Batch per ring: 1 ctx.fill() per ring invece di 24 chiamate separate
//
// Tutta la matematica è identica al SVG originale: stessa formula pianeti,
// stessi valori (dur=30s, delays, colori, orbite) — solo il renderer cambia.

const TWO_PI = Math.PI * 2;
const DEG    = Math.PI / 180;

export const FeaturedSun = ({ isHovered }: { isHovered: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const isVisRef  = useRef(false);
  const hovRef    = useRef(0);          // 0..1, smooth hover progress
  const isHovRef  = useRef(isHovered);

  // Sync prop → ref (evita stale closure nel RAF loop)
  useEffect(() => { isHovRef.current = isHovered; }, [isHovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // ── Geometria pianeti pre-computata (identica al SVG originale) ───────────
    const RINGS  = 4;
    const PPS    = 24;              // planets per ring
    const DUR    = 30;              // secondi — durata ciclo (SVG dur="30s")
    const DELAYS = [0, 7.5, 15, 22.5]; // corrisponde ai begin negativi del SVG
    const DIRS   = [1, -1, 1, -1];

    const pDefs = Array.from({ length: RINGS }, (_, ri) =>
      Array.from({ length: PPS }, (_, pi) => ({
        angle: -75 + (pi * 150 / 23) + Math.sin(pi * 3.14 + ri) * 1.5,
        r:     0.5  + Math.abs(Math.sin(pi * 7 + ri)) * 3,
      }))
    );

    // ── Valori cachati per resize (ricalcolati solo se dimensioni cambiano) ───
    let cacheKey = '';
    let sc = 1, oy = 0;
    let sunX = 0, sunY = 0, sunR = 0, glowR = 0;
    let dGrad: CanvasGradient | null = null; // dark sun gradient
    let bGrad: CanvasGradient | null = null; // bright sun gradient (hover)
    let gGrad: CanvasGradient | null = null; // radial glow (hover)

    const rebuild = (W: number, H: number) => {
      const key = `${W}x${H}`;
      if (key === cacheKey) return;
      cacheKey = key;

      // Replica: viewBox="0 0 400 80" preserveAspectRatio="xMidYMax slice"
      sc       = Math.max(W / 400, H / 80);
      const ox = (W - 400 * sc) / 2; // xMid
      oy       = H - 80 * sc;         // YMax

      // Centro sole in canvas pixels (cx=0, cy=640 in viewBox)
      sunX  = 0 * sc + ox;
      sunY  = 640 * sc + oy;
      sunR  = 600 * sc;
      glowR = 624 * sc;

      // Coordinate gradient in canvas pixels:
      // viewBox y=80 → gy1 (primo stop, #222E50 scuro)
      // viewBox y=0  → gy0 (ultimo stop, oro)
      // Corrisponde a x1="0" y1="80" x2="0" y2="0" gradientUnits="userSpaceOnUse"
      const gy1 = 80 * sc + oy;
      const gy0 = oy;

      dGrad = ctx.createLinearGradient(sunX, gy1, sunX, gy0);
      dGrad.addColorStop(0,   '#222E50');
      dGrad.addColorStop(0.6, '#7E7036');
      dGrad.addColorStop(1,   '#9C8942');

      bGrad = ctx.createLinearGradient(sunX, gy1, sunX, gy0);
      bGrad.addColorStop(0,   '#222E50');
      bGrad.addColorStop(0.6, '#D5C15E');
      bGrad.addColorStop(1,   '#E9D985');

      // Glow radiale: opaco al 96%, trasparente al 100% (identico al SVG)
      gGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowR);
      gGrad.addColorStop(0.96, 'rgba(233,217,133,1)');
      gGrad.addColorStop(1,    'rgba(233,217,133,0)');
    };

    // ── Resize: aggiorna dimensioni fisiche canvas (CSS pixel × DPR) ─────────
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width  = Math.round(r.width  * (window.devicePixelRatio || 1));
      canvas.height = Math.round(r.height * (window.devicePixelRatio || 1));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── IntersectionObserver: sospende RAF quando off-screen ─────────────────
    const io = new IntersectionObserver(
      ([e]) => { isVisRef.current = e.isIntersecting; },
      { threshold: 0, rootMargin: '200px' }
    );
    io.observe(canvas);

    // ── Draw loop ─────────────────────────────────────────────────────────────
    let prevTs = performance.now();

    const draw = (ts: number) => {
      rafRef.current = requestAnimationFrame(draw);
      if (!isVisRef.current) { prevTs = ts; return; }

      // dt: tempo reale dall'ultimo frame, cappato a 50ms (recovery da tab inattiva)
      const dt = Math.min(ts - prevTs, 50);
      prevTs = ts;

      const W = canvas.width, H = canvas.height;
      if (!W || !H) return;

      rebuild(W, H);
      ctx.clearRect(0, 0, W, H);

      const t = (ts / 1000) % DUR;

      // Hover smoothing: interpolazione esponenziale time-based, τ=1000ms
      // Replica CSS transition-opacity 1000ms indipendentemente dal framerate
      const tgt = isHovRef.current ? 1 : 0;
      hovRef.current += (tgt - hovRef.current) * (1 - Math.exp(-dt / 1000));
      const hov = hovRef.current;

      // ── Glow radiale (hover, opacity-30) ─────────────────────────────────
      if (hov > 0.001 && gGrad) {
        ctx.globalAlpha = 0.3 * hov;
        ctx.fillStyle = gGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, glowR, 0, TWO_PI);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ── 4 anelli sfalsati di 7.5s ─────────────────────────────────────────
      for (let ri = 0; ri < RINGS; ri++) {
        const prog = ((t + DELAYS[ri]) % DUR) / DUR; // 0..1, ciclo continuo

        // Wave ring: r da 580 a 1000, opacity 0→0.8 nel 10%, poi 0.8→0 nel 90%
        const rOp = prog < 0.1
          ? (prog / 0.1) * 0.8
          : ((1 - prog) / 0.9) * 0.8;

        if (rOp > 0.001) {
          ctx.beginPath();
          ctx.arc(sunX, sunY, (580 + prog * 420) * sc, 0, TWO_PI);
          ctx.strokeStyle = `rgba(233,217,133,${rOp.toFixed(3)})`;
          ctx.lineWidth = 0.3 * sc;
          ctx.stroke();
        }

        // Planets: cy da 60 a -360 (viewBox units), opacity 0→1→0
        const pOp = prog < 0.1 ? prog / 0.1 : (1 - prog) / 0.9;

        if (pOp > 0.001) {
          const drift = DIRS[ri] * 25 * prog; // drift orbitale accumulato
          const pY_vb = 60 + prog * (-420);   // cy pianeta in viewBox units

          // Distanza dal centro sole in canvas pixels (dx=0 perché cx=0 nel SVG)
          const dy = (pY_vb - 640) * sc;      // negativo = sopra il sole

          ctx.fillStyle = '#E9D985';
          ctx.globalAlpha = pOp;

          // Batch: tutti i 24 pianeti del ring in un unico path → 1 fill() per ring
          ctx.beginPath();
          for (const p of pDefs[ri]) {
            const rad  = (p.angle + drift) * DEG;
            const sinA = Math.sin(rad);
            const cosA = Math.cos(rad);
            // Rotazione di (0, pY_vb) intorno a (0, 640) in viewBox, poi → canvas pixels
            // Semplificata per dx=0: px = sunX - dy*sin, py = sunY + dy*cos
            const px = sunX - dy * sinA;
            const py = sunY + dy * cosA;
            ctx.moveTo(px + p.r * sc, py); // moveTo previene linee spurie fra archi
            ctx.arc(px, py, p.r * sc, 0, TWO_PI);
          }
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // ── Sole scuro (sempre visibile) ──────────────────────────────────────
      if (dGrad) {
        ctx.fillStyle = dGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR, 0, TWO_PI);
        ctx.fill();
      }

      // ── Sole luminoso (hover, fade-in/out) ───────────────────────────────
      if (hov > 0.001 && bGrad) {
        ctx.globalAlpha = hov;
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR, 0, TWO_PI);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute bottom-0 left-0 w-full h-full pointer-events-none"
      style={{ transform: 'translateZ(0)' }}
    />
  );
};
