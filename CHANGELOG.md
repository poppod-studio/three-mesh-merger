# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-05-17

### Security

- **Vite upgraded to 6.4.2 (GHSA-4w7w-66w2-5vf9 / CVE-2026-39365, Medium)** — `vite` dev
  dependency bumped from `^5` to `^6.4.2` to patch a path-traversal vulnerability in the
  dev server's optimised-deps `.map` handler; only affected servers explicitly exposed to the
  network via `--host`. `vite-plugin-dts` updated to `^4.0.0` for Vite 6 compatibility.

- **lodash transitive dependency forced to ≥ 4.18.0 (GHSA-r5fr-rjxr-66jc / CVE-2026-4800,
  High; GHSA-f23m-r3pf-42rh / CVE-2026-2950, Medium)** — A `pnpm.overrides` entry pins any
  transitive `lodash` to `>=4.18.0`, patching Code Injection via `_.template` imports key
  names and Prototype Pollution via array path bypass in `_.unset`/`_.omit`. The Vite 6
  upgrade eliminates `lodash` from the dependency tree entirely.

- **minimatch transitive dependency updated to 10.2.3 (GHSA-7r86-cg39-jmmj,
  GHSA-23c5-xmqv-rm74, GHSA-3ppc-4f35-3m26, High)** — A `pnpm.overrides` entry forces
  `minimatch` below `3.1.2` up to the patched version; the resolved version is now `10.2.3`,
  mitigating three ReDoS vulnerabilities via GLOBSTAR combinatorial backtracking, nested
  extglobs, and repeated wildcard patterns.

## [0.2.0] - 2026-05-17

### Added

- **Draco compression support** — `MeshMerger` now accepts a `dracoDecoderPath`
  option in its constructor (e.g. `new MeshMerger({ dracoDecoderPath: '/draco/' })`).
  Pass the path where your Draco WASM decoder files are served to enable loading
  of Draco-compressed GLB/GLTF files. Without this option behaviour is unchanged.
  `MeshMergerOptions` is exported from the package for typed configuration.

- **Viewport keyboard shortcuts** — `W` / `E` / `R` switch transform mode
  (move / rotate / scale); `F` focuses the selected model in the camera, or all
  models if none is selected; `Delete` / `Backspace` removes the selected model;
  `Escape` clears the selection. Shortcuts are suppressed when an input field has
  focus.

- **Drag-and-drop onto the viewport** — `.glb` and `.gltf` files can be dropped
  directly onto the 3D canvas in addition to the file-picker button. A highlight
  overlay appears while dragging over the viewport. Drop is ignored after a merge.

- **Auto-focus on model load** — the camera automatically fits to show all loaded
  models whenever a new model is added. The fit is deferred until the model's
  scene object is present in the render tree.

- **Viewport orientation cube** — a `GizmoViewcube` (`@react-three/drei`) is
  displayed in the top-right corner of the viewport for quick camera orientation
  reference.

- **Floating transform toolbar** — a compact Move / Rotate / Scale toolbar is
  overlaid on the bottom-left of the viewport while models are loaded and not yet
  merged, replacing the sidebar `TransformModeSelector` component.

- **Viewport empty state** — when no models are loaded a centred prompt is
  displayed: "Drop a .glb / .gltf file here" with a pointer to the Sample Models
  panel.

- **Viewport controls hint bar** — a persistent pill at the bottom of the
  viewport shows Orbit / Zoom / Pan shortcuts. When models are loaded and not
  merged, `F: Focus` and `Del: Remove` hints are also shown.

### Changed

- **Rotation inputs display degrees** — the model list previously showed raw
  radian values; inputs now convert to/from degrees (step 1°) for a friendlier
  editing experience. Internal storage and the `Transform` type remain in radians.

- **CI pipeline split into parallel jobs** — the publish workflow now runs
  `build`, `publish-npm`, and `publish-github-packages` as separate jobs that
  share a build artifact via `actions/upload-artifact`; upgraded to Node.js 24
  and pnpm v9.

## [0.1.3] - 2026-05-15

### Fixed

- **Multi-material mesh support** — meshes whose `material` property is an array
  (multi-material with geometry groups) now correctly map each group's triangles
  to the corresponding material. Previously all triangles of such a mesh were
  tracked under a single material reference, causing incorrect UV remapping and
  texture assignment.

- **UV tiling / texture repeat** — UV values outside `[0, 1]` (produced by
  `texture.repeat` > 1) are now wrapped back into `[0, 1]` before atlas
  remapping. Without this fix, tiling UVs would sample into neighbouring atlas
  tiles and cause visible texture bleeding.

- **Atlas color / scalar double-multiplication** — after atlas generation the
  merged material's `color`, `roughness`, and `metalness` scalars are now reset
  to their neutral values (`1, 1, 1` / `1.0` / `1.0`). Three.js multiplies these
  scalars with the corresponding map, so leaving them at averaged source values
  caused the baked atlas data to be tinted or scaled a second time.

- **Packing layout when albedo is disabled** — `generatePackingLayout` now uses
  the first available texture type (`albedo → normal → roughness → …`) as its
  size reference. Previously it always used the albedo array; disabling albedo
  while enabling any other map produced an empty layout and a runtime crash.

- **Memory leaks** — the following GPU resources are now properly disposed:
  - Indexed clone created before `toNonIndexed()` conversion.
  - Per-mesh intermediate geometries after `mergeGeometries`.
  - Previous merge's geometry, atlas textures, and material when `merge()` is
    called again or `clear()` is called.

- **Concurrent merge guard** — calling `merge()` while a previous merge is
  still in progress now throws `"A merge operation is already in progress"`
  instead of silently overwriting shared state mid-flight.

- **`textureQuality` option was unused** — the `quality` parameter now controls
  `ctx.imageSmoothingQuality` (`low / medium / high`) during atlas canvas
  compositing. Previously the parameter was accepted but had no effect.

- **Incorrect color space on non-albedo atlases** — normal, roughness, metalness,
  and AO atlases were previously assigned `SRGBColorSpace`, causing THREE.js to
  apply sRGB decoding to linear data during sampling (incorrect surface
  appearance). These atlases now use `LinearSRGBColorSpace`; only albedo and
  emissive atlases remain `SRGBColorSpace`.

### Changed

- `clear()` now disposes all GPU resources (geometry, atlas textures, merged
  material) in addition to clearing the model list.

- `MergePanel` example component now includes the **Ambient Occlusion (AO)**
  checkbox that was previously absent from the UI despite being supported by
  the core library.

- Example `useMeshMerger` hook now exposes `isMerging` and `mergeError` state,
  allowing the UI to show a spinner and surface error messages during merge.

## [0.1.2] - 2025-07-01

### Added

- Initial public release.
- `MeshMerger` class with `addModel`, `updateTransform`, `removeModel`,
  `merge`, `export`, `clear`, and progress-callback APIs.
- `GeometryMerger` — world-matrix baking, non-indexed conversion, attribute
  normalisation, and multi-geometry merging via `BufferGeometryUtils`.
- `MaterialAtlas` — potpack-based bin packing, per-type atlas generation
  (albedo, normal, roughness, metalness, emissive, AO), and UV remapping.
- `ModelLoader` — GLB/GLTF loading from URL or `Blob`.
- Vite example app with React Three Fiber viewport, file upload, sample
  models, per-model transform controls, and merge/export panel.
- Dual-format build output (ESM + CJS) with TypeScript declarations.

[Unreleased]: https://github.com/poppod56/three-mesh-merger/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/poppod56/three-mesh-merger/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/poppod56/three-mesh-merger/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/poppod56/three-mesh-merger/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/poppod56/three-mesh-merger/releases/tag/v0.1.2
