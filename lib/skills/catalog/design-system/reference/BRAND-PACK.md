# Brand pack & the token contract

A brand pack is the *only* thing that changes between two brands. The layout engine
(`core/deck-core.css`) and every slide primitive read a fixed set of semantic tokens —
**the contract**. A brand fills the contract; nothing in `core/` is ever edited.

## The contract

Defined with neutral defaults in `core/tokens.css`. A brand overrides the **color** and
**font** groups; the type scale, spacing, motion are shared structure and rarely change.
The included `base` pack maps every token explicitly, so it doubles as a worked reference.

### Color tokens (brands override all of these)

| Token | Meaning | `base` value |
|-------|---------|--------------|
| `--c-surface` | primary slide background | `#F6F4F1` warm off-white |
| `--c-surface-2` | faint depth on the surface | `#ECE9E4` |
| `--c-paper` | brightest plate (cards, print) | `#FFFFFF` |
| `--c-ink` | dark surface (section/dark slides) + secondary fill | `#26241F` warm charcoal |
| `--c-fg` | primary text, rules, display type | `#1B1A16` warm near-black |
| `--c-muted` | meta, footnotes, dim extensions | `#8C887E` warm grey |
| `--c-accent` | big numerals, slide number, positive cues, `.accent` | `= --c-fg` (mono) |
| `--c-shade-12/24/64` | alpha tints of ink for hairlines/fills | ink @ 12/24/64% |
| `--c-border` | card/component hairline (defaults to shade-24) | — |
| `--c-slate` | secondary text inside components (defaults to ink) | — |

Brands that soften corners may also override `--radius-sm` / `--radius-card`
(neutral default: 0 — the system is square; a brand may set e.g. 6px / 12px).

`--c-accent` defaults to `--c-fg`, so a brand that sets no accent stays monochrome (as `base`
does). Set it to a signature colour to differentiate.

### Type tokens

| Token | Meaning |
|-------|---------|
| `--font-display` | display typeface — titles, headlines, big numerals (brand ships `@font-face`) |
| `--font-sans` | body typeface — running text, meta, labels, tables |
| `--font-mono` | monospace stack (code, optional) |

`--font-display` and `--font-sans` may be the same family or two different ones (`base` uses
Inter in both roles; a pack is free to pair a display face with a separate body face).
| `--fs-10 … --fs-48` | type scale in px (deck canvas is 1600×900) |
| `--lh-tight/snug/body/prose` | line heights |

### Structure tokens (shared — usually leave alone)

`--s-1 … --s-10` (8-pt spacing), `--rule-w`, `--radius-0/pill`, `--ease`, `--dur-fast/base/slow`.

## Rules of the contract

1. **Brands fill semantic names, never raw ones.** A brand may define private raw vars
   (e.g. `--base-ink`) but must map them onto the `--c-*` contract. No brand ever
   references another brand's raw palette. This is the seam that keeps brands independent.
2. **The engine only reads `--c-*` + scale tokens.** If a primitive needs a new colour
   role, add it to the contract (here + `tokens.css`), don't hardcode it.
3. **Brand-specific components are allowed** in `brand.css` (e.g. a `.<brand>-table` or a logo
   lockup). Prefix them with the brand so they never collide with the shared primitives.

## Add a new brand in ~30 minutes

1. `cp -r brands/base brands/<newbrand>`
2. In `brands/<newbrand>/brand.css`:
   - Replace the raw palette block and the `--c-*` mappings with the new brand's colours.
   - Replace the `@font-face` rules and `--font-display` / `--font-sans` with the new typefaces (drop files in `fonts/`).
   - Add any brand-specific components under a new prefix.
   - Add logo lockup CSS + files in `assets/` (optional — `base` ships a text wordmark only).
3. Update `brands/<newbrand>/brand.md` (palette table, voice, defaults, asset list).
4. Point an artifact's brand `<link>` at the new `brand.css`. Done — the engine and all
   primitives re-skin with no other changes.

## Two ways to apply a brand

- **Single-brand artifact (common):** the brand sets `--c-*` on `:root`. Simplest.
- **Multiple brands on one page:** declare the contract on a scope class
  (`.theme-<brand> { --c-...: ... }`) and wrap each artifact in that class, instead of `:root`.
  For a holding with sub-brands, prefer the family layout below.

## Brand families (a holding with sub-brands)

When several brands share DNA (type, paper, logo system, components) and differ mainly by
accent, use a two-tier layout instead of N standalone packs:

```
brands/<family>/_house.css   shared: @font-face, font roles, shared contract values, components, logo CSS
brands/<family>/<sub>.css    per sub-brand: --c-ink, --c-fg, --c-accent, --c-muted, --c-shade-*
```

An artifact links `_house.css` then one `<sub>.css`. Add a sub-brand by copying one `<sub>.css`
and changing the ink + accent — nothing else. (`base` is a standalone pack, not a family; this
pattern is here for when you grow into one.)

## Checklist for a complete brand pack

- [ ] All `--c-*` contract tokens mapped from the brand palette
- [ ] `--font-display` AND `--font-sans` set + `@font-face` for every weight used (300/500/600 typical)
- [ ] Fonts SELF-HOSTED in `fonts/` — no remote `@import`; bundles must work offline. Check the
      licence permits embedding (fonts get base64-embedded into every shared bundle; trial
      fonts may not allow distribution — `base` ships SIL OFL faces, which do)
- [ ] Logo lockups (light + dark colourways) in `assets/`, wired to footer wordmark + title hero (optional)
- [ ] Brand-specific components prefixed and documented
- [ ] `brand.md` written (palette, voice, defaults, asset list, font licensing note)
- [ ] Every `--c-*` contract token is mapped; no raw hex outside the raw-palette block; referenced fonts/logos exist
- [ ] One sample renders correctly and `render_artifact` reports it self-contained
