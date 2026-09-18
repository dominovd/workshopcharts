import type { Chart, Row } from '../schema.ts';

/**
 * Allowable ampacity, from NEC Table 310.16, with the small-conductor limit from
 * 240.4(D) beside it.
 *
 * This is the page the whole verification apparatus was built for. The design
 * draft carried a MAX AMPS column on the wire gauge chart reading 35 A at 14
 * AWG, 47 at 12 and 60 at 10. Those are free-air hobby-table figures. The code
 * gives 20, 25 and 35 for copper at 75 °C, and 240.4(D) then caps the protective
 * device at 15, 20 and 30. The draft ran roughly double the code limit on the
 * page a person sizing a receptacle circuit reaches first, and it passed every
 * consistency check available, because it was internally consistent and wrong.
 *
 * NOT DERIVED, and not one table either: ampacity and the overcurrent limit are
 * different quantities from different sections, and merging them into one cell
 * would be exactly the smoothing that made the draft dangerous.
 */

interface R {
  size: string;
  cu60: number; cu75: number; cu90: number;
  al60: number; al75: number; al90: number;
  ocpdCu: number | string;
  ocpdAl: number | string;
}

/**
 * 240.4(D) lists 18 through 10 AWG and stops.
 *
 * Note 1 of Table 310.16 agrees from the other side: the superscript that points
 * at 240.4(D) sits on 16, 14, 12 and 10 and ends at 8. So for 8 AWG and larger
 * there is no small-conductor cap, and the cell says that rather than showing a
 * number or a blank. It names 240.4(B) because the general rules of 240.4 have
 * not gone anywhere, and a reader who took "no limit" literally would be reading
 * this table into a mistake.
 */
const NO_LIMIT = 'No 240.4(D) limit';

/**
 * Why the cross-reference is a note and not part of the cell.
 *
 * It was in the cell first, and the printed sheet showed what that costs: the
 * sentence repeated down twenty rows became the widest thing on the page and
 * squeezed all six ampacity columns to fit around it. The reference still has to
 * be there, because a reader who takes "no limit" at face value has been led
 * into a mistake by this table. A shared marker says it once.
 */
const NOTE_NO_LIMIT =
  '240.4(D) covers 18 through 10 AWG only, and Table 310.16 note 1 marks the same boundary. For 8 AWG and larger there is no small-conductor cap, but the general rules of 240.4 still apply, 240.4(B) among them.';

const NOTE_CCA =
  'Table 310.16 note 3: this figure applies only to copper-clad aluminum conductors, not to plain aluminum.';
const NOTE_CCA_ADJUSTMENT =
  'Table 310.16 notes 2 and 3: this figure applies only to copper-clad aluminum conductors, and may be used for ampacity adjustment or correction only, never as a working ampacity.';
const NOTE_OCPD_CCA =
  '240.4(D)(3): 10 A applies to 14 AWG copper-clad aluminum, and only where the continuous load does not exceed 8 A and the overcurrent device is marked for use with 14 AWG copper-clad aluminum or is a Class CC, CF, J or T fuse.';

/*
 * Rows run 14 AWG to 4/0, and the lower bound is forced rather than chosen.
 *
 * 14 AWG copper is the most looked-up size on the page, so the row has to exist;
 * rows are shared by both states of the material toggle, so its aluminum cells
 * have to show something; and Table 310.16 does give figures there, footnoted.
 * Dropping to 12 AWG to avoid the footnotes would delete the row people come
 * for. Carrying it without them would publish a copper-clad-only figure as
 * though it were aluminum. Cell-level notes are what is left, and that is why
 * `Row.notes` exists.
 *
 * 16 AWG copper is excluded: Table 310.16 lists it, but its aluminum cells are
 * empty, and a published column cannot carry a blank. The upper bound at 4/0 is
 * ours: the table continues into 250 through 2000 kcmil, which are service and
 * feeder sizes rather than what this page is for.
 */
const TABLE_310_16: R[] = [
  { size: '14', cu60: 15, cu75: 20, cu90: 25, al60: 10, al75: 15, al90: 20, ocpdCu: 15, ocpdAl: 10 },
  { size: '12', cu60: 20, cu75: 25, cu90: 30, al60: 15, al75: 20, al90: 25, ocpdCu: 20, ocpdAl: 15 },
  { size: '10', cu60: 30, cu75: 35, cu90: 40, al60: 25, al75: 30, al90: 35, ocpdCu: 30, ocpdAl: 25 },
  { size: '8', cu60: 40, cu75: 50, cu90: 55, al60: 35, al75: 40, al90: 45, ocpdCu: NO_LIMIT, ocpdAl: NO_LIMIT },
  { size: '6', cu60: 55, cu75: 65, cu90: 75, al60: 40, al75: 50, al90: 55, ocpdCu: NO_LIMIT, ocpdAl: NO_LIMIT },
  { size: '4', cu60: 70, cu75: 85, cu90: 95, al60: 55, al75: 65, al90: 75, ocpdCu: NO_LIMIT, ocpdAl: NO_LIMIT },
  { size: '3', cu60: 85, cu75: 100, cu90: 115, al60: 65, al75: 75, al90: 85, ocpdCu: NO_LIMIT, ocpdAl: NO_LIMIT },
  { size: '2', cu60: 95, cu75: 115, cu90: 130, al60: 75, al75: 90, al90: 100, ocpdCu: NO_LIMIT, ocpdAl: NO_LIMIT },
  { size: '1', cu60: 110, cu75: 130, cu90: 145, al60: 85, al75: 100, al90: 115, ocpdCu: NO_LIMIT, ocpdAl: NO_LIMIT },
  { size: '1/0', cu60: 125, cu75: 150, cu90: 170, al60: 100, al75: 120, al90: 135, ocpdCu: NO_LIMIT, ocpdAl: NO_LIMIT },
  { size: '2/0', cu60: 145, cu75: 175, cu90: 195, al60: 115, al75: 135, al90: 150, ocpdCu: NO_LIMIT, ocpdAl: NO_LIMIT },
  { size: '3/0', cu60: 165, cu75: 200, cu90: 225, al60: 130, al75: 155, al90: 175, ocpdCu: NO_LIMIT, ocpdAl: NO_LIMIT },
  { size: '4/0', cu60: 195, cu75: 230, cu90: 260, al60: 150, al75: 180, al90: 205, ocpdCu: NO_LIMIT, ocpdAl: NO_LIMIT }
];

const rows: Row[] = TABLE_310_16.map((r) => {
  const row: Row = {
    id: `amp-${r.size.replace('/', '-')}`,
    cells: {
      size: r.size,
      cu60: r.cu60, cu75: r.cu75, cu90: r.cu90,
      al60: r.al60, al75: r.al75, al90: r.al90,
      ocpdCu: r.ocpdCu, ocpdAl: r.ocpdAl,
    },
  };
  if (typeof r.ocpdCu === 'string') {
    row.notes = { ...row.notes, ocpdCu: NOTE_NO_LIMIT, ocpdAl: NOTE_NO_LIMIT };
  }
  if (r.size === '14') {
    row.notes = {
      ...row.notes,
      al60: NOTE_CCA,
      al75: NOTE_CCA_ADJUSTMENT,
      al90: NOTE_CCA_ADJUSTMENT,
      ocpdAl: NOTE_OCPD_CCA,
    };
  }
  return row;
});

const OCPD_CONDITION =
  'The 240.4(D) figure is the default limit, not an absolute ceiling: the section opens with "unless specifically permitted in 240.4(E) or 240.4(G)", and Table 310.16 note 1 adds "except as modified elsewhere in the code".';

const REVIEW_NOTE =
  'Signed 2026-09-18 against scans of both sources: NEC Table 310.16, viewer page 230, printed 70-227, and 240.4(D), viewer page 125, printed 70-122, 2026 edition. Reconciled cell by cell: 78 ampacity figures and 26 overcurrent cells, zero differences, row bounds and column monotonicity confirmed. What the signature covers: the 78 ampacity figures; that the 14 AWG aluminum row carries footnote 3 on its 60 °C cell and footnotes 2 and 3 on its 75 °C and 90 °C cells, and that the three cell notes say so; that 240.4(D) has eight items, that item 3 is 14 AWG copper-clad aluminum at 10 A with its own conditions, and that the superscript pointing at 240.4(D) in Table 310.16 stops at 8 AWG, which is why every larger size reads "No 240.4(D) limit"; and that the 110.14(C) condition keeps both halves, the 60 °C default on circuits of 100 A or less and the higher column where the equipment is listed and marked for it. All four markers were seen rendered on the 14 AWG aluminum row with the toggle on aluminum: 1 on the 60 °C cell, 2 shared by the 75 °C and 90 °C cells, 3 on the overcurrent cell, and each note text present verbatim in the HTML. What the signature does not cover: the kcmil half of Table 310.16, 250 through 2000, out of scope by the decision in coverageNote rather than any limit of the source; and the ambient and conductor-count factors of 310.15(B) and 310.15(C)(1), which are their own tables and are named in the conditions rather than applied.';

export const wireAmpacityChart: Chart = {
  slug: 'wire-ampacity-chart',
  title: 'Wire Ampacity Chart',
  subtitle:
    'Allowable ampacity of copper and aluminum conductors under NEC Table 310.16, with the 240.4(D) limit on the breaker or fuse beside it.',
  trade: 'electrical',

  completeness: 'selected',
  coverageNote:
    'AWG sizes 14 through 4/0 from NEC Table 310.16. The table also lists 16 AWG copper and continues into 250 to 2000 kcmil; neither is on this page.',

  printOrientation: 'landscape',

  sources: [
    {
      id: 'nec-310-16',
      standard: 'NEC Table 310.16',
      publisher: 'NFPA',
      edition: '2026',
      provides:
        'Allowable ampacities of insulated conductors with not more than three current-carrying conductors in a raceway, cable or earth, at 30 °C ambient, for copper and for aluminum or copper-clad aluminum at 60, 75 and 90 °C.',
      url: 'https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70',
      urlNote: 'NFPA publishes the code for reading at no charge after sign-in.',
    },
    {
      id: 'nec-240-4d',
      standard: 'NEC 240.4(D)',
      publisher: 'NFPA',
      edition: '2026',
      provides:
        'Small conductors. The maximum rating of the overcurrent device for 18 through 10 AWG, which is lower than the ampacity of the same conductor and is the figure that actually sizes a branch circuit.',
      url: 'https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70',
      urlNote: 'NFPA publishes the code for reading at no charge after sign-in.',
    },
  ],

  columns: [
    { key: 'size', label: 'AWG', unit: 'none', system: 'both', sources: ['nec-310-16'] },

    /*
     * Three temperature columns side by side, one material at a time.
     *
     * The temperature is not a toggle because choosing between 60, 75 and 90 °C
     * IS the task: a reader looks at the termination rating on the equipment and
     * then at the matching column. Hiding two thirds of that behind a control
     * would hide the comparison the page exists to make. The material is a
     * toggle because copper and aluminum are never read across.
     */
    { key: 'cu60', label: 'Copper', group: '60 °C', unit: 'none', system: 'both', precision: 0, monotonic: 'asc', sources: ['nec-310-16'], variant: { axis: 'material', option: 'copper' } },
    { key: 'cu75', label: 'Copper', group: '75 °C', unit: 'none', system: 'both', precision: 0, monotonic: 'asc', sources: ['nec-310-16'], variant: { axis: 'material', option: 'copper' } },
    { key: 'cu90', label: 'Copper', group: '90 °C', unit: 'none', system: 'both', precision: 0, monotonic: 'asc', sources: ['nec-310-16'], variant: { axis: 'material', option: 'copper' } },

    { key: 'al60', label: 'Aluminum', group: '60 °C', unit: 'none', system: 'both', precision: 0, monotonic: 'asc', sources: ['nec-310-16'], variant: { axis: 'material', option: 'aluminum' } },
    { key: 'al75', label: 'Aluminum', group: '75 °C', unit: 'none', system: 'both', precision: 0, monotonic: 'asc', sources: ['nec-310-16'], variant: { axis: 'material', option: 'aluminum' } },
    { key: 'al90', label: 'Aluminum', group: '90 °C', unit: 'none', system: 'both', precision: 0, monotonic: 'asc', sources: ['nec-310-16'], variant: { axis: 'material', option: 'aluminum' } },

    /*
     * A separate column, never folded into ampacity.
     *
     * They are different quantities from different sections of the code, and on
     * a 14 AWG copper branch circuit they disagree: 20 A of ampacity at 75 °C,
     * 15 A of permitted overcurrent protection. A single number in one cell
     * would have to pick one and silently discard the other, and whichever it
     * picked, somebody reads it as the other.
     */
    { key: 'ocpdCu', label: 'Max OCPD', group: 'Copper', unit: 'none', system: 'both', precision: 0, sources: ['nec-240-4d'], variant: { axis: 'material', option: 'copper' }, conditions: [OCPD_CONDITION] },
    { key: 'ocpdAl', label: 'Max OCPD', group: 'Aluminum', unit: 'none', system: 'both', precision: 0, sources: ['nec-240-4d'], variant: { axis: 'material', option: 'aluminum' }, conditions: [OCPD_CONDITION] },
  ],

  conditions: [
    'Not more than three current-carrying conductors in a raceway, cable or earth, at 30 °C ambient. Anything else needs the correction factors of 310.15(B) and the adjustment factors of 310.15(C)(1), which are their own tables and are not applied here.',
    '110.14(C)(1)(a): on a circuit rated 100 A or less, or marked for 14 AWG through 1 AWG, the 60 °C column is the one to use, unless the equipment is listed and marked for conductors of a higher rating, in which case the higher column applies.',
    '110.14(C)(1)(b): above 100 A, or for conductors larger than 1 AWG, the 75 °C column, or higher where the equipment is listed and identified for it.',
    'A higher column may always be used for ampacity adjustment or correction. That is what 110.14(C) permits it for, and it is not a working ampacity by itself.',
    'Ampacity in amperes. The figures are conductor properties under the conditions above, not a permission to load a circuit to them.',
  ],

  verification: {
    status: 'verified',
    verifiedBy: 'Denis',
    verifiedOn: '2026-09-18',
    note: REVIEW_NOTE,
  },

  pinSheet: {
    columns: ['size', 'cu60', 'cu75', 'cu90', 'ocpdCu'],
    rowColumns: 1,
    note: 'Copper only. Aluminum is on the page and on the printable sheet.',
  },

  printSheet: { rowColumns: 1 },

  metaTitle: 'Wire Ampacity Chart: NEC 310.16 Copper and Aluminum',
  metaDescription: 'Allowable ampacity of copper and aluminum conductors at 60, 75 and 90 C from NEC Table 310.16, with the 240.4(D) breaker limit beside it. Free to print.',
  imageAlt:
    'Wire ampacity chart listing allowable ampacity of copper conductors at 60, 75 and 90 degrees C from 14 AWG to 4/0, with the maximum overcurrent device rating beside each size.',

  rows,

  related: ['wire-gauge-chart', 'wire-resistance-chart'],

  howToUse: [
    'Read the termination rating off the breaker, the panel or the device, then use the column that matches it. On a circuit rated 100 A or less, or one marked for 14 AWG through 1 AWG, that is the 60 °C column unless the equipment is listed and marked for conductors of a higher rating, in which case use the higher column.',
    'Check the Max OCPD column before sizing the breaker. For 14, 12 and 10 AWG it is lower than the ampacity, and it is the figure that governs.',
    'The 90 °C column is almost never the working ampacity. It is there so a conductor with 90 °C insulation can be used as the starting point for a correction or adjustment calculation.',
    'These figures assume 30 °C ambient and no more than three current-carrying conductors. A hot attic or a crowded conduit lowers them, through tables this page does not carry.',
    'Where the equipment manufacturer specifies a conductor for the terminal, that instruction governs over any table.',
  ],

  faq: [
    {
      q: 'Why is the breaker limit lower than the ampacity?',
      a: 'Because they answer different questions. Ampacity is how much current the conductor can carry continuously under the stated conditions. 240.4(D) limits the overcurrent device protecting small conductors, and for 14, 12 and 10 AWG it sits below the ampacity: 15 A on 14 AWG copper against 20 A of ampacity at 75 °C. The lower figure is the one that sizes the circuit.',
    },
    {
      q: 'Which temperature column should I use?',
      a: 'The one matching the lowest temperature rating in the connection, which 110.14(C) makes the rule. On circuits of 100 A or less, or marked for 14 AWG through 1 AWG, that is 60 °C by default, and 75 °C where the equipment is listed and marked for it. Above 100 A it is 75 °C, or higher where the equipment is listed and identified for that.',
    },
    {
      q: 'Why does the 14 AWG aluminum row carry footnotes?',
      a: 'Because Table 310.16 puts them there. The figures on that row apply to copper-clad aluminum, not to plain aluminum, and the 75 °C and 90 °C figures may be used only for adjustment or correction rather than as a working ampacity. The row is kept because the copper side of it is the size most people come here for, and the footnotes are on the individual cells because that is where the standard puts them.',
    },
    {
      q: 'Do these numbers apply in a hot attic or a full conduit?',
      a: 'No. Table 310.16 assumes 30 °C ambient and not more than three current-carrying conductors. Above that ambient the figures are multiplied by the correction factors in 310.15(B), and beyond three conductors by the adjustment factors in 310.15(C)(1). Both are separate tables, and neither is applied to the figures on this page.',
    },
  ],
};
