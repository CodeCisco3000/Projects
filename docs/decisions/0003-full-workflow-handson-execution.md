# 0003. Upgrade to full planning, hands-on execution

- Status: accepted
- Date: 2026-06-19
- Supersedes: 0001-lightweight-workflow.md
- Superseded-by: none

## Context
ADR-0001 ran the project "lightweight" because the remaining work was small tweaks and Francisco
wanted to conserve usage. The perspective-room redesign (ADR-0002) is a genuinely large rebuild
spanning multiple sessions, with real architectural decisions and asset sourcing — exactly the
"dial it up" case ADR-0001 anticipated. Francisco has explicitly opted to go all-in on usage for
this and asked to run it under the phased workflow.

## Decision
Adopt the **full phased-workflow planning discipline** for the redesign: a locked plan, a phased
breakdown, an ADR per non-trivial decision, and session handoffs at phase ends. BUT keep
**execution hands-on in the main session** rather than delegating to orchestration subagents,
because this is design-heavy work that depends on the tight edit → live-preview → react loop with
Francisco (subagents cannot watch the browser preview). Commit per phase; defer push/deploy until
Francisco says so (unchanged).

## Alternatives considered
- Stay lightweight (ADR-0001) — rejected: a multi-session rebuild needs phase structure and a
  decision log to avoid getting lost / redoing work (we have already hit context limits once).
- Full orchestration with planner/implementer/verifier/reviewer subagents — rejected: cold-start
  cost and the inability of subagents to use the live preview make them counterproductive for
  iterative visual design; the value is in the planning, not the parallel code execution.

## Consequences
- Positive: structured, resumable build; decisions and progress documented across sessions.
- Negative: more process overhead than lightweight mode (acceptable — Francisco opted in).
- Neutral: the per-phase push + PR convention applies, but actual push/deploy still waits for
  Francisco's explicit go-ahead.
