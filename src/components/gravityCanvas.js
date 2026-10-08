/**
 * Accretion Disk / Gravity Well Visualizer Canvas
 * Simulates gravitational lensing particles rotating around Gargantua black hole horizon.
 */
import { createRenderGate } from './renderGate.js';

export function initGravityCanvas() {
  const canvas = document.getElementById('gravity-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;

  // Cap the backing store so the canvas is not rasterising more pixels than
  // the display can show.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let width = 0;
  let height = 0;

  function resize() {
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (!w || !h) return;
    width = w;
    height = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener('resize', () => {
    resize();
    render();
  }, { passive: true });

  const numParticles = 180;
  const particles = [];

  // Pre-rendered glow sprites. The previous version set ctx.shadowBlur inside the
  // particle loop, which meant 360 shadow-state changes every frame; shadowBlur is
  // one of the most expensive canvas operations. Drawing a cached sprite instead
  // looks the same and costs a fraction as much.
  const SPRITE_SIZE = 32;
  const sprites = {};

  function buildSprite(color) {
    const sprite = document.createElement('canvas');
    sprite.width = SPRITE_SIZE;
    sprite.height = SPRITE_SIZE;
    const sctx = sprite.getContext('2d');
    const r = SPRITE_SIZE / 2;
    const grad = sctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    return sprite;
  }

  sprites.cyan = buildSprite('rgba(0, 240, 255, 0.95)');
  sprites.amber = buildSprite('rgba(255, 107, 0, 0.95)');

  function seedParticles() {
    particles.length = 0;
    const maxRadius = width * 0.38 - 25;
    for (let i = 0; i < numParticles; i++) {
      const radius = Math.random() * maxRadius + 25;
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius,
        speed: (0.005 + Math.random() * 0.015) * (150 / radius),
        size: Math.random() * 1.5 + 0.5,
        sprite: Math.random() > 0.4 ? sprites.cyan : sprites.amber,
      });
    }
  }

  seedParticles();

  function render() {
    if (!width || !height) return;

    ctx.fillStyle = 'rgba(3, 5, 8, 0.25)';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    // Draw Event Horizon Core
    const horizonRadius = 22;
    ctx.beginPath();
    ctx.arc(cx, cy, horizonRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.strokeStyle = '#ff6b00';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Accretion photons
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.angle += p.speed;
      const x = cx + Math.cos(p.angle) * p.radius;
      const y = cy + Math.sin(p.angle) * (p.radius * 0.45); // Elliptical inclination

      const glow = p.size * 7;
      ctx.drawImage(p.sprite, x - glow / 2, y - glow / 2, glow, glow);
    }
  }

  createRenderGate(canvas, render);
}