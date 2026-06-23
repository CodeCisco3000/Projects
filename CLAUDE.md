<!-- managed-by: phased-workflow -->
# Portfolio — Francisco Cardenas

@AGENTS.md

A personal portfolio site for Francisco Cardenas (Civil Engineering &
Construction Management student). The live design is a **looks-3D perspective
room** built in the browser with CSS 3D transforms: a fixed camera glides
between focus points as you scroll/drag, plus a one-page "fast-lane" résumé view.

> **Heads up — README.md is stale.** It still describes the previous design
> ("The Drawing Set" blueprint sheet, four color themes). The *code* is the
> perspective-room redesign (ADR-0002) with a single warm scheme (ADR-0004).
> Trust the code and this file over README until README is rewritten.

## Stack
- **Next.js 16** (App Router) · **React 19** · **TypeScript** (strict) · **Tailwind CSS v4**
- Fonts via `next/font/google` (Space Grotesk, DM Sans, Space Mono)
- Hosted on **Vercel** (hobby/free tier); push to `main` auto-deploys
- ⚠️ `node_modules` may not be installed in a fresh checkout — run `npm install` first.

## Commands
| Task | Command | Notes |
|------|---------|-------|
| Install deps | `npm install` | Required before anything else in a fresh container |
| Dev server | `npm run dev` | http://localhost:3000 (see `.claude/launch.json`) |
| Production build | `npm run build` | |
| Start built app | `npm run start` | |
| Lint | `npm run lint` | ESLint flat config (`next/core-web-vitals` + `next/typescript`) |

There is **no test suite** in this repo.

## Repository layout
```
src/
  app/
    layout.tsx     # root layout: next/font setup + Metadata (title/desc from site.ts)
    page.tsx       # renders <Portfolio/> — nothing else
    globals.css    # THE visual system: CSS vars, the 3D room, anchors, résumé, responsive
    favicon.ico
  components/
    Portfolio.tsx  # the perspective-room UI + the scroll-to-focus camera engine ("use client")
  content/
    site.ts        # SINGLE SOURCE OF CONTENT — identity, stations, photos, resumeOrder
public/
  images/          # jobsite.jpg, asce.jpg, careerfair.jpg, spider-logo.png
.claude/launch.json  # dev launch config (npm run dev, port 3000)
next.config.ts · eslint.config.mjs · postcss.config.mjs · tsconfig.json
```
TypeScript path alias: **`@/*` → `src/*`** (e.g. `import { identity } from "@/content/site"`).

## The two layers — content vs. code
The project deliberately separates **what it says** from **how it looks/moves**:

- **`src/content/site.ts` — edit this for any normal content change.** All copy,
  jobs, skills, links, captions, and image paths live here. Exports:
  `identity`, `titleBlock`, `photoCaptions`, `photos`, the `Station` type +
  `stations[]` array, and `resumeOrder`. Each **station** (about, education,
  experience, skills, involvement, contact) becomes both a focus anchor in the
  room and a section in the résumé view. To swap a photo: drop the file in
  `public/images/` and update the matching `photos` path (keep the leading
  slash); reuse the same filename to replace without touching code.

- **`src/components/Portfolio.tsx` + `src/app/globals.css` — the design.** Rarely
  touched for content; this is where the room and motion live.

## How the room works (read before editing `Portfolio.tsx` / `globals.css`)
- **`globals.css` builds a real CSS-3D corner.** `.stage` sets `perspective`;
  `.camera` is the moving rig; `.room` holds five `.face` elements (back, left,
  right, floor, ceiling) under a shared `transform-style: preserve-3d`. Walls,
  floor, and lighting are pure CSS gradients/shadows — **no photo textures**
  (ADR-0004). The whole scheme is driven by CSS custom properties at `:root`
  (colors, room dims `--rw/--rh/--rd`, camera rig `--cam-*`, global dolly-back
  `--pull`).
- **`Portfolio.tsx` runs an imperative camera engine** (a `requestAnimationFrame`
  loop in a `useEffect`, intentionally *not* React-rendered each frame). Wheel,
  arrow/Page/Home/End keys, and pointer/touch drag all move a single `targetF`
  scalar; the loop eases `curF` toward it and writes the interpolated camera CSS
  vars (`--cam-x/y/z`, `--cam-ry/rx`, `--po-x`, `--room-ry`).
- **`ANCHORS[]`** (top of `Portfolio.tsx`) is the choreography: one entry per
  station, each with a surface (`face`), a position on it, and a `cam` target.
  The six stops run **left → right** so scrolling A→F sweeps with no backtracking:
  about → left wall (head-on), education/experience/skills → back wall, then
  involvement/contact → right wall.
  - **`rry` (the room's base yaw) is the key lever** for facing a wall. The
    resting three-quarter turn is `-14°`; the left-wall stop turns *further the
    same way* (`-55°`) to swing the left wall square-on. Turning the *other* way
    (toward `+deg`) shows the wall's back face — that's the "glitch through the
    wall" bug fixed in ADR-0006. When tuning anchors, keep turns going the same
    direction.
- **Accessibility / motion:** honors `prefers-reduced-motion` (snaps instead of
  easing); the résumé overlay closes on `Escape`. Keep both working.
- **The on-wall "object" markers say `object · phase 2`** — they're Phase 1
  placeholders standing in for the real hero objects (poster, flag, desk…) that
  later phases furnish.

## Project workflow & phases
This is a **planned, phase-by-phase redesign**, built hands-on in the main
session (ADR-0003, supersedes ADR-0001 — no orchestration subagents, so the
live-preview design loop stays tight). Commit per phase.

| # | Phase | Status |
|---|-------|--------|
| 1 | Room shell & camera | **done** (signed off 2026-06-20) |
| 2 | Hero objects: poster + flag | planned (next, not started) |
| 3 | Furnish & populate sections | planned |
| 4 | Lighting, polish, responsive, a11y | planned |
| 5 | Content finalize & ship | planned |

**Decisions of record (ADRs)** referenced throughout the code:
- **ADR-0002** — Redesign is a *looks-3D* perspective room assembled in the
  browser with CSS 3D, **not** real-time 3D (no WebGL/three.js).
- **ADR-0003** — Full planning + hands-on execution; build in the main session.
- **ADR-0004** — One warm "cozy evening" scheme; the old color themes were
  removed; desktop-first (keep mobile usable).
- **ADR-0006** — Phase 1 closeout: left-wall glitch fix, global pull-back
  (`--pull`), left→right tour order.

> **Note:** the planning tree this file historically pointed to
> (`docs/00_plan.md`, `docs/decisions/`, phase files, handoffs) is **not
> committed to this repository** — those artifacts are kept locally. Don't
> assume those paths resolve; the ADR summaries above capture what the code relies on.

## Conventions & standing rules
- **This is not the Next.js in your training data** (see `AGENTS.md`): APIs and
  conventions may differ. Read the relevant guide in
  `node_modules/next/dist/docs/` before writing Next.js code (install deps first).
- **All paths use forward slashes.**
- **Free-tier services only** (Vercel hobby); **CC0 assets only**. No paid SaaS
  without a new ADR.
- **Don't commit, push, or deploy unless Francisco asks** (or the task explicitly
  authorizes it).
- **Turbopack cache goes stale on CSS/font edits** — if styles look wrong, stop
  the dev server, `rm -rf .next`, and restart.
- **Never commit private files:** `Private Random Stuff/`, anything matching
  `*resume*`/`*Resume*`, `headshot.*`, and `SESSION_TURNOVER.md` are git-ignored
  by design — keep them out of the repo.
