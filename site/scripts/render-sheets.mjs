/**
 * Post-build: render the print sheet to PDF and the vertical sheet to PNG.
 *
 * Runs after `astro build`, serves `dist/` over loopback, drives headless
 * Chromium over the `/sheet/print/<slug>/` and `/sheet/pin/<slug>/` routes, and
 * writes `dist/sheets/<slug>.pdf` and `dist/sheets/<slug>.png`.
 *
 * Why Chromium rather than generating the sheets from data a second time: the
 * layout then exists once, in CSS, and the printed sheet cannot drift from the
 * page it came from. The cost is a browser in CI, which is the right trade for
 * an asset that is the product.
 *
 * The script FAILS the build if any expected file is missing or implausibly
 * small. Six 404s where the main asset should be is the class of defect that
 * survives a build nobody checks, so the build checks.
 */

import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat, readFile as read } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const DIST = new URL('../dist/', import.meta.url).pathname;
const SHEETS = join(DIST, 'sheets');
const PORT = 41731;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

async function serveDist() {
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (path.endsWith('/')) path += 'index.html';
      const file = join(DIST, path);
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  return server;
}

/** Charts to render, read from the built pages so the two cannot disagree. */
async function publishedSlugs() {
  const manifest = JSON.parse(await readFile(join(DIST, 'sheets-manifest.json'), 'utf8'));
  return manifest;
}

const server = await serveDist();
await mkdir(SHEETS, { recursive: true });

const charts = await publishedSlugs();

/**
 * Normally this needs `npx playwright install chromium` once per machine.
 * Set `CHROMIUM_PATH` to reuse a browser the environment already has — some CI
 * images ship one, and downloading a second copy per build is waste.
 */
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const problems = [];

for (const { slug, printOrientation } of charts) {
  const page = await browser.newPage();

  // PDF — paper sized, orientation from the chart data.
  await page.goto(`http://127.0.0.1:${PORT}/sheet/print/${slug}/`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: join(SHEETS, `${slug}.pdf`),
    format: 'Letter',
    landscape: printOrientation === 'landscape',
    printBackground: true,
    // The sheet pads itself; a margin here would apply on top of that.
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  /**
   * Print-sheet preview PNG.
   *
   * The page shows a thumbnail of the printable sheet, and it has to be a picture
   * of THAT sheet. Cropping the vertical PNG instead was showing the reader a
   * portrait two-block layout above a button that hands over a landscape file —
   * a preview that misrepresents its own download, which is the same defect as a
   * caption that does not match its table.
   */
  const wide = printOrientation === 'landscape';
  await page.setViewportSize(wide ? { width: 1100, height: 850 } : { width: 850, height: 1100 });
  await page.emulateMedia({ media: 'print' });
  await page.goto(`http://127.0.0.1:${PORT}/sheet/print/${slug}/`, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: join(SHEETS, `${slug}-print.png`),
    clip: wide ? { x: 0, y: 0, width: 1100, height: 850 } : { x: 0, y: 0, width: 850, height: 1100 },
  });

  // PNG — the vertical asset for the image pack and Pinterest.
  await page.setViewportSize({ width: 1000, height: 1500 });
  await page.emulateMedia({ media: 'screen' });
  await page.goto(`http://127.0.0.1:${PORT}/sheet/pin/${slug}/`, { waitUntil: 'networkidle' });

  /**
   * The sheet must use the full height (DESIGN.md §3). Checking it rather than
   * trusting it, because empty canvas is invisible in code and obvious in a feed
   * — the first version of this sheet left 40 % of it blank and built cleanly.
   */
  const box = await page.evaluate(() => {
    const body = document.querySelector('.sheet-body');
    if (!body) return null;
    const r = body.getBoundingClientRect();
    /**
     * Both axes. Only the vertical one was measured at first, so a table one column
     * too wide ran off the right edge and the build passed: the wire sheet cropped
     * mid-word at "CIRCUL" and dropped two columns for half its rows. `scrollWidth`
     * is what catches it, because the overflow is clipped and invisible in the
     * bounding box.
     */
    // Compare against the container's own clientWidth rather than a hard-coded
    // content width: overflow exists exactly when the content is wider than the box
    // it sits in, and that stays true if the padding or canvas ever changes.
    const overflow = Math.max(
      body.scrollWidth - body.clientWidth,
      ...[...body.querySelectorAll('table')].map((el) => el.scrollWidth - el.clientWidth),
      ...[...body.querySelectorAll('th, td')].map((el) => el.scrollWidth - el.clientWidth),
    );
    return { fill: r.bottom / 1500, overflow, width: body.clientWidth };
  });

  if (!box) {
    problems.push(`${slug}.png has no sheet body`);
  } else {
    if (box.fill < 0.82) {
      problems.push(
        `${slug}.png fills only ${(box.fill * 100).toFixed(0)} % of the 1500 px canvas — ` +
          `adjust pinSheet.rowColumns or drop a column`,
      );
    }
    if (box.overflow > 1) {
      problems.push(
        `${slug}.png overflows its ${box.width} px content box by ${box.overflow} px, so ` +
          `columns or figures are cropped: drop a column from pinSheet.columns or reduce ` +
          `pinSheet.rowColumns`,
      );
    }
  }

  await page.screenshot({ path: join(SHEETS, `${slug}.png`), clip: { x: 0, y: 0, width: 1000, height: 1500 } });

  await page.close();
  console.log(`  · sheets/${slug}.pdf + .png`);
}

await browser.close();
server.close();

// Verify, rather than trust.
for (const { slug } of charts) {
  for (const ext of ['pdf', 'png', '-print.png']) {
    const file = join(SHEETS, ext.startsWith('-') ? `${slug}${ext}` : `${slug}.${ext}`);
    try {
      const { size } = await stat(file);
      if (size < 4096) problems.push(`${slug}.${ext} is only ${size} bytes`);
    } catch {
      problems.push(`${slug} ${ext} was not written`);
      continue;
    }

    /**
     * A wall sheet is one page. Two pages means the table outgrew the layout —
     * usually because rows were added — and the fix is another row-block in
     * `printSheet.rowColumns`, not a reader stapling two sheets together.
     */
    if (ext === 'pdf') {
      const bytes = await read(file);
      const pages = (bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      if (pages !== 1) {
        problems.push(
          `${slug}.pdf is ${pages} pages — raise printSheet.rowColumns so it fits one sheet`,
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error('\n  render:sheets FAILED\n');
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error('');
  process.exit(1);
}

await writeFile(
  join(SHEETS, 'README.txt'),
  'Generated by scripts/render-sheets.mjs at build time. Do not edit or commit.\n',
);

console.log(`\n  render:sheets passed — ${charts.length * 3} files\n`);
