# Social component catalogue

Copy these patterns; change only content. The social medium is **carded**: fixed-size
canvases in sequence. A multi-card file is a **carousel** — deliver it as PDF (the
`export_pdf` tool, or the browser print dialog) and you get one card per PDF page,
exactly the format LinkedIn document posts expect.

**Never load `deck-core.css` or `doc-core.css` in a social file** — conflicting `@page`.
Link order: `tokens → primitives → social-core → brand (_house → sub)`.
Use `doc-runtime.js` for the floating Save-as-PDF button + card numbering.

## Card sizes

| Class | Size | Use |
|---|---|---|
| `.social-card` | 1080×1350 | LinkedIn carousel / IG portrait (default) |
| `.social-card--square` | 1080×1080 | square posts |
| `.social-card--landscape` | 1600×900 | X / OG image / banner |

**One size per file** — `@page` prints every page at the same size. Mixed sizes =
separate files.

## 0. Skeleton

```html
<div class="social-stage">
  <section class="social-card"> … </section>   <!-- one per card -->
  <section class="social-card"> … </section>
</div>
<script src="../skills/design-system/core/doc-runtime.js"></script>
```

Card chrome: eyebrow top, footer bottom. `data-slide-no` slots auto-fill "N / total".

```html
<section class="social-card">
  <div class="social-eyebrow">Eyebrow · context</div>
  <div class="social-rule"></div>
  <!-- content -->
  <div class="social-footer">
    <span>@handle</span>
    <span data-slide-no></span>
  </div>
</section>
```

## 1. Hook card (card 1 stops the scroll)

```html
<h1 class="social-title social-title--hero">The hook. <span class="dim">Dim extension.</span></h1>
```

## 2. Body card (one idea per card)

```html
<h2 class="social-title">One claim.</h2>
<div class="social-body">
  <p>Two or three short sentences that earn the swipe.</p>
</div>
```

Add `.social-lede` for a larger intro line.

## 3. Stat card (one number owns the card)

```html
<section class="social-card social-card--dark">
  <div class="social-eyebrow">The number</div>
  <div class="social-stat">
    <div class="v">6 d</div>
    <div class="k">What this number means, in one line.</div>
  </div>
  …footer…
</section>
```

## 4. Numbered takeaways

```html
<ol class="social-list">
  <li><span class="n">01</span><span class="b"><strong>Anchor.</strong> Extension.</span></li>
  <li><span class="n">02</span><span class="b">…</span></li>
</ol>
```

## 5. Quote card

```html
<div class="social-quote">&ldquo;A sentence worth a card.&rdquo;</div>
<div class="social-quote__attr">Name · Role, Company</div>
```

## 6. CTA / closing card

```html
<div class="social-cta">
  <h2 class="social-title">The ask.</h2>
  <p class="social-cta__line">Follow for more. <span class="dim">Or reach out: name@firm.com</span></p>
</div>
```

## 7. Charts

`.bar-chart` / `.hbars` from `primitives.css` work on cards; social-core re-scales their
labels automatically. Give the bar-chart an explicit height inline
(e.g. `style="height:520px"`).

## Carousel narrative (the social spine)

Hook → one idea per card (3–7 cards) → one number or proof card → CTA.
Cards are read in two seconds each: headlines carry everything, body text is optional.
The six-beat spine compresses to: Open = hook card, Acts 1–3 = one card each,
Close = CTA. Dark cards punctuate exactly like dark slides — max 1–2 per carousel.

## Delivery

- **Carousel PDF (LinkedIn):** deliver with the `export_pdf` tool, or deliver the HTML with
  `render_artifact` and print to PDF from the browser — one card per page.
- **HTML:** `render_artifact` bundles to one self-contained file (fonts embedded) and posts it.
  Reference assets skill-root-relative (`core/…`, `brands/…`) so they resolve.
