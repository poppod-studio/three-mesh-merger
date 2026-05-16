import * as THREE from "three";
import potpack from "potpack";
import type {
  AtlasMode,
  MaterialOverrides,
  MaterialMapping,
  AtlasResult,
} from "./types";
import {
  textureToCanvas,
  resizeCanvas,
  canvasToTexture,
  createSolidColorTexture,
  createSolidGrayscaleTexture,
} from "./utils/textureUtils";

interface PackBox {
  w: number;
  h: number;
  x?: number;
  y?: number;
}

/**
 * Handles texture atlas generation and UV remapping
 */
export class MaterialAtlas {
  /**
   * Generate texture atlases and merged material
   */
  async generate(
    materials: THREE.Material[],
    materialMapping: MaterialMapping,
    geometry: THREE.BufferGeometry,
    options: {
      atlasSize: number;
      quality: number;
      atlasMode: Required<AtlasMode>;
      materialOverrides?: MaterialOverrides;
    }
  ): Promise<AtlasResult> {
    const { atlasSize, quality, atlasMode, materialOverrides } = options;

    console.log("MaterialAtlas.generate:", {
      materialsCount: materials.length,
      materialMappingSize: materialMapping.size,
      atlasSize,
    });

    const texturesByType = this.extractTexturesByType(materials, atlasMode);

    // Use the first available texture type as the reference for packing dimensions.
    // This ensures correctness even when albedo is disabled.
    const referenceTextures =
      texturesByType.albedo ??
      texturesByType.normal ??
      texturesByType.roughness ??
      texturesByType.metalness ??
      texturesByType.emissive ??
      texturesByType.aoMap ??
      [];

    const packingLayout = this.generatePackingLayout(
      referenceTextures,
      atlasSize
    );

    const result: AtlasResult = {
      material: new THREE.MeshStandardMaterial(),
    };

    if (atlasMode.albedo && texturesByType.albedo) {
      result.albedoAtlas = await this.createAtlas(
        texturesByType.albedo,
        packingLayout,
        atlasSize,
        quality,
        true // sRGB — perceptual color data
      );
      result.material.map = result.albedoAtlas;
    }

    if (atlasMode.normal && texturesByType.normal) {
      result.normalAtlas = await this.createAtlas(
        texturesByType.normal,
        packingLayout,
        atlasSize,
        quality
        // linear — direction vectors, not color
      );
      result.material.normalMap = result.normalAtlas;
    }

    if (atlasMode.roughness && texturesByType.roughness) {
      result.roughnessAtlas = await this.createAtlas(
        texturesByType.roughness,
        packingLayout,
        atlasSize,
        quality
        // linear — scalar roughness values
      );
      result.material.roughnessMap = result.roughnessAtlas;
    }

    if (atlasMode.metalness && texturesByType.metalness) {
      result.metalnessAtlas = await this.createAtlas(
        texturesByType.metalness,
        packingLayout,
        atlasSize,
        quality
        // linear — scalar metalness values
      );
      result.material.metalnessMap = result.metalnessAtlas;
    }

    if (atlasMode.emissive && texturesByType.emissive) {
      result.emissiveAtlas = await this.createAtlas(
        texturesByType.emissive,
        packingLayout,
        atlasSize,
        quality,
        true // sRGB — perceptual color data
      );
      result.material.emissiveMap = result.emissiveAtlas;
      result.material.emissive = new THREE.Color(1, 1, 1);
    }

    if (atlasMode.aoMap && texturesByType.aoMap) {
      result.aoAtlas = await this.createAtlas(
        texturesByType.aoMap,
        packingLayout,
        atlasSize,
        quality
      );
      result.material.aoMap = result.aoAtlas;
    }

    this.updateUVCoordinates(
      geometry,
      materials,
      materialMapping,
      packingLayout,
      atlasSize
    );

    this.setMaterialProperties(result.material, materials, materialOverrides);

    // Atlas maps encode the full texture values — reset scalar multipliers to neutral
    // so they don't tint or scale the baked atlas data.
    if (result.albedoAtlas) result.material.color.set(1, 1, 1);
    if (result.roughnessAtlas) result.material.roughness = 1.0;
    if (result.metalnessAtlas) result.material.metalness = 1.0;

    return result;
  }

  /**
   * Extract textures from materials by type, using solid-color fallbacks where needed
   */
  private extractTexturesByType(
    materials: THREE.Material[],
    atlasMode: Required<AtlasMode>
  ): Record<string, THREE.Texture[]> {
    const result: Record<string, THREE.Texture[]> = {};

    const extractTexture = (
      material: THREE.Material,
      property: keyof THREE.MeshStandardMaterial,
      fallback: () => THREE.Texture
    ): THREE.Texture => {
      const mat = material as THREE.MeshStandardMaterial;
      const texture = mat[property] as THREE.Texture | null;
      return texture || fallback();
    };

    materials.forEach((material) => {
      const mat = material as THREE.MeshStandardMaterial;

      if (atlasMode.albedo) {
        if (!result.albedo) result.albedo = [];
        result.albedo.push(
          extractTexture(mat, "map", () =>
            createSolidColorTexture(mat.color || new THREE.Color(1, 1, 1))
          )
        );
      }

      if (atlasMode.normal) {
        if (!result.normal) result.normal = [];
        result.normal.push(
          extractTexture(mat, "normalMap", () =>
            createSolidColorTexture(new THREE.Color(0.5, 0.5, 1))
          )
        );
      }

      if (atlasMode.roughness) {
        if (!result.roughness) result.roughness = [];
        result.roughness.push(
          extractTexture(mat, "roughnessMap", () =>
            createSolidGrayscaleTexture(mat.roughness ?? 1)
          )
        );
      }

      if (atlasMode.metalness) {
        if (!result.metalness) result.metalness = [];
        result.metalness.push(
          extractTexture(mat, "metalnessMap", () =>
            createSolidGrayscaleTexture(mat.metalness ?? 0)
          )
        );
      }

      if (atlasMode.emissive) {
        if (!result.emissive) result.emissive = [];
        result.emissive.push(
          extractTexture(mat, "emissiveMap", () =>
            createSolidColorTexture(mat.emissive || new THREE.Color(0, 0, 0))
          )
        );
      }

      if (atlasMode.aoMap) {
        if (!result.aoMap) result.aoMap = [];
        result.aoMap.push(
          extractTexture(mat, "aoMap", () => createSolidGrayscaleTexture(1))
        );
      }
    });

    return result;
  }

  /**
   * Generate packing layout using potpack, scaled to fit atlasSize
   */
  private generatePackingLayout(
    textures: THREE.Texture[],
    atlasSize: number
  ): PackBox[] {
    const boxes: PackBox[] = textures.map((texture) => {
      const image = texture.image as HTMLImageElement | HTMLCanvasElement;
      const w = image.width || 256;
      const h = image.height || 256;
      return { w, h };
    });

    const { w, h } = potpack(boxes);

    const scale = w > 0 && h > 0 ? Math.min(atlasSize / w, atlasSize / h) : 1;

    boxes.forEach((box) => {
      box.w = Math.floor(box.w * scale);
      box.h = Math.floor(box.h * scale);
      box.x = Math.floor((box.x || 0) * scale);
      box.y = Math.floor((box.y || 0) * scale);
    });

    return boxes;
  }

  /**
   * Composite textures into a single atlas canvas at the packed positions
   */
  private async createAtlas(
    textures: THREE.Texture[],
    layout: PackBox[],
    atlasSize: number,
    quality: number,
    isColorMap = false
  ): Promise<THREE.Texture> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Failed to get 2D context");

    canvas.width = atlasSize;
    canvas.height = atlasSize;

    ctx.clearRect(0, 0, atlasSize, atlasSize);

    // Apply quality-driven smoothing for the atlas compositing step
    ctx.imageSmoothingEnabled = quality > 0;
    ctx.imageSmoothingQuality =
      quality >= 0.9 ? "high" : quality >= 0.5 ? "medium" : "low";

    textures.forEach((texture, index) => {
      const box = layout[index];
      if (box === undefined || box.x === undefined || box.y === undefined)
        return;

      const image = texture.image;
      if (!image || !image.width || !image.height) {
        console.warn(`Skipping texture ${index}: invalid image`);
        return;
      }

      const sourceCanvas = textureToCanvas(texture);
      if (sourceCanvas.width === 0 || sourceCanvas.height === 0) {
        console.warn(`Skipping texture ${index}: zero-size canvas`);
        return;
      }

      const resized = resizeCanvas(sourceCanvas, box.w, box.h);
      ctx.drawImage(resized, box.x, box.y);
    });

    const atlasTexture = canvasToTexture(canvas);
    // Albedo and emissive are perceptual (sRGB). All other maps — normal,
    // roughness, metalness, aoMap — store linear data and must NOT be decoded
    // as sRGB, otherwise THREE.js mis-interprets the channel values.
    atlasTexture.colorSpace = isColorMap
      ? THREE.SRGBColorSpace
      : THREE.LinearSRGBColorSpace;
    atlasTexture.generateMipmaps = true;
    // Canvas coordinates match UV directly when flipY=false
    atlasTexture.flipY = false;

    return atlasTexture;
  }

  /**
   * Remap UV coordinates from per-material space into atlas space.
   *
   * UV tiling (values outside [0,1]) is wrapped before remapping so the
   * transform stays within this material's atlas tile rather than bleeding
   * into adjacent tiles.
   */
  private updateUVCoordinates(
    geometry: THREE.BufferGeometry,
    materials: THREE.Material[],
    materialMapping: MaterialMapping,
    layout: PackBox[],
    atlasSize: number
  ): void {
    const uvAttribute = geometry.attributes.uv as THREE.BufferAttribute;

    if (!uvAttribute) {
      console.warn("Geometry has no UV attribute");
      return;
    }

    const uvArray = uvAttribute.array as Float32Array;

    materials.forEach((material, materialIndex) => {
      const triangleIndices = materialMapping.get(material);
      if (!triangleIndices) return;

      const box = layout[materialIndex];
      if (!box || box.x === undefined || box.y === undefined) return;

      const scaleX = box.w / atlasSize;
      const scaleY = box.h / atlasSize;
      const offsetX = box.x / atlasSize;
      const offsetY = box.y / atlasSize;

      triangleIndices.forEach((triangleIndex) => {
        for (let i = 0; i < 3; i++) {
          const vertexIndex = triangleIndex * 3 + i;
          const uvIndex = vertexIndex * 2;

          if (uvIndex + 1 >= uvArray.length) continue;

          // Wrap tiling UVs into [0, 1] before mapping into the atlas tile.
          // Without this, UV values > 1 (from texture repeat) would sample
          // into neighbouring atlas tiles and produce texture bleeding.
          const u = ((uvArray[uvIndex] % 1) + 1) % 1;
          const v = ((uvArray[uvIndex + 1] % 1) + 1) % 1;

          uvArray[uvIndex] = u * scaleX + offsetX;
          uvArray[uvIndex + 1] = v * scaleY + offsetY;
        }
      });
    });

    uvAttribute.needsUpdate = true;
  }

  /**
   * Set material scalar properties (averaged from sources, or from overrides).
   * Note: scalar color/roughness/metalness are reset to neutral in generate()
   * whenever the corresponding atlas map is present.
   */
  private setMaterialProperties(
    targetMaterial: THREE.MeshStandardMaterial,
    sourceMaterials: THREE.Material[],
    overrides?: MaterialOverrides
  ): void {
    if (overrides) {
      if (overrides.roughness !== undefined)
        targetMaterial.roughness = overrides.roughness;
      if (overrides.metalness !== undefined)
        targetMaterial.metalness = overrides.metalness;
      if (overrides.color !== undefined)
        targetMaterial.color = new THREE.Color(overrides.color);
      if (overrides.emissive !== undefined)
        targetMaterial.emissive = new THREE.Color(overrides.emissive);
      if (overrides.emissiveIntensity !== undefined)
        targetMaterial.emissiveIntensity = overrides.emissiveIntensity;
    } else {
      let totalRoughness = 0;
      let totalMetalness = 0;
      const avgColor = new THREE.Color(0, 0, 0);

      sourceMaterials.forEach((material) => {
        const mat = material as THREE.MeshStandardMaterial;
        totalRoughness += mat.roughness ?? 1;
        totalMetalness += mat.metalness ?? 0;

        if (mat.color) {
          avgColor.r += mat.color.r;
          avgColor.g += mat.color.g;
          avgColor.b += mat.color.b;
        }
      });

      const count = sourceMaterials.length;
      targetMaterial.roughness = totalRoughness / count;
      targetMaterial.metalness = totalMetalness / count;
      targetMaterial.color = new THREE.Color(
        avgColor.r / count,
        avgColor.g / count,
        avgColor.b / count
      );
    }

    targetMaterial.needsUpdate = true;
  }
}
