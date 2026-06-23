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

export const STOPS: Stop[] = [
  // left wall — camera sits front-right and looks across the room at it
  { id: "about",       wall: "left",  pos: [ 2.6, 0.9, 6.4], look: [-7.6, 0.1, -1.2], close: [-3.6, 0.3, -1.2] },
  // back wall, swept left → right; camera slides toward center
  { id: "education",   wall: "back",  pos: [ 1.1, 0.9, 6.6], look: [-4.3, 0.2, -6.8], close: [-4.3, 0.4, -2.8] },
  { id: "experience",  wall: "back",  pos: [ 0.0, 0.9, 6.8], look: [-0.2, 0.2, -6.8], close: [-0.2, 0.4, -2.8] },
  { id: "skills",      wall: "back",  pos: [-1.1, 0.9, 6.6], look: [ 3.8, 0.2, -6.8], close: [ 3.6, 0.4, -2.8] },
  // right wall — camera sits front-left and looks across the room at it
  { id: "involvement", wall: "right", pos: [-2.6, 0.9, 6.4], look: [ 7.6, 0.1, -2.2], close: [ 3.6, 0.3, -2.2] },
  { id: "contact",     wall: "right", pos: [-2.6, 0.9, 5.8], look: [ 7.6, 0.1,  1.2], close: [ 3.6, 0.3,  1.2] },
];

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
