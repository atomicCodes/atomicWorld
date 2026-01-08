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

// --- Wireframe Universe: stars + planets + ships ---
const universe = new THREE.Group();
scene.add(universe);

// Stars (simple points field)
{
  const px = window.innerWidth * window.innerHeight;
  const farCount = Math.min(5200, Math.max(2200, Math.floor(px / 380)));
  const nearCount = Math.min(1600, Math.max(600, Math.floor(px / 1500)));

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

  universe.add(makeStarField(farCount, { x: 120, y: 80 }, -180, 40, 0.045, 0.62, 0xbfefff));
  universe.add(makeStarField(nearCount, { x: 85, y: 60 }, -120, 30, 0.085, 0.85, 0xffffff));
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
addPlanet({ r: 0.55, x: -4.8, y: 1.4, z: -6, color: 0xbfefff, ring: false, segW: 10, segH: 8, opacity: 0.45 });
addPlanet({ r: 0.7, x: 3.8, y: -1.1, z: -8.5, color: 0x9b7bff, ring: false, segW: 10, segH: 8, opacity: 0.48 });

// Layer 1 cluster
addPlanet({ r: 1.15, x: 6.5, y: 1.6, z: -16, color: 0x8cffee, ring: true, segW: 12, segH: 10 });
addPlanet({ r: 1.75, x: -8.0, y: -1.2, z: -26, color: 0x9b7bff, ring: false, segW: 12, segH: 10 });
addPlanet({ r: 1.05, x: -1.2, y: 2.8, z: -24, color: 0xbfefff, ring: false, segW: 11, segH: 9, opacity: 0.58 });

// Layer 2 cluster (deeper)
addPlanet({ r: 0.95, x: 4.4, y: -2.3, z: -36, color: 0xbfefff, ring: false, segW: 11, segH: 9 });
addPlanet({ r: 2.2, x: 10.2, y: 2.2, z: -54, color: 0x8cffee, ring: true, segW: 12, segH: 10, opacity: 0.55 });
addPlanet({ r: 1.35, x: -10.5, y: 1.8, z: -48, color: 0x9b7bff, ring: true, segW: 12, segH: 10, opacity: 0.5 });
addPlanet({ r: 1.9, x: 0.5, y: -2.4, z: -62, color: 0xbfefff, ring: false, segW: 12, segH: 10, opacity: 0.5 });

// Ships (wireframe instanced)
const shipCount = Math.min(220, Math.max(120, Math.floor((window.innerWidth * window.innerHeight) / 7000)));
// Build a simple recognizable spacecraft silhouette (fuselage + wings + tail + engine).
const fuselage = new THREE.ConeGeometry(0.14, 0.7, 6, 1, true);
fuselage.rotateX(Math.PI / 2);
fuselage.translate(0, 0, 0.15);

const cockpit = new THREE.SphereGeometry(0.12, 8, 6);
cockpit.translate(0, 0.03, 0.33);

const wing = new THREE.BoxGeometry(0.62, 0.03, 0.22);
wing.translate(0, 0.02, 0.12);

const tail = new THREE.BoxGeometry(0.18, 0.06, 0.22);
tail.translate(0, 0.08, -0.14);

const engine = new THREE.CylinderGeometry(0.07, 0.07, 0.26, 6, 1, true);
engine.rotateX(Math.PI / 2);
engine.translate(0, -0.02, -0.2);

const shipGeo = mergeGeometries([fuselage, cockpit, wing, tail, engine], false);
const shipMat = new THREE.MeshBasicMaterial({
  color: 0x8cffee,
  wireframe: true,
  transparent: true,
  opacity: 0.5,
});
const ships = new THREE.InstancedMesh(shipGeo, shipMat, shipCount);
ships.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
universe.add(ships);

const shipData = new Array(shipCount).fill(0).map(() => ({
  x: THREE.MathUtils.randFloatSpread(18),
  y: THREE.MathUtils.randFloatSpread(10),
  z0: THREE.MathUtils.randFloat(-62, 14),
  speed: THREE.MathUtils.randFloat(2.2, 6.0),
  yaw: THREE.MathUtils.randFloatSpread(Math.PI),
  roll: THREE.MathUtils.randFloatSpread(0.9),
  pitch: THREE.MathUtils.randFloatSpread(0.35),
  wobble: THREE.MathUtils.randFloat(0.6, 1.8),
  hue: THREE.MathUtils.randFloat(0.48, 0.62),
}));

const shipColors = new Float32Array(shipCount * 3);
for (let i = 0; i < shipCount; i++) {
  const c = new THREE.Color().setHSL(shipData[i].hue, 0.95, 0.62);
  shipColors[i * 3 + 0] = c.r;
  shipColors[i * 3 + 1] = c.g;
  shipColors[i * 3 + 2] = c.b;
}
ships.instanceColor = new THREE.InstancedBufferAttribute(shipColors, 3);

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
    panelBody.textContent = "Wireframe planets and ships drift by. Hover the Sentinel to highlight it; click/tap to open a hologram.";
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

  nucleus.children.forEach((m, i) => {
    const s = 1 + Math.sin(t * 1.8 + i) * 0.03;
    m.scale.setScalar(s);
  });

  // Planets: rotate + orbit-line drift
  for (const p of planets) {
    p.mesh.rotation.y += dt * p.spin;
    p.mesh.rotation.x += dt * (p.spin * 0.5);
    p.g.rotation.y += dt * (p.spin * 0.35);
    p.g.rotation.z = Math.sin(t * 0.2) * 0.05;
  }

  // Ships: fly forward through the scene (looping)
  const laneStart = -70;
  const laneEnd = 18;
  const laneLen = laneEnd - laneStart;
  for (let i = 0; i < shipCount; i++) {
    const s = shipData[i];
    const z = laneStart + ((s.z0 + t * s.speed + i * 0.9) % laneLen);
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
    ships.setMatrixAt(i, tmpMat);
  }
  ships.instanceMatrix.needsUpdate = true;

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

