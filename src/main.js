import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Build/version badge (so you always know what you're looking at)
// Build info is injected by `vite.config.js` (window var + optional define constants).
const buildBadge = document.getElementById("buildBadge");
function setBuildBadge(starter, sha, builtAt) {
  if (buildBadge) buildBadge.innerHTML = `BUILD: <b>${starter}</b> · ${sha} · ${builtAt}`;
  document.title = `Atomic Codes — ${starter} — ${sha}`;
}

const win = window;
const injected = win?.__ATOMIC_CODES_BUILD__;
if (injected?.starter && injected?.sha && injected?.builtAt) {
  setBuildBadge(injected.starter, injected.sha, injected.builtAt);
} else {
  // Fallback: compile-time constants (may fail if not injected)
  try {
    // eslint-disable-next-line no-undef
    const starter = __ATOMIC_CODES_STARTER__;
    // eslint-disable-next-line no-undef
    const sha = __ATOMIC_CODES_GIT_SHA__;
    // eslint-disable-next-line no-undef
    const builtAt = __ATOMIC_CODES_BUILT_AT__;
    setBuildBadge(starter, sha, builtAt);
  } catch {
    if (buildBadge) buildBadge.textContent = "BUILD: UNKNOWN (restart dev server)";
    document.title = "Atomic Codes — BUILD UNKNOWN";
  }
}

// Goal: a clean, obvious starter interaction model:
// - Drag: orbit
// - Scroll / swipe: travel through 3 layers (meter + text updates)
// - Hover + click sentinel: highlight + hologram

const canvas = document.getElementById("c");
const panelTitle = document.getElementById("panelTitle");
const panelBody = document.getElementById("panelBody");
const meter = document.getElementById("meter");

const holo = document.getElementById("holo");
const holoText = document.getElementById("holoText");
const help = document.getElementById("help");

const btnReset = document.getElementById("btnReset");
const btnHelp = document.getElementById("btnHelp");
const btnHelpClose = document.getElementById("btnHelpClose");
const btnClose = document.getElementById("btnClose");
const btnNext = document.getElementById("btnNext");

const DIALOGUE = [
  "Signal locked. I guard the boundary between code and matter.",
  "Your cursor is a probe. Your scroll is a descent through layers.",
  "Drop a character GLB later; for now I exist as a lightform.",
];
let dialogueIndex = 0;

function setHelpOpen(open) {
  help?.setAttribute("data-open", String(Boolean(open)));
}
function setHoloOpen(open) {
  holo?.setAttribute("data-open", String(Boolean(open)));
}

btnHelp?.addEventListener("click", () => setHelpOpen(true));
btnHelpClose?.addEventListener("click", () => setHelpOpen(false));
btnClose?.addEventListener("click", () => setHoloOpen(false));
btnNext?.addEventListener("click", () => {
  dialogueIndex = (dialogueIndex + 1) % DIALOGUE.length;
  if (holoText) holoText.textContent = DIALOGUE[dialogueIndex];
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    setHelpOpen(false);
    setHoloOpen(false);
  }
});

// --- Renderer / Scene / Camera ---
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060713, 0.05);

const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 200);
camera.position.set(0, 0.6, 7.5);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 3.5;
controls.maxDistance = 14;
controls.target.set(0, 0.25, 0);

const BASE_TARGET = new THREE.Vector3(0, 0.25, 0);
const BASE_CAMERA = new THREE.Vector3(0, 0.6, 7.5);
const TRAVEL_VEC = new THREE.Vector3(0, 0, -52); // how far layer-travel moves you forward

btnReset?.addEventListener("click", () => {
  travel.target = 0;
  travel.pos = 0;
  camera.position.copy(BASE_CAMERA);
  controls.target.copy(BASE_TARGET);
  controls.update();
});

// Lights (simple + readable)
scene.add(new THREE.HemisphereLight(0x99c6ff, 0x05060b, 0.7));
const key = new THREE.PointLight(0x8cffee, 2.2, 45, 2);
key.position.set(2.4, 2.4, 3.2);
scene.add(key);
const rim = new THREE.PointLight(0x9b7bff, 1.8, 60, 2);
rim.position.set(-4.2, 1.3, -7.5);
scene.add(rim);

// --- Atomic Core ---
const core = new THREE.Group();
scene.add(core);

// 3D Logo Core (from /logo.png)
const logoCore = new THREE.Group();
core.add(logoCore);

/** Creates an alpha texture from a black-bg, white-line logo image. */
async function loadLogoAlphaTexture(url) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.decoding = "async";
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = url;
  });

  const w = img.width || 512;
  const h = img.height || 512;
  const cnv = document.createElement("canvas");
  cnv.width = w;
  cnv.height = h;
  const ctx = cnv.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No canvas context");
  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  // Convert luminance to alpha; force RGB to white.
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i + 0];
    const g = d[i + 1];
    const b = d[i + 2];
    const lum = Math.max(r, g, b); // strong line alpha from white strokes
    d[i + 0] = 255;
    d[i + 1] = 255;
    d[i + 2] = 255;
    d[i + 3] = lum;
  }
  ctx.putImageData(imageData, 0, 0);

  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return { tex, w, h };
}

const logoLayers = [];
async function mountLogoCore() {
  try {
    const { tex, w, h } = await loadLogoAlphaTexture("/logo.png");
    const aspect = w / h;

    // A stack of planes creates a "3D" thickness when rotating.
    const height = 2.35;
    const width = height * aspect;
    const geom = new THREE.PlaneGeometry(width, height, 1, 1);

    // Clear any placeholder
    logoCore.clear();
    logoLayers.length = 0;

    const layers = 18;
    const depth = 0.65;
    for (let i = 0; i < layers; i++) {
      const z = -((i / (layers - 1)) * depth);
      const fade = 1 - i / (layers - 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: new THREE.Color(0x8cffee),
        emissiveIntensity: 0.85 + fade * 0.35,
        roughness: 0.35,
        metalness: 0.05,
        map: tex,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(geom, mat);
      m.position.z = z;
      m.renderOrder = 100 + i;
      logoCore.add(m);
      logoLayers.push(m);
    }

    // Backplate glow
    const back = new THREE.Mesh(
      new THREE.CircleGeometry(height * 0.72, 40),
      new THREE.MeshBasicMaterial({
        color: 0x9b7bff,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    back.position.z = -depth - 0.05;
    back.renderOrder = 50;
    logoCore.add(back);

    logoCore.scale.setScalar(1.0);
    logoCore.position.set(0, 0.15, 0);
  } catch {
    // Fallback: simple emissive ring if texture processing fails
    logoCore.clear();
    const fallback = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.65, 0.12, 120, 16),
      new THREE.MeshStandardMaterial({
        color: 0x0b0d16,
        emissive: new THREE.Color(0x8cffee),
        emissiveIntensity: 0.9,
        roughness: 0.25,
        metalness: 0.35,
      }),
    );
    logoCore.add(fallback);
  }
}
mountLogoCore();

const ringMat = new THREE.LineBasicMaterial({ color: 0x9b7bff, transparent: true, opacity: 0.45 });
function ring(radius, tilt, rotY) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius * 0.62, 0, Math.PI * 2);
  const pts = curve.getPoints(240).map((p) => new THREE.Vector3(p.x, 0, p.y));
  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.LineLoop(geom, ringMat);
  line.rotation.set(tilt, rotY, tilt * 0.6);
  return line;
}
core.add(ring(1.6, 0.65, 0.2), ring(2.0, -0.5, 1.1), ring(2.35, 0.15, 2.0));

// --- Wireframe Universe: stars + planets + ships ---
const universe = new THREE.Group();
scene.add(universe);

// Stars (simple points field)
{
  const px = window.innerWidth * window.innerHeight;
  // More stars, plus size variety via multiple point layers.
  const farCount = Math.min(12000, Math.max(5200, Math.floor(px / 240)));
  const midCount = Math.min(5200, Math.max(2200, Math.floor(px / 520)));
  const nearCount = Math.min(2200, Math.max(900, Math.floor(px / 1400)));

  function makeStarField(count, spread, zMin, zMax, size, opacity, color) {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3 + 0] = THREE.MathUtils.randFloatSpread(spread.x);
      pos[i3 + 1] = THREE.MathUtils.randFloatSpread(spread.y);
      pos[i3 + 2] = THREE.MathUtils.randFloat(zMin, zMax);
    }
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    return new THREE.Points(geom, mat);
  }

  universe.add(makeStarField(farCount, { x: 150, y: 100 }, -220, 60, 0.035, 0.55, 0xbfefff)); // tiny
  universe.add(makeStarField(midCount, { x: 120, y: 85 }, -200, 55, 0.06, 0.65, 0xffffff)); // medium
  universe.add(makeStarField(nearCount, { x: 95, y: 70 }, -140, 35, 0.11, 0.9, 0xfff6e0)); // big
}

// Planets (wireframe spheres + orbit rings)
const planets = [];
function addOrbitRing(parent, radius, color, opacity = 0.45) {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const curve = new THREE.EllipseCurve(0, 0, radius, radius * 0.62, 0, Math.PI * 2);
  const pts = curve.getPoints(220).map((p) => new THREE.Vector3(p.x, 0, p.y));
  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const ringLine = new THREE.LineLoop(geom, mat);
  ringLine.rotation.x = Math.PI / 2;
  parent.add(ringLine);
  return ringLine;
}

function addPlanet({ r, x, y, z, color, ring = false, segW = 12, segH = 10, opacity = 0.65 }) {
  const g = new THREE.Group();
  g.position.set(x, y, z);

  // Simplified planet wireframe: fewer segments + line wireframe (cleaner than triangle wireframe).
  const sphere = new THREE.SphereGeometry(r, segW, segH);
  const mesh = new THREE.LineSegments(
    new THREE.WireframeGeometry(sphere),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
  g.add(mesh);

  const orbits = [];
  orbits.push(addOrbitRing(g, r * 1.55, 0x8cffee, 0.2));
  orbits.push(addOrbitRing(g, r * 2.1, 0x9b7bff, 0.14));
  if (ring) {
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(r * 1.35, r * 0.12, 8, 28),
      new THREE.MeshBasicMaterial({
        color: 0x8cffee,
        wireframe: true,
        transparent: true,
        opacity: 0.18,
      }),
    );
    ringMesh.rotation.x = Math.PI / 2.3;
    ringMesh.rotation.y = 0.6;
    g.add(ringMesh);
  }

  universe.add(g);
  planets.push({ g, mesh, orbits, spin: THREE.MathUtils.randFloat(0.05, 0.18) * (Math.random() < 0.5 ? -1 : 1) });
}

// Place planets so each "layer" has a distinct cluster.
// Layer 0 (near core): subtle moons
addPlanet({ r: 0.55, x: -4.8, y: 1.4, z: -6, color: 0x9ad5ff, ring: false, segW: 10, segH: 8, opacity: 0.45 });
addPlanet({ r: 0.7, x: 3.8, y: -1.1, z: -8.5, color: 0xff7bd8, ring: false, segW: 10, segH: 8, opacity: 0.48 });

// Layer 1 cluster
addPlanet({ r: 1.15, x: 6.5, y: 1.6, z: -16, color: 0x39ffd1, ring: true, segW: 12, segH: 10 });
addPlanet({ r: 1.75, x: -8.0, y: -1.2, z: -26, color: 0x7d6bff, ring: false, segW: 12, segH: 10 });
addPlanet({ r: 1.05, x: -1.2, y: 2.8, z: -24, color: 0xffc36a, ring: false, segW: 11, segH: 9, opacity: 0.58 });

// Layer 2 cluster (deeper)
addPlanet({ r: 0.95, x: 4.4, y: -2.3, z: -36, color: 0x6ae4ff, ring: false, segW: 11, segH: 9 });
addPlanet({ r: 2.2, x: 10.2, y: 2.2, z: -54, color: 0x39ffd1, ring: true, segW: 12, segH: 10, opacity: 0.55 });
addPlanet({ r: 1.35, x: -10.5, y: 1.8, z: -48, color: 0xff7bd8, ring: true, segW: 12, segH: 10, opacity: 0.5 });
addPlanet({ r: 1.9, x: 0.5, y: -2.4, z: -62, color: 0xa7ff6a, ring: false, segW: 12, segH: 10, opacity: 0.5 });

// Ships + Satellites (instanced, with variety)
const px2 = window.innerWidth * window.innerHeight;
const fighterCount = Math.min(70, Math.max(28, Math.floor(px2 / 24000)));
const freighterCount = Math.min(34, Math.max(12, Math.floor(px2 / 52000)));

const PALETTE = [
  0x39ffd1, // teal
  0x7d6bff, // violet
  0xff7bd8, // magenta
  0x6ae4ff, // blue
  0xffc36a, // amber
  0xa7ff6a, // green
  0xffffff, // white
];

function applyInstanceColors(mesh, count, pickColor) {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const c = new THREE.Color(pickColor(i));
    arr[i * 3 + 0] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  mesh.instanceColor = new THREE.InstancedBufferAttribute(arr, 3);
}

function makeFleet(geometry, count, baseOpacity) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
    transparent: true,
    opacity: baseOpacity,
  });
  const mesh = new THREE.InstancedMesh(geometry, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  universe.add(mesh);
  return mesh;
}

// Fighter: slim body + wings + engine
const fighterFuselage = new THREE.ConeGeometry(0.14, 0.72, 6, 1, true);
fighterFuselage.rotateX(Math.PI / 2);
fighterFuselage.translate(0, 0, 0.16);
const fighterCockpit = new THREE.SphereGeometry(0.12, 8, 6);
fighterCockpit.translate(0, 0.03, 0.34);
const fighterWing = new THREE.BoxGeometry(0.7, 0.03, 0.24);
fighterWing.translate(0, 0.02, 0.1);
const fighterTail = new THREE.BoxGeometry(0.18, 0.08, 0.2);
fighterTail.translate(0, 0.08, -0.15);
const fighterEngine = new THREE.CylinderGeometry(0.07, 0.07, 0.28, 6, 1, true);
fighterEngine.rotateX(Math.PI / 2);
fighterEngine.translate(0, -0.02, -0.22);
const fighterGeo = mergeGeometries(
  [fighterFuselage, fighterCockpit, fighterWing, fighterTail, fighterEngine],
  false,
);

// Freighter: boxy hull + cargo pods
const hull = new THREE.BoxGeometry(0.36, 0.14, 0.78);
hull.translate(0, 0.02, 0.0);
const nose = new THREE.ConeGeometry(0.18, 0.24, 6, 1, true);
nose.rotateX(Math.PI / 2);
nose.translate(0, 0.02, 0.51);
const podL = new THREE.CylinderGeometry(0.07, 0.07, 0.62, 6, 1, true);
podL.rotateX(Math.PI / 2);
podL.translate(-0.26, -0.04, -0.05);
const podR = podL.clone();
podR.translate(0.52, 0, 0);
const fin = new THREE.BoxGeometry(0.06, 0.22, 0.16);
fin.translate(0, 0.18, -0.32);
const freighterGeo = mergeGeometries([hull, nose, podL, podR, fin], false);

const fighters = makeFleet(fighterGeo, fighterCount, 0.55);
const freighters = makeFleet(freighterGeo, freighterCount, 0.45);

const fighterData = new Array(fighterCount).fill(0).map(() => ({
  x: THREE.MathUtils.randFloatSpread(18),
  y: THREE.MathUtils.randFloatSpread(10),
  z0: THREE.MathUtils.randFloat(-62, 14),
  speed: THREE.MathUtils.randFloat(2.2, 6.0),
  yaw: THREE.MathUtils.randFloatSpread(Math.PI),
  roll: THREE.MathUtils.randFloatSpread(0.9),
  pitch: THREE.MathUtils.randFloatSpread(0.35),
  wobble: THREE.MathUtils.randFloat(0.6, 1.8),
}));

const freighterData = new Array(freighterCount).fill(0).map(() => ({
  x: THREE.MathUtils.randFloatSpread(20),
  y: THREE.MathUtils.randFloatSpread(12),
  z0: THREE.MathUtils.randFloat(-70, 10),
  speed: THREE.MathUtils.randFloat(1.2, 3.2),
  yaw: THREE.MathUtils.randFloatSpread(Math.PI),
  roll: THREE.MathUtils.randFloatSpread(0.4),
  pitch: THREE.MathUtils.randFloatSpread(0.2),
  wobble: THREE.MathUtils.randFloat(0.4, 1.2),
}));

applyInstanceColors(fighters, fighterCount, (i) => PALETTE[(i * 3) % PALETTE.length]);
applyInstanceColors(freighters, freighterCount, (i) => PALETTE[(i * 5 + 1) % PALETTE.length]);

// Satellites: small orbiting rigs attached to planets
const satsPerPlanet = 3;
const satelliteCount = planets.length * satsPerPlanet;
const satBody = new THREE.BoxGeometry(0.16, 0.12, 0.18);
const satDish = new THREE.CylinderGeometry(0.06, 0.02, 0.08, 10, 1, true);
satDish.rotateX(Math.PI / 2);
satDish.translate(0, 0.02, 0.12);
const satPanel = new THREE.BoxGeometry(0.34, 0.02, 0.14);
satPanel.translate(0.26, 0.0, 0.0);
const satPanel2 = satPanel.clone();
satPanel2.translate(-0.52, 0, 0);
const satelliteGeo = mergeGeometries([satBody, satDish, satPanel, satPanel2], false);
const satellites = makeFleet(satelliteGeo, satelliteCount, 0.5);

const satelliteData = [];
for (let p = 0; p < planets.length; p++) {
  for (let s = 0; s < satsPerPlanet; s++) {
    satelliteData.push({
      planet: p,
      radius: THREE.MathUtils.randFloat(1.2, 2.6) + s * 0.35,
      speed: THREE.MathUtils.randFloat(0.35, 0.8) * (Math.random() < 0.5 ? -1 : 1),
      phase: Math.random() * Math.PI * 2,
      incl: THREE.MathUtils.randFloat(-0.9, 0.9),
    });
  }
}
applyInstanceColors(satellites, satelliteCount, (i) => PALETTE[(i * 7 + 2) % PALETTE.length]);

// --- Sentinel (hover + click target) ---
const sentinel = new THREE.Group();
// Put the Sentinel deeper so Layer 2 feels different/earned.
sentinel.position.set(-2.8, 0.0, -38);
scene.add(sentinel);

const sentinelBody = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.28, 0.62, 6, 14),
  new THREE.MeshStandardMaterial({
    color: 0x0b0d16,
    roughness: 0.25,
    metalness: 0.45,
    emissive: new THREE.Color(0x9b7bff),
    emissiveIntensity: 0.22,
  }),
);
sentinelBody.position.y = 0.35;
sentinel.add(sentinelBody);

const eyeMat = new THREE.MeshBasicMaterial({ color: 0x8cffee });
const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), eyeMat);
const eyeR = eyeL.clone();
eyeL.position.set(-0.08, 0.55, 0.23);
eyeR.position.set(0.08, 0.55, 0.23);
sentinel.add(eyeL, eyeR);

const halo = new THREE.Mesh(
  new THREE.TorusGeometry(0.46, 0.012, 8, 120),
  new THREE.MeshBasicMaterial({ color: 0x8cffee, transparent: true, opacity: 0.55 }),
);
halo.rotation.x = Math.PI / 2;
halo.position.y = 0.82;
sentinel.add(halo);

// --- Pointer + Raycast for hover/click ---
const pointer = new THREE.Vector2(0, 0);
const raycaster = new THREE.Raycaster();
let sentinelHovered = false;

function setPointerFromEvent(e) {
  const x = (e.clientX / window.innerWidth) * 2 - 1;
  const y = -(e.clientY / window.innerHeight) * 2 + 1;
  pointer.set(x, y);
}

window.addEventListener("pointermove", (e) => {
  setPointerFromEvent(e);
});

window.addEventListener("click", (e) => {
  setPointerFromEvent(e);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(sentinel, true)[0];
  if (!hit) return;
  dialogueIndex = 0;
  if (holoText) holoText.textContent = DIALOGUE[dialogueIndex];
  setHoloOpen(true);
});

// --- Travel (scroll / swipe) ---
const travel = { target: 0, pos: 0 }; // 0..1

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function applyScrollDelta(deltaY) {
  // Deliberately strong so it feels interactive.
  const scale = Math.min(0.004, Math.max(0.0018, 1200 / (window.innerWidth * window.innerHeight)));
  travel.target = clamp01(travel.target + deltaY * scale);
}

window.addEventListener(
  "wheel",
  (e) => {
    applyScrollDelta(e.deltaY);
  },
  { passive: true },
);

let touchY = null;
window.addEventListener(
  "touchstart",
  (e) => {
    touchY = e.touches?.[0]?.clientY ?? null;
  },
  { passive: true },
);
window.addEventListener(
  "touchmove",
  (e) => {
    const y = e.touches?.[0]?.clientY ?? null;
    if (y == null || touchY == null) return;
    const dy = touchY - y;
    touchY = y;
    applyScrollDelta(dy * 10);
  },
  { passive: true },
);

function updateLayerUI() {
  if (!meter) return;
  meter.style.width = `${Math.round(travel.pos * 100)}%`;

  const layer = travel.pos < 0.34 ? 0 : travel.pos < 0.68 ? 1 : 2;
  if (!panelTitle || !panelBody) return;

  if (layer === 0) {
    panelTitle.textContent = "Layer 0 — Core";
    panelBody.textContent = "Drag to orbit the Atomic Core. Scroll / swipe to descend into wireframe space lanes.";
  } else if (layer === 1) {
    panelTitle.textContent = "Layer 1 — Space Lanes";
    panelBody.textContent = "Planets, ships, and satellites drift by. Hover the Sentinel to highlight it; click/tap to open a hologram.";
  } else {
    panelTitle.textContent = "Layer 2 — Boundary";
    panelBody.textContent = "The Sentinel guards the interface. This is where AI characters, dialogue, and missions plug in next.";
  }
}

// --- Resize ---
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
}
window.addEventListener("resize", resize);
resize();

// --- Animation ---
const clock = new THREE.Clock();
const tmpMat = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3(1, 1, 1);
const tmpPos = new THREE.Vector3();
const tmpLocal = new THREE.Vector3();
const tmpEuler = new THREE.Euler();

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.getElapsedTime();

  // Smooth travel
  travel.pos = THREE.MathUtils.lerp(travel.pos, travel.target, 1 - Math.pow(0.0008, dt));
  updateLayerUI();

  // Travel moves the OrbitControls target along a corridor.
  // IMPORTANT: translate camera + target together so OrbitControls still works.
  const desiredTarget = BASE_TARGET.clone().addScaledVector(TRAVEL_VEC, travel.pos);
  const delta = desiredTarget.sub(controls.target);
  controls.target.add(delta);
  camera.position.add(delta);

  // Core motion
  core.rotation.y = t * 0.25;
  core.rotation.x = Math.sin(t * 0.22) * 0.12;
  if (logoLayers.length) {
    // Subtle pulse so the logo reads as "alive".
    const pulse = 0.85 + 0.15 * (0.5 + 0.5 * Math.sin(t * 1.15));
    for (let i = 0; i < logoLayers.length; i++) {
      const mat = logoLayers[i].material;
      mat.emissiveIntensity = pulse * (0.75 + (1 - i / (logoLayers.length - 1)) * 0.55);
    }
  }

  // Planets: rotate + orbit-line drift
  for (const p of planets) {
    p.mesh.rotation.y += dt * p.spin;
    p.mesh.rotation.x += dt * (p.spin * 0.5);
    p.g.rotation.y += dt * (p.spin * 0.35);
    p.g.rotation.z = Math.sin(t * 0.2) * 0.05;
  }

  // Satellites: orbit their assigned planets (looping)
  for (let i = 0; i < satelliteCount; i++) {
    const s = satelliteData[i];
    const center = planets[s.planet].g.position;
    const a = t * s.speed + s.phase;
    tmpLocal.set(Math.cos(a) * s.radius, 0, Math.sin(a) * s.radius);
    tmpEuler.set(s.incl, a * 0.2, 0);
    tmpLocal.applyEuler(tmpEuler);
    tmpPos.copy(center).add(tmpLocal);

    // face tangent-ish
    tmpQuat.setFromEuler(new THREE.Euler(0, a + Math.PI / 2, 0));
    tmpMat.compose(tmpPos, tmpQuat, tmpScale);
    satellites.setMatrixAt(i, tmpMat);
  }
  satellites.instanceMatrix.needsUpdate = true;

  // Ships: fly forward through the scene (looping)
  const laneStart = -70;
  const laneEnd = 18;
  const laneLen = laneEnd - laneStart;
  for (let i = 0; i < fighterCount; i++) {
    const s = fighterData[i];
    const z = laneStart + ((s.z0 + t * s.speed + i * 1.3) % laneLen);
    const wobX = Math.sin(t * s.wobble + i) * 0.55;
    const wobY = Math.cos(t * (s.wobble * 0.85) + i) * 0.35;

    tmpPos.set(s.x + wobX, s.y + wobY, z);
    tmpQuat.setFromEuler(
      new THREE.Euler(
        s.pitch + Math.sin(t * 0.8 + i) * 0.12,
        s.yaw + Math.sin(t + i) * 0.15,
        s.roll + Math.sin(t * 1.2 + i) * 0.18,
      ),
    );
    tmpMat.compose(tmpPos, tmpQuat, tmpScale);
    fighters.setMatrixAt(i, tmpMat);
  }
  fighters.instanceMatrix.needsUpdate = true;

  for (let i = 0; i < freighterCount; i++) {
    const s = freighterData[i];
    const z = laneStart + ((s.z0 + t * s.speed + i * 2.0) % laneLen);
    const wobX = Math.sin(t * s.wobble + i) * 0.28;
    const wobY = Math.cos(t * (s.wobble * 0.85) + i) * 0.18;

    tmpPos.set(s.x + wobX, s.y + wobY, z);
    tmpQuat.setFromEuler(
      new THREE.Euler(
        s.pitch + Math.sin(t * 0.55 + i) * 0.08,
        s.yaw + Math.sin(t * 0.8 + i) * 0.09,
        s.roll + Math.sin(t * 0.7 + i) * 0.07,
      ),
    );
    tmpMat.compose(tmpPos, tmpQuat, tmpScale);
    freighters.setMatrixAt(i, tmpMat);
  }
  freighters.instanceMatrix.needsUpdate = true;

  // Hover highlight
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(sentinel, true)[0];
  const nextHovered = Boolean(hit);
  if (nextHovered !== sentinelHovered) {
    sentinelHovered = nextHovered;
    document.body.style.cursor = sentinelHovered ? "pointer" : "default";
  }

  // Visual feedback on hover (VERY obvious)
  const bodyMat = sentinelBody.material;
  bodyMat.emissiveIntensity = THREE.MathUtils.lerp(
    bodyMat.emissiveIntensity,
    sentinelHovered ? 0.75 : 0.22,
    1 - Math.pow(0.001, dt),
  );
  halo.material.opacity = THREE.MathUtils.lerp(
    halo.material.opacity,
    sentinelHovered ? 0.95 : 0.55,
    1 - Math.pow(0.001, dt),
  );

  // Sentinel float
  sentinel.position.y = 0.02 + Math.sin(t * 0.9) * 0.08;
  sentinel.rotation.y += dt * 0.2;

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// Start with help open once (so interaction is self-explanatory)
setHelpOpen(true);

