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
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { STOPS, lerp, type Stop, type Wall } from "./roomStops";

/* room half-extents (world units): walls at x=±HX, floor/ceiling at y=∓HY,
   back wall at z=-HZ, opening toward +Z. Enlarged per live review so furniture
   has room to breathe (the marker look/close points in roomStops.ts track the
   new walls). */
const HX = 10;
const HY = 5;
const HZ = 9;

/* Camera "settle zoom": as you pan, the camera pulls back to the wide room view
   between stops, then dollies in toward the item you land on. SETTLE_ZOOM is how
   far in it dollies at rest (0 = stay wide, 1 = all the way to the inspect pose);
   SETTLE_FALLOFF is how close to a stop (in stop-units) the zoom kicks in. */
const SETTLE_ZOOM = 0.6;  // how far the camera zooms IN onto an item during its pulse
                          // (1 = all the way to the close-up; lower = a gentler peek)
const PAN_SPEED = 0.028;  // stops moved per frame — caps how fast the camera travels
                          // between items, so panning never rushes
const HOLD_MS = 1400;     // how long it dwells zoomed-in on an item before easing back
                          // out to the wide room
const ZOOM_EASE = 0.07;   // how gently the zoom pulses in/out (lower = smoother/slower)

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
   localhost is then a one-number edit. Kept inside the calm WebGL budget
   (ADR-0011): a few analytic lights, no shadows/env maps yet. */
const EXPOSURE = 0.98; // global brightness, rolled off by ACES tone mapping
const AMBIENT = 0.15;  // flat fill so nothing crushes to pure black
const HEMI = 0.64;     // sky/ground fill — even, clip-safe, does most of the work
const KEY = 0.7;       // directional "sun" — rakes the walls so the relief reads
const LAMP = 9;        // warm point light = the lamp glow (falls off 1/d²)

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
      {/* ceiling — same plaster as the walls, tinted a touch darker (COLOR.ceil) so
         it reads as a recessive painted ceiling rather than a flat void */}
      <mesh position={[0, HY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HX * 2, HZ * 2]} />
        <meshStandardMaterial {...m.ceil} color={COLOR.ceil} normalScale={[WALL_NORMAL, WALL_NORMAL]} roughness={1} metalness={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ---------- furniture (.glb) ----------
   It's a bedroom, in a clean modern (low-poly, CC0 Kenney) style — one cohesive
   kit so the bed, nightstand, dresser, lamp and rug all match. The glTF pipeline
   + WebGL context survival are already confirmed (ADR-0011), so it's safe to keep
   adding pieces.

   CornerModel auto-fits a model instead of hand-guessing scale/origin: it
   measures the loaded mesh's bounding box, scales it to a real-world `target`
   footprint (world units), drops its base onto the floor, and tucks it against
   two walls (a corner). That makes placement deterministic even though Kenney's
   native units/origins are unknown. `rotY` just spins which way it faces. */
const BED_URL = "/models/messy-bed/scene.gltf";  // CC-BY, thethieme — see CREDITS.md
const BED_TARGET = 8;   // longest footprint (incl. backboard + nightstands), world units
const BED_ROT_Y = 0;    // spin in 90° steps if the headboard faces the wrong wall

const DESK_URL = "/models/desk/scene.gltf"; // CC-BY, Superenforcer_xp — see CREDITS.md
const DESK_TARGET = 7;  // longest footprint of the L-desk, world units
const DESK_ROT_Y = -Math.PI / 2; // long arm of the L along the back wall, flipped to
                                 // face the room side correctly (270°)

/* fitCorner: the deterministic corner-placement math (shared by CornerModel and
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

function CornerModel({
  url,
  target,
  cornerX,
  cornerZ,
  margin = 0.6,
  rotY = 0,
}: {
  url: string;
  target: number;
  cornerX: 1 | -1; // -1 = left wall, +1 = right wall
  cornerZ: 1 | -1; // -1 = back wall, +1 = front (opening)
  margin?: number;
  rotY?: number;
}) {
  const { scene } = useGLTF(url);
  const node = useMemo(
    () => fitCorner(scene, target, cornerX, cornerZ, margin, rotY).object,
    [scene, target, cornerX, cornerZ, margin, rotY],
  );
  return <primitive object={node} />;
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
const PC_URL = "/models/gaming-pc/gaming-computer.glb"; // CC-BY, Alex Safayan — see CREDITS.md
const TOWER_HEIGHT = 2.2;  // case height in world units (~a mid-tower)
const TOWER_ROT_Y = Math.PI / 2; // quarter-turn so the PC's front faces the camera (room, +Z)
const TOWER_GAP = 1.5;     // how far the tower stands to the room-side of the desk
const TOWER_DEPTH = 0.32;  // 0→1 where along the desk's depth the tower stands

/* RGB lighting: the PC's fans/internals + the desk underglow slowly cycle through
   the rainbow. SPEED = hue turns per second (lower = calmer); GLOW = brightness. */
const RGB_SPEED = 0.05;
const RGB_GLOW = 0.85;

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
  const rgbMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const node = useMemo(() => {
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
    rgbMats.current = found;
    return o;
  }, [scene, targetH, x, z, rotY]);

  useFrame((state) => {
    const t = state.clock.elapsedTime * RGB_SPEED;
    const arr = rgbMats.current;
    for (let i = 0; i < arr.length; i++) {
      arr[i].emissive.setHSL((t + i / Math.max(1, arr.length)) % 1, 1, 0.5); // rainbow spread
    }
  });

  return <primitive object={node} />;
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

  // desk-side RGB surfaces + accent light, all cycled together each frame
  const keyGlow = useRef<THREE.MeshStandardMaterial>(null);
  const matGlow = useRef<THREE.MeshStandardMaterial>(null);
  const strip = useRef<THREE.MeshStandardMaterial>(null);
  const accent = useRef<THREE.PointLight>(null);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime * RGB_SPEED;
    if (matGlow.current) matGlow.current.emissive.copy(col.setHSL(t % 1, 1, 0.5));
    if (keyGlow.current) keyGlow.current.emissive.copy(col.setHSL((t + 0.33) % 1, 1, 0.5));
    if (strip.current) strip.current.emissive.copy(col.setHSL((t + 0.5) % 1, 1, 0.5));
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
          <meshStandardMaterial color={GAMING.matte} roughness={0.85} />
        </mesh>

        {/* monitor (faces +Z): flared base, slim neck, slightly tilted head whose
            screen is the drawn "on" texture (albedo + emissive) */}
        <group position={[0, 0, -0.3]}>
          <mesh position={[0, 0.02, 0.02]}>
            <cylinderGeometry args={[0.32, 0.42, 0.04, 36]} />
            <meshStandardMaterial color={GAMING.metal} roughness={0.35} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.42, -0.05]} rotation={[0.07, 0, 0]}>
            <boxGeometry args={[0.1, 0.82, 0.08]} />
            <meshStandardMaterial color={GAMING.metal} roughness={0.4} metalness={0.6} />
          </mesh>
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
              <meshStandardMaterial map={screenTex} emissive="#ffffff" emissiveMap={screenTex} emissiveIntensity={0.6} roughness={0.3} metalness={0} />
            </mesh>
            {/* brand dot on the chin */}
            <mesh position={[0, -0.63, 0.03]}>
              <boxGeometry args={[0.07, 0.025, 0.012]} />
              <meshStandardMaterial color={GAMING.metal} roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        </group>

        {/* keyboard over an RGB underglow strip */}
        <mesh position={[-0.18, 0.05, 0.42]}>
          <boxGeometry args={[1.65, 0.07, 0.46]} />
          <meshStandardMaterial color={GAMING.frame} roughness={0.7} />
        </mesh>
        <mesh position={[-0.18, 0.022, 0.42]}>
          <boxGeometry args={[1.72, 0.03, 0.5]} />
          <meshStandardMaterial ref={keyGlow} color={GAMING.matte} emissive={GAMING.rgbA} emissiveIntensity={1.1} roughness={0.5} />
        </mesh>

        {/* mouse */}
        <mesh position={[0.95, 0.05, 0.4]}>
          <boxGeometry args={[0.22, 0.08, 0.33]} />
          <meshStandardMaterial color={GAMING.frame} emissive={GAMING.rgbA} emissiveIntensity={0.4} roughness={0.5} />
        </mesh>

        {/* the monitor lighting the desk — one calm point light (ADR-0011 budget) */}
        {SCREEN_GLOW > 0 && (
          <pointLight position={[0, 1.0, 0.6]} intensity={SCREEN_GLOW} distance={6} decay={2} color={GAMING.screenGlow} />
        )}

        {/* RGB bias strip behind the monitor + a colored wall-wash light (both cycle) */}
        <mesh position={[0, 1.05, -0.46]}>
          <boxGeometry args={[2.1, 0.09, 0.04]} />
          <meshStandardMaterial ref={strip} color={GAMING.matte} emissive={GAMING.rgbA} emissiveIntensity={RGB_GLOW} roughness={0.5} />
        </mesh>
        <pointLight ref={accent} position={[0, 1.1, -0.55]} intensity={2.4} distance={6} decay={2} color={GAMING.rgbA} />
      </group>

      <GamingPC targetH={TOWER_HEIGHT} x={tx} z={tz} rotY={TOWER_ROT_Y} />
    </>
  );
}

function Furniture() {
  const { scene: deskScene } = useGLTF(DESK_URL);
  const desk = useMemo(
    () => fitCorner(deskScene, DESK_TARGET, 1, -1, 0.6, DESK_ROT_Y),
    [deskScene],
  );
  return (
    <>
      <CornerModel url={BED_URL} target={BED_TARGET} cornerX={-1} cornerZ={-1} rotY={BED_ROT_Y} />
      <primitive object={desk.object} />
      <GamingSetup deskBox={desk.box} />
    </>
  );
}
useGLTF.preload(BED_URL);
useGLTF.preload(DESK_URL);
useGLTF.preload(PC_URL);

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
  const wasSettled = useRef(true); // start settled+expired so the view begins wide
  const arriveTime = useRef(0);
  const arcCur = useRef(0);

  useFrame(() => {
    const N = STOPS.length;

    // ease focus 0→N-1
    if (reduce.current) curF.current = targetF.current;
    else {
      // constant-speed pan: step toward the target at one fixed rate (no easing,
      // no acceleration), so the camera glides evenly however hard you scroll and
      // never creeps at the tail. Snaps the final sub-step to land cleanly.
      const diff = targetF.current - curF.current;
      if (Math.abs(diff) <= PAN_SPEED) curF.current = targetF.current;
      else curF.current += Math.sign(diff) * PAN_SPEED;
    }
    const f = Math.max(0, Math.min(N - 1, curF.current));
    const i0 = Math.floor(f);
    const i1 = Math.min(N - 1, i0 + 1);
    const t = f - i0;
    const A = STOPS[i0];
    const B = STOPS[i1];

    // Overview pose between the two nearest stops — the wide, pulled-back view.
    const bx = lerp(A.pos[0], B.pos[0], t);
    const by = lerp(A.pos[1], B.pos[1], t);
    const bz = lerp(A.pos[2], B.pos[2], t);
    const ax = lerp(A.look[0], B.look[0], t);
    const ay = lerp(A.look[1], B.look[1], t);
    const az = lerp(A.look[2], B.look[2], t);

    // Zoom: REST on the wide room, then pulse IN onto each item as you arrive —
    // hold briefly, ease back out. Driven off arrival (settled on a stop), not raw
    // position, so the zoom-in always targets a real stop (no flip mid-transition).
    // While panning between stops it stays zoomed out; on load it begins wide.
    const now = performance.now();
    const settled = Math.abs(targetF.current - curF.current) < 0.001;
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
    arcCur.current += (arcTarget - arcCur.current) * ZOOM_EASE;
    const arc = reduce.current ? 0 : SETTLE_ZOOM * arcCur.current;

    // click-to-inspect eases the camera the rest of the way in to the nearest
    // stop's close-up pose (0→1); it wins over the pulse so the two never fight.
    const wantZoom = inspectRef.current != null ? 1 : 0;
    if (reduce.current) curZoom.current = wantZoom;
    else {
      curZoom.current += (wantZoom - curZoom.current) * 0.12;
      if (Math.abs(wantZoom - curZoom.current) < 0.0012) curZoom.current = wantZoom;
    }
    const zf = Math.max(curZoom.current, arc);
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
      camera={{ position: STOPS[0].pos, fov: 60, near: 0.1, far: 100 }}
      dpr={1}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: EXPOSURE }}
    >
      <color attach="background" args={["#15100b"]} />
      <fog attach="fog" args={["#15100b", 16, 40]} />

      {/* Warm evening light, kept deliberately calm. Confirmed overexposed-white in a
         real browser, so a soft hemisphere fill dominates (even, won't clip), a low
         directional adds gentle modeling, and a small warm point is the lamp glow.
         With ACES tone mapping (on the Canvas above) this should read as a warm room,
         not white. Tune against a real browser. */}
      <ambientLight intensity={AMBIENT} color="#ffe0bf" />
      <hemisphereLight args={["#ffdca6", "#2a1c10", HEMI]} />
      <directionalLight position={[2.5, 5, 3.5]} intensity={KEY} color="#ffcb8a" />
      <pointLight position={[1.5, 2.2, 1]} intensity={LAMP} distance={16} decay={2} color="#ffb066" />

      <Suspense fallback={null}>
        <Walls />
      </Suspense>

      <Suspense fallback={null}>
        <Furniture />
      </Suspense>

      {STOPS.map((stop, i) => (
        <Marker key={stop.id} stop={stop} active={focus === i} onActivate={() => onActivate(i)} />
      ))}

      <Rig targetF={targetF} curF={curF} curZoom={curZoom} inspectRef={inspectRef} onFocus={onFocus} />
    </Canvas>
  );
}
