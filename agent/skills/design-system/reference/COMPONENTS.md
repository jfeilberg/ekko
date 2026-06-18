# Component catalogue

Copy these patterns. Use the exact class names; change only the content. Colours and fonts
come from the brand pack — never hardcode them. Snippets below show the *content* of a
`<section class="slide">`; wrap each in the slide skeleton.

The deck canvas is **1600 × 900**. Inline `style="..."` is used for one-off positioning
(matching the proven reference decks); structural styling lives in the classes.

---

## Contents

- 0. Deck skeleton · 1. Slide chrome (header/footer/rules)
- 2. Title slide · 3. Dark section · 15. Closing slide (with `.title-block`)
- 4. Action title · 5. Two-column · 7. Numbered grid · 8. Big quote
- 6. Stat row · 9. Trusted-by/logos · 16. Utilities (`.tag`, `.accent`, `.dim`)
- 10. Executive summary (SCQA) · 11. Phases · 12. Pricing · 13. Experience grid · 14. Before/after
- 19. Charts (`.bar-chart`, `.hbars`) + line / donut / waterfall patterns
- 21. Proposal title (Brand | Client) · 22. About pillars · 23. Approach diagram
- 24. Industry strip · 25. Phase detail (strip + body) · 26. Commitments grid
- 27. Price phases (simple) · 28. Statline

## 0. Deck skeleton

```html
<div class="deck-stage">
  <div class="deck-canvas" data-width="1600" data-height="900">
    <!-- slides go here -->
  </div>
</div>
<script src="core/deck-runtime.js"></script>
```

The runtime auto-injects a thin **top progress / section tracker bar** (`.deck-progress`) that
fills as you move through the deck — on-token (accent fill), light on dark slides, hidden in
print. No markup needed; it appears in every deck automatically.

## 1. Slide chrome (the wrapper around most content slides)

```html
<section class="slide">
  <div class="slide__rule-top"></div>
  <div class="slide__rule-bot"></div>

  <div class="slide__header">
    <div class="slide__tracker"><span class="slash">/</span><span class="num">02</span>Problem</div>
    <div class="slide__callout">Short right-aligned label</div>
  </div>

  <div class="slide__body">
    <!-- primitive goes here -->
  </div>

  <div class="slide__footer">
    <div>
      <div class="slide__footnote">Source / caption</div>
      <div class="slide__confidential">This material is confidential and proprietary.</div>
    </div>
    <div class="slide__wordmark"><!-- text wordmark, or brand lockup --></div>
  </div>
</section>
```

- Add `<div class="slide__rule-mid"></div>` for a centre divider (two-column slides).
- To vertically centre body content: `<div class="slide__body" style="display:flex; flex-direction:column; justify-content:center;">`.
- `<span class="ph">Placeholder</span>` renders bracketed muted text for unfilled slots.
- Proposal tracker (brand // client): `<div class="slide__tracker--proposal">Brand <span class="ss">//</span> Client</div>`.

## 2. Title slide

```html
<section class="slide slide--title">
  <div class="slide__rule-mid"></div>
  <div class="slide__rule-bot"></div>

  <div class="title-mark">Brand<span class="title-mark__c">©</span></div>
  <div class="title-topic" style="top:600px; max-width:700px;">The one-line topic of the deck.</div>
  <div class="title-date" style="top:700px;">May 2026</div>

  <div class="title-right-eyebrow">
    <div class="meta" style="color:var(--c-muted); margin-bottom:24px;">Trusted by</div>
    <div class="logos" style="margin:0; gap:56px;">
      <div class="logos__cell">Client A</div><div class="logos__cell">Client B</div>
    </div>
  </div>

  <div class="title-tagline">A capabilities overview. 18 minutes.</div>
</section>
```

(For a logo-led title, replace `.title-mark` with a brand hero — see §17.)

## 3. Dark section divider

```html
<section class="slide slide--dark">
  <div class="slide__rule-top"></div>
  <div class="slide__rule-bot"></div>
  <div class="slide__header">
    <div class="slide__tracker"><span class="slash">/</span><span class="num">01</span>Storyline</div>
    <div class="slide__callout"><span class="ph">Section</span></div>
  </div>
  <div class="slide__body" style="display:flex; flex-direction:column; justify-content:center;">
    <div class="section-num">01</div>
    <div class="section-title">Why good companies steer on stale numbers.</div>
  </div>
  <div class="slide__footer">…</div>
</section>
```

## 4. Action title (the workhorse content slide)

```html
<div class="slide__body">
  <h2 class="action-title">A claim worth a whole slide — <span class="dim">with the dim extension that lands it.</span></h2>
</div>
```

## 5. Two-column

```html
<div class="slide__body is-split">
  <div class="col" style="padding-right:48px;">
    <div class="caption">01 · Build</div>
    <h2 class="action-title" style="font-size:36px; line-height:1.1;">Left headline.</h2>
    <p>Left supporting paragraph.</p>
  </div>
  <div class="col" style="padding-left:48px;">
    <div class="caption">02 · Hand over</div>
    <h2 class="action-title" style="font-size:36px; line-height:1.1;">Right headline.</h2>
    <p>Right supporting paragraph.</p>
  </div>
</div>
```

## 6. Stat row (three big figures)

```html
<div class="stats">
  <div><div class="v">6 d</div><div class="k">What this number means, in one line.</div></div>
  <div><div class="v">±4%</div><div class="k">Second metric with context.</div></div>
  <div><div class="v">10 wk</div><div class="k">Third metric with context.</div></div>
</div>
```

## 7. Numbered grid (2×2 principles)

```html
<ol class="numlist">
  <li><div class="n">01</div><div class="b"><h3>Principle.</h3><p>One or two sentences.</p></div></li>
  <li><div class="n">02</div><div class="b"><h3>Principle.</h3><p>…</p></div></li>
  <li><div class="n">03</div><div class="b"><h3>Principle.</h3><p>…</p></div></li>
  <li><div class="n">04</div><div class="b"><h3>Principle.</h3><p>…</p></div></li>
</ol>
```

## 8. Big quote

```html
<div class="bigquote">&ldquo;A single sentence that earns the whole slide.&rdquo;</div>
<div class="bigquote__attr">Name &nbsp;·&nbsp; Role, Company &nbsp;·&nbsp; Context</div>
```

## 9. Trusted-by / logo row

```html
<div class="logos" style="gap:96px; margin:0;">
  <div class="logos__cell">Aurora Cap</div>
  <div class="logos__cell">Helmsdal</div>
  <div class="logos__cell">Nordlys</div>
</div>
```

## 10. Executive summary (SCQA grid)

```html
<div class="exec" style="height:calc(100% - 96px);">
  <div class="exec__cell"><div class="exec__num">001 // Situation</div><p>… <strong>key clause in medium.</strong></p></div>
  <div class="exec__cell"><div class="exec__num">002 // Complication</div><p>…</p></div>
  <div class="exec__cell"><div class="exec__num">003 // Solution</div><p>…</p></div>
  <div class="exec__cell"><div class="exec__num">004 // Outcome</div><p>…</p></div>
</div>
```

## 11. Phases overview (timeline + columns)

```html
<div class="phase-timeline">
  <div class="phase-timeline__tick"></div><div class="phase-timeline__tick"></div><div class="phase-timeline__tick"></div>
</div>
<div class="phase-overview" style="height:calc(100% - 200px);">
  <div class="phase-overview__col">
    <div class="phase-overview__num">Phase 0</div>
    <div class="phase-overview__name">Diagnostic</div>
    <div class="phase-overview__weeks">Week 1–2</div>
    <p class="phase-overview__lede">A short, bold lede.</p>
    <p class="phase-overview__body">A paragraph of detail.</p>
    <ul class="phase-overview__delivs"><li>Deliverable.</li><li>Deliverable.</li></ul>
  </div>
  <!-- repeat for Phase 1, Phase 2 -->
</div>
```

Add `phase-overview--four` for four columns. Mark a column `phase-overview__col--done` (delivered) or `--next`.

## 12. Pricing (figure + staged options)

```html
<div class="price-layout">
  <div>
    <div style="font-size:13px; letter-spacing:0.10em; text-transform:uppercase; color:var(--c-muted); margin-bottom:32px;">Core engagement</div>
    <div class="price-figure">1,2<sup>1</sup><span class="unit">DKKm</span></div>
    <div class="price-meta"><span class="price-meta__sup">¹</span>Excl. VAT · fixed fee</div>
    <p style="font-size:16px; max-width:46ch; margin:36px 0 0;">What the fee covers.</p>
  </div>
  <div class="price-list">
    <div class="price-staged" style="border-top:1px solid var(--c-fg);">
      <div class="price-staged__row" style="grid-template-columns:110px 1fr 170px;">
        <div class="p-num">Core</div>
        <div class="p-name">Diagnostic → Handover<span class="p-name__sub">subtext</span></div>
        <div class="p-status">Fixed</div>
      </div>
      <!-- more rows -->
    </div>
  </div>
</div>
```

## 13. Experience grid (two cases side by side)

```html
<div class="exp-grid">
  <div class="exp-col">
    <div class="exp-label"><span class="exp-label__co">Helmsdal</span></div>
    <div class="exp-section"><div class="exp-section__icon">▲</div><p>Context. <strong>The tension.</strong></p></div>
    <div class="exp-section exp-section--stat"><div class="exp-section__icon">▲</div><div class="b"><div class="v">6 d</div><div class="c">Outcome metric.</div></div></div>
  </div>
  <div class="exp-rule"></div>
  <div class="exp-col"><!-- second case --></div>
</div>
```

## 14. Before / after

```html
<div class="beforeafter">
  <div><h3>Before</h3><h2>The old way.</h2><ul><li>Pain point.</li><li>Pain point.</li></ul></div>
  <div><h3>After</h3><h2>The new way.</h2><ul><li>Improvement.</li><li>Improvement.</li></ul></div>
</div>
```

## 15. Closing slide

```html
<section class="slide slide--title">
  <div class="slide__rule-mid"></div><div class="slide__rule-bot"></div>
  <div class="title-mark" style="top:320px;">Thank<br>you.</div>
  <!-- Wrap subtitle + date in .title-block: they flow with a gap (long subtitles
       can't overlap the date) and the column is width-capped so it never crosses
       the centre rule. Keep the subtitle to ~2 lines (~160 chars). -->
  <div class="title-block" style="top:632px;">
    <div class="title-topic">Reach out: <span style="color:var(--c-fg);">name@firm.com</span></div>
    <div class="title-date">firm.com</div>
  </div>
  <div class="title-right-eyebrow">
    <div class="meta" style="color:var(--c-muted); margin-bottom:24px;">Next steps</div>
    <ol style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:24px;">
      <li style="display:grid; grid-template-columns:48px 1fr;"><span style="color:var(--c-muted);">01</span><span>First step.</span></li>
    </ol>
  </div>
  <div class="title-tagline">The tagline, repeated.</div>
</section>
```

## 16. Utilities

- Pill tag: `<span class="tag">Label</span>`
- Hairline card: `<div class="hcard"><div class="hcard__eyebrow">Eyebrow</div>…</div>`
- Buttons (UI, not slides): `<button class="btn">…</button>`, `.btn--solid`
- Dim extension: `<span class="dim">…</span>` (the headline device)

---

## Charts and figures (cross-medium, brand-neutral)

These live in `core/primitives.css` and read the contract tokens, so they re-skin with any
brand. Logo lockups and branded tables are **brand-defined**: a pack adds its own prefixed
components (e.g. a `.<brand>-table`) and logo CSS in its `brand.css`. The `base` pack ships no
logo image — its wordmark is plain text via `.title-mark` and `.slide__wordmark` (see §1, §2).

### 19. Charts (`.bar-chart`, `.hbars`) — reusable, on-token, no JS

Column bars for comparisons/trends; horizontal bars for ranked lists/shares. Colours come
from the contract; highlight a key series with `--accent` / `--ink`. Bar size is set inline
via `--h` (column height) or `--w` (horizontal width).

```html
<!-- column bars -->
<div class="bar-chart">
  <div class="bar-chart__col"><span class="bar-chart__val">~1×</span><span class="bar-chart__bar bar-chart__bar--ink" style="--h:20%"></span></div>
  <div class="bar-chart__col"><span class="bar-chart__val">~5×</span><span class="bar-chart__bar bar-chart__bar--accent" style="--h:100%"></span></div>
</div>
<div class="bar-chart__axis"><span>Entry</span><span>Exit</span></div>

<!-- horizontal bars -->
<div class="hbars">
  <div class="hbar"><div class="hbar__label">Series A<small>context</small></div><div class="hbar__track"><div class="hbar__fill" style="--w:72%"></div></div><div class="hbar__val">72%</div></div>
</div>
```

For **line charts** (e.g. a J-curve), use inline `<svg>` with `style="stroke:var(--c-fg)"` /
`style="fill:var(--c-accent)"` on elements (CSS variables only work in `style`, not SVG
presentation attributes). Keep every colour a `var(--c-*)` token so the chart re-skins.

**Donut** — share-of-total, one number in the middle. `--pct` sets the accent wedge:

```html
<div class="donut" style="--pct:62"><div class="donut__label">62%</div></div>
```

(On a dark slide, override the hole: `style="--pct:62; --c-surface:var(--c-ink)"`.)

**Waterfall** — bridge from start to end via floating deltas. Each bar sets `--base`
(bottom offset) and `--h` (height) as % of chart height; `--neg` for decreases, `--total`
for the anchored start/end bars:

```html
<div class="waterfall" style="height:360px">
  <div class="waterfall__col" style="--base:0; --h:60%"><span class="waterfall__val">42</span><span class="waterfall__bar waterfall__bar--total"></span></div>
  <div class="waterfall__col" style="--base:60%; --h:18%"><span class="waterfall__val">+13</span><span class="waterfall__bar"></span></div>
  <div class="waterfall__col" style="--base:64%; --h:14%"><span class="waterfall__val">−10</span><span class="waterfall__bar waterfall__bar--neg"></span></div>
  <div class="waterfall__col" style="--base:0; --h:64%"><span class="waterfall__val">45</span><span class="waterfall__bar waterfall__bar--total"></span></div>
</div>
<div class="waterfall__axis"><span>FY24</span><span>Price</span><span>Churn</span><span>FY25</span></div>
```

## Proposal & engagement primitives (engine, brand-neutral)

### 21. Proposal title (Brand | Client lockup)

Centred lockup for client-work title slides, plus the brand // client tracker and a
"trusted by" strip near the bottom:

```html
<section class="slide slide--title">
  <div class="slide__rule-bot"></div>
  <div class="proposal-title">
    <div class="proposal-title__lockup">
      <span class="proposal-title__brand">Brand</span>
      <span class="proposal-title__divider"></span>
      <span class="proposal-title__client">Client</span>
    </div>
  </div>
  <div class="proposal-trusted">
    <div class="proposal-trusted__label">Trusted by</div>
    <div class="proposal-trusted__row"><span>Aurora Cap</span><span>Helmsdal</span><span>Nordlys</span></div>
  </div>
</section>
```

On content slides, swap the tracker: `<div class="slide__tracker--proposal">Brand <span class="ss">//</span> Client</div>`.

### 22. About pillars (3 columns under a top rule)

```html
<div class="about-pillars">
  <div><h3>What we do</h3><p>…</p></div>
  <div><h3>How we work</h3><p>…</p></div>
  <div><h3>What you get</h3><p>…</p></div>
</div>
```

(For a numbered 2×2 variant use `.approach-grid` with `li > .num / h3 / p`.)

### 23. Approach diagram (pipeline + bracket, left/right split)

The richest engine primitive: a vertical pipeline of numbered boxes with chips, a dashed
"orchestration" bracket, and a numbered list on the right of a centre divider.

```html
<div class="approach-layout">
  <div class="approach-diagram">
    <div class="approach-bracket"><span class="approach-bracket__label">Orchestration</span></div>
    <div class="approach-pipeline">
      <div class="approach-row">
        <div class="approach-box">
          <div class="approach-box__num">01</div>
          <div class="approach-box__name">Diagnostic</div>
          <div class="approach-box__sub">2 weeks</div>
        </div>
        <div class="approach-chips"><div class="approach-chips__row"><span class="approach-chip">Interviews</span><span class="approach-chip">Data audit</span></div></div>
      </div>
      <div class="approach-link"><span class="approach-link__line"></span></div>
      <div class="approach-row"><!-- next box + chips --></div>
      <div class="approach-terminal"><span class="approach-terminal__pill">Production</span></div>
    </div>
  </div>
  <div class="approach-divider"></div>
  <div class="approach-list">
    <div class="approach-list__item"><div class="num">01 — Diagnostic</div><p>What happens in this stage.</p></div>
    <div class="approach-list__item"><div class="num">02 — Build</div><p>…</p></div>
  </div>
</div>
```

### 24. Industry strip (5-stage horizontal context)

```html
<div class="industry-strip">
  <div class="industry-strip__col">
    <div class="industry-strip__step">01</div>
    <div class="industry-strip__role">Spreadsheet era</div>
    <p>What defined this stage.</p>
  </div>
  <!-- ×5 -->
</div>
```

### 25. Phase detail slide (strip + intent + deliverables)

One slide per phase; the strip shows all phases with the current one underlined:

```html
<div class="phase-strip">
  <div class="phase-strip__item"><span class="num">00</span>Diagnostic</div>
  <div class="phase-strip__item is-current"><span class="num">01</span>Foundation</div>
  <div class="phase-strip__item"><span class="num">02</span>Handover</div>
</div>
<div class="phase-body">
  <div>
    <p class="lede">What this phase exists to prove.</p>
    <p>Two or three sentences of detail.</p>
  </div>
  <ul class="delivs">
    <div class="delivs__title">Deliverables</div>
    <li>Deliverable one.</li>
    <li>Deliverable two.</li>
  </ul>
</div>
```

### 26. Commitments grid (5 promises, 3+2)

```html
<ul class="commit-grid">
  <li><div class="num">01</div><h3>Senior team only.</h3><p>One sentence of substance.</p></li>
  <!-- ×5 -->
</ul>
```

### 27. Price phases (simple fee table — lighter than `.price-staged`)

```html
<div class="price-phases">
  <div class="price-phases__row"><span class="p-num">00</span><span class="p-name">Diagnostic</span><span class="p-wk">wk 1–2</span></div>
  <div class="price-phases__row"><span class="p-num">01</span><span class="p-name">Foundation</span><span class="p-wk">wk 3–8</span></div>
</div>
```

### 28. Statline (inline stat under running copy)

```html
<div class="statline"><div class="v">±4%</div><div class="c">forecast band after 90 days</div></div>
```
