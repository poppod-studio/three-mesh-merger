# @poppod/three-mesh-merger

[![npm version](https://img.shields.io/npm/v/@poppod/three-mesh-merger.svg)](https://www.npmjs.com/package/@poppod/three-mesh-merger)
[![npm downloads](https://img.shields.io/npm/dm/@poppod/three-mesh-merger.svg)](https://www.npmjs.com/package/@poppod/three-mesh-merger)
[![license](https://img.shields.io/npm/l/@poppod/three-mesh-merger.svg)](https://github.com/poppod56/three-mesh-merger/blob/main/LICENSE)

A powerful TypeScript library for merging multiple 3D GLB files into a single optimized mesh with flexible texture atlas support.

## Features

- 🎯 **Merge Multiple GLB Files** - Combine any number of 3D models into a single mesh
- 🔄 **Independent Transforms** - Position, rotate, and scale each model before merging
- 🖼️ **Flexible Texture Atlas** - Choose which texture maps to combine:
  - Albedo/Color maps
  - Normal maps
  - Roughness maps
  - Metalness maps
  - Emissive maps
  - AO maps
- ⚡ **Optimized Output** - Single mesh with single material for maximum performance
- 🍃 **Alpha Cutout** - Preserves `alphaMode: MASK` transparency (foliage, decals) when merging
- 🎨 **Material Customization** - Override material properties or use averaged values
- 📦 **Client-Side Only** - Lightweight, browser-native implementation
- 🌳 **Tree-Shakeable** - Optimized for modern bundlers
- 📘 **TypeScript First** - Full type safety and IntelliSense support

## Installation

```bash
pnpm add @poppod/three-mesh-merger three
# or
npm install @poppod/three-mesh-merger three
# or
yarn add @poppod/three-mesh-merger three
```

## Quick Start

```typescript
import { MeshMerger } from "@poppod/three-mesh-merger";

// Create merger instance
const merger = new MeshMerger();

// Add models with transforms
const cube = await merger.addModel("/models/cube.glb", {
  position: [0, 0, 0],
});

const sphere = await merger.addModel("/models/sphere.glb", {
  position: [2, 0, 0],
  scale: [0.5, 0.5, 0.5],
});

// Merge with options
await merger.merge({
  atlasSize: 2048,
  textureQuality: 0.9,
  atlasMode: {
    albedo: true,
    normal: true,
    roughness: true,
  },
});

// Export as GLB
const blob = await merger.export();
const url = URL.createObjectURL(blob);
// Download or use the merged GLB
```

## API Reference

### `MeshMerger`

Main class for merging 3D models.

#### Methods

##### `addModel(source: string | Blob, transform?: Transform): Promise<string>`

Add a model from URL or Blob.

```typescript
const id = await merger.addModel("/model.glb", {
  position: [0, 1, 0],
  rotation: [0, Math.PI / 4, 0],
  scale: [1, 1, 1],
});
```

**Parameters:**

- `source`: URL string or Blob/File object
- `transform` (optional): Initial transform

**Returns:** Model ID

##### `updateTransform(id: string, transform: Partial<Transform>): void`

Update transform for a specific model.

```typescript
merger.updateTransform(id, {
  position: [1, 0, 0],
});
```

##### `removeModel(id: string): void`

Remove a model from the merger.

```typescript
merger.removeModel(id);
```

##### `getModels(): ModelInstance[]`

Get all loaded models.

```typescript
const models = merger.getModels();
```

##### `getModel(id: string): ModelInstance | undefined`

Get a specific model by ID.

```typescript
const model = merger.getModel(id);
```

##### `merge(options?: MergeOptions): Promise<void>`

Merge all models with specified options.

```typescript
await merger.merge({
  atlasSize: 2048,
  textureQuality: 0.9,
  atlasMode: {
    albedo: true,
    normal: true,
    roughness: true,
    metalness: true,
  },
  materialOverrides: {
    roughness: 0.5,
    metalness: 0.8,
  },
});
```

##### `export(): Promise<Blob>`

Export merged result as GLB Blob.

```typescript
const blob = await merger.export();
const url = URL.createObjectURL(blob);

// Download
const link = document.createElement("a");
link.href = url;
link.download = "merged.glb";
link.click();
```

##### `getMergedScene(): THREE.Scene | undefined`

Get the merged scene for preview.

##### `getMergedMesh(): THREE.Mesh | undefined`

Get the merged mesh for preview.

##### `setProgressCallback(callback: ProgressCallback): void`

Set progress callback for merge operations.

```typescript
merger.setProgressCallback((stage, progress) => {
  console.log(`${stage}: ${progress * 100}%`);
});
```

##### `clear(): void`

Clear all models and merged result.

```typescript
merger.clear();
```

### Types

#### `Transform`

```typescript
interface Transform {
  position?: [number, number, number];
  rotation?: [number, number, number]; // Euler angles in radians
  scale?: [number, number, number];
}
```

#### `MergeOptions`

```typescript
interface MergeOptions {
  atlasSize?: number; // Default: 2048
  textureQuality?: number; // 0-1, Default: 0.9
  generateMipmaps?: boolean; // Default: true
  atlasMode?: AtlasMode;
  materialOverrides?: MaterialOverrides;
}
```

#### `AtlasMode`

```typescript
interface AtlasMode {
  albedo?: boolean; // Default: true
  normal?: boolean; // Default: false
  roughness?: boolean; // Default: false
  metalness?: boolean; // Default: false
  emissive?: boolean; // Default: false
  aoMap?: boolean; // Default: false
}
```

#### `MaterialOverrides`

```typescript
interface MaterialOverrides {
  roughness?: number;
  metalness?: number;
  color?: number | string; // THREE.Color compatible
  emissive?: number | string;
  emissiveIntensity?: number;
  alphaTest?: number; // Alpha-cutout threshold (auto-derived if omitted)
  transparent?: boolean; // Force alpha blending (not recommended — see below)
  opacity?: number; // Only meaningful with transparent: true
  side?: THREE.Side; // Override face culling (auto double-sided otherwise)
}
```

#### `ProgressCallback`

```typescript
type ProgressCallback = (stage: string, progress: number) => void;
```

## Usage with Frameworks

### React

```tsx
import { MeshMerger } from "@poppod/three-mesh-merger";
import { useEffect, useRef } from "react";

function MyComponent() {
  const mergerRef = useRef(new MeshMerger());

  const handleMerge = async () => {
    await mergerRef.current.addModel("/model1.glb");
    await mergerRef.current.addModel("/model2.glb");
    await mergerRef.current.merge();
    const blob = await mergerRef.current.export();
    // Handle blob
  };

  return <button onClick={handleMerge}>Merge</button>;
}
```

### Next.js

```tsx
"use client";

import { MeshMerger } from "@poppod/three-mesh-merger";
import { useState } from "react";

export default function MergePage() {
  const [merger] = useState(() => new MeshMerger());

  // Your implementation
}
```

### Vue 3

```vue
<script setup>
import { MeshMerger } from "@poppod/three-mesh-merger";
import { ref } from "vue";

const merger = ref(new MeshMerger());

const handleMerge = async () => {
  await merger.value.addModel("/model.glb");
  await merger.value.merge();
  const blob = await merger.value.export();
  // Handle blob
};
</script>
```

## How It Works

1. **Load Models**: GLB files are loaded using Three.js `GLTFLoader`
2. **Apply Transforms**: Each model's world matrix is baked first, then the user-defined transform is applied on top
3. **Geometry Merging**: All geometries (including multi-material meshes) are flattened to non-indexed form and merged into a single `BufferGeometry`; per-material triangle ranges are tracked for UV remapping
4. **Texture Atlas**: Textures are packed using the [potpack](https://github.com/mapbox/potpack) bin-packing algorithm and composited onto a single canvas per map type
5. **UV Remapping**: UV coordinates are transformed into each material's atlas tile; tiling UVs (repeat > 1) are wrapped to `[0, 1]` before remapping
6. **Material Creation**: A single `MeshStandardMaterial` is created with all requested atlas textures; scalar multipliers are set to neutral so they don't re-tint the baked atlas data. Alpha cutout (`alphaTest`) and double-sided rendering are propagated from the source materials — see [Alpha / Transparency](#alpha--transparency)
7. **Export**: Final merged model is exported as GLB using Three.js `GLTFExporter`

## Performance Considerations

- **Atlas Size**: Larger atlas → better quality, more GPU memory (`512` → `4096`)
- **Texture Quality**: Controls canvas compositing smoothness (`0.1` = low, `1.0` = high)
- **Map Selection**: Only enable the maps your scene actually uses — each enabled map doubles atlas memory
- **Model Count**: More models = longer merge time; geometry is processed synchronously on the main thread

## Alpha / Transparency

The merger collapses every source model into a **single material**. Because
alpha blending is a per-material flag and cannot be depth-sorted within one
mesh, transparency is supported via **alpha cutout** (`alphaTest`) rather than
smooth blending.

### How it behaves

- Alpha stored in a model's **albedo / baseColor alpha channel** is baked into
  the albedo atlas and preserved.
- The merged material's cutout threshold is taken **automatically** from the
  source materials — specifically the maximum `alphaTest` among them (this is
  what `GLTFLoader` sets for glTF `alphaMode: MASK`). Override it with
  `materialOverrides.alphaTest`.
- **Opaque models are unaffected.** Their atlas tiles have alpha = 1, so they
  always pass the cutout test and render solid — even when merged alongside a
  cutout model.
- **Double-sided** rendering is auto-enabled if any source material is
  double-sided (common for foliage). Override with `materialOverrides.side`.
- A merged mesh with `alphaTest` exports back to GLB as `alphaMode: MASK` and
  reloads correctly in any Three.js / glTF viewer.

### Example: opaque base + cutout leaves

```typescript
await merger.addModel("/models/base.glb"); // alphaMode: OPAQUE
await merger.addModel("/models/leaf.glb"); // alphaMode: MASK, cutoff 0.78

await merger.merge({
  atlasMode: { albedo: true }, // albedo atlas carries the alpha channel
});
// → single mesh: base renders solid, leaf renders with hard-edged cutouts.
//   materialOverrides.alphaTest can override the auto-derived 0.78 cutoff.
```

### Limitations of alpha support

- **Cutout only — no smooth blending.** Edges are hard (binary on/off), not
  feathered. A source using `alphaMode: BLEND` is downgraded to a cutout (with
  a warning). True blended transparency (e.g. glass) is not supported in a
  single-material merge.
- **Albedo alpha channel only.** A separate `alphaMap` texture is not composited
  into the atlas; alpha must live in the baseColor/albedo alpha channel.
- **Requires the albedo atlas** (`atlasMode.albedo`, on by default). With albedo
  disabled there is no alpha channel to test against.
- **Possible edge seams at distance.** Mipmaps can blend tile-edge alpha toward
  the transparent atlas gutter, producing thin seams on far-away cutout meshes.

## Known Limitations

- **UV tiling is baked, not preserved** — textures using `repeat > 1` have their tiling baked into the atlas UV. The visual result matches the original but the UV range is collapsed to `[0, 1]` in the exported mesh.
- **Browser / Canvas only** — texture processing relies on `document.createElement('canvas')` and is not compatible with Node.js or server-side rendering.
- **No morph targets** — morph attributes are stripped during the attribute-normalisation step.
- **Transparency is cutout-only** — see [Alpha / Transparency](#alpha--transparency) above; smooth alpha blending and separate `alphaMap` textures are not supported.

## Browser Support

- Modern browsers with WebGL support
- ES2020+ JavaScript features
- Canvas API for texture processing

## Peer Dependencies

- `three` >= 0.150.0

## License

MIT © poppod

## Links

- [GitHub Repository](https://github.com/poppod56/three-mesh-merger)
- [npm Package](https://www.npmjs.com/package/@poppod/three-mesh-merger)
- [Changelog](https://github.com/poppod56/three-mesh-merger/blob/main/CHANGELOG.md)
- [Example Application](../example-vite)
- [Three.js Documentation](https://threejs.org/docs)
