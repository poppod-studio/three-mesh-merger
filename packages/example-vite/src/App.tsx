import { useState, useEffect, useCallback } from "react";
import { Scene } from "./components/Scene";
import { FileUpload } from "./components/FileUpload";
import { SampleModels } from "./components/SampleModels";
import { ModelList } from "./components/ModelList";
import { MergePanel } from "./components/MergePanel";
import { ViewportToolbar } from "./components/ViewportToolbar";
import { useMeshMerger } from "./hooks/useMeshMerger";
import "./styles.css";

export function App() {
  const {
    merger,
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
    clear,
  } = useMeshMerger();

  const [selectedModelId, setSelectedModelId] = useState<string>();
  const [transformMode, setTransformMode] = useState<
    "translate" | "rotate" | "scale"
  >("translate");
  const [frameTarget, setFrameTarget] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const modelIds = models.map((m) => m.id);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key.toLowerCase()) {
        case "w":
          setTransformMode("translate");
          break;
        case "e":
          setTransformMode("rotate");
          break;
        case "r":
          if (!e.ctrlKey && !e.metaKey) setTransformMode("scale");
          break;
        case "f":
          if (!e.ctrlKey && !e.metaKey) {
            setFrameTarget(selectedModelId ?? "all");
          }
          break;
        case "delete":
        case "backspace":
          if (selectedModelId && !isMerged) {
            removeModel(selectedModelId);
            setSelectedModelId(undefined);
          }
          break;
        case "escape":
          setSelectedModelId(undefined);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedModelId, isMerged, removeModel]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        await addModel(file);
      }
    },
    [addModel]
  );

  const handleLoadSample = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], `${name}.glb`, {
        type: "model/gltf-binary",
      });
      await addModel(file);
    } catch (error) {
      console.error("Failed to load sample:", error);
    }
  };

  // Viewport drag-and-drop
  const handleViewportDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isMerged) setIsDragOver(true);
  };

  const handleViewportDragLeave = () => setIsDragOver(false);

  const handleViewportDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isMerged) return;
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith(".glb") || f.name.endsWith(".gltf")
    );
    if (files.length > 0) await handleFilesSelected(files);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>⬡ MeshMerge</h1>
        <p>Load, position, and merge 3D models into a single optimised mesh</p>
      </header>

      <div className="main-content">
        {/* 3D Viewport */}
        <div
          className={`viewport ${isDragOver ? "drag-over" : ""}`}
          onDragOver={handleViewportDragOver}
          onDragLeave={handleViewportDragLeave}
          onDrop={handleViewportDrop}
        >
          <Scene
            merger={merger}
            isMerged={isMerged}
            selectedModelId={selectedModelId}
            transformMode={transformMode}
            onModelSelect={setSelectedModelId}
            onTransformChange={updateTransform}
            onModeChange={setTransformMode}
            modelIds={modelIds}
            frameTarget={frameTarget}
            onFramed={() => setFrameTarget(null)}
          />

          {/* Floating transform toolbar — visible when models are loaded */}
          <ViewportToolbar
            mode={transformMode}
            onChange={setTransformMode}
            disabled={isMerged}
            visible={models.length > 0 && !isMerged}
          />

          {/* Empty state hint */}
          {models.length === 0 && !isMerged && (
            <div className="viewport-empty">
              <div className="vp-empty-icon">⬡</div>
              <div className="vp-empty-title">Drop a .glb / .gltf file here</div>
              <div className="vp-empty-sub">
                or use Sample Models in the panel →
              </div>
            </div>
          )}

          {/* Camera controls hint */}
          <div className="viewport-hints">
            <span>🖱 Drag: Orbit</span>
            <span>Scroll: Zoom</span>
            <span>⌘+Drag: Pan</span>
            {models.length > 0 && !isMerged && (
              <>
                <span>F: Focus</span>
                <span>Del: Remove</span>
              </>
            )}
          </div>

          {/* Drag-over overlay */}
          {isDragOver && (
            <div className="viewport-drop-overlay">
              <span>Drop to load model</span>
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="controls-panel">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            disabled={isMerged}
          />

          <SampleModels onLoadSample={handleLoadSample} disabled={isMerged} />

          <ModelList
            models={models}
            selectedModelId={selectedModelId}
            onSelect={setSelectedModelId}
            onRemove={removeModel}
            onTransformChange={updateTransform}
            disabled={isMerged}
          />

          {models.length > 0 && (
            <MergePanel
              onMerge={merge}
              onExport={exportGLB}
              onClear={clear}
              isMerged={isMerged}
              isMerging={isMerging}
              mergeError={mergeError}
              progress={progress}
            />
          )}
        </div>
      </div>

      <footer className="footer">
        <p>
          Built with{" "}
          <a
            href="https://threejs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Three.js
          </a>
          {" · "}
          <a
            href="https://github.com/poppod/three-mesh-merger"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
