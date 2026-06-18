---
name: design-system
version: 1.0.0
description: Creates polished, on-brand artifacts as single self-contained HTML files that open in any browser and export to PDF — presentation decks (1600×900 slides), print documents (A4 pages like build plans, memos, reports, proposals), and social cards/carousels (LinkedIn document posts, X/OG images). Use when the user wants to turn notes, a markdown file, an outline, or a topic into a branded deck, slides, pitch, proposal, investor/LP/board update, build plan, decision memo, one-pager, report, carousel, or social post. One token contract re-skins every artifact to any brand; ships with a neutral, monochrome **base** brand you can use as-is or fork.
---

# Design System

A brand-neutral system for building on-brand artifacts as **single self-contained HTML files**.
One token contract and one brand layer feed multiple **output media**, each with its own engine.
No build step, no dependencies; open in a browser, export to PDF.

## Layered architecture

```
core/tokens.css       ← the brand CONTRACT: --c-* colours, --font-display/--font-sans, scales
core/primitives.css   ← CROSS-MEDIUM: emphasis helpers (.dim/.accent) + charts (.bar-chart/.hbars/.donut/.waterfall)
core/<medium>-core.css← the MEDIUM ENGINE (canvas, chrome, components, print) — one per medium
brands/<brand>/…      ← fills the contract: palette + @font-face + brand-specific components/logos
```

**Link order in every artifact:** `tokens → primitives → <medium>-core → brand`.
Load exactly **one** medium engine per file — the engines' `@page` rules conflict.

The included pack is **`brands/base/`** — a standalone, monochrome, warm-grey identity that
ships only openly-licensed fonts (Space Grotesk, Figtree + Space Mono, all SIL OFL). Use it as-is for
unbranded artifacts, or `cp -r brands/base brands/<newbrand>` and change the palette + fonts to
make your own. A brand can also be a **family** (a shared `_house.css` plus thin sub-brand files
that set only ink + accent); see `reference/BRAND-PACK.md`. Type has two roles
(`--font-display`, `--font-sans`); `--c-accent` (defaults to fg, so packs stay monochrome until
they set it) drives big numerals and accent emphasis.

## Pick the medium (router)

| | **Deck** | **Document** | **Social** |
|---|---|---|---|
| When | present live, pitch, board/LP update | read on screen/print: build plan, memo, report | feed content: LinkedIn carousel, X/OG card |
| Engine | `core/deck-core.css` + `core/deck-runtime.js` | `core/doc-core.css` (+ optional `doc-runtime.js`) | `core/social-core.css` (+ optional `doc-runtime.js`) |
| Canvas | `.deck-stage > .deck-canvas > .slide` (1600×900) | `.doc-stage > .doc-page` (A4 portrait) | `.social-stage > .social-card` (1080×1350 / 1080² / 1600×900) |
| Components | `reference/COMPONENTS.md` | `reference/DOC-COMPONENTS.md` | `reference/SOCIAL-COMPONENTS.md` |
| Template | `templates/deck.template.html` | `templates/doc.template.html` | `templates/social.template.html` |
| Output | arrow-key/swipe nav + PDF (`P`) | paged PDF with page numbers | carousel PDF (LinkedIn) or PNGs |

All media **share** the token contract, the brand packs, the narrative library, the charts,
and the emphasis helpers — so the same content stays on-brand across media.

## Workflow (any medium)

In this environment you have no shell — author the file in your reply and deliver
it with the `render_artifact` tool. Read every reference file with the
`read_skill_file` tool (e.g. `read_skill_file(skill="design-system",
path="reference/COMPONENTS.md")`); call it with no `path` to list everything.

```
Progress:
- [ ] 1. Medium: deck, document, or social? (router above)
- [ ] 2. Story: pick a narrative archetype, map content to a sequence (NARRATIVES.md)
- [ ] 3. Brand: use base, or a pack you have forked from it
- [ ] 4. Assemble: copy primitives from the medium's component file; fill REAL content
- [ ] 5. Build: start from the medium's template; reference assets with skill-root-relative paths
- [ ] 6. Deliver: call render_artifact with the full HTML — fix any unresolvedRefs it reports
```

1. **Get the story first.** Read `reference/NARRATIVES.md`; pick an archetype. Structure an uploaded md/outline into beats *before* writing markup.
2. **Pick the brand.** Default is the included `base` pack (neutral, monochrome warm grey). Read `brands/base/brand.md`.
3. **Assemble** by copying primitives — exact class names, change only content. Tone rules in `reference/AUTHORING.md`.
4. **Build from the template** (`templates/<medium>.template.html`). Its asset links are already **skill-root-relative** (`core/tokens.css`, `core/primitives.css`, `core/<medium>-core.css`, `brands/base/brand.css`, and the runtime `core/deck-runtime.js`) — keep them that way so `render_artifact` can resolve and inline them.
5. **Deliver with `render_artifact`** (filename + the full HTML). It collapses everything into one self-contained file (fonts embedded) and posts it to the thread. If it returns `unresolvedRefs` or `missingRefs`, fix those asset paths and call it again. The delivered HTML opens in any browser; decks export to PDF with the `P` key.

A worked example ships at `samples/base-sample.html` — a 7-slide deck rendered in `base`. Read it with `read_skill_file` to see a complete, correctly-linked file.

## Reference files (read with the `read_skill_file` tool, as needed)

- `reference/COMPONENTS.md` — **deck** slide primitives (copy-paste HTML). Read before writing slides.
- `reference/DOC-COMPONENTS.md` — **document** page primitives. Read before writing a document.
- `reference/SOCIAL-COMPONENTS.md` — **social** card primitives + carousel narrative. Read before writing cards.
- `reference/NARRATIVES.md` — deck + document archetypes and beat→component mappings. Read before structuring.
- `reference/AUTHORING.md` — tone rules, emphasis patterns (bold-then-dim, italic-accent), freestyle rules.
- `reference/BRAND-PACK.md` — the token contract spec and how to add a brand / sub-brand.
- `reference/BRAND-EXPANSION-PROMPT.md` — ready-made prompt to add a NEW brand from a filled `brands/_intake/brand-input.template.md` design file. Share this with a brand to onboard them.
- `reference/EVALUATIONS.md` — test scenarios for verifying the skill.

## Rendering & delivery (this environment)

The `render_artifact` tool does the bundling + delivery for you, in-process — no
shell, no dependencies, no setup. It inlines every linked stylesheet (following
local `@import`), embeds fonts and images as base64, inlines local scripts, and
verifies self-containment, then posts the single file to the Slack thread.

- Reference assets with **skill-root-relative** paths so the bundler resolves
  them (`core/tokens.css`, `brands/base/brand.css`, `core/deck-runtime.js`, …).
- `render_artifact` reports `missingRefs` / `unresolvedRefs` if a path is wrong —
  fix the paths and call it again until `selfContained` is true.
**Default delivery: prefer PDF.** A PDF previews inline in Slack and is the most
useful format for the reader, so for **decks and documents deliver a PDF by
default** when the `export_pdf` tool is available — call `export_pdf` (filename +
the full HTML). It renders server-side and, if that ever fails, automatically
falls back to delivering the self-contained HTML, so it is always safe to call.
The first render may take up to ~2 min (it builds a reusable snapshot); say so if
it helps set expectations. If it falls back to HTML, just say the artifact is
attached as HTML — don't tell the user the PDF service is "temporarily down" or
guess about whether it will work next time.

Use `render_artifact` (HTML) instead when:
- `export_pdf` is not in your tools this turn, or
- the user asks for an HTML / editable / live file, or
- it's a social carousel meant to be posted as-is.

Either way, reference assets with skill-root-relative paths; the delivered file
opens in any browser and decks export to PDF with the `P` key. Never tell the
user you "can't make a PDF" — either call `export_pdf`, or deliver the HTML and
note that it exports to PDF from the browser print dialog.

## Rules that keep artifacts on-brand

- These artifacts are the **user's own work product**. Never brand them "Ekko" or reference the assistant. Use the user's name/company for the wordmark and contact details; if you don't know it, leave the neutral `base` placeholders rather than inventing a brand.
- Never hardcode a colour or font. Use contract tokens (`var(--c-fg)`, `var(--c-accent)`, `var(--font-*)`); the brand pack supplies the values.
- Never edit `core/` to style a brand. Brand differences live only in `brands/<brand>/`.
- One medium engine per file. Decks: 2–3 dark slides max. Documents: place content per page and check it fits in print-preview. Social: one card size per file.
- Specific numbers over adjectives. One term per concept.

## Adding a brand / a medium

**Brand:** duplicate `brands/base/`, then swap the raw palette + `@font-face` + logos and map
them onto the `--c-*` contract (see `reference/BRAND-PACK.md`); make sure every contract token
is mapped and no raw hex leaks outside the palette block. Every medium re-skins automatically.
To onboard a brand from scratch, fill `brands/_intake/brand-input.template.md` and follow
`reference/BRAND-EXPANSION-PROMPT.md`.

**Medium:** add `core/<medium>-core.css` (its own canvas + `@page` + components, consuming only
the contract), a `templates/<medium>.template.html`, and a `reference/<MEDIUM>-COMPONENTS.md`.
The deck, document, and social engines are the worked examples.
