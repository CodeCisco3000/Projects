"use client";

/* =====================================================================
   WallDecor.tsx — the personality layer on the walls.
   ---------------------------------------------------------------------
   Everything a real person would actually hang: a framed match jersey +
   team scarf and a skating-gala poster on the About (left) wall, a column
   of museum paleo prints over the bed, a gig poster for the record that's
   on the player, a medal rack and a champions pennant on the right wall.
   All art is original procedural canvas work (canvasArt.ts); geometry is
   a handful of boxes/planes per piece, so the whole layer costs ~20 draw
   calls. Positions are hand-placed against the measured furniture boxes
   (bed top ≈ -1.6, desk top ≈ -2.1, monitors top ≈ -0.2) so nothing
   overlaps or floats — re-eyeball against localhost after moving walls
   or furniture. memo(): static — must not re-reconcile on focus changes.
   ===================================================================== */

import { memo, useMemo } from "react";
import * as THREE from "three";
import {
  makeArtTexture,
  jerseyArt,
  scarfArt,
  skatePosterArt,
  trexArt,
  dodoArt,
  musicPosterArt,
  pennantArt,
} from "./canvasArt";

/* room half-extents — keep in sync with RoomScene.tsx */
const HX = 11;
const HZ = 9;

const FRAME_WOOD = "#3a2c20";   // walnut, matches the placard frames
const FRAME_LIGHT = "#e3ddd0";  // painted frame (matches the room trim)

function useArt(painter: () => HTMLCanvasElement) {
  return useMemo(() => makeArtTexture(painter()), [painter]);
}

/* one framed flat piece: a frame box with the art plane sitting proud of it.
   `w`/`h` are the ART size; the frame adds `lip` around it. 2 meshes. */
function FramedArt({
  painter,
  w,
  h,
  lip = 0.07,
  depth = 0.05,
  frameColor = FRAME_WOOD,
  emissive = 0,
  ...group
}: {
  painter: () => HTMLCanvasElement;
  w: number;
  h: number;
  lip?: number;
  depth?: number;
  frameColor?: string;
  emissive?: number;
} & React.ComponentProps<"group">) {
  const tex = useArt(painter);
  return (
    <group {...group}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w + lip * 2, h + lip * 2, depth]} />
        <meshStandardMaterial color={frameColor} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={tex}
          roughness={0.85}
          metalness={0}
          {...(emissive > 0 ? { emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: emissive } : {})}
        />
      </mesh>
    </group>
  );
}

/* the team scarf: a long striped band pinned by its ends, sagging slightly.
   A gentle arc (curved plane) reads far more like cloth than a straight box. */
function Scarf(props: React.ComponentProps<"group">) {
  const tex = useArt(scarfArt);
  const geo = useMemo(() => {
    const W = 3.3, H = 0.44, SAG = 0.16, SEG = 24;
    const g = new THREE.PlaneGeometry(W, H, SEG, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = (p.getX(i) / W + 0.5) * Math.PI; // 0..π across the band
      p.setY(i, p.getY(i) - Math.sin(t) * SAG);  // sag toward the middle
      p.setZ(i, Math.sin(t) * 0.03);             // belly out a touch
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group {...props}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial map={tex} roughness={0.95} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* the two pins it hangs from */}
      {[-1.62, 1.62].map((px, i) => (
        <mesh key={i} position={[px, 0.2, 0.01]}>
          <cylinderGeometry args={[0.016, 0.016, 0.05, 10]} />
          <meshStandardMaterial color="#8f8f96" roughness={0.35} metalness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* medal rack: a small walnut bar with three ribboned medals on hooks */
function MedalRack(props: React.ComponentProps<"group">) {
  const medals: { ribbon: string; metal: string; dz: number; drop: number; rot: number }[] = [
    { ribbon: "#b23a48", metal: "#d4af37", dz: -0.34, drop: 0.34, rot: 0.05 },
    { ribbon: "#22314f", metal: "#c0c4cc", dz: 0, drop: 0.4, rot: -0.03 },
    { ribbon: "#2f5d3a", metal: "#b0793e", dz: 0.34, drop: 0.32, rot: 0.06 },
  ];
  return (
    <group {...props}>
      {/* the bar (runs along the wall = local X) */}
      <mesh castShadow>
        <boxGeometry args={[1.12, 0.09, 0.06]} />
        <meshStandardMaterial color={FRAME_WOOD} roughness={0.5} metalness={0.05} />
      </mesh>
      {medals.map((m, i) => (
        <group key={i} position={[m.dz, -0.05, 0.028]} rotation={[0, 0, m.rot]}>
          {/* folded ribbon */}
          <mesh position={[0, -m.drop / 2, 0]} castShadow>
            <boxGeometry args={[0.085, m.drop, 0.012]} />
            <meshStandardMaterial color={m.ribbon} roughness={0.9} metalness={0} />
          </mesh>
          {/* medal disc, facing the room */}
          <mesh position={[0, -m.drop - 0.075, 0.012]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.085, 0.085, 0.018, 24]} />
            <meshStandardMaterial color={m.metal} roughness={0.28} metalness={0.9} />
          </mesh>
          {/* embossed inner ring */}
          <mesh position={[0, -m.drop - 0.075, 0.023]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.055, 0.007, 8, 24]} />
            <meshStandardMaterial color={m.metal} roughness={0.2} metalness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* felt pennant: a long triangle with the CHAMPIONS art, pinned at the mast end */
function Pennant(props: React.ComponentProps<"group">) {
  const tex = useArt(pennantArt);
  const geo = useMemo(() => {
    const L = 2.3, H = 0.78;
    const s = new THREE.Shape();
    s.moveTo(0, H / 2);
    s.lineTo(L, 0);
    s.lineTo(0, -H / 2);
    s.closePath();
    const g = new THREE.ShapeGeometry(s);
    // map the pennant art across the triangle's bounding box
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      uv.setXY(i, p.getX(i) / L, p.getY(i) / H + 0.5);
    }
    uv.needsUpdate = true;
    return g;
  }, []);
  return (
    <group {...props}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial map={tex} roughness={0.95} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {[0.3, -0.3].map((py, i) => (
        <mesh key={i} position={[0.04, py, 0.005]}>
          <cylinderGeometry args={[0.015, 0.015, 0.04, 10]} />
          <meshStandardMaterial color="#8f8f96" roughness={0.35} metalness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

const WallDecor = memo(function WallDecor() {
  const L = -HX + 0.04;  // flush against the left wall
  const R = HX - 0.04;   // flush against the right wall
  const B = -HZ + 0.04;  // flush against the back wall
  return (
    <group>
      {/* ---- left wall (About): the sports shrine ---- */}
      {/* framed match jersey, hung above the bed's foot end */}
      <FramedArt
        painter={jerseyArt}
        w={2.0}
        h={2.4}
        lip={0.09}
        depth={0.09}
        position={[L, 1.25, -4.7]}
        rotation={[0, Math.PI / 2, 0]}
      />
      {/* team scarf above the About placard */}
      <Scarf position={[L + 0.01, 1.62, -1.5]} rotation={[0, Math.PI / 2, 0]} />
      {/* skating-gala poster toward the front of the wall */}
      <FramedArt
        painter={skatePosterArt}
        w={1.42}
        h={2.0}
        lip={0.06}
        depth={0.04}
        frameColor={FRAME_LIGHT}
        position={[L, 0.95, 2.6]}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* ---- back wall: museum paleo column over the bed ---- */}
      {/* the dodo shares the Education placard's centerline (y 0.2) so the row
         reads hung-on-purpose; the T. rex stacks a frame's height above it */}
      <FramedArt
        painter={trexArt}
        w={1.5}
        h={1.05}
        lip={0.07}
        position={[-8.4, 1.52, B]}
      />
      <FramedArt
        painter={dodoArt}
        w={1.5}
        h={1.05}
        lip={0.07}
        position={[-8.4, 0.2, B]}
      />

      {/* gig poster for the record on the player, right of the Skills placard,
         high enough to clear the monitor tops (~-0.2) */}
      <FramedArt
        painter={musicPosterArt}
        w={1.5}
        h={2.06}
        lip={0.05}
        depth={0.035}
        frameColor="#131313"
        emissive={0.06}
        position={[7.55, 1.28, B]}
      />

      {/* ---- right wall: medals between the placards, pennant up front ---- */}
      <MedalRack position={[R, 0.95, -0.65]} rotation={[0, -Math.PI / 2, 0]} />
      <Pennant position={[R, 1.35, 4.6]} rotation={[0, -Math.PI / 2, 0]} />
    </group>
  );
});

export default WallDecor;
