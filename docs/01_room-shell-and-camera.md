# Phase 1: Room shell & camera

## Locked plan
(Frozen at plan time. Design changes during execution are recorded as ADRs in `docs/decisions/`.)

### Objective
Build a convincing perspective **room shell** (walls + floor in real depth) with warm cozy lighting,
and the **fixed-camera, scroll-to-focus** navigation — proving the assembled-perspective approach
(ADR-0002) before any furnishing.

### Inputs
- ADR-0002 (perspective room), ADR-0003 (workflow mode), ADR-0004 (materials + desktop-first), Q&A answers (2026-06-19).
- References: `Private Random Stuff/Rooms/Room 1–3.jpg` (look only).
- Existing assets: existing scene/scroll engine in `src/components/Portfolio.tsx`; zoom-into-object
  interaction + globals.css. NOTE (ADR-0004): the brick/wood photo textures are **dropped** — do not
  reuse them.
- CC0 sources only if plain CSS material can't sell a normal nice room (Poly Haven, ambientCG).

### Skills to load
- `frontend-design` (aesthetic direction for the perspective scene + lighting).

### Steps
1. Spike a CSS 3D room shell: back wall + one side wall + floor as planes under a shared
   `perspective`, fixed corner camera. Confirm depth reads correctly (de-risk gate).
2. Surface the planes as a **normal nice room** (ADR-0004): painted/plaster walls in a warm neutral
   + a tasteful plain floor, done with CSS color/gradient/shadow (no brick/wood photo tiles). Add
   warm evening lighting (directional gradients, soft contact shadow at wall/floor, lamp/string-light glow).
3. Replace the flat horizontal pan with a **scroll-driven focus** controller: scrolling moves the
   camera focus/zoom between a set of named focus points (placeholder anchors for now).
4. Remove the 4-theme system (RESOLVED 2026-06-19) — strip the Field/Dusk × Light/Dark toggles and
   per-theme vars; settle on one basic warm/cozy scheme.

### Tests that must pass
- No console errors; dev server renders the room shell.
- Scroll moves focus smoothly between placeholder anchors; reduced-motion respected.

### Acceptance criteria (functional and visual)
- Functional: the empty room shell renders with real perspective depth; scroll-to-focus works on
  desktop (primary, per ADR-0004) and does not break on mobile.
- Visual: reads as a believable corner of a warm, cozy room (depth + light), not a flat panel —
  judged in the live preview against the references' *feel*.

### Definition of done
Project-wide DoD (shell-relevant items) plus: the perspective approach is validated (or an ADR
records a pivot away from CSS 3D), and the scroll-to-focus mechanism is in place.

### Complexity / token weight
L — the riskiest phase (validates the whole approach). Hands-on in the main session with frequent
preview checks.

### Estimated time
1–2 sessions.

### Dependencies on other phases
- Depends on: none (first redesign phase).
- Required by: Phase 2 (objects placed on the shell), Phase 3 (furnishing).

## Execution log
(Append-only during execution.)

### 2026-06-19 — built & validated in the live preview
- **Scene layer rebuilt** (`src/components/Portfolio.tsx`, `src/app/globals.css`): replaced the flat
  horizontal-pan "Drawing Set" scene with a CSS-3D room. `.stage` holds the `perspective`
  (1180px, `perspective-origin: 37% 39%` → corner view); `.camera` (preserve-3d) is the moving rig;
  `.room` (preserve-3d) carries five inward-facing surfaces (back / left / right walls + floor +
  ceiling). First built with the outward-facing cube formula → every non-back face showed its
  **backface** (mirrored text); fixed by rebuilding faces inward (`translate… rotate…`).
- **Materials (ADR-0004):** painted warm-greige walls + plain wood floor (subtle CSS plank gradient),
  warm key-light + lamp glow, contact shadows at the wall/floor seams, camera vignette. No brick/wood
  photo textures.
- **Scroll-to-focus camera:** rAF engine eases a float focus index; wheel / arrows+PageUp/Dn+Home/End /
  vertical drag all drive it; the camera lerps between per-anchor targets (`--cam-x/y/z/ry/rx`); the
  focus rail + the active anchor's glow track it; `prefers-reduced-motion` skips the easing.
- **Themes removed (ADR-0004):** the 4 `[data-palette][data-theme]` blocks + the Field/Dusk × Light/Dark
  toggles + `layout.tsx` `data-*` attrs are gone; one warm cozy `:root` scheme. Résumé fast-lane kept &
  de-themed.
- **Anchor placement (execution decision, not a plan change):** the fixed corner camera frames the
  **back wall** cleanly; the left wall is grazing-angle and the floor/right-wall placeholders
  foreshorten/fly off-screen. So all six placeholder anchors sit on the back wall for Phase 1. The rig
  already supports `rx`/`ry`, so Phase 2 can move real objects onto the side walls / floor with a
  look-down or turn and tune per-object cameras then.
- **Verified (preview, ~961px desktop):** no console errors; all 6 anchors on-screen at full size;
  scroll/keys/rail all glide the camera + update focus; résumé opens/closes; mobile (375px) renders
  without breaking. Screenshots reviewed.

### 2026-06-19 — feedback pass: bigger room, pulled back, camera turns between walls
- **Francisco feedback:** liked the render; wanted the camera *farther back*, the view *less straight-on*,
  and the room *larger* — then envisioned scrolling that can "go between all the walls" once real objects
  are added.
- **Bigger / farther back / angled (look pass 1):** enlarged the room (`--rw/rh/rd` ≈ +30%), raised
  perspective to 1340px, and gave `.room` a base `rotateY(-14deg) rotateX(4deg)` so the back wall recedes
  into a three-quarter corner instead of sitting flat (one-point) to the camera. Mobile dims scaled to match.
- **Camera turns between walls (ADR-0005):** the engine now lerps yaw/pitch (`--cam-ry/rx`) as well as
  translate/zoom, so each anchor's camera **turns to face its wall**. Redistributed the six placeholders:
  3 on the back wall, 1 on the **left** wall, 2 on the **right** wall.
  Verified by measurement sweep at ~961px: all six frame on-screen at full height (no slivers); screenshots
  of the back-wall establishing view and the right-wall turned view confirm the tour feel.
- **Floor cleared (Francisco feedback):** the floor placeholder read weakly as a flat label, so Involvement
  moved up onto the **right wall** (beside Skills — keeps Skills→Involvement a smooth same-wall turn). The
  floor is now clean ambiance/depth; real floor presence in Phase 2 should be standing furniture, not a
  flat plaque (ADR-0005).
- **Known caveats (carried to Phase 2, see ADR-0005):** per-object framing is viewport-width sensitive
  (tuned at 961px); flat floor labels read weakly (real floor = standing 3D furniture). Preview screenshot
  tool renders a different viewport than `eval` reads, so framing was validated via DOM measurement.

### 2026-06-20 — feedback pass: left-wall glitch fixed, pulled back, left→right tour order (ADR-0006)
- **Education "glitch through the wall" fixed.** The left-wall stop was turning the room the wrong way
  (`rry:+46`), swinging the wall's **backface** to camera → a mirrored, full-screen wall. Turned the room
  the correct way instead (toward the wall, `rry:-55`) so its painted inner face reads square-on; re-framed
  (`cam x:420 y:50 z:240`). Verified in the preview: marker reads forward, no clip-through, no console errors.
- **Global pull-back for breathing room.** Added one knob — `--pull` (≈ `-250px`, outermost transform on
  `.camera`) — that steps every view back at once (space to furnish in Phase 2) without re-tuning anchors.
  Structural CSS change → cleared `.next` and restarted (Turbopack stale-CSS gotcha).
- **Left→right tour order.** The lettered sections were scattered out of sequence, so scrolling zig-zagged.
  Laid the six stops across the walls in order: **About = left wall (landing)**, Education/Experience/Skills
  = back wall L→R, Involvement/Contact = right wall back→front. Scrolling A→F now sweeps the room with no
  backtracking. Verified by stepping the focus rail + screenshots at each end.
- **Francisco signed off** on all three (left-wall fix, spacing, scroll order) in the live preview, 2026-06-20.

### Tests that must pass — status
- No console errors; room shell renders — **pass.**
- Scroll moves focus smoothly between anchors; reduced-motion respected — **pass.**

## Closeout
**Status: complete.** Francisco signed off in the live preview on 2026-06-20.

- **Tests that must pass — both pass** (verified in the preview this session):
  - No console errors; the room shell renders. ✓
  - Scroll/keys/drag/rail glide the camera smoothly between anchors; `prefers-reduced-motion` skips the
    easing. ✓
- **Acceptance criteria — met:** reads as a believable warm, cozy corner of a room with real perspective
  depth (not a flat panel); scroll-to-focus tours the walls and frames each placeholder; works on desktop
  (primary, ADR-0004) and renders on mobile without breaking. The perspective approach (ADR-0002) is
  **validated** — Phase 1's de-risk goal is achieved.
- **Decisions landed:** ADR-0005 (camera travels & turns between walls); ADR-0006 (left→right tour order,
  left wall via room-rotation, global pull-back).
- **Tech debt carried to Phase 2:**
  - Per-object camera framing is **viewport-width sensitive** (tuned ~961px) — harden when real objects land.
  - Facing mechanism is **mixed** (left wall = room rotation, right wall = camera yaw) — fine, could unify later.
  - Flat floor labels read weakly — real floor presence should be **standing 3D furniture**, not plaques.
  - Stray `public/poster-preview.html` (a recovered Spider-Verse poster preview) — **not** committed with
    Phase 1; evaluate as a **Phase 2 input** (poster) or delete.
- **Auto-compactions this phase: 0** (threshold ~25%/250K).
