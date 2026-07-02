import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function GlobalLoader() {
  const { playIntro, setPlayIntro } = useAuth();
  const [show, setShow] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (playIntro) {
      setShow(true);
      setIsFadingOut(false);
      // Artificial delay to build anticipation
      const delayTimer = setTimeout(() => {
        setIsFadingOut(true);
        const fadeTimer = setTimeout(() => {
          setShow(false);
          setPlayIntro(false);
        }, 600); // 600ms matches the fade-out duration
      }, 1400); // 1.4s delay
      
      return () => clearTimeout(delayTimer);
    } else {
      setShow(false);
      setIsFadingOut(false);
    }
  }, [playIntro]);

  if (!show) return null;

  return (
    <div 
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ease-in-out ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div className="flex flex-col items-center animate-in zoom-in-95 duration-700">
        <img 
          src="https://pub-b6e9dcf542e141cda8a3cbb1764f5997.r2.dev/assets/logo.png" 
          alt="Tom Fox" 
          className="h-10 object-contain mb-8" 
        />
        
        {/* Loading Bar Container */}
        <div className="w-48 h-1 bg-black/10 rounded-full overflow-hidden flex justify-start">
          {/* Animated Loading Bar */}
          <div className="h-full bg-black rounded-full animate-[loading-bar_1.4s_ease-in-out_forwards]"></div>
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          40% { width: 28%; }
          50% { width: 28%; } /* Artificial pause */
          85% { width: 82%; }
          92% { width: 82%; } /* Secondary micro-pause */
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
