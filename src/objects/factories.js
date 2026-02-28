/**
 * 3D object factories — Sun, planets, rings, asteroid belt, stars, orbit lines, labels.
 */

import * as THREE from 'three';

// ── Shared registries ──
export const clickableMeshes = new Map(); // mesh → { name, radius, color }
export const orbitLines = [];             // all orbit line objects for toggling

const textureLoader = new THREE.TextureLoader();

/** Load a texture with correct sRGB color space for color / diffuse maps */
function loadTex(path) {
  const tex = textureLoader.load(path);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Load a texture WITHOUT sRGB (for alpha / data textures) */
function loadTexLinear(path) {
  const tex = textureLoader.load(path);
  tex.anisotropy = 8;
  return tex;
}

// ============================================================================
// STAR FIELD
// ============================================================================
export function createStarField(scene) {
  const layers = [
    { count: 4000, minR: 300, maxR: 600, size: 0.4, opacity: 0.5 },
    { count: 2000, minR: 280, maxR: 550, size: 0.8, opacity: 0.8 },
    { count: 600,  minR: 280, maxR: 500, size: 1.5, opacity: 1.0 },
  ];

  const group = new THREE.Group();
  group.name = 'starField';

  layers.forEach(({ count, minR, maxR, size, opacity }) => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = minR + Math.random() * (maxR - minR);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const temp = Math.random();
      if (temp < 0.15) {
        colors[i * 3] = 0.6 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.2;
        colors[i * 3 + 2] = 1.0;
      } else if (temp > 0.85) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.3 + Math.random() * 0.3;
      } else {
        const w = 0.8 + Math.random() * 0.2;
        colors[i * 3] = w;
        colors[i * 3 + 1] = w;
        colors[i * 3 + 2] = w;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size, vertexColors: true, transparent: true, opacity,
      sizeAttenuation: true, depthWrite: false,
    });
    group.add(new THREE.Points(geo, mat));
  });

  scene.add(group);
  return group;
}

// ============================================================================
// MILKY WAY SKYSPHERE — procedural equirectangular texture on BackSide sphere
// ============================================================================
export function createMilkyWay(scene) {
  const W = 2048, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── 1. Deep-space background ──
  ctx.fillStyle = '#00000a';
  ctx.fillRect(0, 0, W, H);

  // ── 2. Wide galactic halo ──
  const halo = ctx.createLinearGradient(0, H * 0.18, 0, H * 0.82);
  halo.addColorStop(0.0,  'rgba(5,8,25,0)');
  halo.addColorStop(0.28, 'rgba(15,22,70,0.07)');
  halo.addColorStop(0.50, 'rgba(35,50,130,0.18)');
  halo.addColorStop(0.72, 'rgba(15,22,70,0.07)');
  halo.addColorStop(1.0,  'rgba(5,8,25,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  // ── 3. Bright inner band ──
  const band = ctx.createLinearGradient(0, H * 0.36, 0, H * 0.64);
  band.addColorStop(0.0,  'rgba(60,80,200,0)');
  band.addColorStop(0.22, 'rgba(90,110,230,0.10)');
  band.addColorStop(0.50, 'rgba(170,185,255,0.28)');
  band.addColorStop(0.78, 'rgba(90,110,230,0.10)');
  band.addColorStop(1.0,  'rgba(60,80,200,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, H);

  // ── 4. Sharp bright spine ──
  const spine = ctx.createLinearGradient(0, H * 0.46, 0, H * 0.54);
  spine.addColorStop(0,   'rgba(200,215,255,0)');
  spine.addColorStop(0.5, 'rgba(200,215,255,0.22)');
  spine.addColorStop(1,   'rgba(200,215,255,0)');
  ctx.fillStyle = spine;
  ctx.fillRect(0, 0, W, H);

  // ── 5. Galactic centre bulge (warm yellow-white) ──
  const cx = W * 0.50, cy = H * 0.50;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.28);
  core.addColorStop(0.00, 'rgba(255,245,200,0.55)');
  core.addColorStop(0.06, 'rgba(240,220,160,0.40)');
  core.addColorStop(0.18, 'rgba(180,160,220,0.18)');
  core.addColorStop(0.45, 'rgba(90,80,180,0.07)');
  core.addColorStop(1.00, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, W, H);

  // ── 6. Secondary arm hints ──
  [
    { x: W * 0.22, y: H * 0.50, rx: W * 0.22, c: 'rgba(70,90,210,0.11)' },
    { x: W * 0.78, y: H * 0.50, rx: W * 0.20, c: 'rgba(60,80,200,0.09)' },
    { x: W * 0.10, y: H * 0.51, rx: W * 0.14, c: 'rgba(50,60,180,0.06)' },
    { x: W * 0.90, y: H * 0.49, rx: W * 0.13, c: 'rgba(50,60,180,0.06)' },
  ].forEach(({ x, y, rx, c }) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0,   c);
    g.addColorStop(0.5, c.replace(/[\d.]+\)$/, '0.03)'));
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });

  // ── 7. Dust lanes — multiply dark streaks ──
  ctx.globalCompositeOperation = 'multiply';
  // Main lane just above centre
  const dust1 = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.52);
  dust1.addColorStop(0,   'rgba(0,0,0,0)');
  dust1.addColorStop(0.4, 'rgba(0,0,0,0.55)');
  dust1.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = dust1;
  ctx.fillRect(W * 0.15, 0, W * 0.70, H);
  // Secondary wispy lane
  const dust2 = ctx.createLinearGradient(0, H * 0.49, 0, H * 0.56);
  dust2.addColorStop(0,   'rgba(0,0,0,0)');
  dust2.addColorStop(0.5, 'rgba(0,0,0,0.30)');
  dust2.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = dust2;
  ctx.fillRect(W * 0.35, 0, W * 0.30, H);
  ctx.globalCompositeOperation = 'source-over';

  // ── 8. Nebula colour clouds ──
  const nebulae = [
    { x: W*0.48, y: H*0.47, r: 60,  col: 'rgba(180,80,255,0.08)' },
    { x: W*0.55, y: H*0.52, r: 80,  col: 'rgba(80,160,255,0.07)' },
    { x: W*0.30, y: H*0.49, r: 70,  col: 'rgba(100,200,255,0.06)' },
    { x: W*0.70, y: H*0.51, r: 65,  col: 'rgba(255,140,80,0.05)' },
    { x: W*0.20, y: H*0.50, r: 55,  col: 'rgba(120,80,220,0.05)' },
    { x: W*0.82, y: H*0.50, r: 50,  col: 'rgba(80,200,180,0.05)' },
  ];
  nebulae.forEach(({ x, y, r, col }) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });

  // ── 9. Micro-stars — 22 000 dots, band-biased ──
  const starData = ctx.getImageData(0, 0, W, H);
  const d = starData.data;
  for (let i = 0; i < 22000; i++) {
    const sx = Math.floor(Math.random() * W);
    // Bias toward galactic plane — gaussian around y=H/2
    const dy = (Math.random() + Math.random() + Math.random() - 1.5) * H * 0.28;
    const sy = Math.floor(Math.max(0, Math.min(H - 1, H / 2 + dy)));
    const idx = (sy * W + sx) * 4;
    const bright = 100 + Math.random() * 155;
    // Colour tint based on position in band
    const bandNorm = 1 - Math.abs((sy / H) - 0.5) * 2;
    const blueShift = bandNorm * 30;
    const warmShift = (1 - bandNorm) * 20;
    d[idx]     = Math.min(255, bright + warmShift);
    d[idx + 1] = Math.min(255, bright);
    d[idx + 2] = Math.min(255, bright + blueShift);
    d[idx + 3] = Math.floor(60 + Math.random() * 195 * bandNorm + 40);
  }
  ctx.putImageData(starData, 0, 0);

  // ── 10. Build sphere ──
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.SphereGeometry(900, 64, 40);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
  });
  const sphere = new THREE.Mesh(geo, mat);
  // Tilt the galactic plane ~60° relative to ecliptic (roughly correct)
  sphere.rotation.x = Math.PI * 0.18;
  scene.add(sphere);
  return sphere;
}

// ============================================================================
// SUN
// ============================================================================
export function createSun(scene) {
  const geo = new THREE.SphereGeometry(4, 64, 64);
  const sunTex = loadTex('/textures/sun.jpg');
  const mat = new THREE.MeshStandardMaterial({
    map: sunTex,
    emissiveMap: sunTex,
    emissive: new THREE.Color(0xffcc44),
    emissiveIntensity: 1.5,
    roughness: 1,
    metalness: 0,
  });
  const sunMesh = new THREE.Mesh(geo, mat);
  scene.add(sunMesh);

  // Glow sprite — larger, softer
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, 'rgba(255,230,100,0.9)');
  grad.addColorStop(0.15, 'rgba(255,200,60,0.6)');
  grad.addColorStop(0.3, 'rgba(255,160,40,0.3)');
  grad.addColorStop(0.5, 'rgba(255,120,20,0.12)');
  grad.addColorStop(0.7, 'rgba(255,80,10,0.04)');
  grad.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const glowTex = new THREE.CanvasTexture(canvas);
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(28, 28, 1);
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
  const geo = new THREE.SphereGeometry(data.radius, 64, 64);
  const matOpts = {
    roughness: 0.85,
    metalness: 0.0,
    emissive: new THREE.Color(data.emissive || 0x000000),
    emissiveIntensity: 0.08,
  };
  if (data.texture) {
    matOpts.map = loadTex(data.texture);
  } else {
    matOpts.color = data.color;
  }
  const mat = new THREE.MeshStandardMaterial(matOpts);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.x = data.distance;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (data.tilt) mesh.rotation.z = data.tilt;
  orbitPivot.add(mesh);

  // Atmosphere shell
  if (data.atmosphere) {
    const atmoGeo = new THREE.SphereGeometry(
      data.radius * data.atmosphere.scale, 64, 64
    );
    const atmoMat = new THREE.MeshStandardMaterial({
      color: data.atmosphere.color,
      transparent: true,
      opacity: data.atmosphere.opacity,
      roughness: 1,
      metalness: 0,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    atmo.position.x = data.distance;
    if (data.tilt) atmo.rotation.z = data.tilt;
    orbitPivot.add(atmo);
  }

  // Label
  const label = createLabel(data.name, data.color);
  label.position.set(data.distance, data.radius + 1.5, 0);
  orbitPivot.add(label);

  // Orbit line
  const orbitLine = createOrbitLine(data.distance, data.orbitColor || 0x444444);
  scene.add(orbitLine);
  orbitLines.push(orbitLine);

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

      const mGeo = new THREE.SphereGeometry(md.radius, 32, 32);
      const mMatOpts = {
        roughness: 0.9,
        metalness: 0.0,
        emissive: new THREE.Color(0x111111),
        emissiveIntensity: 0.08,
      };
      if (md.texture) {
        mMatOpts.map = loadTex(md.texture);
      } else {
        mMatOpts.color = md.color;
      }
      const mMat = new THREE.MeshStandardMaterial(mMatOpts);
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
  const segs = 256;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineDashedMaterial({
    color,
    dashSize: 0.8,
    gapSize: 0.4,
    transparent: true,
    opacity: 0.3,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  return line;
}

// ============================================================================
// RING
// ============================================================================
function createRing(data) {
  const segments = 128;
  const geo = new THREE.RingGeometry(data.ringInner, data.ringOuter, segments);

  // Remap UVs: U goes from 0 (inner) to 1 (outer) radially
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    const t = (dist - data.ringInner) / (data.ringOuter - data.ringInner);
    uv.setXY(i, t, 0.5);
  }

  let mat;
  if (data.ringTexture) {
    // Saturn: ring alpha PNG is a horizontal strip, X = radial distance
    const colorTex = loadTex(data.ringTexture);
    colorTex.wrapS = THREE.ClampToEdgeWrapping;
    colorTex.wrapT = THREE.ClampToEdgeWrapping;
    const alphaTex = loadTexLinear(data.ringTexture);
    alphaTex.wrapS = THREE.ClampToEdgeWrapping;
    alphaTex.wrapT = THREE.ClampToEdgeWrapping;

    mat = new THREE.MeshBasicMaterial({
      map: colorTex,
      alphaMap: alphaTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: data.ringOpacity,
      depthWrite: false,
    });
  } else {
    // Procedural ring for Jupiter / Uranus
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 4;
    const ctx = canvas.getContext('2d');
    const base = new THREE.Color(data.ringColor);
    for (let x = 0; x < 1024; x++) {
      const t = x / 1024;
      const band = Math.sin(t * 60) * 0.25 + 0.75;
      const gap = Math.random() > 0.92 ? 0 : 1;
      const alpha = band * gap * data.ringOpacity;
      const r = Math.floor(base.r * 255 * band);
      const g = Math.floor(base.g * 255 * band);
      const b = Math.floor(base.b * 255 * band);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fillRect(x, 0, 1, 4);
    }
    const tex = new THREE.CanvasTexture(canvas);
    mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: data.ringOpacity,
      depthWrite: false,
    });
  }

  return new THREE.Mesh(geo, mat);
}

// ============================================================================
// ASTEROID BELT
// ============================================================================
export function createAsteroidBelt(scene) {
  const count = 3000;
  const inner = 33, outer = 38;

  // Deformed rock geometry — use low-poly icosahedron with vertex jitter
  const baseGeo = new THREE.IcosahedronGeometry(0.12, 0);
  const posAttr = baseGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const jitter = 0.6 + Math.random() * 0.8; // 0.6–1.4 scale
    posAttr.setXYZ(i, posAttr.getX(i) * jitter, posAttr.getY(i) * jitter, posAttr.getZ(i) * jitter);
  }
  posAttr.needsUpdate = true;
  baseGeo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x887766,
    roughness: 0.95,
    metalness: 0.1,
    flatShading: true,
  });

  const mesh = new THREE.InstancedMesh(baseGeo, mat, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const r = inner + Math.random() * (outer - inner);
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = (Math.random() - 0.5) * 2.0;

    dummy.position.set(x, y, z);
    const s = 0.4 + Math.random() * 1.4; // size variety
    dummy.scale.set(s, s * (0.5 + Math.random() * 0.5), s);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    // Per-instance color: grey-brown with variation
    const lum = 0.25 + Math.random() * 0.35;
    color.setRGB(lum + 0.04, lum, lum - 0.03);
    mesh.setColorAt(i, color);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  scene.add(mesh);
  return mesh;
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
