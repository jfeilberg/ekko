# Skills

Skills are packaged instructions that make Ekko good at a specific task — email
triage, meeting notes, producing beautiful documents, etc. They follow the open
[Agent Skills standard](https://agentskills.io) (a `SKILL.md` file with YAML
frontmatter), so skills authored here are portable to/from Claude Code, Goose,
opencode, and other adopters.

## How it works (progressive disclosure)

- **L1 — metadata (always loaded).** Every available skill's `name` +
  `description` is listed in the system prompt under `<available_skills>`. This is
  cheap (~tens of tokens per skill), so you can ship many skills without bloating
  context.
- **L2 — instructions (loaded on demand).** When a request matches a skill, the
  model calls the `load_skill` tool to pull the full `SKILL.md` body into context.
  Skills with `trigger: always` or a matched `trigger: keyword` are pre-injected
  by the runtime instead.
- **L3 — resources (coming).** Bundled `scripts/` and `assets/` for skills that
  need to execute code or render assets.

## Adding a skill

1. Create `agent/skills/<your-skill>/SKILL.md`. The directory name must
   match the frontmatter `name`.
2. Run `pnpm agent:build` to compile the catalog into the generated modules
   (`catalog.generated.ts` + `resources.generated.ts`). These are gitignored and
   regenerated automatically on `pnpm dev`, `build`, `test`, and `typecheck`, so
   they never drift from the `SKILL.md` sources.

## Bundled resources (L3)

A skill can ship supporting files next to its `SKILL.md` — references, CSS,
templates, fonts, images. These are compiled into `resources.generated.ts` and
exposed to the model through two tools:

- **`read_skill_file`** — read a text resource (e.g. `reference/COMPONENTS.md`)
  or list a skill's files.
- **`render_artifact`** — collapse an authored multi-file HTML artifact into one
  self-contained file (CSS inlined, fonts/images base64-embedded) and deliver it
  to the Slack thread. Runs in-process — no headless browser, no sandbox.
- **`export_pdf`** — optional; offered only when Vercel Sandbox is available
  (`EKKO_PDF_EXPORT`, on by default when `VERCEL_OIDC_TOKEN` is present). Renders
  the artifact to a PDF in a headless-Chromium sandbox and posts the file. When
  unavailable, the delivered HTML still exports to PDF from the browser print
  dialog, so the feature degrades gracefully. The first export builds a sandbox
  snapshot (chromium pre-installed) and stores its id in the `skill_cache` table;
  later exports boot from that snapshot, so only the first one pays the install
  cost. Falls back to a cold install if the snapshot is missing or expired.

The bundled `design-system` skill uses these to produce on-brand decks,
documents, and social cards as self-contained HTML (and PDF when configured).

```markdown
---
name: my-skill
description: What it does AND when to use it. Always visible to the model. <=1024 chars.
trigger: model        # model (default) | always | keyword
keywords: [foo, bar]  # auto-loads the skill when trigger: keyword and a keyword matches
required_tools: []    # soft hint: toolkit/tool slugs this skill works best with
---

# My skill

Concise, third-person instructions. Keep the body under ~500 lines.
```

## Authoring tips (from Anthropic's skill best-practices)

- Write the `description` in the third person and state **both what it does and
  when to use it** — the model picks skills off the description alone.
- Keep the body concise; assume the model is already capable and only add what it
  wouldn't know.
- Make skills degrade gracefully: if a required tool isn't connected, the skill
  should tell the user how to connect it rather than guessing.
- Never have a skill take an irreversible action (send, post, delete) without
  explicit user confirmation.

## Configuration

- `EKKO_ENABLED_SKILLS` — comma-separated allow-list. Empty = all catalog skills.
- `EKKO_MAX_ACTIVE_SKILLS` — cap on `always`/`keyword` bodies auto-injected per
  turn (default 3). Model-loaded skills are not capped.
