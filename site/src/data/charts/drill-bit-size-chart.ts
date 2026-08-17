import type { Chart, Row } from '../schema.ts';
import { sixtyFourthsSeries } from '../../lib/derive.ts';

/**
 * Fractional drill bit sizes.
 *
 * Three columns, not four. The mock-up carried both `DIAMETER (in)` and
 * `DECIMAL EQUIV.`, which for a fractional bit are the same number written
 * twice — 1/16 is 0.0625 in and its decimal equivalent is 0.0625. On a sheet
 * designed to be read from a metre away, the column that says nothing is the
 * one that costs the type size.
 *
 * The number, letter and metric drill series are separate pages: those are
 * published tables to be transcribed, not arithmetic. See `pending.ts`.
 */

const rows: Row[] = sixtyFourthsSeries(1, 64).map((r) => ({
  id: `frac-${r.sixtyFourths}-64`,
  cells: {
    size: r.label,
    inches: r.inches,
    mm: r.mm,
  },
}));

export const drillBitSizeChart: Chart = {
  slug: 'drill-bit-size-chart',
  title: 'Drill Bit Size Chart',
  seriesLabel: 'Fractional (64ths)',
  subtitle:
    'Fractional drill bit sizes in 64ths, with decimal inch and millimetre equivalents.',
  trade: 'machining',
  series: 'drill-sizes',

  completeness: 'continuous',
  // Printed on the sheet, and a sheet on a wall cannot be corrected later, so it
  // states only what is true today. The number, letter and metric series are named
  // on the page itself, with their real status, by the series panel.
  coverageNote:
    'Fractional sizes only: every 64th from 1/64 to 1 inch, with no gaps.',

  // Three narrow columns and 64 rows: portrait, and it fills the sheet.
  printOrientation: 'portrait',

  sources: [
    {
      id: 'fraction-identity',
      standard: 'Fractional sizes and the inch',
      provides:
        'A fractional bit size IS its decimal value: 3/16 in = 0.1875 in. The millimetre column is that value × 25.4, which is the exact definition of the inch.',
      definitional: true,
    },
  ],

  columns: [
    {
      key: 'size',
      label: 'Size',
      unit: 'none',
      system: 'both',
      sources: ['fraction-identity'],
    },
    {
      key: 'inches',
      label: 'Diameter',
      group: 'in',
      unit: 'in',
      system: 'imperial',
      precision: 4,
      monotonic: 'asc',
      sources: ['fraction-identity'],
    },
    {
      key: 'mm',
      label: 'Diameter',
      group: 'mm',
      unit: 'mm',
      system: 'metric',
      precision: 3,
      monotonic: 'asc',
      convertedFrom: { column: 'inches', factor: 25.4 },
      sources: ['fraction-identity'],
    },
  ],

  conditions: [
    'Nominal bit sizes. A drilled hole runs slightly oversize depending on the bit, the material and the setup.',
  ],

  verification: {
    status: 'derived',
    verifiedOn: '2026-08-17',
  },

  pinSheet: {
    columns: ['size', 'inches', 'mm'],
    rowColumns: 2,
  },

  printSheet: { rowColumns: 2 },

  metaTitle: 'Drill Bit Size Chart: Fractional Sizes in Inches and mm',
  metaDescription:
    'Fractional drill bit size chart in 64ths from 1/64 to 1 inch, with decimal inch and millimetre equivalents, computed exactly and free to print. No sign-up needed.',
  imageAlt:
    'Drill bit size chart listing every 64th from 1/64 to 1 inch with decimal inch and millimetre equivalents.',

  rows,

  related: ['fraction-to-decimal-chart', 'tap-drill-size-chart'],

  howToUse: [
    'Find the fractional size, or filter by a decimal or millimetre value to find the nearest bit.',
    'There is no separate decimal column because for a fractional bit the two are the same number: 3/16 in is 0.1875 in.',
    'This page carries the fractional series. The number, letter and metric series are published tables rather than arithmetic, so they are in verification and not on the site yet: see the four series listed below.',
  ],

  faq: [
    {
      q: 'How is this different from the fraction to decimal chart?',
      a: 'Same arithmetic, different purpose. This page is a bit list: the sizes an index actually contains, for choosing a drill. The conversion chart adds the count of 64ths and thousandths, for reading a tape measure or a micrometer.',
    },
    {
      q: 'Why are drill sizes in 64ths?',
      a: 'A 1/64 in step is fine enough that the next size up is a workable second choice, and coarse enough that a full index stays a manageable number of bits.',
    },
    {
      q: 'Will a bit drill a hole exactly its own size?',
      a: 'Usually slightly oversize. How much depends on the bit, the material, the setup rigidity and whether the hole was centre-drilled first. For a hole that has to hold a dimension, drill under and ream or bore to size.',
    },
  ],
};
