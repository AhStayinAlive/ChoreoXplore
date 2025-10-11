## Tech & Pose Audit

- **Framework**: Vite + React (R3F)
  - Vite: `vite.config.js` present; scripts: dev/build/preview
  - React 19; JSX throughout `src/`
  - Tailwind via `@tailwindcss/vite`
- **Language**: JavaScript (ESM) with some TS readiness; no repo-wide TS yet
- **Rendering**: Three.js via @react-three/fiber (R3F)
  - Scene root: `src/render/Canvas3D.jsx`
  - Custom shader materials in `src/components/AmbientBackgroundAnimation.jsx`, `src/components/ShaderDistortion.jsx`
  - Postprocessing installed but not central in scene
- **Shader system**: Custom GLSL in THREE.ShaderMaterial; `@funtech-inc/use-shader-fx` is installed and used via `useFluid` in `ShaderDistortion.jsx` (no centralized shader-stage yet)

### Pose Module Overview
- **Entry points**:
  - UI-driven pipeline: `src/components/MotionInputPanel.jsx`
    - Initializes MediaPipe Tasks Vision PoseLandmarker (Heavy, GPU delegate)
    - Pulls frames from `<video>` and runs `detectForVideo`
    - Emits pose to:
      - Global hook store: `usePoseDetection()` (local global in `src/hooks/usePoseDetection.jsx`)
      - Zustand store via `useStore().setPoseData()` for render consumption
      - Draws landmarks to an overlay `<canvas>` (debug)
  - Legacy/fallback loop: `src/core/pose.js` (rxjs `pose$`, mock if camera unavailable)
    - Not the primary path; kept as a fallback/mock stream

- **Landmarks**:
  - MediaPipe 33-keypoint 2D landmarks: `results.landmarks[0]`
  - Optional `worldLandmarks` forwarded if present

- **Smoothing**:
  - None applied to landmarks by default in `MotionInputPanel.jsx`
  - Some downstream mapping applies dead-zones and clamping (e.g., `mapPoseToMotion`), but no EMA/One-Euro in current pipeline

- **Computed features present today**:
  - `src/core/motionMapping.js`
    - Center of mass, bounding box scale, shoulder-axis rotation, simple velocity estimate (frame-to-frame center delta), and an intensity heuristic (shoulder + wrist span)
  - `src/engine/poseFeatures.js`
    - Joint angles (elbows/knees), arm span; `speed` placeholder currently 0; `sharpness` derived from joint angles

- **State management**:
  - Zustand stores
    - `src/core/store.js`: app/UI state (mode, fps, palette, reactivity, poseData)
    - `src/state/useVisStore.js`: Irina/visuals params (`musicReact`, `motionReact`, `isActive`)
  - RxJS used in some core flows (`pose$`, `motionData$`)

### Notes for Integration with use-shader-fx
- Library installed: `@funtech-inc/use-shader-fx@^2.0.5`
- Existing usage: `useFluid` in `src/components/ShaderDistortion.jsx`
- No central Shader Stage abstraction yet; recommended to add `ShaderStage` that:
  - mounts a selected preset (start with "cream" or a fluid-based fallback)
  - exposes a uniform adapter layer for pointer and pose-driven uniforms

### Gaps vs. Target Contract
- Missing smoothing (EMA/One-Euro) for landmarks, velocities, accents
- No normalized `uJoints` Float32Array (length 66) exposed to shaders
- No `uBodySpeed`, `uExpand`, `uAccent` as normalized 0..1 metrics
- No shared uniform types/contracts exported for shader effects

### Recommended Next Steps
- Create a shared uniform contract module (`src/shader/uniforms.ts`) to define:
  - PointerUniforms, PoseUniforms, ReactivityUniforms, TimeUniforms, CommonUniforms
- Implement `ShaderStage` using `@funtech-inc/use-shader-fx` (cream-like), with per-frame uniform updates
- Cursor-first milestone:
  - Pointer tracking on canvas; compute `uPointer` (0..1) and low-pass-filtered `uPointerVel`
  - Feed uniforms each frame (rAF), clamp deltas, drop density on sustained >28ms frames
- Pose milestone:
  - Reuse MediaPipe pipeline in `MotionInputPanel.jsx`
  - Compute and smooth: `uBodySpeed` (torso velocity p10–p90 norm), `uExpand` (wrist↔wrist + ankle↔ankle normalized by shoulder width), `uAccent` (peak accel/jerk with decay), and `uJoints`
  - Blend `P_final = mix(P_audio, P_motion, uMotionReactivity)`; stub audio if needed
- UI: Toggle 'cursor' | 'pose' mode; sliders for `musicReactivity` and `motionReactivity`
