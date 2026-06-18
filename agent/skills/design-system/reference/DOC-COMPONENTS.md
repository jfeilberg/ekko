# Document component catalogue

Copy these patterns; change only content. The document medium is **paged**: portrait A4
canvases (794×1123 @96dpi) in sequence, like slides but flowing *within* each page. Print
gives one page per A4 sheet with automatic page numbers.

**Never load `deck-core.css` in a document** — its `@page` (1600×900) conflicts with A4.
Link order: `tokens → primitives → doc-core → brand _house → sub-brand`.

## Contents

- Skeleton: stage, page, header, footer (+page numbers)
- Cover (light + dark) · Table of contents
- Sections: section header, sub-heading, body text
- Blocks: callout · exec (SCQA) · stats · numbered list · task list · timeline · risks · quote
- Tables: doc-table (financial) · doc-compare (side-by-side)
- Layout: column grids · spacers
- Charts (from primitives.css) and pagination guidance

## 0. Skeleton

```html
<div class="doc-stage">
  <section class="doc-page"> … </section>   <!-- one per A4 page -->
  <section class="doc-page"> … </section>
</div>
```

Every content page carries a header, body, and footer:

```html
<section class="doc-page">
  <header class="doc-header">
    <span class="doc-header__wordmark"><img src="…logo-dark.svg" alt="Brand"></span>
    <span class="doc-header__meta">Document title</span>
  </header>
  <div class="doc-body">
    <!-- sections / blocks -->
  </div>
  <footer class="doc-footer">
    <span class="doc-footer__note">Confidential. This material is proprietary.</span>
    <span class="doc-footer__page"></span>   <!-- page number auto-fills via CSS counter -->
  </footer>
</section>
```

## 1. Cover

```html
<section class="doc-page doc-page--cover">
  <div class="doc-cover-top">
    <img src="…logo-dark.svg" alt="Brand">
    <span class="doc-header__meta">Confidential</span>
  </div>
  <div class="doc-cover-body">
    <div class="doc-cover-rule"></div>
    <div class="doc-cover-eyebrow">Build plan · Internal</div>
    <h1 class="doc-cover-title">The title, stated plainly.</h1>
    <p class="doc-cover-subtitle">One or two sentences on what this is and who it's for.</p>
    <div class="doc-cover-meta"><span>May 2026</span><span>v1.0</span><span>Owner: Name</span></div>
  </div>
</section>
```

Dark variant: `doc-page--cover doc-page--cover-dark` (use the light logo colourway; the
`bf-wordmark` swap handles it automatically if you use the dual-img lockup).

## 2. Table of contents

```html
<ol class="doc-toc">
  <li><span class="doc-toc__num">01</span><a class="doc-toc__title" href="#s1">Section name</a><span class="doc-toc__leader"></span></li>
</ol>
```

## 3. Section header + body text

```html
<div class="doc-section">
  <div class="doc-section-header">
    <span class="doc-section-num">01</span>
    <h2 class="doc-section-title">Section title</h2>
  </div>
  <p>Body text — 14px body face, 68ch measure.</p>
  <h3 class="doc-h3">Sub-heading</h3>
  <p>More body text.</p>
</div>
```

## 4. Callout

```html
<div class="doc-callout doc-callout--accent">   <!-- or plain doc-callout -->
  <div class="doc-callout__label">Key point</div>
  <p>The thing the reader must not miss.</p>
</div>
```

## 5. Executive summary (SCQA grid)

```html
<div class="doc-exec">
  <div class="doc-exec__cell"><div class="doc-exec__num">001 · Situation</div><p>…</p></div>
  <div class="doc-exec__cell"><div class="doc-exec__num">002 · Complication</div><p>…</p></div>
  <div class="doc-exec__cell"><div class="doc-exec__num">003 · Solution</div><p>…</p></div>
  <div class="doc-exec__cell"><div class="doc-exec__num">004 · Outcome</div><p>…</p></div>
</div>
```

## 6. Stats row

```html
<div class="doc-stats">
  <div class="doc-stat"><div class="doc-stat__v">44%</div><div class="doc-stat__k">EBITDA margin</div></div>
  <div class="doc-stat"><div class="doc-stat__v">~100</div><div class="doc-stat__k">Clients</div></div>
</div>
```

## 7. Numbered list / task list / timeline / risks

```html
<ol class="doc-numlist">
  <li><div class="n">01</div><div class="b"><h3>Item.</h3><p>Detail.</p></div></li>
</ol>

<ul class="doc-tasklist">
  <li>Open task</li>
  <li class="is-done">Completed task</li>
</ul>
<span class="doc-ws-label">Workstream label</span>

<ol class="doc-timeline">
  <li><span class="doc-timeline__dot">1</span><div class="doc-timeline__body"><h3>Milestone</h3><p>Detail.</p></div></li>
  <li><span class="doc-timeline__dot doc-timeline__dot--done">✓</span><div class="doc-timeline__body"><h3>Done milestone</h3><p>Detail.</p></div></li>
</ol>

<ul class="doc-risks">
  <li><span class="doc-risks__flag doc-risks__flag--high">High</span>Risk description and mitigation.</li>
  <li><span class="doc-risks__flag">Med</span>Lower risk.</li>
</ul>
```

## 8. Quote

```html
<blockquote class="doc-quote">
  <p class="doc-quote__text">A sentence worth pulling out.</p>
  <div class="doc-quote__attr">Name · Role</div>
</blockquote>
```

## 9. Tables

`doc-table` is the document-scale financial table (same row grammar as the deck's `bf-table`):
rows `doc-row--less / --result / --total`, cells `.num`, `.lbl`, cues `.v-good / .v-bad`.
`doc-compare` is the side-by-side comparison; the second column is accent-tinted.

```html
<table class="doc-table">
  <thead><tr><th>Line</th><th class="num">FY25</th></tr></thead>
  <tbody>
    <tr><td class="lbl">Revenue</td><td class="num">2.25</td></tr>
    <tr class="doc-row--total"><td class="lbl">EBITDA</td><td class="num v-good">1.0</td></tr>
  </tbody>
</table>
```

## 10. Layout grids + spacers

```html
<div class="doc-cols">…two columns…</div>
<div class="doc-cols doc-cols--3">…three…</div>
<div class="doc-cols doc-cols--60-40">…asymmetric…</div>
<div class="doc-spacer-md"></div>   <!-- xs 8 / sm 16 / md 32 / lg 48 -->
```

## 11. Charts

`.bar-chart` and `.hbars` come from `primitives.css` and work in documents — give the
bar-chart a smaller height inline (e.g. `style="height:180px"`) to fit the page scale.

## Pagination guidance

Pages do not auto-flow: **you place content per page**. An A4 body holds roughly 45–50 lines
of 14px text or 2–3 medium blocks (a section header + a table + a callout). When in doubt,
split a section across pages and repeat the section header with "(cont.)". Validate, then
print-preview — overflow shows as content colliding with the footer.
