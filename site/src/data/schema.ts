/**
 * Chart data schema.
 *
 * The whole project is the tables, so the schema is where the project's
 * discipline lives. Three ideas from DESIGN.md §4 are encoded as types, not
 * as convention:
 *
 * 1. Source attribution is per COLUMN GROUP, not per table. A wire gauge table
 *    takes its diameters from ASTM B258 and its resistance from NEC Chapter 9
 *    Table 8. One source line under a three-source table is exactly the kind of
 *    imprecision this project is supposed to be better than.
 *
 * 2. Truth level is explicit and gates publication. The build refuses to
 *    publish a table whose values were transcribed but never sighted against
 *    the standard by a human.
 *
 * 3. Row-set completeness is declared. A reference table is either a continuous
 *    run of a series or an explicitly labelled selection. A silent gap (a
 *    series that skips -009 with no note) is a defect the test catches.
 */

// ---------------------------------------------------------------------------
// Truth level
// ---------------------------------------------------------------------------

/**
 * How we know the values are right.
 *
 * `derived`      Every value is computed at build time from a definitional
 *                formula, and `scripts/check-data.ts` re-derives it. AWG
 *                diameters are a defined geometric series; a fractional drill
 *                bit's decimal size is the fraction. For these, and only these,
 *                a machine check IS a truth check.
 *
 * `verified`     Values were transcribed from the named standard and then
 *                read back against it by a human, line by line. `verifiedOn`
 *                is that date and `verifiedBy` is that person.
 *
 * `needs-review` Values exist but no human has sighted them against the
 *                standard. NOT PUBLISHED. The chart is absent from the site
 *                entirely: no page, no card, no sitemap entry. It counts as
 *                planned work, never as a chart.
 *
 * There is deliberately no fourth level. "Looks internally consistent" is not
 * a truth level — a table can round inches to millimetres perfectly and still
 * disagree with the standard on every row.
 */
export type TruthLevel = 'derived' | 'verified' | 'needs-review';

export const PUBLISHABLE: readonly TruthLevel[] = ['derived', 'verified'];

export interface Verification {
  status: TruthLevel;
  /** ISO date of the sight-check (`verified`) or of the last build audit (`derived`). */
  verifiedOn: string;
  /** Who did the sight-check. Required for `verified`; omitted for `derived`. */
  verifiedBy?: string;
  /**
   * What still has to happen before this chart can be published, or what a
   * reviewer should know. Required for `needs-review` — an unexplained hold is
   * indistinguishable from a forgotten one.
   */
  note?: string;
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export interface Source {
  /** Referenced from `Column.sources`. */
  id: string;
  /** Standard designation with edition where one exists: `SAE J429`, `NEC 2023 Chapter 9 Table 8`. */
  standard: string;
  /** Publisher, for readers who have to go find it. */
  publisher?: string;
  /** What this source actually establishes. Shown verbatim under the table. */
  provides: string;
  /**
   * Edition or revision, where the standard has one. Shown next to the
   * designation, because "SAE J429" without a revision is not a citation a reader
   * can follow to a specific document.
   */
  edition?: string;
  /**
   * The publisher's own page for the standard.
   *
   * REQUIRED for any source that is not `definitional`, and checked. A project
   * whose whole claim is that its figures are traceable cannot name a document and
   * then leave the reader to go find it. These link to the publisher rather than
   * to a copy on someone's file server: the publisher's page is the one that stays
   * correct about which revision is current.
   */
  url?: string;
  /**
   * Why there is no link, for the handful of sources that have no publisher page:
   * the Manufacturers Standard Gauge for sheet steel, for instance, is a historic
   * table with no standards body behind it. Satisfies the same check as `url`,
   * because "we could not link it" is a fact the reader is owed, and silence is not.
   */
  urlNote?: string;
  /**
   * Set when the source is a definition rather than a published table — an
   * arithmetic identity or a defined series. Rendered differently: we do not
   * dress up arithmetic as a standards citation.
   */
  definitional?: boolean;
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

export type Unit = 'in' | 'mm' | 'mil' | 'cmil' | 'ft-lb' | 'N-m' | 'ohm/kft' | 'tpi' | 'none';

export type UnitSystem = 'imperial' | 'metric' | 'both';

/**
 * A toggle on the page (Copper / Aluminum, Solid / Stranded, Metric / Inches).
 *
 * Toggles are DERIVED FROM THE COLUMNS, never declared by the layout. A toggle
 * exists only if at least two columns claim different options on the same axis,
 * and each of those columns carries its own sources and conditions. So pressing
 * Aluminum necessarily swaps the resistance figures, the condition strip and the
 * source line together — the source block cannot end up sitting under data it
 * does not cover, because there is no code path that moves one without the other.
 *
 * A toggle that has nothing behind it is not rendered. An Aluminum button that
 * changes nothing is worse than no button: it tells the reader the table covers
 * aluminium when it does not.
 */
export interface VariantRef {
  /** Toggle group: `material`, `construction`. */
  axis: string;
  /** Option within the group: `copper`, `aluminum`. */
  option: string;
}

export interface Column {
  key: string;
  /** Header text. Kept short: print density is the product. */
  label: string;
  /**
   * Which toggle option this column belongs to. Omit for columns that are
   * always shown regardless of toggle state.
   */
  variant?: VariantRef;
  /**
   * Conditions that apply to THIS column only — "DC resistance at 20 °C",
   * "solid conductor, annealed". These travel with the column into the
   * condition strip, so the strip always describes what is currently on screen.
   */
  conditions?: string[];
  /** Optional second header row, e.g. `in` / `mm` under a `DIAMETER` group. */
  group?: string;
  unit: Unit;
  /**
   * Which unit toggle state shows this column. `both` means always visible —
   * the size designation column, for instance.
   */
  system: UnitSystem;
  /**
   * Source ids covering this column. NON-OPTIONAL AND CHECKED NON-EMPTY.
   *
   * This field is the whole point of the schema. A column with numbers in it and
   * no source behind it is the single most expensive defect this project can
   * ship: the reader trusts the figure because the table around it is sourced.
   * `scripts/check-data.ts` fails the build on an empty list or an id that does
   * not resolve, so the source map can never fall out of step with the table —
   * it is generated from the same array the table is.
   */
  sources: [string, ...string[]];
  /** Decimal places for display. Reference tables must not vary precision per row. */
  precision?: number;
  /** `asc` or `desc` if this column must move monotonically with row order. */
  monotonic?: 'asc' | 'desc';
  /**
   * Marks this column as a unit conversion of another. The test asserts the
   * round trip. Note that passing this proves consistency only — never truth.
   */
  convertedFrom?: { column: string; factor: number };
  /** Footnote marker text shown next to the header. */
  note?: string;
  /**
   * Per-column truth level, overriding the chart's. A column at `needs-review`
   * is dropped from the rendered table and its absence is stated in the source
   * block rather than left for the reader to notice.
   *
   * This exists because the wire gauge table is three sources wide: diameters
   * are a defined series, but ohms per 1000 ft come from a different document
   * and cannot ride on the diameters' credibility. Holding one column is the
   * proportionate response — better than publishing it unchecked, and better
   * than withholding a table that is otherwise sound.
   */
  verification?: Verification;
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export type CellValue = string | number | null;

export interface Row {
  /** Stable id used for deep links and the mobile card view. */
  id: string;
  cells: Record<string, CellValue>;
}

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

export type Trade = 'electrical' | 'machining' | 'fasteners' | 'tools';

export interface Chart {
  /** URL slug. The page is `/{slug}/`. */
  slug: string;
  /** H1. Exact-match target phrase, per DESIGN.md §2. */
  title: string;
  /** One line under the H1: what the table is and which standard governs it. */
  subtitle: string;
  trade: Trade;

  /**
   * Whether the row set is the full run of the series or a labelled selection.
   * `selected` requires `selectionLabel`, which is printed in the table caption.
   * This exists because a reference table with a silent gap is worse than a
   * short one: the reader cannot tell absence from omission.
   */
  completeness: 'continuous' | 'selected';
  /**
   * Always rendered in the table caption, for both completeness values: either
   * the range the continuous run covers, or which subset was chosen and why.
   * Required when `completeness` is `selected`.
   */
  coverageNote: string;

  /**
   * Print orientation, chosen per table rather than globally (DESIGN.md §3).
   * A four-column drill chart is portrait; an eight-column wire table is not.
   */
  printOrientation: 'portrait' | 'landscape';

  sources: Source[];
  columns: Column[];
  rows: Row[];

  /**
   * Applicability conditions. Rendered in the source block, not in fine print.
   * For torque tables this is load-bearing: plating, lubrication and thread
   * condition each change the number, so a table headed "Grade 5" without them
   * is not a specification, it is a rumour.
   */
  conditions: string[];

  verification: Verification;

  /** Adjacent charts on the same axis. Slugs; resolved at build. */
  related?: string[];

  /**
   * Page FAQ, marked up as `FAQPage`.
   *
   * Answers are held to the same standard as the table: an answer states a
   * definition or points at a source, and never asserts a figure that is not in
   * the chart above it.
   */
  faq?: { q: string; a: string }[];

  /** Two or three lines under the table. Not an article (DESIGN.md §2 item 9). */
  howToUse?: string[];

  /**
   * Layout of the vertical 1000×1500 PNG.
   *
   * DESIGN.md §3: this image is a SEPARATE TYPESETTING of the data, not a
   * screenshot of the table. A wide table shrunk into 2:3 produces text nobody
   * can read, and this is the asset that goes into the image pack on a cluster
   * measuring 96–100 % image presence — so it is the one that has to be legible
   * at thumbnail size.
   *
   * Two levers, both per chart because the right answer differs per table:
   *   `columns`     which columns make the cut. Dropping the least-used column
   *                 buys type size for the rest.
   *   `rowColumns`  how many row-blocks sit side by side. Splitting 44 rows into
   *                 two blocks of 22 fills a 2:3 canvas; one block of 44 leaves a
   *                 third of it empty, which was visible in the guitar charts and
   *                 had to be fixed there.
   */
  pinSheet: {
    columns: string[];
    rowColumns: number;
    /** Printed under the image when columns were dropped, so the PNG says so. */
    note?: string;
  };

  /**
   * How many row-blocks the printed sheet deals its rows into.
   *
   * A wall sheet is ONE page. 44 rows of readable type do not fit down a single
   * column of Letter, so they run in two blocks side by side — the same move as
   * the vertical PNG, for the same reason. `render-sheets.mjs` fails the build if
   * a PDF comes out longer than one page, which is how this stays true as rows
   * are added.
   */
  printSheet: {
    rowColumns: number;
  };

  /**
   * `<title>`. Must not contain internal vocabulary.
   *
   * The first pass ended every chart title with "— sources per column", which is
   * how the project describes itself to itself. Nobody searches it. The title is
   * the one string that has to be written for the person typing, so it carries the
   * head phrase plus a variant, and `check-data.ts` fails it over 60 characters
   * where Google truncates.
   */
  metaTitle: string;

  /**
   * Meta description, 140–165 characters — checked. Shorter wastes the slot,
   * longer gets cut mid-sentence.
   */
  metaDescription: string;

  /** `alt` for the vertical PNG. Describes the table, not the file. */
  imageAlt: string;

  /**
   * Series this chart is one member of, e.g. `drill-sizes`.
   *
   * `drill bit size chart` is a 14 800/month head phrase covering four different
   * series — fractional, number, letter and metric — and a page that answers the
   * phrase while carrying one of them is over-promising. Rather than narrow the H1
   * away from the phrase people actually type, the page states all four members
   * and each one's status. The reader can then tell absence from omission, which
   * is the same standard the row sets are held to.
   */
  series?: string;

  /** This chart's name within its series: `Fractional (64ths)`, `Number sizes`. */
  seriesLabel?: string;
}
