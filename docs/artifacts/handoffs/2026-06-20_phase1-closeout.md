# Turnover: Phase 1 — closeout (signed off, ready to commit)

- Created: 2026-06-20 10:42:02
- Project: C:/Users/Francisco/Desktop/Projects/Portfolio
- Branch: main (phase branch `phase-1-room-shell-and-camera` to be created at commit)
- Continues from: 2026-06-19_phase1-ceiling-and-leftwall.md

## 1. Current phase number and status
Phase 1: Room shell & camera — **done.** Francisco signed off in the live preview on 2026-06-20. The
perspective approach (ADR-0002) is validated; Phase 1's de-risk goal is achieved.

## 2. What was completed this session, file by file
See `docs/01_room-shell-and-camera.md`, execution log entry **2026-06-20** (+ closeout section).
Delta: fixed the education left-wall "glitch through the wall" (room was turning the wrong way →
backface; now turns toward the wall, `rry:-55`); added a global `--pull` dolly-back for breathing room;
re-ordered the six stops left→right (About=left wall landing, B/C/D=back wall, E/F=right wall) so
scrolling sweeps the room in order. Files: `src/components/Portfolio.tsx` (ANCHORS), `src/app/globals.css`
(`.camera` `--pull`, `.face--left` facing).

## 3. Test status
- Passing: both "tests that must pass" — no console errors + room renders; scroll glides smoothly between
  anchors + reduced-motion respected. Verified in the live preview (Claude Preview tools) this session.
- Failing: none.
- Skipped: none. (No automated test suite — this is a visual design loop; verification is preview-based.)

## 4. Decisions made and rationale (delta on the decision log)
- [docs/decisions/0006-camera-tour-order-and-left-wall.md](../../decisions/0006-camera-tour-order-and-left-wall.md)
  — left→right stop order; left wall faced via room-rotation (toward the wall, not away); global pull-back knob. Refines 0005.

## 5. Outstanding questions for the user
- **Push/PR gate:** Phase 1 is committed locally on the phase branch but NOT pushed — the standing rule
  gates push/deploy on Francisco's say-so. He needs to OK pushing the branch + opening the PR to the public
  repo (or merging to main).
- Phase 2 object→section mapping is still OPEN (deferred Q1 in the plan) — Claude proposes in Phase 2/3.

## 6. Known issues and tech debt added
- Per-object camera framing is **viewport-width sensitive** (tuned ~961px) — harden in Phase 2.
- Facing mechanism is **mixed** (left wall = room rotation, right wall = camera yaw) — works; could unify later.
- Flat floor labels read weakly — real floor presence = standing 3D furniture (carried from ADR-0005).
- Stray `public/poster-preview.html` (recovered Spider-Verse poster preview) — left uncommitted; a likely
  **Phase 2 input** (poster) or delete.
- Dev server (`portfolio-dev`, port 3000) dropped out on its own several times this session — restart via the
  preview tool when it does.

## 7. Files most relevant to the next session (Phase 2: poster + flag)
- `src/components/Portfolio.tsx:36` — the `ANCHORS` array; Phase 2 replaces placeholder markers with real
  objects (poster, flag) and tunes their per-object cameras.
- `src/app/globals.css:113` — `.camera` transform (`--pull` knob) and the `.face--*` wall surfaces objects mount on.
- `src/content/site.ts` — section content/labels the objects open.
- `public/poster-preview.html` — recovered poster preview to evaluate as a Phase 2 input.
- `docs/00_plan.md` (Phase 2 row) and ADR-0005/0006 — the camera rig objects will sit in.

## 8. Environment state
- Migrations run: none (no database).
- Env vars added: none.
- Services started: `portfolio-dev` dev server (Next.js + Turbopack) on port 3000.
- Ports occupied: 3000.

## 9. Exact command sequence to resume the dev environment
```bash
# from project root:
rm -rf .next            # only needed after structural CSS edits (Turbopack stale-CSS gotcha)
# start the dev server via the preview tool (config: .claude/launch.json, name "portfolio-dev", port 3000)
# after editing ANCHORS in Portfolio.tsx -> reload the preview (HMR won't re-run the camera engine effect)
```
