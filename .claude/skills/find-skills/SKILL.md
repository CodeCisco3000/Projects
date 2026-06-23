---
name: find-skills
description: >-
  Discover, load, and (when missing) scaffold the right skill for any task.
  Use this skill at the START of any non-trivial request — especially when the
  user asks for something specialized (research, code review, security review,
  building a doc/spreadsheet/slide deck, configuring Claude Code, creating a
  new skill) or says things like "use the right skill", "find a skill for
  this", "what skills do you have", "pull in whatever you need", or "is there a
  skill that…". Always reach for this before answering from memory when a
  capability might already exist as a skill, so the best available tool is
  actually used instead of being reinvented from scratch.
---

# Find Skills

The point of this skill: before doing a task the hard way, check whether a
purpose-built skill already exists, **load it**, and use it. If nothing fits,
either compose existing skills or scaffold a small new one in this repo so the
capability is captured for next time. This matters because skills carry
hard-won, tested workflows — using them beats improvising, and on Claude Code
on the web (phone sessions included) it means the same capabilities follow this
branch everywhere.

## The four places skills can come from

1. **Built-in Claude Code skills** — shipped with the CLI, always available in
   every session (web, phone, desktop). You don't import these; they're already
   there. They show up in the `available_skills` list and are invoked with the
   `Skill` tool. Typical ones: `deep-research`, `code-review`, `security-review`,
   `verify`, `run`, `init`, `review`, `simplify`, `loop`, `update-config`,
   `keybindings-help`, `claude-api`, `fewer-permission-prompts`,
   `session-start-hook`. The exact list lives in the `<system-reminder>` that
   enumerates available skills — trust that list, not memory.

2. **Project skills — `.claude/skills/<name>/SKILL.md`** (this is where THIS
   skill lives). Committed to the repo, so they travel with the branch to any
   device. This is the only category you can add to by committing files.

3. **User skills — `~/.claude/skills/<name>/SKILL.md`.** Per-machine, not in the
   repo. Useful locally but they do NOT follow the branch to a phone session.

4. **Anthropic's bundled skill library — `/mnt/skills/`** (when present in the
   container). `/mnt/skills/public/` has document skills (`docx`, `pdf`, `pptx`,
   `xlsx`, `frontend-design`, …) and `/mnt/skills/examples/` has many more,
   including `skill-creator` (the canonical guide to authoring skills). These
   are reference material you can read and, if useful, copy into
   `.claude/skills/` so they're committed and portable.

## Workflow

### Step 1 — Survey what already exists
- Read the `available_skills` list in the latest `<system-reminder>` for
  built-in + project + user skills.
- List repo + bundled skill files to see what's on disk:
  ```bash
  ls .claude/skills/ 2>/dev/null
  ls ~/.claude/skills/ 2>/dev/null
  ls /mnt/skills/public /mnt/skills/examples 2>/dev/null
  ```
- For deferred *tools* (not skills) — e.g. GitHub, web search/fetch, notebooks —
  use the `ToolSearch` tool with a keyword query or `select:<name>` to load
  their schemas before calling them. Skills and deferred tools are different
  mechanisms; check both.

### Step 2 — Pick the best match
- If a skill clearly fits the task, **invoke it** via the `Skill` tool (e.g.
  `deep-research` for a cited research report, `code-review` for reviewing a
  diff, `update-config` for settings.json/permissions/hooks). Prefer a real
  skill over improvising.
- If several could apply, choose the most specific one. Don't stack skills that
  do the same job.
- A skill description being a close keyword match isn't enough — confirm the
  task actually benefits. Simple one-step asks usually don't need a skill.

### Step 3 — When nothing fits, bring the capability in
Two options, cheapest first:

- **Copy an existing bundled skill into the repo** so it's committed and
  portable. Example:
  ```bash
  mkdir -p .claude/skills
  cp -r /mnt/skills/examples/skill-creator .claude/skills/skill-creator
  ```
  Only do this when the user wants that capability to live with the branch.

- **Scaffold a new skill** following the format in this file (and, for the full
  authoring/eval loop, read `/mnt/skills/examples/skill-creator/SKILL.md` if it
  exists). Minimum viable skill:
  ```
  .claude/skills/<name>/
  └── SKILL.md   # YAML frontmatter (name, description) + imperative instructions
  ```
  Frontmatter `name` must match the directory name. The `description` is what
  makes the skill trigger — state both what it does AND when to use it, and lean
  slightly "pushy" since skills tend to under-trigger. Keep SKILL.md focused;
  push long reference material into `references/` and scripts into `scripts/`.

After adding a skill to `.claude/skills/`, mention it to the user and (only if
they've asked you to commit) commit it so it ships with the branch.

## Honest notes / gotchas
- **Built-in skills can't be "imported" into the repo** — their source isn't on
  disk; they're embedded in the CLI and already available everywhere. Don't try
  to copy them; just invoke them.
- A newly committed project skill is picked up on the next session that opens
  the repo. Within the current session, you can still act on its contents by
  reading the SKILL.md directly.
- Don't invoke a skill that's already running, and don't invent skill names —
  only use names that appear in the `available_skills` list or exist on disk.
- This repo's house rules (see `CLAUDE.md` / `AGENTS.md`) still apply to
  anything a skill produces — e.g. don't commit/push unless asked, free-tier &
  CC0 only.
