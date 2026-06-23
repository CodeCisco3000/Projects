<!-- managed-by: phased-workflow -->
# Portfolio — Francisco Cardenas

@AGENTS.md

## Active phase
**PIVOT to real-time 3D — ADR-0010 (supersedes ADR-0002).** Francisco chose real 3D (Three.js /
react-three-fiber) over the CSS-3D room after seeing a real model in-page. **Phase 3 re-scoped:** rebuild
the room in 3D matching the current feel — room shell + warm light + scroll-wheel camera between the 6
stops + the 5 placeholder markers + click-to-inspect (cards/résumé reused as HTML overlays from
`site.ts`), **minus the PC/desk and window** — then furnish with royalty-free `.glb` models. The CSS work
(Phases 1–3: room shell, camera, poster, desk/window) is being **replaced**; `site.ts` + inspect-card/résumé
UI carry over. **All work uncommitted** (Francisco gates the save). **First 3D step landed:** room shell +
warm lighting + scroll/keys/focus-rail camera between the 6 stops + 5 markers + click-to-inspect rebuilt in
react-three-fiber (CSS room/poster/desk/window removed). Next: real furniture (.glb) + live framing/lighting
tuning in a real browser (the headless preview can't hold a WebGL context — see Phase 3 log).

## Pointers
- Plan: [docs/00_plan.md](docs/00_plan.md)
- Decision log: [docs/decisions/](docs/decisions/)
- Current turnover: [docs/artifacts/handoffs/2026-06-23_190710_phase-3_3d-rebuild-and-camera.md](docs/artifacts/handoffs/2026-06-23_190710_phase-3_3d-rebuild-and-camera.md)

## Phase index
| # | Name | Status | Closeout date | Phase file |
|---|------|--------|---------------|------------|
| 1 | Room shell & camera | done | 2026-06-20 | [docs/01_room-shell-and-camera.md](docs/01_room-shell-and-camera.md) |
| 2 | Hero objects: poster + flag | done (uncommitted) | 2026-06-22 | [docs/02_hero-objects-poster-flag.md](docs/02_hero-objects-poster-flag.md) |
| 3 | Furnish & populate sections | in progress | — | [docs/03_furnish-sections.md](docs/03_furnish-sections.md) |
| 4 | Lighting, polish, responsive, a11y | planned | — | tracked in [docs/00_plan.md](docs/00_plan.md) |
| 5 | Content finalize & ship | planned | — | tracked in [docs/00_plan.md](docs/00_plan.md) |

## Standing rules
- **Full planning, hands-on execution (ADR-0003, supersedes ADR-0001):** locked plan + phases + decision log + handoffs, but build in the main session (no orchestration subagents) for the live-preview design loop. Commit per phase.
- Redesign = real-time 3D room (Three.js / react-three-fiber), rebuilt to match the CSS room's feel (ADR-0010, supersedes ADR-0002).
- All paths use forward slashes.
- Free-tier services only (Vercel hobby); CC0 assets only — no paid SaaS without an ADR.
- Don't commit/push/deploy until Francisco says so.
- Turbopack cache goes stale on CSS/font edits — stop server, `rm -rf .next`, restart.
- `Private Random Stuff/` is git-ignored (résumés, references, raw textures) — never commit it.
