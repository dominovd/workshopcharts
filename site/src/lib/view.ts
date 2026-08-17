import type { Chart, Column, Source, UnitSystem, VariantRef } from '../data/schema.ts';
import { PUBLISHABLE } from '../data/schema.ts';

/**
 * Turning chart data into what the page renders.
 *
 * Everything a template needs is computed here from the columns, so no template
 * can put a control on the page that the data does not back, and no source line
 * can describe a column that is not on screen.
 */

/** Columns that reach the rendered table. Held columns are dropped. */
export function visibleColumns(chart: Chart): Column[] {
  return chart.columns.filter((c) =>
    PUBLISHABLE.includes(c.verification?.status ?? chart.verification.status),
  );
}

/** Columns declared but held, so the page can state the omission. */
export function heldColumns(chart: Chart): Column[] {
  return chart.columns.filter(
    (c) => (c.verification?.status ?? chart.verification.status) === 'needs-review',
  );
}

// ---------------------------------------------------------------------------
// Toggles
// ---------------------------------------------------------------------------

export interface VariantAxis {
  axis: string;
  label: string;
  options: { option: string; label: string; columns: string[] }[];
}

const AXIS_LABELS: Record<string, string> = {
  material: 'Material',
  construction: 'Conductor',
  temperature: 'Rating',
};

const OPTION_LABELS: Record<string, string> = {
  copper: 'Copper',
  aluminum: 'Aluminum',
  solid: 'Solid',
  stranded: 'Stranded',
};

/**
 * Toggle groups inferred from the visible columns.
 *
 * A group is returned only when two or more options on the same axis actually
 * have columns behind them. So a Copper / Aluminum toggle cannot appear on a
 * page that only carries copper — the button that would change nothing does not
 * get rendered, and the condition strip and source rows move with the columns
 * because they are attached to the same column objects.
 */
export function variantAxes(chart: Chart): VariantAxis[] {
  const byAxis = new Map<string, Map<string, string[]>>();

  for (const col of visibleColumns(chart)) {
    if (!col.variant) continue;
    const { axis, option } = col.variant;
    if (!byAxis.has(axis)) byAxis.set(axis, new Map());
    const options = byAxis.get(axis)!;
    options.set(option, [...(options.get(option) ?? []), col.key]);
  }

  return [...byAxis.entries()]
    .filter(([, options]) => options.size >= 2)
    .map(([axis, options]) => ({
      axis,
      label: AXIS_LABELS[axis] ?? axis,
      options: [...options.entries()].map(([option, columns]) => ({
        option,
        label: OPTION_LABELS[option] ?? option,
        columns,
      })),
    }));
}

/** Unit toggle appears only if both systems have columns of their own. */
export function hasUnitToggle(chart: Chart): boolean {
  const systems = new Set(visibleColumns(chart).map((c) => c.system));
  return systems.has('imperial') && systems.has('metric');
}

// ---------------------------------------------------------------------------
// Source map
// ---------------------------------------------------------------------------

export interface SourceMapRow {
  source: Source;
  /** Visible columns this source covers, in table order. */
  columns: Column[];
  /** Set when every column it covers is held — the source is declared, not in use. */
  pendingOnly: boolean;
  /** Variant options this row belongs to, so it can hide with its columns. */
  variants: VariantRef[];
  /**
   * `imperial` or `metric` when every column this source covers belongs to one
   * unit system, so the row leaves with its columns when the units change. `both`
   * when it spans them and must stay.
   */
  systemScope: UnitSystem;
}

/** `imperial`/`metric` if all columns share one system, otherwise `both`. */
function scopeOf(columns: Column[]): UnitSystem {
  const systems = new Set(columns.map((c) => c.system));
  if (systems.size === 1) {
    const only = [...systems][0]!;
    return only;
  }
  if (!systems.has('both') && systems.size === 1) return [...systems][0]!;
  const narrowed = new Set([...systems].filter((s) => s !== 'both'));
  if (systems.has('both') || narrowed.size !== 1) return 'both';
  return [...narrowed][0]!;
}

/**
 * The "sources mapped to columns" table, built from `Column.sources`.
 *
 * This is generated rather than written, which is the fix for the class of defect
 * the draft hit: a MAX AMPS column sat in the table while the source map beneath
 * it listed only AWG, diameter, area and resistance. Since both the table header
 * and this map now iterate the same array, a column cannot exist without a row
 * here, and `scripts/check-data.ts` fails the build if a column's source list is
 * empty or names an id the chart does not define.
 */
export function sourceMap(chart: Chart): SourceMapRow[] {
  return chart.sources
    .map((source) => {
      const covered = chart.columns.filter((c) => c.sources.includes(source.id));
      const visible = covered.filter((c) => visibleColumns(chart).includes(c));
      return {
        source,
        columns: visible,
        pendingOnly: visible.length === 0 && covered.length > 0,
        variants: visible.flatMap((c) => (c.variant ? [c.variant] : [])),
        systemScope: visible.length > 0 ? scopeOf(visible) : 'both',
      };
    })
    .filter((row) => row.columns.length > 0 || row.pendingOnly);
}

/**
 * Condition strings gathered from the chart and from each visible column.
 *
 * Column conditions carry their column's variant, so the strip re-renders when a
 * toggle moves. A citation that stays put while the data under it changes is
 * worse than no citation: it lends a figure authority it was never given.
 */
export interface ConditionChip {
  text: string;
  variant?: VariantRef;
  system: UnitSystem;
}

export function conditionChips(chart: Chart): ConditionChip[] {
  const chips: ConditionChip[] = chart.conditions.map((text) => ({ text, system: 'both' }));
  const seen = new Set(chart.conditions);

  for (const col of visibleColumns(chart)) {
    for (const text of col.conditions ?? []) {
      const key = `${col.variant?.option ?? ''}|${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      chips.push({ text, variant: col.variant, system: col.system });
    }
  }
  return chips;
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

export function formatCell(value: unknown, precision?: number): string {
  if (value === null || value === undefined) return 'n/a';
  if (typeof value === 'number') {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: precision ?? 0,
      maximumFractionDigits: precision ?? 0,
    });
  }
  return String(value);
}

/** Groups adjacent columns sharing a `label`, for the two-row table header. */
export function headerGroups(columns: Column[]): { label: string; span: number; keys: string[] }[] {
  const groups: { label: string; span: number; keys: string[] }[] = [];
  for (const col of columns) {
    const last = groups.at(-1);
    if (last && last.label === col.label) {
      last.span += 1;
      last.keys.push(col.key);
    } else {
      groups.push({ label: col.label, span: 1, keys: [col.key] });
    }
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Standards index
// ---------------------------------------------------------------------------

export interface StandardEntry {
  source: Source;
  /** Charts that cite it, published first. */
  charts: { slug: string; title: string; published: boolean }[];
}

/**
 * Every standard cited anywhere on the site, with the charts that cite it.
 *
 * Rendered on /how-we-verify/. Built from the registry rather than kept by hand,
 * so a standard cannot be used on a chart and missing from the index, and the
 * index cannot list one the site does not actually rely on.
 *
 * Sources are keyed by designation rather than by id, because the same standard is
 * declared separately in each chart file that needs it and would otherwise appear
 * several times.
 */
export function standardsIndex(
  all: { slug: string; title: string; sources: Source[] }[],
  publishedSlugs: Set<string>,
): StandardEntry[] {
  const byStandard = new Map<string, StandardEntry>();

  for (const chart of all) {
    for (const source of chart.sources) {
      if (source.definitional) continue;
      const key = source.standard;
      const entry =
        byStandard.get(key) ?? { source, charts: [] as StandardEntry['charts'] };
      // Prefer whichever declaration carries the richer citation.
      if (!entry.source.url && source.url) entry.source = source;
      if (!entry.charts.some((c) => c.slug === chart.slug)) {
        entry.charts.push({
          slug: chart.slug,
          title: chart.title,
          published: publishedSlugs.has(chart.slug),
        });
      }
      byStandard.set(key, entry);
    }
  }

  for (const entry of byStandard.values()) {
    entry.charts.sort((a, b) => Number(b.published) - Number(a.published));
  }

  return [...byStandard.values()].sort((a, b) =>
    a.source.standard.localeCompare(b.source.standard),
  );
}
