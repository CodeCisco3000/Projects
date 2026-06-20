# 0005. Camera travels & turns between walls (objects on any surface)

- Status: accepted
- Date: 2026-06-19
- Supersedes: none
- Refines: 0002 (perspective-room redesign)

## Context
ADR-0002 described a "fixed corner-of-room camera with scroll-driven focus." During Phase 1, placing
readable placeholders only worked on the **back wall** under a truly fixed camera — the side walls sat
at a grazing angle (text collapsed to slivers) and the floor foreshortened to an unreadable line, so
Phase 1 initially parked all six anchors on the back wall. Reviewing that, Francisco said he wants the
experience to **"go between all the walls"** once real objects are added — i.e. scrolling should carry
you *around* the room to objects on the left wall, right wall, and floor, not just along one wall.

## Decision
Evolve the camera from strictly fixed to a **travel-and-turn rig**: each focus target carries not just a
dolly/zoom but a **turn** (`ry` yaw / `rx` pitch) so the camera rotates to face whichever surface its
object lives on. Objects may therefore live on the **back wall, both side walls, or the floor**, and each
is framed roughly head-on when focused. Scrolling glides *and turns* between them, so the room is toured,
not just panned. The room also got a small base yaw/pitch (a three-quarter corner resting view) and was
enlarged + pulled back per Francisco's feedback the same day.

Implementation: the rAF camera engine lerps `--cam-x/y/z` (truck/pedestal/dolly) **and** `--cam-ry/rx`
(yaw/pitch) between per-anchor targets. Fully facing a side wall self-centers it but fills the frame with
bare wall; a **moderate turn + slight pull-back** keeps the object on its wall *with* room context, which
reads better for real objects.

## Alternatives considered
- Keep all objects on the back wall (strict fixed camera) — rejected: underuses the room and isn't the
  "around the room" feel Francisco wants.
- Free-fly / first-person controls — rejected: out of scope, disorienting, and against the curated
  scroll-to-focus model.

## Consequences
- Positive: objects can be distributed across the room; the camera turning to each is the core "wow".
- Negative: per-object camera framing is **viewport-width sensitive** (tuned at ~961px desktop). Phase 2
  should make framing more robust (viewport-relative units / a fit calc) when real objects land. Flat
  labels on the **floor** still read weakly — real floor presence should be **3D furniture standing on
  it** (desk, plant) rather than flat plaques.
- Neutral: validated in Phase 1 with placeholders (one per wall + floor); real objects + a sensible
  spatial tour order are Phase 2/3.
