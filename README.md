# WorkshopCharts

Printable reference charts for the workshop, where every column names the standard
it comes from and every chart shows the date it was last checked.

Live site: [workshopcharts.com](https://workshopcharts.com)

## Layout

```
site/                        the Astro project (see site/README.md)
package.json                 declares the Node version the build needs
vercel.json                  one line, telling the host not to build (see below)
.github/workflows/verify.yml the four build gates, on every pull request
.github/workflows/deploy.yml build and deploy, on every push to main
```

## Where the build runs, and why not on the host

**CI builds; the host receives finished output.**

The reason is specific rather than a preference. `npm run build` renders the printable
PDF and PNG sheets with headless Chromium, and Vercel's build image cannot launch it:
the download succeeds, then the binary dies with

```
libnspr4.so: cannot open shared object file: No such file or directory
```

The image has no apt, so `playwright install --with-deps` has nothing to work with.
Patching a build image through an undocumented package manager is a poor foundation
for a project whose entire value is that its checks actually run.

So `deploy.yml` builds on `ubuntu-latest`, which is a complete container, and ships
the result with `vercel deploy --prebuilt`. That has a benefit worth more than the
convenience it cost: the four gates now run in the place that decides whether a
deploy happens, instead of on a machine that reports back afterwards.

`scripts/vercel-output.mjs` converts `dist/` into `.vercel/output/`, and the cache and
security headers live in the `config.json` it writes. A prebuilt deployment is
configured by that file, which is why none of that lives in `vercel.json`: it would be
a second copy of the truth that never applies.

### How the host is told not to build

`vercel.json` contains exactly one line:

```json
{ "ignoreCommand": "exit 0" }
```

In the Ignored Build Step, exit 0 means *skip this build*. Git-triggered builds are
skipped and marked as such; CLI deploys from CI are unaffected, because
`ignoreCommand` is only consulted for Git deployments. Doing it in the repository
rather than in a dashboard field means it travels with the code and cannot be
forgotten when the project is re-created.

Without it the host keeps building on every push and keeps failing on the browser.
It will find whatever build script it can reach — including this repository's root
one — so removing the script is not a substitute.

### Setting it up

Repository secrets, under Settings → Secrets and variables → Actions:
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. The two ids appear in
`.vercel/project.json` after running `npx vercel link` locally. `deploy.yml` checks
for all three before it does anything else, so a missing one fails in the first
second with the name of what is missing rather than in a CLI error four minutes in.

The root `package.json` carries only `engines.node`. Node 22.6 or newer is required:
the data checks run TypeScript directly via `--experimental-strip-types`.

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

## Deploying somewhere else

The output is plain static files with no server functions, so any static host works.
The only requirement is that the build runs where Chromium can launch. If a host's
build image cannot, the tell in the log is `browserType.launch` or
`error while loading shared libraries`, and the answer is to build in CI and upload
the result rather than to fight the image.

Building pages alone is not a workaround. `check:html` fails on the missing sheet
files, because the pages reference them, so a build without the sheets cannot quietly
ship as though it were complete.

## Licence

The charts and sheets are free to use, print and hand out, including in class. See
[/terms/](https://workshopcharts.com/terms/).
