"use client";

/* =====================================================================
   Bookshelf.tsx — the collector's bookcase on the front-left wall.
   ---------------------------------------------------------------------
   A walnut bookcase filling the room's emptiest corner (front-left), read
   as naturally accumulated: runs of books with real gaps and leaners, a
   pair of soccer trophies, a crate of vinyl on the bottom shelf, and a
   record player up top whose platter actually spins — the physical source
   of the site's "NOW PLAYING" widget.

   Perf: all ~70 books are ONE InstancedMesh (per-instance color), the
   vinyl sleeves another; the carcass shares one material. The whole unit
   is ~30 draw calls. Deterministic seeded RNG so the arrangement doesn't
   reshuffle between mounts (and render stays pure). memo(): static.
   ===================================================================== */

import { memo, Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import DecorModel from "./DecorModel";

/* ---- placement knobs (world units; wall at x=-11, floor at y=-5) ---- */
/* real-bookcase proportions at the room's ~4 units/m scale (a Billy is
   202×80×28 cm ≈ 8.1×3.2×1.1 units — the first pass was dollhouse-sized) */
const SHELF_POS: [number, number, number] = [-11 + 0.55, -5, 5.4]; // back at the wall, base on the floor
const SHELF_W = 3.2;   // width along the wall (~80 cm)
const SHELF_H = 6.4;   // total height (~1.6 m)
const SHELF_D = 1.05;  // depth into the room (~26 cm)
const SHELF_COUNT = 4; // interior shelf boards (5 bays incl. the top surface)
const WOOD = "#4a3524";
const WOOD_DARK = "#3a2a1c";
const PLATTER_SPEED = 1.6; // record spin, rad/s (33⅓ rpm ≈ 3.5 — halved reads calmer)

/* deterministic RNG — same shelf every visit, pure across re-renders */
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

/* muted, real-bookcase spine palette (construction tans, navy manuals,
   oxblood novels, manga whites) — no oversaturated toys */
const SPINES = [
  "#3d4d63", "#5a2f33", "#2f4a3a", "#c9b896", "#8a6f4a", "#22303f",
  "#6e3b2a", "#a3947a", "#54423a", "#7c8894", "#403020", "#94a08c",
  "#e8e0d0", "#d8cdb4", "#5e6b52", "#814d3b",
];

const BAY_H = (SHELF_H - 0.3) / (SHELF_COUNT + 1); // clear height per bay
const BOARD_T = 0.045;

type Inst = { pos: [number, number, number]; scale: [number, number, number]; rotZ: number; color: string };

/* fill the middle bays with book runs: gaps, leaners, one flat stack */
function buildBooks(): Inst[] {
  const rnd = mulberry32(20260706);
  const out: Inst[] = [];
  const innerW = SHELF_W - 0.16;
  for (let bay = 1; bay <= 4; bay++) {
    const shelfY = 0.08 + bay * (BAY_H + BOARD_T); // top surface of this bay's board
    // bay 4 keeps its left half clear — that's the dino figurines' display spot
    let x = bay === 4 ? 0.12 : -innerW / 2 + 0.04;
    while (x < innerW / 2 - 0.1) {
      // start a run of 3–9 books, then leave a gap (or something else's spot)
      const run = 3 + Math.floor(rnd() * 7);
      for (let b = 0; b < run && x < innerW / 2 - 0.1; b++) {
        const t = 0.045 + rnd() * 0.05;          // thickness
        const h = BAY_H * (0.55 + rnd() * 0.3);  // height
        const d = SHELF_D * (0.62 + rnd() * 0.16);
        const lean = b === run - 1 && rnd() < 0.4 ? 0.1 + rnd() * 0.12 : 0; // last book slumps
        out.push({
          pos: [x + t / 2, shelfY + h / 2 + (lean ? -0.01 : 0), (rnd() - 0.5) * 0.03],
          scale: [t, h, d],
          rotZ: lean,
          color: SPINES[Math.floor(rnd() * SPINES.length)],
        });
        x += t + (lean ? h * 0.1 : 0.004);
      }
      const gap = rnd();
      if (gap < 0.35 && x < innerW / 2 - 0.5) {
        // a small horizontal stack fills some gaps (books resting flat)
        const stack = 2 + Math.floor(rnd() * 3);
        const sw = 0.34 + rnd() * 0.1;
        for (let s = 0; s < stack; s++) {
          const t = 0.05 + rnd() * 0.03;
          out.push({
            pos: [x + sw / 2, shelfY + t / 2 + s * (t + 0.002), 0],
            scale: [sw, t, SHELF_D * 0.66],
            rotZ: 0,
            color: SPINES[Math.floor(rnd() * SPINES.length)],
          });
        }
        x += sw + 0.1;
      } else {
        x += 0.14 + rnd() * 0.3; // an honest gap (dust and elbow room)
      }
    }
  }
  return out;
}

function Books() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const books = useMemo(buildBooks, []);
  const setup = useMemo(() => {
    // bake transforms/colors into buffers once; applied via the ref callback
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    return (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      books.forEach((b, i) => {
        e.set(0, 0, b.rotZ);
        m.compose(v.set(...b.pos), q.setFromEuler(e), s.set(...b.scale));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, col.set(b.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
  }, [books]);
  return (
    <instancedMesh
      ref={(mesh) => {
        ref.current = mesh;
        setup(mesh);
      }}
      args={[undefined, undefined, books.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.82} metalness={0} />
    </instancedMesh>
  );
}

/* a soccer trophy: marble base, gold stem + cup (lathe), two loop handles */
function Trophy({ h = 0.5, ...props }: { h?: number } & React.ComponentProps<"group">) {
  const cup = useMemo(() => {
    const pts: [number, number][] = [
      [0.0, 0.0], [0.16, 0.0], [0.16, 0.03], [0.05, 0.05], [0.04, 0.16],
      [0.13, 0.24], [0.17, 0.38], [0.16, 0.5], [0.13, 0.52], [0.14, 0.53],
      [0.18, 0.52], [0.2, 0.4],
    ];
    return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 32);
  }, []);
  const s = h / 0.53;
  return (
    <group {...props}>
      <mesh position={[0, 0.03 * s, 0]} castShadow>
        <boxGeometry args={[0.3 * s, 0.06 * s, 0.3 * s]} />
        <meshStandardMaterial color="#2a2622" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh geometry={cup} position={[0, 0.06 * s, 0]} scale={s} castShadow>
        <meshStandardMaterial color="#d4af37" roughness={0.24} metalness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.2 * s, 0.47 * s, 0]}
          rotation={[0, 0, side * -0.2]}
          castShadow
        >
          <torusGeometry args={[0.07 * s, 0.014 * s, 8, 20, Math.PI * 1.5]} />
          <meshStandardMaterial color="#d4af37" roughness={0.24} metalness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* crate of vinyl on the bottom shelf: pine box + a fan of leaning sleeves */
function VinylCrate(props: React.ComponentProps<"group">) {
  const sleeves = useMemo(() => {
    const rnd = mulberry32(19590817);
    const colors = ["#1a1a1c", "#5b2129", "#233a56", "#d8cdb4", "#2f4a3a", "#8a2f23", "#e8e0d0", "#3a3f52", "#6e5535", "#20262e"];
    return Array.from({ length: 12 }, (_, i) => ({
      x: -0.4 + i * 0.072,
      rot: -0.34 + rnd() * 0.1,
      color: colors[Math.floor(rnd() * colors.length)],
    }));
  }, []);
  const setup = useMemo(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3(0.03, 1.18, 1.18); // true LP sleeves (~30 cm)
    const col = new THREE.Color();
    return (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      sleeves.forEach((sl, i) => {
        e.set(0, 0, sl.rot);
        m.compose(v.set(sl.x, 0.66, 0), q.setFromEuler(e), s);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, col.set(sl.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
  }, [sleeves]);
  const pine = <meshStandardMaterial color="#9a7c54" roughness={0.75} metalness={0} />;
  return (
    <group {...props}>
      {/* open crate: bottom + two ends + two rails (sized for real LPs) */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[1.34, 0.06, 1.3]} />
        {pine}
      </mesh>
      {[-0.67, 0.67].map((x, i) => (
        <mesh key={i} position={[x, 0.55, 0]} castShadow>
          <boxGeometry args={[0.06, 1.04, 1.3]} />
          {pine}
        </mesh>
      ))}
      {[-0.62, 0.62].map((z, i) => (
        <mesh key={i} position={[0, 0.44, z]}>
          <boxGeometry args={[1.34, 0.3, 0.05]} />
          {pine}
        </mesh>
      ))}
      <instancedMesh ref={setup} args={[undefined, undefined, sleeves.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.6} metalness={0} />
      </instancedMesh>
    </group>
  );
}

/* the record player: walnut plinth, spinning platter + vinyl, tonearm */
function RecordPlayer(props: React.ComponentProps<"group">) {
  const disc = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (disc.current) disc.current.rotation.y += PLATTER_SPEED * dt;
  });
  return (
    <group {...props}>
      {/* plinth */}
      <mesh position={[0, 0.045, 0]} castShadow>
        <boxGeometry args={[0.78, 0.09, 0.62]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.4} metalness={0.05} />
      </mesh>
      {/* platter + record, spinning together */}
      <group ref={disc} position={[-0.06, 0.09, 0]}>
        <mesh position={[0, 0.012, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.025, 40]} />
          <meshStandardMaterial color="#17181c" roughness={0.45} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.028, 0]}>
          <cylinderGeometry args={[0.245, 0.245, 0.006, 40]} />
          <meshStandardMaterial color="#0b0b0d" roughness={0.32} metalness={0.05} />
        </mesh>
        {/* label + spindle */}
        <mesh position={[0, 0.033, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.004, 24]} />
          <meshStandardMaterial color="#a3213b" roughness={0.6} metalness={0} />
        </mesh>
        <mesh position={[0, 0.045, 0]}>
          <cylinderGeometry args={[0.007, 0.007, 0.03, 10]} />
          <meshStandardMaterial color="#c9ccd2" roughness={0.25} metalness={0.9} />
        </mesh>
      </group>
      {/* tonearm: pivot post, arm angled over the record, counterweight */}
      <group position={[0.3, 0.09, -0.2]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.03, 0.035, 0.1, 16]} />
          <meshStandardMaterial color="#8f8f96" roughness={0.3} metalness={0.9} />
        </mesh>
        <mesh position={[-0.14, 0.1, 0.1]} rotation={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.011, 0.011, 0.42, 10]} />
          <meshStandardMaterial color="#b9bcc4" roughness={0.28} metalness={0.95} />
        </mesh>
        <mesh position={[0.05, 0.1, -0.05]}>
          <cylinderGeometry args={[0.025, 0.025, 0.05, 12]} />
          <meshStandardMaterial color="#5a5d64" roughness={0.35} metalness={0.9} />
        </mesh>
        {/* headshell tip riding the groove */}
        <mesh position={[-0.28, 0.075, 0.21]} rotation={[0, 0.62, 0]}>
          <boxGeometry args={[0.05, 0.02, 0.025]} />
          <meshStandardMaterial color="#17181c" roughness={0.5} metalness={0.2} />
        </mesh>
      </group>
      {/* two sleeves leaning back against the wall behind the player (tops
         touch the wall plane at the parent's 1.9 scale — don't nudge z
         without rechecking the lean) */}
      <mesh position={[0.5, 0.19, -0.25]} rotation={[-0.16, 0, 0.06]} castShadow>
        <boxGeometry args={[0.36, 0.36, 0.012]} />
        <meshStandardMaterial color="#b3111d" roughness={0.6} metalness={0} />
      </mesh>
      <mesh position={[0.53, 0.18, -0.21]} rotation={[-0.2, 0, 0.1]} castShadow>
        <boxGeometry args={[0.36, 0.36, 0.012]} />
        <meshStandardMaterial color="#1f2430" roughness={0.6} metalness={0} />
      </mesh>
    </group>
  );
}

/* small stack of board-game / console-game boxes for a shelf end */
function GameStack(props: React.ComponentProps<"group">) {
  const games = [
    { w: 0.34, t: 0.05, d: 0.24, color: "#25445e", rot: 0.02 },
    { w: 0.32, t: 0.045, d: 0.23, color: "#5e2530", rot: -0.04 },
    { w: 0.35, t: 0.055, d: 0.25, color: "#2c4a38", rot: 0.06 },
  ];
  let y = 0;
  return (
    <group {...props}>
      {games.map((g, i) => {
        y += g.t / 2;
        const el = (
          <mesh key={i} position={[0, y, 0]} rotation={[0, g.rot, 0]} castShadow>
            <boxGeometry args={[g.w, g.t, g.d]} />
            <meshStandardMaterial color={g.color} roughness={0.55} metalness={0} />
          </mesh>
        );
        y += g.t / 2 + 0.002;
        return el;
      })}
    </group>
  );
}

const Bookshelf = memo(function Bookshelf() {
  const boards = useMemo(() => {
    const ys: number[] = [];
    for (let i = 1; i <= SHELF_COUNT; i++) ys.push(0.08 + i * (BAY_H + BOARD_T) - BOARD_T / 2);
    return ys;
  }, []);
  const woodMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.58, metalness: 0 }),
    [],
  );
  const innerW = SHELF_W - 0.16;
  return (
    /* local space: origin at the unit's floor center, +Z faces into the room;
       the group rotation turns that to face +X off the left wall */
    <group position={SHELF_POS} rotation={[0, Math.PI / 2, 0]}>
      {/* carcass: sides, top, kick, back panel */}
      <mesh position={[-SHELF_W / 2 + 0.04, SHELF_H / 2, 0]} material={woodMat} castShadow receiveShadow>
        <boxGeometry args={[0.08, SHELF_H, SHELF_D]} />
      </mesh>
      <mesh position={[SHELF_W / 2 - 0.04, SHELF_H / 2, 0]} material={woodMat} castShadow receiveShadow>
        <boxGeometry args={[0.08, SHELF_H, SHELF_D]} />
      </mesh>
      <mesh position={[0, SHELF_H - 0.035, 0]} material={woodMat} castShadow receiveShadow>
        <boxGeometry args={[SHELF_W, 0.07, SHELF_D]} />
      </mesh>
      <mesh position={[0, 0.04, 0]} material={woodMat} receiveShadow>
        <boxGeometry args={[SHELF_W - 0.1, 0.08, SHELF_D - 0.06]} />
      </mesh>
      <mesh position={[0, SHELF_H / 2, -SHELF_D / 2 + 0.015]} receiveShadow>
        <boxGeometry args={[SHELF_W - 0.06, SHELF_H - 0.1, 0.03]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.7} metalness={0} />
      </mesh>
      {boards.map((y, i) => (
        <mesh key={i} position={[0, y, 0]} material={woodMat} castShadow receiveShadow>
          <boxGeometry args={[innerW, BOARD_T, SHELF_D - 0.05]} />
        </mesh>
      ))}

      {/* the life on it */}
      <Books />
      {/* bottom bay: the record crate + game stack */}
      <VinylCrate position={[-0.7, 0.08, 0]} />
      <GameStack position={[0.85, 0.085, 0.04]} rotation={[0, -0.06, 0]} scale={1.7} />
      {/* trophies: the big cup on the second bay's board end, the small one
         sharing bay 4's display shelf with the diplodocus */}
      <Trophy h={0.78} position={[1.1, 0.08 + 2 * (BAY_H + BOARD_T), 0]} />
      <Trophy h={0.58} position={[-1.2, 0.08 + 4 * (BAY_H + BOARD_T), 0.04]} />
      {/* scaled 1.9 = a real ~45 cm turntable; the plinth overhangs the case
         front a touch, the way narrow bookcases actually carry one */}
      <RecordPlayer position={[0.45, SHELF_H, 0.06]} rotation={[0, -0.04, 0]} scale={1.9} />
      {/* the dino figurines — lengths run ALONG the shelf (their long axis is
         model-space X; keep rotY small or they poke out of the shelf depth).
         T. rex prowls the top surface beside the record player; the
         diplodocus holds bay 4's display half. */}
      <Suspense fallback={null}>
        <DecorModel
          url="/models/decor/trex.glb"
          targetH={0.48}
          position={[-1.05, SHELF_H, 0.05]}
          rotY={0.3}
        />
        <DecorModel
          url="/models/decor/diplodocus.glb"
          targetH={0.34}
          position={[-0.45, 0.08 + 4 * (BAY_H + BOARD_T), 0.06]}
          rotY={-0.2}
        />
      </Suspense>
    </group>
  );
});

export default Bookshelf;
