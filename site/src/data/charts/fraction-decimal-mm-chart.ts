import type { Chart, Row } from '../schema.ts';
import { sixtyFourthsSeries } from '../../lib/derive.ts';

/**
 * Fraction / decimal / millimetre conversion sheet.
 *
 * The one chart on the site that is pure arithmetic end to end, which makes it
 * the cheapest page in the project and one of the most reached for. It is also
 * the wall sheet most likely to be printed once and never revisited online, so
 * the print layout matters more here than the screen layout.
 */

const rows: Row[] = sixtyFourthsSeries(1, 64).map((r) => ({
  id: `conv-${r.sixtyFourths}-64`,
  cells: {
    fraction: r.label,
    sixtyFourths: r.sixtyFourths,
    decimal: r.inches,
    mm: r.mm,
    thousandths: r.inches * 1000,
  },
}));

export const fractionDecimalMmChart: Chart = {
  slug: 'fraction-to-decimal-chart',
  title: 'Fraction to Decimal Chart',
  subtitle:
    'Inch fractions with the count of 64ths, decimal inches, thousandths and millimetres. For reading a tape measure, a micrometer or a dial indicator.',
  trade: 'tools',

  completeness: 'continuous',
  coverageNote: 'Every 64th from 1/64 to 1 inch, with no gaps.',

  printOrientation: 'portrait',

  sources: [
    {
      id: 'conversion-identity',
      standard: 'The inch',
      provides:
        'One inch is 25.4 millimetres exactly, by international definition since 1959. Thousandths are the decimal inch × 1000. Nothing on this page is a measurement.',
      definitional: true,
    },
  ],

  columns: [
    {
      key: 'fraction',
      label: 'Fraction',
      unit: 'none',
      system: 'both',
      sources: ['conversion-identity'],
    },
    {
      key: 'sixtyFourths',
      // The count of 64ths is what you actually read off a tape measure, and it is
      // the column the drill chart has no use for. Derivable: it is the numerator.
      label: '64ths',
      unit: 'none',
      system: 'both',
      precision: 0,
      monotonic: 'asc',
      sources: ['conversion-identity'],
    },
    {
      key: 'decimal',
      label: 'Decimal',
      group: 'in',
      unit: 'in',
      system: 'imperial',
      precision: 4,
      monotonic: 'asc',
      sources: ['conversion-identity'],
    },
    {
      key: 'thousandths',
      label: 'Thou',
      group: 'in / 1000',
      unit: 'mil',
      system: 'imperial',
      precision: 1,
      monotonic: 'asc',
      convertedFrom: { column: 'decimal', factor: 1000 },
      sources: ['conversion-identity'],
    },
    {
      key: 'mm',
      label: 'Millimetres',
      group: 'mm',
      unit: 'mm',
      system: 'metric',
      precision: 3,
      monotonic: 'asc',
      convertedFrom: { column: 'decimal', factor: 25.4 },
      sources: ['conversion-identity'],
    },
  ],

  conditions: [
    'Exact conversions, rounded for display only. No tolerance or fit allowance is implied.',
  ],

  verification: {
    status: 'derived',
    verifiedOn: '2026-08-17',
  },

  pinSheet: {
    columns: ['fraction', 'sixtyFourths', 'decimal', 'mm'],
    rowColumns: 2,
    note: 'Thousandths omitted for legibility. Full table on the site.',
  },

  printSheet: { rowColumns: 2 },

  metaTitle: 'Fraction to Decimal Chart: 64ths, Thou and mm',
  metaDescription:
    'Inch fraction to decimal chart in 64ths, with thousandths and millimetres for every size from 1/64 to 1 inch. Exact conversions, free to print, no sign-up needed.',
  imageAlt:
    'Fraction to decimal conversion chart listing every 64th of an inch from 1/64 to 1 with decimal inches and millimetres.',

  rows,

  related: ['drill-bit-size-chart'],

  howToUse: [
    'Filter by any value (fraction, 64ths, decimal, thousandths or millimetres) to find the row it belongs to.',
    'The 64ths column is for reading a tape measure: count the sixteenths or thirty-seconds and look up the row.',
    'Thousandths are the column for a dial indicator or a micrometer marked in thou.',
    'This is a conversion sheet, not a tool list. If you want the nearest drill bit to a measurement, the drill bit size chart is the page for that.',
  ],

  faq: [
    {
      q: 'Is 25.4 mm an exact conversion?',
      a: 'Yes. The international yard and pound agreement of 1959 defined the inch as exactly 25.4 mm, so nothing on this page is a measurement or an approximation. Only the display is rounded.',
    },
    {
      q: 'What is a thou?',
      a: 'One thousandth of an inch, 0.001 in, also written as a mil. It is the working unit on most inch-marked micrometers and dial indicators.',
    },
  ],
};
