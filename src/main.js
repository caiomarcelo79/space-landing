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
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 2,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  // 2. Initialize Interactive HUD Modules
  initHudCursor();
  initSpaceAudio();
  initWarpStarfield();
  initGravityCanvas();

  // 3. UTC Live Clock Ticker
  const utcClock = document.getElementById('hud-utc-clock');
  function updateClock() {
    if (!utcClock) return;
    const now = new Date();
    const hrs = String(now.getUTCHours()).padStart(2, '0');
    const mins = String(now.getUTCMinutes()).padStart(2, '0');
    const secs = String(now.getUTCSeconds()).padStart(2, '0');
    const ms = String(Math.floor(now.getUTCMilliseconds() / 10)).padStart(2, '0');
    utcClock.textContent = `${hrs}:${mins}:${secs}.${ms}`;
  }
  setInterval(updateClock, 40);

  // 4. DEFINITIVE SOLUTION: Optimized Canvas & Video Scroll-Scrubbing Engine
  const video = document.getElementById('space-hero-video');
  const canvas = document.getElementById('hero-video-canvas');

  if (video && canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });

    // Resize canvas to match screen resolution and video aspect ratio
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawCurrentFrame();
    };
    window.addEventListener('resize', resizeCanvas);

    video.pause();

    let targetVideoTime = 0;
    let currentVideoTime = 0;
    let isSeeking = false;
    let pendingSeek = false;

    // Offscreen Frame Buffer for Fast Scroll Fallback (Pre-decoded RAM Cache)
    const NUM_CACHED_FRAMES = 80;
    const frameCache = new Array(NUM_CACHED_FRAMES);

    // Draw current frame (either live video or cached ImageBitmap) onto Canvas
    function drawCurrentFrame() {
      if (!canvas.width || !canvas.height) return;

      const duration = video.duration || 10;
      const progress = Math.min(Math.max(currentVideoTime / duration, 0), 1);
      const cacheIdx = Math.min(Math.floor(progress * NUM_CACHED_FRAMES), NUM_CACHED_FRAMES - 1);

      // Determine active media source (prefer cached ImageBitmap when seeking)
      const cachedBmp = frameCache[cacheIdx];
      const media = (isSeeking && cachedBmp) ? cachedBmp : (video.readyState >= 2 ? video : cachedBmp);
      if (!media) return;

      // Extract native dimensions
      const mediaW = media.width || video.videoWidth || 1280;
      const mediaH = media.height || video.videoHeight || 720;

      const vRatio = mediaW / mediaH;
      const cRatio = canvas.width / canvas.height;
      let dw = canvas.width;
      let dh = canvas.height;
      let dx = 0;
      let dy = 0;

      if (cRatio > vRatio) {
        dh = canvas.width / vRatio;
        dy = (canvas.height - dh) / 2;
      } else {
        dw = canvas.height * vRatio;
        dx = (canvas.width - dw) / 2;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(media, dx, dy, dw, dh);

      // Cache frame to RAM asynchronously for future fast scrolls
      if (!frameCache[cacheIdx] && video.readyState >= 2 && window.createImageBitmap) {
        createImageBitmap(video).then((bmp) => {
          frameCache[cacheIdx] = bmp;
        }).catch(() => {});
      }
    }

    // Video frame callback for zero-latency frame drawing when browser presents frame
    const registerVideoFrameCallback = () => {
      if ('requestVideoFrameCallback' in video) {
        video.requestVideoFrameCallback(() => {
          drawCurrentFrame();
          registerVideoFrameCallback();
        });
      }
    };

    video.addEventListener('seeking', () => { 
      isSeeking = true; 
      drawCurrentFrame();
    });
    video.addEventListener('seeked', () => { 
      isSeeking = false; 
      drawCurrentFrame();
      if (pendingSeek) {
        pendingSeek = false;
        requestSeek();
      }
    });
    video.addEventListener('timeupdate', drawCurrentFrame);

    function requestSeek() {
      if (video.duration && !video.seeking) {
        if ('fastSeek' in video) {
          video.fastSeek(currentVideoTime);
        } else {
          video.currentTime = currentVideoTime;
        }
      } else {
        pendingSeek = true;
      }
    }

    let initializedScrubbing = false;

    const setupVideoScrubbing = () => {
      if (initializedScrubbing) return;
      initializedScrubbing = true;

      resizeCanvas();
      registerVideoFrameCallback();

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

          // Update HUD gauge & distance
          const pct = Math.round(self.progress * 100);
          const scrollBar = document.getElementById('hud-scroll-bar');
          const scrollPct = document.getElementById('hud-scroll-pct');
          const distReadout = document.getElementById('hud-distance-readout');

          if (scrollBar) scrollBar.style.height = `${pct}%`;
          if (scrollPct) scrollPct.textContent = `${pct}%`;
          if (distReadout) {
            const dist = (self.progress * 14.85).toFixed(2);
            distReadout.textContent = `${dist} AU`;
          }
        }
      });

      // Smooth RAF Lerp loop with debounced frame seeking
      let lastSeekTime = 0;
      function smoothVideoLoop() {
        if (video.duration) {
          const delta = targetVideoTime - currentVideoTime;

          if (Math.abs(delta) > 0.001) {
            const lerpFactor = Math.abs(delta) > 1.2 ? 0.35 : 0.25;
            currentVideoTime += delta * lerpFactor;

            const now = performance.now();
            // Throttle seeks to at most once per 16ms to avoid seek thrashing
            if (now - lastSeekTime > 16 && Math.abs(currentVideoTime - video.currentTime) > 0.01) {
              lastSeekTime = now;
              requestSeek();
            }
          }
          drawCurrentFrame();
        }
        requestAnimationFrame(smoothVideoLoop);
      }
      requestAnimationFrame(smoothVideoLoop);

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
  const splitHeading = document.getElementById('split-text-heading');
  if (splitHeading) {
    const text = splitHeading.innerText;
    splitHeading.innerHTML = text
      .split(' ')
      .map((word) => `<span class="word-reveal-span">${word}</span>`)
      .join(' ');

    gsap.to('#split-text-heading .word-reveal-span', {
      scrollTrigger: {
        trigger: '#split-text-heading',
        start: 'top 80%',
        end: 'bottom 40%',
        scrub: 0.8
      },
      className: 'word-reveal-span active',
      stagger: 0.1
    });
  }

  // Reveal paragraph text
  const paragraphs = document.querySelectorAll('.reveal-paragraph');
  paragraphs.forEach((p) => {
    const words = p.innerText.split(' ');
    p.innerHTML = words.map((w) => `<span class="word-reveal-span">${w}</span>`).join(' ');

    gsap.to(p.querySelectorAll('.word-reveal-span'), {
      scrollTrigger: {
        trigger: p,
        start: 'top 85%',
        end: 'bottom 45%',
        scrub: 0.8
      },
      className: 'word-reveal-span active',
      stagger: 0.05
    });
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
