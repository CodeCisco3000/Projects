# 0006. Camera tour finalized: left→right stop order, left wall via room-rotation, global pull-back

- Status: accepted
- Date: 2026-06-20
- Supersedes: none
- Refines: 0005 (camera travels & turns between walls)

## Context
ADR-0005 built the travel-and-turn camera rig and explicitly **deferred a "sensible spatial tour
order" to Phase 2/3**. Reviewing the built Phase 1 in the live preview, Francisco raised three issues:
1. The education (left-wall) stop **"glitched through the wall"** — the view filled with a flat,
   mirrored wall. Diagnosis: the stop turned the whole room the **wrong way** (`rry:+46`), which swung
   the left wall's *back* toward the camera, so we were behind it looking at its mirrored backface.
   (The prior session's DOM-measurement "passed" because a backface up close measures the same width as
   a frontface up close — only the rendered pixels showed it was reversed.)
2. Every view felt **too close**, with no room to add real objects later.
3. The scroll progression **jumped around** the room (back → left → back → right → back) instead of
   moving in order.

## Decision
- **Left wall is faced by turning the whole ROOM toward it** (`--room-ry` to `-55°`), not by camera yaw.
  Turning the room *toward* the wall (more negative) brings its painted inner face square-on; turning it
  the other way (positive) shows the mirrored backface — that was the bug. Back-wall and right-wall stops
  keep the resting room turn (`-14°`); right-wall stops still face via camera yaw (`ry:54`).
- **The six stops are laid out left→right** so scrolling the lettered sections A→F sweeps the camera
  across the room with no backtracking: **About (A) = left wall** (the stop the page lands on);
  **Education/Experience/Skills (B,C,D) = back wall, left→right**; **Involvement/Contact (E,F) = right
  wall, back→front.** This realizes the tour order ADR-0005 deferred.
- **A single global "dolly-back" knob** (`--pull`, ≈ `-250px`, applied as the outermost transform on
  `.camera`) steps *every* view back at once — breathing room now, and space to furnish in Phase 2 —
  without re-tuning each anchor (relative framing is preserved).

## Alternatives considered
- Face the left wall with camera yaw only (like the right wall) — rejected: the room's resting turn
  leaves the left wall edge-on, so the marker collapsed to an unreadable sliver.
- Turn the room the other way (`+deg`) — rejected: that *is* the "glitch through the wall" (mirrored
  backface filling the frame).
- Move education off the left wall onto the back/right wall — rejected: Francisco wanted the left wall
  used; room-rotation makes it read head-on, so the wall earns its place.
- Pull each anchor back individually — rejected: one global knob keeps relative framing and is a single
  number to tune.

## Consequences
- Positive: scrolling now reads as one smooth left→right tour of the room; the left wall is usable
  head-on; every stop has breathing room for real objects.
- Negative: **About lands on a side wall** (left) rather than the back wall — accepted, as the head-on
  left-wall view is the cleanest single-wall shot and a strong opener. Per-object framing remains
  **viewport-width sensitive** (carried from ADR-0005) — to be hardened in Phase 2 when real objects land.
- Neutral: facing is now **mixed** (left wall = room rotation, right wall = camera yaw). It works; a
  later phase could unify the two mechanisms if it simplifies object placement.
