export const smoothScroll = (
  element: HTMLElement | null,
  distance: number,
  duration: number = 800
) => {
  if (!element) return;

  const start = element.scrollLeft;
  const startTime = performance.now();

  const easeInOutQuad = (t: number) => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  };

  const animateScroll = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Apply easing function
    const easeProgress = easeInOutQuad(progress);
    
    element.scrollLeft = start + distance * easeProgress;

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  };

  requestAnimationFrame(animateScroll);
};
