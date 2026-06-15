# Brand expansion prompt

This is the **ready-made prompt** that turns this design system into *your* brand. Hand Claude
three things and paste the prompt below:

1. **The skill** — this design-system package (Claude reads `SKILL.md` and `reference/BRAND-PACK.md`).
2. **A brand design file** — a filled `brands/_intake/brand-input.template.md` (palette, fonts,
   logos). Don't have one? Ask Claude to interview you and fill it first.
3. **Your assets** — logo SVGs (and font files, if custom) named per the intake template.

Copy everything between the lines, fill the two blanks at the top, and send it.

---

You are extending the **design-system** skill to add a new brand pack. Work only inside this
skill; never edit anything in `core/` (the engine is brand-neutral by contract).

**Brand:** <BRAND NAME>
**Slug:** <slug>   (lowercase, hyphenated — used for the folder and file names)

My brand design file and assets are attached (a filled `brand-input.template.md`, logo SVGs,
and any font files). If the design file is missing or incomplete, interview me to fill it
before building anything — propose sensible values from my website or guidelines and confirm.

Do this, in order:

1. **Read the contract.** Read `SKILL.md`, then `reference/BRAND-PACK.md` for the token
   contract and the add-a-brand steps. Read `brands/base/brand.css` as the worked example
   of how a brand fills the contract.

2. **Create the brand pack.** Make `brands/<slug>/`. Map my palette onto every `--c-*`
   contract token (surface, surface-2, paper, ink, fg, muted, accent, shade-12/24/64). If I
   gave no accent, leave it falling back to `--c-fg` (monochrome). Wire `--font-display`,
   `--font-sans` with `@font-face` for each weight if I supplied fonts; otherwise keep the
   neutral default and note that fonts are pending. Place my logo SVGs in
   `brands/<slug>/assets/` and wire the footer wordmark and title hero, both colourways.

3. **Keep brands independent.** Define any raw palette vars privately and map them onto the
   `--c-*` names. Never reference another brand's raw palette. Prefix any brand-specific
   components with my slug. Do not add new colour roles unless the contract truly lacks one;
   if so, add it to `core/tokens.css` as a neutral default first, then map it in my brand.

4. **Write `brands/<slug>/brand.md`** — palette table, type roles, logo/asset list, default
   narrative archetype, voice notes, and a font-licensing note if the fonts are trial weights.

5. **Build one sample deck** to prove the pack. Start from `templates/deck.template.html`,
   point the brand `<link>`s at my pack, and assemble a short real deck (cover, a dark
   section, two content slides, a closing) using primitives from `reference/COMPONENTS.md`.
   Use real-ish content for my brand, not lorem ipsum.

6. **Deliver.** Call `render_artifact` with the sample; fix any `missingRefs`/`unresolvedRefs`
   it reports until it comes back self-contained. Show me the result.

7. **Report** what you mapped, anything you derived or assumed, and what is still pending
   (e.g. licensed fonts, missing logo colourway). Keep my judgement in the loop on taste.

Constraints: on-token only (`var(--c-*)`, `--fs-*`, `--s-*`) — no hardcoded colours or fonts
in slides; follow the tone rules in `reference/AUTHORING.md` (bold-then-dim headlines, specific
numbers, no em-dashes as comma substitutes); keep dark slides to three or fewer per deck.

---

After this runs once, every future deck or document in your brand is a one-line prompt:
*"Make a [archetype] deck for <BRAND> about [topic] from these notes."*
