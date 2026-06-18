# Authoring guide

How to write slides that are correct, on-brand, and good. Read `COMPONENTS.md` for the
markup and `NARRATIVES.md` for structure; this file is craft and tone.

## The headline pattern (use everywhere)

Bold anchor + dim extension. The first phrase carries weight; the second fades to muted.
This is the most consistent identity device in the system.

```html
<h2 class="action-title">Revenue doubled. <span class="dim">Churn didn't.</span></h2>
```

- Anchor: full `--c-fg`, weight as the primitive sets it.
- Extension: wrap in `<span class="dim">` (renders in `--c-muted`, weight 300).
- Use on any headline with the room. Don't fight it.

## Tone rules (follow strictly)

1. **Bold the keyword, dim the rest** — every headline.
2. **No em-dashes as comma substitutes in body copy.** Use periods or shorter sentences. (En-dashes in ranges/figures are fine.)
3. **No fluff.** If a sentence adds no information, delete it. Test: can you cut words and keep the meaning? Then cut them.
4. **Specific numbers.** "6-day close" beats "much faster." "±4% forecast band" beats "more accurate."
5. **Headlines are statements, not questions.** (Exception: Q&A capability rows.)
6. **Use names, not pronouns.** Say the product/firm/feature name, not "it."
7. **One term per concept.** Don't paraphrase your own offer.
8. **Write like an operator, not a marketing team.** Drop hype adjectives (seamless, robust, world-class, next-gen, game-changer, best-in-class, leverage, unlock). A real number or a named detail proves the point; an adjective just asserts it.
9. **No throat-clearing or filler enthusiasm.** No "In today's fast-paced world," no exclamation spam. State the thing. A slide the reader believes sounds like a sharp human wrote it, not a brand-guidelines doc.

## From a markdown file or outline to a deck

1. **Read the source for the arc, not the words.** What's the one thing the audience must take away? What's the closing line?
2. **Choose an archetype** (`NARRATIVES.md`) and draft the beat list. This is the real work.
3. **Assign a primitive to each beat.** Match component to content type: comparison → two-column or `bf-compare`; process → approach diagram / phases; proof → stats / experience grid / table; emphasis → dark section or big quote.
4. **Write the slides** from `COMPONENTS.md`, exact class names, content only.
5. **Pass for tone** against the rules above. Cut a third of the words.
6. **Add punctuation** — a quote slide to open, a dark slide at the turn, a practiced closing line.
7. **Deliver** with the `render_artifact` tool — it bundles to a single self-contained file.

## Density & rhythm

- One idea per slide. If a slide needs two new layouts, split it.
- Vary the cadence: text → visual → text. A wall of equally dense slides reads as noise.
- Leave whitespace. The system uses scale and space for emphasis, not bold everywhere.
- Body copy ≤ ~3 short lines per block; let headlines carry the arc.

## Freestyle (inventing a new layout)

The catalogue is a floor, not a ceiling. When content demands a new layout:

1. **Stay on-token.** Only contract tokens — `var(--c-*)`, `--fs-*`, `--s-*`. No new colours or fonts.
2. **Use the headline pattern.** Any new headline gets bold-then-dim.
3. **Match the craft.** 1px hairlines, square corners (pills only where the system already uses them), the existing padding rhythm (`--slide-pad-x`, header/footer slots).
4. **Name it in the house style** — lowercase, hyphenated, BEM-ish (`.thing__part`). If it's brand-specific, prefix it (`bf-`).
5. If it needs a new colour or font to work, rethink it — it's off-system.

## Slide chrome cheatsheet

Every content slide has: top rule, bottom rule, a header (tracker left, callout right),
a body region, and a footer (footnote + confidential left, wordmark right). Title and
closing slides drop the top rule and header. Dark section slides use `.slide--dark`.
See `COMPONENTS.md` for the exact wrappers.
