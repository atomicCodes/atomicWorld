import "./style.css";

import * as THREE from "three";
import { gsap } from "gsap";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { createUI } from "./ui.js";

// --- Core config (tweak for perf & mobile) ---
const QUALITY = {
  high: { pixelRatioCap: 2, bloomStrength: 1.25, bloomRadius: 0.35, bloomThreshold: 0.18 },
  low: { pixelRatioCap: 1.25, bloomStrength: 0.85, bloomRadius: 0.22, bloomThreshold: 0.22 },
};

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function isSmallScreen() {
  return Math.min(window.innerWidth, window.innerHeight) < 720;
}

let qualityMode = isSmallScreen() ? "low" : "high";

// --- Scene ---
const canvas = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060713, 0.045);

const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 180);
camera.position.set(0, 0.6, 8.5);

// Lighting: neon-ish with contrast
scene.add(new THREE.HemisphereLight(0x99c6ff, 0x05060b, 0.6));
const key = new THREE.PointLight(0x8cffee, 2.0, 40, 2);
key.position.set(2.2, 2.3, 3.2);
scene.add(key);
const rim = new THREE.PointLight(0x9b7bff, 1.6, 50, 2);
rim.position.set(-4.0, 1.3, -6.0);
scene.add(rim);

// --- Postprocessing (bloom) ---
let composer = null;
let bloomPass = null;
function setupComposer() {
  const { bloomStrength, bloomRadius, bloomThreshold } = QUALITY[qualityMode];
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    bloomStrength,
    bloomRadius,
    bloomThreshold,
  );
  composer.addPass(bloomPass);
}
setupComposer();

// --- Atomic Core (nucleus + electron rings) ---
const core = new THREE.Group();
scene.add(core);

const nucleusMat = new THREE.MeshStandardMaterial({
  color: 0x0e111f,
  emissive: new THREE.Color(0x8cffee),
  emissiveIntensity: 0.85,
  roughness: 0.22,
  metalness: 0.25,
});

const nucleus = new THREE.Group();
for (let i = 0; i < 10; i++) {
  const r = THREE.MathUtils.randFloat(0.12, 0.22);
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), nucleusMat);
  m.position.set(
    THREE.MathUtils.randFloatSpread(0.55),
    THREE.MathUtils.randFloatSpread(0.45),
    THREE.MathUtils.randFloatSpread(0.55),
  );
  nucleus.add(m);
}
core.add(nucleus);

// Electron rings
const ringMat = new THREE.LineBasicMaterial({
  color: 0x9b7bff,
  transparent: true,
  opacity: 0.35,
});

function makeRing(radius = 1.7, tilt = 0, phase = 0) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius * 0.62, 0, Math.PI * 2, false, phase);
  const pts = curve.getPoints(220).map((p) => new THREE.Vector3(p.x, 0, p.y));
  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.LineLoop(geom, ringMat);
  line.rotation.set(tilt, phase, tilt * 0.6);
  return line;
}

const ringA = makeRing(1.6, 0.65, 0.2);
const ringB = makeRing(2.0, -0.5, 1.2);
const ringC = makeRing(2.35, 0.15, 2.1);
core.add(ringA, ringB, ringC);

// Electron "spark" dots
const electronMat = new THREE.MeshBasicMaterial({ color: 0x8cffee });
const electronGeo = new THREE.SphereGeometry(0.05, 16, 16);
const electrons = [
  { mesh: new THREE.Mesh(electronGeo, electronMat), r: 1.6, speed: 0.9, axis: new THREE.Vector3(1, 0.2, 0.7).normalize() },
  { mesh: new THREE.Mesh(electronGeo, electronMat), r: 2.0, speed: 0.65, axis: new THREE.Vector3(-0.6, 1, 0.1).normalize() },
  { mesh: new THREE.Mesh(electronGeo, electronMat), r: 2.35, speed: 0.5, axis: new THREE.Vector3(0.2, 0.4, 1).normalize() },
];
electrons.forEach((e) => core.add(e.mesh));

// --- Code particles (floating glyph-like points) ---
const particleCount = isSmallScreen() ? 1600 : 3200;
const particleGeom = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const seeds = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
  const i3 = i * 3;
  // place in a long "tunnel" so scroll feels like moving through layers
  positions[i3 + 0] = THREE.MathUtils.randFloatSpread(10);
  positions[i3 + 1] = THREE.MathUtils.randFloatSpread(6);
  positions[i3 + 2] = THREE.MathUtils.randFloat(-36, 10);

  const c = new THREE.Color().setHSL(THREE.MathUtils.randFloat(0.5, 0.62), 0.9, 0.6);
  colors[i3 + 0] = c.r;
  colors[i3 + 1] = c.g;
  colors[i3 + 2] = c.b;

  seeds[i] = Math.random();
}

particleGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
particleGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
particleGeom.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));

const particleMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexColors: true,
  uniforms: {
    uTime: { value: 0 },
    uParallax: { value: new THREE.Vector2(0, 0) },
    uPointSize: { value: isSmallScreen() ? 2.4 : 2.9 },
  },
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform vec2 uParallax;
    uniform float uPointSize;
    attribute float seed;
    varying vec3 vColor;
    varying float vAlpha;

    float hash(float n){ return fract(sin(n)*43758.5453123); }

    void main() {
      vColor = color;
      vec3 p = position;

      // gentle drift & "data current"
      float t = uTime * 0.35 + seed * 10.0;
      p.x += (sin(t * 1.3) * 0.25 + sin(t * 0.55) * 0.18);
      p.y += (cos(t * 1.1) * 0.22 + cos(t * 0.33) * 0.16);

      // parallax distortion from pointer
      p.x += uParallax.x * (0.55 + seed);
      p.y += uParallax.y * (0.45 + seed);

      // depth-based alpha
      float zFade = smoothstep(-38.0, -8.0, p.z);
      vAlpha = 0.10 + 0.55 * zFade;

      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // perspective size
      float size = uPointSize * (1.0 + 1.4 * hash(seed * 100.0));
      gl_PointSize = size * (420.0 / -mvPosition.z);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      float a = smoothstep(0.5, 0.12, d);
      vec3 col = vColor * (1.2 - d);
      gl_FragColor = vec4(col, a * vAlpha);
    }
  `,
});

const particles = new THREE.Points(particleGeom, particleMat);
scene.add(particles);

// --- Holo UI plane in 3D (subtle) ---
const holo = new THREE.Mesh(
  new THREE.PlaneGeometry(2.2, 1.2, 1, 1),
  new THREE.MeshBasicMaterial({
    color: 0x8cffee,
    transparent: true,
    opacity: 0.06,
    blending: THREE.AdditiveBlending,
  }),
);
holo.position.set(2.6, 0.7, 3.2);
holo.rotation.y = -0.35;
scene.add(holo);

// --- AI Character (GLB-ready): Code Sentinel ---
const sentinel = new THREE.Group();
sentinel.name = "CodeSentinel";
sentinel.position.set(-2.4, -0.1, 3.0);
scene.add(sentinel);

function buildSentinelFallback() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.62, 6, 14),
    new THREE.MeshStandardMaterial({
      color: 0x0b0d16,
      roughness: 0.25,
      metalness: 0.45,
      emissive: new THREE.Color(0x9b7bff),
      emissiveIntensity: 0.18,
    }),
  );
  body.position.y = 0.35;
  g.add(body);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x8cffee });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.08, 0.55, 0.23);
  eyeR.position.set(0.08, 0.55, 0.23);
  g.add(eyeL, eyeR);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.012, 8, 120),
    new THREE.MeshBasicMaterial({ color: 0x8cffee, transparent: true, opacity: 0.45 }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.8;
  g.add(halo);

  return g;
}

async function loadSentinelGLB() {
  const loader = new GLTFLoader();
  // Drop your AI-generated model here:
  // public/assets/characters/code-sentinel.glb
  const url = "/assets/characters/code-sentinel.glb";
  return await new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => reject(err),
    );
  });
}

async function mountSentinel() {
  sentinel.clear();
  try {
    const model = await loadSentinelGLB();
    model.traverse((o) => {
      // Encourage emissive look if AI pipeline exports maps.
      if (o.isMesh && o.material) {
        o.material.emissiveIntensity = o.material.emissiveIntensity ?? 0.9;
      }
      o.castShadow = false;
      o.receiveShadow = false;
    });
    model.scale.setScalar(1.0);
    sentinel.add(model);
  } catch {
    sentinel.add(buildSentinelFallback());
  }
}
mountSentinel();

// --- Interaction state ---
const ui = createUI();
const layerTitleEl = document.getElementById("layerTitle");
const layerBodyEl = document.getElementById("layerBody");
const travelBarEl = document.getElementById("travelBar");

const pointer = {
  x: 0,
  y: 0,
  nx: 0,
  ny: 0,
  down: false,
};

const scroll = { target: 0, pos: 0 }; // 0..1, smoothed
let qualityToastCooldown = 0;

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function setScrollTargetFromDelta(deltaY) {
  // Make travel very noticeable (the prior values were too subtle).
  const scale = isSmallScreen() ? 0.0028 : 0.0022;
  scroll.target = clamp01(scroll.target + deltaY * scale);
}

// wheel (desktop)
window.addEventListener(
  "wheel",
  (e) => {
    setScrollTargetFromDelta(e.deltaY);
  },
  { passive: true },
);

// touch (mobile)
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
    setScrollTargetFromDelta(dy * 10);
  },
  { passive: true },
);

// pointer
function setPointerFromEvent(e) {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ny = (e.clientY / window.innerHeight) * 2 - 1;
}

window.addEventListener("pointermove", (e) => setPointerFromEvent(e));
window.addEventListener("pointerdown", () => (pointer.down = true));
window.addEventListener("pointerup", () => (pointer.down = false));

// Raycast click on sentinel
const raycaster = new THREE.Raycaster();
function pickSentinel(ndcX, ndcY) {
  raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);
  const hits = raycaster.intersectObject(sentinel, true);
  return hits.length ? hits[0] : null;
}

window.addEventListener("click", (e) => {
  // IMPORTANT: Use the actual click coordinates (previously this relied on the
  // last pointermove, so clicks often did nothing).
  setPointerFromEvent(e);
  const hit = pickSentinel(pointer.nx, -pointer.ny);
  if (!hit) return;
  ui.openDialogue();
  gsap.to(sentinel.rotation, { y: sentinel.rotation.y + Math.PI * 2, duration: 1.1, ease: "power2.out" });
});

ui.bindButtonActions((action) => {
  if (action === "focus-core") {
    gsap.to(scroll, { target: 0.05, duration: 0.6, overwrite: true, ease: "power2.out" });
  }

  if (action === "summon-sentinel") {
    ui.openDialogue();
    gsap.fromTo(
      sentinel.position,
      { y: sentinel.position.y - 0.2 },
      { y: sentinel.position.y, duration: 0.7, ease: "power2.out" },
    );
  }

  if (action === "toggle-quality") {
    qualityMode = qualityMode === "high" ? "low" : "high";
    setupComposer();
    qualityToastCooldown = 2.0;
  }
});

// Camera choreography: move through layers on scroll
const camBase = new THREE.Vector3(0, 0.6, 8.5);
const camTravel = new THREE.Vector3(0.25, 0.55, -44.0); // bigger travel so it feels interactive

// Resize
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  const { pixelRatioCap } = QUALITY[qualityMode];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.setSize(w, h, false);
  composer?.setSize(w, h);
  bloomPass?.setSize(w, h);
}
window.addEventListener("resize", resize);
resize();

// --- Animation loop ---
const clock = new THREE.Clock();

// Intro animation
if (!prefersReducedMotion()) {
  core.scale.setScalar(0.85);
  gsap.to(core.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: "power3.out", delay: 0.1 });
}

function animate() {
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();

  // Smooth scroll
  scroll.pos = THREE.MathUtils.lerp(scroll.pos, scroll.target, 1 - Math.pow(0.0008, dt));
  const travel = camTravel.clone().multiplyScalar(scroll.pos);
  camera.position.copy(camBase).add(travel);

  // Visual feedback: travel meter + narrative layer text
  if (travelBarEl) travelBarEl.style.width = `${Math.round(scroll.pos * 100)}%`;
  const layer =
    scroll.pos < 0.33 ? 0 :
    scroll.pos < 0.66 ? 1 :
    2;
  if (layerTitleEl && layerBodyEl) {
    if (layer === 0) {
      layerTitleEl.textContent = "Layer 0 — Atomic Core";
      layerBodyEl.textContent =
        "You’re in the nucleus chamber. Pointer movement bends the field; scroll moves you through the code stream.";
    } else if (layer === 1) {
      layerTitleEl.textContent = "Layer 1 — Code Stream";
      layerBodyEl.textContent =
        "Data glyphs thicken. The core becomes a beacon. Scroll deeper to approach the Sentinel boundary process.";
    } else {
      layerTitleEl.textContent = "Layer 2 — Sentinel Boundary";
      layerBodyEl.textContent =
        "Click/tap the Sentinel to open a hologram. Drop a GLB at public/assets/characters/code-sentinel.glb to replace the placeholder.";
    }
  }

  // subtle look-at: towards core + drift
  const look = new THREE.Vector3(
    THREE.MathUtils.lerp(0, pointer.nx * 1.1, 0.35),
    THREE.MathUtils.lerp(0.2, -pointer.ny * 0.55 + 0.2, 0.35),
    THREE.MathUtils.lerp(0, -6.0 * scroll.pos, 0.35),
  );
  camera.lookAt(look);

  // Core animation
  core.rotation.y = t * 0.22;
  core.rotation.x = Math.sin(t * 0.21) * 0.12;

  nucleus.children.forEach((m, i) => {
    const s = 1 + Math.sin(t * 1.7 + i) * 0.03;
    m.scale.setScalar(s);
  });

  electrons.forEach((e, idx) => {
    const a = t * e.speed + idx;
    const q = new THREE.Quaternion().setFromAxisAngle(e.axis, a);
    const v = new THREE.Vector3(e.r, 0, 0).applyQuaternion(q);
    e.mesh.position.copy(v);
  });

  // Sentinel float / presence
  sentinel.position.y = -0.1 + Math.sin(t * 0.9) * 0.08;
  sentinel.rotation.y += dt * 0.15;

  // Particle parallax
  particleMat.uniforms.uTime.value = t;
  particleMat.uniforms.uParallax.value.set(pointer.nx * 1.1, -pointer.ny * 0.85);

  // Subtle holo panel
  holo.material.opacity = 0.04 + 0.02 * (0.5 + 0.5 * Math.sin(t * 1.2));

  // Quality hint via document title (minimal, no extra UI)
  if (qualityToastCooldown > 0) {
    qualityToastCooldown -= dt;
    document.title = `Atomic Codes — ${qualityMode.toUpperCase()} quality`;
  } else if (document.title !== "Atomic Codes — Interactive 3D") {
    document.title = "Atomic Codes — Interactive 3D";
  }

  composer.render();
  requestAnimationFrame(animate);
}
animate();

