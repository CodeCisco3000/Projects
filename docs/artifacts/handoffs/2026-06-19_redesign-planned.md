# Turnover: Phase 1 — redesign planned, ready to build

- Created: 2026-06-19
- Project: C:/Users/Francisco/Desktop/Projects/Portfolio
- Branch: main
- Continues from: 2026-06-18_v1-polish-and-ship.md

## 1. Current phase number and status
Phase 1: Room shell & camera — **planned, NOT started.** The redesign plan is LOCKED. Francisco was
about to give the go to start building Phase 1. **First action next session: confirm "go", then
begin Phase 1** (Phase Start mode — read this handoff + `docs/01_room-shell-and-camera.md`).

## 2. What was completed this session, file by file
This was a **planning + pivot** session (plus earlier v1 tweaks now superseded by the redesign).
- `docs/decisions/0002-perspective-room-redesign.md` — NEW. The big pivot: flat 2D → perspective room.
- `docs/decisions/0003-full-workflow-handson-execution.md` — NEW. Full planning, hands-on execution; supersedes ADR-0001.
- `docs/decisions/0001-lightweight-workflow.md` — marked superseded by 0003.
- `docs/00_plan.md` — rewritten for the redesign (look&feel, stack, 5-phase list, DoD, deferred Qs).
- `docs/01_room-shell-and-camera.md` — NEW. Phase 1 spec.
- `CLAUDE.md` — active phase + phase index + standing rules updated for the redesign.
- Earlier (now superseded by redesign): `src/app/globals.css` + `src/components/Portfolio.tsx` got a
  fabric Colombian flag banner, photo brick/wood textures, scene lighting overlays. `public/textures/
  brick-color.jpg` + `wood-color.jpg` created (downscaled from CC0 scans via sharp).

## 3. Test status
No automated tests in this project. Verification is visual via the preview tool.

## 4. Decisions made and rationale (delta on the decision log)
- [0002-perspective-room-redesign.md](../../decisions/0002-perspective-room-redesign.md) — rebuild as a browser-assembled perspective room (CSS 3D), looks-3D but NOT real-time 3D.
- [0003-full-workflow-handson-execution.md](../../decisions/0003-full-workflow-handson-execution.md) — full planning + phases + handoffs, but build in the main session (no orchestration subagents); supersedes ADR-0001 (lightweight).

## 5. Outstanding questions for the user
- None blocking. The go-ahead to START Phase 1 is the only pending input (Francisco was about to give it).
- Deferred (not blocking): object→section mapping is proposed in Phase 3.

## 6. Known issues and tech debt added
- The CURRENTLY BUILT site is still the old flat-2D scene; Phase 1+ will largely rebuild the scene layer in `Portfolio.tsx` / `globals.css`. Reuse: the zoom-into-object interaction, the Spider-Verse poster, the photo brick/wood tiles.
- The 4-theme system (Field/Dusk × Light/Dark toggles + per-theme CSS vars) is to be STRIPPED in Phase 1 (Francisco: drop themes, one cozy scheme).
- Preview tool frequently wedges at ~529px mobile width; a fresh `preview_start` sometimes renders desktop (~961px). Desktop composition hard to verify through the tool.
- Turbopack stale-CSS cache: after CSS/font edits, stop server → `rm -rf .next` → restart (HMR reload sometimes suffices for simple CSS).
- Entire Next app is still untracked/uncommitted (by design — Francisco hasn't said to commit).

## 7. Files most relevant to the next session
- `docs/01_room-shell-and-camera.md` — the Phase 1 spec to execute.
- `src/components/Portfolio.tsx` — scene structure, the scroll/pan engine, the zoom-into-object trigger (dwell) + zoomview; this is where the perspective room + scroll-to-focus camera get built.
- `src/app/globals.css` — strip `[data-theme]`/`[data-palette]` theme blocks; carry/rework `.zoomview`, poster, lighting; add the CSS 3D room shell.
- `src/content/site.ts` — the 6 sections (About/Education/Experience/Skills/Involvement/Contact).
- `public/textures/brick-color.jpg`, `public/textures/wood-color.jpg` — existing CC0 tiles.
- `Private Random Stuff/Rooms/Room 1–3.jpg` — references (LOOK only; git-ignored). Vibe: cozy game
  bedrooms (Life is Strange / Edith Finch) — perspective depth, warm directional light, lived-in clutter.
- Load the `frontend-design` skill for Phase 1.

## 8. Environment state
- Dev server: `portfolio-dev` on port 3000 (`.claude/launch.json`).
- No migrations, env vars, or external services.
- Asset processing: sharp, run via `NODE_PATH="$(pwd)/node_modules" node`. Network/curl works for CC0 downloads (Poly Haven direct JPG URLs verified).

## 9. Exact command sequence to resume the dev environment
```bash
# from project root:
rm -rf .next
# then start the dev server via the preview tool (server name: portfolio-dev, port 3000)
# CC0 asset pattern (example): curl -sL -o .tex-tmp/x.jpg "<polyhaven direct jpg url>"
#   then downscale with sharp into public/textures/ , and rm -rf .tex-tmp
```
