# 0004. Normal painted-room materials; desktop-first composition

- Status: accepted
- Date: 2026-06-19
- Supersedes: none
- Superseded-by: none

## Context
The Phase 1 spec (`docs/01_room-shell-and-camera.md`) carried the v1 photo textures
(`public/textures/brick-color.jpg`, `wood-color.jpg`) forward as surface inputs, and its acceptance
criteria weighted desktop and mobile equally. During Phase 1 kickoff Francisco gave two corrections:
(1) do **not** keep the exposed brick + rough wood; go with "whatever the most normal is for a nice
room." (2) Focus on the **browser/desktop view** over mobile.

## Decision
- **Materials:** Drop the brick and wood photo textures. The room reads as an ordinary nice
  room — painted/plaster walls in a warm neutral, and a tasteful plain floor (smooth wood or neutral
  tone), achieved primarily with CSS color/gradient/shadow rather than heavy photo tiles. New CC0
  material assets only if plain CSS can't sell it.
- **Viewport priority:** Compose and verify **desktop-first**. Mobile must not break, but the
  perspective composition is judged on desktop; mobile is a graceful adaptation, not a co-equal target.

## Alternatives considered
- Keep brick/wood — rejected: Francisco's explicit direction.
- Equal desktop+mobile parity in Phase 1 — rejected: splits effort on the riskiest phase; the
  preview tool is also unreliable at mobile width (see handoff §6).

## Consequences
- Positive: cleaner, more universally "nice room" look; lighter assets; clearer Phase 1 focus.
- Negative: the existing brick/wood tiles become unused (kept on disk for now, may be deleted later).
- Neutral: mobile polish deferred to Phase 4 (responsive/a11y), consistent with the plan.
