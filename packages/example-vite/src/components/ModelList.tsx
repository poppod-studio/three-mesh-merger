import type { LoadedModel } from "../hooks/useMeshMerger";
import type { Transform } from "@poppod/three-mesh-merger";

interface ModelListProps {
  models: LoadedModel[];
  selectedModelId?: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onTransformChange: (id: string, transform: Partial<Transform>) => void;
  disabled?: boolean;
}

const safeParseFloat = (value: string, fallback: number): number => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
};

const radToDeg = (r: number) =>
  Math.round((r * (180 / Math.PI)) * 10) / 10;

const degToRad = (d: number) => d * (Math.PI / 180);

export function ModelList({
  models,
  selectedModelId,
  onSelect,
  onRemove,
  onTransformChange,
  disabled,
}: ModelListProps) {
  if (models.length === 0) {
    return (
      <div className="model-list empty">
        <p>No models loaded</p>
      </div>
    );
  }

  return (
    <div className="model-list">
      <h3>Loaded Models ({models.length})</h3>
      {models.map((model) => (
        <div
          key={model.id}
          className={`model-item ${
            selectedModelId === model.id ? "selected" : ""
          }`}
          onClick={() => onSelect(model.id)}
        >
          <div className="model-header">
            <span className="model-name">{model.name}</span>
            <button
              className="btn-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(model.id);
              }}
              disabled={disabled}
              title="Remove (Delete)"
            >
              ×
            </button>
          </div>

          {selectedModelId === model.id && (
            <div className="transform-controls">
              <div className="control-group">
                <label>Position</label>
                <div className="control-row">
                  {["X", "Y", "Z"].map((axis, i) => (
                    <input
                      key={axis}
                      type="number"
                      step="0.1"
                      value={model.transform.position[i]}
                      onChange={(e) =>
                        onTransformChange(model.id, {
                          position: model.transform.position.map((v, j) =>
                            j === i ? safeParseFloat(e.target.value, v) : v
                          ) as [number, number, number],
                        })
                      }
                      disabled={disabled}
                      placeholder={axis}
                    />
                  ))}
                </div>
              </div>

              <div className="control-group">
                <label>Rotation (deg)</label>
                <div className="control-row">
                  {["X", "Y", "Z"].map((axis, i) => (
                    <input
                      key={axis}
                      type="number"
                      step="1"
                      value={radToDeg(model.transform.rotation[i])}
                      onChange={(e) => {
                        const deg = safeParseFloat(
                          e.target.value,
                          radToDeg(model.transform.rotation[i])
                        );
                        onTransformChange(model.id, {
                          rotation: model.transform.rotation.map((v, j) =>
                            j === i ? degToRad(deg) : v
                          ) as [number, number, number],
                        });
                      }}
                      disabled={disabled}
                      placeholder={axis}
                    />
                  ))}
                </div>
              </div>

              <div className="control-group">
                <label>Scale</label>
                <div className="control-row">
                  {["X", "Y", "Z"].map((axis, i) => (
                    <input
                      key={axis}
                      type="number"
                      step="0.1"
                      value={model.transform.scale[i]}
                      onChange={(e) =>
                        onTransformChange(model.id, {
                          scale: model.transform.scale.map((v, j) =>
                            j === i ? safeParseFloat(e.target.value, v) : v
                          ) as [number, number, number],
                        })
                      }
                      disabled={disabled}
                      placeholder={axis}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
