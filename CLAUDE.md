<!-- managed-by: phased-workflow -->
# Portfolio — Francisco Cardenas

@AGENTS.md

## Active phase
**Perspective-room redesign** (ADR-0002). **Phase 1: Room shell & camera — done** (signed off 2026-06-20; left-wall glitch fixed, global pull-back, left→right tour order — ADR-0006). Next: **Phase 2 — Hero objects: poster + flag** (planned, not started).

## Pointers
- Plan: [docs/00_plan.md](docs/00_plan.md)
- Decision log: [docs/decisions/](docs/decisions/)
- Current turnover: [docs/artifacts/handoffs/2026-06-20_phase1-closeout.md](docs/artifacts/handoffs/2026-06-20_phase1-closeout.md)

## Phase index
| # | Name | Status | Closeout date | Phase file |
|---|------|--------|---------------|------------|
| 1 | Room shell & camera | done | 2026-06-20 | [docs/01_room-shell-and-camera.md](docs/01_room-shell-and-camera.md) |
| 2 | Hero objects: poster + flag | planned | — | tracked in [docs/00_plan.md](docs/00_plan.md) |
| 3 | Furnish & populate sections | planned | — | tracked in [docs/00_plan.md](docs/00_plan.md) |
| 4 | Lighting, polish, responsive, a11y | planned | — | tracked in [docs/00_plan.md](docs/00_plan.md) |
| 5 | Content finalize & ship | planned | — | tracked in [docs/00_plan.md](docs/00_plan.md) |

## Standing rules
- **Full planning, hands-on execution (ADR-0003, supersedes ADR-0001):** locked plan + phases + decision log + handoffs, but build in the main session (no orchestration subagents) for the live-preview design loop. Commit per phase.
- Redesign = looks-3D perspective room assembled in the browser (CSS 3D), NOT real-time 3D (ADR-0002).
- All paths use forward slashes.
- Free-tier services only (Vercel hobby); CC0 assets only — no paid SaaS without an ADR.
- Don't commit/push/deploy until Francisco says so.
- Turbopack cache goes stale on CSS/font edits — stop server, `rm -rf .next`, restart.
- `Private Random Stuff/` is git-ignored (résumés, references, raw textures) — never commit it.
