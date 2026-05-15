import { useState } from 'react'
import type { MergeOptions } from '@poppod/three-mesh-merger'

interface MergePanelProps {
  onMerge: (options: MergeOptions) => void
  onExport: () => void
  onClear: () => void
  isMerged: boolean
  isMerging: boolean
  mergeError?: string | null
  progress?: { stage: string; value: number }
}

export function MergePanel({
  onMerge,
  onExport,
  onClear,
  isMerged,
  isMerging,
  mergeError,
  progress
}: MergePanelProps) {
  const [atlasSize, setAtlasSize] = useState(2048)
  const [quality, setQuality] = useState(0.9)
  const [albedo, setAlbedo] = useState(true)
  const [normal, setNormal] = useState(false)
  const [roughness, setRoughness] = useState(false)
  const [metalness, setMetalness] = useState(false)
  const [emissive, setEmissive] = useState(false)
  const [aoMap, setAoMap] = useState(false)

  const handleMerge = () => {
    onMerge({
      atlasSize,
      textureQuality: quality,
      atlasMode: { albedo, normal, roughness, metalness, emissive, aoMap }
    })
  }

  const isActive = isMerging || isMerged
  const showProgress =
    isMerging && progress && progress.value > 0 && progress.value < 1

  return (
    <div className="merge-panel">
      <h3>Merge Settings</h3>

      <div className="control-group">
        <label>Atlas Size</label>
        <select
          value={atlasSize}
          onChange={(e) => setAtlasSize(Number(e.target.value))}
          disabled={isActive}
        >
          <option value={512}>512</option>
          <option value={1024}>1024</option>
          <option value={2048}>2048</option>
          <option value={4096}>4096</option>
        </select>
      </div>

      <div className="control-group">
        <label>Quality ({quality.toFixed(1)})</label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={quality}
          onChange={(e) => setQuality(parseFloat(e.target.value))}
          disabled={isActive}
        />
      </div>

      <div className="control-group">
        <label>Texture Maps</label>
        <div className="checkbox-group">
          {[
            { label: 'Albedo / Color', value: albedo, set: setAlbedo },
            { label: 'Normal', value: normal, set: setNormal },
            { label: 'Roughness', value: roughness, set: setRoughness },
            { label: 'Metalness', value: metalness, set: setMetalness },
            { label: 'Emissive', value: emissive, set: setEmissive },
            { label: 'Ambient Occlusion (AO)', value: aoMap, set: setAoMap },
          ].map(({ label, value, set }) => (
            <label key={label}>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => set(e.target.checked)}
                disabled={isActive}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="merge-note">
        Models with tiling textures (UV repeat &gt; 1) will have tiling baked
        into the atlas. Visual fidelity may differ from the original.
      </div>

      {showProgress && (
        <div className="progress">
          <div
            className="progress-bar"
            style={{ width: `${progress!.value * 100}%` }}
          />
          <span className="progress-text">{progress!.stage}</span>
        </div>
      )}

      {isMerging && !showProgress && (
        <div className="merge-spinner">
          <span className="spinner" /> Merging…
        </div>
      )}

      {mergeError && (
        <div className="merge-error">{mergeError}</div>
      )}

      <div className="button-group">
        <button
          className="btn-primary"
          onClick={handleMerge}
          disabled={isActive}
        >
          {isMerging ? 'Merging…' : isMerged ? 'Merged' : 'Merge Models'}
        </button>

        {isMerged && !isMerging && (
          <>
            <button className="btn-success" onClick={onExport}>
              Export GLB
            </button>
            <button className="btn-secondary" onClick={onClear}>
              Clear &amp; Start Over
            </button>
          </>
        )}
      </div>
    </div>
  )
}
