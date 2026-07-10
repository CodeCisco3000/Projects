"use client";

/* =====================================================================
   DeskClutter.tsx — the desk looks USED now.
   ---------------------------------------------------------------------
   Left of the monitors: over-ear headphones on a stand and an open
   spiral notebook with a pen tossed on it. Both sit on the measured
   desk top (y -2.13); the long arm's usable depth is z -8.4..-6.3
   (vertex-mapped from the .glb — don't place outside that or things
   float). Ported piece-by-piece from the goodnight room: Francisco
   picked exactly these two; the mug/stickies/calculator/succulent/
   textbook stack stayed behind. memo(): static.
   ===================================================================== */

import { memo, useMemo } from "react";
import * as THREE from "three";

const TOP_Y = -2.13; // desk top surface (measured)

/* deterministic RNG - same notebook squiggles every visit, render stays
   pure (same generator Bookshelf uses) */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* over-ear headphones on a desk stand — built like the real thing: a
   flattened headband arc with an under-cushion, brushed-steel yokes, deep
   lathe-turned cup shells with plush cushion rings, and a cable dropping
   to the desk. High segment counts + a clearcoat shell material are what
   separate this from the primitive-toy first pass. */
function Headphones(props: React.ComponentProps<"group">) {
  const mats = useMemo(
    () => ({
      shell: new THREE.MeshPhysicalMaterial({
        color: "#1a1c21",
        roughness: 0.42,
        metalness: 0,
        clearcoat: 0.4,
        clearcoatRoughness: 0.3,
      }),
      cushion: new THREE.MeshStandardMaterial({ color: "#0e0f13", roughness: 0.97, metalness: 0 }),
      metal: new THREE.MeshStandardMaterial({ color: "#9a9da4", roughness: 0.28, metalness: 0.95 }),
      matte: new THREE.MeshStandardMaterial({ color: "#212329", roughness: 0.6, metalness: 0.15 }),
    }),
    [],
  );
  /* cup shell: a smooth turned dome, rim → back, lying on its side */
  const cupGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 22; i++) {
      const t = i / 22;
      const a = t * (Math.PI / 2);
      // superellipse-ish profile: wide rim easing into a rounded back
      pts.push(new THREE.Vector2(Math.cos(a * 0.92) * 0.115, 0.078 * Math.pow(Math.sin(a), 1.35)));
    }
    return new THREE.LatheGeometry(pts, 40);
  }, []);
  const cable = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.34, 0.24, 0.02),  // out of the left cup's base
          new THREE.Vector3(-0.42, 0.1, 0.1),
          new THREE.Vector3(-0.3, 0.006, 0.3),   // slack loop on the desk
          new THREE.Vector3(-0.05, 0.004, 0.38),
          new THREE.Vector3(0.22, 0.004, 0.3),   // trailing toward the desk mat
        ]),
        40,
        0.008,
        8,
        false,
      ),
    [],
  );
  return (
    <group {...props}>
      {/* stand: chamfered base, slim post, saddle cradle */}
      <mesh position={[0, 0.02, 0]} material={mats.matte} castShadow>
        <cylinderGeometry args={[0.13, 0.155, 0.04, 36]} />
      </mesh>
      <mesh position={[0, 0.34, 0]} material={mats.metal} castShadow>
        <cylinderGeometry args={[0.018, 0.024, 0.6, 20]} />
      </mesh>
      <mesh position={[0, 0.63, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.matte} castShadow>
        <capsuleGeometry args={[0.032, 0.14, 8, 20]} />
      </mesh>

      {/* the headset hanging on the cradle */}
      <group position={[0, 0.315, 0]}>
        {/* headband: flattened arc + inner cushion strip */}
        <group scale={[1, 1, 0.62]}>
          <mesh material={mats.shell} castShadow>
            <torusGeometry args={[0.34, 0.03, 18, 56, Math.PI]} />
          </mesh>
          <mesh material={mats.cushion} rotation={[0, 0, Math.PI * 0.2]}>
            <torusGeometry args={[0.315, 0.018, 12, 40, Math.PI * 0.6]} />
          </mesh>
        </group>
        {/* yokes + cups at the band's ends */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.34, -0.04, 0]}>
            {/* brushed slider + fork */}
            <mesh position={[0, 0.06, 0]} material={mats.metal} castShadow>
              <cylinderGeometry args={[0.008, 0.008, 0.1, 12]} />
            </mesh>
            <mesh position={[0, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.metal}>
              <torusGeometry args={[0.03, 0.006, 8, 20, Math.PI]} />
            </mesh>
            {/* cup shell (dome faces outward) + cushion ring + driver plate */}
            <group position={[0, -0.09, 0]} rotation={[0, 0, side * -(Math.PI / 2) - side * 0.09]}>
              <mesh geometry={cupGeo} material={mats.shell} castShadow />
              <mesh position={[0, -0.012, 0]} material={mats.cushion} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.55]} castShadow>
                <torusGeometry args={[0.085, 0.032, 14, 32]} />
              </mesh>
              {/* driver plate closing the cup's opening (normal along -y =
                 out of the rim; rotX π only flipped it to -z and left a
                 see-through ring) */}
              <mesh position={[0, -0.022, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.matte}>
                <circleGeometry args={[0.078, 28]} />
              </mesh>
            </group>
          </group>
        ))}
      </group>

      {/* its cable, dropped onto the desk */}
      <mesh geometry={cable} material={mats.matte} />
    </group>
  );
}

/* open spiral notebook + a pen tossed on it */
function Notebook(props: React.ComponentProps<"group">) {
  const lines = useMemo(() => {
    const rnd = mulberry32(20260710);
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 320;
    const x = c.getContext("2d")!;
    x.fillStyle = "#f2eee2";
    x.fillRect(0, 0, 256, 320);
    x.strokeStyle = "rgba(80,100,140,0.5)";
    x.lineWidth = 2;
    for (let y = 40; y < 300; y += 22) {
      x.beginPath(); x.moveTo(18, y); x.lineTo(238, y); x.stroke();
    }
    // some handwriting squiggles on the upper half
    x.strokeStyle = "rgba(40,45,60,0.75)";
    x.lineWidth = 2.5;
    for (let row = 0; row < 5; row++) {
      const y = 40 + row * 22 - 6;
      x.beginPath();
      let px = 22 + rnd() * 10;
      x.moveTo(px, y);
      const len = 120 + rnd() * 90;
      while (px < 22 + len) {
        px += 8 + rnd() * 10;
        x.quadraticCurveTo(px - 5, y - 5 + rnd() * 10, px, y);
      }
      x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  return (
    <group {...props}>
      <mesh position={[0, 0.012, 0]} castShadow>
        <boxGeometry args={[0.52, 0.024, 0.66]} />
        <meshStandardMaterial color="#c8b48c" roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[0, 0.0255, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 0.62]} />
        <meshStandardMaterial map={lines} roughness={0.9} metalness={0} />
      </mesh>
      {/* spiral binding bumps along the top edge */}
      <mesh position={[0, 0.02, -0.33]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.016, 0.016, 0.5, 8, 1, false]} />
        <meshStandardMaterial color="#8f8f96" roughness={0.3} metalness={0.9} />
      </mesh>
      {/* the pen, dropped at an angle */}
      <group position={[0.1, 0.035, 0.1]} rotation={[0, -0.7, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.011, 0.28, 4, 10]} />
          <meshStandardMaterial color="#1c2a44" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[-0.17, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.01, 0.05, 10]} />
          <meshStandardMaterial color="#c9ccd2" roughness={0.25} metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

const DeskClutter = memo(function DeskClutter() {
  /* scales bring each prop to true size at the room's ~4 units/m
     (headphone stand ~27 cm, A4-ish notebook) */
  return (
    <group>
      {/* left of the monitors (long arm, z -8.4..-6.3) */}
      <Headphones position={[3.85, TOP_Y, -7.45]} rotation={[0, 0.5, 0]} scale={1.6} />
      <Notebook position={[4.75, TOP_Y, -6.95]} rotation={[0, 0.24, 0]} scale={1.6} />
    </group>
  );
});

export default DeskClutter;
