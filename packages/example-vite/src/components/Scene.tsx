import { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  TransformControls,
  GizmoHelper,
  GizmoViewcube,
} from "@react-three/drei";
import * as THREE from "three";
import { ModelPreview } from "./ModelPreview";
import type { MeshMerger, Transform } from "@poppod/three-mesh-merger";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Object3D } from "three";

interface SceneProps {
  merger: MeshMerger;
  isMerged: boolean;
  selectedModelId?: string;
  transformMode?: "translate" | "rotate" | "scale";
  onModelSelect?: (id: string | undefined) => void;
  onTransformChange?: (id: string, transform: Partial<Transform>) => void;
  onModeChange?: (mode: "translate" | "rotate" | "scale") => void;
  modelIds: string[];
  frameTarget?: string | null;
  onFramed?: () => void;
}

function Controls({
  selectedModelId,
  transformMode,
  onTransformChange,
  modelIds,
  frameTarget,
  onFramed,
}: {
  selectedModelId?: string;
  transformMode?: "translate" | "rotate" | "scale";
  onTransformChange?: (id: string, transform: Partial<Transform>) => void;
  modelIds: string[];
  frameTarget?: string | null;
  onFramed?: () => void;
}) {
  const { camera, scene } = useThree();
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const transformRef = useRef<any>(null);
  const [selectedObject, setSelectedObject] = useState<Object3D | null>(null);

  const shouldFrameRef = useRef(false);
  const frameIdsRef = useRef<string[]>([]);
  const prevModelCountRef = useRef(0);

  const fitToIds = useCallback(
    (ids: string[]) => {
      const box = new THREE.Box3();
      ids.forEach((id) => {
        const obj = scene.getObjectByName(id);
        if (obj) box.expandByObject(obj);
      });

      if (box.isEmpty()) return;

      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov =
        ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
      const distance = Math.max(
        (maxDim / (2 * Math.tan(fov / 2))) * 2,
        2
      );
      const direction = new THREE.Vector3(1, 0.8, 1).normalize();
      camera.position.copy(
        center.clone().addScaledVector(direction, distance)
      );
      camera.lookAt(center);
      camera.updateProjectionMatrix();

      if (orbitRef.current) {
        orbitRef.current.target.copy(center);
        orbitRef.current.update();
      }
    },
    [camera, scene]
  );

  // Auto-frame when a new model is added
  useEffect(() => {
    if (modelIds.length > prevModelCountRef.current) {
      shouldFrameRef.current = true;
      frameIdsRef.current = [...modelIds];
    }
    prevModelCountRef.current = modelIds.length;
  }, [modelIds]);

  // Frame on demand (F key)
  useEffect(() => {
    if (!frameTarget) return;
    const ids =
      frameTarget === "all"
        ? modelIds
        : modelIds.includes(frameTarget)
        ? [frameTarget]
        : [];
    if (ids.length > 0) {
      shouldFrameRef.current = true;
      frameIdsRef.current = ids;
    }
    onFramed?.();
  }, [frameTarget]);

  useFrame(() => {
    // Resolve selected object
    if (selectedModelId) {
      const obj = scene.getObjectByName(selectedModelId);
      if (obj !== selectedObject) setSelectedObject(obj || null);
    } else if (selectedObject !== null) {
      setSelectedObject(null);
    }

    // Execute deferred frame fit once objects appear in scene
    if (shouldFrameRef.current && frameIdsRef.current.length > 0) {
      const allPresent = frameIdsRef.current.every((id) =>
        scene.getObjectByName(id)
      );
      if (allPresent) {
        shouldFrameRef.current = false;
        fitToIds(frameIdsRef.current);
      }
    }
  });

  useEffect(() => {
    const controls = transformRef.current;
    if (!controls) return;
    const handleDraggingChanged = (event: any) => {
      if (orbitRef.current) orbitRef.current.enabled = !event.value;
    };
    controls.addEventListener("dragging-changed", handleDraggingChanged);
    return () =>
      controls.removeEventListener("dragging-changed", handleDraggingChanged);
  }, [selectedObject]);

  return (
    <>
      {selectedObject && (
        <TransformControls
          ref={transformRef}
          object={selectedObject}
          mode={transformMode}
          onObjectChange={() => {
            if (selectedModelId && selectedObject && onTransformChange) {
              onTransformChange(selectedModelId, {
                position: [
                  selectedObject.position.x,
                  selectedObject.position.y,
                  selectedObject.position.z,
                ],
                rotation: [
                  selectedObject.rotation.x,
                  selectedObject.rotation.y,
                  selectedObject.rotation.z,
                ],
                scale: [
                  selectedObject.scale.x,
                  selectedObject.scale.y,
                  selectedObject.scale.z,
                ],
              });
            }
          }}
        />
      )}
      <OrbitControls ref={orbitRef} makeDefault />
    </>
  );
}

export function Scene({
  merger,
  isMerged,
  selectedModelId,
  transformMode,
  onModelSelect,
  onTransformChange,
  onModeChange,
  modelIds,
  frameTarget,
  onFramed,
}: SceneProps) {
  return (
    <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Environment preset="studio" />

      <Grid
        args={[10, 10]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6B7280"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9CA3AF"
        fadeDistance={25}
        fadeStrength={1}
        followCamera={false}
      />

      <ModelPreview
        merger={merger}
        isMerged={isMerged}
        selectedModelId={selectedModelId}
        transformMode={transformMode}
        onSelect={onModelSelect}
        onModeChange={onModeChange}
      />

      {/* OrbitControls + TransformControls always rendered; TransformControls
          only activates when selectedModelId is set and not merged */}
      <Controls
        selectedModelId={isMerged ? undefined : selectedModelId}
        transformMode={transformMode}
        onTransformChange={onTransformChange}
        modelIds={modelIds}
        frameTarget={frameTarget}
        onFramed={onFramed}
      />

      <GizmoHelper alignment="top-right" margin={[80, 80]}>
        <GizmoViewcube />
      </GizmoHelper>
    </Canvas>
  );
}
