/**
 * Sound Manager — procedural space audio using Web Audio API
 *
 * Ambient drone + click/whoosh sfx. No external audio files needed.
 * User must interact (click) before audio can play (browser policy).
 */

let audioCtx = null;
let masterGain = null;
let ambientPlaying = false;
let muted = false;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// ── Ambient drone — deep space hum ──
export function startAmbient() {
  if (ambientPlaying || muted) return;
  const ctx = getCtx();

  // Low oscillator
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 55; // low A
  const g1 = ctx.createGain();
  g1.gain.value = 0.06;

  // Sub bass
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 82.4; // low E
  const g2 = ctx.createGain();
  g2.gain.value = 0.03;

  // Gentle shimmer
  const osc3 = ctx.createOscillator();
  osc3.type = 'triangle';
  osc3.frequency.value = 220;
  const g3 = ctx.createGain();
  g3.gain.value = 0.008;

  // LFO for gentle movement
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 3;
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);
  lfoGain.connect(osc3.frequency);

  // Filter for warmth
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;
  filter.Q.value = 1;

  osc1.connect(g1).connect(filter);
  osc2.connect(g2).connect(filter);
  osc3.connect(g3).connect(filter);
  filter.connect(masterGain);

  osc1.start();
  osc2.start();
  osc3.start();
  lfo.start();

  ambientPlaying = true;
}

// ── Click sound — soft metallic ping ──
export function playClick() {
  if (muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.12, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  osc.connect(g).connect(masterGain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

// ── Whoosh — camera transition sound ──
export function playWhoosh() {
  if (muted) return;
  const ctx = getCtx();
  const duration = 0.5;

  // Noise-like whoosh via fast frequency sweep
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(600, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + duration);
  filter.Q.value = 2;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.08, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(filter).connect(g).connect(masterGain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

// ── Hover beep — very subtle ──
export function playHover() {
  if (muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 600;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.03, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  osc.connect(g).connect(masterGain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

// ── Toggle mute ──
export function toggleMute() {
  muted = !muted;
  if (masterGain) {
    masterGain.gain.value = muted ? 0 : 0.3;
  }
  return muted;
}

export function isMuted() { return muted; }
