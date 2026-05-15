# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/poppod56/three-mesh-merger/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/poppod56/three-mesh-merger/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/poppod56/three-mesh-merger/releases/tag/v0.1.2
