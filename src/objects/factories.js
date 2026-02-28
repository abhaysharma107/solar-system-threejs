/**
 * 3D object factories — Sun, planets, rings, asteroid belt, stars, orbit lines, labels.
 */

import * as THREE from 'three';

// ── Shared registries (exported for main to access) ──
export const clickableMeshes = new Map(); // mesh → { name, radius, color }

const textureLoader = new THREE.TextureLoader();

// ============================================================================
// STAR FIELD
// ============================================================================
export function createStarField(scene) {
  const starCount = 2500;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const r = 300 + Math.random() * 300;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const temp = 0.7 + Math.random() * 0.3;
    colors[i * 3]     = temp;
    colors[i * 3 + 1] = temp;
    colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  });

  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
  return stars;
}

// ============================================================================
// SUN
// ============================================================================
export function createSun(scene) {
  const geo = new THREE.SphereGeometry(4, 32, 32);
  const sunTex = textureLoader.load('/textures/sun.jpg');
  const mat = new THREE.MeshBasicMaterial({ map: sunTex });
  const sunMesh = new THREE.Mesh(geo, mat);
  scene.add(sunMesh);

  // Glow sprite
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,220,80,0.8)');
  grad.addColorStop(0.3, 'rgba(255,180,40,0.4)');
  grad.addColorStop(0.6, 'rgba(255,120,20,0.15)');
  grad.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const glowTex = new THREE.CanvasTexture(canvas);
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(20, 20, 1);
  scene.add(glow);

  // Click registration
  clickableMeshes.set(sunMesh, { name: 'Sun', radius: 4, color: 0xffdd44 });

  // Label
  const label = createLabel('Sun', 0xffdd44);
  label.position.set(0, 6, 0);
  scene.add(label);

  return { mesh: sunMesh, glow };
}

// ============================================================================
// PLANET FACTORY
// ============================================================================
export function createPlanet(scene, data) {
  // Orbit pivot
  const orbitPivot = new THREE.Object3D();
  orbitPivot.name = data.name + '_orbit';
  scene.add(orbitPivot);

  // Planet mesh
  const geo = new THREE.SphereGeometry(data.radius, 32, 32);
  const matOpts = {
    color: data.color,
    emissive: data.emissive || 0x000000,
    shininess: 25,
    specular: 0x222222,
  };
  if (data.texture) {
    matOpts.map = textureLoader.load(data.texture);
    matOpts.color = 0xffffff; // let texture provide color
  }
  const mat = new THREE.MeshPhongMaterial(matOpts);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.x = data.distance;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (data.tilt) mesh.rotation.z = data.tilt;
  orbitPivot.add(mesh);

  // Label
  const label = createLabel(data.name, data.color);
  label.position.set(data.distance, data.radius + 1.5, 0);
  orbitPivot.add(label);

  // Orbit line
  const orbitLine = createOrbitLine(data.distance, data.orbitColor || 0x444444);
  scene.add(orbitLine);

  // Rings
  if (data.hasRing) {
    const ring = createRing(data);
    ring.position.x = data.distance;
    ring.rotation.x = Math.PI / 2;
    if (data.name === 'Uranus') ring.rotation.y = data.tilt;
    orbitPivot.add(ring);
  }

  // Moons
  const moons = [];
  if (data.moons) {
    data.moons.forEach((md) => {
      const moonPivot = new THREE.Object3D();
      moonPivot.position.x = data.distance;
      orbitPivot.add(moonPivot);

      const mGeo = new THREE.SphereGeometry(md.radius, 16, 16);
      const mMatOpts = { color: md.color, emissive: 0x111111, shininess: 10 };
      if (md.texture) {
        mMatOpts.map = textureLoader.load(md.texture);
        mMatOpts.color = 0xffffff;
      }
      const mMat = new THREE.MeshPhongMaterial(mMatOpts);
      const mMesh = new THREE.Mesh(mGeo, mMat);
      mMesh.position.x = md.distance;
      moonPivot.add(mMesh);

      const mLabel = createLabel(md.name, md.color, 0.4);
      mLabel.position.set(md.distance, md.radius + 0.6, 0);
      moonPivot.add(mLabel);

      moons.push({ pivot: moonPivot, mesh: mMesh, data: md });
    });
  }

  // Register as clickable
  clickableMeshes.set(mesh, { name: data.name, radius: data.radius, color: data.color });

  return { orbitPivot, mesh, data, label, moons };
}

// ============================================================================
// ORBIT LINE
// ============================================================================
function createOrbitLine(radius, color) {
  const segs = 128;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineDashedMaterial({ color, dashSize: 1, gapSize: 0.5, transparent: true, opacity: 0.4 });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  return line;
}

// ============================================================================
// RING
// ============================================================================
function createRing(data) {
  const geo = new THREE.RingGeometry(data.ringInner, data.ringOuter, 64);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    uv.setXY(i, (dist - data.ringInner) / (data.ringOuter - data.ringInner), 0.5);
  }

  let tex;
  if (data.ringTexture) {
    // Use real ring texture (e.g. Saturn)
    tex = textureLoader.load(data.ringTexture);
    tex.rotation = Math.PI / 2;
  } else {
    // Procedural ring
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const base = new THREE.Color(data.ringColor);
    for (let x = 0; x < 512; x++) {
      const t = x / 512;
      const band = Math.sin(t * 50) * 0.3 + 0.7;
      const gap = Math.random() > 0.95 ? 0 : 1;
      const alpha = band * gap * data.ringOpacity;
      ctx.fillStyle = `rgba(${Math.floor(base.r * 255 * band)},${Math.floor(base.g * 255 * band)},${Math.floor(base.b * 255 * band)},${alpha})`;
      ctx.fillRect(x, 0, 1, 16);
    }
    tex = new THREE.CanvasTexture(canvas);
  }

  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: data.ringOpacity, depthWrite: false });
  return new THREE.Mesh(geo, mat);
}

// ============================================================================
// ASTEROID BELT
// ============================================================================
export function createAsteroidBelt(scene) {
  const count = 1500;
  const positions = new Float32Array(count * 3);
  const inner = 33, outer = 38;
  for (let i = 0; i < count; i++) {
    const r = inner + Math.random() * (outer - inner);
    const a = Math.random() * Math.PI * 2;
    positions[i * 3]     = Math.cos(a) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
    positions[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0x888877, size: 0.15, transparent: true, opacity: 0.6, sizeAttenuation: true });
  const belt = new THREE.Points(geo, mat);
  scene.add(belt);
  return belt;
}

// ============================================================================
// LABEL — Canvas sprite
// ============================================================================
export function createLabel(text, color, scale = 0.6) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = 'bold 32px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;

  const c = new THREE.Color(color);
  const r = Math.min(255, Math.floor(c.r * 255 + 80));
  const g = Math.min(255, Math.floor(c.g * 255 + 80));
  const b = Math.min(255, Math.floor(c.b * 255 + 80));
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillText(text, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4 * scale, 1 * scale, 1);
  return sprite;
}
