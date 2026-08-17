/**
 * Data checks. Runs before every build; a failure stops the build.
 *
 * DESIGN.md §4 draws the line this script is built around: a machine can check
 * FORM, and only a person reading the standard can check TRUTH. Everything below
 * is form — with one exception, and the exception is the interesting part.
 *
 * For charts marked `derived`, the values come from a definition rather than a
 * document, so re-deriving them here IS a truth check. That is the only reason
 * such a chart may publish without a signature. Every other chart publishes on a
 * human's sight-check, and nothing in this file can substitute for it.
 *
 * Two findings from the design review became checks here, because both had
 * already slipped past every consistency test that existed:
 *
 *   · A MAX AMPS column shipped in a table whose source map did not list it.
 *     `checkEveryColumnHasASource` fails the build on that, so the map and the
 *     table cannot drift apart.
 *
 *   · An O-ring table converted inches to millimetres flawlessly on every row
 *     and still disagreed with AS568, because the series had shifted by one row.
 *     Nothing here would have caught it. `reportUncheckable` prints that limit
 *     at the end of every run so it stays in view.
 */

import { allCharts, publishedCharts, pendingVerification } from '../src/data/registry.ts';
import type { Chart, Column } from '../src/data/schema.ts';
import { PUBLISHABLE } from '../src/data/schema.ts';
import { visibleColumns } from '../src/lib/view.ts';
import { awgSeries, sixtyFourthsSeries, MM_PER_INCH } from '../src/lib/derive.ts';

const failures: string[] = [];
const notes: string[] = [];

function fail(chart: Chart | null, message: string): void {
  failures.push(chart ? `[${chart.slug}] ${message}` : message);
}

// ---------------------------------------------------------------------------
// 1. Every column has a source, and every source is used
// ---------------------------------------------------------------------------

/**
 * The check that exists because of the ampacity column.
 *
 * A column with figures in it and no source behind it is the most expensive
 * defect available to this project: the reader extends the table's credibility
 * to the one number that never earned it. Running on ALL charts, not just
 * published ones — a held chart is a draft of a page, and the draft is where the
 * unsourced column gets added.
 */
function checkEveryColumnHasASource(chart: Chart): void {
  const declared = new Set(chart.sources.map((s) => s.id));

  for (const col of chart.columns) {
    if (!col.sources || col.sources.length === 0) {
      fail(chart, `column "${col.key}" has no source. Every column must name at least one.`);
      continue;
    }
    for (const id of col.sources) {
      if (!declared.has(id)) {
        fail(chart, `column "${col.key}" cites unknown source "${id}".`);
      }
    }
  }

  /**
   * A published standard must be followable.
   *
   * Naming a document and leaving the reader to go find it is half a citation, and
   * half a citation is the state this project set out to improve on. Either the
   * publisher's page, or an explicit note saying why there is no page — the
   * Manufacturers Standard Gauge has no standards body behind it, and saying so is
   * a fact the reader is owed. Silence is not one of the options.
   */
  for (const source of chart.sources) {
    if (source.definitional) continue;
    if (!source.url && !source.urlNote) {
      fail(
        chart,
        `source "${source.id}" (${source.standard}) has neither a url nor a urlNote. ` +
          `A published standard has to be followable, or the page has to say why not.`,
      );
    }
    if (source.url && !/^https:\/\//.test(source.url)) {
      fail(chart, `source "${source.id}" url is not https.`);
    }
  }

  const cited = new Set(chart.columns.flatMap((c) => c.sources));
  for (const source of chart.sources) {
    if (!cited.has(source.id)) {
      fail(
        chart,
        `source "${source.id}" (${source.standard}) is declared but no column cites it. ` +
          `A citation nobody uses reads as coverage the table does not have.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Verification metadata is complete
// ---------------------------------------------------------------------------

function checkVerificationMetadata(chart: Chart): void {
  const v = chart.verification;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.verifiedOn)) {
    fail(chart, `verifiedOn "${v.verifiedOn}" is not an ISO date.`);
  }

  if (v.status === 'verified' && !v.verifiedBy) {
    fail(
      chart,
      `status "verified" requires verifiedBy. A sight-check with nobody's name on it ` +
        `is indistinguishable from one that never happened.`,
    );
  }

  if (v.status === 'needs-review' && !v.note) {
    fail(chart, `status "needs-review" requires a note saying what must be checked.`);
  }

  for (const col of chart.columns) {
    const cv = col.verification;
    if (cv?.status === 'needs-review' && !cv.note) {
      fail(chart, `held column "${col.key}" requires a note.`);
    }
    if (cv?.status === 'verified' && !cv.verifiedBy) {
      fail(chart, `column "${col.key}" is marked verified with no verifiedBy.`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Published charts have rows; held charts may be empty
// ---------------------------------------------------------------------------

function checkRowPresence(chart: Chart): void {
  const publishable = PUBLISHABLE.includes(chart.verification.status);

  if (publishable && chart.rows.length === 0) {
    fail(chart, `published chart has no rows.`);
    return;
  }
  if (!publishable) return;

  for (const col of visibleColumns(chart)) {
    for (const row of chart.rows) {
      const value = row.cells[col.key];
      if (value === null || value === undefined || value === '') {
        fail(chart, `row "${row.id}" has no value for visible column "${col.key}".`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Monotonicity
// ---------------------------------------------------------------------------

/**
 * The one form check that catches real data errors mechanically (DESIGN.md §4):
 * if torque for M10 comes out below M8, that is wrong whatever the source says.
 */
function checkMonotonic(chart: Chart): void {
  for (const col of visibleColumns(chart)) {
    if (!col.monotonic) continue;

    let previous: number | null = null;
    for (const row of chart.rows) {
      const value = row.cells[col.key];
      if (typeof value !== 'number') continue;
      if (previous !== null) {
        const ok = col.monotonic === 'asc' ? value > previous : value < previous;
        if (!ok) {
          fail(
            chart,
            `column "${col.key}" must be ${col.monotonic} but ${previous} is followed by ${value} ` +
              `at row "${row.id}".`,
          );
        }
      }
      previous = value;
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Unit conversions round-trip
// ---------------------------------------------------------------------------

/**
 * Worth being explicit about what passing this proves: that two columns agree
 * with each other. Nothing more. The O-ring table passed this check on every row
 * while disagreeing with the standard on every row.
 */
function checkConversions(chart: Chart): void {
  for (const col of visibleColumns(chart)) {
    if (!col.convertedFrom) continue;
    const { column: sourceKey, factor } = col.convertedFrom;

    if (!chart.columns.some((c) => c.key === sourceKey)) {
      fail(chart, `column "${col.key}" converts from unknown column "${sourceKey}".`);
      continue;
    }

    for (const row of chart.rows) {
      const from = row.cells[sourceKey];
      const to = row.cells[col.key];
      if (typeof from !== 'number' || typeof to !== 'number') continue;

      const expected = from * factor;
      const tolerance = Math.max(Math.abs(expected) * 1e-9, 1e-12);
      if (Math.abs(expected - to) > tolerance) {
        fail(
          chart,
          `column "${col.key}" at row "${row.id}" is ${to}, expected ${expected} ` +
            `from ${sourceKey} × ${factor}.`,
        );
      }
    }
  }

  // Paired columns must not claim more precision than their partner supports.
  for (const col of visibleColumns(chart)) {
    if (!col.convertedFrom) continue;
    const partner = chart.columns.find((c) => c.key === col.convertedFrom!.column);
    if (!partner) continue;
    const own = col.precision ?? 0;
    const theirs = partner.precision ?? 0;
    if (Math.abs(own - theirs) > 3) {
      fail(
        chart,
        `column "${col.key}" shows ${own} decimals against ${theirs} on "${partner.key}". ` +
          `Paired columns should not advertise different precision for the same measurement.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Re-derivation — the only truth check available here
// ---------------------------------------------------------------------------

function checkDerived(chart: Chart): void {
  if (chart.verification.status !== 'derived') return;

  const recompute: Record<string, () => Record<string, Record<string, number>>> = {
    'wire-gauge-chart': () => {
      const out: Record<string, Record<string, number>> = {};
      for (const r of awgSeries(-3, 40)) {
        out[`awg-${r.label}`] = {
          diameterIn: r.diameterIn,
          diameterMm: r.diameterMm,
          circularMils: r.circularMils,
          areaMm2: r.areaMm2,
        };
      }
      return out;
    },
    'drill-bit-size-chart': () => {
      const out: Record<string, Record<string, number>> = {};
      for (const r of sixtyFourthsSeries(1, 64)) {
        out[`frac-${r.sixtyFourths}-64`] = { inches: r.inches, mm: r.mm };
      }
      return out;
    },
    'fraction-to-decimal-chart': () => {
      const out: Record<string, Record<string, number>> = {};
      for (const r of sixtyFourthsSeries(1, 64)) {
        out[`conv-${r.sixtyFourths}-64`] = {
          sixtyFourths: r.sixtyFourths,
          decimal: r.inches,
          mm: r.mm,
          thousandths: r.inches * 1000,
        };
      }
      return out;
    },
  };

  const recomputeFor = recompute[chart.slug];
  if (!recomputeFor) {
    fail(
      chart,
      `is marked "derived" but this script has no independent derivation for it. ` +
        `A chart may only claim "derived" if the check can recompute it — otherwise it ` +
        `needs a human sight-check and the status is "verified".`,
    );
    return;
  }

  const expected = recomputeFor();
  const expectedIds = Object.keys(expected);

  if (expectedIds.length !== chart.rows.length) {
    fail(
      chart,
      `has ${chart.rows.length} rows, derivation produces ${expectedIds.length}. ` +
        `A gap in a series is how a reference table stops being one.`,
    );
  }

  for (const [index, id] of expectedIds.entries()) {
    const row = chart.rows[index];
    if (!row) continue;
    if (row.id !== id) {
      fail(chart, `row ${index} is "${row.id}", derivation expects "${id}" — series is out of step.`);
      continue;
    }
    for (const [key, value] of Object.entries(expected[id]!)) {
      const actual = row.cells[key];
      if (typeof actual !== 'number') {
        fail(chart, `row "${id}" column "${key}" is not numeric.`);
        continue;
      }
      if (Math.abs(actual - value) > Math.abs(value) * 1e-12 + 1e-15) {
        fail(chart, `row "${id}" column "${key}" is ${actual}, derivation gives ${value}.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 6b. Metadata written for the reader, not for us
// ---------------------------------------------------------------------------

/**
 * The title and description are the only copy most people ever see, so they get
 * the same treatment as the data: mechanical limits, and no internal vocabulary.
 * "sources per column" is how this project talks about itself; the search box
 * gets "wire gauge chart".
 */
const INTERNAL_TERMS = ['sources per column', 'needs-review', 'derived', 'truth level', 'registry'];

function checkMetadata(chart: Chart): void {
  if (!PUBLISHABLE.includes(chart.verification.status)) return;

  if (chart.metaTitle.length < 20 || chart.metaTitle.length > 60) {
    fail(
      chart,
      `metaTitle is ${chart.metaTitle.length} characters; keep it 20–60 so it is not truncated.`,
    );
  }
  if (chart.metaDescription.length < 140 || chart.metaDescription.length > 165) {
    fail(
      chart,
      `metaDescription is ${chart.metaDescription.length} characters; keep it 140–165.`,
    );
  }
  if (chart.imageAlt.length < 40) {
    fail(chart, `imageAlt is too short to describe the table.`);
  }
  for (const term of INTERNAL_TERMS) {
    if (chart.metaTitle.toLowerCase().includes(term)) {
      fail(chart, `metaTitle contains the internal term "${term}".`);
    }
  }
  // The head phrase has to survive into the title, or the page is competing on
  // a phrase it never states.
  const head = chart.title.toLowerCase();
  if (!chart.metaTitle.toLowerCase().includes(head.replace(/^fractional /, ''))) {
    fail(chart, `metaTitle does not contain the chart title "${chart.title}".`);
  }
}

// ---------------------------------------------------------------------------
// 6c. Sheet layout is configured
// ---------------------------------------------------------------------------

function checkSheets(chart: Chart): void {
  if (!PUBLISHABLE.includes(chart.verification.status)) return;

  const visible = new Set(visibleColumns(chart).map((c) => c.key));
  if (chart.pinSheet.columns.length < 2) {
    fail(chart, `pinSheet needs at least two columns.`);
  }
  for (const key of chart.pinSheet.columns) {
    if (!visible.has(key)) {
      fail(chart, `pinSheet names column "${key}", which is not in the rendered table.`);
    }
  }
  if (chart.pinSheet.columns.length < visible.size && !chart.pinSheet.note) {
    fail(
      chart,
      `pinSheet drops ${visible.size - chart.pinSheet.columns.length} column(s) but has no note. ` +
        `An image that quietly shows less than the page is a silent gap by another route.`,
    );
  }
  if (chart.printSheet.rowColumns < 1 || chart.printSheet.rowColumns > 4) {
    fail(chart, `printSheet.rowColumns must be 1–4.`);
  }
}

// ---------------------------------------------------------------------------
// 7. Coverage is declared
// ---------------------------------------------------------------------------

/**
 * Because of the O-ring series that skipped -009 with no note. A reference table
 * that omits members of a series silently reads as exhaustive; the reader cannot
 * tell absence from omission, and a size they need looks like a size that does
 * not exist.
 */
function checkCoverage(chart: Chart): void {
  if (!chart.coverageNote || chart.coverageNote.trim().length < 12) {
    fail(chart, `needs a coverageNote saying what the row set covers.`);
  }
  // Only meaningful once the chart renders: a held chart has no visible columns
  // yet, and the monotonic direction is one of the things the sight-check settles.
  // (Number drill sizes, for instance, get SMALLER as the number rises — guessing
  // the direction here would have written a wrong rule into the data.)
  if (
    PUBLISHABLE.includes(chart.verification.status) &&
    chart.completeness === 'continuous' &&
    !visibleColumns(chart).some((c) => c.monotonic)
  ) {
    fail(
      chart,
      `declares completeness "continuous" but no column is marked monotonic, so ` +
        `continuity is unverifiable.`,
    );
  }
}

// ---------------------------------------------------------------------------
// 8. Controls have data behind them
// ---------------------------------------------------------------------------

/**
 * A toggle that changes nothing is a claim the table does not support: an
 * Aluminum button on a copper-only table tells the reader aluminium is covered.
 * Columns are what create toggles, so a lone variant option means data is
 * missing, not that a control is harmless.
 */
function checkVariantsAreBacked(chart: Chart): void {
  const byAxis = new Map<string, Set<string>>();
  for (const col of visibleColumns(chart)) {
    if (!col.variant) continue;
    const set = byAxis.get(col.variant.axis) ?? new Set<string>();
    set.add(col.variant.option);
    byAxis.set(col.variant.axis, set);
  }
  for (const [axis, options] of byAxis) {
    if (options.size < 2) {
      fail(
        chart,
        `variant axis "${axis}" has only the option "${[...options][0]}" among visible columns. ` +
          `Either add the other option's data or drop the variant from the column.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 9. Structural hygiene
// ---------------------------------------------------------------------------

function checkStructure(chart: Chart, slugs: Set<string>): void {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(chart.slug)) {
    fail(chart, `slug is not kebab-case.`);
  }
  for (const related of chart.related ?? []) {
    if (!slugs.has(related)) fail(chart, `related slug "${related}" does not exist.`);
  }
  for (const col of chart.columns) {
    const numeric = chart.rows.some((r) => typeof r.cells[col.key] === 'number');
    if (numeric && col.precision === undefined) {
      fail(
        chart,
        `numeric column "${col.key}" has no precision. Precision must be fixed per column, ` +
          `never varied per row.`,
      );
    }
  }
  const keys = new Set<string>();
  for (const col of chart.columns) {
    if (keys.has(col.key)) fail(chart, `duplicate column key "${col.key}".`);
    keys.add(col.key);
  }
  const rowIds = new Set<string>();
  for (const row of chart.rows) {
    if (rowIds.has(row.id)) fail(chart, `duplicate row id "${row.id}".`);
    rowIds.add(row.id);
  }
}

// ---------------------------------------------------------------------------
// Sanity check on the definitions themselves
// ---------------------------------------------------------------------------

function checkDefinitions(): void {
  if (MM_PER_INCH !== 25.4) failures.push('MM_PER_INCH is not 25.4.');

  // The two anchors of the AWG series, from its definition.
  const anchors: [number, number][] = [
    [-3, 0.46],
    [36, 0.005],
  ];
  for (const [n, expected] of anchors) {
    const actual = awgSeries(n, n)[0]!.diameterIn;
    if (Math.abs(actual - expected) > 1e-9) {
      failures.push(`AWG anchor ${n} derives ${actual}, definition says ${expected}.`);
    }
  }

  // 4/0 is 460 mils, so 211,600 circular mils exactly. Not the 212,000 that
  // circulates in secondary tables.
  const cmil = awgSeries(-3, -3)[0]!.circularMils;
  if (Math.abs(cmil - 211_600) > 1e-6) {
    failures.push(`4/0 derives ${cmil} circular mils, expected 211600.`);
  }
}

// ---------------------------------------------------------------------------
// What this script cannot do
// ---------------------------------------------------------------------------

function reportUncheckable(): void {
  const needing = allCharts.filter((c) => c.verification.status === 'verified');
  const held = pendingVerification.length;
  const derived = publishedCharts.filter((c) => c.verification.status === 'derived').length;

  notes.push(
    `${derived} chart(s) published on re-derivation, ${needing.length} on a human sight-check, ` +
      `${held} held pending one.`,
  );
  notes.push(
    'This script checks form. For any chart not marked "derived" it cannot tell a correct ' +
      'table from a plausible one: the O-ring series that shifted by a row converted inches ' +
      'to millimetres perfectly on all six of them.',
  );

  const heldColumnCount = allCharts.reduce(
    (n, c) => n + c.columns.filter((col) => col.verification?.status === 'needs-review').length,
    0,
  );
  if (heldColumnCount > 0) {
    notes.push(`${heldColumnCount} column(s) held inside otherwise published charts.`);
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const slugs = new Set(allCharts.map((c) => c.slug));
if (slugs.size !== allCharts.length) failures.push('Duplicate chart slug in the registry.');

checkDefinitions();

for (const chart of allCharts) {
  checkEveryColumnHasASource(chart);
  checkVerificationMetadata(chart);
  checkRowPresence(chart);
  checkMonotonic(chart);
  checkConversions(chart);
  checkDerived(chart);
  checkMetadata(chart);
  checkSheets(chart);
  checkCoverage(chart);
  checkVariantsAreBacked(chart);
  checkStructure(chart, slugs);
}

reportUncheckable();

const label = `${allCharts.length} charts, ${publishedCharts.length} published`;

if (failures.length > 0) {
  console.error(`\n  check:data FAILED — ${label}\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}

console.log(`\n  check:data passed — ${label}`);
for (const n of notes) console.log(`  · ${n}`);
console.log('');
