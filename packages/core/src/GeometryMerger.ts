import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Transform, MaterialMapping } from "./types";
import { applyTransformToGeometry } from "./utils/mathUtils";

function ensureUVAttribute(geometry: THREE.BufferGeometry): void {
  if (!geometry.attributes.uv) {
    const positionCount = geometry.attributes.position.count;
    const uvArray = new Float32Array(positionCount * 2);
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvArray, 2));
  }
}

function ensureNormalAttribute(geometry: THREE.BufferGeometry): void {
  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }
}

function normalizeGeometryAttributes(geometries: THREE.BufferGeometry[]): void {
  if (geometries.length === 0) return;

  geometries.forEach((geo) => {
    ensureUVAttribute(geo);
    ensureNormalAttribute(geo);
  });

  const allAttributes = new Set<string>();
  geometries.forEach((geo) => {
    Object.keys(geo.attributes).forEach((name) => allAttributes.add(name));
  });

  const essentialAttributes = new Set(["position", "normal", "uv"]);
  const commonAttributes = new Set<string>();

  allAttributes.forEach((attrName) => {
    if (essentialAttributes.has(attrName)) {
      commonAttributes.add(attrName);
    } else {
      const allHave = geometries.every(
        (geo) => geo.attributes[attrName] !== undefined
      );
      if (allHave) commonAttributes.add(attrName);
    }
  });

  geometries.forEach((geo) => {
    Object.keys(geo.attributes).forEach((attrName) => {
      if (!commonAttributes.has(attrName)) geo.deleteAttribute(attrName);
    });
    geo.morphAttributes = {};
    geo.morphTargetsRelative = false;
  });

  console.log("Normalized attributes:", Array.from(commonAttributes));
}

/**
 * Handles geometry merging operations
 */
export class GeometryMerger {
  /**
   * Merge multiple meshes into a single geometry.
   * Handles multi-material meshes via geometry groups.
   */
  merge(
    scenes: THREE.Scene[],
    transforms: Required<Transform>[]
  ): {
    geometry: THREE.BufferGeometry;
    materials: THREE.Material[];
    materialMapping: MaterialMapping;
  } {
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const materialMapping: MaterialMapping = new Map();

    let vertexOffset = 0;

    scenes.forEach((scene, sceneIndex) => {
      const transform = transforms[sceneIndex];
      let meshCount = 0;

      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        meshCount++;

        // Clone then convert to non-indexed — dispose the intermediate indexed clone
        const cloned = object.geometry.clone();
        const geometry =
          cloned.index !== null ? cloned.toNonIndexed() : cloned;
        if (geometry !== cloned) cloned.dispose();

        // Bake world matrix (includes all hierarchy transforms from GLB)
        object.updateWorldMatrix(true, false);
        geometry.applyMatrix4(object.matrixWorld);

        // Apply user-defined scene transform
        applyTransformToGeometry(geometry, transform);

        const totalTriangleCount = geometry.attributes.position.count / 3;

        if (Array.isArray(object.material) && geometry.groups.length > 0) {
          // Multi-material mesh: map each group to its material
          geometry.groups.forEach(
            (group: { start: number; count: number; materialIndex?: number }) => {
              const mat = (object.material as THREE.Material[])[
                group.materialIndex ?? 0
              ];
              if (!mat) return;

              // group.start / group.count are vertex offsets in non-indexed geometry
              const groupTriStart = group.start / 3;
              const groupTriCount = group.count / 3;
              const triangleIndices: number[] = [];
              for (let i = 0; i < groupTriCount; i++) {
                triangleIndices.push(vertexOffset + groupTriStart + i);
              }

              if (materialMapping.has(mat)) {
                materialMapping.get(mat)!.push(...triangleIndices);
              } else {
                materialMapping.set(mat, triangleIndices);
                materials.push(mat);
              }
            }
          );
        } else {
          // Single-material mesh
          const material = Array.isArray(object.material)
            ? (object.material[0] as THREE.Material)
            : (object.material as THREE.Material);

          const triangleIndices: number[] = [];
          for (let i = 0; i < totalTriangleCount; i++) {
            triangleIndices.push(vertexOffset + i);
          }

          if (materialMapping.has(material)) {
            materialMapping.get(material)!.push(...triangleIndices);
          } else {
            materialMapping.set(material, triangleIndices);
            materials.push(material);
          }
        }

        vertexOffset += totalTriangleCount;
        geometries.push(geometry);
      });

      console.log(`Scene ${sceneIndex}: found ${meshCount} meshes`);
    });

    console.log(`Total geometries to merge: ${geometries.length}`);

    if (geometries.length === 0) {
      throw new Error("No meshes found in scenes");
    }

    normalizeGeometryAttributes(geometries);

    const mergedGeometry = mergeGeometries(geometries, false);

    // Dispose intermediate per-mesh geometries — merged result is now in mergedGeometry
    geometries.forEach((geo) => geo.dispose());

    if (!mergedGeometry) {
      throw new Error("Failed to merge geometries");
    }

    return { geometry: mergedGeometry, materials, materialMapping };
  }

  /**
   * Get all unique materials from scenes
   */
  getMaterials(scenes: THREE.Scene[]): THREE.Material[] {
    const materialsSet = new Set<THREE.Material>();

    scenes.forEach((scene) => {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => materialsSet.add(mat));
          } else {
            materialsSet.add(object.material);
          }
        }
      });
    });

    return Array.from(materialsSet);
  }
}
