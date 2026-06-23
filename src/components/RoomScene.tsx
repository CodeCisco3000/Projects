"use client";

/* =====================================================================
   RoomScene.tsx — the real-time 3D room (ADR-0010, supersedes ADR-0002).
   ---------------------------------------------------------------------
   A warm-lit room shell (floor + ceiling + three walls) built from plane
   meshes, with six wall "placard" markers — one per section — and a
   camera rig that glides between the six stops as you scroll and dollies
   in when you inspect one. Labels/content still come from site.ts; the
   readable inspect card + résumé are HTML overlays (in Portfolio.tsx),
   not part of this canvas. Furniture (.glb models) arrives in a later
   step — these markers are deliberate placeholders.

   Mounted client-only (next/dynamic ssr:false) from Portfolio.tsx so the
   WebGL canvas never renders on the server.
   ===================================================================== */

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { STOPS, lerp, type Stop, type Wall } from "./roomStops";

/* room half-extents (world units): walls at x=±HX, floor/ceiling at y=∓HY,
   back wall at z=-HZ, opening toward +Z. */
const HX = 8;
const HY = 4.5;
const HZ = 7;

const COLOR = {
  back: "#c9b596",   // warm greige paint
  side: "#bda884",
  floor: "#6f4d30",  // warm wood
  ceil: "#564833",   // dim warm ceiling
  placard: "#241b13",
  ink: "#f2e7d6",
  accent: "#e7912f", // lamp amber
  brass: "#c9a36a",
  muted: "#b39d80",
};

/* a marker faces into the room depending on which wall it hangs on */
const WALL_ROT_Y: Record<Wall, number> = {
  back: 0,
  left: Math.PI / 2,
  right: -Math.PI / 2,
};

/* World-space tile size (units per texture repeat) — separate for wall vs floor
   so plaster grain and floor planks each read at a believable scale. Lower =
   bigger pattern / fewer repeats. Easy knobs to tune against the live browser. */
const WALL_TILE = 4;
const FLOOR_TILE = 5;

/* How hard each normal map pushes surface relief under the light. Walls are
   near-smooth plaster, so keep it gentle; the floor planks can take more. */
const WALL_NORMAL = 0.6;
const FLOOR_NORMAL = 1.0;

/* Prep one map for tiling. colorMap=true → sRGB (albedo is gamma-encoded, and
   skipping this is the classic washed-out look); colorMap=false → linear, because
   normal/roughness are *data* not color and tagging them sRGB corrupts the
   lighting. Repeat-wrap + per-surface tile counts stop stretching; anisotropy
   keeps things crisp at grazing angles (the big win for the floor). */
function configureMap(
  tex: THREE.Texture,
  repeatX: number,
  repeatY: number,
  maxAniso: number,
  colorMap: boolean,
) {
  tex.colorSpace = colorMap ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, maxAniso);
  tex.needsUpdate = true;
  return tex;
}

/* Build a cloned, tiled {map, normalMap, roughnessMap} trio for one surface.
   Clones share their GPU upload with the source, so giving every wall/floor its
   own tiling stays well inside the WebGL budget (ADR-0011). */
function surfaceMaps(
  color: THREE.Texture,
  normal: THREE.Texture,
  rough: THREE.Texture,
  rx: number,
  ry: number,
  maxAniso: number,
) {
  return {
    map: configureMap(color.clone(), rx, ry, maxAniso, true),
    normalMap: configureMap(normal.clone(), rx, ry, maxAniso, false),
    roughnessMap: configureMap(rough.clone(), rx, ry, maxAniso, false),
  };
}

/* ---------- the room shell: five plane surfaces ----------
   Floor = wood, the three standing walls = painted plaster (sheetrock), ceiling
   stays a dim painted plane. Each surface gets a full PBR trio — color + normal
   + roughness — which is the real lift over flat paint: the normal map fakes
   surface relief as the light moves, the roughness map varies the sheen. (No AO
   map: it needs a 2nd UV set on the plane and adds little on a tiling surface.)
   Maps load once and are cloned per surface for correct, un-stretched tiling.
   Drop-in upgrade path later: add an aoMap / displacementMap in surfaceMaps. */
function Walls() {
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const t = useTexture({
    wallColor: "/textures/wall-color.jpg",
    wallNormal: "/textures/wall-normal.jpg",
    wallRough: "/textures/wall-roughness.jpg",
    floorColor: "/textures/floor-color.jpg",
    floorNormal: "/textures/floor-normal.jpg",
    floorRough: "/textures/floor-roughness.jpg",
  });

  const m = useMemo(() => {
    const back = surfaceMaps(t.wallColor, t.wallNormal, t.wallRough, (HX * 2) / WALL_TILE, (HY * 2) / WALL_TILE, maxAniso);
    const side = surfaceMaps(t.wallColor, t.wallNormal, t.wallRough, (HZ * 2) / WALL_TILE, (HY * 2) / WALL_TILE, maxAniso);
    const floor = surfaceMaps(t.floorColor, t.floorNormal, t.floorRough, (HX * 2) / FLOOR_TILE, (HZ * 2) / FLOOR_TILE, maxAniso);
    return { back, side, floor };
  }, [t.wallColor, t.wallNormal, t.wallRough, t.floorColor, t.floorNormal, t.floorRough, maxAniso]);

  return (
    <group>
      {/* back wall */}
      <mesh position={[0, 0, -HZ]}>
        <planeGeometry args={[HX * 2, HY * 2]} />
        <meshStandardMaterial {...m.back} normalScale={[WALL_NORMAL, WALL_NORMAL]} roughness={1} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* left wall (shares the plaster maps + tiling with the right wall) */}
      <mesh position={[-HX, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[HZ * 2, HY * 2]} />
        <meshStandardMaterial {...m.side} normalScale={[WALL_NORMAL, WALL_NORMAL]} roughness={1} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* right wall */}
      <mesh position={[HX, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[HZ * 2, HY * 2]} />
        <meshStandardMaterial {...m.side} normalScale={[WALL_NORMAL, WALL_NORMAL]} roughness={1} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* floor */}
      <mesh position={[0, -HY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HX * 2, HZ * 2]} />
        <meshStandardMaterial {...m.floor} normalScale={[FLOOR_NORMAL, FLOOR_NORMAL]} roughness={1} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* ceiling */}
      <mesh position={[0, HY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HX * 2, HZ * 2]} />
        <meshStandardMaterial color={COLOR.ceil} roughness={1} metalness={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ---------- one section marker: a lit placard on a wall ---------- */
function Marker({
  stop,
  active,
  onActivate,
}: {
  stop: Stop;
  active: boolean;
  onActivate: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  // ease the focus highlight (emissive glow + a small pop) every frame
  useFrame(() => {
    const g = groupRef.current;
    const m = matRef.current;
    if (g) {
      const s = THREE.MathUtils.lerp(g.scale.x, active ? 1.06 : 1, 0.15);
      g.scale.setScalar(s);
    }
    if (m) {
      m.emissiveIntensity = THREE.MathUtils.lerp(m.emissiveIntensity, active ? 0.85 : 0.12, 0.12);
    }
  });

  const setCursor = (e: ThreeEvent<PointerEvent>, on: boolean) => {
    e.stopPropagation();
    document.body.style.cursor = on ? "pointer" : "";
  };

  return (
    <group ref={groupRef} position={stop.look} rotation={[0, WALL_ROT_Y[stop.wall], 0]}>
      {/* placard body — the click target */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onActivate();
        }}
        onPointerOver={(e) => setCursor(e, true)}
        onPointerOut={(e) => setCursor(e, false)}
      >
        <boxGeometry args={[1.8, 1.15, 0.08]} />
        <meshStandardMaterial
          ref={matRef}
          color={COLOR.placard}
          emissive={COLOR.accent}
          emissiveIntensity={0.12}
          roughness={0.7}
          metalness={0}
        />
      </mesh>
      {/* inset panel for a bit of depth */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[1.58, 0.93]} />
        <meshStandardMaterial color="#1a130c" roughness={0.6} metalness={0} />
      </mesh>

      {/* Section labels (drei <Text>/troika) removed for now: troika spins up web
         workers, fetches a CDN font, and uploads SDF glyph textures ~1s in — the
         likeliest trigger of the "THREE.WebGLRenderer: Context Lost" that turned the
         room white on real hardware. The names already live in the focus rail + the
         inspect card; labels can return via a bundled font or HTML overlays once the
         canvas is proven stable. A small accent bar keeps the placard from reading
         totally blank. */}
      <mesh position={[0, -0.46, 0.05]}>
        <boxGeometry args={[1.2, 0.06, 0.03]} />
        <meshStandardMaterial color={COLOR.brass} emissive={COLOR.accent} emissiveIntensity={0.2} roughness={0.5} metalness={0} />
      </mesh>
    </group>
  );
}

/* ---------- the camera rig: glide between stops + dolly in to inspect ----------
   Reads the imperative engine refs owned by Portfolio (so input + state stay in
   the DOM tree) and drives the camera every frame, mirroring the old CSS engine:
   ease a focus scalar 0→5 between stops, then ease a 0→1 inspect scalar that
   pulls the camera toward the focused stop's close-up pose. */
function Rig({
  targetF,
  curF,
  curZoom,
  inspectRef,
  onFocus,
}: {
  targetF: React.MutableRefObject<number>;
  curF: React.MutableRefObject<number>;
  curZoom: React.MutableRefObject<number>;
  inspectRef: React.MutableRefObject<number | null>;
  onFocus: (i: number) => void;
}) {
  const camera = useThree((s) => s.camera);
  const reduce = useRef(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const lastNearest = useRef(-1);
  const aim = useRef(new THREE.Vector3());

  useFrame(() => {
    const N = STOPS.length;

    // ease focus 0→N-1
    if (reduce.current) curF.current = targetF.current;
    else {
      curF.current += (targetF.current - curF.current) * 0.09;
      if (Math.abs(targetF.current - curF.current) < 0.0008) curF.current = targetF.current;
    }
    const f = Math.max(0, Math.min(N - 1, curF.current));
    const i0 = Math.floor(f);
    const i1 = Math.min(N - 1, i0 + 1);
    const t = f - i0;
    const A = STOPS[i0];
    const B = STOPS[i1];

    // base focus pose (camera + aim), interpolated between the two nearest stops
    const bx = lerp(A.pos[0], B.pos[0], t);
    const by = lerp(A.pos[1], B.pos[1], t);
    const bz = lerp(A.pos[2], B.pos[2], t);
    const ax = lerp(A.look[0], B.look[0], t);
    const ay = lerp(A.look[1], B.look[1], t);
    const az = lerp(A.look[2], B.look[2], t);

    // ease inspect 0→1 and pull toward the nearest stop's close-up pose
    const wantZoom = inspectRef.current != null ? 1 : 0;
    if (reduce.current) curZoom.current = wantZoom;
    else {
      curZoom.current += (wantZoom - curZoom.current) * 0.12;
      if (Math.abs(wantZoom - curZoom.current) < 0.0012) curZoom.current = wantZoom;
    }
    const zf = curZoom.current;
    const S = STOPS[Math.round(f)];

    camera.position.set(
      lerp(bx, S.close[0], zf),
      lerp(by, S.close[1], zf),
      lerp(bz, S.close[2], zf),
    );
    aim.current.set(
      lerp(ax, S.look[0], zf),
      lerp(ay, S.look[1], zf),
      lerp(az, S.look[2], zf),
    );
    camera.lookAt(aim.current);

    const nearest = Math.round(f);
    if (nearest !== lastNearest.current) {
      lastNearest.current = nearest;
      onFocus(nearest);
    }
  });

  return null;
}

export type RoomSceneProps = {
  targetF: React.MutableRefObject<number>;
  curF: React.MutableRefObject<number>;
  curZoom: React.MutableRefObject<number>;
  inspectRef: React.MutableRefObject<number | null>;
  focus: number;
  onFocus: (i: number) => void;
  onActivate: (i: number) => void;
};

export default function RoomScene({
  targetF,
  curF,
  curZoom,
  inspectRef,
  focus,
  onFocus,
  onActivate,
}: RoomSceneProps) {
  return (
    <Canvas
      camera={{ position: STOPS[0].pos, fov: 50, near: 0.1, far: 100 }}
      dpr={1}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1 }}
    >
      <color attach="background" args={["#15100b"]} />
      <fog attach="fog" args={["#15100b", 16, 40]} />

      {/* Warm evening light, kept deliberately calm. Confirmed overexposed-white in a
         real browser, so a soft hemisphere fill dominates (even, won't clip), a low
         directional adds gentle modeling, and a small warm point is the lamp glow.
         With ACES tone mapping (on the Canvas above) this should read as a warm room,
         not white. Tune against a real browser. */}
      <ambientLight intensity={0.15} color="#ffead2" />
      <hemisphereLight args={["#ffeccb", "#2a1c10", 0.7]} />
      <directionalLight position={[2.5, 5, 3.5]} intensity={0.6} color="#ffd39a" />
      <pointLight position={[1.5, 2.2, 1]} intensity={9} distance={16} decay={2} color="#ffb066" />

      <Suspense fallback={null}>
        <Walls />
      </Suspense>

      {STOPS.map((stop, i) => (
        <Marker key={stop.id} stop={stop} active={focus === i} onActivate={() => onActivate(i)} />
      ))}

      <Rig targetF={targetF} curF={curF} curZoom={curZoom} inspectRef={inspectRef} onFocus={onFocus} />
    </Canvas>
  );
}
