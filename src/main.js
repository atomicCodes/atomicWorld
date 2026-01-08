import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Build/version badge (so you always know what you're looking at)
// These constants are injected by `vite.config.js`.
const buildBadge = document.getElementById("buildBadge");
try {
  // eslint-disable-next-line no-undef
  const starter = __ATOMIC_CODES_STARTER__;
  // eslint-disable-next-line no-undef
  const sha = __ATOMIC_CODES_GIT_SHA__;
  // eslint-disable-next-line no-undef
  const builtAt = __ATOMIC_CODES_BUILT_AT__;
  if (buildBadge) buildBadge.innerHTML = `BUILD: <b>${starter}</b> · ${sha} · ${builtAt}`;
} catch {
  if (buildBadge) buildBadge.textContent = "BUILD: UNKNOWN";
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

btnReset?.addEventListener("click", () => {
  camera.position.set(0, 0.6, 7.5);
  controls.target.set(0, 0.25, 0);
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

const nucleusMat = new THREE.MeshStandardMaterial({
  color: 0x0b0d16,
  emissive: new THREE.Color(0x8cffee),
  emissiveIntensity: 0.85,
  roughness: 0.25,
  metalness: 0.25,
});

const nucleus = new THREE.Group();
for (let i = 0; i < 12; i++) {
  const r = THREE.MathUtils.randFloat(0.12, 0.24);
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), nucleusMat);
  m.position.set(
    THREE.MathUtils.randFloatSpread(0.62),
    THREE.MathUtils.randFloatSpread(0.5),
    THREE.MathUtils.randFloatSpread(0.62),
  );
  nucleus.add(m);
}
core.add(nucleus);

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

// --- Code tunnel (simple instanced shards) ---
// This is intentionally NOT a shader yet: it’s readable, fast, and makes interaction obvious.
const shardGeo = new THREE.PlaneGeometry(0.35, 0.08);
const shardMat = new THREE.MeshBasicMaterial({
  color: 0x8cffee,
  transparent: true,
  opacity: 0.35,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const shardCount = Math.min(1800, Math.max(900, Math.floor((window.innerWidth * window.innerHeight) / 900)));
const shards = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(shards);

const shardData = new Array(shardCount).fill(0).map(() => ({
  pos: new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(10),
    THREE.MathUtils.randFloatSpread(6),
    THREE.MathUtils.randFloat(-55, 12),
  ),
  rot: new THREE.Euler(0, THREE.MathUtils.randFloat(0, Math.PI * 2), 0),
  spin: THREE.MathUtils.randFloat(0.2, 1.4) * (Math.random() < 0.5 ? -1 : 1),
  hue: THREE.MathUtils.randFloat(0.48, 0.62),
  tw: THREE.MathUtils.randFloat(0.6, 1.4),
}));

// Per-instance color
const colors = new Float32Array(shardCount * 3);
for (let i = 0; i < shardCount; i++) {
  const c = new THREE.Color().setHSL(shardData[i].hue, 0.95, 0.62);
  colors[i * 3 + 0] = c.r;
  colors[i * 3 + 1] = c.g;
  colors[i * 3 + 2] = c.b;
}
shards.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

// --- Sentinel (hover + click target) ---
const sentinel = new THREE.Group();
sentinel.position.set(-2.4, 0.0, 2.6);
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
    panelBody.textContent = "Drag to orbit the Atomic Core. Scroll / swipe to descend into the code stream.";
  } else if (layer === 1) {
    panelTitle.textContent = "Layer 1 — Code Stream";
    panelBody.textContent = "The glyph shards thicken. Hover the Sentinel to highlight it; click/tap to open a hologram.";
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

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.getElapsedTime();

  // Smooth travel
  travel.pos = THREE.MathUtils.lerp(travel.pos, travel.target, 1 - Math.pow(0.0008, dt));
  updateLayerUI();

  // Move the whole world backwards as you travel (clear, no magic)
  const worldZ = THREE.MathUtils.lerp(0, -42, travel.pos);
  scene.position.z = worldZ;

  // Core motion
  core.rotation.y = t * 0.25;
  core.rotation.x = Math.sin(t * 0.22) * 0.12;

  nucleus.children.forEach((m, i) => {
    const s = 1 + Math.sin(t * 1.8 + i) * 0.03;
    m.scale.setScalar(s);
  });

  // Shards: billboarding + drift + pointer sway via camera direction
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  for (let i = 0; i < shardCount; i++) {
    const d = shardData[i];
    d.rot.y += d.spin * dt * 0.35;
    const bob = Math.sin(t * d.tw + i * 0.07) * 0.012;
    const p = d.pos;

    // gentle “stream” motion
    const driftX = Math.sin(t * 0.7 + i) * 0.002;
    const driftY = Math.cos(t * 0.6 + i) * 0.002;

    tmpQuat.setFromEuler(new THREE.Euler(0, d.rot.y, 0));
    tmpMat.compose(
      new THREE.Vector3(p.x + driftX, p.y + driftY + bob, p.z),
      tmpQuat,
      tmpScale,
    );
    shards.setMatrixAt(i, tmpMat);
  }
  shards.instanceMatrix.needsUpdate = true;

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

