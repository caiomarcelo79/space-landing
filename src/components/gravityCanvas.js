/**
 * Accretion Disk / Gravity Well Visualizer Canvas
 * Simulates gravitational lensing particles rotating around Gargantua black hole horizon.
 */
export function initGravityCanvas() {
  const canvas = document.getElementById('gravity-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = canvas.parentElement.clientWidth);
  let height = (canvas.height = canvas.parentElement.clientHeight);

  window.addEventListener('resize', () => {
    if (!canvas.parentElement) return;
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight;
  });

  const numParticles = 180;
  const particles = [];

  for (let i = 0; i < numParticles; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * (width * 0.38 - 25) + 25;
    particles.push({
      angle,
      radius,
      speed: (0.005 + Math.random() * 0.015) * (150 / radius),
      size: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.4 ? '#00f0ff' : '#ff6b00'
    });
  }

  function render() {
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
    particles.forEach((p) => {
      p.angle += p.speed;
      const x = cx + Math.cos(p.angle) * p.radius;
      const y = cy + Math.sin(p.angle) * (p.radius * 0.45); // Elliptical inclination

      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
