import { useState, useCallback, useRef, useEffect } from 'react'
import { MeshMerger, Transform, MergeOptions } from '@poppod/three-mesh-merger'
// Draco-compressed GLB support: decoder files are served from /draco/ (see public/draco/)

export interface LoadedModel {
  id: string
  name: string
  transform: Required<Transform>
}

export function useMeshMerger() {
  const mergerRef = useRef<MeshMerger>(new MeshMerger({ dracoDecoderPath: '/draco/' }))
  const [models, setModels] = useState<LoadedModel[]>([])
  const [isMerged, setIsMerged] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ stage: string; value: number }>({
    stage: '',
    value: 0
  })

  useEffect(() => {
    mergerRef.current.setProgressCallback((stage, value) => {
      setProgress({ stage, value })
    })
  }, [])

  const addModel = useCallback(async (file: File, transform?: Transform) => {
    const id = await mergerRef.current.addModel(file, transform)

    const modelData = mergerRef.current.getModel(id)
    if (!modelData) return id

    setModels((prev) => [
      ...prev,
      { id, name: file.name, transform: modelData.transform }
    ])
    setIsMerged(false)
    return id
  }, [])

  const updateTransform = useCallback((id: string, transform: Partial<Transform>) => {
    mergerRef.current.updateTransform(id, transform)
    setModels((prev) =>
      prev.map((model) =>
        model.id === id
          ? { ...model, transform: mergerRef.current.getModel(id)!.transform }
          : model
      )
    )
  }, [])

  const removeModel = useCallback((id: string) => {
    mergerRef.current.removeModel(id)
    setModels((prev) => prev.filter((m) => m.id !== id))
    setIsMerged(false)
  }, [])

  const merge = useCallback(async (options?: MergeOptions) => {
    setMergeError(null)
    setIsMerging(true)
    try {
      await mergerRef.current.merge(options)
      setIsMerged(true)
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Merge failed')
    } finally {
      setIsMerging(false)
    }
  }, [])

  const exportGLB = useCallback(async () => {
    const blob = await mergerRef.current.export()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'merged-model.glb'
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  const clear = useCallback(() => {
    mergerRef.current.clear()
    setModels([])
    setIsMerged(false)
    setIsMerging(false)
    setMergeError(null)
    setProgress({ stage: '', value: 0 })
  }, [])

  return {
    merger: mergerRef.current,
    models,
    isMerged,
    isMerging,
    mergeError,
    progress,
    addModel,
    updateTransform,
    removeModel,
    merge,
    exportGLB,
    clear
  }
}
