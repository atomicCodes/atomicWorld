# Atomic Codes — AI Art & Character Prompts (Starter)

This project is set up to **load an AI-generated character** from:

- `public/assets/characters/code-sentinel.glb`

If the file is missing, a procedural fallback sentinel is used so the site remains runnable.

## Character concept: “Code Sentinel”

### Model prompt (for image → 3D reference)

Use this to generate front/side/3-4 angle sheets for Blender/Meshy/Kaedim.

> Futuristic AI humanoid guardian made of atomic energy and holographic circuitry, emissive neon eyes, translucent polymer + carbon fiber armor plates, micro glyphs floating around the face, cyber-quantum aesthetic, cinematic rim light, high detail, clean silhouette, symmetrical, concept art turnaround, dark sci‑fi background, teal + violet glow, 4k.

### Texture prompts (PBR/emissive maps)

- **Emissive mask**
  > abstract circuit glyphs, quantum runes, sharp linework, teal emissive on black, high contrast, tileable, 4k, no shading

- **Albedo**
  > matte black polymer, subtle anisotropic microtexture, sci‑fi armor material, tileable, neutral lighting, 4k

- **Normal**
  > micro panels, beveled seams, subtle surface noise, tileable normal map, 4k

## Environment prompts: “Atomic Codes world”

### Hero background plates (optional)

> futuristic quantum datascape, floating atomic symbols, energy streams, neon fog, volumetric rays, teal/violet palette, minimal clutter, cinematic wide shot, high contrast, 4k.

### Holographic UI panels

> sci‑fi HUD interface, holographic glass, thin line glyphs, teal + violet accents, minimal typography, high readability, transparent background, 4k.

## Practical pipeline (recommended)

- **Step 1**: Generate concept sheets (front/side/3-4 angle).
- **Step 2**: Convert to 3D:
  - Meshy / Kaedim / manual Blender modeling.
- **Step 3**: UV unwrap + bake.
- **Step 4**: Author PBR + emissive maps (Substance / Blender).
- **Step 5**: Export **GLB** (draco optional later) and place as:
  - `public/assets/characters/code-sentinel.glb`
- **Step 6**: Validate in-browser; tune emissive intensity in `src/main.js`.

