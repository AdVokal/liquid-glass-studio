# Liquid Glass Studio

A WebGL2-based liquid glass UI component system built with React, Vite, and Remotion. Supports both interactive real-time preview and high-quality video rendering at 3840×536 @ 60fps.

---

## Tech Stack

- **React 19** — UI and state
- **Vite 6** — Dev server and bundler
- **Remotion 4** — Frame-accurate video rendering
- **WebGL2** — Custom multi-pass GLSL rendering pipeline
- **React Spring** — Spring-based animation for both live and rendered motion
- **TypeScript** — Strict mode throughout
- **SCSS Modules** — Scoped component styles

---

## Running the Project

### Frontend (Vite dev server)

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173` (or next available port).

Interactive mode: drag the glass panel, click to expand/collapse, adjust all visual parameters via the settings sidebar (press `X` to toggle).

---

### Remotion Studio

```bash
npm run remotion:studio
```

Opens at `http://localhost:3000` (or next available port).

Remotion Studio plays back the animation timeline — the same glass component driven by deterministic frame-based spring easing instead of pointer input.

---

### Timeline Editor

```bash
cd timeline-editor
npm install
npm run dev
```

Opens at `http://localhost:5174`.

Spreadsheet-style editor for `timeline-data.json`. Edit frame numbers, actions, and params — click Save to write the file and trigger Remotion Studio hot-reload instantly.

Requires the Vite dev server (`:5173`) to be running for component registry autocomplete.

See `liquid-glass-studio-main/COMPONENT-CONVENTIONS.md` for how to add new Timeline-controllable components.

---

### One-command startup

```bash
# From Liquid Glass Test/
./start-all.sh   # starts Vite + Remotion Studio + Timeline Editor, opens 3 Chrome tabs
./stop-all.sh    # kills all three
```

---

### Rendering to Video

```bash
npm run remotion:render
```

Renders `Dashboard` composition to `~/Desktop/dashboard.mp4`.

- Resolution: 3840 × 536
- Frame rate: 60fps
- Duration: 360 frames (6 seconds)
- GL backend: ANGLE (hardware WebGL2 via Chromium)

---

## Key File Components

### Entry Points

| File | Role |
|------|------|
| `index.html` | HTML shell, mounts `#root` |
| `src/main.tsx` | React root, renders `<App />` |
| `src/App.tsx` | Main component — handles both live and Remotion modes |
| `src/remotion/index.ts` | Registers Remotion compositions |
| `src/remotion/Root.tsx` | Defines `Dashboard` composition (3840×536, 60fps, 360 frames) |
| `src/remotion/DashboardComposition.tsx` | Animation timeline — drives `<App />` via frame-based spring |

### Core Logic

| File | Role |
|------|------|
| `src/utils/GLUtils.ts` | Full WebGL2 engine: `ShaderProgram`, `FrameBuffer`, `RenderPass`, `MultiPassRenderer` |
| `src/utils/index.ts` | Gaussian blur kernel computation |
| `src/config/designSystem.ts` | Global constants: canvas size (3840×536), grid (60px), corner radii, spacing |
| `src/remotion/timeline.ts` | `TimelineState` type shared between Remotion and App |

### GLSL Shaders (multi-pass pipeline)

| File | Role |
|------|------|
| `src/shaders/vertex.glsl` | Fullscreen quad vertex shader, outputs UV coords |
| `src/shaders/fragment-bg.glsl` | Pass 1: Draws background texture + shadow SDF |
| `src/shaders/fragment-bg-vblur.glsl` | Pass 2: Vertical Gaussian blur |
| `src/shaders/fragment-bg-hblur.glsl` | Pass 3: Horizontal Gaussian blur |
| `src/shaders/fragment-main.glsl` | Pass 4: Full glass effect (refraction, Fresnel, glare, tint, chromatic aberration) |

### Styles

| File | Role |
|------|------|
| `src/index.scss` | Global resets and root styles |
| `src/App.module.scss` | Scoped styles for viewport, canvas container, panel overlay, settings panel |

### Config

| File | Role |
|------|------|
| `vite.config.ts` | React SWC, tsconfig path aliases, host: `0.0.0.0` |
| `remotion.config.ts` | ANGLE GL backend, webpack GLSL loader, SCSS modules |
| `tsconfig.app.json` | ES2020, strict, DOM libs |

---

## WebGL Rendering Pipeline

Four sequential render passes:

```
Pass 1: fragment-bg.glsl
  → Background texture + SDF shadow → Framebuffer A

Pass 2: fragment-bg-vblur.glsl
  → Framebuffer A (vertical blur) → Framebuffer B

Pass 3: fragment-bg-hblur.glsl
  → Framebuffer B (horizontal blur) → Framebuffer C

Pass 4: fragment-main.glsl
  → Framebuffer A (unblurred) + Framebuffer C (blurred) → Screen
```

The main pass composes the final glass effect using both the sharp and blurred backgrounds to simulate the glass frosting and refraction distortion.

---

## Scripts

```bash
npm run dev              # Vite dev server
npm run build            # TypeScript compile + Vite production build
npm run preview          # Preview production build
npm run lint             # ESLint
npm run remotion:studio  # Remotion Studio (interactive timeline preview)
npm run remotion:render  # Render Dashboard to ~/Desktop/dashboard.mp4
```
