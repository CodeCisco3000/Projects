# Turnover: Phase 1 feedback pass — ceiling fixed; left-wall (education) camera reworked but STILL BUGGY per Francisco

- Created: 2026-06-19
- Project: C:/Users/Francisco/Desktop/Projects/Portfolio
- Branch: main
- Continues from: 2026-06-19_phase1-built.md

## 1. Current phase number and status
Phase 1 (Room shell & camera) — still **built, pending sign-off, NOT committed.** This session worked the
two feedback items Francisco wanted before Phase 2:
- **(1) Ceiling "empty roof / abyss above" — FIXED.** The room always had a ceiling face, but it was
  painted near-black (`#241c14`) so it dissolved into the black background. Re-skinned to a warm, dim,
  *present* evening ceiling. Material-only (no geometry change) so the camera is unaffected. Francisco
  has not explicitly re-confirmed the look but did not object.
- **(2) Education tab "messes with the camera" — REWORKED, NOT ACCEPTED.** Diagnosed + rebuilt with a new
  per-stop room-rotation mechanism; in DOM measurement the education marker now frames readable. **BUT
  Francisco's last word on it was "the camera is still buggy" — he interrupted before saying HOW, then
  pivoted to other work. The specific remaining problem is UNKNOWN. Get it first thing next session.**
  Phase 1 sign-off is blocked on this.

## 2. What was completed this session, file by file
- `src/app/globals.css`
  - `.face--ceil` — **rewritten.** Warm dim ceiling: a soft warm lamp-bounce pool + gentle gradient
    (`#5e5039 → var(--ceil) #564833 → #4a3e2d`) + a faint cornice glow at the wall seam + gentle (not
    black) corner seating. `--ceil` var changed `#241c14 → #564833`. Verified clearly brighter than `--bg`.
  - `.stage` — `perspective-origin` is now `var(--po-x, 43%) 37%` (was `43% 37%`); mobile query likewise
    `var(--po-x, 46%) 39%`. Lets the engine slide the "eye" horizontally per stop.
  - `.room` — transform `rotateY(-14deg)` → `rotateY(var(--room-ry, -14deg))`. Lets the engine turn the
    whole room per stop (the lever that actually faces a side wall).
- `src/components/Portfolio.tsx`
  - `Cam` type extended: added `pox` (perspective eye x %, glided) and `rry` (room base turn deg, glided).
  - `ANCHORS` — every stop got `pox` + `rry`. Back/right stops keep `pox:43, rry:-14` (unchanged look).
    **Education rebuilt to `{ x:380, y:28, z:-120, ry:0, rx:0, pox:50, rry:46 }`** (camera ry stays 0; the
    `rry:46` room turn does the facing).
  - Added `roomRef`; engine `apply()` now also lerps `--po-x` onto `.stage` and `--room-ry` onto `.room`.
    Stage + room carry initial inline vars (no FOUC). Header comment block updated to explain pox/rry.

## 3. Test status
No automated tests (visual design loop). This session, by DOM measurement (the screenshot tool is broken —
see §6):
- Ceiling: no console errors; ceiling sits at the top 8% (back-wall view) to ~22% (side-wall view) of the
  frame and never descends into/blocks the camera; new colors measured well above `--bg` — **pass.**
- Education: at the rebuilt stop the marker renders ~160px wide, full-height, on-screen, unclipped, with
  the left wall faced (it was a ~12px edge-on sliver before) — **measurement pass, but NOT visually
  signed off; Francisco reports it's still buggy.**

## 4. Decisions made and rationale (provisional — pending acceptance)
- **Ceiling = material-only warm dim ceiling** (refines ADR-0004 materials). No geometry touched, so the
  validated camera/no-obstruction behavior is unchanged.
- **Per-stop ROOM rotation (`--room-ry`) is the lever that faces a grazing side wall — the eye-shift
  (`--po-x`) alone is NOT enough.** Measured: the room's resting `-14°` turn pushes the left wall away, so
  the education marker was edge-on (~12px) and unreadable regardless of camera turn (`ry`) or eye (`pox`,
  which barely changed it). Turning the *room* from `-14°` to `+46°` brings the left wall forward and the
  marker to ~160px readable. Candidate **ADR-0006** once Francisco accepts it. NOTE: this makes the
  back-wall→education move a large ~60° room swing — that may be the "still buggy" complaint.

## 5. Outstanding questions for the user (ask first, before touching code)
- **What exactly is still buggy about the education camera?** Likely candidates to probe: the big ~60° room
  swing into/out of education feeling disorienting; the marker size/placement; something mid-transition; or
  it breaks at his window width (framing is tuned ~961px). Do NOT re-tune blind — get specifics.
- Possible pivot if the swing is the problem: move education off the grazing left wall onto the back/right
  wall (which frame cleanly) and drop the room-rotation mechanism. Francisco earlier chose "make the left
  wall work properly," so confirm before reversing.
- Then: confirm the ceiling look, lock Phase 1, get the go to commit.

## 6. Known issues and tech debt
- **Education camera unresolved** (above) — the headline blocker.
- **Screenshot tool times out** (Next dev keeps an HMR socket open → never network-idle). Cannot self-verify
  visually this session; rely on Francisco's eyes + DOM measurement.
- **eval runs in a throttled/background page** where the rAF camera loop is paused, so manually setting
  `--cam-*` / `--po-x` / `--room-ry` sticks and `getBoundingClientRect` reflects it — BUT a stray foreground
  frame runs `apply()` and resets the vars to the current focus. **Measure SYNCHRONOUSLY** (set vars, then
  read `getBoundingClientRect` with NO `await` in between) or the reading is wrong. Synthetic wheel/key
  events do NOT drive the engine from eval (untrusted); only real input does.
- **HMR does not re-run the engine effect** (deps `[]`) → after editing `ANCHORS`, full `location.reload()`.
- **Turbopack stale CSS**: structural CSS changes (e.g. the `--room-ry` transform) are served stale —
  stop server → `rm -rf .next` → restart (done this session; that's why the var "wasn't working" at first).
- Per-object framing is still viewport-width sensitive (tuned ~961px) — Phase 2 should make it robust.
- **Stray file:** `public/poster-preview.html` exists (a recovered Spider-Verse poster preview, unrelated to
  the 3D room). Ignore or delete — it is NOT part of Phase 1.
- Entire app still uncommitted, by design.

## 7. Files most relevant to the next session
- `src/components/Portfolio.tsx` — `ANCHORS` (esp. the `education` cam), the `Cam` type (now `pox` + `rry`),
  the camera engine `apply()` (lerps `--cam-*`, `--po-x` on stage, `--room-ry` on room).
- `src/app/globals.css` — `.face--ceil` (warm ceiling), `.stage` `perspective-origin: var(--po-x …)`,
  `.room` `transform: … rotateY(var(--room-ry …))`.
- `docs/01_room-shell-and-camera.md` — Phase 1 spec + execution log (update at sign-off).
- `docs/decisions/0004`, `0005` — prior camera/material ADRs; `0006` to be written if room-rotation is kept.

## 8. Environment state
- Dev server: `portfolio-dev` on port 3000 (`.claude/launch.json`). Restarted this session (it stopped once;
  changing serverIds are normal). `.next` cache was cleared this session.
- No migrations, env vars, or external services. Next.js 16.2.9 (Turbopack). Fonts unchanged.

## 9. Exact command sequence to resume the dev environment
```bash
# from project root:
rm -rf .next
# start the dev server via the preview tool (server name: portfolio-dev, port 3000)
# after editing ANCHORS in Portfolio.tsx -> location.reload() the preview (HMR won't restart the engine)
# after CSS edits -> stop server -> rm -rf .next -> restart (stale-CSS cache)
# to measure framing: set --cam-*/--po-x/--room-ry then read getBoundingClientRect SYNCHRONOUSLY (no awaits)
```
