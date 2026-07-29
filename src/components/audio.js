/**
 * Web Audio API Space Atmosphere Synthesizer & UI Click Generator
 * Creates deep cosmic low-frequency rumble, binaural resonance, and technical clicks.
 */
let audioCtx = null;
let isAudioActive = false;
let masterGain = null;
let osc1 = null;
let osc2 = null;

export function initSpaceAudio() {
  const audioBtn = document.getElementById('audio-toggle');
  const iconOff = document.getElementById('audio-icon-off');
  const iconOn = document.getElementById('audio-icon-on');
  const label = document.getElementById('audio-label');

  if (!audioBtn) return;

  function toggleAudio() {
    if (!audioCtx) {
      // Initialize Web Audio Context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      // Master Gain
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.15; // Low ambient level
      masterGain.connect(audioCtx.destination);

      // Low frequency sub-drone (45 Hz pitch)
      osc1 = audioCtx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(45, audioCtx.currentTime);

      // Secondary binaural harmonic (47 Hz creates 2 Hz beating cosmic drone)
      osc2 = audioCtx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(47.5, audioCtx.currentTime);

      // Lowpass filter to muffle cosmic drone
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, audioCtx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(masterGain);

      osc1.start();
      osc2.start();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    isAudioActive = !isAudioActive;

    if (isAudioActive) {
      masterGain.gain.setTargetAtTime(0.2, audioCtx.currentTime, 0.1);
      if (iconOff) iconOff.classList.add('hidden');
      if (iconOn) iconOn.classList.remove('hidden');
      if (label) label.textContent = 'AUDIO [ON]';
      playBeep(880, 0.05); // UI confirm beep
    } else {
      masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
      if (iconOff) iconOff.classList.remove('hidden');
      if (iconOn) iconOn.classList.add('hidden');
      if (label) label.textContent = 'AUDIO [OFF]';
    }
  }

  audioBtn.addEventListener('click', toggleAudio);

  // Play short technical UI click sound
  function playBeep(freq = 600, duration = 0.03) {
    if (!audioCtx || !isAudioActive) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Ignore audio glitches
    }
  }

  // Bind clicks to buttons
  document.querySelectorAll('button, a, input[type="submit"]').forEach((btn) => {
    btn.addEventListener('click', () => playBeep(920, 0.04));
    btn.addEventListener('mouseenter', () => playBeep(450, 0.02));
  });
}
