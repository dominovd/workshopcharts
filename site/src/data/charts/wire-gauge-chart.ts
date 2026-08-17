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
 * No resistance column yet. Resistance is real data from a different document
 * than the dimensions, and it is material-dependent. It is declared below and
 * held at column level, so its absence is stated on the page instead of being
 * something the reader has to notice.
 */

const rows: Row[] = awgSeries(-3, 40).map((r) => ({
  id: `awg-${r.label}`,
  cells: {
    awg: r.label,
    diameterIn: r.diameterIn,
    diameterMm: r.diameterMm,
    circularMils: r.circularMils,
    areaMm2: r.areaMm2,
    resistanceCopper: null,
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
  // figures below a readable size at a metre.
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
        'Circular mils is the square of the diameter in mils. Area in mm² is πd²/4. Millimetre columns are the inch columns × 25.4 exactly.',
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
      publisher: 'ASTM International',
      provides:
        'Tabulates the same nominal solid-conductor diameters and areas as the definition above. Cited as corroboration, not as the origin of these figures. B258 also gives equations for calculating resistance, but the tabulated resistance values this project would publish come from NEC Chapter 9 Table 8, which is why that is a separate row.',
      url: 'https://store.astm.org/b0258-18.html',
    },
    {
      id: 'nec-ch9-t8',
      standard: 'NEC Chapter 9, Table 8',
      publisher: 'NFPA',
      provides:
        'DC resistance of copper and aluminium conductors. Governs the resistance column, which is not yet published.',
      url: 'https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70',
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
    {
      key: 'resistanceCopper',
      label: 'Ω / 1000 ft',
      unit: 'ohm/kft',
      system: 'both',
      precision: 4,
      monotonic: 'asc',
      sources: ['nec-ch9-t8'],
      conditions: ['Uncoated copper', 'DC at 75 °C', 'Solid conductor'],
      verification: {
        status: 'needs-review',
        verifiedOn: '2026-08-17',
        note: 'Held. Resistance is not derivable from the AWG definition, because it depends on conductivity, temperature and stranding, and differs for aluminium by roughly 1.6×. Transcribe NEC Chapter 9 Table 8 directly and sight-check both material columns before publishing. Publishing copper alone would also put a Copper / Aluminum toggle on the page with nothing behind one of its two states.',
      },
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
    'Full AWG wire gauge chart from 4/0 to 40: conductor diameter in inches and millimetres, area in circular mils and mm². Every column names the standard it comes from.',
  imageAlt:
    'Wire gauge chart listing every AWG size from 4/0 to 40 with conductor diameter in inches and millimetres and cross-sectional area in mm².',

  rows,

  related: ['drill-bit-size-chart', 'fraction-to-decimal-chart'],

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
