"use client";

/* =====================================================================
   Bookshelf.tsx — the collector's bookcase on the front-left wall.
   ---------------------------------------------------------------------
   A walnut bookcase filling the room's emptiest corner (front-left), read
   as naturally accumulated: runs of books with real gaps and leaners,
   displayed brick builds (a tower crane craning over the diplodocus, a
   dump truck with spilled spare bricks - the civil-engineering corner),
   a crate of vinyl on the bottom shelf, and a record player up top whose
   platter actually spins - the physical source of the site's
   "NOW PLAYING" widget.

   Perf: all ~70 books are ONE InstancedMesh (per-instance color), the
   vinyl sleeves another; each brick build is 2 instanced draws (bodies +
   studs); the carcass shares one material. The whole unit is ~35 draw
   calls. Deterministic seeded RNG so the arrangement doesn't reshuffle
   between mounts (and render stays pure). memo(): static.
   ===================================================================== */

import { memo, Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
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
  /* the colored paperbacks start AFTER each bay's photoscanned encyclopedia
     run (EncyclopediaBooks packs from the left edge); bay 4's left half is
     the dino display */
  const bayStart: Record<number, number> = { 1: -0.35, 2: -0.3, 3: -0.7, 4: 0.12 };
  /* bay 2's right end is the brick dump truck's display spot - books stop early */
  const bayEnd: Record<number, number> = { 2: 0.5 };
  for (let bay = 1; bay <= 4; bay++) {
    const shelfY = 0.08 + bay * (BAY_H + BOARD_T); // top surface of this bay's board
    const end = bayEnd[bay] ?? innerW / 2 - 0.1;
    let x = bayStart[bay];
    while (x < end) {
      // start a run of 3–9 books, then leave a gap (or something else's spot)
      const run = 3 + Math.floor(rnd() * 7);
      for (let b = 0; b < run && x < end; b++) {
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
      if (gap < 0.35 && x < end - 0.4) {
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
  const books = useMemo(() => buildBooks(), []);
  /* two instanced draws: soft-edged covers (per-instance color) + slightly
     inset cream page blocks. The visible page tops between cover edges are
     what stops the books reading as painted boxes. */
  const coverGeo = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, 0.045), []);
  const setup = useMemo(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    return (mesh: THREE.InstancedMesh | null, pages: boolean) => {
      if (!mesh) return;
      books.forEach((b, i) => {
        e.set(0, 0, b.rotZ);
        if (pages) {
          // page core: thinner than the covers, shorter, recessed off the
          // spine face (z offset is rotZ-invariant — rotZ spins around Z)
          m.compose(
            v.set(b.pos[0], b.pos[1], b.pos[2] - b.scale[2] * 0.045),
            q.setFromEuler(e),
            s.set(b.scale[0] * 0.74, b.scale[1] * 0.965, b.scale[2] * 0.92),
          );
        } else {
          m.compose(v.set(...b.pos), q.setFromEuler(e), s.set(...b.scale));
        }
        mesh.setMatrixAt(i, m);
        if (!pages) mesh.setColorAt(i, col.set(b.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
  }, [books]);
  return (
    <>
      <instancedMesh
        ref={(mesh) => setup(mesh, false)}
        args={[undefined, undefined, books.length]}
        geometry={coverGeo}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial roughness={0.78} metalness={0} />
      </instancedMesh>
      <instancedMesh
        ref={(mesh) => setup(mesh, true)}
        args={[undefined, undefined, books.length]}
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#e6ddc6" roughness={0.95} metalness={0} />
      </instancedMesh>
    </>
  );
}

/* ---------- the photoscanned encyclopedia volumes (Poly Haven, CC0) ----------
   20 individually-noded leather volumes with gold-embossed 2K spines. Runs
   pack left-to-right from each bay's left edge using each volume's real
   measured thickness; bay 2 gets a leaner resting against its run. This is
   the realism anchor of the whole bookcase — the procedural paperbacks
   inherit believability by sitting next to them. */
const ENCYC_URL = "/models/polyhaven/book_encyclopedia_set_01/book_encyclopedia_set_01.gltf";
const ENCYC_SCALE = 4; // the set is authored in meters; the room is ~4 units/m

function EncyclopediaBooks() {
  const { scene } = useGLTF(ENCYC_URL);
  const volumes = useMemo(() => {
    // sharpen the shared spine textures once (clone-free: anisotropy only)
    scene.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const sm = m as THREE.MeshStandardMaterial;
        for (const t of [sm.map, sm.normalMap, sm.roughnessMap]) {
          if (t && t.anisotropy < 8) {
            t.anisotropy = 8;
            t.needsUpdate = true;
          }
        }
      }
    });
    const bays: { bay: number; vols: number[]; leaner?: number }[] = [
      { bay: 1, vols: [1, 2, 3, 4, 5, 6, 7, 8] },
      { bay: 2, vols: [9, 10, 11, 12, 13, 14], leaner: 15 },
      { bay: 3, vols: [16, 17, 18, 19, 20] },
    ];
    const out: THREE.Object3D[] = [];
    const fit = (vol: number, bay: number, cursor: number, lean: number) => {
      const src = scene.getObjectByName(`book_encyclopedia_set_01_book${String(vol).padStart(2, "0")}`);
      if (!src) return cursor;
      const o = src.clone(true);
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, lean);
      o.scale.setScalar(ENCYC_SCALE);
      o.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(o);
      const w = box.max.x - box.min.x;
      const shelfY = 0.08 + bay * (BAY_H + BOARD_T);
      o.position.set(
        cursor - box.min.x,          // pack against the cursor
        shelfY - box.min.y,          // base on the shelf board
        0.05 - (box.min.z + box.max.z) / 2, // pulled a touch toward the front edge
      );
      o.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      out.push(o);
      return cursor + w + 0.008;
    };
    for (const row of bays) {
      let cursor = -1.46;
      for (const v of row.vols) cursor = fit(v, row.bay, cursor, 0);
      // the leaner slumps against the end of its run (+rotZ tips the top
      // toward -x, i.e. onto the last upright volume)
      if (row.leaner) fit(row.leaner, row.bay, cursor + 0.02, 0.38);
    }
    return out;
  }, [scene]);
  return (
    <>
      {volumes.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
    </>
  );
}
useGLTF.preload(ENCYC_URL);

/* ---------- generic building-brick builds (the construction corner) ----
   In place of the old soccer trophies: brick builds a civil engineer would
   actually keep on display - a working-yellow tower crane craning over the
   diplodocus on the top bay, and a dump truck with spilled spare bricks
   holding bay 2's right end. Generic stud-on-brick geometry, no branding.
   Perf: every brick body in a build is ONE InstancedMesh (per-instance
   color) and every stud another - a build is 2 draws + a few detail
   meshes. */
const STUD = 0.07;     // stud pitch (world units) - chunky display-build scale
const BRICK_C = 0.084; // one brick course tall
const PLATE_C = 0.028; // one plate course tall (1/3 brick)

type Brick = {
  pos: [number, number, number]; // bottom-center, build-local
  studs: [number, number];       // footprint in studs (x, z)
  courses?: number;              // height in brick courses (1/3 = plate); default 1
  color: string;
  rotY?: number;
};

function BrickBuild({ bricks, ...props }: { bricks: Brick[] } & React.ComponentProps<"group">) {
  // faint bevel = molded-ABS edges (unit box, scaled per instance)
  const bodyGeo = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 1, 0.05), []);
  const studCount = useMemo(() => bricks.reduce((n, b) => n + b.studs[0] * b.studs[1], 0), [bricks]);
  const setup = useMemo(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const off = new THREE.Vector3();
    const col = new THREE.Color();
    return (mesh: THREE.InstancedMesh | null, studsPass: boolean) => {
      if (!mesh) return;
      let i = 0;
      for (const b of bricks) {
        const [nx, nz] = b.studs;
        const h = (b.courses ?? 1) * BRICK_C;
        q.setFromEuler(e.set(0, b.rotY ?? 0, 0));
        col.set(b.color);
        if (!studsPass) {
          m.compose(v.set(b.pos[0], b.pos[1] + h / 2, b.pos[2]), q, s.set(nx * STUD, h, nz * STUD));
          mesh.setMatrixAt(i, m);
          mesh.setColorAt(i, col);
          i++;
        } else {
          // stud grid rides the brick top; hidden studs under stacked
          // bricks stay inside the volume above (and cost nothing visually)
          for (let gx = 0; gx < nx; gx++) {
            for (let gz = 0; gz < nz; gz++) {
              off
                .set((gx - (nx - 1) / 2) * STUD, h + 0.007, (gz - (nz - 1) / 2) * STUD)
                .applyQuaternion(q);
              m.compose(v.set(b.pos[0] + off.x, b.pos[1] + off.y, b.pos[2] + off.z), q, s.set(1, 1, 1));
              mesh.setMatrixAt(i, m);
              mesh.setColorAt(i, col);
              i++;
            }
          }
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
  }, [bricks]);
  return (
    <group {...props}>
      <instancedMesh
        ref={(mesh) => setup(mesh, false)}
        args={[undefined, undefined, bricks.length]}
        geometry={bodyGeo}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial roughness={0.32} metalness={0} clearcoat={0.55} clearcoatRoughness={0.25} />
      </instancedMesh>
      <instancedMesh ref={(mesh) => setup(mesh, true)} args={[undefined, undefined, studCount]}>
        <cylinderGeometry args={[STUD * 0.3, STUD * 0.3, 0.014, 12]} />
        <meshPhysicalMaterial roughness={0.32} metalness={0} clearcoat={0.55} clearcoatRoughness={0.25} />
      </instancedMesh>
    </group>
  );
}

/* thin cylinder between two points (crane tie bars + hook line) */
function Rod({
  from,
  to,
  r,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  r: number;
  color: string;
}) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { pos: a.add(b).multiplyScalar(0.5), quat, len };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[r, r, len, 8]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
    </mesh>
  );
}

const BRICK_YELLOW = "#f2b71c";
const BRICK_GREY = "#3d4045";
const BRICK_MID = "#7d8187";
const BRICK_ORANGE = "#d97a1f";
const BRICK_RED = "#c03a2b";

/* mini tower crane: 6x6 base plate, 8-brick tower, slew + cab, one long
   jib spine with counterweight, apex pylon with tie bars, hook line */
function BrickCrane(props: React.ComponentProps<"group">) {
  const towerTop = PLATE_C + 8 * BRICK_C; // 0.7
  const jibY = towerTop + PLATE_C + BRICK_C; // slew plate + cab = 0.84 top of cab... jib plate bottom
  const bricks = useMemo<Brick[]>(() => {
    const out: Brick[] = [
      { pos: [0, 0, 0], studs: [6, 6], courses: 1 / 3, color: BRICK_GREY },              // base plate
      { pos: [0, towerTop, 0], studs: [2, 2], courses: 1 / 3, color: BRICK_MID },        // slew ring
      { pos: [0, towerTop + PLATE_C, 0], studs: [2, 2], courses: 1, color: BRICK_YELLOW }, // cab
      { pos: [0.14, jibY, 0], studs: [14, 1], courses: 1 / 3, color: BRICK_YELLOW },     // jib + counter-jib spine
      { pos: [-0.28, jibY + PLATE_C, 0], studs: [2, 2], courses: 1, color: BRICK_MID },  // counterweight
      { pos: [0, jibY + PLATE_C, 0], studs: [1, 1], courses: 2, color: BRICK_YELLOW },   // apex pylon
    ];
    for (let i = 0; i < 8; i++)
      out.push({ pos: [0, PLATE_C + i * BRICK_C, 0], studs: [2, 2], courses: 1, color: BRICK_YELLOW }); // tower
    return out;
  }, [towerTop, jibY]);
  const apexTop = jibY + PLATE_C + 2 * BRICK_C;
  return (
    <group {...props}>
      <BrickBuild bricks={bricks} />
      {/* cab glazing (front face toward the jib) */}
      <mesh position={[0.071, towerTop + PLATE_C + BRICK_C * 0.55, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.11, 0.052]} />
        <meshStandardMaterial color="#16202c" roughness={0.15} metalness={0.1} />
      </mesh>
      {/* tie bars: apex → mid-jib, apex → counterweight */}
      <Rod from={[0, apexTop, 0]} to={[0.46, jibY + PLATE_C + 0.005, 0]} r={0.005} color="#4a4d52" />
      <Rod from={[0, apexTop, 0]} to={[-0.28, jibY + PLATE_C + BRICK_C, 0]} r={0.005} color="#4a4d52" />
      {/* hook line dropping from the jib tip */}
      <Rod from={[0.56, jibY, 0]} to={[0.56, jibY - 0.38, 0]} r={0.0035} color="#2c2e33" />
      <mesh position={[0.56, jibY - 0.395, 0]} castShadow>
        <boxGeometry args={[0.03, 0.03, 0.02]} />
        <meshStandardMaterial color={BRICK_MID} roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0.56, jibY - 0.43, 0]} rotation={[0, 0, Math.PI * 0.9]}>
        <torusGeometry args={[0.018, 0.005, 8, 16, Math.PI * 1.45]} />
        <meshStandardMaterial color="#9a9da4" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  );
}

/* brick dump truck: cab-over front, orange tipper bed, chunky black wheels,
   plus the spare bricks it "spilled" on the shelf around it */
function BrickTruck(props: React.ComponentProps<"group">) {
  const bricks = useMemo<Brick[]>(
    () => [
      { pos: [0, 0.095, 0], studs: [7, 4], courses: 1 / 3, color: BRICK_GREY },        // chassis plate
      { pos: [0.175, 0.123, 0], studs: [2, 4], courses: 2, color: BRICK_YELLOW },      // cab, two bricks tall
      { pos: [-0.105, 0.123, 0], studs: [4, 4], courses: 1 / 3, color: BRICK_ORANGE }, // tipper floor
      { pos: [-0.105, 0.151, 0.105], studs: [4, 1], courses: 1, color: BRICK_ORANGE }, // tipper walls
      { pos: [-0.105, 0.151, -0.105], studs: [4, 1], courses: 1, color: BRICK_ORANGE },
      { pos: [-0.21, 0.151, 0], studs: [1, 2], courses: 1, color: BRICK_ORANGE },
      { pos: [0, 0.151, 0], studs: [1, 2], courses: 1, color: BRICK_ORANGE },
      { pos: [-0.12, 0.151, 0.01], studs: [2, 1], courses: 1, color: BRICK_RED, rotY: 0.4 }, // load in the bed
      /* the spilled spares, flat on the shelf */
      { pos: [0.42, 0, 0.1], studs: [4, 2], courses: 1, color: BRICK_RED, rotY: -0.5 },
      { pos: [-0.38, 0, -0.16], studs: [2, 2], courses: 1, color: BRICK_YELLOW, rotY: 0.7 },
      { pos: [0.36, 0, -0.14], studs: [2, 1], courses: 1, color: BRICK_MID, rotY: 1.2 },
    ],
    [],
  );
  return (
    <group {...props}>
      <BrickBuild bricks={bricks} />
      {/* windshield across the cab's face */}
      <mesh position={[0.246, 0.24, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.2, 0.06]} />
        <meshStandardMaterial color="#16202c" roughness={0.15} metalness={0.1} />
      </mesh>
      {/* wheels tucked into the chassis arches */}
      {(
        [
          [0.15, 0.145],
          [0.15, -0.145],
          [-0.13, 0.145],
          [-0.13, -0.145],
        ] as const
      ).map(([x, z], i) => (
        <group key={i} position={[x, 0.06, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.045, 18]} />
            <meshStandardMaterial color="#141518" roughness={0.85} metalness={0} />
          </mesh>
          <mesh position={[0, 0, Math.sign(z) * 0.024]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.026, 0.026, 0.004, 12]} />
            <meshStandardMaterial color="#8d9197" roughness={0.35} metalness={0.6} />
          </mesh>
        </group>
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
      {/* amber power LED on the plinth's front face - this deck feeds the
         site's NOW PLAYING widget, so it visibly stays on */}
      <mesh position={[-0.3, 0.045, 0.312]}>
        <boxGeometry args={[0.02, 0.008, 0.004]} />
        <meshStandardMaterial color="#1a1108" emissive="#ff9d2e" emissiveIntensity={3} roughness={0.4} metalness={0} />
      </mesh>
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

/* warm display lighting for the unit: one soft accent spot washing the
   face (the sun beam never reaches this corner - without it the bays read
   as black holes), sold by thin LED strips under each board's front lip.
   The spot casts no shadow, so its light reaches INTO the bays - exactly
   the under-shelf-LED look the strips claim. One extra forward light. */
function ShelfLight() {
  const target = useMemo(() => {
    const t = new THREE.Object3D();
    t.position.set(0, SHELF_H * 0.5, 0);
    return t;
  }, []);
  return (
    <>
      {/* cone wide enough to catch the TOP surface too - the record player
         lives up there and read as a black blob outside the original beam */}
      <spotLight
        position={[0, SHELF_H + 2.6, 4.2]}
        target={target}
        angle={0.55}
        penumbra={0.75}
        intensity={52}
        distance={16}
        decay={2}
        color="#ffdfae"
      />
      <primitive object={target} />
    </>
  );
}

const Bookshelf = memo(function Bookshelf() {
  const boards = useMemo(() => {
    const ys: number[] = [];
    for (let i = 1; i <= SHELF_COUNT; i++) ys.push(0.08 + i * (BAY_H + BOARD_T) - BOARD_T / 2);
    return ys;
  }, []);
  // the floor's roughness map (linear data) breaks up the carcass sheen so
  // the flat walnut boards stop reading as untextured CG plastic
  const roughSrc = useTexture("/textures/floor-roughness.jpg");
  const woodMat = useMemo(() => {
    const rough = roughSrc.clone();
    rough.colorSpace = THREE.NoColorSpace;
    rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
    rough.repeat.set(1.6, 1.6);
    rough.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      color: WOOD,
      roughness: 0.75, // multiplied by the map's variation
      roughnessMap: rough,
      metalness: 0,
    });
  }, [roughSrc]);
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
      {/* LED strips tucked under each board's front lip (top board included) -
         the practical fixture that sells the accent light in the bays */}
      {[...boards.map((y) => y - BOARD_T / 2), SHELF_H - 0.07].map((bottom, i) => (
        <mesh key={`led-${i}`} position={[0, bottom - 0.012, SHELF_D / 2 - 0.12]}>
          <boxGeometry args={[innerW - 0.06, 0.014, 0.02]} />
          {/* 1.35, not higher - ACES clips hotter emissives to white and the
             strip reads as a bare fluorescent tube from low angles */}
          <meshStandardMaterial color="#2a2118" emissive="#ffbe78" emissiveIntensity={1.35} roughness={0.4} metalness={0} />
        </mesh>
      ))}
      <ShelfLight />

      {/* the life on it */}
      <Books />
      {/* bottom bay: the record crate + game stack */}
      <VinylCrate position={[-0.7, 0.08, 0]} />
      <GameStack position={[0.85, 0.085, 0.04]} rotation={[0, -0.06, 0]} scale={1.7} />
      {/* the construction corner: the tower crane shares bay 4's display
         shelf with the diplodocus (its jib cranes right over the dino,
         hook dangling); the dump truck + spilled bricks hold the end of
         bay 2 that buildBooks leaves clear */}
      <BrickCrane position={[-1.05, 0.08 + 4 * (BAY_H + BOARD_T), 0]} rotation={[0, -0.06, 0]} />
      <BrickTruck position={[1.0, 0.08 + 2 * (BAY_H + BOARD_T), 0.1]} rotation={[0, -0.45, 0]} scale={1.25} />
      {/* scaled 1.9 = a real ~45 cm turntable; the plinth overhangs the case
         front a touch, the way narrow bookcases actually carry one */}
      <RecordPlayer position={[0.45, SHELF_H, 0.06]} rotation={[0, -0.04, 0]} scale={1.9} />
      {/* the dino figurines — lengths run ALONG the shelf (their long axis is
         model-space X; keep rotY small or they poke out of the shelf depth).
         T. rex prowls the top surface beside the record player; the
         diplodocus holds bay 4's display half. */}
      <Suspense fallback={null}>
        {/* photoscanned leather volumes anchor bays 1–3 */}
        <EncyclopediaBooks />
        <DecorModel
          url="/models/decor/trex.glb"
          targetH={0.48}
          position={[-1.05, SHELF_H, 0.05]}
          rotY={0.3}
          figurine
        />
        <DecorModel
          url="/models/decor/diplodocus.glb"
          targetH={0.34}
          position={[-0.45, 0.08 + 4 * (BAY_H + BOARD_T), 0.06]}
          rotY={-0.2}
          figurine
        />
      </Suspense>
    </group>
  );
});

export default Bookshelf;
