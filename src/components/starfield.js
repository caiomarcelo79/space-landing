/**
 * Hyperspace / Warp Speed Canvas Starfield
 * Renders 3D perspective stars that stretch into velocity streaks upon mouse interaction or button acceleration.
 */
import { createRenderGate } from './renderGate.js';

export function initWarpStarfield() {
  const canvas = document.getElementById('warp-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;

  // Cap backing store resolution: this canvas is viewport-sized but its content
  // is soft glow streaks, so rendering above 2x buys nothing visible.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let width = 0;
  let height = 0;

  function measure() {
    return {
      w: (parent && parent.clientWidth) || window.innerWidth,
      h: (parent && parent.clientHeight) || window.innerHeight,
    };
  }

  function resize() {
    const { w, h } = measure();
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
  }, { passive: true });

  const numStars = 350;
  const stars = [];
  let speed = 2;
  let targetSpeed = 2;

  // Stars are grouped by color so each frame needs one Path2D + stroke per color
  // instead of one beginPath/stroke per star (350 draw calls per frame before).
  const COLORS = ['#f0f4f8', '#00f0ff', '#ff6b00'];
  const buckets = COLORS.map(() => []);

  function seedStars() {
    stars.length = 0;
    for (let i = 0; i < numStars; i++) {
      const roll = Math.random();
      const color = roll > 0.3 ? COLORS[0] : (Math.random() > 0.5 ? COLORS[1] : COLORS[2]);
      stars.push({
        x: (Math.random() - 0.5) * width * 2,
        y: (Math.random() - 0.5) * height * 2,
        z: Math.random() * width,
        oz: 0,
        size: Math.random() * 1.8 + 0.5,
        colorIndex: COLORS.indexOf(color),
      });
    }
  }

  seedStars();

  // Mouse move accelerates warp speed
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - width / 2;
    const my = e.clientY - rect.top - height / 2;
    const dist = Math.hypot(mx, my);
    targetSpeed = 2 + (dist / width) * 15;
  }, { passive: true });

  canvas.addEventListener('mouseleave', () => {
    targetSpeed = 2;
  });

  // Transmit button hover accelerates warp speed
  const transmitBtn = document.getElementById('transmit-btn');
  if (transmitBtn) {
    transmitBtn.addEventListener('mouseenter', () => {
      targetSpeed = 28; // Full warp speed stretch
    });
    transmitBtn.addEventListener('mouseleave', () => {
      targetSpeed = 2;
    });
  }

  function render() {
    speed += (targetSpeed - speed) * 0.05;

    ctx.fillStyle = 'rgba(3, 5, 8, 0.35)'; // Motion blur trail
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < numStars; i++) {
      const star = stars[i];
      star.oz = star.z;
      star.z -= speed;

      if (star.z <= 0) {
        star.z = width;
        star.oz = width;
        star.x = (Math.random() - 0.5) * width * 2;
        star.y = (Math.random() - 0.5) * height * 2;
      }

      const k = 256 / star.z;
      const px = star.x * k + cx;
      const py = star.y * k + cy;

      const ok = 256 / star.oz;
      const opx = star.x * ok + cx;
      const opy = star.y * ok + cy;

      if (px >= 0 && px <= width && py >= 0 && py <= height) {
        buckets[star.colorIndex].push(opx, opy, px, py, star.size);
      }
    }

    // One stroke pass per color instead of per star.
    for (let c = 0; c < COLORS.length; c++) {
      const data = buckets[c];
      if (!data.length) continue;

      ctx.beginPath();
      for (let i = 0; i < data.length; i += 5) {
        ctx.moveTo(data[i], data[i + 1]);
        ctx.lineTo(data[i + 2], data[i + 3]);
      }
      ctx.strokeStyle = COLORS[c];
      // Batching forces one width per color. 1.4 is the mean of the previous
      // per-star size range (0.5-2.3), so streaks keep a similar weight.
      ctx.lineWidth = 1.4 * (1 + speed * 0.05);
      ctx.stroke();
      data.length = 0;
    }
  }

  createRenderGate(canvas, render);
}