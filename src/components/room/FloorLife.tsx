"use client";

/* =====================================================================
   FloorLife.tsx — the floor stops being an empty plane.
   ---------------------------------------------------------------------
   A woven area rug under the room's center (where the fan light pools),
   white figure skates + a duffel skate bag beside the desk, and a pair
   of sneakers kicked off near the room opening. The soccer ball lives in
   RoomScene (placed with the furniture Suspense). Rug art is procedural;
   skates/sneakers are Poly Pizza models (CREDITS.md). memo(): static.
   ===================================================================== */

import { memo, Suspense, useMemo } from "react";
import * as THREE from "three";
import DecorModel from "./DecorModel";

const FLOOR_Y = -5;

/* geometric wool rug: navy field, cream border, rust diamond medallions,
   fringe painted at the short ends */
function rugTexture() {
  const W = 1024, H = 672;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  const FR = 26; // fringe band on each short end
  // cream base = the border color
  x.fillStyle = "#ddd2b8";
  x.fillRect(FR, 0, W - 2 * FR, H);
  // navy field
  x.fillStyle = "#2c3a52";
  x.fillRect(FR + 34, 34, W - 2 * FR - 68, H - 68);
  // thin rust inner rule
  x.strokeStyle = "#a35b3a";
  x.lineWidth = 6;
  x.strokeRect(FR + 52, 52, W - 2 * FR - 104, H - 104);
  // diamond medallions across the field
  x.fillStyle = "#a35b3a";
  const rows = 2, cols = 4;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const cx = FR + 140 + col * ((W - 2 * FR - 280) / (cols - 1));
      const cy = 190 + r * (H - 380);
      x.save();
      x.translate(cx, cy);
      x.rotate(Math.PI / 4);
      x.fillRect(-34, -34, 68, 68);
      x.fillStyle = "#ddd2b8";
      x.fillRect(-16, -16, 32, 32);
      x.fillStyle = "#a35b3a";
      x.restore();
    }
  }
  // center lozenge
  x.save();
  x.translate(W / 2, H / 2);
  x.rotate(Math.PI / 4);
  x.fillStyle = "#c9873f";
  x.fillRect(-56, -56, 112, 112);
  x.fillStyle = "#2c3a52";
  x.fillRect(-30, -30, 60, 60);
  x.restore();
  // weave: fine alternating scanlines
  x.globalAlpha = 0.08;
  x.fillStyle = "#000";
  for (let i = 0; i < H; i += 3) x.fillRect(0, i, W, 1);
  x.globalAlpha = 1;
  // wear: a few brighter patches where feet land
  x.globalAlpha = 0.1;
  x.fillStyle = "#fff";
  for (const [px, py, r] of [[W * 0.3, H * 0.62, 90], [W * 0.68, H * 0.4, 110], [W * 0.5, H * 0.52, 70]] as const) {
    const g = x.createRadialGradient(px, py, 8, px, py, r);
    g.addColorStop(0, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(px, py, r, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;
  // fringe strands at the short ends
  x.fillStyle = "#e8e0cc";
  for (let y = 4; y < H - 4; y += 7) {
    x.fillRect(0, y, FR - 2, 3);
    x.fillRect(W - FR + 2, y, FR - 2, 3);
  }
  // speckle
  for (let i = 0; i < 2200; i++) {
    x.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * 0.07})`;
    x.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function Rug() {
  const tex = useMemo(() => rugTexture(), []);
  return (
    /* a real thin slab (not a decal plane) so the pile has an edge you can
       see at grazing angles; receives both key lights' shadows */
    <mesh position={[0.4, FLOOR_Y + 0.018, 1.5]} rotation={[0, 0.035, 0]} receiveShadow castShadow>
      <boxGeometry args={[7.2, 0.036, 4.7]} />
      <meshStandardMaterial map={tex} roughness={0.96} metalness={0} />
    </mesh>
  );
}

/* the skate duffel: a capsule bag on the floor with strap + zipper */
function SkateBag(props: React.ComponentProps<"group">) {
  return (
    <group {...props}>
      <mesh position={[0, 0.42, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.42, 0.9, 8, 20]} />
        <meshStandardMaterial color="#22314f" roughness={0.85} metalness={0} />
      </mesh>
      {/* zipper track along the top */}
      <mesh position={[0, 0.83, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.035, 1.26, 0.02]} />
        <meshStandardMaterial color="#c9ccd2" roughness={0.35} metalness={0.7} />
      </mesh>
      {/* carry straps arcing over the body */}
      {[-0.28, 0.28].map((dx, i) => (
        <mesh key={i} position={[dx, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.3, 0.028, 8, 22, Math.PI]} />
          <meshStandardMaterial color="#a3213b" roughness={0.8} metalness={0} />
        </mesh>
      ))}
      {/* end pocket */}
      <mesh position={[0.66, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.36, 0.36, 0.1, 20]} />
        <meshStandardMaterial color="#1a2438" roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}

/* woven laundry basket with a hoodie flopped over the rim — fills the
   front-right corner that read as dead space from the Contact stop */
function LaundryBasket(props: React.ComponentProps<"group">) {
  const weave = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const x = c.getContext("2d")!;
    x.fillStyle = "#a8895c";
    x.fillRect(0, 0, 256, 128);
    // basket lattice: alternating over/under bands
    for (let ry = 0; ry < 8; ry++) {
      for (let rx = 0; rx < 16; rx++) {
        x.fillStyle = (rx + ry) % 2 ? "#c2a473" : "#8f7141";
        x.fillRect(rx * 16, ry * 16, 15, 15);
      }
    }
    // shading grain
    x.globalAlpha = 0.15;
    x.fillStyle = "#000";
    for (let i = 0; i < 128; i += 4) x.fillRect(0, i, 256, 1);
    x.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 1);
    return t;
  }, []);
  return (
    <group {...props}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.5, 1.1, 20, 1, true]} />
        <meshStandardMaterial map={weave} roughness={0.9} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* basket floor + rim bead */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.04, 20]} />
        <meshStandardMaterial color="#75592f" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.62, 0.035, 8, 24]} />
        <meshStandardMaterial color="#8a6f4a" roughness={0.85} metalness={0} />
      </mesh>
      {/* laundry inside + a sleeve flopped over the rim */}
      <mesh position={[0.05, 1.02, -0.05]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[0.52, 16, 12]} />
        <meshStandardMaterial color="#93a3b5" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0.55, 0.98, 0.2]} rotation={[0, 0.3, -1.1]} scale={[1, 0.35, 0.5]} castShadow>
        <capsuleGeometry args={[0.14, 0.5, 4, 10]} />
        <meshStandardMaterial color="#7a2e35" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

const FloorLife = memo(function FloorLife() {
  return (
    <group>
      <Rug />
      <SkateBag position={[3.1, FLOOR_Y, -4.0]} rotation={[0, 0.5, 0]} />
      {/* rotY π turns the flopped sleeve toward the room; 1.45 = real hamper height */}
      <LaundryBasket position={[9.6, FLOOR_Y, 6.6]} rotation={[0, Math.PI, 0]} scale={1.45} />
      <Suspense fallback={null}>
        {/* white figure skates parked beside the desk's left end — one upright,
           one tipped a little as if just unlaced */}
        <DecorModel
          url="/models/decor/ice-skate.glb"
          targetH={1.0}
          position={[3.7, FLOOR_Y, -5.55]}
          rotY={-1.3}
          darkToColor="#efe9e2"
        />
        <DecorModel
          url="/models/decor/ice-skate.glb"
          targetH={1.0}
          position={[4.55, FLOOR_Y, -5.0]}
          rotY={-1.9}
          darkToColor="#efe9e2"
        />
        {/* sneakers kicked off near the room opening */}
        <DecorModel
          url="/models/decor/sneakers.glb"
          targetH={0.55}
          position={[-1.6, FLOOR_Y, 6.9]}
          rotY={2.5}
        />
      </Suspense>
    </group>
  );
});

export default FloorLife;
