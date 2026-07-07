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

import { Suspense, memo, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF, useTexture, useProgress, Stats, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { STOPS, lerp, type Stop, type Wall } from "./roomStops";
import WallDecor from "./room/WallDecor";
import Bookshelf from "./room/Bookshelf";
import DecorModel from "./room/DecorModel";
import { MARKER_ART, makeArtTexture } from "./room/canvasArt";

/* room half-extents (world units): walls at x=±HX, floor/ceiling at y=∓HY,
   back wall at z=-HZ, opening toward +Z. Enlarged per live review so furniture
   has room to breathe (the marker look/close points in roomStops.ts track the
   new walls). */
const HX = 11; // widened from 10 (2026-07-06) to make floor space beside the bed for the nightstand
const HY = 5;
const HZ = 9;

/* Camera "settle zoom": as you pan, the camera pulls back to the wide room view
   between stops, then dollies in toward the item you land on. SETTLE_ZOOM is how
   far in it dollies at rest (0 = stay wide, 1 = all the way to the inspect pose);
   SETTLE_FALLOFF is how close to a stop (in stop-units) the zoom kicks in. */
const SETTLE_ZOOM = 0.6;  // how far the camera zooms IN onto an item during its pulse
                          // (1 = all the way to the close-up; lower = a gentler peek)
const PAN_LAMBDA = 7.2;   // pan smoothing rate — exponential & frame-rate-independent, so the
                          // camera eases INTO each stop with no snap (this is what kills the
                          // old arrival stutter). Higher = snappier arrival, lower = floatier.
const HOLD_MS = 1400;     // how long it dwells zoomed-in on an item before easing back
                          // out to the wide room
const ZOOM_LAMBDA = 4.0;  // settle-zoom pulse smoothing rate (higher = snappier in/out)
const INSPECT_LAMBDA = 8.0; // click-to-inspect dolly smoothing rate

const COLOR = {
  back: "#c9b596",   // warm greige paint
  side: "#bda884",
  floor: "#6f4d30",  // warm wood
  ceil: "#ddd4c2",   // ceiling tint — multiplies the clean plaster map; soft warm
                     // off-white so the ceiling reads light but recessive (lower = darker)
  placard: "#241b13",
  ink: "#f2e7d6",
  accent: "#e7912f", // lamp amber
  brass: "#c9a36a",
  muted: "#b39d80",
};

/* ---------- lighting knobs (centralised) ----------
   The room can only be judged in a real browser (the headless preview can't
   hold a WebGL context), so every light is a named knob here — tuning against
   localhost is then a one-number edit. Lighting overhaul (ADR-0012, supersedes
   ADR-0011's prohibitions): real soft shadow maps on the two key lights (sun +
   fan), an HDRI environment for reflections, and baked contact shadows to
   ground the furniture. Budget: one 2048 + one 1024 shadow map, a 1k HDRI,
   a one-frame contact-shadow bake. */
const EXPOSURE = 0.98; // global brightness, rolled off by ACES tone mapping
const AMBIENT = 0.15;  // warm daylight fill (the HDRI env adds a little cool base fill on top) —
                       // just enough that shadow sides keep detail instead of crushing to black
const HEMI = 0.32;     // sky/bounce fill (down from 0.45 — env + shadows carry more shape now)
const SUN = 2.2;       // sunlight through the window. The sun light now sits OUTSIDE the window
                       // with decay 0 (parallel-sun feel, no distance falloff), so this is a small
                       // number — it multiplies straight onto the beam, not against attenuation
const ENV_URL = "/textures/env-kloofendal-1k.hdr"; // same Poly Haven sky the window view is cropped
                                                   // from, so reflections match what's outside
const ENV_INTENSITY = 0.15; // how hard the HDRI fills/reflects (0 = off; keep LOW — it's an
                            // outdoor sky wrapping an indoor room; 0.35 washed the whole room
                            // cool and flat, we only want the sheen on metals/glossies)
const SUN_SHADOW_MAP = 2048; // sun shadow resolution — crisp muntin-grid pattern on the floor
const FAN_SHADOW_MAP = 1024; // fan light-kit shadow resolution — soft furniture pools only

/* ---------- ceiling fan (overhead fixture + a bit of personality) ----------
   A 5-blade fan with a warm light kit, hung from the ceiling center on a downrod. Its light
   kit is the room's main overhead source; the blades lazily spin (FAN_SPEED). Procedural so
   it stays inside the WebGL budget (ADR-0011) — no extra .glb, no shadow maps yet. */
const FAN_POS: [number, number, number] = [0, HY, -1]; // ceiling mount point
const FAN_SPEED = 1.1;             // blade spin (radians/sec); 0 = still
const FAN_BLADES = 5;              // blade count
const FAN_RADIUS = 3.05;           // blade-tip reach from center (long blades, like the real fan)
const FAN_LIGHT = 42;              // light-kit brightness (thrown DOWN from the Earth globe)
const FAN_LIGHT_COLOR = "#ffd9a8"; // warm bulb tone
const FAN = {
  chrome: "#d9dee4", // bright nickel: motor housing, brackets, bowl ring, downrod, chains
  metal: "#b6bcc4",  // brushed nickel: canopy + soft trim
  blade: "#0b1230",  // deep-space base (the galaxy texture paints over this)
  globe: "#1f7fc0",  // ocean base (the Earth texture paints over this)
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

/* LoadGate: drives the DOM loading screen (LoadingScreen.tsx) and kills the
   first-scroll hitch. three.js compiles a mesh's shader program the first time it
   enters the camera's view — stop 1 shows a bare wall, so the first scroll used to
   reveal fresh furniture and compile a dozen programs mid-gesture. Once every
   loader finishes, this renders ONE extra hidden pass per camera stop behind the
   curtain: every shader the tour can ever show compiles and every texture uploads
   through the NORMAL pipeline. (drei's <Preload all /> was tried first — its
   gl.compile() pass trips a spurious VALIDATE_STATUS shader failure on
   Windows/ANGLE that blacked out the fan's canvas-textured materials.) A few
   settle frames after that (shadow maps + contact bake — see StaticShadows), the
   overlay is told the room is ready. */
const READY_SETTLE_FRAMES = 8;
function LoadGate({
  onProgress,
  onReady,
}: {
  onProgress: (pct: number) => void;
  onReady: () => void;
}) {
  const { progress, active } = useProgress(); // global loader state (glTF/texture/HDR)
  const [compile, setCompile] = useState(false);
  const warm = useRef(0);
  const done = useRef(false);
  const warmCam = useRef<THREE.PerspectiveCamera | null>(null);
  useEffect(() => {
    onProgress(progress);
  }, [progress, onProgress]);
  useFrame(({ gl, scene, camera }) => {
    if (!compile) {
      // queue drained → start the warm-up passes next frame
      if (!active && progress === 100) setCompile(true);
      return;
    }
    if (done.current) return;
    const i = warm.current++;
    if (i < STOPS.length) {
      // one hidden warm render from this stop's wide pose (one per frame keeps
      // even the warm-up itself hitch-free)
      if (!warmCam.current) warmCam.current = (camera as THREE.PerspectiveCamera).clone();
      const cam = warmCam.current;
      const s = STOPS[i];
      cam.position.set(s.pos[0], s.pos[1], s.pos[2]);
      cam.lookAt(s.look[0], s.look[1], s.look[2]);
      cam.updateMatrixWorld();
      gl.render(scene, cam);
      return;
    }
    if (i >= STOPS.length + READY_SETTLE_FRAMES) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

/* StaticShadows: freeze the shadow maps. Nothing that casts shadow in this room ever
   moves (the spinning fan blades deliberately don't cast — see CeilingFan), so
   re-rendering both shadow maps every frame was pure waste: the two shadow passes
   roughly DOUBLED the frame's draw calls (~349 → ~170 measured at the widest stop).
   Instead, shadows render for a few frames whenever the asset loaders finish (models
   just appeared/changed), then stay frozen. DEV NOTE: after an HMR edit that moves a
   shadow caster, hard-reload if shadows look stale — production is unaffected. */
const SHADOW_WARMUP_FRAMES = 8; // a few frames, so late mounts inside the same load settle in
function StaticShadows() {
  const { active } = useProgress(); // true while any loader (glTF/texture/HDR) is running
  const warmup = useRef(0);
  useEffect(() => {
    if (!active) warmup.current = 0; // loaders just finished → redraw the shadow maps
  }, [active]);
  // all renderer mutation happens through useFrame's state (not a hook-returned `gl`,
  // which react-hooks/immutability forbids touching). This component lives for the
  // scene's whole life, so there's no unmount path that needs to restore autoUpdate.
  useFrame(({ gl }) => {
    if (gl.shadowMap.autoUpdate) gl.shadowMap.autoUpdate = false;
    if (warmup.current < SHADOW_WARMUP_FRAMES) {
      warmup.current++;
      gl.shadowMap.needsUpdate = true;
    }
  });
  return null;
}

/* CastReceive: wrap a subtree so every mesh in it casts AND receives real shadows.
   Used for the furniture + window trim; the traverse re-runs after each render, which
   is cheap and catches async-loaded .glb children. Do NOT wrap anything that encloses
   a light source (e.g. the fan's Earth-globe glass around its bulb) — an enclosing
   caster blacks the light out entirely. */
function CastReceive(props: React.ComponentProps<"group">) {
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    ref.current?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  });
  return <group ref={ref} {...props} />;
}

/* ---------- the room shell: five plane surfaces ----------
   Floor = wood, the three standing walls = painted plaster (sheetrock), ceiling
   stays a dim painted plane. Each surface gets a full PBR trio — color + normal
   + roughness — which is the real lift over flat paint: the normal map fakes
   surface relief as the light moves, the roughness map varies the sheen. (No AO
   map: it needs a 2nd UV set on the plane and adds little on a tiling surface.)
   Maps load once and are cloned per surface for correct, un-stretched tiling.
   Drop-in upgrade path later: add an aoMap / displacementMap in surfaceMaps.
   memo(): the shell is static — a `focus` change re-rendering RoomScene must not
   re-reconcile it (same for Window/CeilingFan/CrownMolding/Furniture below). */
const Walls = memo(function Walls() {
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const t = useTexture({
    wallColor: "/textures/wall-color.jpg",
    wallNormal: "/textures/wall-normal.jpg",
    wallRough: "/textures/wall-roughness.jpg",
    floorColor: "/textures/floor-color.jpg",
    floorNormal: "/textures/floor-normal.jpg",
    floorRough: "/textures/floor-roughness.jpg",
    ceilColor: "/textures/ceiling-color.jpg",
    ceilNormal: "/textures/ceiling-normal.jpg",
    ceilRough: "/textures/ceiling-roughness.jpg",
  });

  const m = useMemo(() => {
    const back = surfaceMaps(t.wallColor, t.wallNormal, t.wallRough, (HX * 2) / WALL_TILE, (HY * 2) / WALL_TILE, maxAniso);
    const side = surfaceMaps(t.wallColor, t.wallNormal, t.wallRough, (HZ * 2) / WALL_TILE, (HY * 2) / WALL_TILE, maxAniso);
    const floor = surfaceMaps(t.floorColor, t.floorNormal, t.floorRough, (HX * 2) / FLOOR_TILE, (HZ * 2) / FLOOR_TILE, maxAniso);
    // ceiling = a dedicated clean plaster (Plaster001), tiled like the floor
    const ceil = surfaceMaps(t.ceilColor, t.ceilNormal, t.ceilRough, (HX * 2) / WALL_TILE, (HZ * 2) / WALL_TILE, maxAniso);
    return { back, side, floor, ceil };
  }, [t.wallColor, t.wallNormal, t.wallRough, t.floorColor, t.floorNormal, t.floorRough,
      t.ceilColor, t.ceilNormal, t.ceilRough, maxAniso]);

  /* The back wall gets a REAL hole cut where the window sits, so the outside view lives
     BEHIND the wall with true depth/parallax (a photo glued onto the glass plane read as
     a flat poster). ShapeGeometry emits UVs in shape units, so remap them to 0..1 for the
     shared plaster tiling to apply at the same scale as the other walls. */
  const backWallGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-HX, -HY); s.lineTo(HX, -HY); s.lineTo(HX, HY); s.lineTo(-HX, HY); s.closePath();
    const cx = WINDOW_POS[0], cy = WINDOW_POS[1]; // back wall is unrotated: local xy = world xy
    const hole = new THREE.Path();
    hole.moveTo(cx - WINDOW_W / 2, cy - WINDOW_H / 2);
    hole.lineTo(cx + WINDOW_W / 2, cy - WINDOW_H / 2);
    hole.lineTo(cx + WINDOW_W / 2, cy + WINDOW_H / 2);
    hole.lineTo(cx - WINDOW_W / 2, cy + WINDOW_H / 2);
    hole.closePath();
    s.holes.push(hole);
    const g = new THREE.ShapeGeometry(s);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + HX) / (2 * HX), (p.getY(i) + HY) / (2 * HY));
    uv.needsUpdate = true;
    return g;
  }, []);

  return (
    <group>
      {/* back wall — carries the cut-out window opening. It CASTS shadow so the sun
         (which now sits OUTSIDE the window, ADR-0012) can only enter through the hole
         — that's what shapes the beam. FrontSide (not DoubleSide) on purpose: a
         double-sided caster flip-lights its own interior face and self-shadow-acnes;
         the camera never leaves the room, so the outside face is never seen. */}
      <mesh position={[0, 0, -HZ]} geometry={backWallGeo} castShadow receiveShadow>
        <meshStandardMaterial {...m.back} normalScale={[WALL_NORMAL, WALL_NORMAL]} roughness={1} metalness={0} side={THREE.FrontSide} />
      </mesh>
      {/* left wall (shares the plaster maps + tiling with the right wall). All four
         surfaces below are FrontSide — the camera never leaves the room, so drawing
         their back faces (DoubleSide) was wasted rasterizer + lighting work. */}
      <mesh position={[-HX, 0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[HZ * 2, HY * 2]} />
        <meshStandardMaterial {...m.side} normalScale={[WALL_NORMAL, WALL_NORMAL]} roughness={1} metalness={0} />
      </mesh>
      {/* right wall */}
      <mesh position={[HX, 0, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[HZ * 2, HY * 2]} />
        <meshStandardMaterial {...m.side} normalScale={[WALL_NORMAL, WALL_NORMAL]} roughness={1} metalness={0} />
      </mesh>
      {/* floor — the main shadow catcher (sun beam + fan pool + furniture shadows) */}
      <mesh position={[0, -HY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[HX * 2, HZ * 2]} />
        <meshStandardMaterial {...m.floor} normalScale={[FLOOR_NORMAL, FLOOR_NORMAL]} roughness={1} metalness={0} />
      </mesh>
      {/* ceiling — same plaster as the walls, tinted a touch darker (COLOR.ceil) so
         it reads as a recessive painted ceiling rather than a flat void */}
      <mesh position={[0, HY, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[HX * 2, HZ * 2]} />
        <meshStandardMaterial {...m.ceil} color={COLOR.ceil} normalScale={[WALL_NORMAL, WALL_NORMAL]} roughness={1} metalness={0} />
      </mesh>
    </group>
  );
});

/* ---------- furniture (.glb) ----------
   It's a bedroom, in a clean modern (low-poly, CC0 Kenney) style — one cohesive
   kit so the bed, nightstand, dresser, lamp and rug all match. The glTF pipeline
   + WebGL context survival are already confirmed (ADR-0011), so it's safe to keep
   adding pieces.

   fitCorner (below) auto-fits a model instead of hand-guessing scale/origin: it
   measures the loaded mesh's bounding box, scales it to a real-world `target`
   footprint (world units), drops its base onto the floor, and tucks it against
   two walls (a corner). That makes placement deterministic even though the models'
   native units/origins are unknown. `rotY` just spins which way it faces. */
const BED_URL = "/models/messy-bed/scene.gltf";  // CC-BY, thethieme — see CREDITS.md
const BED_TARGET = 8;   // longest footprint (incl. backboard + nightstands), world units
const BED_ROT_Y = 0;    // spin in 90° steps if the headboard faces the wrong wall

/* The Nordli's headboard/shelves float (they sit at ~y0.44–0.95 of the model with open
   air beneath — the mattress + draped comforter ground the bed's sides, but nothing
   grounds the head). A procedural backing panel fills floor→shelves-top at the head end
   so the backboard reads as a real bedframe. Fraction measured from the .glb (the shelves
   top at 0.95 of the model's 1.16 height); the color is sampled from the frame's dark
   stained-wood texture so the panel matches. Tune against localhost. */
const BED_FRAME_WOOD = "#2e2a24";  // dark stained wood (sampled from Nordli_Frame texture)
const BED_BACKBOARD_TOP = 0.82;    // headboard top as a fraction of the bed's full height
const BED_BACKBOARD_THICK = 0.35;  // backing-panel thickness, world units (kills the see-through)

const NIGHTSTAND_URL = "/models/nightstand/nightstand.glb"; // CC-BY, Fenik — see CREDITS.md
const NIGHTSTAND_H = 2.2;    // height, world units (a bit above mattress height)
const NIGHTSTAND_GAP = 0.25; // air between the bed's right edge and the nightstand
const NIGHTSTAND_ROT_Y = 0;  // drawers face into the room; spin in 90° steps if wrong

const DESK_URL = "/models/desk/scene.gltf"; // CC-BY, Superenforcer_xp — see CREDITS.md
const DESK_TARGET = 7;  // longest footprint of the L-desk, world units
const DESK_ROT_Y = -Math.PI / 2; // long arm of the L along the back wall, flipped to
                                 // face the room side correctly (270°)

/* fitCorner: the deterministic corner-placement math (shared by the Bed, the desk, and
   the gaming setup). Measures the loaded mesh, scales it to a real-world `target`
   footprint, drops its base onto the floor, tucks it against two walls, then
   returns BOTH the placed object AND its final world-space bounding box — so other
   props (e.g. the gaming rig) can sit on top of it without hand-guessing heights. */
function fitCorner(
  scene: THREE.Object3D,
  target: number,
  cornerX: 1 | -1,
  cornerZ: 1 | -1,
  margin: number,
  rotY: number,
) {
  const o = scene.clone(true);
  o.position.set(0, 0, 0);
  o.rotation.set(0, rotY, 0);
  o.scale.setScalar(1);
  o.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
  o.scale.setScalar(target / Math.max(size.x, size.z));
  o.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(o);
  const dx = cornerX < 0 ? -HX + margin - box.min.x : HX - margin - box.max.x;
  const dz = cornerZ < 0 ? -HZ + margin - box.min.z : HZ - margin - box.max.z;
  o.position.set(dx, -HY - box.min.y, dz);
  o.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(o); // final world box (for sit-on-top placement)
  return { object: o, box };
}

/* The bed: corner-fit like any other model, plus a procedural headboard backing panel
   that grounds the floating shelves (see the BED_BACKBOARD_* notes). The panel spans the
   bed's width at the head (back) edge and rises from the floor to the shelves' top, so the
   lower part tucks behind the mattress/comforter and only the headboard reads above it. */
function Bed() {
  const { scene } = useGLTF(BED_URL);
  const { scene: nsScene } = useGLTF(NIGHTSTAND_URL);
  const { object, box } = useMemo(
    () => fitCorner(scene, BED_TARGET, -1, -1, 0.6, BED_ROT_Y),
    [scene],
  );
  // nightstand: scaled to a real height, based on the floor, tucked against the back wall
  // right beside the bed's measured right edge (tracks the bed automatically)
  const nightstand = useMemo(() => {
    const o = nsScene.clone(true);
    o.rotation.set(0, NIGHTSTAND_ROT_Y, 0);
    o.scale.setScalar(1);
    o.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    o.scale.setScalar(NIGHTSTAND_H / size.y);
    o.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(o);
    o.position.set(
      box.max.x + NIGHTSTAND_GAP - b.min.x, // beside the bed's right edge
      -HY - b.min.y,                        // base on the floor
      -HZ + 0.6 - b.min.z,                  // tucked against the back wall
    );
    // sharpen its textures at glancing angles, same treatment the room surfaces get —
    // without this the wood blurs and reads "low quality" next to the bed
    o.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const sm = m as THREE.MeshStandardMaterial;
        for (const t of [sm.map, sm.normalMap, sm.roughnessMap, sm.metalnessMap]) {
          if (t) { t.anisotropy = 8; t.needsUpdate = true; }
        }
      }
    });
    return o;
  }, [nsScene, box]);
  const panel = useMemo(() => {
    const h = box.max.y - box.min.y;          // full bed height; box.min.y rests on the floor
    const topY = box.min.y + h * BED_BACKBOARD_TOP;
    return {
      args: [(box.max.x - box.min.x) * 0.97, topY - box.min.y, BED_BACKBOARD_THICK] as
        [number, number, number],
      pos: [
        (box.min.x + box.max.x) / 2,
        (box.min.y + topY) / 2,
        box.min.z + BED_BACKBOARD_THICK / 2,  // tuck against the bed's head (back) edge
      ] as [number, number, number],
    };
  }, [box]);
  return (
    <group>
      <primitive object={object} />
      <mesh position={panel.pos}>
        <boxGeometry args={panel.args} />
        <meshStandardMaterial color={BED_FRAME_WOOD} roughness={0.7} metalness={0} />
      </mesh>
      <primitive object={nightstand} />
    </group>
  );
}

/* ---------- the gaming setup (procedural) ----------
   Built from primitive meshes instead of a .glb (no CC0 gaming rig on hand, and
   primitives keep the WebGL budget calm — ADR-0011): a monitor with a glowing
   screen, an RGB keyboard + desk mat, a mouse, and a glass-front PC tower with
   RGB fans. It SITS on the desk's fitted top surface (Y read from the desk's
   bounding box, so it can't float or sink) and is sized relative to the desk, so
   it tracks DESK_TARGET automatically.

   Placement knobs (the headless preview can't show WebGL — eyeball localhost:3000
   and nudge these, the way every camera/light value here was tuned):
     GAMING_ALONG  0→1 slides the rig across the desk's width (0 = far corner)
     GAMING_DEPTH  0→1 slides it from the back wall (0) toward the room (1)
     GAMING_ROT_Y  facing; 0 = screen faces the room (+Z). Nudge in ~0.1 steps.
     GAMING_SCALE  overall size of the whole rig
     SCREEN_GLOW   brightness of the monitor's screen-glow light (0 = off) */
const GAMING_ALONG = 0.52;
const GAMING_DEPTH = 0.26;
const GAMING_ROT_Y = 0;
const GAMING_SCALE = 1.0;
const SCREEN_GLOW = 3.0;
const MONITOR_SPREAD = 1.25; // half the gap between the two monitors (center offset, world units)
const MONITOR_TOE = 0.18;    // inward toe-in angle so both face the chair (radians)
const PC_URL = "/models/gaming-pc/gaming-computer-opt.glb"; // CC-BY, Alex Safayan — see CREDITS.md
                // (joined from 175 fragment meshes → a handful — gltf-transform; was 175 draw calls)
const TOWER_HEIGHT = 2.2;  // case height in world units (~a mid-tower)
const TOWER_ROT_Y = Math.PI / 2; // quarter-turn so the PC's front faces the camera (room, +Z)
const TOWER_GAP = 0.8;     // how far the tower stands to the room-side of the desk
const TOWER_DEPTH = 0.32;  // 0→1 where along the desk's depth the tower stands

/* RGB lighting: the PC's fans/internals + the desk underglow slowly cycle through
   the rainbow. SPEED = hue turns per second (lower = calmer); GLOW = brightness. */
const RGB_SPEED = 0.05;
const RGB_GLOW = 0.85;

/* Keyboard + mouse: one downloaded "RGB Keyboard and Mouse" model (Jamesley, CC-BY-4.0 —
   see CREDITS.md). The keyboard's RGB is baked into its emissive textures, so it glows on
   its own (no recolor/cycle needed). The artist parked the mouse inline behind the keyboard,
   which isn't a natural desk layout, so DeskSet splits the model by mesh name and places each
   piece on its own. Knobs below; tune against localhost (the preview can't show WebGL). */
const DESKSET_URL = "/models/rgb-keyboard-mouse/scene-opt.glb"; // CC-BY-4.0, Jamesley — see CREDITS.md
                    // (welded + simplified to ~50% tris at 1% error — gltf-transform; source in Private)
const KEYBOARD_W = 1.7;                          // keyboard width on the desk (world units)
const KEYBOARD_POS: [number, number] = [-0.18, 0.42]; // [x, z] on the desk mat
const KEYBOARD_ROT = 0;                          // facing; flip to Math.PI if the keys face away
const MOUSE_W = 0.36;                            // mouse length on the desk (world units)
const MOUSE_POS: [number, number] = [0.95, 0.4]; // [x, z] on the desk mat
const MOUSE_ROT = 0;                             // facing; flip if the buttons point the wrong way

/* ---------- the gaming chair (downloaded .glb) ----------
   A real racing-style gaming chair (9arts, CC-BY-4.0 — see CREDITS.md), parked in front of
   the desk facing the monitors. Auto-scaled to CHAIR_HEIGHT and dropped onto the floor like
   the PC tower; its black + red materials already match the rig, so no recolor. It's a
   SketchUp export with a deep node hierarchy, so the runtime fit measures the real world
   bounding box rather than trusting raw mesh coords. Facing can't be read cleanly off the
   mesh, so CHAIR_ROT_Y is the knob to flip if it doesn't face the screens — eyeball localhost. */
const CHAIR_URL = "/models/gaming-chair/chair-opt.glb"; // CC-BY-4.0, 9arts — see CREDITS.md
                  // (joined from 67 fragment meshes — gltf-transform; single .glb, textures embedded)
const CHAIR_HEIGHT = 4.8;     // chair total height, world units (main size knob; tune to desk)
const CHAIR_ALONG = 0.5;      // 0→1 across the desk width — aligns the chair with the screens
const CHAIR_GAP = 1.2;        // how far the chair sits out (room-side) from the desk's edge
const CHAIR_ROT_Y = Math.PI;  // facing; flip toward 0 or ±π/2 if it doesn't face the screens

const GAMING = {
  frame: "#15171c",      // matte dark chassis (bezel, keyboard, case)
  matte: "#0e0f12",      // near-black plastic
  screen: "#0b1830",     // screen base tint (the lit look comes from emissive)
  screenGlow: "#3a86d6", // cool desktop-blue the monitor emits
  metal: "#2a2d33",      // monitor stand / accents
  rgbA: "#19d3ff",       // cyan RGB
  rgbB: "#ff2e88",       // magenta RGB
  rgbC: "#8a4bff",       // violet RGB
};

/* rounded-rect path helper for the procedural screen texture (avoids relying on
   CanvasRenderingContext2D.roundRect being present). */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* GamingPC: the PC-tower .glb standing on the floor at an explicit x/z. Like
   fitCorner it auto-measures + scales the mesh (to a target HEIGHT) and drops its
   base on the floor, but centers it on a given spot. rotY spins its facing.

   The model ships with NO emissive materials, so its fans/cables read as dull
   plastic in the warm room. We clone every vivid (saturated) material and drive
   its emissive each frame through the rainbow — that's the RGB. Greys / black
   chassis / the glass panel are left untouched. Materials are cloned so we never
   mutate useGLTF's shared cache. */
function GamingPC({
  targetH,
  x,
  z,
  rotY = 0,
}: {
  targetH: number;
  x: number;
  z: number;
  rotY?: number;
}) {
  const { scene } = useGLTF(PC_URL);
  // the memo returns BOTH the placed clone and its rainbow-cycled materials, so the
  // per-frame loop below reads them straight from the memo (no ref writes in render)
  const { node, rgbMats } = useMemo(() => {
    const o = scene.clone(true);
    o.rotation.set(0, rotY, 0);
    o.scale.setScalar(1);
    o.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    o.scale.setScalar(targetH / size.y);
    o.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o);
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    o.position.set(x - cx, -HY - box.min.y, z - cz); // center on x/z, base on the floor

    // pick out vivid materials → clone + flag for the rainbow cycle
    const found: THREE.MeshStandardMaterial[] = [];
    const seen = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    const hsl = { h: 0, s: 0, l: 0 };
    const recolor = (m: THREE.Material): THREE.Material => {
      const sm = m as THREE.MeshStandardMaterial;
      if (!sm.color) return m;
      sm.color.getHSL(hsl);
      if (hsl.s <= 0.4 || hsl.l <= 0.12 || hsl.l >= 0.72) return m; // grey/black/white/glass
      let cl = seen.get(m);
      if (!cl) {
        cl = sm.clone();
        cl.emissive = new THREE.Color(0, 0, 0);
        cl.emissiveIntensity = RGB_GLOW;
        seen.set(m, cl);
        found.push(cl);
      }
      return cl;
    };
    o.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(recolor) : recolor(mesh.material);
    });
    return { node: o, rgbMats: found };
  }, [scene, targetH, x, z, rotY]);

  useFrame((state) => {
    const t = state.clock.elapsedTime * RGB_SPEED;
    for (let i = 0; i < rgbMats.length; i++) {
      rgbMats[i].emissive.setHSL((t + i / Math.max(1, rgbMats.length)) % 1, 1, 0.5); // rainbow spread
    }
  });

  return <primitive object={node} />;
}

/* DeskSet: the downloaded "RGB Keyboard and Mouse" model, split into its two pieces so each
   can sit where a real desk would put them (keyboard centered, mouse off to the right) — the
   artist parked the mouse inline behind the keyboard. pickDeskItem clones the meshes whose
   name matches `re` (baking each one's full world transform so the Sketchfab Y-up hierarchy
   survives — and naturally dropping the model's stray Camera/Light nodes, which aren't
   meshes), scales the group so its footprint = `targetW`, drops its base to the desk surface
   (local y=0), and centers it at [x, z]. The keyboard's RGB rides along in its emissive map. */
function pickDeskItem(
  scene: THREE.Object3D,
  re: RegExp,
  targetW: number,
  x: number,
  z: number,
  rotY: number,
) {
  const g = new THREE.Group();
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !re.test(m.name)) return;
    const c = m.clone();
    c.matrix.copy(m.matrixWorld);                          // bake the full ancestor transform...
    c.matrix.decompose(c.position, c.quaternion, c.scale); // ...into the clone's own TRS
    g.add(c);
  });
  g.rotation.set(0, rotY, 0);
  g.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
  g.scale.setScalar(targetW / Math.max(size.x, size.z));
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g);
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  g.position.set(x - cx, -box.min.y, z - cz); // center on [x, z], base on the desk
  return g;
}

function DeskSet() {
  const { scene } = useGLTF(DESKSET_URL);
  const { kb, mouse } = useMemo(
    () => ({
      kb: pickDeskItem(scene, /Keyboard/i, KEYBOARD_W, KEYBOARD_POS[0], KEYBOARD_POS[1], KEYBOARD_ROT),
      mouse: pickDeskItem(scene, /Mouse/i, MOUSE_W, MOUSE_POS[0], MOUSE_POS[1], MOUSE_ROT),
    }),
    [scene],
  );
  return (
    <>
      <primitive object={kb} />
      <primitive object={mouse} />
    </>
  );
}

/* MonitorWiring: a few dark cables draping from the monitor backs down behind the
   stand — the "cable management" look. Built as tube geometry along smooth curves. */
function MonitorWiring({ spread }: { spread: number }) {
  const geoms = useMemo(() => {
    const tube = (pts: number[][]) =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))),
        28, 0.02, 6, false,
      );
    return [
      tube([[-spread, 1.05, -0.45], [-spread * 0.7, 0.5, -0.56], [-0.15, 0.1, -0.55], [-0.08, 0.04, -0.5]]),
      tube([[spread, 1.0, -0.45], [spread * 0.7, 0.55, -0.56], [0.15, 0.1, -0.55], [0.06, 0.04, -0.5]]),
      tube([[0, 0.12, -0.5], [-0.12, 0.05, -0.62], [-0.3, 0.03, -0.72], [-0.5, 0.03, -0.8]]),
    ];
  }, [spread]);
  return (
    <group>
      {geoms.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#0b0c0f" roughness={0.85} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

/* one monitor HEAD (no foot of its own — it hangs off the shared DualStand). The
   slightly back-tilted head carries the lit screen + a VESA stub on its back that
   meets the stand arm. `x` offsets it across the desk; `rotY` toes it inward. */
function Monitor({ x, rotY, tex }: { x: number; rotY: number; tex: THREE.Texture }) {
  return (
    <group position={[x, 0, -0.3]} rotation={[0, rotY, 0]}>
      <group position={[0, 1.16, 0]} rotation={[-0.05, 0, 0]}>
        {/* back shell */}
        <mesh position={[0, 0, -0.05]}>
          <boxGeometry args={[2.36, 1.34, 0.07]} />
          <meshStandardMaterial color={GAMING.frame} roughness={0.5} metalness={0.4} />
        </mesh>
        {/* slim front frame */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.42, 1.4, 0.04]} />
          <meshStandardMaterial color={GAMING.matte} roughness={0.6} />
        </mesh>
        {/* the lit screen */}
        <mesh position={[0, 0.03, 0.025]}>
          <planeGeometry args={[2.26, 1.22]} />
          <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.6} roughness={0.3} metalness={0} />
        </mesh>
        {/* brand dot on the chin */}
        <mesh position={[0, -0.63, 0.03]}>
          <boxGeometry args={[0.07, 0.025, 0.012]} />
          <meshStandardMaterial color={GAMING.metal} roughness={0.3} metalness={0.8} />
        </mesh>
        {/* VESA mount stub that meets the stand arm */}
        <mesh position={[0, 0, -0.12]}>
          <boxGeometry args={[0.18, 0.18, 0.12]} />
          <meshStandardMaterial color={GAMING.metal} roughness={0.4} metalness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

/* a single dual-monitor desk stand: weighted base, center pole, and a crossbar
   with two short forward arms the monitor heads mount onto. `spread` matches the
   monitors' center offset so the arms line up. */
function DualStand({ spread }: { spread: number }) {
  return (
    <group position={[0, 0, -0.3]}>
      {/* weighted base on the desk */}
      <mesh position={[0, 0.03, -0.16]}>
        <boxGeometry args={[0.52, 0.06, 0.4]} />
        <meshStandardMaterial color={GAMING.frame} roughness={0.5} metalness={0.5} />
      </mesh>
      {/* center pole */}
      <mesh position={[0, 0.62, -0.24]}>
        <cylinderGeometry args={[0.05, 0.06, 1.24, 20]} />
        <meshStandardMaterial color={GAMING.metal} roughness={0.4} metalness={0.7} />
      </mesh>
      {/* crossbar the heads hang from */}
      <mesh position={[0, 1.16, -0.24]}>
        <boxGeometry args={[2 * spread + 0.3, 0.07, 0.07]} />
        <meshStandardMaterial color={GAMING.metal} roughness={0.4} metalness={0.7} />
      </mesh>
      {/* short arms reaching forward to each monitor's VESA stub */}
      {[-spread, spread].map((sx, i) => (
        <mesh key={i} position={[sx, 1.16, -0.15]}>
          <boxGeometry args={[0.08, 0.08, 0.22]} />
          <meshStandardMaterial color={GAMING.metal} roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* procedural mousepad surface: a dark woven cloth with a stitched border + faint
   monogram, drawn once to a canvas. This is what fixes the "out of place" flat box —
   it gives the mat real fabric grain at the resolution of the .glb models around it.
   Cheap (one 1024×420 texture). Module-level like galaxyTexture/earthTexture so the
   random speckle stays out of component render (react-hooks/purity). */
function mousepadTexture() {
  const W = 1024, H = 420;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  if (x) {
    // base cloth + a soft center sheen
    x.fillStyle = "#0d0e12";
    x.fillRect(0, 0, W, H);
    const rg = x.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.6);
    rg.addColorStop(0, "rgba(46,52,66,0.35)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = rg;
    x.fillRect(0, 0, W, H);
    // fine diagonal weave (cross-hatch in both directions)
    x.globalAlpha = 0.05;
    x.strokeStyle = "#aeb6c4";
    x.lineWidth = 1;
    for (let i = -H; i < W; i += 4) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H, H); x.stroke();
      x.beginPath(); x.moveTo(i, H); x.lineTo(i + H, 0); x.stroke();
    }
    x.globalAlpha = 1;
    // speckle grain so the weave isn't perfectly regular
    for (let i = 0; i < 2400; i++) {
      x.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
      x.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    }
    // stitched border
    x.strokeStyle = "rgba(120,130,145,0.5)";
    x.lineWidth = 3;
    x.setLineDash([10, 7]);
    x.strokeRect(14, 14, W - 28, H - 28);
    x.setLineDash([]);
    // faint corner monogram
    x.globalAlpha = 0.1;
    x.fillStyle = "#cfd6e2";
    x.font = "bold 58px system-ui, sans-serif";
    x.textAlign = "right";
    x.textBaseline = "bottom";
    x.fillText("FC", W - 40, H - 30);
    x.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function GamingSetup({ deskBox }: { deskBox: THREE.Box3 }) {
  const px = THREE.MathUtils.lerp(deskBox.min.x, deskBox.max.x, GAMING_ALONG);
  const pz = THREE.MathUtils.lerp(deskBox.min.z, deskBox.max.z, GAMING_DEPTH);
  const py = deskBox.max.y; // sit on the desk's top surface
  const tx = deskBox.min.x - TOWER_GAP; // tower stands to the room-side of the desk
  const tz = THREE.MathUtils.lerp(deskBox.min.z, deskBox.max.z, TOWER_DEPTH);

  // procedural "screen on" texture: a wallpaper gradient + a code window + a dock,
  // drawn once to a canvas and used as both albedo and emissive so the monitor reads
  // as lit rather than a flat blue slab. Cheap (one 512×288 texture) — ADR-0011 safe.
  const screenTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 288;
    const x = c.getContext("2d");
    if (x) {
      const g = x.createLinearGradient(0, 0, 0, 288);
      g.addColorStop(0, "#0a1330");
      g.addColorStop(0.6, "#163a63");
      g.addColorStop(1, "#1f6b86");
      x.fillStyle = g;
      x.fillRect(0, 0, 512, 288);
      const rg = x.createRadialGradient(256, 120, 8, 256, 150, 280);
      rg.addColorStop(0, "rgba(150,210,255,0.30)");
      rg.addColorStop(1, "rgba(150,210,255,0)");
      x.fillStyle = rg;
      x.fillRect(0, 0, 512, 288);
      // code/editor window
      x.fillStyle = "rgba(8,12,22,0.82)";
      rr(x, 150, 54, 300, 150, 10);
      x.fill();
      x.fillStyle = "rgba(255,255,255,0.06)";
      rr(x, 150, 54, 300, 26, 10);
      x.fill();
      ["#ff5f57", "#febc2e", "#28c840"].forEach((d, i) => {
        x.fillStyle = d;
        x.beginPath();
        x.arc(168 + i * 16, 67, 5, 0, Math.PI * 2);
        x.fill();
      });
      const lines: [string, number][] = [
        ["#7fd1ff", 120], ["#ffd479", 180], ["#a0e8a0", 90], ["#c9a0ff", 150], ["#7fd1ff", 60],
      ];
      x.globalAlpha = 0.85;
      lines.forEach(([col, w], i) => {
        x.fillStyle = col;
        rr(x, 170, 96 + i * 18, w, 8, 4);
        x.fill();
      });
      x.globalAlpha = 1;
      // dock
      x.fillStyle = "rgba(255,255,255,0.10)";
      rr(x, 176, 250, 160, 26, 13);
      x.fill();
      ["#19d3ff", "#ff2e88", "#8a4bff", "#ffd479", "#28c840"].forEach((d, i) => {
        x.fillStyle = d;
        rr(x, 186 + i * 30, 256, 18, 14, 4);
        x.fill();
      });
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);

  // procedural mousepad surface (mousepadTexture below, memoized — built once)
  const matTex = useMemo(() => mousepadTexture(), []);
  // desk mat edge + the wall-wash light, cycled together each frame
  const matGlow = useRef<THREE.MeshStandardMaterial>(null);
  const accent = useRef<THREE.PointLight>(null);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime * RGB_SPEED;
    if (matGlow.current) matGlow.current.emissive.copy(col.setHSL(t % 1, 1, 0.5));
    if (accent.current) accent.current.color.copy(col.setHSL((t + 0.5) % 1, 1, 0.5));
  });

  return (
    <>
      <group position={[px, py, pz]} rotation={[0, GAMING_ROT_Y, 0]} scale={GAMING_SCALE}>
        {/* desk mat — dark pad over a slim RGB base that peeks at the edges */}
        <mesh position={[0, 0.01, 0.35]}>
          <boxGeometry args={[2.7, 0.02, 1.15]} />
          <meshStandardMaterial ref={matGlow} color={GAMING.matte} emissive={GAMING.rgbB} emissiveIntensity={0.6} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.025, 0.35]}>
          <boxGeometry args={[2.55, 0.02, 1.05]} />
          <meshStandardMaterial map={matTex} roughness={0.92} metalness={0} />
        </mesh>

        {/* dual monitors on one shared arm stand, toed inward toward the chair */}
        <DualStand spread={MONITOR_SPREAD} />
        <Monitor x={-MONITOR_SPREAD} rotY={MONITOR_TOE} tex={screenTex} />
        <Monitor x={MONITOR_SPREAD} rotY={-MONITOR_TOE} tex={screenTex} />

        {/* downloaded RGB keyboard + mouse (split from one model, placed independently) */}
        <DeskSet />

        {/* cable management draping behind the monitors */}
        <MonitorWiring spread={MONITOR_SPREAD} />

        {/* the monitor lighting the desk — one calm point light (ADR-0011 budget) */}
        {SCREEN_GLOW > 0 && (
          <pointLight position={[0, 1.0, 0.6]} intensity={SCREEN_GLOW} distance={6} decay={2} color={GAMING.screenGlow} />
        )}

        {/* a colored wall-wash light behind the monitors (cycles; no visible strip) */}
        <pointLight ref={accent} position={[0, 1.1, -0.55]} intensity={2.4} distance={6} decay={2} color={GAMING.rgbA} />
      </group>

      <GamingPC targetH={TOWER_HEIGHT} x={tx} z={tz} rotY={TOWER_ROT_Y} />
    </>
  );
}

/* GamingChair: the downloaded chair model, auto-scaled to CHAIR_HEIGHT and dropped onto the
   floor in front of the desk (CHAIR_ALONG across its width, CHAIR_GAP out from the room-side
   edge), facing the screens. Black + red native materials are kept as-is. The world bounding
   box is measured AFTER the rotation/scale so the deep SketchUp hierarchy can't throw off the
   fit, then the base is dropped to the floor and the body centered on [x, z]. */
function GamingChair({ deskBox }: { deskBox: THREE.Box3 }) {
  const { scene } = useGLTF(CHAIR_URL);
  const node = useMemo(() => {
    const o = scene.clone(true);
    o.rotation.set(0, CHAIR_ROT_Y, 0);
    o.scale.setScalar(1);
    o.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    o.scale.setScalar(CHAIR_HEIGHT / size.y);
    o.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o);
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    const x = THREE.MathUtils.lerp(deskBox.min.x, deskBox.max.x, CHAIR_ALONG);
    const z = deskBox.max.z + CHAIR_GAP;
    o.position.set(x - cx, -HY - box.min.y, z - cz); // center on x/z, base on the floor
    return o;
  }, [scene, deskBox]);
  return <primitive object={node} />;
}

const Furniture = memo(function Furniture() {
  const { scene: deskScene } = useGLTF(DESK_URL);
  const desk = useMemo(
    () => fitCorner(deskScene, DESK_TARGET, 1, -1, 0.6, DESK_ROT_Y),
    [deskScene],
  );
  return (
    // every piece of furniture casts + receives: the sun rakes long shadows off the
    // bed/desk/chair, the fan pools shadows beneath them (ADR-0012)
    <CastReceive>
      <Bed />
      <primitive object={desk.object} />
      <GamingSetup deskBox={desk.box} />
      <GamingChair deskBox={desk.box} />
    </CastReceive>
  );
});
useGLTF.preload(BED_URL);
useGLTF.preload(NIGHTSTAND_URL);
useGLTF.preload(DESK_URL);
useGLTF.preload(PC_URL);
useGLTF.preload(DESKSET_URL);
useGLTF.preload(CHAIR_URL);

/* Procedural textures for the space-themed fan (drawn once to a canvas). galaxyTexture =
   deep space + nebula + stars for the blades; earthTexture = a stylized Earth for the glowing
   globe light. Both are used as map + emissiveMap so they read vividly under any room light. */
function galaxyTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const x = c.getContext("2d");
  if (x) {
    const g = x.createLinearGradient(0, 0, 512, 256);
    g.addColorStop(0, "#0c1230"); // deep navy — the Discovery's blades are blue-black, not bright
    g.addColorStop(0.5, "#16255a");
    g.addColorStop(1, "#0d1638");
    x.fillStyle = g;
    x.fillRect(0, 0, 512, 256);
    // soft nebula clouds (additive) — cool blues/violets only; the warm tones live in the swoosh
    const neb: [string, number][] = [["#1e4fae", 0.45], ["#3b7ccc", 0.35], ["#6a3ac0", 0.28]];
    x.globalCompositeOperation = "lighter";
    for (let i = 0; i < 14; i++) {
      const [col, a] = neb[i % neb.length];
      const cx = Math.random() * 512, cy = Math.random() * 256, r = 40 + Math.random() * 120;
      const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, col);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      x.globalAlpha = a * 0.5;
      x.fillStyle = rg;
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    }
    x.globalAlpha = 1;
    x.globalCompositeOperation = "source-over";
    // star field
    for (let i = 0; i < 420; i++) {
      x.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`;
      x.beginPath(); x.arc(Math.random() * 512, Math.random() * 256, Math.random() * 1.2, 0, Math.PI * 2); x.fill();
    }
    // a few bright glowing stars, plus a sprinkle of tinted ones (icy blue / warm gold)
    for (let i = 0; i < 12; i++) {
      const sx = Math.random() * 512, sy = Math.random() * 256;
      const rg = x.createRadialGradient(sx, sy, 0, sx, sy, 8);
      rg.addColorStop(0, "rgba(255,255,255,0.9)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = rg;
      x.beginPath(); x.arc(sx, sy, 8, 0, Math.PI * 2); x.fill();
    }
    for (let i = 0; i < 26; i++) {
      x.fillStyle = i % 2 ? "rgba(190,220,255,0.85)" : "rgba(255,230,190,0.8)";
      x.beginPath(); x.arc(Math.random() * 512, Math.random() * 256, 0.8 + Math.random() * 1.1, 0, Math.PI * 2); x.fill();
    }
    // the rocket's exhaust trail — a wide periwinkle band with a dusty-pink upper edge that
    // S-curves across the blade from root to tip, ending at the rocket (per Francisco's own
    // photos in Private Random Stuff/References/Fan/ — NOT orange like the stock listing, and
    // no moon / orbit ring)
    const trail = (w: number, col: string, a: number, lift: number) => {
      x.globalAlpha = a;
      x.strokeStyle = col;
      x.lineWidth = w;
      x.lineCap = "round";
      x.beginPath();
      x.moveTo(20, 60 + lift);
      x.bezierCurveTo(180, 30 + lift, 240, 250 + lift, 424, 118 + lift);
      x.stroke();
    };
    trail(58, "#7e97d8", 0.5, 0);    // the wide band
    trail(26, "#a8c0f0", 0.55, 6);   // brighter core
    trail(12, "#d8a0b8", 0.75, -28); // dusty-pink edge stripe
    x.globalAlpha = 1;
    // soft blue glow where the trail meets the rocket at the tip
    const bgl = x.createRadialGradient(430, 118, 0, 430, 118, 46);
    bgl.addColorStop(0, "rgba(159,208,245,0.4)");
    bgl.addColorStop(1, "rgba(159,208,245,0)");
    x.fillStyle = bgl;
    x.beginPath(); x.arc(430, 118, 46, 0, Math.PI * 2); x.fill();
    // the little rocket ship at the blade tip (white hull, slate fins, blue flame)
    x.save();
    x.translate(430, 118);
    x.rotate(-0.5);
    x.fillStyle = "#e8edf4"; // hull
    x.beginPath();
    x.moveTo(-20, -8); x.lineTo(8, -8);
    x.quadraticCurveTo(24, 0, 8, 8); x.lineTo(-20, 8);
    x.quadraticCurveTo(-26, 0, -20, -8); x.closePath(); x.fill();
    x.fillStyle = "#7f93b8"; // nose cone
    x.beginPath(); x.moveTo(8, -8); x.quadraticCurveTo(24, 0, 8, 8); x.closePath(); x.fill();
    x.fillStyle = "#3a4a66"; // window
    x.beginPath(); x.arc(-4, 0, 4, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#7f93b8"; // fins
    x.beginPath(); x.moveTo(-20, -8); x.lineTo(-30, -14); x.lineTo(-17, -4); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(-20, 8); x.lineTo(-30, 14); x.lineTo(-17, 4); x.closePath(); x.fill();
    x.fillStyle = "rgba(150,200,255,0.9)"; // flame
    x.beginPath(); x.moveTo(-20, -4); x.lineTo(-34, 0); x.lineTo(-20, 4); x.closePath(); x.fill();
    x.restore();
    // soft vignette so the blade edges read darker and the art gains depth
    const vg = x.createRadialGradient(256, 128, 90, 256, 128, 300);
    vg.addColorStop(0, "rgba(5,8,20,0)");
    vg.addColorStop(1, "rgba(5,8,20,0.4)");
    x.fillStyle = vg;
    x.fillRect(0, 0, 512, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function earthTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256; // 2:1 equirectangular, wraps cleanly onto the globe sphere
  const x = c.getContext("2d");
  if (x) {
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#1b6aa8");
    g.addColorStop(0.5, "#1f7fc0");
    g.addColorStop(1, "#175a92");
    x.fillStyle = g;
    x.fillRect(0, 0, 512, 256);
    // organic green/tan landmasses
    const land = ["#3f8f3a", "#4e9c45", "#7d8a3e", "#b59a5e"];
    for (let i = 0; i < 22; i++) {
      x.fillStyle = land[i % land.length];
      const cx = Math.random() * 512, cy = 40 + Math.random() * 180, n = 6 + Math.floor(Math.random() * 5), rad = 14 + Math.random() * 40;
      x.beginPath();
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2, rr = rad * (0.5 + Math.random() * 0.8);
        const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr * 0.7;
        if (k) x.lineTo(px, py); else x.moveTo(px, py);
      }
      x.closePath(); x.fill();
    }
    // polar ice caps
    x.fillStyle = "rgba(240,245,255,0.85)";
    x.fillRect(0, 0, 512, 14);
    x.fillRect(0, 244, 512, 12);
    // wispy clouds
    x.globalAlpha = 0.5;
    x.fillStyle = "#ffffff";
    for (let i = 0; i < 26; i++) {
      x.beginPath(); x.arc(Math.random() * 512, Math.random() * 256, 8 + Math.random() * 22, 0, Math.PI * 2); x.fill();
    }
    x.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* CeilingFan: a procedural fan + light kit hung from the ceiling — the room's main overhead
   source, and a hero object dead-center, so it's built for fidelity AND personality. Modeled
   on Francisco's real fan, the Hunter Discovery 52298 (48-in brushed nickel; ref photo in
   Private Random Stuff/References/fan/): turned (lathe) motor housing, broad almond blades
   with starfield + comet-swoosh + orbiting-rocket art, brushed-nickel brackets, and a glowing
   Earth-bowl light kit hugging the motor. Blades spin each frame (FAN_SPEED). Geometry +
   textures are memoized (built once). Any tweaks here: keep public/fan-preview.html in sync. */
const CeilingFan = memo(function CeilingFan() {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.y += FAN_SPEED * dt;
  });

  const bladeAngles = useMemo(
    () => Array.from({ length: FAN_BLADES }, (_, i) => (i / FAN_BLADES) * Math.PI * 2),
    [],
  );

  // aim point for the light kit's beam — straight down at the floor under the fan
  const bulbTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, -2 * HY, 0);
    return o;
  }, []);

  const geo = useMemo(() => {
    // brushed-nickel motor housing — a stepped turned profile (radius, height), centered ~0
    const prof: [number, number][] = [
      [0.0, 0.17], [0.27, 0.17], [0.31, 0.13], [0.31, 0.03], [0.34, 0.01],
      [0.34, -0.05], [0.31, -0.07], [0.31, -0.15], [0.22, -0.2], [0.0, -0.2],
    ];
    const housing = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 64);

    // teardrop blade bracket — a flat nickel arm with an elongated loop cut through it
    const Lb = 0.6, wb = 0.17;
    const arm = new THREE.Shape();
    arm.moveTo(0.02, -0.075);
    arm.lineTo(Lb - 0.05, -wb * 0.34);
    arm.quadraticCurveTo(Lb, -wb * 0.34, Lb, 0);
    arm.quadraticCurveTo(Lb, wb * 0.34, Lb - 0.05, wb * 0.34);
    arm.lineTo(0.02, 0.075);
    arm.quadraticCurveTo(-0.05, 0, 0.02, -0.075);
    const loop = new THREE.Path();
    loop.absellipse(Lb * 0.54, 0, Lb * 0.32, wb * 0.2, 0, Math.PI * 2, false, 0);
    arm.holes.push(loop);
    const bracket = new THREE.ExtrudeGeometry(arm, {
      depth: 0.05, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, steps: 1,
    });
    bracket.rotateX(-Math.PI / 2);
    bracket.translate(0, -0.025, 0);

    // blade — a broad almond paddle (the Discovery's wide blades): pinched at the root,
    // widest just past mid-span, tapering to a soft point at the tip
    const L = FAN_RADIUS - 0.62, wRoot = 0.16, wMax = 0.84;
    const s = new THREE.Shape();
    s.moveTo(0, -wRoot / 2);
    s.bezierCurveTo(L * 0.25, -wMax * 0.42, L * 0.55, -wMax / 2, L * 0.8, -wMax * 0.4);
    s.quadraticCurveTo(L * 0.98, -wMax * 0.16, L, 0);     // soft-pointed tip
    s.quadraticCurveTo(L * 0.98, wMax * 0.16, L * 0.8, wMax * 0.4);
    s.bezierCurveTo(L * 0.55, wMax / 2, L * 0.25, wMax * 0.42, 0, wRoot / 2);
    s.closePath();
    const blade = new THREE.ExtrudeGeometry(s, {
      depth: 0.06, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, steps: 1,
    });
    blade.rotateX(-Math.PI / 2);    // lay flat: length X, width Z, thickness Y
    blade.translate(0, -0.03, 0);   // center the thickness on Y
    // remap UVs to 0..1 across the blade so the galaxy texture (incl. its rocket) sits cleanly
    blade.computeBoundingBox();
    const bb = blade.boundingBox!;
    const span = bb.getSize(new THREE.Vector3());
    const p = blade.attributes.position, uv = blade.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      uv.setXY(i, (p.getX(i) - bb.min.x) / span.x, (p.getZ(i) - bb.min.z) / span.z);
    }
    uv.needsUpdate = true;

    // star-shaped pull tab
    const starSh = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.03 : 0.07;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      if (i) starSh.lineTo(px, py); else starSh.moveTo(px, py);
    }
    starSh.closePath();
    const star = new THREE.ExtrudeGeometry(starSh, { depth: 0.015, bevelEnabled: false });
    star.center();

    return { housing, bracket, blade, star, galaxy: galaxyTexture(), earth: earthTexture() };
  }, []);

  const droop = 0.12; // blades angle down-and-out from the motor
  const pitch = 0.24; // blade angle of attack (the twist)
  return (
    <group position={FAN_POS}>
      {/* brushed-nickel canopy + short chrome downrod — a low-profile hugger mount */}
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.2, 0.27, 0.1, 48]} />
        <meshStandardMaterial color={FAN.metal} roughness={0.35} metalness={0.9} />
      </mesh>
      <mesh position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.18, 24]} />
        <meshStandardMaterial color={FAN.chrome} roughness={0.18} metalness={1} />
      </mesh>

      {/* brushed-nickel motor housing, with a dark graphite badge band around its waist so
          the metal reads against it (artistic liberty — gives the nickel something to pop off) */}
      <mesh geometry={geo.housing} position={[0, -0.4, 0]}>
        <meshStandardMaterial color={FAN.chrome} roughness={0.26} metalness={0.95} />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.345, 0.345, 0.05, 64]} />
        <meshStandardMaterial color="#2a2d33" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* spinning rotor: 5 teardrop brackets, each carrying a long galaxy blade */}
      <group ref={blades} position={[0, -0.42, 0]}>
        {bladeAngles.map((a, i) => (
          <group key={i} rotation={[0, a, 0]}>
            <group rotation={[0, 0, -droop]}>
              <mesh geometry={geo.bracket} position={[0.16, 0, 0]}>
                <meshStandardMaterial color={FAN.chrome} roughness={0.24} metalness={0.97} />
              </mesh>
              <mesh geometry={geo.blade} position={[0.62, -0.02, 0]} rotation={[pitch, 0, 0]}>
                <meshStandardMaterial map={geo.galaxy} emissiveMap={geo.galaxy} emissive="#ffffff" emissiveIntensity={0.6} roughness={0.8} metalness={0.1} />
              </mesh>
            </group>
          </group>
        ))}
      </group>

      {/* Earth light kit — a true spherical cap (the bottom face of a much larger sphere, so
          the curve is smooth, not squashed), painted as Earth and lit from within. It floats
          with a small gap below the nickel fixture ring, like real light-kit glass. */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.5, 0.53, 0.09, 48]} />
        <meshStandardMaterial color={FAN.chrome} roughness={0.24} metalness={0.97} />
      </mesh>
      <mesh position={[0, -0.29, 0]}>
        <sphereGeometry args={[0.61, 48, 24, 0, Math.PI * 2, Math.PI * 0.72, Math.PI * 0.28]} />
        <meshStandardMaterial map={geo.earth} emissiveMap={geo.earth} emissive="#ffffff" emissiveIntensity={1.8} roughness={0.45} metalness={0} side={THREE.DoubleSide} />
      </mesh>

      {/* nickel finial at the bowl's base; the two pull chains hang beside it (star pull =
          fan, cylinder pull = light) — matches Francisco's photos */}
      <mesh position={[0, -0.93, 0]}>
        <sphereGeometry args={[0.055, 24, 18]} />
        <meshStandardMaterial color={FAN.chrome} roughness={0.25} metalness={0.95} />
      </mesh>
      <group position={[0.09, -0.9, 0.04]}>
        <mesh position={[0, -0.24, 0]}>
          <cylinderGeometry args={[0.007, 0.007, 0.48, 8]} />
          <meshStandardMaterial color={FAN.chrome} roughness={0.3} metalness={0.9} />
        </mesh>
        <mesh geometry={geo.star} position={[0, -0.51, 0]}>
          <meshStandardMaterial color={FAN.metal} roughness={0.4} metalness={0.6} />
        </mesh>
      </group>
      <group position={[-0.07, -0.9, -0.05]}>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.007, 0.007, 0.3, 8]} />
          <meshStandardMaterial color={FAN.chrome} roughness={0.3} metalness={0.9} />
        </mesh>
        <mesh position={[0, -0.33, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.06, 12]} />
          <meshStandardMaterial color={FAN.chrome} roughness={0.25} metalness={0.95} />
        </mesh>
      </group>

      {/* the bulb — a wide cone thrown DOWN from inside the Earth globe, so the pool of
          light lands on the floor under the fan (a bare point light here lit the ceiling
          right above the fixture brightest, which read as light from the wrong place).
          The tiny glow's throw is SHORTER than the bulb→ceiling gap, so it can only kiss
          the finial/chains — the visible "source" stays pinned at the glowing globe. */}
      <primitive object={bulbTarget} />
      <spotLight
        position={[0, -0.76, 0]}
        target={bulbTarget}
        angle={1.15}
        penumbra={0.9}
        distance={30}
        decay={2}
        intensity={FAN_LIGHT}
        color={FAN_LIGHT_COLOR}
        castShadow
        shadow-mapSize={[FAN_SHADOW_MAP, FAN_SHADOW_MAP]}
        shadow-radius={6}
        shadow-bias={-0.0002}
        shadow-normalBias={0.03}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
      />
      <pointLight position={[0, -0.85, 0]} intensity={3} distance={0.8} decay={2} color={FAN_LIGHT_COLOR} />
    </group>
  );
});

/* ---------- crown molding ----------
   A painted cove where the walls meet the ceiling (same paint as the window trim, like
   Francisco's real room). One extruded profile — flat fillet, cove sweep, ceiling lip —
   run along the three standing walls; the corner joints simply overlap (same material,
   so they read as miters from every camera stop). */
const CROWN_H = 0.35;      // drop down the wall
const CROWN_D = 0.35;      // reach across the ceiling
const TRIM_PAINT = "#e3ddd0"; // shared with the window frame

function crownGeo(length: number) {
  const p = new THREE.Shape();
  p.moveTo(0, -CROWN_H);
  p.lineTo(0.06, -CROWN_H);              // bottom fillet against the wall
  p.lineTo(0.06, -CROWN_H + 0.05);
  p.quadraticCurveTo(0.1, -0.1, CROWN_D - 0.07, -0.06); // the cove sweep up + out
  p.lineTo(CROWN_D - 0.07, -0.02);
  p.lineTo(CROWN_D, -0.02);              // top lip along the ceiling
  p.lineTo(CROWN_D, 0);
  p.lineTo(0, 0);
  p.closePath();
  const g = new THREE.ExtrudeGeometry(p, { depth: length, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -length / 2); // center the run so wall meshes place symmetrically
  return g;
}

const CrownMolding = memo(function CrownMolding() {
  const geos = useMemo(() => ({ back: crownGeo(HX * 2), side: crownGeo(HZ * 2) }), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: TRIM_PAINT, roughness: 0.55, metalness: 0 }),
    [],
  );
  return (
    <group>
      <mesh geometry={geos.back} material={mat} position={[0, HY, -HZ]} rotation={[0, -Math.PI / 2, 0]} receiveShadow />
      <mesh geometry={geos.side} material={mat} position={[-HX, HY, 0]} receiveShadow />
      <mesh geometry={geos.side} material={mat} position={[HX, HY, 0]} rotation={[0, Math.PI, 0]} receiveShadow />
    </group>
  );
});

/* ---------- window (daylight outside) + sunlight ----------
   A classic white double-hung window on the BACK wall, just right of the education
   placard (Francisco's call; the experience placard scooched right in roomStops.ts to
   make room). The wall has a REAL hole cut behind the frame (see Walls), the jambs +
   sashes recess OUT through it like true wall thickness, and the outside is a real CC0
   photo (Poly Haven panorama crop — see Window) on a big plane ~3 units past the wall,
   so moving around the room shifts what you see through the glass (parallax) instead of
   reading as a flat poster. Its light is a warm sun-beam raking down across the room —
   the daytime key, playing against the fan's warm accent. */
const WINDOW_POS: [number, number, number] = [-1.5, 1.2, -HZ + 0.01]; // back wall, between education + experience
const WINDOW_ROT_Y = 0; // frame is built facing +Z = straight into the room from the back wall
const WINDOW_W = 4.6; // glass width (= the hole cut in the wall)
const WINDOW_H = 2.9; // glass height (split into upper/lower sash)

const Window = memo(function Window() {
  // real photograph outside (CC0, Poly Haven "Kloofendal 48d Partly Cloudy" — a window-
  // shaped crop from the tonemapped panorama: blue sky, cumulus, leafy suburb on a hill;
  // see CREDITS.md). Procedural canvas skies were tried and read as a kid's drawing.
  const viewSrc = useTexture("/textures/window-view.jpg");
  // configure a CLONE, not useTexture's cached texture (mutating a shared value during
  // render trips react-hooks/immutability; the clone shares its GPU upload anyway —
  // same pattern as surfaceMaps for the room shell)
  const view = useMemo(() => {
    const t = viewSrc.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }, [viewSrc]);
  const W = WINDOW_W, H = WINDOW_H;
  const D = 0.32; // reveal depth — how far the jambs run OUT through the wall opening
  const J = 0.09; // jamb board thickness
  // ONE shared paint material for all ~20 trim boards (an inline <meshStandardMaterial>
  // here would instantiate a separate material per mesh — same look, 20× the state
  // changes; CrownMolding set the shared-material precedent)
  const paintMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: TRIM_PAINT, roughness: 0.55, metalness: 0 }),
    [],
  );
  const paint = <primitive object={paintMat} attach="material" />;
  return (
    <group position={WINDOW_POS} rotation={[0, WINDOW_ROT_Y, 0]}>
      {/* the outside world — the photo floats past the wall so off-axis views shift it
          (parallax). Plane 15×6.5 matches the photo's 2.31 aspect exactly (no stretch) and
          is sized so every sight line through the opening (checked against the camera
          stops' extremes, incl. the close/dolly poses) lands on it. Fog is off: it must
          read as daylight out there, not indoor haze. */}
      <mesh position={[0, 0.5, -3.2]}>
        <planeGeometry args={[15, 6.5]} />
        <meshStandardMaterial map={view} emissiveMap={view} emissive="#ffffff" emissiveIntensity={1.1} roughness={1} metalness={0} fog={false} />
      </mesh>

      {/* real glass — near-invisible, just a whisper of cool sheen over the view */}
      <mesh position={[0, 0, -0.22]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#dceaf2" transparent opacity={0.08} roughness={0.08} metalness={0} depthWrite={false} />
      </mesh>

      {/* everything below (jambs → sash lift) casts + receives shadow: with the sun
          OUTSIDE the window (ADR-0012), the sashes + muntins project the classic
          sun-through-window grid across the floor. The photo plane + glass above stay
          OUT of this group — a casting photo plane would eclipse the sun entirely. */}
      <CastReceive>
      {/* reveal: painted jambs lining the opening OUT through the wall */}
      <mesh position={[-W / 2 - J / 2, 0, -D / 2]}><boxGeometry args={[J, H + 2 * J, D]} />{paint}</mesh>
      <mesh position={[W / 2 + J / 2, 0, -D / 2]}><boxGeometry args={[J, H + 2 * J, D]} />{paint}</mesh>
      <mesh position={[0, H / 2 + J / 2, -D / 2]}><boxGeometry args={[W, J, D]} />{paint}</mesh>
      <mesh position={[0, -H / 2 - J / 2, -D / 2]}><boxGeometry args={[W, J, D]} />{paint}</mesh>

      {/* casing — picture-frame trim on the room face of the wall */}
      <mesh position={[0, H / 2 + J + 0.11, 0.035]}><boxGeometry args={[W + 2 * J + 0.44, 0.22, 0.07]} />{paint}</mesh>
      <mesh position={[-W / 2 - J - 0.11, 0, 0.035]}><boxGeometry args={[0.22, H + 2 * J, 0.07]} />{paint}</mesh>
      <mesh position={[W / 2 + J + 0.11, 0, 0.035]}><boxGeometry args={[0.22, H + 2 * J, 0.07]} />{paint}</mesh>

      {/* stool (deep sill with horns, spanning the reveal + lipping into the room) + apron */}
      <mesh position={[0, -H / 2 - J - 0.005, (0.16 - D) / 2]}><boxGeometry args={[W + 2 * J + 0.5, 0.07, D + 0.16]} />{paint}</mesh>
      <mesh position={[0, -H / 2 - J - 0.14, 0.03]}><boxGeometry args={[W + 2 * J + 0.2, 0.2, 0.06]} />{paint}</mesh>

      {/* double-hung sashes set into the reveal: upper sash deeper, lower sash nearer
          the room (classic overlap) */}
      <mesh position={[-W / 2 + 0.045, H / 4, -0.18]}><boxGeometry args={[0.09, H / 2, 0.07]} />{paint}</mesh>
      <mesh position={[W / 2 - 0.045, H / 4, -0.18]}><boxGeometry args={[0.09, H / 2, 0.07]} />{paint}</mesh>
      <mesh position={[0, H / 2 - 0.045, -0.18]}><boxGeometry args={[W, 0.09, 0.07]} />{paint}</mesh>
      <mesh position={[-W / 2 + 0.045, -H / 4, -0.08]}><boxGeometry args={[0.09, H / 2, 0.09]} />{paint}</mesh>
      <mesh position={[W / 2 - 0.045, -H / 4, -0.08]}><boxGeometry args={[0.09, H / 2, 0.09]} />{paint}</mesh>
      <mesh position={[0, -H / 2 + 0.045, -0.08]}><boxGeometry args={[W, 0.09, 0.09]} />{paint}</mesh>
      {/* check rail where the two sashes meet */}
      <mesh position={[0, 0, -0.13]}><boxGeometry args={[W, 0.11, 0.12]} />{paint}</mesh>
      {/* muntins: each sash split into three panes */}
      <mesh position={[-W / 6, H / 4, -0.19]}><boxGeometry args={[0.035, H / 2, 0.04]} />{paint}</mesh>
      <mesh position={[W / 6, H / 4, -0.19]}><boxGeometry args={[0.035, H / 2, 0.04]} />{paint}</mesh>
      <mesh position={[-W / 6, -H / 4, -0.09]}><boxGeometry args={[0.035, H / 2, 0.04]} />{paint}</mesh>
      <mesh position={[W / 6, -H / 4, -0.09]}><boxGeometry args={[0.035, H / 2, 0.04]} />{paint}</mesh>
      {/* nickel sash lift on the lower rail */}
      <mesh position={[0, -H / 2 + 0.1, -0.01]}>
        <boxGeometry args={[0.3, 0.05, 0.05]} />
        <meshStandardMaterial color="#c9ccd2" roughness={0.3} metalness={0.9} />
      </mesh>
      </CastReceive>
    </group>
  );
});

/* Sunlight: a warm beam raking down through the window across the room's center floor.
   The light sits OUTSIDE the window (ADR-0012) — up, off to the left, past the photo
   plane — so the back wall's shadow masks the beam into the window's shape and the
   sashes + muntins project the classic sun-grid onto the floor. decay 0 = no distance
   falloff (the sun is effectively parallel light), which makes SUN a direct multiplier.
   Its intensity breathes very slowly (thin clouds drifting past) so the room feels alive.
   NOTE: the photo plane sits at world z≈-12.2, INSIDE the light's throw — it must never
   cast shadow or it would eclipse the sun (see the CastReceive note in Window). */
const SUN_POS: [number, number, number] = [
  WINDOW_POS[0] - 2.2, // off-axis left → the beam angles across the room
  WINDOW_POS[1] + 3.4, // high → late-morning rake down onto the floor
  -HZ - 4,             // well past the wall AND the photo plane
];

function Sunlight() {
  const light = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0.5, -HY, 3.5); // falls across the center floor, toward the front of the room
    return o;
  }, []);
  useFrame(({ clock }) => {
    if (light.current) light.current.intensity = SUN * (0.94 + 0.06 * Math.sin(clock.elapsedTime * 0.25));
  });
  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={light}
        position={SUN_POS}
        target={target}
        angle={0.7}     // just wide enough to cover the whole window opening from SUN_POS
        penumbra={0.5}
        distance={45}
        decay={0}
        intensity={SUN}
        color="#fff1cf"
        castShadow
        shadow-mapSize={[SUN_SHADOW_MAP, SUN_SHADOW_MAP]}
        shadow-radius={4}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-camera-near={3}
        shadow-camera-far={45}
      />
    </>
  );
}

/* ---------- one section marker: a framed piece on a wall ----------
   Each stop's marker is now a real framed object — its art (canvasArt.ts)
   carries the section label, which also brings the labels back without
   troika (whose CDN-font web workers were the context-loss suspect).
   The art plane glows gently when the stop is focused; the whole group
   pops ~6%. The frame hugs its wall (stop.look floats up to 0.4 off the
   wall for camera aim — the visual is placed flush so nothing floats). */
const MARKER_W = 1.8;
const MARKER_H = 1.15;
const MARKER_D = 0.08;
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
  const art = useMemo(() => makeArtTexture(MARKER_ART[stop.id]()), [stop.id]);

  // the marker visual sits flush against its wall; stop.look (the camera's
  // aim point) can stay slightly proud of it without anything floating
  const pos = useMemo<[number, number, number]>(() => {
    const p: [number, number, number] = [...stop.look];
    if (stop.wall === "left") p[0] = -HX + MARKER_D / 2 + 0.01;
    else if (stop.wall === "right") p[0] = HX - MARKER_D / 2 - 0.01;
    else p[2] = -HZ + MARKER_D / 2 + 0.01;
    return p;
  }, [stop]);

  // ease the focus highlight (emissive glow + a small pop) every frame
  useFrame(() => {
    const g = groupRef.current;
    const m = matRef.current;
    if (g) {
      const s = THREE.MathUtils.lerp(g.scale.x, active ? 1.06 : 1, 0.15);
      g.scale.setScalar(s);
    }
    if (m) {
      m.emissiveIntensity = THREE.MathUtils.lerp(m.emissiveIntensity, active ? 0.42 : 0.05, 0.12);
    }
  });

  const setCursor = (e: ThreeEvent<PointerEvent>, on: boolean) => {
    e.stopPropagation();
    document.body.style.cursor = on ? "pointer" : "";
  };

  return (
    <group
      ref={groupRef}
      position={pos}
      rotation={[0, WALL_ROT_Y[stop.wall], 0]}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      onPointerOver={(e) => setCursor(e, true)}
      onPointerOut={(e) => setCursor(e, false)}
    >
      {/* walnut frame — also the click target's body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[MARKER_W, MARKER_H, MARKER_D]} />
        <meshStandardMaterial color="#3a2c20" roughness={0.55} metalness={0.05} />
      </mesh>
      {/* the framed art (label painted in); glows softly when focused */}
      <mesh position={[0, 0, MARKER_D / 2 + 0.002]}>
        <planeGeometry args={[1.62, 0.99]} />
        <meshStandardMaterial
          ref={matRef}
          map={art}
          emissive="#ffffff"
          emissiveMap={art}
          emissiveIntensity={0.05}
          roughness={0.8}
          metalness={0}
        />
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
  targetFRef,
  curFRef,
  curZoomRef,
  inspectRef,
  onFocus,
}: {
  targetFRef: React.MutableRefObject<number>;
  curFRef: React.MutableRefObject<number>;
  curZoomRef: React.MutableRefObject<number>;
  inspectRef: React.MutableRefObject<number | null>;
  onFocus: (i: number) => void;
}) {
  const camera = useThree((s) => s.camera);
  const reduce = useRef(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const lastNearest = useRef(-1);
  const aim = useRef(new THREE.Vector3());
  const wasSettled = useRef(true); // start settled+expired so the view begins wide
  const arriveTime = useRef(0);
  const arcCur = useRef(0);

  useFrame((_, rawDt) => {
    const N = STOPS.length;
    // clamp dt so a long frame (tab refocus, GC pause) can't lurch the camera in one step
    const dt = Math.min(rawDt, 0.05);

    // Ease focus toward the target stop with frame-rate-independent exponential damping.
    // The old code stepped at a fixed per-frame rate and then SNAPPED the final fraction to
    // land — a tiny teleport on arrival, plus speed that varied with refresh rate. damp()
    // decelerates smoothly into the stop and behaves identically at 60Hz or 144Hz.
    if (reduce.current) curFRef.current = targetFRef.current;
    else curFRef.current = THREE.MathUtils.damp(curFRef.current, targetFRef.current, PAN_LAMBDA, dt);

    const f = Math.max(0, Math.min(N - 1, curFRef.current));
    const i0 = Math.floor(f);
    const i1 = Math.min(N - 1, i0 + 1);
    const t = f - i0;
    const A = STOPS[i0];
    const B = STOPS[i1];

    // Wide "overview" pose + look, lerped continuously between the two nearest stops.
    const bx = lerp(A.pos[0], B.pos[0], t);
    const by = lerp(A.pos[1], B.pos[1], t);
    const bz = lerp(A.pos[2], B.pos[2], t);
    const ax = lerp(A.look[0], B.look[0], t);
    const ay = lerp(A.look[1], B.look[1], t);
    const az = lerp(A.look[2], B.look[2], t);

    // Close-up pose, ALSO lerped continuously between the two nearest stops. The old code
    // read STOPS[Math.round(f)] here, which snapped to the next stop's close pose at the
    // midpoint — a visible jump whenever the settle-zoom was active across a transition.
    const cx = lerp(A.close[0], B.close[0], t);
    const cy = lerp(A.close[1], B.close[1], t);
    const cz = lerp(A.close[2], B.close[2], t);

    // Settle zoom: rest on the wide room, then pulse IN onto an item on arrival, hold briefly,
    // ease back out. Driven off arrival (settled), so it only zooms onto a real stop.
    const now = performance.now();
    const settled = Math.abs(targetFRef.current - curFRef.current) < 0.001;
    let arcTarget: number;
    if (settled) {
      if (!wasSettled.current) {
        wasSettled.current = true;
        arriveTime.current = now;
      }
      arcTarget = now - arriveTime.current < HOLD_MS ? 1 : 0; // hold in, then retreat
    } else {
      wasSettled.current = false;
      arcTarget = 0; // zoomed out while traveling
    }
    arcCur.current = THREE.MathUtils.damp(arcCur.current, arcTarget, ZOOM_LAMBDA, dt);
    const arc = reduce.current ? 0 : SETTLE_ZOOM * arcCur.current;

    // click-to-inspect eases the camera the rest of the way in to the close-up pose (0→1);
    // it wins over the pulse (max) so the two never fight.
    const wantZoom = inspectRef.current != null ? 1 : 0;
    if (reduce.current) curZoomRef.current = wantZoom;
    else curZoomRef.current = THREE.MathUtils.damp(curZoomRef.current, wantZoom, INSPECT_LAMBDA, dt);
    const zf = Math.max(curZoomRef.current, arc);

    // Everything below is continuous in f and zf, so there are no jumps anywhere in the pan.
    camera.position.set(lerp(bx, cx, zf), lerp(by, cy, zf), lerp(bz, cz, zf));
    aim.current.set(ax, ay, az); // close-up looks at the same point as the wide view
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
  targetFRef: React.MutableRefObject<number>;
  curFRef: React.MutableRefObject<number>;
  curZoomRef: React.MutableRefObject<number>;
  inspectRef: React.MutableRefObject<number | null>;
  focus: number;
  onFocus: (i: number) => void;
  onActivate: (i: number) => void;
  onProgress: (pct: number) => void; // loader progress 0–100 for the loading screen
  onReady: () => void; // fired once: assets loaded + shaders compiled + warm frames done
};

export default function RoomScene({
  targetFRef,
  curFRef,
  curZoomRef,
  inspectRef,
  focus,
  onFocus,
  onActivate,
  onProgress,
  onReady,
}: RoomSceneProps) {
  return (
    <Canvas
      shadows="percentage" // PCF shadow map; softness comes from each light's shadow-radius
                           // (three r184 deprecated PCFSoftShadowMap — "soft" just falls back)
      camera={{ position: STOPS[0].pos, fov: 60, near: 0.1, far: 100 }}
      dpr={1}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: EXPOSURE }}
      // DEV-ONLY: expose the renderer + scene so perf audits can read gl.info (draw
      // calls, triangles, textures) and count meshes from the console. Stripped from
      // production builds.
      onCreated={(state) => {
        if (process.env.NODE_ENV !== "production") {
          const w = window as Window & { __gl?: THREE.WebGLRenderer; __scene?: THREE.Scene };
          w.__gl = state.gl;
          w.__scene = state.scene;
        }
      }}
    >
      <color attach="background" args={["#241c12"]} />
      <fog attach="fog" args={["#241c12", 16, 40]} />

      {/* Two-source lighting, daytime edition (ADR-0012): warm sunlight beaming through the
         window is the key — now shadow-casting, shaped by the wall's window hole — with the
         fan's light kit as the warm shadow-casting overhead accent. The HDRI environment
         (same sky as the window view) gives the metals/glossies real reflections and a
         gentle image-based fill, so ambient/hemi are turned DOWN. Tune in a real browser. */}
      <LoadGate onProgress={onProgress} onReady={onReady} />
      <StaticShadows />
      <ambientLight intensity={AMBIENT} color="#fff3dd" />
      <hemisphereLight args={["#cfe2ff", "#6b5138", HEMI]} />
      <Suspense fallback={null}>
        <Environment files={ENV_URL} environmentIntensity={ENV_INTENSITY} />
      </Suspense>
      <Sunlight />

      {/* the ceiling fan IS a light fixture — its light kit pools warm light beneath it */}
      <CeilingFan />
      <Suspense fallback={null}>
        <Window />
      </Suspense>

      <Suspense fallback={null}>
        <Walls />
      </Suspense>
      <CrownMolding />
      <WallDecor />
      <Bookshelf />

      <Suspense fallback={null}>
        <Furniture />
        {/* floor-level life: a rubber fig softening the bare gap between the
           window and the PC tower, and the soccer ball resting by the bed's
           foot where it would actually get kicked off shoes */}
        <DecorModel url="/models/decor/rubber-fig.glb" targetH={2.3} position={[1.25, -HY, -7.9]} rotY={0.4} />
        <DecorModel url="/models/decor/soccer-ball.glb" targetH={0.42} position={[-3.1, -HY, 0.6]} rotY={1.1} />
        {/* one-frame contact-shadow bake at floor level: soft ambient-occlusion-style
           grounding under the furniture where the two key lights don't reach. Mounted
           in the SAME Suspense as Furniture so the single bake frame runs only after
           the models exist. far=2.5 keeps the capture near the floor (the spinning fan
           can't smear a blob into it). */}
        <ContactShadows
          position={[0, -HY + 0.01, 0]}
          scale={[HX * 2, HZ * 2]}
          far={2.5}
          blur={2.2}
          opacity={0.35}
          frames={1}
          resolution={512}
          color="#1a1208"
        />
      </Suspense>

      {STOPS.map((stop, i) => (
        <Marker key={stop.id} stop={stop} active={focus === i} onActivate={() => onActivate(i)} />
      ))}

      <Rig targetFRef={targetFRef} curFRef={curFRef} curZoomRef={curZoomRef} inspectRef={inspectRef} onFocus={onFocus} />

      {/* DEV-ONLY FPS/MS meter (top-left). Auto-excluded from the production build via the
          NODE_ENV guard; delete this line entirely for the final product. */}
      {process.env.NODE_ENV !== "production" && <Stats />}
    </Canvas>
  );
}
