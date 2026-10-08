/**
 * Shared render gate for the decorative canvases.
 *
 * Each canvas effect used to run its own unconditional requestAnimationFrame
 * loop for the entire page lifetime, even when scrolled far out of view. This
 * helper pauses the loop when the canvas leaves the viewport or the tab is
 * hidden, and honours prefers-reduced-motion.
 */
export function createRenderGate(canvas, render) {
  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let rafId = 0;
  let inView = false;
  let pageVisible = !document.hidden;

  const shouldRun = () => inView && pageVisible && !reducedMotion;

  function frame() {
    rafId = 0;
    if (!shouldRun()) return;
    render();
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (!rafId && shouldRun()) rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  const sync = () => (shouldRun() ? start() : stop());
  sync();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { rootMargin: '120px 0px' }
    ).observe(canvas);
  } else {
    inView = true;
    sync();
  }

  document.addEventListener('visibilitychange', () => {
    pageVisible = !document.hidden;
    sync();
  });

  return { start, stop };
}