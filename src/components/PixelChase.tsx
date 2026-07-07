"use client";

/* =====================================================================
   PixelChase.tsx — the loading "bar": an 8-bit Spinosaurus chasing a
   dodo along the progress hairline (LoadingScreen.tsx).
   ---------------------------------------------------------------------
   The Spino's position IS the loading progress; the dodo stays ahead on
   a gap that shrinks as loading completes, so the catch lands exactly
   at 100% ("Step inside." = dinner time). Sprites are hand-drawn pixel
   maps rendered as SVG rects (crispEdges) — SSR-safe, no canvas — drawn
   from the pixel-art references in Private Random Stuff/References
   (Spinosaurus.png / Dodo.png), mirrored to face right. Two frames per
   runner give the classic gait (CSS-toggled, no JS timer); positions
   update from the loader's eased progress each frame, so no CSS
   transition is needed.
   ===================================================================== */

import { useMemo } from "react";

/* ---- sprite pixel maps ----
   One char per pixel; '.' = transparent, letters index into the sprite's
   palette. Frame A/B = the two run poses (legs apart / legs passing). */

/* Spinosaurus (after References/Spinosaurus.png): olive body with a dark
   green-grey back, rust sail with darker ribs, cream belly, long croc snout
   with the jaw OPEN (it is chasing dinner), quadruped gait. 36×18. */
const SPINO_A = [
  "............ssss....................",
  "..........srssrssrs.................",
  ".........ssrssrssrss................",
  "........sssrssrssrsss......eeee.....",
  ".......ssssrssrssrssss....eeoeeee...",
  ".......sssssssssssssssseeeeeeeeeeeee",
  "....eeeeeeeeeeeeeeeeeeeee.ctctctctct",
  "...gggegggegggegggegggggggc.........",
  ".ggggggggggggggggggggggg..tccc......",
  "ggg.gggggggggcccccccccg.....cccc....",
  ".....ggggggggccccccccg..............",
  "........ggggggg....gggg.............",
  "........gggggg.....ggg..............",
  ".......ggg..........gg..............",
  "......ggg...........ggg.............",
  "......gg.............ggg............",
  ".....ggg..............gg............",
  ".....gggt.............ggt...........",
];

const SPINO_B = [
  "............ssss....................",
  "..........srssrssrs.................",
  ".........ssrssrssrss................",
  "........sssrssrssrsss......eeee.....",
  ".......ssssrssrssrssss....eeoeeee...",
  ".......sssssssssssssssseeeeeeeeeeeee",
  "....eeeeeeeeeeeeeeeeeeeee.ctctctctct",
  "...gggegggegggegggegggggggc.........",
  ".ggggggggggggggggggggggg..tccc......",
  "ggg.gggggggggcccccccccg.....cccc....",
  ".....ggggggggccccccccg..............",
  "........ggggggg....gggg.............",
  "........gggggg.....ggg..............",
  "..........ggg......gg...............",
  "...........ggg....gg................",
  "............gg....g.................",
  "............ggg..gg.................",
  "............ggt..ggt................",
];

/* Dodo (after References/Dodo.png): plump slate-grey body with a darker
   folded wing, tan neck/breast and tail plume, big dark hooked beak, wide
   worried eye, orange legs — history's least escapable prey. 26×16. */
const DODO_A = [
  "...............ccccc......",
  "..............cccekddddd..",
  "..............cccccdddddd.",
  ".ccc..........cccc....ddd.",
  "ccc.bbbbbbbbbbccc......dd.",
  "ccccbbbbbbbbbbccc.........",
  ".cccbbbbbbbbbbbbc.........",
  "..bbbbnnnnnnnbccc.........",
  "..bbccnnnnnnnbccc.........",
  "..bbccnnnnnnnbbbc.........",
  "...bbbnnnnnnbbbb..........",
  "....bbbbbbbbbbb...........",
  ".....bbbbbbbbb............",
  "......oo...oo.............",
  ".....oo.....oo............",
  "....ook.....ook...........",
];

const DODO_B = [
  "...............ccccc......",
  "..............cccekddddd..",
  "..............cccccdddddd.",
  ".ccc..........cccc....ddd.",
  "ccc.bbbbbbbbbbccc......dd.",
  "ccccbbbbbbbbbbccc.........",
  ".cccbbbbbbbbbbbbc.........",
  "..bbbbnnnnnnnbccc.........",
  "..bbccnnnnnnnbccc.........",
  "..bbccnnnnnnnbbbc.........",
  "...bbbnnnnnnbbbb..........",
  "....bbbbbbbbbbb...........",
  ".....bbbbbbbbb............",
  "........oo.oo.............",
  "..........oo..............",
  "..........ook.............",
];

/* palettes lifted from the reference art, warmed a touch for the curtain */
const SPINO_COLORS: Record<string, string> = {
  g: "#7a8560", // olive body
  e: "#454f3b", // dark green-grey back, head and snout top
  s: "#9c5b30", // rust sail
  r: "#66351c", // darker sail ribs
  c: "#d8c193", // cream belly + lower jaw
  t: "#efe6d1", // teeth and claws
  o: "#e08a2d", // orange eye
};
const DODO_COLORS: Record<string, string> = {
  b: "#707a89", // slate-grey body
  n: "#575e6b", // darker folded wing
  c: "#d3b98b", // tan head, neck, breast, plume
  d: "#3a3d45", // dark hooked beak
  e: "#f2efe6", // wide white eye
  k: "#191a1e", // pupil + claws
  o: "#cd8a3f", // orange legs
};

/* merge each row into horizontal runs so a sprite is ~50 rects, not ~400 */
type Run = { x: number; y: number; w: number; fill: string };
function spriteRuns(map: string[], palette: Record<string, string>): Run[] {
  const runs: Run[] = [];
  map.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const fill = palette[row[x]];
      if (!fill) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === row[x]) w++;
      runs.push({ x, y, w, fill });
      x += w;
    }
  });
  return runs;
}

function PixelSprite({
  frameA,
  frameB,
  palette,
  scale,
}: {
  frameA: string[];
  frameB: string[];
  palette: Record<string, string>;
  scale: number;
}) {
  const a = useMemo(() => spriteRuns(frameA, palette), [frameA, palette]);
  const b = useMemo(() => spriteRuns(frameB, palette), [frameB, palette]);
  const cols = frameA[0].length;
  const rows = frameA.length;
  return (
    <svg
      width={cols * scale}
      height={rows * scale}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <g className="ld-fA">
        {a.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
        ))}
      </g>
      <g className="ld-fB">
        {b.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
        ))}
      </g>
    </svg>
  );
}

export type PixelChaseProps = {
  progress: number; // eased 0–100 from the loading screen
  caught: boolean;  // ready → the Spino has caught dinner; freeze the gait
};

export default function PixelChase({ progress, caught }: PixelChaseProps) {
  const p = Math.min(100, Math.max(0, progress));
  // the chase math: Spino's nose = progress; the gap closes as loading completes,
  // so at 100% the snout lands on the dodo's tail plume. Tuned for the 420px
  // track (.ld-progress) against the 72px spino / 52px dodo sprites: the clear
  // gap shrinks ~29px → −5px (snout into the plume) across the run.
  const spinoLeft = p * 0.6;                    // % across the track
  const gap = 24 - p * 0.08;                    // 24% head start → 16% (≈ 5px bite)
  const dodoLeft = Math.min(spinoLeft + gap, 86);
  return (
    <div className={"ld-chase" + (caught ? " ld-caught" : "")} aria-hidden="true">
      <div className="ld-dino ld-dodo" style={{ left: `${dodoLeft}%` }}>
        <PixelSprite frameA={DODO_A} frameB={DODO_B} palette={DODO_COLORS} scale={2} />
      </div>
      <div className="ld-dino ld-spino" style={{ left: `${spinoLeft}%` }}>
        <PixelSprite frameA={SPINO_A} frameB={SPINO_B} palette={SPINO_COLORS} scale={2} />
      </div>
    </div>
  );
}
