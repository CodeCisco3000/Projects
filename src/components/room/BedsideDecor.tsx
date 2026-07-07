"use client";

/* =====================================================================
   BedsideDecor.tsx — what actually lives on a nightstand.
   ---------------------------------------------------------------------
   A warm little table lamp (the room's bedside practical — a real point
   light, no shadow map), a half-read paperback, a water bottle, and a
   phone lying face-up with its charging cable draped over the edge to
   the floor. Positions are world-space against the measured nightstand
   (top y≈-2.80, x -2.15..-0.26, z -8.4..-6.32). memo(): static except
   the lamp's light, which is constant anyway.
   ===================================================================== */

import { memo, useMemo } from "react";
import * as THREE from "three";

const TOP_Y = -2.8; // nightstand top surface (measured from the .glb at runtime)

const LAMP_POS: [number, number, number] = [-1.62, TOP_Y, -7.75];
const LAMP_LIGHT = 2.6;               // bedside pool brightness (0 = off)
const LAMP_COLOR = "#ffc98f";         // warm 2700K-ish bulb

function Lamp() {
  // positioned + scaled by the wrapper group in BedsideDecor
  return (
    <group>
      {/* weighted base + slim brass stem */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.04, 24]} />
        <meshStandardMaterial color="#2a2622" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 0.56, 12]} />
        <meshStandardMaterial color="#c9a36a" roughness={0.3} metalness={0.85} />
      </mesh>
      {/* linen drum shade — glows faintly like lit fabric; does NOT enclose the
         light below it, so nothing blacks out (the fan-globe lesson) */}
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
}

/* a paperback lying face-up: colored cover over a white page block */
function Paperback(props: React.ComponentProps<"group">) {
  return (
    <group {...props}>
      <mesh position={[0, 0.025, 0]} castShadow>
        <boxGeometry args={[0.26, 0.045, 0.38]} />
        <meshStandardMaterial color="#efe9da" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0.005, 0.0515, 0]}>
        <boxGeometry args={[0.26, 0.008, 0.385]} />
        <meshStandardMaterial color="#5e2530" roughness={0.6} metalness={0} />
      </mesh>
      {/* a bookmark tail hanging out of the pages */}
      <mesh position={[0.09, 0.03, 0.21]} rotation={[0.3, 0, 0]}>
        <planeGeometry args={[0.05, 0.09]} />
        <meshStandardMaterial color="#c9a36a" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* water bottle: translucent body, half full, matte cap */
function WaterBottle(props: React.ComponentProps<"group">) {
  return (
    <group {...props}>
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.06, 0.34, 20]} />
        <meshStandardMaterial
          color="#bcd8e8"
          transparent
          opacity={0.35}
          roughness={0.15}
          metalness={0}
        />
      </mesh>
      {/* the water inside */}
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.05, 0.055, 0.17, 20]} />
        <meshStandardMaterial color="#7fb4d4" transparent opacity={0.5} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.365, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.05, 16]} />
        <meshStandardMaterial color="#3a6ea5" roughness={0.5} metalness={0.1} />
      </mesh>
    </group>
  );
}

/* phone face-up + charging cable draped over the front edge to the floor */
function Phone(props: React.ComponentProps<"group">) {
  const cable = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0.012, 0.29),    // out of the phone's bottom edge
          new THREE.Vector3(0.3, 0.004, 0.24),  // slack across the tabletop
          new THREE.Vector3(0.55, -0.15, 0.22), // over the right side edge
          new THREE.Vector3(0.58, -1.9, 0.15),  // hanging down the open side
          new THREE.Vector3(0.75, -2.16, -0.3), // pooling toward the wall outlet
        ]),
        32,
        0.0065,
        6,
        false,
      ),
    [],
  );
  return (
    <group {...props}>
      <mesh position={[0, 0.012, 0]} castShadow>
        <boxGeometry args={[0.28, 0.024, 0.56]} />
        <meshStandardMaterial color="#17181c" roughness={0.35} metalness={0.5} />
      </mesh>
      {/* sleeping screen with a faint clock glow */}
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.255, 0.53]} />
        <meshStandardMaterial color="#06070a" emissive="#2a3a55" emissiveIntensity={0.25} roughness={0.2} />
      </mesh>
      <mesh geometry={cable}>
        <meshStandardMaterial color="#d8d4cc" roughness={0.75} metalness={0} />
      </mesh>
    </group>
  );
}

const BedsideDecor = memo(function BedsideDecor() {
  /* scales bring each prop to true size at the room's ~4 units/m (lamp
     ~55 cm, paperback ~18 cm, bottle ~22 cm) — the phone keeps scale 1
     because its cable's drape is authored in nightstand-world offsets */
  return (
    <group>
      <group position={LAMP_POS} scale={1.6}>
        <Lamp />
      </group>
      <Paperback position={[-0.85, TOP_Y, -7.0]} rotation={[0, 0.28, 0]} scale={1.55} />
      <WaterBottle position={[-1.88, TOP_Y, -6.85]} scale={2.1} />
      <Phone position={[-0.75, TOP_Y, -7.62]} rotation={[0, -0.12, 0]} />
    </group>
  );
});

export default BedsideDecor;
