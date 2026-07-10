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
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export default function DecorModel({
  url,
  targetH,
  position = [0, 0, 0],
  rotY = 0,
  darkToColor,
  figurine = false,
}: {
  url: string;
  targetH: number; // world-unit height to scale the model to
  position?: [number, number, number];
  rotY?: number;
  /* repaint the model's DARK materials (lightness < 0.3) this color —
     e.g. the black hockey skate becomes a white figure skate; blades,
     laces and other light parts keep their own colors. Materials are
     cloned so useGLTF's shared cache is never mutated. */
  darkToColor?: string;
  /* "painted resin collectible" finish for low-poly models: welds the
     flat-shaded triangle soup back together, recomputes smooth normals
     (kills the faceted CG look), and swaps materials for a subtle
     clearcoat — reads like a hand-painted figurine instead of a mesh. */
  figurine?: boolean;
}) {
  const { scene } = useGLTF(url);
  const [px, py, pz] = position;
  const node = useMemo(() => {
    const o = scene.clone(true);
    if (figurine) {
      const geoSeen = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
      const matSeen = new Map<THREE.Material, THREE.Material>();
      o.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh) return;
        let g = geoSeen.get(mesh.geometry);
        if (!g) {
          // drop baked flat normals FIRST or mergeVertices can't weld
          // (it only merges vertices whose every attribute matches)
          g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
          g.deleteAttribute("normal");
          g = mergeVertices(g, 1e-4);
          g.computeVertexNormals();
          geoSeen.set(mesh.geometry, g);
        }
        mesh.geometry = g;
        const glaze = (m: THREE.Material) => {
          let cl = matSeen.get(m);
          if (!cl) {
            const sm = m as THREE.MeshStandardMaterial;
            cl = new THREE.MeshPhysicalMaterial({
              color: sm.color ? sm.color.clone() : new THREE.Color("#888"),
              map: sm.map ?? null,
              roughness: 0.38,
              metalness: 0,
              clearcoat: 0.5,
              clearcoatRoughness: 0.28,
            });
            matSeen.set(m, cl);
          }
          return cl;
        };
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(glaze) : glaze(mesh.material);
      });
    }
    if (darkToColor) {
      const hsl = { h: 0, s: 0, l: 0 };
      const seen = new Map<THREE.Material, THREE.Material>();
      o.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh) return;
        const repaint = (m: THREE.Material) => {
          const sm = m as THREE.MeshStandardMaterial;
          if (!sm.color) return m;
          sm.color.getHSL(hsl);
          if (hsl.l >= 0.3) return m;
          let cl = seen.get(m);
          if (!cl) {
            cl = sm.clone();
            (cl as THREE.MeshStandardMaterial).color.set(darkToColor);
            (cl as THREE.MeshStandardMaterial).roughness = 0.45;
            seen.set(m, cl);
          }
          return cl;
        };
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(repaint)
          : repaint(mesh.material);
      });
    }
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
  }, [scene, targetH, rotY, px, py, pz, darkToColor, figurine]);
  return <primitive object={node} />;
}

useGLTF.preload("/models/decor/trex.glb");
useGLTF.preload("/models/decor/diplodocus.glb");
useGLTF.preload("/models/decor/soccer-ball.glb");
