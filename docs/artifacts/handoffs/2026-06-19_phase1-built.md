# Turnover: Phase 1 — room shell & camera BUILT (pending 2 tweaks + sign-off)

- Created: 2026-06-19
- Project: C:/Users/Francisco/Desktop/Projects/Portfolio
- Branch: main
- Continues from: 2026-06-19_redesign-planned.md

## 1. Current phase number and status
Phase 1: Room shell & camera — **built & validated in the live preview, NOT committed.** The flat-2D
"Drawing Set" scene is fully replaced by a CSS-3D perspective room with a scroll-to-focus camera that
**travels and turns between the walls**. Francisco likes it. **He has TWO more small changes he wants
before we start Phase 2 — those are the first thing to ask about next session** (they were unspecified at
handoff time). After those: lock Phase 1, get his go to commit, then start Phase 2.

## 2. What was completed this session, file by file
- `src/components/Portfolio.tsx` — **rewritten.** Removed the flat horizontal-pan engine, the elevation
  SVG, the hero poster, the detail cards, the slide-in panel, the zoomview, the dwell-to-enter logic, the
  station nav, the title block, theme state, and `PanelBody`. Added: the `ANCHORS` array (6 placeholder
  focus points across the walls), the **scroll-to-focus camera engine** (rAF easing a float focus index →
  lerps `--cam-x/y/z/ry/rx`), `AnchorMarker`, the room render (`.stage > .camera > .room > 5 faces`), the
  focus rail, and a scroll hint. Kept `ResumeView` (résumé fast-lane), de-themed.
- `src/app/globals.css` — **rewritten.** Removed the four `[data-palette][data-theme]` theme blocks and all
  brick/wood/elevation/hero/detail/panel/zoomview CSS. Added: one warm cozy `:root` scheme; the CSS-3D room
  (perspective stage, camera rig, room box, 5 **inward-facing** surfaces with CSS paint + wood-plank floor +
  warm lighting + contact shadows + vignette); `.anchor` placeholders; `.focusnav` rail; `.hint`. Kept +
  de-themed the top bar and résumé view.
- `src/app/layout.tsx` — removed the dead `data-theme="light" data-palette="field"` attributes.
- `docs/decisions/0004-room-materials-and-desktop-first.md` — NEW (no brick/wood; desktop-first).
- `docs/decisions/0005-camera-travels-between-walls.md` — NEW (camera turns to face objects on any wall;
  refines ADR-0002's "fixed corner camera").
- `docs/01_room-shell-and-camera.md` — execution log filled (3 entries) + tests marked pass.
- `CLAUDE.md` — active phase + phase-index row 1 → "built (pending sign-off)".

### Current camera/room tuning (so the next session doesn't re-derive it)
- Room: `--rw 1620 / --rh 940 / --rd 1560`; `.stage` perspective `1340px`, `perspective-origin 43% 37%`;
  `.room` base `translate(-50%,-50%) rotateY(-14deg) rotateX(4deg)`.
- `ANCHORS` (face / x% / y% on the face / cam{x,y,z,ry,rx}):
  - about — back / 24% / 34% / {250, 55, 190, 0, 0}
  - education — left / 44% / 44% / {165, 28, -110, -46, 0}
  - experience — back / 55% / 34% / {-30, 55, 195, 0, 0}
  - skills — right / 52% / 44% / {-150, 28, -110, 54, 0}
  - involvement — right / 38% / 40% / {-90, 26, -110, 54, 0}
  - contact — back / 78% / 40% / {-250, 35, 190, 0, 0}
- Object layout: back wall = About/Experience/Contact; left wall = Education; right wall = Skills/Involvement.
  Floor is intentionally clear (ambiance only).

## 3. Test status
No automated tests (visual verification via the preview tool). Validated this session: no console errors;
all 6 anchors frame on-screen at full height (DOM-measurement sweep at ~961px); wheel/keys/drag/rail all
glide + turn the camera and update focus; résumé opens/closes; mobile (375px) renders without breaking.

## 4. Decisions made and rationale (delta on the decision log)
- [0004-room-materials-and-desktop-first.md](../../decisions/0004-room-materials-and-desktop-first.md) — drop
  brick/wood photo textures for a normal painted room; compose desktop-first.
- [0005-camera-travels-between-walls.md](../../decisions/0005-camera-travels-between-walls.md) — the camera
  turns (yaw/pitch) to face objects on any wall, so scrolling tours the room; refines ADR-0002.

## 5. Outstanding questions for the user
- **TWO more changes Francisco wants before Phase 2 — capture these first.** (Unknown at handoff.)
- Then: confirm Phase 1 locked + the go to commit.

## 6. Known issues and tech debt added
- **Per-object camera framing is viewport-width sensitive** (tuned at ~961px desktop). Phase 2 should make it
  robust (viewport-relative units or a fit/contain calc) once real objects land. (ADR-0005)
- **Preview screenshot tool renders a different viewport than `eval` reads**, and the preview width
  fluctuates (529 / 961 seen) — verify framing via DOM `getBoundingClientRect`, not screenshots alone.
- **HMR does not re-run the camera engine effect** (deps `[]`), so editing `ANCHORS` needs a full page
  reload (`location.reload()`) to take effect in the preview.
- **Turbopack stale-CSS:** after CSS edits, stop server → `rm -rf .next` → restart.
- Floor has no focus object (ambiance only); real floor presence in Phase 2 = standing furniture, not flat
  labels. Side-wall objects look sparse with tiny placeholders — real (larger) objects will fill them.
- The old reusable pieces (Spider-Verse poster markup, zoom-into-object interaction, Colombian flag SVG) were
  removed from the live render; they live in git history (commit `85b7448`) and the prior handoff — pull them
  back as Phase 2/3 inputs.
- Entire Next app still uncommitted (by design — Francisco hasn't said to commit).

## 7. Files most relevant to the next session
- `src/components/Portfolio.tsx` — `ANCHORS` (edit to add/move objects), the camera engine, the room render.
- `src/app/globals.css` — room dims/perspective/base angle, the 5 faces + lighting, `.anchor`, `.focusnav`.
- `docs/01_room-shell-and-camera.md` — Phase 1 spec + execution log.
- `docs/decisions/0004`, `0005` — the live design decisions.
- `docs/00_plan.md` — Phase 2 = "Hero objects: poster + flag" (the next phase to spec/build).
- `public/images/spider-logo.png` — existing Spider-Verse art used by the old poster.
- `Private Random Stuff/Rooms/Room 1–3.jpg` — look references (git-ignored, LOOK only).

## 8. Environment state
- Dev server: `portfolio-dev` on port 3000 (`.claude/launch.json`).
- No migrations, env vars, or external services. Next.js 16.2.9 (Turbopack).
- Fonts via `next/font`: Space Grotesk (display) / DM Sans (body) / Space Mono (mono) — unchanged.

## 9. Exact command sequence to resume the dev environment
```bash
# from project root:
rm -rf .next
# then start the dev server via the preview tool (server name: portfolio-dev, port 3000)
# NOTE: after editing ANCHORS in Portfolio.tsx, location.reload() the preview (HMR won't restart the engine).
# NOTE: after CSS edits, stop server -> rm -rf .next -> restart (stale-CSS cache).
```
