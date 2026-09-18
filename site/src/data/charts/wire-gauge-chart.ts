import type { Chart, Row } from '../schema.ts';
import { awgSeries } from '../../lib/derive.ts';

/**
 * Wire Gauge Chart — AWG dimensions and conductor area.
 *
 * Published at `derived`: every figure on this page is recomputed from the AWG
 * definition at build time. Two things are deliberately NOT on it.
 *
 * No ampacity column. A current rating is not a property of a wire size — it is
 * a property of an installation, and the code limits are lower than the figures
 * that circulate in hobby AWG tables. See `pending.ts` → `wire-ampacity-chart`,
 * which is held until NEC 310.16 and 240.4(D) are read directly.
 *
 * No resistance column. Resistance is real data from a different document than
 * the dimensions, it is material-dependent, and its row set is not this one. It
 * has its own page: see `wire-resistance-chart.ts`.
 */

/*
 * Resistance used to be scaffolded here and now lives on its own page.
 * NEC Chapter 9 Table 8 runs 18 AWG to 4/0 and skips seven sizes; this table
 * runs 4/0 to 40 with no gaps, so a resistance column here would be blank on 29
 * of 44 rows, which `check:data` refuses for a published column. See
 * `wire-resistance-chart.ts`.
 */
const rows: Row[] = awgSeries(-3, 40).map((r) => ({
  id: `awg-${r.label}`,
  cells: {
    awg: r.label,
    diameterIn: r.diameterIn,
    diameterMm: r.diameterMm,
    circularMils: r.circularMils,
    areaMm2: r.areaMm2,
  },
}));

export const wireGaugeChart: Chart = {
  slug: 'wire-gauge-chart',
  title: 'Wire Gauge Chart',
  subtitle:
    'AWG sizes with conductor diameter and cross-sectional area, computed from the AWG definition.',
  trade: 'electrical',

  completeness: 'continuous',
  coverageNote:
    'Every size from 4/0 through 40 AWG, with no gaps. Includes 16–22 AWG for speaker and 12 V work.',

  // Five columns of numbers with thousands separators. Portrait would force the
  // figures below a readable size at a meter.
  printOrientation: 'landscape',

  sources: [
    {
      id: 'awg-definition',
      standard: 'AWG geometric series',
      provides:
        'Conductor diameter. AWG is defined by 0000 AWG = 0.4600 in and 36 AWG = 0.0050 in with 39 equal ratio steps between, so d(n) = 0.005 × 92^((36 − n)/39) inches.',
      definitional: true,
    },
    {
      id: 'area-identity',
      standard: 'Area identities',
      provides:
        'Circular mils is the square of the diameter in mils. Area in mm² is πd²/4. Millimeter columns are the inch columns × 25.4 exactly.',
      definitional: true,
    },
    {
      id: 'nbs-circ-31',
      standard: 'NBS Circular 31, Copper Wire Tables',
      publisher: 'National Bureau of Standards (now NIST)',
      edition: '3rd edition, 1914',
      provides:
        'Publishes the AWG definition itself: "the diameter of No. 0000 is defined as 0.4600 inch and of No. 36 as 0.0050 inch", with the intermediate sizes in geometric progression at a ratio of about 1.122932. This is why the diameters on this page can be computed rather than transcribed.',
      url: 'https://nvlpubs.nist.gov/nistpubs/Legacy/circ/nbscircular31e3.pdf',
    },
    {
      id: 'astm-b258',
      standard: 'ASTM B258-18',
      // Checked against the ASTM catalog: the active document is listed as
      // B0258-18R26, the 2018 text reapproved in 2026. Same figures, current
      // designation. A citation that names a superseded revision sends the
      // reader to the wrong document, which is the one failure a source line
      // is there to prevent.
      edition: 'reapproved 2026',
      publisher: 'ASTM International',
      provides:
        'Tabulates the same nominal solid-conductor diameters and areas as the definition above. Cited as corroboration, not as the origin of these figures. B258 also gives equations for calculating resistance, but the tabulated resistance values this project would publish come from NEC Chapter 9 Table 8, which is why that is a separate row.',
      url: 'https://store.astm.org/b0258-18.html',
    },
  ],

  columns: [
    {
      key: 'awg',
      label: 'AWG',
      unit: 'none',
      system: 'both',
      sources: ['awg-definition', 'nbs-circ-31'],
    },
    {
      key: 'diameterIn',
      label: 'Diameter',
      group: 'in',
      unit: 'in',
      system: 'imperial',
      precision: 4,
      monotonic: 'desc',
      sources: ['awg-definition', 'nbs-circ-31', 'astm-b258'],
      conditions: ['Solid conductor, nominal'],
    },
    {
      key: 'diameterMm',
      label: 'Diameter',
      group: 'mm',
      unit: 'mm',
      system: 'metric',
      precision: 3,
      monotonic: 'desc',
      convertedFrom: { column: 'diameterIn', factor: 25.4 },
      sources: ['awg-definition', 'area-identity'],
      conditions: ['Solid conductor, nominal'],
    },
    {
      key: 'circularMils',
      label: 'Area',
      group: 'circular mils',
      unit: 'cmil',
      system: 'imperial',
      precision: 1,
      monotonic: 'desc',
      sources: ['area-identity', 'astm-b258'],
    },
    {
      key: 'areaMm2',
      label: 'Area',
      group: 'mm²',
      unit: 'mm',
      system: 'metric',
      precision: 4,
      monotonic: 'desc',
      // Both area columns come from the same exact diameter, so they carry the
      // same precision budget. 1 cmil = 5.067075e-4 mm² exactly.
      convertedFrom: { column: 'circularMils', factor: 5.067074790974977e-4 },
      sources: ['area-identity'],
    },
  ],

  conditions: [
    'Nominal dimensions for solid conductor. Stranded conductor of the same AWG has the same conductor area but a larger overall diameter.',
  ],

  verification: {
    status: 'derived',
    verifiedOn: '2026-08-17',
  },

  // Circular mils is the widest column and the least reached for on a wall sheet,
  // so it is the one dropped to buy type size for the other four.
  pinSheet: {
    columns: ['awg', 'diameterIn', 'diameterMm', 'areaMm2'],
    rowColumns: 2,
    note: 'Circular mils omitted for legibility. Full table on the site.',
  },

  // 44 rows of legible type do not fit down one column of Letter landscape.
  printSheet: { rowColumns: 2 },

  metaTitle: 'Wire Gauge Chart: AWG Sizes in Inches and mm',
  metaDescription:
    'Full AWG wire gauge chart from 4/0 to 40: conductor diameter in inches and millimeters, area in circular mils and mm². Every column names the standard it comes from.',
  imageAlt:
    'Wire gauge chart listing every AWG size from 4/0 to 40 with conductor diameter in inches and millimeters and cross-sectional area in mm².',

  rows,

  related: ['wire-resistance-chart', 'drill-bit-size-chart', 'fraction-to-decimal-chart'],

  howToUse: [
    'Find your AWG size in the first column, or type it into the filter.',
    'Read diameter for fit and conductor area for capacity comparisons. Area is what AWG actually designates.',
    'For how much current a conductor may carry, do not use a gauge table. Ampacity depends on insulation rating, ambient temperature and how the conductor is installed. It is set by NEC 310.16, with additional overcurrent limits in 240.4(D) for 14, 12 and 10 AWG.',
  ],

  faq: [
    {
      q: 'What does AWG stand for?',
      a: 'American Wire Gauge. It is a defined geometric series rather than a measurement: 0000 AWG is 0.4600 in, 36 AWG is 0.0050 in, and the 39 steps between them are in constant ratio, which is why the numbers on this page can be computed exactly.',
    },
    {
      q: 'Why is a larger AWG number a smaller wire?',
      a: 'The number originally counted drawing operations. Each pass through a die made the wire thinner, so more passes meant a higher number and a smaller conductor.',
    },
    {
      q: 'Why does stranded wire measure larger than this table?',
      a: 'AWG designates conductor area. A stranded conductor of the same AWG has the same copper area but a larger overall diameter, because of the gaps between strands. Use the area columns when comparing, and the manufacturer’s figure when the outside diameter has to fit something.',
    },
    {
      q: 'How many amps can this size carry?',
      a: 'That question has no answer from a gauge table, which is why there is no ampacity column here. The allowable current depends on insulation temperature rating, ambient temperature, conduit fill and bundling. See NEC Table 310.16 and, for 14, 12 and 10 AWG, the overcurrent limits in 240.4(D).',
    },
  ],
};
