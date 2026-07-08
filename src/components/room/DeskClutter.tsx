"use client";

/* =====================================================================
   DeskClutter.tsx — the desk looks USED now.
   ---------------------------------------------------------------------
   Left of the monitors: headphones on a stand, a coffee mug, an open
   notebook with a pen. On the L's right arm: a calculator, a little
   succulent, and a stack of engineering textbooks wearing the site hard
   hat. Two sticky notes ride the left monitor's bezel. Everything sits
   on the measured desk top (y -2.13); the long arm's usable depth is
   z -8.4..-6.3 and the right arm x 8.7..10.4, z -6.3..-4.2 (vertex-mapped
   from the .glb — don't place outside those or things float).
   memo(): static.
   ===================================================================== */

import { memo, useMemo } from "react";
import * as THREE from "three";

const TOP_Y = -2.13; // desk top surface (measured)

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

/* coffee mug — half-drunk, ring of residue implied by darker inner disc */
function Mug(props: React.ComponentProps<"group">) {
  return (
    <group {...props}>
      <mesh position={[0, 0.085, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.07, 0.17, 20, 1, true]} />
        <meshStandardMaterial color="#7a2e35" roughness={0.35} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* bottom + coffee surface */}
      <mesh position={[0, 0.005, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.01, 20]} />
        <meshStandardMaterial color="#7a2e35" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.068, 0.068, 0.005, 20]} />
        <meshStandardMaterial color="#2b1a10" roughness={0.25} />
      </mesh>
      <mesh position={[0.095, 0.085, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.045, 0.012, 8, 18, Math.PI * 1.4]} />
        <meshStandardMaterial color="#7a2e35" roughness={0.35} />
      </mesh>
    </group>
  );
}

/* open spiral notebook + a pen tossed on it */
function Notebook(props: React.ComponentProps<"group">) {
  const lines = useMemo(() => {
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
      let px = 22 + Math.random() * 10;
      x.moveTo(px, y);
      const len = 120 + Math.random() * 90;
      while (px < 22 + len) {
        px += 8 + Math.random() * 10;
        x.quadraticCurveTo(px - 5, y - 5 + Math.random() * 10, px, y);
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

/* two sticky notes for a monitor bezel (tiny emissive-free colored squares) */
function StickyNotes(props: React.ComponentProps<"group">) {
  return (
    <group {...props}>
      <mesh rotation={[0, 0, 0.06]}>
        <planeGeometry args={[0.14, 0.14]} />
        <meshStandardMaterial color="#f5d76e" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0.17, -0.02, 0.002]} rotation={[0, 0, -0.09]}>
        <planeGeometry args={[0.13, 0.13]} />
        <meshStandardMaterial color="#f2a0b5" roughness={0.9} metalness={0} />
      </mesh>
    </group>
  );
}

/* pocket calculator, slightly askew */
function Calculator(props: React.ComponentProps<"group">) {
  const face = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 192;
    const x = c.getContext("2d")!;
    x.fillStyle = "#23262c";
    x.fillRect(0, 0, 128, 192);
    // solar display
    x.fillStyle = "#9aa88c";
    x.fillRect(14, 14, 100, 30);
    x.fillStyle = "#2e3328";
    x.font = "bold 22px monospace";
    x.textAlign = "right";
    x.fillText("1729.03", 108, 37);
    // key grid
    for (let r = 0; r < 5; r++) {
      for (let col = 0; col < 4; col++) {
        x.fillStyle = r === 4 && col === 3 ? "#c96a3a" : "#3a3f48";
        x.fillRect(14 + col * 26, 58 + r * 26, 20, 18);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group {...props}>
      <mesh position={[0, 0.011, 0]} castShadow>
        <boxGeometry args={[0.22, 0.022, 0.33]} />
        <meshStandardMaterial color="#23262c" roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.0225, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.21, 0.32]} />
        <meshStandardMaterial map={face} roughness={0.6} metalness={0} />
      </mesh>
    </group>
  );
}

/* tiny potted succulent for the desk's right arm */
function Succulent(props: React.ComponentProps<"group">) {
  const leaves = useMemo(() => {
    const rnd = (i: number) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    return Array.from({ length: 9 }, (_, i) => ({
      rot: (i / 9) * Math.PI * 2,
      tilt: 0.5 + rnd(i) * 0.5,
      len: 0.07 + rnd(i + 9) * 0.05,
    }));
  }, []);
  return (
    <group {...props}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.055, 0.1, 16]} />
        <meshStandardMaterial color="#b06a4a" roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.068, 0.068, 0.01, 16]} />
        <meshStandardMaterial color="#3a2c20" roughness={1} metalness={0} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh
          key={i}
          position={[Math.cos(l.rot) * 0.025, 0.11, Math.sin(l.rot) * 0.025]}
          rotation={[Math.sin(l.rot) * l.tilt, 0, -Math.cos(l.rot) * l.tilt]}
          castShadow
        >
          <coneGeometry args={[0.022, l.len * 2, 6]} />
          <meshStandardMaterial color="#4e7a4a" roughness={0.6} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

/* three thick engineering textbooks + the hard hat resting on top */
function TextbookStack(props: React.ComponentProps<"group">) {
  const books = [
    { w: 0.62, t: 0.09, d: 0.46, color: "#3d4d63", rot: 0.05 },
    { w: 0.58, t: 0.08, d: 0.44, color: "#6e3b2a", rot: -0.07 },
    { w: 0.55, t: 0.075, d: 0.42, color: "#2f4a3a", rot: 0.12 },
  ];
  const hatDome = useMemo(() => {
    const prof: [number, number][] = [
      [0.19, 0], [0.19, 0.02], [0.16, 0.03], [0.155, 0.1], [0.12, 0.15], [0.05, 0.18], [0, 0.185],
    ];
    return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 32);
  }, []);
  let y = 0;
  const placed = books.map((b) => {
    y += b.t;
    return { ...b, y: y - b.t / 2 };
  });
  return (
    <group {...props}>
      {placed.map((b, i) => (
        <group key={i} position={[0, b.y, 0]} rotation={[0, b.rot, 0]}>
          <mesh castShadow>
            <boxGeometry args={[b.w, b.t, b.d]} />
            <meshStandardMaterial color={b.color} roughness={0.7} metalness={0} />
          </mesh>
          {/* page block peeking out the open side */}
          <mesh position={[0.006, 0, 0]}>
            <boxGeometry args={[b.w - 0.03, b.t - 0.024, b.d - 0.02]} />
            <meshStandardMaterial color="#e8e0cc" roughness={0.95} metalness={0} />
          </mesh>
        </group>
      ))}
      {/* the site hard hat, slightly tipped */}
      <group position={[0, y, 0]} rotation={[0.09, 0.6, -0.06]}>
        <mesh geometry={hatDome} castShadow>
          <meshStandardMaterial color="#e8b429" roughness={0.32} metalness={0} />
        </mesh>
        <mesh position={[0, 0.012, 0]} rotation={[-0.06, 0, 0]}>
          <torusGeometry args={[0.21, 0.022, 8, 28]} />
          <meshStandardMaterial color="#e8b429" roughness={0.32} metalness={0} />
        </mesh>
      </group>
    </group>
  );
}

const DeskClutter = memo(function DeskClutter() {
  /* scales bring each prop to true size at the room's ~4 units/m
     (headphone stand ~27 cm, A4-ish notebook, 9 cm mug, 1 m textbooks) */
  return (
    <group>
      {/* left of the monitors (long arm, z -8.4..-6.3) */}
      <Headphones position={[3.85, TOP_Y, -7.45]} rotation={[0, 0.5, 0]} scale={1.6} />
      <Notebook position={[4.75, TOP_Y, -6.95]} rotation={[0, 0.24, 0]} scale={1.6} />
      <Mug position={[5.45, TOP_Y, -6.62]} scale={2.2} />
      {/* stuck to the wall just left of the monitors, at sitting eye height */}
      <StickyNotes position={[4.55, -0.85, -8.96]} scale={2} />

      {/* the L's right arm (x 8.7..10.4, z -6.3..-4.2) */}
      <Calculator position={[9.25, TOP_Y, -5.7]} rotation={[0, -0.35, 0]} scale={1.6} />
      <Succulent position={[9.9, TOP_Y, -4.75]} scale={1.8} />
      <TextbookStack position={[9.6, TOP_Y, -7.35]} rotation={[0, -0.25, 0]} scale={1.7} />
    </group>
  );
});

export default DeskClutter;
