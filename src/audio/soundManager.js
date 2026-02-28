/**
 * Sound Manager — immersive space audio using Web Audio API
 *
 * Ambient: layered filtered noise + slow evolving pads (true space atmosphere)
 * SFX: noise-based click, filtered noise whoosh — no cheesy oscillator pings
 */

let audioCtx = null;
let masterGain = null;
let ambientPlaying = false;
let muted = false;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Create a noise buffer (white noise source)
function createNoiseBuffer(ctx, seconds) {
  const sr = ctx.sampleRate;
  const len = sr * seconds;
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return buf;
}

// Create a simple impulse response for reverb
function createReverbIR(ctx, duration, decay) {
  const sr = ctx.sampleRate;
  const len = sr * duration;
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

// ── Ambient — layered filtered noise + sub-bass drone ──
export function startAmbient() {
  if (ambientPlaying || muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;

  // Shared reverb for depth
  const reverb = ctx.createConvolver();
  reverb.buffer = createReverbIR(ctx, 4, 2.5);
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.4;
  reverb.connect(reverbGain).connect(masterGain);

  // ── Layer 1: deep filtered noise — the "space wind" ──
  const noiseBuf = createNoiseBuffer(ctx, 4);

  const noise1 = ctx.createBufferSource();
  noise1.buffer = noiseBuf;
  noise1.loop = true;
  const lp1 = ctx.createBiquadFilter();
  lp1.type = 'lowpass';
  lp1.frequency.value = 180;
  lp1.Q.value = 0.5;
  const hp1 = ctx.createBiquadFilter();
  hp1.type = 'highpass';
  hp1.frequency.value = 30;
  hp1.Q.value = 0.3;
  const g1 = ctx.createGain();
  g1.gain.value = 0;
  g1.gain.linearRampToValueAtTime(0.18, t + 5); // slow fade-in
  noise1.connect(lp1).connect(hp1).connect(g1);
  g1.connect(masterGain);
  g1.connect(reverb);

  // LFO to slowly sweep the filter — evolving texture
  const lfo1 = ctx.createOscillator();
  lfo1.type = 'sine';
  lfo1.frequency.value = 0.03; // very slow
  const lfo1Gain = ctx.createGain();
  lfo1Gain.gain.value = 60;
  lfo1.connect(lfo1Gain).connect(lp1.frequency);

  // ── Layer 2: higher filtered noise — distant cosmic shimmer ──
  const noise2 = ctx.createBufferSource();
  noise2.buffer = noiseBuf;
  noise2.loop = true;
  const bp2 = ctx.createBiquadFilter();
  bp2.type = 'bandpass';
  bp2.frequency.value = 800;
  bp2.Q.value = 0.3;
  const g2 = ctx.createGain();
  g2.gain.value = 0;
  g2.gain.linearRampToValueAtTime(0.04, t + 8);
  noise2.connect(bp2).connect(g2);
  g2.connect(reverb);

  // Slow LFO modulating the band center
  const lfo2 = ctx.createOscillator();
  lfo2.type = 'sine';
  lfo2.frequency.value = 0.015;
  const lfo2Gain = ctx.createGain();
  lfo2Gain.gain.value = 300;
  lfo2.connect(lfo2Gain).connect(bp2.frequency);

  // ── Layer 3: very deep sub-bass pad — felt more than heard ──
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 38;
  const subGain = ctx.createGain();
  subGain.gain.value = 0;
  subGain.gain.linearRampToValueAtTime(0.12, t + 6);
  sub.connect(subGain).connect(masterGain);

  // Sub modulation
  const subLfo = ctx.createOscillator();
  subLfo.type = 'sine';
  subLfo.frequency.value = 0.05;
  const subLfoGain = ctx.createGain();
  subLfoGain.gain.value = 2;
  subLfo.connect(subLfoGain).connect(sub.frequency);

  // ── Layer 4: very faint tonal pad — adds warmth ──
  const pad = ctx.createOscillator();
  pad.type = 'sine';
  pad.frequency.value = 110;
  const pad2 = ctx.createOscillator();
  pad2.type = 'sine';
  pad2.frequency.value = 110.8; // slight detune for chorus
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 200;
  padFilter.Q.value = 0.5;
  const padGain = ctx.createGain();
  padGain.gain.value = 0;
  padGain.gain.linearRampToValueAtTime(0.035, t + 10);
  pad.connect(padGain);
  pad2.connect(padGain);
  padGain.connect(padFilter).connect(reverb);

  // Start everything
  noise1.start();
  noise2.start();
  lfo1.start();
  lfo2.start();
  sub.start();
  subLfo.start();
  pad.start();
  pad2.start();

  ambientPlaying = true;
}

// ── Click — soft filtered noise tick (no pitched oscillators) ──
export function playClick() {
  if (muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  const dur = 0.06;

  // Short burst of filtered noise — sounds like a subtle digital tick
  const sr = ctx.sampleRate;
  const len = Math.ceil(sr * dur);
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    // Shaped noise: sharp attack, fast decay
    const env = Math.exp(-i / (sr * 0.012));
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;

  // Bandpass to give it a soft "tick" character
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3500;
  bp.Q.value = 1.2;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);

  src.connect(bp).connect(g).connect(masterGain);
  src.start(t);
}

// ── Whoosh — filtered noise sweep for camera transitions ──
export function playWhoosh() {
  if (muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  const dur = 0.6;

  // Noise source
  const sr = ctx.sampleRate;
  const len = Math.ceil(sr * dur);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = Math.random() * 2 - 1;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  // Sweeping bandpass — gives the "whoosh" movement
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1200, t);
  bp.frequency.exponentialRampToValueAtTime(200, t + dur);
  bp.Q.value = 0.8;

  // Gentle lowpass to remove harshness
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3000;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.2, t + 0.08); // quick fade-in
  g.gain.setValueAtTime(0.2, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);

  src.connect(bp).connect(lp).connect(g).connect(masterGain);
  src.start(t);
}

// ── Hover — very faint soft noise tap ──
export function playHover() {
  if (muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  const dur = 0.04;

  const sr = ctx.sampleRate;
  const len = Math.ceil(sr * dur);
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.008));
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2000;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);

  src.connect(lp).connect(g).connect(masterGain);
  src.start(t);
}

// ── Toggle mute ──
export function toggleMute() {
  muted = !muted;
  if (masterGain) {
    masterGain.gain.value = muted ? 0 : 0.5;
  }
  return muted;
}

export function isMuted() { return muted; }
