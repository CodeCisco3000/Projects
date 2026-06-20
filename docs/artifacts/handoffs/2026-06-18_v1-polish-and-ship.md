# Turnover: Phase 1 — v1 polish and ship

- Created: 2026-06-18
- Project: C:/Users/Francisco/Desktop/Projects/Portfolio
- Branch: main
- Continues from: SESSION_TURNOVER.md (informal, now superseded by this handoff)

## 1. Current phase number and status
Phase 1: Polish & ship v1 — in progress. Running lightweight (ADR-0001).

## 2. What was completed this session, file by file
- Hero block replaced with a **Spider-Verse-style poster** taped to the brick wall (Jinx/Arcane
  heavy-contrast neon splash behind a real spider logo PNG). Francisco approved the look.
- `src/components/Portfolio.tsx` — `.hero` markup → `.poster` structure; `HERO_W` set to 310 (desktop) / 244 (mobile).
- `src/app/globals.css` — full poster styles (tape, conic-gradient ray burst, radial black fade, spider with `mix-blend-mode: screen`).
- `public/images/spider-logo.png` — copied from `Private Random Stuff/References/Spider Logo.png`.
- Phased-workflow scaffolding added: CLAUDE.md (thin index), docs/00_plan.md, ADR-0001.
- `src/content/site.ts` — cleared the unverified flags on LinkedIn + email (both confirmed correct).

## 3. Test status
No automated tests in this project. Verification is visual via the preview tool.

## 4. Decisions made and rationale (delta on the decision log)
- [docs/decisions/0001-lightweight-workflow.md](../../decisions/0001-lightweight-workflow.md) — run phased-workflow lightweight to protect usage.

## 5. Outstanding questions for the user
- None open. Francisco will supply tweaks one at a time.

## 6. Known issues and tech debt added
- Preview tool has been stuck at ~529px (mobile width) — **desktop layout never verified**. Check before deploy.
- Mobile composition needs polish (room short, brick above the cards).
- Entire Next app is still untracked — first commit pending.

## 7. Files most relevant to the next session
- `src/content/site.ts` — all editable content (identity, stations).
- `src/components/Portfolio.tsx` — room scene + `.hero`/poster markup + layout `useEffect`.
- `src/app/globals.css` — all styling, 4 themes, poster, brick/floor layers.

## 8. Environment state
- Dev server: `portfolio-dev` on port 3000 (see `.claude/launch.json`).
- No migrations, no env vars, no external services.

## 9. Exact command sequence to resume the dev environment
```bash
# from project root; if CSS/fonts look stale, clear the Turbopack cache first:
rm -rf .next
# then start the dev server via the preview tool (server name: portfolio-dev, port 3000)
```
