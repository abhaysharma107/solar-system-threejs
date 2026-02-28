/**
 * Solar System — Main entry point
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
} from './objects/factories.js';
import {
  smoothCameraTo, updateCamera, DEFAULT_CAM_POS, DEFAULT_CAM_TARGET,
} from './camera/cameraManager.js';
import {
  setupUI, showInfoPanel, hideInfoPanel, updateSimClock,
  speedMultiplier, speedMode,
} from './ui/controls.js';

// ============================================================================
// GLOBALS
// ============================================================================
let scene, camera, renderer, controls, clock;
let sunObj;          // { mesh, glow }
let sunLight;
let planetObjects = []; // { orbitPivot, mesh, data, label, moons[] }
let asteroidBelt;
let lockedTarget = null;

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

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000008);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
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
  sunLight = new THREE.PointLight(0xffffff, 2.5, 500, 0.5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x222233, 0.3));

  // Build solar system
  createStarField(scene);
  sunObj = createSun(scene);
  PLANETS.forEach((data) => {
    planetObjects.push(createPlanet(scene, data));
  });
  asteroidBelt = createAsteroidBelt(scene);

  // Set real initial positions from ephemeris
  applyEphemeris(new Date());

  // UI
  setupUI({ focusBodyFn: focusBodyByName, resetCameraFn: resetCamera, setSimDateFn: setSimDate });

  // Click
  renderer.domElement.addEventListener('click', onCanvasClick);
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
    const pos = positions.get(p.data.name);
    if (pos) {
      // Map ecliptic angle → orbit pivot rotation.
      // In Three.js Y-up, rotation.y is around the Y axis (top-down = ecliptic)
      // JPL angle is counter-clockwise in ecliptic, Three.js rotation.y is CW from +X toward -Z,
      // so we negate.
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
    if (info) focusBodyByName(info.name);
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

// ============================================================================
// FOCUS / RESET
// ============================================================================
function focusBodyByName(name) {
  let mesh, radius, color;

  if (name === 'Sun') {
    mesh = sunObj.mesh;
    radius = 4;
    color = 0xffdd44;
  } else {
    const p = planetObjects.find((p) => p.data.name === name);
    if (!p) return;
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

// ============================================================================
// ANIMATION LOOP
// ============================================================================
function animate() {
  const delta = clock.getDelta(); // seconds since last frame

  // Advance simulated date
  if (speedMode === 'realtime') {
    // Real-time: 1 real second = 1 second of actual planetary motion
    // We just advance the sim-date by `delta` seconds
    simDate = new Date(simDate.getTime() + delta * 1000);
  } else {
    // Artistic: 1× → 100 Earth-days per real second (same old behaviour)
    const daysPerSec = speedMultiplier * 100;
    simDate = new Date(simDate.getTime() + delta * daysPerSec * 86400000);
  }

  // Recompute planet angles from ephemeris
  applyEphemeris(simDate);

  // Axial rotation (visual only, independent of ephemeris)
  planetObjects.forEach((p) => {
    if (speedMode === 'realtime') {
      p.mesh.rotation.y += p.data.rotationSpeed * delta * 60;
    } else {
      p.mesh.rotation.y += p.data.rotationSpeed * speedMultiplier * delta * 60;
    }
    // Moons — angular velocity = 2π / orbitalPeriod (rad per day)
    p.moons.forEach((m) => {
      const radPerDay = (2 * Math.PI) / m.data.orbitalPeriod;
      if (speedMode === 'realtime') {
        // 1 real sec = 1 sim sec = 1/86400 day
        m.pivot.rotation.y += radPerDay * (delta / 86400);
      } else {
        // Artistic: speedMultiplier * 100 sim-days per real sec
        m.pivot.rotation.y += radPerDay * speedMultiplier * 100 * delta;
      }
    });
  });

  // Sun
  sunObj.mesh.rotation.y += 0.1 * delta;
  const pulse = 1 + Math.sin(clock.elapsedTime * 2) * 0.05;
  sunObj.glow.scale.set(20 * pulse, 20 * pulse, 1);
  sunLight.intensity = 2.5 + Math.sin(clock.elapsedTime * 3) * 0.2;

  // Asteroid belt slow rotation
  if (asteroidBelt) {
    asteroidBelt.rotation.y += 0.02 * delta * (speedMode === 'realtime' ? 1 : speedMultiplier);
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
