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
import { publishedCharts } from '../src/data/registry.ts';

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
    const decorative = /aria-hidden="true"/.test(img);

    /**
     * An empty alt is the CORRECT markup for a decorative image, and only for one.
     * The binder clip and the trade icons carry nothing the copy does not already
     * say, so they are `alt="" aria-hidden="true"`. Anything else needs a real
     * description: a sheet thumbnail with no alt is a missing asset to a reader who
     * cannot see it.
     */
    if (alt === undefined) {
      fail(url, `<img> has no alt attribute at all: ${img.slice(0, 90)}`);
    } else if (alt === '' && !decorative) {
      fail(url, `<img> has an empty alt but is not marked aria-hidden: ${img.slice(0, 90)}`);
    } else if (alt !== '' && alt.length < 20) {
      fail(url, `<img> alt is too short to describe it: ${img.slice(0, 90)}`);
    }

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
  /**
   * Served by the host at runtime, not built into dist/. Currently just the Web
   * Analytics script. Deliberately a prefix list rather than a blanket rule: the
   * reference check is what turns a missing asset into a failed build, and the only
   * safe way to keep it is to exempt exactly what the host provides.
   */
  const RUNTIME_PREFIXES = ['/_vercel/'];

  for (const ref of new Set(refs)) {
    if (ref.startsWith('//')) continue;
    if (RUNTIME_PREFIXES.some((prefix) => ref.startsWith(prefix))) continue;
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
  /*
   * What counts as copy the reader sees.
   *
   * Stripping every `<script>` was too broad. The structured data is a script
   * block, and it carries the same sentences as the page: the FAQ answers go out
   * twice, once into `<details>` and once into JSON-LD, and only the first was
   * being checked. A spelling or a punctuation rule that holds on the page and
   * not in the graph is half a rule, and the half that fails is the one search
   * engines read. Behaviour scripts still come out, since their identifiers are
   * not prose.
   */
  const visible = html
    .replace(/<script(?![^>]*application\/ld\+json)[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(new RegExp('<' + '!' + '--[\\s\\S]*?--' + '>', 'g'), '');
  const emDashes = (visible.match(/\u2014/g) ?? []).length;
  if (emDashes > 0) {
    const sample = visible.match(/.{0,45}\u2014.{0,45}/)?.[0].replace(/\s+/g, ' ').trim();
    fail(url, `has ${emDashes} em dash(es) in visible copy: "…${sample}…"`);
  }

  // ---- One spelling, and it is the one the sources use --------------------
  /**
   * American spellings, because the standards are American.
   *
   * The site had both: a column headed `Aluminum` over cells whose footnote said
   * a column headed with the American spelling of the metal over cells whose
   * footnote used the British one, and forty-seven American spellings against
   * nineteen British ones across the charts. On a page whose whole proposition is that the
   * reader can compare what is printed here against what is printed in the
   * standard, a word that does not match the standard is a stumble on the first
   * one they check. NEC, ASTM and ASME all write `aluminum`, the dimensions are
   * inches and the sheet is US Letter, so the house spelling follows them.
   *
   * Checked in the built HTML rather than in the source: what matters is what
   * reaches the reader, and this is the file that sees that.
   */
  /*
   * The words are assembled from pieces on purpose.
   *
   * Written out whole, this list is a list of British spellings sitting in a
   * file, and the first site-wide spelling pass found them and corrected them.
   * Every entry then named the spelling it was meant to require, and the check
   * failed every page on the site for using it. A rule that a find-and-replace
   * can invert is not a rule. Splitting the literals puts them
   * out of reach of the next one, the same trick this file already uses for the
   * HTML comment opener a few checks down.
   */
  const BRITISH = [
    ['alumin' + 'ium', 'aluminum'],
    ['millimet' + 're', 'millimeter'],
    ['catalog' + 'ue', 'catalog'],
    ['behavi' + 'our', 'behavior'],
    ['defen' + 'ce', 'defense'],
    ['grey' + 'scale', 'grayscale'],
    ['\\bmet' + 'res?\\b', 'meter, meters'],
    ['\\bcent' + 're', 'center'],
    ['\\blabel' + 'led\\b', 'labeled'],
  ];
  for (const [pattern, american] of BRITISH) {
    const hit = visible.match(new RegExp(pattern, 'i'));
    if (hit) {
      const sample = visible
        .match(new RegExp('.{0,40}' + pattern + '.{0,40}', 'i'))?.[0]
        .replace(/\s+/g, ' ')
        .trim();
      fail(url, `uses "${hit[0]}" in visible copy; the house spelling is "${american}": "…${sample}…"`);
    }
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

/**
 * Every asset in public/images has to be used by something.
 *
 * This check exists because seven images and a component were committed to the
 * repository and no template ever referenced them: a favicon, a binder clip, four
 * trade icons and an illustration sat in `public/` for hours while the pages that
 * should have shown them rendered without. Nothing failed, because nothing was
 * looking from that direction. The reference check only runs the other way, asking
 * whether a referenced file exists.
 *
 * An asset nobody uses is either work that was lost or weight nobody needs, and both
 * are worth a failed build rather than a shrug.
 */
async function checkEveryAssetIsUsed(allHtml) {
  const dir = join(DIST, 'images');
  let assets;
  try {
    assets = await htmlAssets(dir);
  } catch {
    return; // no images directory is fine
  }

  for (const asset of assets) {
    const ref = '/' + relative(DIST, asset);
    if (!allHtml.some((html) => html.includes(ref))) {
      failures.push(
        `${ref} is in public/ but no page references it. ` +
          `Wire it into a template or remove it.`,
      );
    }
  }
}

async function htmlAssets(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlAssets(full)));
    else out.push(full);
  }
  return out;
}

/**
 * A transcribed figure reaches the reader with the source's own digits.
 *
 * This is the check the `asPrinted` field exists for, and it has to live here
 * rather than in `check-data.ts`. There, the string and the number both come
 * from the same literal, so comparing them proves nothing: change one and the
 * other changes with it. The claim worth testing is about the rendered page —
 * that 0.100 reaches the reader as 0.100 and not as 0.1 or 0.1000 — and the only
 * place that claim is falsifiable is the built HTML. A formatter that stopped
 * consulting `asPrinted` would pass every data check and fail here.
 */
async function checkPrintedFiguresSurvive() {
  for (const chart of publishedCharts) {
    const wanted = new Set();
    for (const row of chart.rows) {
      for (const printed of Object.values(row.asPrinted ?? {})) wanted.add(printed);
      // Footnote text travels the same way and fails the same way: a marker on a
      // figure with its text missing from the page is a qualifier the reader
      // cannot read, which is worse than no marker at all.
      for (const note of Object.values(row.notes ?? {})) wanted.add(note);
    }
    if (wanted.size === 0) continue;

    for (const route of [`${chart.slug}/index.html`, `sheet/print/${chart.slug}/index.html`]) {
      let html;
      try {
        html = await readFile(join(DIST, route), 'utf8');
      } catch {
        fail(route, `expected page is missing for chart "${chart.slug}".`);
        continue;
      }
      const text = html.replace(/<[^>]*>/g, ' ');
      const missing = [...wanted].filter((figure) => !text.includes(figure));
      if (missing.length > 0) {
        fail(
          route,
          `${missing.length} transcribed figure(s) do not appear as the source prints them, ` +
            `starting with "${missing[0]}". Something between the data and the page is ` +
            `reformatting numbers that were copied from a standard.`,
        );
      }
    }
  }
}

await checkPrintedFiguresSurvive();

await checkEveryAssetIsUsed(await Promise.all(files.map((f) => readFile(f, 'utf8'))));

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
