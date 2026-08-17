# WorkshopCharts

Printable reference charts for the workshop, where every column names the standard
it comes from and every chart shows the date it was last checked.

Live site: [workshopcharts.com](https://workshopcharts.com)

## Layout

```
site/                 the Astro project (see site/README.md)
vercel.json           build configuration, driven from this root
package.json          declares the Node version the build needs
.github/workflows/    CI running the four build gates on every push
```

The Astro project is in `site/`, not at the root. Both manifests here exist because
of that.

## Why the config is at the repo root

`vercel.json` here builds `site/` from the repository root, so no Root Directory
setting is needed in the host's dashboard. Two things in it are load-bearing:

- **`framework: null`.** Without it the host auto-detects Astro and substitutes its
  own `astro build`, which runs at the repository root where there is no Astro
  project and no `node_modules`. That produces `astro: command not found`, and the
  log gives no install step at all as the tell.
- **`installCommand` and `buildCommand` both `cd site`.** Commands run from the
  repository root, so the install has to be pointed at the project.

There is deliberately no second `vercel.json` inside `site/`. Two configs, each
correct for a different Root Directory setting, are two copies of the truth, and one
of them eventually goes stale.

The root `package.json` carries only `engines.node`. Node 22.6 or newer is required:
the data checks run TypeScript directly via `--experimental-strip-types`.

Note that JSON has no comments and `vercel.json` is schema-validated, so a `"//"`
key in it fails the build. That is why this explanation lives here.

## Build

```bash
cd site
npm install
npx playwright install chromium   # once: the build renders the printable sheets
npm run build
```

`npm run build` is four gates in sequence, and any one of them stops the build:

| Gate | Refuses to build on |
|---|---|
| `check:data` | a column with no followable source, an unused citation, a broken monotonic run, inch/mm columns that disagree, a gap in a series, a toggle with no data behind it |
| `astro build` | type errors in the chart data |
| `render:sheets` | a missing sheet file, a PDF longer than one page, a vertical PNG under-filling or overflowing its canvas |
| `check:html` | a 404 local reference, a missing `og:image` or structured data, an `<img>` without alt or dimensions, an em dash in visible copy |

`site/README.md` has the detail, including the publication rule that keeps an
unchecked chart off the site entirely.

## Deploying where a browser is not available

`render:sheets` launches real Chromium to produce the PDF and PNG sheets. If a host's
build image cannot launch it, the tell in the log is `browserType.launch` or
`error while loading shared libraries`.

That is not a configuration problem and there is no flag for it. Build in GitHub
Actions instead, where Playwright is fully supported: `.github/workflows/verify.yml`
already runs the full build on `ubuntu-latest` and uploads `site/dist`.

Building pages alone is not a workaround. `check:html` fails on the missing sheet
files, because the pages reference them, so a build without the sheets cannot quietly
ship as if it were complete.

## Licence

The charts and sheets are free to use, print and hand out, including in class. See
[/terms/](https://workshopcharts.com/terms/).
