# 0001. Run phased-workflow in lightweight mode

- Status: superseded
- Date: 2026-06-18
- Supersedes: none
- Superseded-by: 0003-full-workflow-handson-execution.md

> **Superseded by [0003-full-workflow-handson-execution.md](0003-full-workflow-handson-execution.md) on 2026-06-19.**

## Context
The portfolio is ~90% built. Remaining work is small iterative tweaks Francisco feeds one at a
time, plus accessibility/mobile polish and deployment. Francisco is a beginner and is concerned
about consuming his Claude usage quickly. The full phased-workflow orchestration (planner /
implementer / verifier / reviewer subagents, per-tweak ADRs, per-phase PRs) is designed for large
from-scratch builds and would burn more usage than it saves on small tweak-driven work.

## Decision
Run the phased-workflow in a **lightweight** form: keep the organizational scaffolding (plan doc,
decision log, session handoff for continuity) but do all work directly in the main session — no
orchestration subagents, no per-tweak ADRs, no per-phase PRs. Escalate to the full workflow only if
a genuinely large new feature comes up.

## Alternatives considered
- Full phased-workflow orchestration — rejected: too heavy for tweak-driven work; conflicts with the usage-time constraint.
- No workflow at all — rejected: Francisco has already lost context mid-project once; the handoff/plan scaffolding is cheap and prevents expensive re-derivation across sessions.

## Consequences
- Positive: low usage cost; fast turnaround on tweaks; session continuity preserved via handoff + plan docs.
- Negative: less formal review/test rigor than full mode; large features will need an explicit escalation.
- Neutral: the `<!-- managed-by: phased-workflow -->` marker stays in CLAUDE.md so the structure is recognized in future sessions.
