import type { Chart, Row } from '../schema.ts';

/**
 * Conductor resistance, from NEC Chapter 9 Table 8.
 *
 * A separate page rather than two more columns on the wire gauge chart, and the
 * build is what decided that. Table 8 runs 18 AWG to 4/0 and skips 5, 7, 9, 11,
 * 13, 15 and 17; the wire gauge chart runs 4/0 to 40 with no gaps. Putting
 * resistance there left 29 of 44 rows empty, and `check:data` refuses a
 * published column with a blank cell. The row set belongs to the source, so the
 * source gets its own page and every row on it is full.
 *
 * NOT DERIVED. Resistance depends on conductivity, temperature and construction,
 * none of which follow from the AWG definition.
 */

interface R {
  awg: string;
  strands: number;
  /** Strings, not numbers: see `asPrinted` below and `Row.asPrinted` in the schema. */
  copper: string;
  aluminum: string;
}

/*
 * Every AWG row of Table 8, both constructions.
 *
 * The first draft carried one row per size and took the solid figure wherever
 * the table offered a choice. The strand column said `1`, so nothing was false,
 * but 10 and 12 AWG in a raceway are usually stranded, and a reader who took the
 * solid figure for a stranded conductor would read about 2.5 % low, which errs
 * toward undersizing. The table has the second row; so does this page now. Six
 * sizes therefore appear twice, distinguished by the strand count, exactly as
 * the standard prints them.
 *
 * The figures are strings because the standard prints 0.100, 2.00 and 12.8, and
 * a number cannot carry that. `asPrinted` renders them; `cells` holds the parsed
 * value so monotonicity and every other machine check still run on numbers.
 */
const TABLE_8: R[] = [
  { awg: '0000', strands: 19, copper: '0.0608', aluminum: '0.100' },
  { awg: '000', strands: 19, copper: '0.0766', aluminum: '0.126' },
  { awg: '00', strands: 19, copper: '0.0967', aluminum: '0.159' },
  { awg: '0', strands: 19, copper: '0.122', aluminum: '0.201' },
  { awg: '1', strands: 19, copper: '0.154', aluminum: '0.253' },
  { awg: '2', strands: 7, copper: '0.194', aluminum: '0.319' },
  { awg: '3', strands: 7, copper: '0.245', aluminum: '0.403' },
  { awg: '4', strands: 7, copper: '0.308', aluminum: '0.508' },
  { awg: '6', strands: 7, copper: '0.491', aluminum: '0.808' },
  { awg: '8', strands: 1, copper: '0.764', aluminum: '1.26' },
  { awg: '8', strands: 7, copper: '0.778', aluminum: '1.28' },
  { awg: '10', strands: 1, copper: '1.21', aluminum: '2.00' },
  { awg: '10', strands: 7, copper: '1.24', aluminum: '2.04' },
  { awg: '12', strands: 1, copper: '1.93', aluminum: '3.18' },
  { awg: '12', strands: 7, copper: '1.98', aluminum: '3.25' },
  { awg: '14', strands: 1, copper: '3.07', aluminum: '5.06' },
  { awg: '14', strands: 7, copper: '3.14', aluminum: '5.17' },
  { awg: '16', strands: 1, copper: '4.89', aluminum: '8.05' },
  { awg: '16', strands: 7, copper: '4.99', aluminum: '8.21' },
  { awg: '18', strands: 1, copper: '7.77', aluminum: '12.8' },
  { awg: '18', strands: 7, copper: '7.95', aluminum: '13.1' }
];

const rows: Row[] = TABLE_8.map((r) => ({
  id: `res-${r.awg}-${r.strands}`,
  cells: {
    awg: r.awg,
    strands: r.strands,
    resistanceCopper: Number(r.copper),
    resistanceAluminum: Number(r.aluminum),
  },
  asPrinted: {
    resistanceCopper: r.copper,
    resistanceAluminum: r.aluminum,
  },
}));

const REVIEW_NOTE =
  'Signed 2026-09-18 after a character-level reconciliation of all 21 rows against a scan of NEC Chapter 9 Table 8, 2026 edition. Forty-two figures, copper uncoated and aluminum in ohm/kFT, compared as printed strings rather than parsed values: zero differences, and every AWG row the table carries is present with no row of the standard left out. What a reviewer confirms against the standard: that both constructions are present for 18 through 8 AWG and that the solid and stranded figures are not swapped; that the strand counts are right, since they are what tells the two apart; and that no AWG size Table 8 lists is missing. Figures render exactly as the standard prints them, trailing zeros included, so a reviewer can compare characters rather than values; 0.100, 2.00 and 12.8 were confirmed in the rendered page, and nothing on it carries a padded zero. Two things this signature does not cover. The kcmil half of Table 8, 250 through 2000, is out of scope by the decision recorded in coverageNote, not by any limit of the source. And the printed sheet was not rendered at review time: check:data passed, but render:sheets could not run, so the one-page PDF and the 82 % canvas fill are still verified by the build, not by this note.';

export const wireResistanceChart: Chart = {
  slug: 'wire-resistance-chart',
  title: 'Wire Resistance Chart',
  subtitle:
    'DC resistance of copper and aluminum conductors at 75 °C, in ohms per 1000 feet, for sizing a run against voltage drop.',
  trade: 'electrical',

  completeness: 'selected',
  /*
   * The earlier note read "the sizes Table 8 lists: 18 AWG through 4/0", which
   * handed the standard a boundary this page chose. Table 8 does not stop at
   * 4/0: it continues through 250 to 2000 kcmil. Stopping at 4/0 is a decision
   * about who the page is for, and a coverage note that disguises a decision as
   * a limit of the source is the kind of small dishonesty this project is
   * supposed to be incapable of.
   */
  coverageNote:
    'Every AWG size in NEC Chapter 9 Table 8, both solid and stranded where the table gives both. Table 8 continues past 4/0 into 250 to 2000 kcmil; those sizes are not on this page.',

  printOrientation: 'portrait',

  sources: [
    {
      id: 'nec-ch9-t8',
      standard: 'NEC Chapter 9, Table 8',
      publisher: 'NFPA',
      edition: '2026',
      provides:
        'Direct-current resistance at 75 °C of uncoated copper and aluminum conductors in ohms per 1000 ft, with the stranding each figure belongs to. Table 8 gives a solid and a stranded row for 18 through 8 AWG, and Class B stranded only from 6 AWG up.',
      url: 'https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70',
      urlNote: 'NFPA publishes the code for reading at no charge after sign-in.',
    },
  ],

  columns: [
    {
      key: 'awg',
      label: 'AWG',
      unit: 'none',
      system: 'both',
      sources: ['nec-ch9-t8'],
    },
    {
      key: 'strands',
      label: 'Strands',
      unit: 'none',
      system: 'both',
      precision: 0,
      sources: ['nec-ch9-t8'],
      conditions: ['1 is the solid row of Table 8; 7 and 19 are Class B stranded'],
    },
    {
      key: 'resistanceCopper',
      label: 'Ω / 1000 ft',
      /*
       * The metal belongs in the header, not only in the toggle.
       *
       * On the page one column is hidden at a time, so the heading alone was
       * enough. The printed sheet has no toggle: it showed both columns under
       * the same words, and a reader holding it had nothing to tell them apart
       * except which one was further right. On a sheet about undersizing
       * conductors that is the worst possible ambiguity, so the group row
       * carries the metal and the sheet says it out loud.
       */
      group: 'Copper',
      unit: 'ohm/kft',
      system: 'both',
      monotonic: 'asc',
      sources: ['nec-ch9-t8'],
      // No `precision`: `asPrinted` governs these cells, and a second rule for
      // the same characters is a second thing to keep in agreement.
      //
      // The toggle exists because the two columns answer the same question about
      // different metal and must never be read across: aluminum runs about 1.6×
      // copper for the same gauge, so a reader who takes one for the other
      // undersizes the conductor.
      variant: { axis: 'material', option: 'copper' },
      conditions: ['Uncoated copper, DC at 75 °C'],
    },
    {
      key: 'resistanceAluminum',
      label: 'Ω / 1000 ft',
      group: 'Aluminum',
      unit: 'ohm/kft',
      system: 'both',
      monotonic: 'asc',
      sources: ['nec-ch9-t8'],
      variant: { axis: 'material', option: 'aluminum' },
      conditions: ['Uncoated aluminum, DC at 75 °C'],
    },
  ],

  conditions: [
    'Direct current. Alternating current in a raceway runs higher, and Table 9 is the table for that.',
    'Resistance changes with temperature. Table 8 note 2 gives the correction: R2 = R1 × (1 + α × (T2 − 75)), with α of 0.00323 for copper and 0.00330 for aluminum.',
    'Uncoated conductors. Table 8 lists coated copper separately and it reads higher.',
  ],

  /*
   * SIGNED. The table was reconciled character by character against a scan of
   * Table 8 before the name went in; the note records what that covered and
   * what it did not.
   */
  verification: {
    status: 'verified',
    verifiedBy: 'Denis',
    verifiedOn: '2026-09-18',
    note: REVIEW_NOTE,
  },

  pinSheet: {
    columns: ['awg', 'strands', 'resistanceCopper', 'resistanceAluminum'],
    rowColumns: 1,
    note: 'Both materials on one sheet: a printed sheet has no toggle.',
  },

  printSheet: { rowColumns: 1 },

  metaTitle: 'Wire Resistance Chart: Copper and Aluminum Ohms per 1000 ft',
  metaDescription: 'DC resistance of copper and aluminum wire at 75 C, 18 AWG through 4/0, in ohms per 1000 feet, transcribed from NEC Chapter 9 Table 8. Free to print.',
  imageAlt:
    'Wire resistance chart listing DC resistance at 75 degrees C in ohms per 1000 feet for solid and stranded copper and aluminum conductors from 18 AWG to 4/0.',

  rows,

  related: ['wire-gauge-chart'],

  howToUse: [
    'Find the conductor size, then the row whose strand count matches what you are actually pulling. Six sizes appear twice because the standard gives both a solid and a stranded figure for them.',
    'Read the column for the metal. The figure is ohms for 1000 feet of one conductor.',
    'A circuit runs out and back, so a 50 ft run is 100 ft of conductor.',
    'Voltage drop is that resistance times the current: ohms per 1000 ft, times feet of conductor, divided by 1000, times amps.',
  ],

  faq: [
    {
      q: 'Why do some sizes appear twice?',
      a: 'Because Table 8 lists them twice. From 18 through 8 AWG a conductor may be solid or stranded, and the two read differently: stranded is about 2 to 3 percent higher for the same size, because the strands spiral and the path is longer than the cable. From 6 AWG up the table lists Class B stranded only. The strand column says which row is which.',
    },
    {
      q: 'Why is aluminum higher than copper for the same gauge?',
      a: 'Aluminum conducts less well by volume. Table 8 note 4 puts bare copper at 100 percent and aluminum at 61 percent on the international annealed copper standard, which is why the aluminum figures run about 1.6 times the copper ones and why an aluminum run is normally sized up.',
    },
    {
      q: 'Why does the chart stop at 4/0 and at 18 AWG?',
      a: 'Table 8 continues past 4/0 into 250 through 2000 kcmil, which are service and feeder sizes rather than the sizes this page is for. Below 18 AWG the table stops: the wire gauge chart carries those sizes with diameter and area, computed from the AWG definition, but no document cited here gives them a resistance figure.',
    },
    {
      q: 'Is this the right figure for an AC circuit?',
      a: 'Not exactly. These are direct-current values. For alternating current in a raceway the effective resistance is higher, and NEC Chapter 9 Table 9 is the table written for that case.',
    },
  ],
};
