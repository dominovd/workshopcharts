/**
 * Turns `dist/` into a Vercel prebuilt deployment (`.vercel/output/`).
 *
 * Vercel's build image cannot launch Chromium: `playwright install chromium`
 * downloads fine, then the binary fails with `libnspr4.so: cannot open shared
 * object file`, and the image has no apt or dnf we can rely on to fix it. Since
 * rendering the printable sheets IS the build, the build has to happen somewhere
 * with a complete container, and the host receives the finished output.
 *
 * So CI builds on ubuntu-latest, where `playwright install --with-deps chromium`
 * works, and deploys with `vercel deploy --prebuilt`. That has a second benefit
 * worth more than the convenience it costs: the four gates now run in exactly the
 * place that decides whether a deploy happens, rather than on a machine that
 * reports back.
 *
 * Headers live here rather than in `vercel.json`, because a prebuilt deployment is
 * configured by `config.json` and a `vercel.json` alongside it would be a second
 * copy of the truth that never applies.
 */

import { cp, mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, '.vercel', 'output');

// Fail rather than deploy an empty directory: the whole point of the gates is that
// a build which did not produce the sheets cannot reach the reader.
for (const required of ['index.html', 'sheets/wire-gauge-chart.png', 'sitemap.xml']) {
  try {
    await stat(join(DIST, required));
  } catch {
    console.error(`\n  vercel-output FAILED: dist/${required} is missing. Run npm run build first.\n`);
    process.exit(1);
  }
}

await rm(join(ROOT, '.vercel', 'output'), { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(DIST, join(OUT, 'static'), { recursive: true });

const config = {
  version: 3,
  // Canonical URLs carry a trailing slash, so the host should too.
  trailingSlash: true,
  routes: [
    {
      // Generated sheets: revalidated often enough that a corrected chart reaches
      // readers, cached long enough at the edge to cost nothing.
      src: '^/sheets/(.*)$',
      headers: {
        'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
      continue: true,
    },
    {
      // Content-hashed assets never change under the same name.
      src: '^/_astro/(.*)$',
      headers: { 'cache-control': 'public, max-age=31536000, immutable' },
      continue: true,
    },
    {
      src: '^/(.*)$',
      headers: {
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'x-frame-options': 'SAMEORIGIN',
      },
      continue: true,
    },
  ],
};

await writeFile(join(OUT, 'config.json'), JSON.stringify(config, null, 2) + '\n');

console.log(`\n  vercel-output ready — .vercel/output/static + config.json\n`);
