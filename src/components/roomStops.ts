/* =====================================================================
   roomStops.ts — the six camera stops for the 3D room (shared data).
   ---------------------------------------------------------------------
   One stop per section, in scroll order: About (left wall) → Education /
   Experience / Skills (back wall, left→right) → Involvement / Contact
   (right wall). Scrolling eases a scalar 0→5 across these.

   FRAMING (rebuilt to feel like the old CSS room): the camera sits PULLED
   BACK toward the front of the room (high z) and a touch above eye level,
   so the floor + ceiling + walls are all in frame — you peer INTO a room
   rather than at a flat wall. As you scroll, the camera slides gently
   left↔right and the aim sweeps across the room, so side walls are viewed
   from across the room (not edge-on). Clicking a marker dollies the camera
   in to its `close` pose to read it square-on.

   Each stop carries:
     id    — matches a station id in src/content/site.ts (label + content)
     wall  — which surface the marker sits on (sets the marker's facing)
     pos   — camera position when this stop is focused        [x, y, z]
     look  — point the camera aims at = the marker's position  [x, y, z]
     close — camera position when "inspecting" (dollied in)    [x, y, z]

   World units: the room spans x[-8, 8], y[-4.5, 4.5], z[-7, 7]; +Y is up;
   the opening faces +Z and the camera sits in the front half looking in.
   First pass — tune against the live browser (framing is a matter of eye).
   ===================================================================== */

export type Wall = "back" | "left" | "right";

export type Stop = {
  id: string;
  wall: Wall;
  pos: [number, number, number];
  look: [number, number, number];
  close: [number, number, number];
};

/* Tuned for the enlarged room (HX=10, HY=5, HZ=9 in RoomScene).
   - pos   = the WIDE overview pose: pulled back out past the room opening and
             raised, so between stops you see the whole room. The camera rig
             then "settle-zooms" from here toward `close` as you land on a stop.
   - look  = the marker, sitting ~0.2–0.4 off its wall.
   - close = the dolly-in / inspect pose (also the settle-zoom target).
   All eyeball first-pass for the new size — tune against the live browser. */
export const STOPS: Stop[] = [
  // left wall — camera sits front-right and looks across the room at it
  { id: "about",       wall: "left",  pos: [ 3.0, 2.2, 11.5], look: [-9.6, 0.1, -1.5], close: [-5.0, 0.3, -1.5] },
  // back wall, swept left → right; camera slides toward center
  { id: "education",   wall: "back",  pos: [ 1.6, 2.2, 11.8], look: [-5.4, 0.2, -8.8], close: [-5.4, 0.5, -3.8] },
  { id: "experience",  wall: "back",  pos: [-0.8, 2.2, 11.9], look: [ 2.4, 0.2, -8.8], close: [ 2.4, 0.5, -3.8] },
  { id: "skills",      wall: "back",  pos: [-1.6, 2.2, 11.8], look: [ 4.8, 0.2, -8.8], close: [ 4.8, 0.5, -3.8] },
  // right wall — camera sits front-left and looks across the room at it
  { id: "involvement", wall: "right", pos: [-3.0, 2.2, 11.5], look: [ 9.6, 0.1, -2.8], close: [ 5.0, 0.3, -2.8] },
  { id: "contact",     wall: "right", pos: [-3.0, 2.2, 10.8], look: [ 9.6, 0.1,  1.5], close: [ 5.0, 0.3,  1.5] },
];

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
