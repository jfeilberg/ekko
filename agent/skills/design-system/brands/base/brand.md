# Base — brand pack

Standalone, **unbranded** pack. The white-label default for the deck system: a finished,
monochrome, warm-grey identity that looks deliberate rather than like a fallback, and ships
only openly-licensed assets so it is safe to open-source.

Load order in a deck (standalone — no house layer):

```
tokens.css → primitives.css → deck-core.css → brands/base/brand.css
```

## What this pack is for

1. **Decks that should not imply a company** — blind samples, white-label, anonymized
   teasers, internal drafts.
2. **The scaffold for a new brand** — `cp -r brands/base brands/<newbrand>`, then change the
   raw palette, the fonts, and (optionally) add a logo. Nothing else in the system moves.
3. **The live reference for the contract** — every `--c-*` role is mapped explicitly in
   `brand.css`, with comments, so it doubles as documentation.

It is intentionally not the same thing as "no brand linked". The `tokens.css` defaults remain
the ultimate fallback; this pack is the **explicit, finished, linkable** version of neutral —
with real fonts (so PDF export and other machines render identically) and a documented seam.

## Palette → contract

Monochrome. The accent is the ink itself, so there is no chromatic cue anywhere — emphasis is
carried by italic + medium weight, never by colour. That is the rule that keeps it unbranded.

| Contract token | Value | Base role |
|----------------|-------|-----------|
| `--c-surface` | `#F6F4F1` | warm off-white page / slide ground |
| `--c-surface-2` | `#ECE9E4` | faint depth on the surface |
| `--c-paper` | `#FFFFFF` | brightest plate (cards, print) |
| `--c-ink` | `#26241F` | warm charcoal — dark-slide ground |
| `--c-fg` | `#1B1A16` | warm near-black — text, rules, display |
| `--c-muted` | `#8C887E` | warm grey — meta, footnotes, dim |
| `--c-accent` | `= --c-fg` | **mono** — numerals and slide number stay ink |
| `--c-shade-12/24/64` | warm ink @ 12/24/64% | hairlines and subtle fills |
| `--c-border` | `= shade-24` | card / component hairline |
| `--c-slate` | `= --c-ink` | secondary text inside components |

Dark slides invert to `#26241F` with surface-coloured text. Because the accent equals the ink,
anything that would paint with the accent (`.accent`, stat values, accent bars) flips to the
surface colour on dark so it stays legible.

## Type

- **Display — Space Grotesk**, a tight, narrow geometric grotesque. Display runs Light (300)
  with a light negative track on the big marks (the face is already tight, so it needs little).
  Space Grotesk is upright only — it has no italic.
- **Body — Figtree**, a warm humanist sans built for interfaces. Running text runs Regular (400),
  since 300 reads thin at 18px on a projector. Figtree **also carries every italic accent**,
  because the display face has none — an upright-grotesque / humanist-italic contrast that reads
  as deliberate.
- **Trackers / eyebrows / code — Space Mono**, with light positive tracking.

All three are self-hosted variable/static woff2 in `fonts/` and are **SIL OFL 1.1**.

## Voice

Plain, declarative, specific. Headlines are statements, not questions. One italic-emphasis word
or phrase per headline — the word the reader should feel. Specific numbers over adjectives, one
term per concept. Reserve dark slides for the 2-3 moments that matter (pivot, the honest part,
the close).

## Logos

No image lockup. The wordmark is **plain text** set in Space Grotesk, via the engine's generic
`.title-mark` (cover) and `.slide__wordmark` (footer). Replace the placeholder text per deck.
If you fork this into a real brand and have an SVG lockup, drop it in `assets/` and wire its
CSS in your `brand.css` (show the dark lockup on light slides, the light one on dark).

## Defaults

- Default narrative archetype: **Business case** or **Board report** (works for anything; it is
  the neutral one).
- Fonts are self-hosted and SIL OFL — bundles are fully offline. See `fonts/README.md`.
- Worked example: `samples/base-sample.html`.

## Forking this into a real brand (~30 min)

1. `cp -r brands/base brands/<newbrand>`
2. In `brand.css`: replace the `--base-*` raw palette and the `--c-*` mapping; swap the
   `@font-face` rules + `--font-*`; rename the comment header.
3. Set `--c-accent` to the new brand's signature colour to leave monochrome behind.
4. Add a logo to `assets/` and wire the wordmark if you have one.
5. Point a deck's brand `<link>` at the new `brand.css`. The engine and every primitive
   re-skin with no other change.
