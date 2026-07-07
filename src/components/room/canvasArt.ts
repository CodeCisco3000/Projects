/* =====================================================================
   canvasArt.ts — procedural 2D art painted once to canvases.
   ---------------------------------------------------------------------
   Every poster, print, framed piece and section placard in the room gets
   its art from here: original vector-style drawings (no downloaded or
   copyrighted images), painted at load time and uploaded as textures.
   Painters are plain functions returning an HTMLCanvasElement; components
   wrap them in makeArtTexture() inside a useMemo so each is built once.
   Client-only (document) — callers all live under the ssr:false canvas.
   ===================================================================== */

import * as THREE from "three";

export function makeArtTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, x: c.getContext("2d")! };
}

/* paper speckle + soft vignette — the "this is a printed thing" finisher
   that keeps flat fills from reading computer-generated */
function finish(x: CanvasRenderingContext2D, w: number, h: number, grain = 0.05) {
  for (let i = 0; i < (w * h) / 900; i++) {
    x.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * grain})`;
    x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
  }
  const vg = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.16)");
  x.fillStyle = vg;
  x.fillRect(0, 0, w, h);
}

function letterSpaced(
  x: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number,
) {
  const widths = [...text].map((ch) => x.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let px = cx - total / 2;
  [...text].forEach((ch, i) => {
    x.fillText(ch, px + widths[i] / 2, y);
    px += widths[i] + spacing;
  });
}

/* ---------- section placards (the six interactive markers) ----------
   Each stop's placard is a real framed object now: the art carries the
   section's label, so the wall reads as decor and the tour stays legible. */

const PLACARD_W = 640;
const PLACARD_H = 408;

/* about — a warm studio nameplate: monogram, name, trade */
function aboutArt() {
  const { c, x } = canvas(PLACARD_W, PLACARD_H);
  const g = x.createLinearGradient(0, 0, 0, PLACARD_H);
  g.addColorStop(0, "#f3ead9");
  g.addColorStop(1, "#e5d8c0");
  x.fillStyle = g;
  x.fillRect(0, 0, PLACARD_W, PLACARD_H);
  // twin rule border
  x.strokeStyle = "#8c6f4a";
  x.lineWidth = 3;
  x.strokeRect(22, 22, PLACARD_W - 44, PLACARD_H - 44);
  x.lineWidth = 1;
  x.strokeRect(32, 32, PLACARD_W - 64, PLACARD_H - 64);
  // monogram coin
  x.fillStyle = "#2e2a24";
  x.beginPath();
  x.arc(PLACARD_W / 2, 132, 62, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = "#c9a36a";
  x.lineWidth = 3;
  x.beginPath();
  x.arc(PLACARD_W / 2, 132, 54, 0, Math.PI * 2);
  x.stroke();
  x.fillStyle = "#e9d9b8";
  x.font = "bold 52px Georgia, serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("FC", PLACARD_W / 2, 134);
  // name + trade
  x.fillStyle = "#33291c";
  x.font = "bold 44px Georgia, serif";
  x.fillText("Francisco Cardenas", PLACARD_W / 2, 244);
  x.fillStyle = "#7a6647";
  x.font = "600 20px system-ui, sans-serif";
  letterSpaced(x, "CIVIL ENGINEERING · CONSTRUCTION", PLACARD_W / 2, 296, 3);
  x.fillStyle = "#a3213b";
  x.font = "bold 22px system-ui, sans-serif";
  letterSpaced(x, "ABOUT", PLACARD_W / 2, 352, 10);
  finish(x, PLACARD_W, PLACARD_H, 0.04);
  return c;
}

/* education — a parchment diploma with seal + ribbon */
function educationArt() {
  const { c, x } = canvas(PLACARD_W, PLACARD_H);
  const g = x.createLinearGradient(0, 0, PLACARD_W, PLACARD_H);
  g.addColorStop(0, "#f5eeda");
  g.addColorStop(1, "#e8dcbc");
  x.fillStyle = g;
  x.fillRect(0, 0, PLACARD_W, PLACARD_H);
  x.strokeStyle = "#9c8657";
  x.lineWidth = 4;
  x.strokeRect(18, 18, PLACARD_W - 36, PLACARD_H - 36);
  // laurel-ish flourishes
  x.strokeStyle = "#b39d6b";
  x.lineWidth = 2;
  for (const s of [-1, 1]) {
    x.beginPath();
    x.moveTo(PLACARD_W / 2 + s * 70, 74);
    x.quadraticCurveTo(PLACARD_W / 2 + s * 150, 60, PLACARD_W / 2 + s * 190, 84);
    x.stroke();
  }
  x.fillStyle = "#2f2817";
  x.font = "bold 30px Georgia, serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("Bachelor of Science", PLACARD_W / 2, 120);
  x.font = "italic 24px Georgia, serif";
  x.fillStyle = "#584a2e";
  x.fillText("Civil Engineering", PLACARD_W / 2, 162);
  // script lines (the unreadable diploma body)
  x.strokeStyle = "rgba(70,58,32,0.5)";
  x.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const y = 205 + i * 22;
    const wl = 300 - i * 60;
    x.beginPath();
    x.moveTo(PLACARD_W / 2 - wl / 2, y);
    x.lineTo(PLACARD_W / 2 + wl / 2, y);
    x.stroke();
  }
  // gold seal + red ribbon tails
  x.fillStyle = "#a3213b";
  x.beginPath();
  x.moveTo(120, 300); x.lineTo(104, 372); x.lineTo(126, 356); x.lineTo(146, 372); x.lineTo(138, 300);
  x.closePath();
  x.fill();
  const seal = x.createRadialGradient(128, 292, 4, 128, 292, 34);
  seal.addColorStop(0, "#e9c877");
  seal.addColorStop(1, "#b98f3e");
  x.fillStyle = seal;
  x.beginPath();
  x.arc(128, 292, 34, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = "#8a6a2a";
  x.lineWidth = 2;
  x.setLineDash([4, 3]);
  x.beginPath();
  x.arc(128, 292, 26, 0, Math.PI * 2);
  x.stroke();
  x.setLineDash([]);
  x.fillStyle = "#a3213b";
  x.font = "bold 22px system-ui, sans-serif";
  letterSpaced(x, "EDUCATION", PLACARD_W / 2 + 40, 330, 8);
  finish(x, PLACARD_W, PLACARD_H, 0.04);
  return c;
}

/* experience — a blueprint sheet: grid, truss bridge elevation, title block */
function experienceArt() {
  const { c, x } = canvas(PLACARD_W, PLACARD_H);
  x.fillStyle = "#12386b";
  x.fillRect(0, 0, PLACARD_W, PLACARD_H);
  // drafting grid
  x.strokeStyle = "rgba(190,215,240,0.14)";
  x.lineWidth = 1;
  for (let i = 0; i < PLACARD_W; i += 24) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, PLACARD_H); x.stroke();
  }
  for (let i = 0; i < PLACARD_H; i += 24) {
    x.beginPath(); x.moveTo(0, i); x.lineTo(PLACARD_W, i); x.stroke();
  }
  x.strokeStyle = "rgba(220,236,250,0.9)";
  x.lineWidth = 3;
  x.strokeRect(16, 16, PLACARD_W - 32, PLACARD_H - 32);
  // truss bridge elevation: deck, piers, triangulated top chord
  const y0 = 210, x0 = 70, x1 = PLACARD_W - 70, seg = (x1 - x0) / 6;
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(x0, y0); x.lineTo(x1, y0);                       // deck
  for (let i = 0; i < 6; i++) {                             // triangulation
    const a = x0 + i * seg, b = a + seg;
    x.moveTo(a, y0); x.lineTo(a + seg / 2, y0 - 64); x.lineTo(b, y0);
  }
  x.moveTo(x0 + seg / 2, y0 - 64); x.lineTo(x1 - seg / 2, y0 - 64); // top chord
  x.stroke();
  // piers + water line
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(x0 + seg, y0); x.lineTo(x0 + seg, y0 + 58);
  x.moveTo(x1 - seg, y0); x.lineTo(x1 - seg, y0 + 58);
  x.stroke();
  x.strokeStyle = "rgba(190,215,240,0.5)";
  x.lineWidth = 2;
  x.beginPath();
  for (let i = x0 - 20; i < x1 + 20; i += 26) {
    x.moveTo(i, y0 + 66); x.quadraticCurveTo(i + 8, y0 + 60, i + 16, y0 + 66);
  }
  x.stroke();
  // dimension arrows over one span
  x.strokeStyle = "rgba(255,220,150,0.85)";
  x.fillStyle = "rgba(255,220,150,0.85)";
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(x0, y0 - 92); x.lineTo(x0 + 2 * seg, y0 - 92);
  x.stroke();
  x.font = "14px monospace";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("24.0 m", x0 + seg, y0 - 104);
  // title block
  x.strokeStyle = "rgba(220,236,250,0.9)";
  x.lineWidth = 2;
  x.strokeRect(PLACARD_W - 250, PLACARD_H - 92, 234, 76);
  x.fillStyle = "rgba(220,236,250,0.95)";
  x.font = "bold 17px monospace";
  x.textAlign = "left";
  x.fillText("SHEET S-102", PLACARD_W - 238, PLACARD_H - 70);
  x.font = "13px monospace";
  x.fillText("TRUSS ELEVATION  1:200", PLACARD_W - 238, PLACARD_H - 48);
  x.fillText("DRAWN: F.CARDENAS", PLACARD_W - 238, PLACARD_H - 30);
  x.fillStyle = "#ffd479";
  x.font = "bold 22px system-ui, sans-serif";
  x.textAlign = "center";
  letterSpaced(x, "EXPERIENCE", 150, PLACARD_H - 54, 6);
  finish(x, PLACARD_W, PLACARD_H, 0.03);
  return c;
}

/* skills — a kraft-paper toolboard: sketched trade icons in a grid */
function skillsArt() {
  const { c, x } = canvas(PLACARD_W, PLACARD_H);
  const g = x.createLinearGradient(0, 0, 0, PLACARD_H);
  g.addColorStop(0, "#c8a877");
  g.addColorStop(1, "#b2905c");
  x.fillStyle = g;
  x.fillRect(0, 0, PLACARD_W, PLACARD_H);
  x.strokeStyle = "#5f4526";
  x.lineWidth = 3;
  x.strokeRect(20, 20, PLACARD_W - 40, PLACARD_H - 40);
  x.strokeStyle = "#4a3418";
  x.fillStyle = "#4a3418";
  x.lineWidth = 5;
  x.lineCap = "round";
  x.lineJoin = "round";
  const cells: [number, number][] = [
    [128, 120], [320, 120], [512, 120], [128, 268], [320, 268], [512, 268],
  ];
  // 1) hard hat
  let [cx, cy] = cells[0];
  x.beginPath();
  x.arc(cx, cy, 42, Math.PI, 0);
  x.lineTo(cx + 58, cy); x.lineTo(cx - 58, cy);
  x.closePath();
  x.stroke();
  x.beginPath(); x.moveTo(cx, cy - 42); x.lineTo(cx, cy - 14); x.stroke();
  // 2) T-square + triangle
  [cx, cy] = cells[1];
  x.beginPath();
  x.moveTo(cx - 52, cy - 40); x.lineTo(cx + 52, cy - 40);
  x.moveTo(cx, cy - 40); x.lineTo(cx, cy + 46);
  x.stroke();
  x.beginPath();
  x.moveTo(cx - 44, cy + 46); x.lineTo(cx + 30, cy + 46); x.lineTo(cx - 44, cy - 10);
  x.closePath();
  x.stroke();
  // 3) gear
  [cx, cy] = cells[2];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    x.beginPath();
    x.moveTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34);
    x.lineTo(cx + Math.cos(a) * 50, cy + Math.sin(a) * 50);
    x.stroke();
  }
  x.beginPath(); x.arc(cx, cy, 34, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(cx, cy, 14, 0, Math.PI * 2); x.stroke();
  // 4) spirit level
  [cx, cy] = cells[3];
  x.strokeRect(cx - 56, cy - 16, 112, 32);
  x.beginPath(); x.arc(cx, cy, 10, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(cx - 4, cy - 16); x.lineTo(cx - 4, cy + 16); x.moveTo(cx + 4, cy - 16); x.lineTo(cx + 4, cy + 16); x.stroke();
  // 5) calipers
  [cx, cy] = cells[4];
  x.beginPath();
  x.arc(cx, cy - 30, 12, 0, Math.PI * 2);
  x.moveTo(cx - 8, cy - 20); x.lineTo(cx - 34, cy + 46);
  x.moveTo(cx + 8, cy - 20); x.lineTo(cx + 34, cy + 46);
  x.stroke();
  x.beginPath(); x.moveTo(cx - 26, cy + 26); x.quadraticCurveTo(cx, cy + 38, cx + 26, cy + 26); x.stroke();
  // 6) laptop with code
  [cx, cy] = cells[5];
  x.strokeRect(cx - 44, cy - 34, 88, 56);
  x.beginPath();
  x.moveTo(cx - 56, cy + 34); x.lineTo(cx + 56, cy + 34); x.lineTo(cx + 44, cy + 22); x.lineTo(cx - 44, cy + 22);
  x.closePath();
  x.stroke();
  x.font = "bold 20px monospace";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("</>", cx, cy - 6);
  x.fillStyle = "#3d2c12";
  x.font = "bold 22px system-ui, sans-serif";
  letterSpaced(x, "SKILLS", PLACARD_W / 2, PLACARD_H - 44, 10);
  finish(x, PLACARD_W, PLACARD_H, 0.05);
  return c;
}

/* involvement — a corkboard: pinned notes, a polaroid, red string */
function involvementArt() {
  const { c, x } = canvas(PLACARD_W, PLACARD_H);
  // cork base
  x.fillStyle = "#b98d5e";
  x.fillRect(0, 0, PLACARD_W, PLACARD_H);
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = `rgba(${90 + Math.random() * 60},${58 + Math.random() * 40},${25 + Math.random() * 25},${0.12 + Math.random() * 0.2})`;
    x.beginPath();
    x.arc(Math.random() * PLACARD_W, Math.random() * PLACARD_H, 1 + Math.random() * 2.4, 0, Math.PI * 2);
    x.fill();
  }
  const pin = (px: number, py: number, col: string) => {
    x.fillStyle = "rgba(0,0,0,0.25)";
    x.beginPath(); x.arc(px + 2, py + 3, 7, 0, Math.PI * 2); x.fill();
    x.fillStyle = col;
    x.beginPath(); x.arc(px, py, 7, 0, Math.PI * 2); x.fill();
    x.fillStyle = "rgba(255,255,255,0.5)";
    x.beginPath(); x.arc(px - 2, py - 2, 2.4, 0, Math.PI * 2); x.fill();
  };
  const note = (nx: number, ny: number, w: number, h: number, rot: number, col: string, lines: string[]) => {
    x.save();
    x.translate(nx, ny);
    x.rotate(rot);
    x.fillStyle = "rgba(0,0,0,0.22)";
    x.fillRect(-w / 2 + 4, -h / 2 + 6, w, h);
    x.fillStyle = col;
    x.fillRect(-w / 2, -h / 2, w, h);
    x.fillStyle = "#40372a";
    x.font = "600 15px 'Segoe Print', 'Comic Sans MS', cursive";
    x.textAlign = "left";
    x.textBaseline = "top";
    lines.forEach((l, i) => x.fillText(l, -w / 2 + 12, -h / 2 + 14 + i * 21));
    x.restore();
  };
  note(150, 128, 180, 130, -0.06, "#f7f0d8", ["Volunteer build", "Sat 8am — site 3", "bring gloves!"]);
  note(346, 110, 158, 96, 0.05, "#ffd9e2", ["Team dinner", "Thu 7pm"]);
  note(492, 232, 168, 118, -0.04, "#d8ecc8", ["Mentor mtg", "Tue 5:30", "rm 204"]);
  // polaroid: group-photo placeholder (sun + hills, like a trip photo)
  x.save();
  x.translate(206, 288);
  x.rotate(0.07);
  x.fillStyle = "rgba(0,0,0,0.25)";
  x.fillRect(-70 + 5, -84 + 7, 140, 168);
  x.fillStyle = "#f5f2ea";
  x.fillRect(-70, -84, 140, 168);
  const ph = x.createLinearGradient(0, -70, 0, 50);
  ph.addColorStop(0, "#8ec3e8");
  ph.addColorStop(1, "#5f8f56");
  x.fillStyle = ph;
  x.fillRect(-58, -72, 116, 118);
  x.fillStyle = "#f6d67c";
  x.beginPath(); x.arc(26, -38, 16, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#4a6e42";
  x.beginPath();
  x.moveTo(-58, 46); x.quadraticCurveTo(-20, 6, 12, 34); x.quadraticCurveTo(38, 50, 58, 30);
  x.lineTo(58, 46); x.closePath();
  x.fill();
  x.fillStyle = "#6b6252";
  x.font = "600 16px 'Segoe Print', 'Comic Sans MS', cursive";
  x.textAlign = "center";
  x.fillText("build day!", 0, 62);
  x.restore();
  // red string connecting pins
  x.strokeStyle = "#b23a48";
  x.lineWidth = 2.5;
  x.beginPath();
  x.moveTo(150, 70);
  x.quadraticCurveTo(260, 150, 346, 66);
  x.quadraticCurveTo(430, 140, 492, 178);
  x.stroke();
  pin(150, 70, "#d8434e");
  pin(346, 66, "#3f7fd1");
  pin(492, 178, "#e0a23c");
  pin(206, 210, "#4aa457");
  x.fillStyle = "#fff6e6";
  x.strokeStyle = "rgba(0,0,0,0.3)";
  x.font = "bold 22px system-ui, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.save();
  x.translate(PLACARD_W / 2, PLACARD_H - 34);
  x.fillStyle = "#5b3f1f";
  letterSpaced(x, "INVOLVEMENT", 0, 0, 6);
  x.restore();
  finish(x, PLACARD_W, PLACARD_H, 0.03);
  return c;
}

/* contact — a navy mail-wall: big @, stamps, SAY HELLO */
function contactArt() {
  const { c, x } = canvas(PLACARD_W, PLACARD_H);
  const g = x.createLinearGradient(0, 0, PLACARD_W, PLACARD_H);
  g.addColorStop(0, "#1c2a44");
  g.addColorStop(1, "#101a30");
  x.fillStyle = g;
  x.fillRect(0, 0, PLACARD_W, PLACARD_H);
  x.strokeStyle = "#c9a36a";
  x.lineWidth = 3;
  x.strokeRect(18, 18, PLACARD_W - 36, PLACARD_H - 36);
  // airmail chevron border
  for (let i = 30; i < PLACARD_W - 30; i += 34) {
    x.fillStyle = i % 68 < 34 ? "#a3213b" : "#e8e2d2";
    x.beginPath();
    x.moveTo(i, 30); x.lineTo(i + 17, 38); x.lineTo(i + 34, 30);
    x.closePath();
    x.fill();
  }
  // big @
  x.fillStyle = "#e7912f";
  x.font = "bold 150px Georgia, serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("@", 190, 210);
  // postage stamp
  x.save();
  x.translate(450, 150);
  x.rotate(0.06);
  x.fillStyle = "#e8e2d2";
  x.fillRect(-62, -76, 124, 152);
  x.strokeStyle = "#1c2a44";
  x.lineWidth = 2;
  x.setLineDash([2, 6]);
  x.strokeRect(-54, -68, 108, 136);
  x.setLineDash([]);
  const st = x.createLinearGradient(0, -60, 0, 50);
  st.addColorStop(0, "#8ec3e8");
  st.addColorStop(1, "#c98d4e");
  x.fillStyle = st;
  x.fillRect(-46, -60, 92, 104);
  x.fillStyle = "#3a5a80";
  x.beginPath();
  x.moveTo(-46, 44); x.lineTo(-14, -6); x.lineTo(10, 24); x.lineTo(28, 2); x.lineTo(46, 44);
  x.closePath();
  x.fill();
  x.fillStyle = "#1c2a44";
  x.font = "bold 15px Georgia, serif";
  x.fillText("PAR AVION", 0, 62);
  x.restore();
  // postmark rings over the stamp corner
  x.strokeStyle = "rgba(232,226,210,0.6)";
  x.lineWidth = 2;
  x.beginPath(); x.arc(360, 240, 34, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(360, 240, 26, 0, Math.PI * 2); x.stroke();
  x.fillStyle = "#e8e2d2";
  x.font = "bold 30px Georgia, serif";
  x.fillText("Say hello", PLACARD_W / 2, 322);
  x.fillStyle = "#c9a36a";
  x.font = "bold 22px system-ui, sans-serif";
  letterSpaced(x, "CONTACT", PLACARD_W / 2, 362, 8);
  finish(x, PLACARD_W, PLACARD_H, 0.04);
  return c;
}

export const MARKER_ART: Record<string, () => HTMLCanvasElement> = {
  about: aboutArt,
  education: educationArt,
  experience: experienceArt,
  skills: skillsArt,
  involvement: involvementArt,
  contact: contactArt,
};

/* ---------- wall personality pieces ---------- */

/* framed soccer jersey — a shadowbox: charcoal felt, red kit, CARDENAS 10 */
export function jerseyArt() {
  const W = 768, H = 920;
  const { c, x } = canvas(W, H);
  const bg = x.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H / 2, H * 0.7);
  bg.addColorStop(0, "#31353c");
  bg.addColorStop(1, "#1f2226");
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  // jersey silhouette
  const cx = W / 2;
  x.save();
  x.shadowColor = "rgba(0,0,0,0.5)";
  x.shadowBlur = 26;
  x.shadowOffsetY = 14;
  x.beginPath();
  x.moveTo(cx - 95, 120);              // left collar top
  x.quadraticCurveTo(cx, 170, cx + 95, 120);   // collar dip
  x.lineTo(cx + 205, 190);             // right shoulder
  x.lineTo(cx + 268, 360);             // right sleeve end
  x.lineTo(cx + 150, 408);             // right armpit
  x.lineTo(cx + 158, 790);             // right hem
  x.quadraticCurveTo(cx, 820, cx - 158, 790);  // hem curve
  x.lineTo(cx - 150, 408);             // left armpit
  x.lineTo(cx - 268, 360);             // left sleeve end
  x.lineTo(cx - 205, 190);             // left shoulder
  x.closePath();
  const kit = x.createLinearGradient(0, 100, 0, 820);
  kit.addColorStop(0, "#c22c3f");
  kit.addColorStop(1, "#951c2e");
  x.fillStyle = kit;
  x.fill();
  x.restore();
  // sleeve cuffs + side stripes
  x.fillStyle = "#f2ede2";
  x.beginPath();
  x.moveTo(cx + 268, 360); x.lineTo(cx + 150, 408); x.lineTo(cx + 138, 372); x.lineTo(cx + 252, 326);
  x.closePath(); x.fill();
  x.beginPath();
  x.moveTo(cx - 268, 360); x.lineTo(cx - 150, 408); x.lineTo(cx - 138, 372); x.lineTo(cx - 252, 326);
  x.closePath(); x.fill();
  x.fillRect(cx - 158, 430, 16, 350);
  x.fillRect(cx + 142, 430, 16, 350);
  // collar
  x.strokeStyle = "#f2ede2";
  x.lineWidth = 16;
  x.beginPath();
  x.moveTo(cx - 95, 120);
  x.quadraticCurveTo(cx, 180, cx + 95, 120);
  x.stroke();
  // fabric shading: subtle vertical creases
  x.strokeStyle = "rgba(0,0,0,0.14)";
  x.lineWidth = 6;
  for (const dx of [-90, -30, 40, 95]) {
    x.beginPath();
    x.moveTo(cx + dx, 240);
    x.quadraticCurveTo(cx + dx + 12, 500, cx + dx - 8, 780);
    x.stroke();
  }
  // number + name
  x.fillStyle = "#f6f1e6";
  x.font = "bold 240px system-ui, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("10", cx, 520);
  x.font = "bold 54px system-ui, sans-serif";
  letterSpaced(x, "CARDENAS", cx, 300, 10);
  finish(x, W, H, 0.05);
  return c;
}

/* soccer scarf — long striped weave with block letters + fringe ends */
export function scarfArt() {
  const W = 1024, H = 128;
  const { c, x } = canvas(W, H);
  // striped body: red / cream blocks
  const blocks = 10, bw = W / blocks;
  for (let i = 0; i < blocks; i++) {
    x.fillStyle = i % 2 ? "#a3213b" : "#efe6d4";
    x.fillRect(i * bw, 0, bw, H);
  }
  // top/bottom border stripes
  x.fillStyle = "#22314f";
  x.fillRect(0, 0, W, 14);
  x.fillRect(0, H - 14, W, 14);
  // knit texture: fine vertical ribs
  x.globalAlpha = 0.1;
  x.strokeStyle = "#000";
  x.lineWidth = 1;
  for (let i = 0; i < W; i += 3) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke();
  }
  x.globalAlpha = 1;
  // center letters across the middle blocks
  x.fillStyle = "#22314f";
  x.font = "bold 64px system-ui, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  letterSpaced(x, "VAMOS", W / 2, H / 2, 26);
  // fringe at both ends
  for (const [x0, dir] of [[0, 1], [W, -1]] as [number, number][]) {
    x.fillStyle = "#efe6d4";
    for (let i = 6; i < H - 6; i += 9) {
      x.fillRect(x0, i, dir * 22, 4);
    }
  }
  finish(x, W, H, 0.06);
  return c;
}

/* figure skating poster — night rink, spotlight, a white skate, gala text */
export function skatePosterArt() {
  const W = 680, H = 960;
  const { c, x } = canvas(W, H);
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0d1330");
  bg.addColorStop(0.7, "#1b2c55");
  bg.addColorStop(1, "#2c4470");
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  // spotlight cone
  const spot = x.createLinearGradient(0, 60, 0, 700);
  spot.addColorStop(0, "rgba(210,225,255,0.5)");
  spot.addColorStop(1, "rgba(210,225,255,0)");
  x.fillStyle = spot;
  x.beginPath();
  x.moveTo(W / 2 - 40, 40); x.lineTo(W / 2 + 40, 40);
  x.lineTo(W / 2 + 240, 700); x.lineTo(W / 2 - 240, 700);
  x.closePath();
  x.fill();
  // ice sheet + skate trails
  x.fillStyle = "#c9dcee";
  x.beginPath();
  x.ellipse(W / 2, 700, 300, 90, 0, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = "rgba(90,120,160,0.5)";
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(W / 2 - 200, 720);
  x.bezierCurveTo(W / 2 - 60, 660, W / 2 + 80, 760, W / 2 + 210, 690);
  x.stroke();
  x.beginPath();
  x.moveTo(W / 2 - 160, 750);
  x.bezierCurveTo(W / 2, 700, W / 2 + 30, 730, W / 2 + 170, 720);
  x.stroke();
  // the skate: white boot + blade, mid-air over the ice
  x.save();
  x.translate(W / 2, 480);
  x.rotate(-0.32);
  x.fillStyle = "#f4f2ee";
  x.beginPath();                       // boot body
  x.moveTo(-70, -110);                 // cuff back
  x.quadraticCurveTo(-30, -124, 6, -112); // cuff front
  x.lineTo(20, -30);                   // ankle front
  x.quadraticCurveTo(90, -16, 118, 18); // toe rise
  x.quadraticCurveTo(126, 42, 100, 46); // toe
  x.lineTo(-64, 46);                   // sole
  x.quadraticCurveTo(-84, -30, -70, -110); // heel line
  x.closePath();
  x.fill();
  // lace crosses
  x.strokeStyle = "#b9c2cc";
  x.lineWidth = 5;
  for (let i = 0; i < 5; i++) {
    const y = -100 + i * 18;
    x.beginPath(); x.moveTo(-42 + i * 6, y); x.lineTo(-6 + i * 5, y + 12); x.stroke();
    x.beginPath(); x.moveTo(-6 + i * 5, y); x.lineTo(-42 + i * 6, y + 12); x.stroke();
  }
  // heel + sole line
  x.strokeStyle = "#d7cfc2";
  x.lineWidth = 6;
  x.beginPath(); x.moveTo(-70, 46); x.lineTo(104, 46); x.stroke();
  // blade + stanchions + toe pick
  x.strokeStyle = "#cfd8e2";
  x.lineWidth = 7;
  x.beginPath();
  x.moveTo(-66, 84); x.quadraticCurveTo(30, 96, 108, 78);
  x.quadraticCurveTo(124, 72, 126, 52);
  x.stroke();
  x.lineWidth = 9;
  x.beginPath();
  x.moveTo(-52, 48); x.lineTo(-54, 82);
  x.moveTo(70, 48); x.lineTo(74, 80);
  x.stroke();
  x.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    x.beginPath();
    x.moveTo(118 - i * 3, 60 - i * 5);
    x.lineTo(126 - i * 3, 58 - i * 5);
    x.stroke();
  }
  x.restore();
  // sparkles
  for (let i = 0; i < 30; i++) {
    const sx = Math.random() * W, sy = 60 + Math.random() * 560;
    x.fillStyle = `rgba(220,232,255,${0.3 + Math.random() * 0.6})`;
    x.beginPath(); x.arc(sx, sy, Math.random() * 2.2, 0, Math.PI * 2); x.fill();
  }
  // titles
  x.fillStyle = "#e8eefc";
  x.font = "bold 84px Georgia, serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("ON ICE", W / 2, 830);
  x.fillStyle = "#9fb4dd";
  x.font = "600 26px system-ui, sans-serif";
  letterSpaced(x, "WINTER GALA · SEASON FINALE", W / 2, 892, 4);
  finish(x, W, H, 0.04);
  return c;
}

/* museum-plate paleo print #1 — a T. rex skull, side profile */
export function trexArt() {
  const W = 800, H = 560;
  const { c, x } = canvas(W, H);
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#efe6d0");
  bg.addColorStop(1, "#e0d2b4");
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  x.strokeStyle = "#6b5636";
  x.lineWidth = 2;
  x.strokeRect(26, 26, W - 52, H - 52);
  // skull drawing (ink)
  x.strokeStyle = "#3c2f1c";
  x.fillStyle = "#3c2f1c";
  x.lineWidth = 5;
  x.lineJoin = "round";
  x.save();
  x.translate(90, 120);
  x.beginPath();
  x.moveTo(40, 60);                       // snout tip top
  x.quadraticCurveTo(200, -10, 380, 20);  // top of skull
  x.quadraticCurveTo(470, 36, 520, 100);  // braincase
  x.lineTo(540, 190);                     // back of skull
  x.quadraticCurveTo(500, 210, 470, 200); // quadrate
  x.lineTo(430, 260);                     // jaw joint down
  x.quadraticCurveTo(260, 300, 80, 270);  // lower jaw bottom
  x.quadraticCurveTo(30, 250, 24, 190);   // chin curve
  x.lineTo(40, 60);                       // up the snout
  x.closePath();
  x.stroke();
  // fenestrae (skull openings)
  x.lineWidth = 4;
  x.beginPath(); x.ellipse(400, 90, 40, 30, -0.3, 0, Math.PI * 2); x.stroke();  // orbit
  x.beginPath(); x.ellipse(300, 110, 52, 38, -0.15, 0, Math.PI * 2); x.stroke(); // antorbital
  x.beginPath(); x.ellipse(120, 110, 28, 20, 0, 0, Math.PI * 2); x.stroke();     // naris
  x.beginPath(); x.ellipse(480, 150, 26, 34, 0.2, 0, Math.PI * 2); x.stroke();   // lateral temporal
  // teeth: upper + lower rows
  for (let i = 0; i < 11; i++) {
    const tx = 60 + i * 34;
    const len = 26 + (i % 3) * 8;
    x.beginPath();
    x.moveTo(tx, 196 + Math.sin(i) * 4);
    x.lineTo(tx + 9, 196 + len);
    x.lineTo(tx + 18, 196 + Math.sin(i) * 4);
    x.closePath();
    x.fill();
  }
  for (let i = 0; i < 9; i++) {
    const tx = 84 + i * 34;
    x.beginPath();
    x.moveTo(tx, 246);
    x.lineTo(tx + 8, 224);
    x.lineTo(tx + 16, 246);
    x.closePath();
    x.fill();
  }
  // jaw line
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(30, 200);
  x.quadraticCurveTo(240, 236, 456, 208);
  x.stroke();
  x.restore();
  // caption plate
  x.fillStyle = "#3c2f1c";
  x.font = "italic 30px Georgia, serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("Tyrannosaurus rex", W / 2, H - 84);
  x.font = "16px Georgia, serif";
  x.fillStyle = "#6b5636";
  letterSpaced(x, "LATE CRETACEOUS · 68–66 MA · FIG. I", W / 2, H - 50, 3);
  finish(x, W, H, 0.06);
  return c;
}

/* museum-plate paleo print #2 — the dodo, sepia study */
export function dodoArt() {
  const W = 800, H = 560;
  const { c, x } = canvas(W, H);
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#ece0c8");
  bg.addColorStop(1, "#ddcda9");
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  x.strokeStyle = "#6b5636";
  x.lineWidth = 2;
  x.strokeRect(26, 26, W - 52, H - 52);
  x.save();
  x.translate(W / 2, 250);
  // body
  x.fillStyle = "#7d6a4d";
  x.beginPath();
  x.ellipse(0, 40, 150, 118, 0, 0, Math.PI * 2);
  x.fill();
  // tail poof
  x.fillStyle = "#8f7c5c";
  for (let i = 0; i < 5; i++) {
    x.beginPath();
    x.ellipse(128 + i * 7, -20 - i * 12, 26, 14, -0.5 - i * 0.16, 0, Math.PI * 2);
    x.fill();
  }
  // neck + head
  x.fillStyle = "#8a7857";
  x.beginPath();
  x.moveTo(-92, -20);
  x.quadraticCurveTo(-130, -90, -108, -150);
  x.quadraticCurveTo(-96, -184, -60, -180);   // crown
  x.quadraticCurveTo(-36, -176, -38, -140);
  x.quadraticCurveTo(-42, -84, -30, -30);
  x.closePath();
  x.fill();
  // beak: big hooked bill
  x.fillStyle = "#c2a875";
  x.beginPath();
  x.moveTo(-96, -168);
  x.quadraticCurveTo(-190, -172, -204, -138);
  x.quadraticCurveTo(-210, -118, -186, -112); // hook
  x.quadraticCurveTo(-140, -104, -100, -122);
  x.closePath();
  x.fill();
  x.strokeStyle = "#8a6f43";
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(-186, -136);
  x.quadraticCurveTo(-150, -128, -104, -140);
  x.stroke();
  // eye
  x.fillStyle = "#2e2416";
  x.beginPath(); x.arc(-76, -152, 7, 0, Math.PI * 2); x.fill();
  x.strokeStyle = "#2e2416";
  x.lineWidth = 1.5;
  x.beginPath(); x.arc(-76, -152, 11, 0, Math.PI * 2); x.stroke();
  // wing nub
  x.fillStyle = "#6d5b40";
  x.beginPath();
  x.ellipse(28, 10, 52, 30, -0.35, 0, Math.PI * 2);
  x.fill();
  // legs + big feet
  x.strokeStyle = "#b09143";
  x.lineWidth = 12;
  x.beginPath(); x.moveTo(-40, 146); x.lineTo(-44, 210); x.stroke();
  x.beginPath(); x.moveTo(36, 150); x.lineTo(40, 210); x.stroke();
  x.lineWidth = 8;
  for (const fx of [-44, 40]) {
    for (const d of [-22, 0, 22]) {
      x.beginPath(); x.moveTo(fx, 210); x.lineTo(fx + d, 232); x.stroke();
    }
  }
  // feather strokes
  x.strokeStyle = "rgba(60,47,28,0.35)";
  x.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const a = -0.6 + i * 0.09;
    x.beginPath();
    x.moveTo(Math.cos(a) * 60, 40 + Math.sin(a) * 50);
    x.quadraticCurveTo(Math.cos(a) * 110, 40 + Math.sin(a) * 88, Math.cos(a) * 146, 40 + Math.sin(a) * 112);
    x.stroke();
  }
  x.restore();
  // ground shadow
  x.fillStyle = "rgba(60,47,28,0.18)";
  x.beginPath();
  x.ellipse(W / 2, 486, 190, 20, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#3c2f1c";
  x.font = "italic 30px Georgia, serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("Raphus cucullatus", W / 2, H - 84);
  x.font = "16px Georgia, serif";
  x.fillStyle = "#6b5636";
  letterSpaced(x, "MAURITIUS · EXTINCT c. 1681 · FIG. II", W / 2, H - 50, 3);
  finish(x, W, H, 0.06);
  return c;
}

/* music poster — red/black gig print for the record on the player */
export function musicPosterArt() {
  const W = 640, H = 880;
  const { c, x } = canvas(W, H);
  x.fillStyle = "#b3111d";
  x.fillRect(0, 0, W, H);
  // halftone dots, denser toward the bottom
  x.fillStyle = "rgba(0,0,0,0.5)";
  for (let ry = 0; ry < 22; ry++) {
    for (let rx = 0; rx < 16; rx++) {
      const r = (ry / 22) * 5;
      if (r < 0.7) continue;
      x.beginPath();
      x.arc(20 + rx * 40 + (ry % 2) * 20, 40 + ry * 38, r, 0, Math.PI * 2);
      x.fill();
    }
  }
  // jagged black star
  x.fillStyle = "#131313";
  x.save();
  x.translate(W / 2, 360);
  x.beginPath();
  const spikes = 11;
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 120 : 250 + (i % 4) * 30;
    const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.9;
    if (i) x.lineTo(px, py); else x.moveTo(px, py);
  }
  x.closePath();
  x.fill();
  // white vinyl in the star's eye
  x.fillStyle = "#f2ede2";
  x.beginPath(); x.arc(0, 0, 92, 0, Math.PI * 2); x.fill();
  x.strokeStyle = "#131313";
  x.lineWidth = 2;
  for (const r of [78, 66, 54, 44]) {
    x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.stroke();
  }
  x.fillStyle = "#b3111d";
  x.beginPath(); x.arc(0, 0, 30, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#131313";
  x.beginPath(); x.arc(0, 0, 5, 0, Math.PI * 2); x.fill();
  x.restore();
  // condensed title stack
  x.fillStyle = "#f2ede2";
  x.font = "bold 118px 'Arial Narrow', system-ui, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.save();
  x.translate(W / 2, 690);
  x.scale(0.86, 1.5);
  x.fillText("HEART", 0, -40);
  x.fillText("BREAK", 0, 58);
  x.restore();
  x.fillStyle = "#131313";
  x.font = "bold 20px system-ui, sans-serif";
  letterSpaced(x, "SPINNING NIGHTLY · SIDE B", W / 2, 830, 6);
  finish(x, W, H, 0.05);
  return c;
}

/* felt pennant — CHAMPIONS, navy + gold */
export function pennantArt() {
  const W = 800, H = 300;
  const { c, x } = canvas(W, H);
  x.clearRect(0, 0, W, H); // transparent outside the felt (shape mesh shows it all anyway)
  x.fillStyle = "#22314f";
  x.fillRect(0, 0, W, H);
  // felt fuzz
  for (let i = 0; i < 3200; i++) {
    x.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
    x.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }
  // gold trim strip at the mast end
  x.fillStyle = "#c9a36a";
  x.fillRect(0, 0, 34, H);
  // ribbon tails drawn near the mast
  x.fillStyle = "#a3213b";
  x.fillRect(34, 20, 26, H - 40);
  // lettering, shrinking toward the tip
  x.fillStyle = "#efe6d4";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.save();
  x.translate(90, H / 2);
  x.font = "bold 92px Georgia, serif";
  x.scale(1, 1.24);
  x.textAlign = "left";
  x.fillText("CHAMPIONS", 0, 2);
  x.restore();
  x.fillStyle = "#c9a36a";
  x.font = "bold 34px Georgia, serif";
  x.textAlign = "left";
  x.fillText("’24", 610, H / 2 + 4);
  finish(x, W, H, 0.04);
  return c;
}
