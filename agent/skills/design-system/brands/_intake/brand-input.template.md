# Brand input — <BRAND NAME>

This is your **brand design file**. Fill the blanks, drop assets in `logos/` and (if needed)
`fonts/`, and hand it to Claude with the expansion prompt (`reference/BRAND-EXPANSION-PROMPT.md`).
Anything you leave blank, Claude will derive or ask about. Hexes can be approximate.

You do not have to write this by hand. You can ask Claude to interview you and fill this file
for you — paste your website URL or existing brand guidelines and let it draft the values.

## 1. Identity
- Brand / entity name: ______
- Slug (lowercase, hyphenated — used for files and folders, e.g. `acme`): ______
- One-line positioning / what this entity does: ______
- Part of a brand family / holding with shared DNA? (no / yes — name the family): no

## 2. Colorway (hex values)
| Role | Hex | Notes |
|------|-----|-------|
| Surface — page/slide background | `#______` | the dominant background |
| Ink — primary dark (text, rules, dark slides) | `#______` | |
| Muted — meta, footnotes, dim text | `#______` | a grey that reads on the surface |
| Accent (optional) | `#______` | signature colour for big numerals, slide number, `.accent` |
| Surface-2 (optional) | `#______` | faint depth on the surface; Claude will derive if blank |
| Paper / brightest plate (optional) | `#______` | Claude will derive if blank |

Default mood: **light** (dark text on light surface) or **dark** (light text on dark surface)? → ______

If you set no accent, the brand stays monochrome (accent falls back to the ink). That is a
deliberate, editorial look — leave it blank if in doubt.

## 3. Typeface
- Display family (titles, headlines, big numerals): ______
- Body family (running text, meta, labels, tables): ______  *(may be the same as display)*
- Source: font files dropped in `fonts/`  /  Google Fonts name(s): ______
- Weight mapping — Light(300): ____  Medium/standard(500): ____  SemiBold(600): ____

If you leave this blank, Claude will use the system's neutral default type until you supply fonts.

## 4. Logos (drop in `logos/`)
Preferred: SVG, two colourways each. Name them exactly, using your slug:
- `<slug>-logo-dark.svg`   (dark logo — used on LIGHT slides)
- `<slug>-logo-light.svg`  (light logo — used on DARK slides)
- `<slug>-mark-dark.svg`   (standalone mark, dark — optional)
- `<slug>-mark-light.svg`  (standalone mark, light — optional)

If you only have PNG, drop @3x (≥2280px wide) versions with the same names.
If a logo is single-colour, one file is fine — note it here: ______

## 5. Defaults & voice
- Confidential footer line (if any): ______
- Default narrative archetype (proposal / pitch / board report / business case / …): ______
- Tone notes (a few adjectives, or a sentence you would never write): ______
- Anything else: ______
