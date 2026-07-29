/**
 * Hyperspace / Warp Speed Canvas Starfield
 * Renders 3D perspective stars that stretch into velocity streaks upon mouse interaction or button acceleration.
 */
export function initWarpStarfield() {
  const canvas = document.getElementById('warp-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = canvas.parentElement.clientWidth || window.innerWidth);
  let height = (canvas.height = canvas.parentElement.clientHeight || window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
    height = canvas.height = canvas.parentElement.clientHeight || window.innerHeight;
  });

  const numStars = 350;
  const stars = [];
  let speed = 2;
  let targetSpeed = 2;

  // Initialize stars in 3D coordinate space
  for (let i = 0; i < numStars; i++) {
    stars.push({
      x: (Math.random() - 0.5) * width * 2,
      y: (Math.random() - 0.5) * height * 2,
      z: Math.random() * width,
      oz: 0,
      size: Math.random() * 1.8 + 0.5,
      color: Math.random() > 0.3 ? '#f0f4f8' : (Math.random() > 0.5 ? '#00f0ff' : '#ff6b00')
    });
  }

  // Mouse move accelerates warp speed
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - width / 2;
    const my = e.clientY - rect.top - height / 2;
    const dist = Math.hypot(mx, my);
    targetSpeed = 2 + (dist / width) * 15;
  });

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

  // Render loop
  function loop() {
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
        ctx.beginPath();
        ctx.strokeStyle = star.color;
        ctx.lineWidth = star.size * (1 + speed * 0.05);
        ctx.moveTo(opx, opy);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
