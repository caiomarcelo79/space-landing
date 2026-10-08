import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { initHudCursor } from './components/cursor.js';
import { initSpaceAudio } from './components/audio.js';
import { initWarpStarfield } from './components/starfield.js';
import { initGravityCanvas } from './components/gravityCanvas.js';

gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lenis Smooth Scroll
  // lerp responds immediately; the previous duration:1.2 + exponential easing
  // stacked two easing passes and read as sluggish rather than smooth.
  const lenis = new Lenis({
    lerp: 0.12,
    smoothWheel: true,
    touchMultiplier: 2,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  // NOTE: lagSmoothing is intentionally left at its GSAP default. Disabling it
  // let a single slow frame jump the whole timeline, which is what produced the
  // "stuck" feel while scrubbing.

  // 2. Initialize Interactive HUD Modules
  initHudCursor();
  initSpaceAudio();
  initWarpStarfield();
  initGravityCanvas();

  // 3. UTC Live Clock Ticker
  // Throttled to ~10fps on the shared GSAP ticker and guarded against redundant
  // writes; the previous setInterval(40ms) forced 25 style recalcs per second
  // inside a fixed HUD for the entire page lifetime.
  const utcClock = document.getElementById('hud-utc-clock');
  let clockElapsed = 0;
  let lastClockText = '';
  gsap.ticker.add((time, deltaTime) => {
    clockElapsed += deltaTime * 1000;
    if (clockElapsed < 100 || !utcClock) return;
    clockElapsed = 0;

    const now = new Date();
    const hrs = String(now.getUTCHours()).padStart(2, '0');
    const mins = String(now.getUTCMinutes()).padStart(2, '0');
    const secs = String(now.getUTCSeconds()).padStart(2, '0');
    const ms = String(Math.floor(now.getUTCMilliseconds() / 10)).padStart(2, '0');
    const text = `${hrs}:${mins}:${secs}.${ms}`;

    if (text !== lastClockText) {
      utcClock.textContent = text;
      lastClockText = text;
    }
  });

  // 4. DEFINITIVE SOLUTION: Optimized Canvas & Video Scroll-Scrubbing Engine
  const video = document.getElementById('space-hero-video');
  const canvas = document.getElementById('hero-video-canvas');

  if (video && canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });

    // Match the canvas backing store to the CSS box in device pixels so the
    // frame is rasterised once at native density instead of being upscaled.
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawCurrentFrame();
    };
    window.addEventListener('resize', resizeCanvas, { passive: true });

    video.pause();

    let targetVideoTime = 0;
    let currentVideoTime = 0;
    let pendingSeek = false;
    let isHeroVisible = false;
    let lastDrawnTime = -1;

    // Single draw path. Previously this ran from the rAF loop, a recursive
    // requestVideoFrameCallback, and timeupdate/seeking/seeked all at once,
    // producing up to three full-viewport uploads for the same frame.
    function drawCurrentFrame() {
      if (!canvas.width || !canvas.height || video.readyState < 2) return;

      // Redraw only when the source frame actually moved.
      if (video.currentTime === lastDrawnTime) return;
      lastDrawnTime = video.currentTime;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      const vRatio = vw / vh;
      const cRatio = viewW / viewH;
      let dw = viewW;
      let dh = viewH;
      let dx = 0;
      let dy = 0;

      if (cRatio > vRatio) {
        dh = viewW / vRatio;
        dy = (viewH - dh) / 2;
      } else {
        dw = viewH * vRatio;
        dx = (viewW - dw) / 2;
      }

      // Slight overscan replaces the old CSS scale-105 filter pass. The context
      // is opaque, so drawImage covering the box needs no clearRect.
      const overscan = 1.05;
      dw *= overscan;
      dh *= overscan;
      dx -= (dw - viewW) / 2;
      dy -= (dh - viewH) / 2;

      ctx.drawImage(video, dx, dy, dw, dh);
    }

    function requestSeek() {
      if (video.duration && !video.seeking) {
        // fastSeek snapped to keyframes and could land on a visibly wrong
        // frame; the encodes carry a short GOP so an exact seek is cheap.
        video.currentTime = currentVideoTime;
      } else {
        pendingSeek = true;
      }
    }

    video.addEventListener('seeked', () => {
      drawCurrentFrame();
      if (pendingSeek) {
        pendingSeek = false;
        requestSeek();
      }
    });

    let initializedScrubbing = false;

    const setupVideoScrubbing = () => {
      if (initializedScrubbing) return;
      initializedScrubbing = true;

      resizeCanvas();

      // Cache the HUD nodes once instead of querying the DOM on every scroll tick.
      const scrollBar = document.getElementById('hud-scroll-bar');
      const scrollPct = document.getElementById('hud-scroll-pct');
      const distReadout = document.getElementById('hud-distance-readout');
      let lastPct = -1;
      let lastDist = '';

      // ScrollTrigger captures target time on scroll update with smoothed scrub easing
      ScrollTrigger.create({
        trigger: '#hero',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        onUpdate: (self) => {
          if (video.duration) {
            targetVideoTime = self.progress * (video.duration - 0.05);
          }

          // Update HUD gauge & distance, skipping redundant style writes
          const pct = Math.round(self.progress * 100);
          if (pct !== lastPct) {
            lastPct = pct;
            if (scrollBar) scrollBar.style.height = `${pct}%`;
            if (scrollPct) scrollPct.textContent = `${pct}%`;
          }

          if (distReadout) {
            const dist = `${(self.progress * 14.85).toFixed(2)} AU`;
            if (dist !== lastDist) {
              lastDist = dist;
              distReadout.textContent = dist;
            }
          }
        }
      });

      // Smooth RAF Lerp loop with throttled frame seeking.
      // Driven from the GSAP ticker so it shares one rAF with Lenis, and
      // suspended entirely while the hero is off-screen.
      let lastSeekTime = 0;
      gsap.ticker.add((time) => {
        if (!isHeroVisible || !video.duration) return;

        const delta = targetVideoTime - currentVideoTime;

        if (Math.abs(delta) > 0.001) {
          const lerpFactor = Math.abs(delta) > 1.2 ? 0.35 : 0.25;
          currentVideoTime += delta * lerpFactor;

          const now = performance.now();
          // Throttle seeks to ~30ms. The old 16ms cap queued seeks faster than
          // the decoder could service them, which is what caused the visible
          // stutter on fast scrolls.
          if (now - lastSeekTime > 33 && Math.abs(currentVideoTime - video.currentTime) > 0.01) {
            lastSeekTime = now;
            requestSeek();
          }
        }
        drawCurrentFrame();
      });

      // Only run the scrub loop while the hero section is on screen.
      const heroEl = document.getElementById('hero');
      if (heroEl && 'IntersectionObserver' in window) {
        new IntersectionObserver(
          ([entry]) => {
            isHeroVisible = entry.isIntersecting;
          },
          { rootMargin: '100px 0px' }
        ).observe(heroEl);
      } else {
        isHeroVisible = true;
      }

      // Hero Content Fade & Scale on Scroll Exit
      gsap.to('#hero-content', {
        opacity: 0,
        scale: 0.88,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: '#hero',
          start: '50% top',
          end: 'bottom bottom',
          scrub: true
        }
      });
    };

    // Preload completely: wait for canplaythrough or sufficient readyState
    if (video.readyState >= 3) {
      setupVideoScrubbing();
    } else {
      video.addEventListener('canplaythrough', setupVideoScrubbing, { once: true });
      video.addEventListener('loadedmetadata', () => {
        if (video.readyState >= 3) setupVideoScrubbing();
      });
      // Fallback timer in case canplaythrough event fires early or is delayed
      setTimeout(() => {
        setupVideoScrubbing();
      }, 1500);
    }
  }

  // 5. Text Split Reveal for Section 2 (Intro)
  // Animating `className` cannot be composited, so every scrub tick forced a
  // style/layout recalculation across all 76 spans. Animating opacity/y writes
  // inline transforms instead, which stays on the compositor. The soft blur
  // comes from CSS and is only present until each word settles.
  const revealWords = (target, trigger, stagger, start, end) => {
    const spans = target.querySelectorAll('.word-reveal-span');
    if (!spans.length) return;

    gsap.to(spans, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      ease: 'none',
      stagger,
      scrollTrigger: {
        trigger,
        start,
        end,
        scrub: 0.8,
      },
    });
  };

  const splitHeading = document.getElementById('split-text-heading');
  if (splitHeading) {
    splitHeading.innerHTML = splitHeading.innerText
      .split(' ')
      .map((word) => `<span class="word-reveal-span">${word}</span>`)
      .join(' ');

    revealWords(splitHeading, '#split-text-heading', 0.1, 'top 80%', 'bottom 40%');
  }

  document.querySelectorAll('.reveal-paragraph').forEach((p) => {
    p.innerHTML = p.innerText
      .split(' ')
      .map((w) => `<span class="word-reveal-span">${w}</span>`)
      .join(' ');

    revealWords(p, p, 0.05, 'top 85%', 'bottom 45%');
  });

  // 6. Metrics Animated Counters
  const counterElements = document.querySelectorAll('.counter');
  counterElements.forEach((el) => {
    const target = parseFloat(el.getAttribute('data-target'));
    const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);

    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 2.5,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true
      },
      onUpdate: () => {
        if (decimals > 0) {
          el.textContent = obj.val.toFixed(decimals);
        } else {
          el.textContent = Math.floor(obj.val).toLocaleString();
        }
      }
    });
  });

  // 7. Timeline Item Parallax & Stagger
  const timelineItems = document.querySelectorAll('.timeline-item');
  timelineItems.forEach((item, index) => {
    gsap.from(item, {
      opacity: 0,
      x: -40,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: item,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  });

  // Parallax layer differential movement
  gsap.to('.layer-1', {
    y: -120,
    scrollTrigger: {
      trigger: '#timeline',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true
    }
  });

  gsap.to('.layer-2', {
    y: 120,
    scrollTrigger: {
      trigger: '#timeline',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true
    }
  });

  // 8. Terminal Telemetry Form Handler
  const form = document.getElementById('telemetry-form');
  const output = document.getElementById('terminal-output');
  const status = document.getElementById('transmission-status');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (output) output.classList.remove('hidden');

      const commander = document.getElementById('commander-name').value;
      
      if (status) {
        status.innerHTML = `> TRANSMISSION EN ROUTE... COMMANDER ${commander.toUpperCase()} ACKNOWLEDGED`;
        
        setTimeout(() => {
          status.innerHTML = `> STATUS: <span class="text-emerald-400 font-bold">200 OK // PAYLOAD VERIFIED BY NASA JPL DEEP SPACE NETWORK</span>`;
        }, 1800);
      }
    });
  }
});
