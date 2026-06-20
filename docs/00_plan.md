# Portfolio — Plan

> **Redesign in progress (ADR-0002).** The site is being rebuilt from a flat 2D elevation into a
> perspective room. Running full planning, hands-on execution (ADR-0003).

## Product summary
Francisco Cardenas's personal **portfolio website** — a **room you peer into**, rendered with real
perspective depth and warm, cozy evening light, that an employer scrolls through to **focus on and
inspect personal objects** which tell his story (who he is, work he's done, goals ahead). Personal
but professional. For: employers and recruiters in civil engineering / construction. **v1 success =
live on Vercel, reads convincingly as a real lived-in room on desktop and mobile, gives a glimpse of
Francisco while staying professional, LinkedIn + email correct.**

## Look & feel (from ADR-0002 + Q&A 2026-06-19)
- **Approach:** perspective room *assembled in the browser* — looks 3D, but not real-time 3D.
- **Camera:** fixed corner-of-room view; scrolling glides/zooms focus between objects.
- **Mood:** warm evening — lamps & string lights, soft shadows, cozy.
- **Detail:** lived-in but curated (personal, still reads professional).
- **Color:** the 4-theme system is dropped; one basic warm/cozy scheme for now (Francisco, 2026-06-19; revisit later).
- **References:** `Private Random Stuff/Rooms/` (Life is Strange / Edith Finch energy — *look only,
  not content*). Honest target: a stylized-realistic interpretation, not a pixel-match to AAA renders.
- **Keep:** the Spider-Verse poster; a realistic Colombian flag; all current sections.

## Stack
- Runtime / language: Node + TypeScript
- Framework: Next.js (unconventional version — see AGENTS.md; read `node_modules/next/dist/docs/` first)
- Styling: plain CSS (`src/app/globals.css`) — perspective via **CSS 3D transforms**; no UI library, no WebGL
- Dev server: Turbopack
- Database: none — content static in `src/content/site.ts`
- Auth: none
- Hosting / deployment: Vercel (hobby / free tier)
- Repo: github.com/BootySaturn/Projects (origin/main)
- Assets: CC0 only (Poly Haven, ambientCG, similar). Source maps/cutouts, downscale to web tiles
  (sharp) into `public/textures/` & `public/images/`. Originals stay in git-ignored `Private Random Stuff/`.

## Data model
Static only. Text/links live in `src/content/site.ts`. No database, no CMS, no user data.

## Browser / device targets
Modern evergreen browsers, desktop + mobile responsive.

## Cross-cutting decisions
- Budget: free tier only (Vercel hobby); CC0 assets only.
- Data sensitivity: none beyond public contact info (email, LinkedIn — confirmed public 2026-06-18).
- Regulatory / offline / i18n: none.
- Accessibility: target **WCAG 2.1 AA** (alt text, contrast, keyboard navigation) — Phase 4.
- Workflow: full planning + decision log + handoffs; **hands-on execution in the main session**
  (ADR-0003). Go-all-in on usage. Commit per phase; push/deploy only on Francisco's say-so.

## Out of scope (v1)
- Real-time / free-roam 3D (game engine, WebGL)
- CMS / accounts / analytics / blog / contact-form backend
- i18n / localization

## Definition of Done (project-wide)
- [ ] Reads convincingly as a real, lived-in perspective room (depth + warm light) on desktop AND mobile.
- [ ] Every section reachable by focusing/inspecting its object; poster + realistic flag present.
- [ ] LinkedIn + email correct and live. (confirmed 2026-06-18)
- [ ] WCAG 2.1 AA basics: alt text, readable contrast, keyboard-navigable.
- [ ] No leftover `TODO`/`FIXME` in shipped code; assets reasonably optimized for web.
- [ ] README explains what the site is + how to run/deploy.
- [ ] Committed, pushed, deployed live on Vercel.

## Phase list
| # | Name | Objective | Complexity | Status |
|---|------|-----------|-----------|--------|
| 1 | Room shell & camera | Build the perspective room shell (walls + floor in CSS 3D, warm lighting) and the fixed-camera, scroll-to-focus navigation. **De-risks the approach.** | L | done (2026-06-20) |
| 2 | Hero objects: poster + flag | Place the Spider-Verse poster and a realistic Colombian flag on the wall in correct perspective; wire the inspect/zoom-into-object interaction. | M | planned |
| 3 | Furnish & populate sections | Add the remaining room objects (sourced CC0 furniture/props) mapped to the sections; each opens its content. | L | planned |
| 4 | Lighting, polish, responsive, a11y | Final lighting/shadow/depth pass, mobile layout, performance (asset budgets), accessibility. | M | planned |
| 5 | Content finalize & ship | Lock content/copy, README, commit, push, deploy to Vercel. | S | planned |

> Phase files: `docs/0N_<name>.md`. Phase 1 skeleton at [docs/01_room-shell-and-camera.md](01_room-shell-and-camera.md).
> Prior v1 polish (photo brick/wood, poster, fabric flag, zoom-into-object interaction) carries
> forward as inputs/assets to the redesign.

## Deferred questions
| # | Question | Status / revisit |
|---|----------|------------------|
| 1 | Exact object → section mapping (which item opens which section) | OPEN — Claude proposes in Phase 3, Francisco tweaks |
| 2 | Which personal props to include | RESOLVED (2026-06-19) — carry over the existing objects (bed, desk, dresser, shelf, hard hat, skates, soccer ball, window, door, etc.); Francisco will revise later |
| 3 | Color themes | RESOLVED (2026-06-19) — drop the 4-theme system; use one basic warm/cozy scheme for now, revisit later |
