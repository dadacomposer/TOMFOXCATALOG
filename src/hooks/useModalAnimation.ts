import { useState, useEffect } from 'react';

// The delay must match the shared .motion-surface duration. Keeping it here
// prevents a modal from feeling slow after its visual transition has finished.
export function useModalAnimation(shouldBeOpen: boolean, closeDelay: number = 220) {
  const [isMounted, setIsMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    let raf1: number;
    let raf2: number;
    let timeout: ReturnType<typeof setTimeout>;

    if (shouldBeOpen) {
      setIsMounted(true);
      // Double requestAnimationFrame ensures the browser paints the initial 'closed' state
      // before we apply the 'open' classes, preventing any opening animation jerks.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      timeout = setTimeout(() => setIsMounted(false), closeDelay);
    }
    
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timeout);
    };
  }, [shouldBeOpen, closeDelay]);

  return { isMounted, isAnimating };
}
