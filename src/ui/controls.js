/**
 * UI controller — speed buttons, planet buttons, info panel, reset, sim clock.
 */

import * as THREE from 'three';
import { BODY_INFO } from '../data/planets.js';

// ── State ──
export let speedMultiplier = 1.0;
export let speedMode = 'artistic'; // 'artistic' | 'realtime'

export function setSpeedMultiplier(v) { speedMultiplier = v; }
export function setSpeedMode(m) { speedMode = m; }

/**
 * Wire up all UI event listeners.
 * @param {Object} deps — { focusBodyFn, resetCameraFn }
 */
export function setupUI({ focusBodyFn, resetCameraFn }) {
  // Speed buttons
  document.querySelectorAll('[data-speed]').forEach((btn) => {
    btn.addEventListener('click', () => {
      speedMode = 'artistic';
      speedMultiplier = parseFloat(btn.dataset.speed);
      document.querySelectorAll('[data-speed]').forEach((b) => b.classList.remove('active'));
      document.getElementById('btn-realtime')?.classList.remove('active');
      btn.classList.add('active');
    });
  });

  // Real-time button
  const rtBtn = document.getElementById('btn-realtime');
  if (rtBtn) {
    rtBtn.addEventListener('click', () => {
      speedMode = 'realtime';
      speedMultiplier = 1;
      document.querySelectorAll('[data-speed]').forEach((b) => b.classList.remove('active'));
      rtBtn.classList.add('active');
    });
  }

  // Planet focus buttons
  document.querySelectorAll('[data-planet]').forEach((btn) => {
    btn.addEventListener('click', () => {
      focusBodyFn(btn.dataset.planet);
    });
  });

  // Reset
  document.getElementById('btn-reset')?.addEventListener('click', resetCameraFn);
}

// ============================================================================
// INFO PANEL
// ============================================================================
export function showInfoPanel(name, color, unlockFn) {
  const info = BODY_INFO[name];
  if (!info) return;

  const panel = document.getElementById('info-panel');
  const c = new THREE.Color(color || 0xffffff);
  const hex = '#' + c.getHexString();

  const rows = [
    ['Type', info.type],
    ['Diameter', info.diameter],
    ['Mass', info.mass],
    ['Distance from Sun', info.distanceFromSun],
    ['Orbital Period', info.orbitalPeriod],
    ['Day Length', info.dayLength],
    ['Surface Temp', info.surfaceTemp],
    ['Moons', info.moons],
  ].filter(([, v]) => v && v !== '—' || name === 'Sun');

  panel.innerHTML = `
    <div class="ip-header">
      <span class="ip-dot" style="background:${hex}"></span>
      <h2>${name}</h2>
      <button class="ip-close" id="ip-close-btn" title="Close">✕</button>
    </div>
    <div class="ip-type">${info.type}</div>
    <div class="ip-facts">
      ${rows.map(([k, v]) => `
        <div class="ip-row">
          <span class="ip-key">${k}</span>
          <span class="ip-val">${v}</span>
        </div>`).join('')}
    </div>
    <div class="ip-fact">
      <span class="ip-fact-icon">💡</span>
      <p>${info.fact}</p>
    </div>
  `;
  panel.classList.add('visible');

  document.getElementById('ip-close-btn').addEventListener('click', () => {
    hideInfoPanel();
    if (unlockFn) unlockFn();
  });
}

export function hideInfoPanel() {
  document.getElementById('info-panel')?.classList.remove('visible');
}

// ============================================================================
// SIMULATION CLOCK
// ============================================================================
export function updateSimClock(simDate) {
  const el = document.getElementById('sim-time');
  if (!el) return;

  if (speedMode === 'artistic' && speedMultiplier === 0) {
    el.textContent = 'Paused';
    return;
  }

  const opts = { year: 'numeric', month: 'short', day: 'numeric' };
  const dateStr = simDate.toLocaleDateString('en-US', opts);

  if (speedMode === 'realtime') {
    el.textContent = `${dateStr}  ⏱ Real-time`;
  } else {
    el.textContent = dateStr;
  }
}
