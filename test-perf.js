import { chromium } from 'playwright';

const URL = process.env.TARGET_URL || 'http://localhost:4173';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(2500);

// --- Asset weight actually loaded ---
const media = await page.evaluate(() => {
  const v = document.getElementById('space-hero-video');
  return {
    duration: v?.duration ?? null,
    w: v?.videoWidth ?? null,
    h: v?.videoHeight ?? null,
    readyState: v?.readyState ?? null,
  };
});

// --- Seek latency: set currentTime, measure time until `seeked` ---
const seekStats = await page.evaluate(async () => {
  const v = document.getElementById('space-hero-video');
  if (!v || !v.duration) return null;
  const samples = [];
  for (const t of [0.15, 0.35, 0.55, 0.75, 0.92]) {
    const target = v.duration * t;
    const t0 = performance.now();
    await new Promise((resolve) => {
      const done = () => { v.removeEventListener('seeked', done); resolve(); };
      v.addEventListener('seeked', done);
      v.currentTime = target;
    });
    samples.push(+(performance.now() - t0).toFixed(1));
  }
  samples.sort((a, b) => a - b);
  return {
    samples,
    median: samples[Math.floor(samples.length / 2)],
    max: samples[samples.length - 1],
  };
});

// --- FPS while scrubbing the hero section ---
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);

const fps = await page.evaluate(async () => {
  const hero = document.getElementById('hero');
  const total = hero.scrollHeight - window.innerHeight;
  let frames = 0;
  let running = true;

  const count = () => { frames++; if (running) requestAnimationFrame(count); };
  requestAnimationFrame(count);

  const start = performance.now();
  // sweep the hero over ~2s
  for (let i = 0; i <= 40; i++) {
    window.scrollTo(0, (total * i) / 40);
    await new Promise((r) => setTimeout(r, 50));
  }
  const elapsed = performance.now() - start;
  running = false;

  return +(frames / (elapsed / 1000)).toFixed(1);
});

// --- Idle FPS while the hero is off-screen (gates should suspend work) ---
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1200);
const idleFps = await page.evaluate(async () => {
  let frames = 0;
  let running = true;
  const count = () => { frames++; if (running) requestAnimationFrame(count); };
  requestAnimationFrame(count);
  const start = performance.now();
  await new Promise((r) => setTimeout(r, 1500));
  const elapsed = performance.now() - start;
  running = false;
  return +(frames / (elapsed / 1000)).toFixed(1);
});

// --- Heap: confirms the 80-bitmap cache is gone ---
const heap = await page.evaluate(() =>
  performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null
);

await page.screenshot({ path: 'perf-end.png' });

console.log(JSON.stringify({ media, seekStats, scrubFps: fps, idleFps, heapMB: heap, errors }, null, 2));

await browser.close();