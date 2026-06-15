# Narrative library

The deck is paint; the story carries it. Pick an **archetype**, map content to a slide
sequence, *then* write markup. Archetypes are starting points — reorder and cut to fit.

Each archetype below maps beats to primitives from `COMPONENTS.md`. Two layers exist:
**generic archetypes** (work for any brand) and **brand defaults** (a brand may prefer one —
e.g. a consulting brand may default to *Proposal (SCQA)* for client work; see `brands/<brand>/brand.md`).

---

## Contents

- The six-beat spine (the universal shape) + non-narrative mappings
- Deck archetypes: Proposal (SCQA) · Fundraising pitch · Business case · Board report · Internal all-hands · Storytelling/keynote
- Document archetypes: Build plan · Decision memo · One-pager · Proposal letter · Report/post-mortem
- Punctuation (quote/dark/breaker/show-don't-tell) · Common mistakes

## The six-beat spine (the universal shape)

Every persuasive deck has this shape; timing scales to 5 / 20 / 45 minutes.

| Beat | ~Share | Purpose | Typical primitives |
|------|--------|---------|--------------------|
| Open | 10% | Hook the room — a confession, contradiction, surprising fact. Not your bio. | Title, Big quote, Dark section |
| Act 1 — World Before | 15% | The status quo; build empathy. | Action title, Two-column |
| Act 2 — The Turn | 15% | Name what changed. State it cleanly. | Dark section, Big quote |
| Act 3 — Evidence | 40% | Prove it. 3–5 concrete examples, each *before → action → after*. | Stats, Numbered grid, Two-column, Experience grid, Financial table |
| Act 4 — Honest Part | 15% | The risk/doubt/open question. Where trust is earned. | Action title, Dark section |
| Close | 5% | One practiced line. Then stop. | Closing, Big quote |

**Headline device throughout:** bold anchor + dim extension (`<span class="dim">`). See AUTHORING.md.

Non-narrative formats still map onto the spine:

| Beat | Status update | Technical spec | Board report |
|------|---------------|----------------|--------------|
| Open | TL;DR | Problem statement | Headline result |
| Act 1 | Where we were | Current state | Period context |
| Act 2 | What changed | Proposed approach | What moved |
| Act 3 | The details | The design | The numbers (tables, stats) |
| Act 4 | Risks & blockers | Trade-offs | Risks & watch items |
| Close | Next steps | Call to action | Decisions requested |

---

## Archetype: Proposal (SCQA)  — *a common default for client work*

Situation · Complication · Question/Solution · Answer. The consulting standard.

1. **Title** — Brand // Client lockup, topic, "trusted by" strip.
2. **Executive summary** — `.exec` SCQA grid (Situation / Complication / Solution / Outcome).
3. **Problem** — action title naming the client's real pain.
4. **Approach** — `.approach-layout` diagram or two-column "two halves".
5. **Principles / How we work** — numbered grid.
6. **Phases** — `.phase-overview` (Diagnostic → Foundation → Handover) with gates.
7. **Evidence** — `.exp-grid` prior engagements, or `.bf-table` financials, or stats.
8. **Pricing** — `.price-layout` / `.price-staged` (fixed core + options scoped later).
9. **Proof / quote** — big client quote.
10. **Close** — next steps (3 steps), contact.

## Archetype: Fundraising pitch

Open big, prove traction, show the size of the prize, be honest about risk.

1. **Title / one-liner** — what you are, in a sentence.
2. **The problem** — action title + two-column (status quo pain).
3. **The insight / turn** — dark section.
4. **The product** — show-don't-tell: setup slide → visual.
5. **Traction** — stat row (growth, retention) + trusted-by logos.
6. **Market** — big number + framing.
7. **Business model** — two-column or table.
8. **Team** — logo/role grid.
9. **The honest part** — what has to be true; the risk.
10. **The ask** — amount, use of funds, milestones. Closing line.

## Archetype: Business case

Decision-oriented. Lead with the recommendation; defend it with numbers.

1. **Headline recommendation** — action title (the decision you want).
2. **Context** — why now.
3. **Options considered** — `.bf-compare` / before-after, options side by side.
4. **The numbers** — `.bf-table` (cost, return, breakeven), stat row.
5. **Risks & mitigations** — numbered grid or two-column.
6. **The honest part** — what could break the case.
7. **Recommendation & next steps** — closing with the explicit ask.

## Archetype: Board report

Calm, factual, decision-focused. No selling.

1. **Cover** — period, "confidential".
2. **TL;DR** — 3–4 headline results (stat row).
3. **Performance vs plan** — `.bf-table` / variance.
4. **What moved** — two-column (drivers).
5. **Watch items / risks** — numbered grid.
6. **Decisions requested** — explicit list.
7. **Appendix** — detail tables.

## Archetype: Internal all-hands

Energy + clarity + honesty. Celebrate, then align.

1. **Open** — a human hook, not an agenda.
2. **Where we were** — the quarter's starting point.
3. **What we shipped** — evidence: stats, product visuals (show-don't-tell).
4. **What we learned / the honest part** — dark slide.
5. **Where we're going** — priorities (numbered grid).
6. **Close** — one line the team remembers.

## Archetype: Storytelling / keynote

The purest six-beat. Lean on quote slides, dark slides as punctuation, and setup→visual pairs.
Spend 80% of effort on the story, 20% on slides. The closing line is the highest-effort element.

---

## Punctuation (applies to every archetype)

- **Quote slides** — one bold statement, nothing else. Open, turn, close.
- **Dark slides** — reserved for moments that matter. 2–3 per deck max.
- **Breakers** — a single quiet line between acts: *"That felt normal. Until it wasn't."*
- **Show, don't tell** — text setup slide → full-bleed visual. The visual lands harder after the setup.

## Document archetypes (the document medium — see DOC-COMPONENTS.md)

Documents are read, not presented: headlines carry less, body carries more, and the reader
sets the pace. Front-load conclusions; never bury the ask.

**Build plan** *(the canonical worked example)* — cover → TOC → one section per workstream,
each with section header, short rationale, `doc-tasklist` of concrete actions, owners/dates;
`doc-timeline` for milestones, `doc-risks` near the end, close with decision/next steps.

**Decision memo** — `doc-exec` SCQA up front → options as `doc-compare` → the numbers as
`doc-table` → risks → the explicit decision requested in a `doc-callout--accent`. 2–4 pages;
the decision must appear on page 1.

**One-pager** — a single `doc-page`: header, one plain claim, `doc-stats` row, three short
sections or a `doc-numlist`, footer. The discipline is exclusion.

**Proposal letter** — cover → context → approach (`doc-numlist`) → phases (`doc-timeline`) →
pricing (`doc-table`) → terms → signature block. The document twin of the Proposal (SCQA) deck.

**Report / post-mortem** — cover → TOC → findings sections (charts + tables) → the honest part
(what we'd do differently) → appendix tables.

## Common mistakes

Too much evidence (show three, not ten). Skipping the honest part (it's where trust is earned).
Leading with credentials. Forcing humour. Reading the slides. No clear ask.
