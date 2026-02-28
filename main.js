/**
 * Three.js Solar System Visualization
 *
 * A fully interactive 3D solar system with all 8 planets, Pluto, Earth's Moon,
 * Saturn's rings, asteroid belt, orbit paths, star field, and planet labels.
 *
 * Inspired by:
 * - Official Three.js scenegraph-sun-earth-moon example (mrdoob/three.js)
 * - sanderblue/solar-system-threejs (398★ on GitHub)
 * - NASA Solar System data for accurate relative proportions
 *
 * Architecture: Scene graph hierarchy using THREE.Object3D nodes as orbit pivots.
 * Each planet is a child of its orbit node, which rotates around the Sun.
 * This mirrors the pattern from the official Three.js manual/examples.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================================
// PLANET DATA — Real NASA data, artistically scaled for visibility
// Distances and sizes use logarithmic/artistic scaling so all planets are visible
// ============================================================================
const PLANETS = [
  {
    name: 'Mercury',
    radius: 0.38,             // Relative to Earth
    distance: 10,             // Artistic orbital distance from Sun
    orbitalPeriod: 88,        // Days (real)
    rotationSpeed: 0.003,     // Artistic rotation speed
    color: 0xb5b5b5,          // Gray
    emissive: 0x111111,
    tilt: 0.034,              // Axial tilt in radians
    orbitColor: 0x555555,
  },
  {
    name: 'Venus',
    radius: 0.95,
    distance: 16,
    orbitalPeriod: 224.7,
    rotationSpeed: -0.002,    // Retrograde rotation
    color: 0xe8cda0,          // Pale yellow
    emissive: 0x221100,
    tilt: 3.096,              // Almost upside down
    orbitColor: 0x665533,
  },
  {
    name: 'Earth',
    radius: 1.0,
    distance: 22,
    orbitalPeriod: 365.25,
    rotationSpeed: 0.01,
    color: 0x2233ff,          // Blue
    emissive: 0x112244,
    tilt: 0.409,              // 23.4°
    orbitColor: 0x3366aa,
    moons: [
      {
        name: 'Moon',
        radius: 0.27,
        distance: 2.5,
        orbitalPeriod: 27.3,
        color: 0xaaaaaa,
      }
    ]
  },
  {
    name: 'Mars',
    radius: 0.53,
    distance: 28,
    orbitalPeriod: 687,
    rotationSpeed: 0.009,
    color: 0xcc4422,          // Red-orange
    emissive: 0x331100,
    tilt: 0.440,              // 25.2°
    orbitColor: 0x884422,
  },
  {
    name: 'Jupiter',
    radius: 2.8,              // Scaled down from 11.2x Earth
    distance: 42,
    orbitalPeriod: 4331,
    rotationSpeed: 0.02,      // Fastest rotation
    color: 0xd4a574,          // Tan/orange bands
    emissive: 0x221100,
    tilt: 0.055,
    orbitColor: 0x886644,
    hasRing: true,
    ringInner: 3.2,
    ringOuter: 4.5,
    ringColor: 0x776655,
    ringOpacity: 0.2,
  },
  {
    name: 'Saturn',
    radius: 2.3,              // Scaled down from 9.4x Earth
    distance: 56,
    orbitalPeriod: 10747,
    rotationSpeed: 0.018,
    color: 0xf4d59c,          // Pale gold
    emissive: 0x332200,
    tilt: 0.467,              // 26.7°
    orbitColor: 0x998866,
    hasRing: true,
    ringInner: 2.8,
    ringOuter: 5.5,
    ringColor: 0xc8a860,
    ringOpacity: 0.6,
  },
  {
    name: 'Uranus',
    radius: 1.6,              // Scaled down from 4x Earth
    distance: 70,
    orbitalPeriod: 30589,
    rotationSpeed: -0.012,    // Retrograde
    color: 0x88ccdd,          // Pale cyan
    emissive: 0x112233,
    tilt: 1.706,              // 97.8° — rolls on its side
    orbitColor: 0x5599aa,
    hasRing: true,
    ringInner: 2.0,
    ringOuter: 3.0,
    ringColor: 0x667788,
    ringOpacity: 0.15,
  },
  {
    name: 'Neptune',
    radius: 1.5,              // Scaled down from 3.9x Earth
    distance: 84,
    orbitalPeriod: 59800,
    rotationSpeed: 0.011,
    color: 0x3344ff,          // Deep blue
    emissive: 0x111144,
    tilt: 0.494,              // 28.3°
    orbitColor: 0x3344aa,
  },
  {
    name: 'Pluto',
    radius: 0.18,
    distance: 96,
    orbitalPeriod: 90570,
    rotationSpeed: -0.004,    // Retrograde
    color: 0xccbb99,          // Tan
    emissive: 0x111100,
    tilt: 2.138,              // 122.5°
    orbitColor: 0x665544,
  },
];

// ============================================================================
// GLOBALS
// ============================================================================
let scene, camera, renderer, controls, clock;
let sunMesh, sunGlow, sunLight;
let planetObjects = [];       // { orbitPivot, mesh, data, label, moons[] }
let asteroidBelt;
let speedMultiplier = 1.0;

// ============================================================================
// INITIALIZATION
// ============================================================================
init();

function init() {
  clock = new THREE.Clock();

  // --- Scene ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000008);

  // --- Renderer ---
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  // --- Camera ---
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(40, 60, 80);
  camera.lookAt(0, 0, 0);

  // --- Controls ---
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 500;
  controls.enablePan = true;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.3;

  // --- Lights ---
  // Sun point light (main illumination)
  sunLight = new THREE.PointLight(0xffffff, 2.5, 500, 0.5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  scene.add(sunLight);

  // Dim ambient so shadowed sides aren't fully black
  const ambient = new THREE.AmbientLight(0x222233, 0.3);
  scene.add(ambient);

  // --- Build the Solar System ---
  createStarField();
  createSun();
  createPlanets();
  createAsteroidBelt();
  setupUI();

  // --- Resize ---
  window.addEventListener('resize', onWindowResize);
}

// ============================================================================
// STAR FIELD — 2000 random stars as point particles
// ============================================================================
function createStarField() {
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    // Random position on a sphere shell (r = 300..600)
    const r = 300 + Math.random() * 300;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Slight color variation (white to pale blue/yellow)
    const temp = 0.7 + Math.random() * 0.3;
    colors[i * 3] = temp;
    colors[i * 3 + 1] = temp;
    colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;

    sizes[i] = 0.5 + Math.random() * 1.5;
  }

  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const starMaterial = new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

// ============================================================================
// SUN — Emissive sphere + glow sprite + point light
// ============================================================================
function createSun() {
  // Sun sphere
  const sunGeometry = new THREE.SphereGeometry(4, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdd44,
  });
  sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  scene.add(sunMesh);

  // Sun glow (additive blending sprite)
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 256;
  glowCanvas.height = 256;
  const ctx = glowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 220, 80, 0.8)');
  gradient.addColorStop(0.3, 'rgba(255, 180, 40, 0.4)');
  gradient.addColorStop(0.6, 'rgba(255, 120, 20, 0.15)');
  gradient.addColorStop(1, 'rgba(255, 80, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  sunGlow = new THREE.Sprite(glowMaterial);
  sunGlow.scale.set(20, 20, 1);
  scene.add(sunGlow);

  // Sun label
  const sunLabel = createLabel('Sun', 0xffdd44);
  sunLabel.position.set(0, 6, 0);
  scene.add(sunLabel);
}

// ============================================================================
// PLANETS — Scene graph with orbit pivots
// ============================================================================
function createPlanets() {
  PLANETS.forEach((data) => {
    // Orbit pivot (rotates around Y axis at origin = Sun)
    const orbitPivot = new THREE.Object3D();
    orbitPivot.name = data.name + '_orbit';
    scene.add(orbitPivot);

    // Random starting orbital position
    orbitPivot.rotation.y = Math.random() * Math.PI * 2;

    // Planet mesh
    const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: data.color,
      emissive: data.emissive || 0x000000,
      shininess: 25,
      specular: 0x222222,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = data.distance;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Apply axial tilt
    if (data.tilt) {
      mesh.rotation.z = data.tilt;
    }

    orbitPivot.add(mesh);

    // Planet label
    const label = createLabel(data.name, data.color);
    label.position.set(data.distance, data.radius + 1.5, 0);
    orbitPivot.add(label);

    // Orbit line (dashed circle)
    const orbitLine = createOrbitLine(data.distance, data.orbitColor || 0x444444);
    scene.add(orbitLine);

    // Rings (Saturn, Jupiter, Uranus)
    if (data.hasRing) {
      const ring = createRing(data);
      ring.position.x = data.distance;
      // Tilt rings with planet
      ring.rotation.x = Math.PI / 2; // Flat ring
      if (data.name === 'Uranus') {
        ring.rotation.y = data.tilt; // Uranus rings are sideways
      }
      orbitPivot.add(ring);
    }

    // Moons
    const moonObjs = [];
    if (data.moons) {
      data.moons.forEach((moonData) => {
        const moonPivot = new THREE.Object3D();
        moonPivot.position.x = data.distance;
        orbitPivot.add(moonPivot);

        const moonGeo = new THREE.SphereGeometry(moonData.radius, 16, 16);
        const moonMat = new THREE.MeshPhongMaterial({
          color: moonData.color,
          emissive: 0x111111,
          shininess: 10,
        });
        const moonMesh = new THREE.Mesh(moonGeo, moonMat);
        moonMesh.position.x = moonData.distance;
        moonPivot.add(moonMesh);

        // Moon label
        const moonLabel = createLabel(moonData.name, moonData.color, 0.4);
        moonLabel.position.set(moonData.distance, moonData.radius + 0.6, 0);
        moonPivot.add(moonLabel);

        moonObjs.push({
          pivot: moonPivot,
          mesh: moonMesh,
          data: moonData,
        });
      });
    }

    planetObjects.push({
      orbitPivot,
      mesh,
      data,
      label,
      moons: moonObjs,
    });
  });
}

// ============================================================================
// ORBIT LINE — Dashed circle on the XZ plane
// ============================================================================
function createOrbitLine(radius, color) {
  const segments = 128;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    ));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: color,
    dashSize: 1,
    gapSize: 0.5,
    transparent: true,
    opacity: 0.4,
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

// ============================================================================
// RING — For Saturn, Jupiter, Uranus
// ============================================================================
function createRing(data) {
  const ringGeometry = new THREE.RingGeometry(
    data.ringInner,
    data.ringOuter,
    64
  );
  // Adjust UVs for proper ring texture mapping
  const pos = ringGeometry.attributes.position;
  const uv = ringGeometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    uv.setXY(
      i,
      (dist - data.ringInner) / (data.ringOuter - data.ringInner),
      0.5
    );
  }

  // Create procedural ring texture with bands
  const ringCanvas = document.createElement('canvas');
  ringCanvas.width = 512;
  ringCanvas.height = 16;
  const ctx = ringCanvas.getContext('2d');
  const baseColor = new THREE.Color(data.ringColor);

  for (let x = 0; x < 512; x++) {
    const t = x / 512;
    // Create ring band pattern with gaps
    const band = Math.sin(t * 50) * 0.3 + 0.7;
    const gap = Math.random() > 0.95 ? 0 : 1; // Cassini division-like gaps
    const alpha = band * gap * data.ringOpacity;
    const r = Math.floor(baseColor.r * 255 * band);
    const g = Math.floor(baseColor.g * 255 * band);
    const b = Math.floor(baseColor.b * 255 * band);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fillRect(x, 0, 1, 16);
  }

  const ringTexture = new THREE.CanvasTexture(ringCanvas);

  const ringMaterial = new THREE.MeshBasicMaterial({
    map: ringTexture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: data.ringOpacity,
    depthWrite: false,
  });

  return new THREE.Mesh(ringGeometry, ringMaterial);
}

// ============================================================================
// ASTEROID BELT — Points between Mars and Jupiter
// ============================================================================
function createAsteroidBelt() {
  const count = 1500;
  const positions = new Float32Array(count * 3);
  const innerRadius = 33;  // Between Mars (28) and Jupiter (42)
  const outerRadius = 38;

  for (let i = 0; i < count; i++) {
    const r = innerRadius + Math.random() * (outerRadius - innerRadius);
    const angle = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 1.5; // Slight vertical spread

    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * r;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x888877,
    size: 0.15,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
  });

  asteroidBelt = new THREE.Points(geometry, material);
  scene.add(asteroidBelt);
}

// ============================================================================
// LABEL — Canvas-based sprite text
// ============================================================================
function createLabel(text, color, scale = 0.6) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 64);
  ctx.font = 'bold 32px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Text color from planet color
  const c = new THREE.Color(color);
  const r = Math.min(255, Math.floor(c.r * 255 + 80));
  const g = Math.min(255, Math.floor(c.g * 255 + 80));
  const b = Math.min(255, Math.floor(c.b * 255 + 80));
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(4 * scale, 1 * scale, 1);

  return sprite;
}

// ============================================================================
// UI OVERLAY — Speed controls, info, planet buttons
// ============================================================================
function setupUI() {
  // Speed control buttons
  const speedBtns = document.querySelectorAll('[data-speed]');
  speedBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      speedMultiplier = parseFloat(btn.dataset.speed);
      // Update active state
      document.querySelectorAll('[data-speed]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Planet focus buttons
  const planetBtns = document.querySelectorAll('[data-planet]');
  planetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetName = btn.dataset.planet;
      if (targetName === 'Sun') {
        smoothCameraTo(new THREE.Vector3(0, 0, 0), 20);
        return;
      }
      const planet = planetObjects.find((p) => p.data.name === targetName);
      if (planet) {
        // Get world position of the planet
        const worldPos = new THREE.Vector3();
        planet.mesh.getWorldPosition(worldPos);
        smoothCameraTo(worldPos, planet.data.radius * 8 + 5);
      }
    });
  });
}

// ============================================================================
// SMOOTH CAMERA TRANSITION
// ============================================================================
function smoothCameraTo(target, distance) {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();

  const endTarget = target.clone();
  const direction = new THREE.Vector3()
    .subVectors(camera.position, controls.target)
    .normalize();
  const endPos = target.clone().add(direction.multiplyScalar(distance));
  endPos.y = Math.max(endPos.y, distance * 0.3);

  const duration = 1500;
  const startTime = performance.now();

  function animateCamera() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    // Ease in-out cubic
    const ease = t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    controls.update();

    if (t < 1) {
      requestAnimationFrame(animateCamera);
    }
  }
  animateCamera();
}

// ============================================================================
// ANIMATION LOOP
// ============================================================================
function animate() {
  const elapsed = clock.getElapsedTime() * speedMultiplier;

  // Rotate Sun slowly
  sunMesh.rotation.y = elapsed * 0.1;

  // Rotate asteroid belt slowly
  if (asteroidBelt) {
    asteroidBelt.rotation.y = elapsed * 0.02;
  }

  // Animate each planet
  planetObjects.forEach((planet) => {
    const { orbitPivot, mesh, data, moons } = planet;

    // Orbital revolution — speed ∝ 1/orbitalPeriod (Kepler's 3rd law)
    const orbitalSpeed = (2 * Math.PI) / (data.orbitalPeriod * 0.01);
    orbitPivot.rotation.y = elapsed * orbitalSpeed;

    // Axial rotation
    mesh.rotation.y += data.rotationSpeed * speedMultiplier * 0.016;

    // Animate moons
    moons.forEach((moon) => {
      const moonOrbitalSpeed = (2 * Math.PI) / (moon.data.orbitalPeriod * 0.05);
      moon.pivot.rotation.y = elapsed * moonOrbitalSpeed;
    });
  });

  // Subtle sun glow pulse
  const pulse = 1 + Math.sin(elapsed * 2) * 0.05;
  sunGlow.scale.set(20 * pulse, 20 * pulse, 1);
  sunLight.intensity = 2.5 + Math.sin(elapsed * 3) * 0.2;

  controls.update();
  renderer.render(scene, camera);
}

// ============================================================================
// RESIZE HANDLER
// ============================================================================
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
