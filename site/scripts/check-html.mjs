/**
 * Post-build audit of the generated HTML.
 *
 * `check-data.ts` guards the data; this guards the output. It exists because a
 * whole class of defect passed a clean build on the first pass: six sheet files
 * that were 404, `og:image` pointing at one of them, not a single `<img>` on any
 * page, four pages with no structured data, and a units toggle whose CSS had never
 * been written. Every one of those is visible in the built HTML — nothing was
 * looking.
 *
 * Runs over `dist/` with no browser and no dependencies: parse enough with
 * regular expressions to check the things that are cheap to state and expensive
 * to miss.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

const failures = [];
const warnings = [];

function fail(page, message) {
  failures.push(`${page}: ${message}`);
}

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = await htmlFiles(DIST);

for (const file of files) {
  const url = '/' + relative(DIST, file).replace(/index\.html$/, '');
  const html = await readFile(file, 'utf8');

  // The sheet source routes are noindex by design and are not reader-facing.
  const isSheetRoute = url.startsWith('/sheet/');

  // ---- Title -------------------------------------------------------------
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  if (!title) fail(url, 'no <title>');
  if (!isSheetRoute && title.length > 60) {
    fail(url, `title is ${title.length} characters, over the 60 where it gets cut: "${title}"`);
  }
  for (const term of ['sources per column', 'needs-review', 'registry']) {
    if (title.toLowerCase().includes(term)) fail(url, `title contains internal term "${term}"`);
  }

  if (isSheetRoute) {
    if (!/name="robots"[^>]*noindex/.test(html)) fail(url, 'sheet route is not noindex');
    continue;
  }

  // ---- Description -------------------------------------------------------
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (!desc) fail(url, 'no meta description');
  else if (desc.length < 140 || desc.length > 165) {
    fail(url, `meta description is ${desc.length} characters; keep it 140–165`);
  }

  // ---- Canonical ---------------------------------------------------------
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? '';
  if (!canonical) fail(url, 'no canonical');
  if (canonical.includes('?')) fail(url, 'canonical carries query parameters');

  // ---- Structured data ---------------------------------------------------
  const graphs = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (graphs.length === 0) fail(url, 'no structured data');
  for (const [, body] of graphs) {
    try {
      JSON.parse(body);
    } catch {
      fail(url, 'structured data is not valid JSON');
    }
  }
  if (/\bWebApplication\b/.test(html)) {
    fail(url, 'marked up as WebApplication — this is a reference page, not an app');
  }

  // ---- Share image -------------------------------------------------------
  const og = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? '';
  if (!og) fail(url, 'no og:image');

  // ---- Heading structure -------------------------------------------------
  /**
   * A table row is not a section.
   *
   * If a mobile card layout is built out of headings, the document outline becomes
   * "AWG: 0000", "AWG: 000" and so on, one entry per row, and the real sections
   * disappear into it. Cards belong in a description list or a table with ARIA, not
   * in `h3`. The threshold is deliberately low: a page has sections, not dozens.
   */
  for (const level of ['h2', 'h3', 'h4']) {
    const count = (html.match(new RegExp(`<${level}\\b`, 'g')) ?? []).length;
    if (count > 20) {
      fail(
        url,
        `has ${count} <${level}> elements, which is more sections than a page has. ` +
          `If this is a card layout built from headings, use a dl or ARIA instead.`,
      );
    }
  }

  // ---- One H1, and not two sentences glued together ----------------------
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
  if (h1s.length !== 1) fail(url, `has ${h1s.length} <h1> elements`);
  for (const [, inner] of h1s) {
    // A <br> between sentences leaves "need.Ready" in the text content, which is
    // what a screen reader and any text extraction actually get.
    if (/<br\s*\/?>/.test(inner)) {
      fail(url, '<h1> uses <br> — use block elements so sentences stay separate in the text');
    }
    const text = inner.replace(/<[^>]+>/g, '');
    if (/[a-z]\.[A-Z]/.test(text)) {
      fail(url, `<h1> text runs sentences together: "${text.trim()}"`);
    }
  }

  // ---- Images ------------------------------------------------------------
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  for (const img of imgs) {
    const alt = img.match(/alt="([^"]*)"/)?.[1];
    if (!alt || alt.length < 20) fail(url, `<img> has no useful alt: ${img.slice(0, 90)}`);
    if (!/width=/.test(img) || !/height=/.test(img)) {
      fail(url, '<img> without width and height reserves no space and shifts layout');
    }
  }

  // ---- Local references resolve -----------------------------------------
  const refs = [
    ...[...html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<meta property="og:image" content="[^"]*?(\/sheets\/[^"]+)"/g)].map(
      (m) => m[1],
    ),
  ];
  for (const ref of new Set(refs)) {
    if (ref.startsWith('//')) continue;
    const candidates = ref.endsWith('/')
      ? [join(DIST, ref, 'index.html')]
      : [join(DIST, ref), join(DIST, ref, 'index.html')];
    let found = false;
    for (const c of candidates) {
      try {
        await stat(c);
        found = true;
        break;
      } catch {
        /* try the next shape */
      }
    }
    if (!found) fail(url, `references ${ref}, which does not exist in dist/`);
  }

  // ---- Punctuation -------------------------------------------------------
  /**
   * No em dashes in reader-facing copy.
   *
   * A house style decision, and a mechanical one so it stays true: the em dash is
   * the easiest way to bolt a second clause onto a sentence, and in copy about
   * tolerances and standards a comma, a colon or a full stop says the same thing
   * with less shrug in it. En dashes stay: `16–22 AWG` and `140–165` are ranges,
   * where the en dash is the correct mark, and the minus sign in `D − P` is
   * arithmetic.
   */
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(new RegExp('<' + '!' + '--[\\s\\S]*?--' + '>', 'g'), '');
  const emDashes = (visible.match(/\u2014/g) ?? []).length;
  if (emDashes > 0) {
    const sample = visible.match(/.{0,45}\u2014.{0,45}/)?.[0].replace(/\s+/g, ' ').trim();
    fail(url, `has ${emDashes} em dash(es) in visible copy: "…${sample}…"`);
  }

  // ---- Authoring notes stay in the source --------------------------------
  /**
   * Template comments were shipping to the reader as HTML comments, which is how
   * four em dashes survived the punctuation rule: they sat in notes to ourselves
   * that Astro passed straight through. In `.astro` templates a JSX-style comment
   * is stripped at build time; an HTML one is not.
   *
   * The pattern is escaped because Node refuses to parse a literal HTML comment
   * opener inside an ES module.
   */
  const OPENER = '<' + '!' + '--';
  const comments = html.split(OPENER).length - 1;
  if (comments > 0) {
    fail(url, `ships ${comments} HTML comment(s); use {/* … */} in templates so they are stripped`);
  }

  // ---- Claims that were removed on purpose ------------------------------
  if (/Made in the USA/i.test(html)) {
    fail(url, 'contains "Made in the USA" — an unverifiable claim next to verifiable ones');
  }
  if (/next review/i.test(html)) {
    fail(url, 'contains a "next review" date — publish only the date last checked');
  }

  // ---- The units toggle has CSS behind it -------------------------------
  if (/data-units=/.test(html) && !/\[data-units=/.test(html)) {
    fail(
      url,
      'renders a units toggle with no matching CSS — the control would be inert, ' +
        'which is how Both, Inches and Metric all produced the same table',
    );
  }

  if (imgs.length === 0 && /chart-view/.test(html)) {
    warnings.push(`${url}: chart page with no image — the vertical PNG is the image-pack asset`);
  }
}

const pageCount = files.length;

if (failures.length > 0) {
  console.error(`\n  check:html FAILED — ${pageCount} pages\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}

console.log(`\n  check:html passed — ${pageCount} pages`);
for (const w of warnings) console.log(`  ! ${w}`);
console.log('');
