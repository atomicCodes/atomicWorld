# Atomic Codes — Futuristic Interactive 3D (Three.js)

A runnable starter for a futuristic “Atomic Codes” brand experience:

- Atomic nucleus centerpiece + electron rings
- Floating “code particles” tunnel (shader points)
- Bloom/glow postprocessing
- GLB-ready “Code Sentinel” character (fallback included)
- Mouse + scroll + touch travel through “code layers”
- Holographic HUD UI overlay

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

## Add an AI-generated character

1. Export your character as **GLB**.
2. Put it here:
   - `public/assets/characters/code-sentinel.glb`
3. Reload the page.

If the file is missing, a procedural sentinel renders so the scene still works.

## Where things live

- `index.html`: Landing page + HUD layout
- `src/main.js`: Three.js scene, postprocessing, interactions, GLB loading
- `src/ui.js`: Dialogue hologram UI behavior
- `src/style.css`: HUD styling (glass/neon)
- `docs/ai/prompts.md`: AI prompts + practical asset pipeline
- `public/assets/`: Drop models/textures/audio here

## Roadmap (practical next expansions)

- **AI dialogue**: Replace canned lines with a lightweight dialogue system + optional API.
- **Procedural shaders**: Atomic “code glyph” material + distortion fields.
- **Audio**: Add a loop + positional cues (with user gesture gate on mobile).
- **Performance**: GPU instancing for “glyph meshes”, LOD, dynamic quality auto-detect.
- **React/Three Fiber**: Keep the scene graph modules; move UI to React.

