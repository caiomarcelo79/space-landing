/**
 * Custom HUD Reticle Cursor
 * Tracks mouse position, computes HUD coordinates, and locks onto interactive targets.
 */
import { createRenderGate } from './renderGate.js';

export function initHudCursor() {
  const cursorWrapper = document.getElementById('hud-cursor');
  const coordsLabel = document.getElementById('cursor-coords');
  const targetLabel = document.getElementById('cursor-target');

  if (!cursorWrapper) return;

  // Touch/coarse pointers have no reticle to follow.
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    cursorWrapper.style.display = 'none';
    return;
  }

  let posX = window.innerWidth / 2;
  let posY = window.innerHeight / 2;
  let mouseX = posX;
  let mouseY = posY;
  let lastCoordText = '';

  // Track mouse movement
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  function render() {
    posX += (mouseX - posX) * 0.25;
    posY += (mouseY - posY) * 0.25;

    cursorWrapper.style.transform = `translate3d(${posX.toFixed(1)}px, ${posY.toFixed(1)}px, 0) translate(-50%, -50%)`;

    // Round before comparing: the readout shows integers, so writing on every
    // raw sub-pixel move only produced redundant layout work.
    if (coordsLabel) {
      const text = `X:${String(Math.round(mouseX)).padStart(4, '0')} Y:${String(Math.round(mouseY)).padStart(4, '0')}`;
      if (text !== lastCoordText) {
        lastCoordText = text;
        coordsLabel.textContent = text;
      }
    }
  }

  createRenderGate(cursorWrapper, render);

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