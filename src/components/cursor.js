/**
 * Custom HUD Reticle Cursor
 * Tracks mouse position, computes HUD coordinates, and locks onto interactive targets.
 */
export function initHudCursor() {
  const cursorWrapper = document.getElementById('hud-cursor');
  const coordsLabel = document.getElementById('cursor-coords');
  const targetLabel = document.getElementById('cursor-target');

  if (!cursorWrapper) return;

  let posX = window.innerWidth / 2;
  let posY = window.innerHeight / 2;
  let mouseX = posX;
  let mouseY = posY;

  // Track mouse movement
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (coordsLabel) {
      const padX = String(Math.round(mouseX)).padStart(4, '0');
      const padY = String(Math.round(mouseY)).padStart(4, '0');
      coordsLabel.textContent = `X:${padX} Y:${padY}`;
    }
  });

  // Smooth lerp for cursor motion
  function render() {
    posX += (mouseX - posX) * 0.25;
    posY += (mouseY - posY) * 0.25;

    cursorWrapper.style.transform = `translate3d(${posX}px, ${posY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  // Target acquisition on interactive elements
  const targetElements = document.querySelectorAll('a, button, input, textarea, .metric-card, .timeline-item');
  targetElements.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      document.body.classList.add('hovering-target');
      if (targetLabel) {
        targetLabel.textContent = el.getAttribute('aria-label') || el.innerText.slice(0, 12).toUpperCase() || 'LOCKED';
      }
    });

    el.addEventListener('mouseleave', () => {
      document.body.classList.remove('hovering-target');
      if (targetLabel) {
        targetLabel.textContent = 'IDLE';
      }
    });
  });
}
