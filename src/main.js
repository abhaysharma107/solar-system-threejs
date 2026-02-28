/**
 * Abhay's System — Main entry point
 *
 * Ties together: scene, camera, planets, ephemeris, UI.
 * Planet positions are synced to the current real-world date/time using
 * NASA JPL Keplerian orbital elements, then advanced by the chosen speed.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { PLANETS } from './data/planets.js';
import { getAllPositions } from './physics/ephemeris.js';
import {
  createStarField, createSun, createPlanet, createAsteroidBelt, clickableMeshes,
  orbitLines, createMilkyWay, createNavHint, loadingManager,
} from './objects/factories.js';
import {
  smoothCameraTo, updateCamera, DEFAULT_CAM_POS, DEFAULT_CAM_TARGET,
} from './camera/cameraManager.js';
import {
  setupUI, showInfoPanel, hideInfoPanel, updateSimClock,
  speedMultiplier, speedMode,
} from './ui/controls.js';
import { startAmbient, playClick, playWhoosh, toggleMute, isMuted } from './audio/soundManager.js';

// ============================================================================
// GLOBALS
// ============================================================================
let scene, camera, renderer, controls, clock;
let sunObj;          // { mesh, glow }
let sunLight;
let planetObjects = []; // { orbitPivot, mesh, data, label, moons[] }
let asteroidBelt;
let lockedTarget = null;
let navHint = null;
let navHintVisible = true;

// Simulation date — starts at NOW, advanced by speed each frame
let simDate = new Date();

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ============================================================================
// INIT
// ============================================================================
init();

function init() {
  clock = new THREE.Clock();

  // ── Loading screen hooks ──
  const loadingBar = document.getElementById('loading-bar');
  const loadingText = document.getElementById('loading-text');
  const loadingScreen = document.getElementById('loading-screen');

  loadingManager.onProgress = (_url, loaded, total) => {
    const pct = Math.round((loaded / total) * 100);
    if (loadingBar) loadingBar.style.width = pct + '%';
    if (loadingText) loadingText.textContent = `Loading textures… ${pct}%`;
  };
  loadingManager.onLoad = () => {
    if (loadingScreen) {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => { loadingScreen.remove(); }, 1400);
    }
  };

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000008);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // Camera
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.copy(DEFAULT_CAM_POS);
  camera.lookAt(0, 0, 0);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 500;
  controls.enablePan = true;

  // Lights
  sunLight = new THREE.PointLight(0xffffff, 3.0, 500, 0.5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x333344, 0.6));
  scene.add(new THREE.HemisphereLight(0x4466aa, 0x222211, 0.3));

  // Build solar system
  createMilkyWay(scene);
  createStarField(scene);
  sunObj = createSun(scene);
  PLANETS.forEach((data) => {
    planetObjects.push(createPlanet(scene, data));
  });
  asteroidBelt = createAsteroidBelt(scene);
  navHint = createNavHint(scene);

  // Set real initial positions from ephemeris
  applyEphemeris(new Date());

  // Set initial angles for social link planets (no ephemeris)
  planetObjects.forEach((p) => {
    if (p.data.isSocialLink && p.data.startAngle !== undefined) {
      p.orbitPivot.rotation.y = p.data.startAngle;
    }
  });

  // UI
  setupUI({ focusBodyFn: focusBodyByName, resetCameraFn: resetCamera, setSimDateFn: setSimDate, toggleOrbitsFn: toggleOrbits });

  // Sound mute button
  const muteBtn = document.getElementById('btn-mute');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const muted = toggleMute();
      muteBtn.textContent = muted ? '🔇 Sound' : '🔊 Sound';
      muteBtn.classList.toggle('active', !muted);
    });
  }

  // Click
  renderer.domElement.addEventListener('click', onCanvasClick);
  renderer.domElement.addEventListener('mousemove', onCanvasHover);
  initDragGuard();

  // Resize
  window.addEventListener('resize', onWindowResize);
}

// ============================================================================
// EPHEMERIS → SCENE
// ============================================================================
function applyEphemeris(date) {
  const positions = getAllPositions(date);
  planetObjects.forEach((p) => {
    // Social link planets don't use ephemeris — they orbit at a slow constant speed
    if (p.data.isSocialLink) return;
    const pos = positions.get(p.data.ephemerisName || p.data.name);
    if (pos) {
      p.orbitPivot.rotation.y = -pos.angle;
    }
  });
}

// ============================================================================
// CLICK → FOCUS
// ============================================================================
function onCanvasClick(event) {
  if (renderer.domElement._wasDragging) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObjects(Array.from(clickableMeshes.keys()), false);

  if (hits.length > 0) {
    const info = clickableMeshes.get(hits[0].object);
    if (info) {
      startAmbient(); // ensure audio starts on any first interaction
      // Social link planets open URL in new tab
      if (info.url) {
        playClick();
        window.open(info.url, '_blank', 'noopener,noreferrer');
        return;
      }
      playWhoosh();
      focusBodyByName(info.name);
      fadeNavHint();
    }
  } else {
    // Click on empty space also starts ambient audio
    startAmbient();
  }
}

function initDragGuard() {
  let down = { x: 0, y: 0 };
  document.addEventListener('mousedown', (e) => {
    down = { x: e.clientX, y: e.clientY };
    renderer.domElement._wasDragging = false;
  });
  document.addEventListener('mouseup', (e) => {
    const d = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    renderer.domElement._wasDragging = d > 5;
  });
}

const _hoverMouse = new THREE.Vector2();
function onCanvasHover(event) {
  _hoverMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  _hoverMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(_hoverMouse, camera);
  const planetHits = raycaster.intersectObjects(Array.from(clickableMeshes.keys()), false);
  renderer.domElement.style.cursor = planetHits.length > 0 ? 'pointer' : '';
}

// ============================================================================
// FOCUS / RESET
// ============================================================================
function focusBodyByName(name) {
  let mesh, radius, color;

  if (name === 'Abhay Sharma') {
    mesh = sunObj.mesh;
    radius = 4;
    color = 0xffdd44;
  } else {
    const p = planetObjects.find((p) => p.data.name === name);
    if (!p) return;
    // Social link planets — open their URL directly
    if (p.data.isSocialLink && p.data.url) {
      window.open(p.data.url, '_blank', 'noopener,noreferrer');
      return;
    }
    mesh = p.mesh;
    radius = p.data.radius;
    color = p.data.color;
  }

  const worldPos = new THREE.Vector3();
  mesh.getWorldPosition(worldPos);
  const zoomDist = radius * 7 + 5;

  lockedTarget = mesh;
  smoothCameraTo(mesh, worldPos, zoomDist, camera, controls);
  showInfoPanel(name, color, () => { lockedTarget = null; });
}

function resetCamera() {
  lockedTarget = null;
  smoothCameraTo(null, DEFAULT_CAM_TARGET, 0, camera, controls, DEFAULT_CAM_POS.clone());
  hideInfoPanel();
}

function setSimDate(date) {
  simDate = new Date(date.getTime());
  applyEphemeris(simDate);
}

function toggleOrbits() {
  const visible = orbitLines.length > 0 ? !orbitLines[0].visible : false;
  orbitLines.forEach((line) => { line.visible = visible; });
  return visible;
}

// ============================================================================
// ANIMATION LOOP
// ============================================================================
function animate() {
  const delta = clock.getDelta(); // seconds since last frame

  // Advance simulated date
  if (speedMode === 'realtime') {
    // Real-time: 1 real second = 1 second of actual planetary motion
    simDate = new Date(simDate.getTime() + delta * 1000);
  } else {
    // Artistic: 1× → 2 Earth-days per real second (gentle drift)
    const daysPerSec = speedMultiplier * 2;
    simDate = new Date(simDate.getTime() + delta * daysPerSec * 86400000);
  }

  // Recompute planet angles from ephemeris
  applyEphemeris(simDate);

  // Axial rotation (visual only, independent of ephemeris)
  // rotationPeriod is in Earth days; angular vel = 2π / |period| rad/day
  planetObjects.forEach((p) => {
    const period = p.data.rotationPeriod || 1;
    const radPerDay = (2 * Math.PI) / Math.abs(period);
    const sign = period < 0 ? -1 : 1;
    if (speedMode === 'realtime') {
      p.mesh.rotation.y += sign * radPerDay * (delta / 86400);
    } else {
      // Artistic: speedMultiplier * 2 sim-days per real sec
      p.mesh.rotation.y += sign * radPerDay * speedMultiplier * 2 * delta;
    }
    // Moons — angular velocity = 2π / orbitalPeriod (rad per day)
    p.moons.forEach((m) => {
      const moonRadPerDay = (2 * Math.PI) / m.data.orbitalPeriod;
      if (speedMode === 'realtime') {
        m.pivot.rotation.y += moonRadPerDay * (delta / 86400);
      } else {
        m.pivot.rotation.y += moonRadPerDay * speedMultiplier * 2 * delta;
      }
    });
  });

  // Social link planets — gentle constant orbit (no ephemeris)
  planetObjects.forEach((p) => {
    if (!p.data.isSocialLink) return;
    const orbitSpeed = (2 * Math.PI) / p.data.orbitalPeriod;
    p.orbitPivot.rotation.y += orbitSpeed * delta * 60;
    p.mesh.rotation.y += 0.015 * delta;
  });

  // Sun
  sunObj.mesh.rotation.y += 0.02 * delta;
  const pulse = 1 + Math.sin(clock.elapsedTime * 2) * 0.05;
  sunObj.glow.scale.set(28 * pulse, 28 * pulse, 1);
  sunLight.intensity = 3.0 + Math.sin(clock.elapsedTime * 3) * 0.3;

  // Asteroid belt slow rotation
  if (asteroidBelt) {
    asteroidBelt.rotation.y += 0.02 * delta * (speedMode === 'realtime' ? 1 : speedMultiplier * 0.5);
  }

  // Nav hint pulsing rings
  if (navHint && navHintVisible) {
    const t = clock.elapsedTime;
    const p1 = 0.2 + Math.sin(t * 1.5) * 0.15;
    const p2 = 0.12 + Math.sin(t * 1.2 + 1) * 0.08;
    navHint.ring.material.opacity = p1;
    navHint.ring2.material.opacity = p2;
    navHint.ring.scale.setScalar(1 + Math.sin(t * 0.8) * 0.05);
    navHint.ring2.scale.setScalar(1 + Math.sin(t * 0.6 + 2) * 0.04);
  }

  // Camera
  updateCamera(camera, controls, lockedTarget);
  controls.update();

  // UI clock
  updateSimClock(simDate);

  renderer.render(scene, camera);
}

// ============================================================================
// RESIZE
// ============================================================================
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function fadeNavHint() {
  if (!navHintVisible || !navHint) return;
  navHintVisible = false;
  // Quick fade out
  const start = performance.now();
  const dur = 1200;
  function tick() {
    const p = Math.min(1, (performance.now() - start) / dur);
    const op = 1 - p;
    navHint.ring.material.opacity = 0.35 * op;
    navHint.ring2.material.opacity = 0.2 * op;
    if (p < 1) requestAnimationFrame(tick);
    else {
      navHint.ring.visible = false;
      navHint.ring2.visible = false;
    }
  }
  tick();
}
