# Evaluations

Test scenarios for verifying the design-system skill works as intended in ekko. Each lists a
query, inputs, and the behaviour a correct run should exhibit. To run one: message the bot the
query (attaching any files), and check the result against `expected_behavior`.

## How to check a result quickly

- The bot should `load_skill("design-system")`, then `read_skill_file` the references it needs
  (the medium's component file, the brand, a template) before authoring.
- It should deliver via `render_artifact` (or `export_pdf` when a PDF is explicitly requested).
  A correct artifact comes back with `selfContained: true` and no `missingRefs`/`unresolvedRefs`.
- Open the delivered HTML: it should render fully offline (fonts embedded) and match the brand.

---

## Eval 0 — Pick the right medium

```json
{
  "skill": "design-system",
  "query": "Make a 100-day integration plan for our first acquisition.",
  "files": ["deal-notes.md"],
  "expected_behavior": [
    "Recognises this is a read/print DOCUMENT (a plan), not a presentation deck, and uses the document medium",
    "Links core/doc-core.css (not deck-core.css) plus tokens.css + primitives.css + a brand pack",
    "Uses .doc-page A4 pages with header/footer + page numbers, and doc-* primitives (sections, tasklists, timeline, risks)",
    "Never links two medium engines; render_artifact returns selfContained: true"
  ]
}
```

## Eval 1 — Markdown → branded deck (the core use case)

```json
{
  "skill": "design-system",
  "query": "Turn this markdown into an investor deck.",
  "files": ["notes.md"],
  "expected_behavior": [
    "Picks a narrative archetype (e.g. fundraising pitch or LP update) and maps the notes to a slide sequence before writing markup",
    "Links tokens.css + primitives.css + deck-core.css + brands/base/brand.css (skill-root-relative), in that order",
    "Uses only primitives from COMPONENTS.md with contract tokens (var(--c-*)) — no hardcoded hex colours or fonts",
    "Produces a title slide and a closing slide; closing uses .title-block so the subtitle cannot overlap the line beneath it",
    "render_artifact returns selfContained: true with no missingRefs"
  ]
}
```

## Eval 2 — Add a new brand (the one-contract re-skin)

```json
{
  "skill": "design-system",
  "query": "Add a brand 'Northwind' — navy #1B2A4A on white, accent gold #C8A24B, Inter for everything. Then make a one-slide title deck for it.",
  "files": [],
  "expected_behavior": [
    "Maps the navy/white/gold palette onto the --c-* contract and sets --font-display/--font-sans, without referencing any other brand's raw tokens",
    "Adds an @font-face (or web-font link) for Inter and follows the BRAND-PACK checklist",
    "Does NOT edit anything in core/ to achieve the re-skin",
    "The title deck renders the accent on big numerals / slide number; render_artifact returns selfContained: true"
  ]
}
```

## Eval 3 — Reproduce a real artifact faithfully

```json
{
  "skill": "design-system",
  "query": "Build an LP update deck from this quarterly report PDF.",
  "files": ["Q1-review.pdf"],
  "expected_behavior": [
    "Reads the source thoroughly first and uses only figures present in it — no invented numbers, names, or contacts",
    "Labels unrealized/illustrative marks as such; does not present projections as guarantees",
    "Chooses the right primitives: stat rows for KPIs, bf-table for the portfolio matrix, a chart for trends, exp/two-column for stories",
    "Keeps to ~10–14 slides with 2–3 dark slides at most; closing subtitle stays within ~2 lines",
    "Does not brand the deck as the assistant; uses the user's brand or the neutral base placeholders"
  ]
}
```

## Eval 4 — On-brand hygiene (review, negative test)

```json
{
  "skill": "design-system",
  "query": "Here's a deck a colleague made — review it for brand and structure problems.",
  "files": ["colleague-deck.html"],
  "expected_behavior": [
    "Flags raw hex colours in inline styles and recommends contract tokens instead",
    "Flags more than ~3 dark slides, missing brand links, or remote (non-embedded) assets",
    "Suggests concrete fixes rather than rewriting silently"
  ]
}
```

## Eval 5 — Social carousel (the third medium)

```json
{
  "skill": "design-system",
  "query": "Turn this thesis post into a 5-card LinkedIn carousel.",
  "files": ["thesis.md"],
  "expected_behavior": [
    "Recognises this is the SOCIAL medium and links core/social-core.css (never deck-core or doc-core)",
    "Follows the carousel spine: hook card → one idea per card → one number/proof card → CTA",
    "Uses .social-card at ONE size for the whole file, with eyebrow/footer chrome and data-slide-no numbering",
    "Delivers via render_artifact (HTML) or export_pdf; a PDF yields one card per page"
  ]
}
```
