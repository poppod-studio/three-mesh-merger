import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

/**
 * Handles loading of GLB/GLTF files
 */
export class ModelLoader {
  private loader: GLTFLoader

  constructor(dracoDecoderPath?: string) {
    this.loader = new GLTFLoader()

    if (dracoDecoderPath) {
      const dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath(dracoDecoderPath)
      this.loader.setDRACOLoader(dracoLoader)
    }
  }

  /**
   * Load a GLB file from URL
   */
  async load(url: string): Promise<THREE.Scene> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          // gltf.scene is a Group, wrap it in a Scene
          const scene = new THREE.Scene()
          scene.add(gltf.scene)
          resolve(scene)
        },
        undefined,
        (error) => {
          const message = error instanceof Error ? error.message : String(error)
          reject(new Error(`Failed to load model from ${url}: ${message}`))
        }
      )
    })
  }

  /**
   * Load a GLB file from Blob/File
   */
  async loadFromBlob(blob: Blob): Promise<THREE.Scene> {
    const url = URL.createObjectURL(blob)

    try {
      const scene = await this.load(url)
      return scene
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}
