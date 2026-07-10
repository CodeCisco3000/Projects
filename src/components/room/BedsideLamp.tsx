"use client";

/* =====================================================================
   BedsideLamp.tsx - the warm little table lamp on the nightstand.
   ---------------------------------------------------------------------
   Ported alone from goodnight's BedsideDecor (Francisco's pick 2026-07-10;
   the paperback/bottle/phone stayed behind). A real practical: weighted
   base, brass stem, linen drum shade that glows like lit fabric, and a
   shadowless point light pooling over the bed corner. The shade does NOT
   enclose the light below it, so nothing blacks out (the fan-globe
   lesson). Position is world-space against the measured nightstand top
   (y -2.8). memo(): static - the light is constant.
   ===================================================================== */

import { memo } from "react";
import * as THREE from "three";

const LAMP_POS: [number, number, number] = [-1.62, -2.8, -7.75];
const LAMP_LIGHT = 2.6;       // bedside pool brightness (0 = off)
const LAMP_COLOR = "#ffc98f"; // warm 2700K-ish bulb

const BedsideLamp = memo(function BedsideLamp() {
  return (
    /* scale 1.6 brings the lamp to ~55 cm true size at the room's ~4 units/m */
    <group position={LAMP_POS} scale={1.6}>
      {/* weighted base + slim brass stem */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.04, 24]} />
        <meshStandardMaterial color="#2a2622" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 0.56, 12]} />
        <meshStandardMaterial color="#c9a36a" roughness={0.3} metalness={0.85} />
      </mesh>
      {/* linen drum shade - glows faintly like lit fabric */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.24, 0.34, 28, 1, true]} />
        <meshStandardMaterial
          color="#e8ddc4"
          emissive="#ffb36b"
          emissiveIntensity={0.55}
          roughness={0.9}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* the bulb's pool of light over the bed corner */}
      {LAMP_LIGHT > 0 && (
        <pointLight
          position={[0, 0.68, 0]}
          intensity={LAMP_LIGHT}
          distance={6}
          decay={2}
          color={LAMP_COLOR}
        />
      )}
    </group>
  );
});

export default BedsideLamp;
