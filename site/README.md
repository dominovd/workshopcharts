# WorkshopCharts — site

Astro, static output, no server cost per request.

```bash
npm install
npx playwright install chromium   # once — the build renders the sheets
npm run dev                       # local dev
npm run build                     # check:data → astro build → render:sheets → check:html
```

Individual steps:

```bash
npm run check:data     # the data checks
npm run build:pages    # pages only, no sheet rendering (fast iteration)
npm run render:sheets   # PDF + PNG sheets into dist/sheets/
npm run check:html      # audit the built HTML
```

Set `CHROMIUM_PATH` to reuse a browser the machine already has instead of
downloading one:

```bash
CHROMIUM_PATH=/path/to/chromium npm run build
```

## Where things are

```
src/data/schema.ts          types — the project's discipline lives here
src/data/registry.ts        every chart; published set and counts are derived
src/data/charts/*.ts        one file per chart; pending.ts holds unpublished ones
src/lib/derive.ts           definitional arithmetic only (AWG series, inch fractions)
src/lib/view.ts             data → what the page renders (source map, toggles, columns)
scripts/check-data.ts       data checks; runs before the build
scripts/render-sheets.mjs   renders dist/sheets/*.pdf and *.png after the build
scripts/check-html.mjs      audits the built HTML; runs last
src/pages/sheet/…          the sheet documents the renderer drives; noindex
```

## The four build gates

Each one exists because something got through without it.

| Gate | Refuses to build on |
|---|---|
| `check:data` | a column with no source, an unused citation, a broken monotonic run, inch/mm columns that disagree, a gap in a series, a missing precision, a toggle with no data, a title over 60 characters, a description outside 140–165 |
| `astro build` | type errors in the chart data |
| `render:sheets` | a missing or tiny sheet file, a PDF longer than one page, a vertical PNG filling under 82 % of its canvas, or a sheet whose content overflows its box horizontally (measured, not estimated) |
| `check:html` | a 404 local reference, a page with no structured data or no `og:image`, an `<img>` with no alt or no dimensions, `<br>` inside an `<h1>`, more than 20 headings of one level, a units toggle with no CSS, "Made in the USA", a "next review" date, an em dash in visible copy, a shipped HTML comment |

The pin sheet also refuses to render below **15 px type**: if `pinSheet.columns` ×
`pinSheet.rowColumns` cannot fit 1000×1500 at a size that survives a thumbnail, the
build stops and names the lever to pull. Type size is computed from both the vertical
and the horizontal budget, so a sheet fits by construction rather than by luck.

## House rules the build enforces

- **Every published standard is followable.** A non-definitional source needs a
  `url` pointing at the publisher's own page, or a `urlNote` saying why there is
  none. `/how-we-verify/` builds an index of all of them from the registry.
- **No em dashes in reader-facing copy.** Commas, colons and full stops instead.
  En dashes stay in ranges (`16–22 AWG`); the minus in `D − P` is arithmetic.
- **Authoring notes stay in the source.** Use `{/* … */}` in templates, not HTML
  comments: Astro strips the first and ships the second.

## The one rule

A chart publishes only if its `verification.status` is `derived` or `verified`.

- `derived` — every value is recomputed from a definition by `check-data.ts`, so
  the machine check is a truth check. AWG diameters and inch fractions qualify.
- `verified` — values were transcribed from the named standard and then read back
  against it by a person, who is recorded in `verifiedBy` with the date.
- `needs-review` — no page, no card, no sitemap entry. Counts as work, not as a
  chart.

To publish a held chart: fill its rows from the standard, read them back line by
line, set `status: 'verified'` with your name and the date, and move it out of
`pending.ts` into its own file. Nothing else needs changing — the home page,
trade counts, footer, sitemap and related links all read from the registry.

## What the checks catch, and what they cannot

They catch a column with no source, an unused citation, a broken monotonic run,
inch/mm columns that disagree, a gap in a series, a missing precision, and a
toggle with no data behind it.

They do not catch a table that is internally perfect and wrong. A draft of the
O-ring chart converted inches to millimetres flawlessly on every row while every
dash number carried its neighbour's dimensions. That is why anything transcribed
waits for a person. See `../DECISIONS.md`.
