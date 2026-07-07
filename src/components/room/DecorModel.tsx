"use client";

/* =====================================================================
   DecorModel.tsx — generic loader for small downloaded props.
   ---------------------------------------------------------------------
   The same deterministic fit the furniture gets (measure → scale → drop
   base → center), for the little personality props: shelf figurines, the
   floor plant, the soccer ball. `position` is where the model's BASE
   CENTER lands in the parent's space, so props sit exactly on whatever
   surface the parent provides (floor, shelf board, desk top). Suspends
   via useGLTF — mount under a <Suspense>.
   ===================================================================== */

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export default function DecorModel({
  url,
  targetH,
  position = [0, 0, 0],
  rotY = 0,
}: {
  url: string;
  targetH: number; // world-unit height to scale the model to
  position?: [number, number, number];
  rotY?: number;
}) {
  const { scene } = useGLTF(url);
  const [px, py, pz] = position;
  const node = useMemo(() => {
    const o = scene.clone(true);
    o.rotation.set(0, rotY, 0);
    o.scale.setScalar(1);
    o.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    o.scale.setScalar(targetH / size.y);
    o.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o);
    o.position.set(
      px - (box.min.x + box.max.x) / 2, // center on x
      py - box.min.y,                   // base on the given surface
      pz - (box.min.z + box.max.z) / 2, // center on z
    );
    o.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    return o;
  }, [scene, targetH, rotY, px, py, pz]);
  return <primitive object={node} />;
}

useGLTF.preload("/models/decor/trex.glb");
useGLTF.preload("/models/decor/diplodocus.glb");
useGLTF.preload("/models/decor/rubber-fig.glb");
useGLTF.preload("/models/decor/soccer-ball.glb");
