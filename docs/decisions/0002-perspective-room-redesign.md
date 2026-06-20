# 0002. Redesign from flat 2D elevation to a perspective room

- Status: accepted
- Date: 2026-06-19
- Supersedes: none
- Superseded-by: none

## Context
The v1 site renders the room as a flat, front-on "elevation" (line-drawn furniture over a brick
wall + wood floor, panned horizontally). After several polish passes (real brick/wood photo
textures, lighting overlays, the Spider-Verse poster, a fabric flag banner), Francisco concluded
the flat 2D approach fundamentally can't read as a real space — "I don't think the flat 2d is going
to work." The geometry itself is flat, so no texture/lighting tweak fixes it.

Francisco's vision: a room you peer into that looks like a real, lived-in space (depth/perspective,
warm light), personal enough to give an employer a glimpse of him while staying professional, where
scrolling lets you focus on and inspect objects that tell his story. He supplied three reference
renders (cozy game-style bedrooms — Life is Strange / Edith Finch energy) for the *look* only, not
content. Chosen direction (Q&A 2026-06-19): looks-3D but not real-time 3D ("Option A"); fixed
corner-of-room camera with scroll-driven focus; warm cozy evening light; lived-in but curated.

## Decision
Rebuild the scene as a **perspective room assembled in the browser** — real depth via CSS 3D
transforms (walls + floor as planes in perspective), textured with sourced CC0 materials, lit with
warm directional gradient lighting, and populated with **individually placed, inspectable objects**
(poster, flag, furniture). A fixed camera looks into a corner of the room; scrolling glides/zooms
the focus between objects, each of which opens its section (reusing the existing zoom-into-object
interaction). NOT real-time 3D (no game engine / WebGL). Realism comes from sourced assets +
perspective + lighting, not from a custom 3D render (which cannot be produced in this environment).

## Alternatives considered
- Keep flat 2D elevation — rejected: the thing Francisco explicitly wants to leave behind.
- Real-time 3D (Three.js / R3F, free-roam) — rejected for now: much larger build, performance/asset
  burden, and a likely time-sink that distracts from content; revisit only if the assembled
  approach can't deliver enough "room" feel.
- A single baked/found room render with flat hotspots — rejected: can't place Francisco's own
  poster/flag convincingly, and objects wouldn't be individually inspectable elements.

## Consequences
- Positive: genuine perspective depth; every object is a real, interactive element; deploys free on
  Vercel; no heavy 3D runtime.
- Negative: a significant rebuild of the scene layer; the result is a stylized-realistic
  interpretation, not a pixel-match to the AAA game references (expectation set with Francisco).
- Neutral: prior polish work (photo brick/wood, poster, flag, zoom-into-object interaction) carries
  forward as inputs/assets. Approach is de-risked in Phase 1 before furnishing.
