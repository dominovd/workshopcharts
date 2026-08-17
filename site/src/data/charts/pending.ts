import type { Chart } from '../schema.ts';

/**
 * Charts that are planned, scoped and NOT PUBLISHED.
 *
 * Each entry below is a real page in the first-wave page map whose values come
 * from a published table rather than from arithmetic. None of them can reach the
 * site until someone reads the standard and signs the row. They live here so the
 * hold is visible in code and the site's own counts stay honest: they are
 * reported as work in verification, never as charts.
 *
 * The `note` on each is the actual instruction for the sight-check, including
 * what went wrong in the design draft. Three of these notes exist because a
 * plausible-looking table was caught before it shipped, which is the argument
 * for the whole mechanism.
 *
 * Each one moves to its own file when it is populated.
 */

export const pendingCharts: Chart[] = [
  {
    slug: 'wire-ampacity-chart',
    title: 'Wire Ampacity Chart',
    subtitle: 'Allowable ampacity of copper and aluminium conductors under NEC 310.16.',
    trade: 'electrical',
    completeness: 'selected',
    coverageNote: 'Sizes covered by NEC Table 310.16.',
    printOrientation: 'landscape',
    sources: [
      {
        id: 'nec-310-16',
        standard: 'NEC Table 310.16',
        publisher: 'NFPA',
        provides:
          'Allowable ampacity of insulated conductors rated up to 2000 V, not more than three current-carrying conductors in a raceway, cable or earth, at an ambient of 30 °C.',
        url: 'https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70',
      },
      {
        id: 'nec-240-4d',
        standard: 'NEC 240.4(D)',
        publisher: 'NFPA',
        provides:
          'Small-conductor overcurrent limits, which cap protection for 14, 12 and 10 AWG below what 310.16 alone would allow.',
        url: 'https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70',
      },
    ],
    columns: [
      { key: 'awg', label: 'Size', unit: 'none', system: 'both', sources: ['nec-310-16'] },
      {
        key: 'cu60',
        label: 'Copper 60 °C',
        unit: 'none',
        system: 'both',
        sources: ['nec-310-16'],
        conditions: ['60 °C insulation rating', 'Not more than three current-carrying conductors'],
      },
      {
        key: 'cu75',
        label: 'Copper 75 °C',
        unit: 'none',
        system: 'both',
        sources: ['nec-310-16'],
        conditions: ['75 °C insulation rating', 'Not more than three current-carrying conductors'],
      },
      {
        key: 'ocpdLimit',
        label: 'Max OCPD',
        unit: 'none',
        system: 'both',
        sources: ['nec-240-4d'],
        conditions: ['Applies to 14, 12 and 10 AWG regardless of the 310.16 figure'],
      },
    ],
    conditions: [
      'Ampacity is a property of an installation, not of a wire size. Insulation rating, ambient temperature, conduit fill and conductor bundling all reduce it.',
      'For branch-circuit wiring the overcurrent limits in 240.4(D) apply on top of the 310.16 ampacity.',
    ],
    verification: {
      status: 'needs-review',
      verifiedOn: '2026-08-17',
      note: 'HELD, AND THE REASON MATTERS. The design draft carried a MAX AMPS column on the wire gauge page reading 35 A at 14 AWG, 47 at 12, 60 at 10, rising to 380 at 4/0. Those figures match the "maximum amps for chassis wiring" column of the hobby AWG table that has circulated since the mid-century, which is free air rather than raceway. NEC 310.16 for copper at 75 °C gives 20, 25 and 35 A for the same three sizes, and 240.4(D) then caps protection at 15, 20 and 30 A. The draft figures ran roughly double the code limit, on the page a person sizing a receptacle circuit would land on first. A footnote saying "depends on installation method" does not undo a printed number. Transcribe 310.16 and 240.4(D) directly, keep the two temperature columns separate, and do not merge this into the wire gauge page, because the whole point is that ampacity carries its own conditions.',
    },
    rows: [],
    pinSheet: { columns: [], rowColumns: 2 },
    printSheet: { rowColumns: 1 },
    metaTitle: '',
    metaDescription: '',
    imageAlt: '',
    related: ['wire-gauge-chart'],
  },

  {
    slug: 'o-ring-size-chart',
    title: 'O-Ring Size Chart',
    subtitle: 'AS568 standard O-ring inside diameter and cross-section.',
    trade: 'tools',
    completeness: 'selected',
    coverageNote: 'To be decided at verification: full dash-number run, or a labelled selection.',
    printOrientation: 'landscape',
    sources: [
      {
        id: 'as568',
        standard: 'SAE AS568',
        publisher: 'SAE International',
        provides: 'Dash numbers with inside diameter and cross-section for standard O-ring sizes.',
        url: 'https://www.sae.org/standards/as568-aerospace-size-standard-o-rings',
      },
    ],
    columns: [
      { key: 'dash', label: 'Dash no.', unit: 'none', system: 'both', sources: ['as568'] },
      { key: 'idIn', label: 'ID', group: 'in', unit: 'in', system: 'imperial', precision: 3, sources: ['as568'] },
      { key: 'csIn', label: 'CS', group: 'in', unit: 'in', system: 'imperial', precision: 3, sources: ['as568'] },
      { key: 'idMm', label: 'ID', group: 'mm', unit: 'mm', system: 'metric', precision: 2, sources: ['as568'], convertedFrom: { column: 'idIn', factor: 25.4 } },
      { key: 'csMm', label: 'CS', group: 'mm', unit: 'mm', system: 'metric', precision: 2, sources: ['as568'], convertedFrom: { column: 'csIn', factor: 25.4 } },
    ],
    conditions: ['Nominal free-state dimensions. Groove design and squeeze are separate from size selection.'],
    verification: {
      status: 'needs-review',
      verifiedOn: '2026-08-17',
      note: 'HELD. The design draft showed -006 through -012 with IDs of 0.070, 0.103, 0.139, 0.210, 0.239, 0.301 and skipped -009 without a note. The values look like the series shifted by one row: the draft -011 (0.239) and -012 (0.301) sit where -010 and -011 belong. The draft -006 also had ID equal to cross-section, which is not how the start of the series reads. Note that this table passed every mechanical check available, converting inches to millimetres perfectly on every row, which is exactly why a sight-check against the standard is not optional. Read AS568 directly, decide whether the page carries the full dash-number run or a labelled selection, and never leave an unmarked gap in a series.',
    },
    rows: [],
    pinSheet: { columns: [], rowColumns: 2 },
    printSheet: { rowColumns: 1 },
    metaTitle: '',
    metaDescription: '',
    imageAlt: '',
    related: [],
  },

  {
    slug: 'bolt-torque-chart',
    title: 'Bolt Torque Chart',
    subtitle: 'SAE J429 bolt torque by grade, diameter and thread condition.',
    trade: 'fasteners',
    completeness: 'selected',
    coverageNote: 'To be decided at verification.',
    printOrientation: 'landscape',
    sources: [
      {
        id: 'sae-j429',
        standard: 'SAE J429',
        publisher: 'SAE International',
        provides: 'Mechanical and material requirements for externally threaded fasteners by grade.',
        edition: 'J429_201405',
        url: 'https://www.sae.org/standards/content/j429_201405/',
      },
    ],
    columns: [
      { key: 'size', label: 'Bolt size', unit: 'none', system: 'both', sources: ['sae-j429'] },
      { key: 'tpi', label: 'TPI', unit: 'tpi', system: 'both', sources: ['sae-j429'] },
      {
        key: 'dryUnplated',
        label: 'Dry, unplated',
        unit: 'ft-lb',
        system: 'both',
        sources: ['sae-j429'],
        conditions: ['Clean, dry, unplated threads'],
      },
      {
        key: 'zincPlated',
        label: 'Zinc plated',
        unit: 'ft-lb',
        system: 'both',
        sources: ['sae-j429'],
        conditions: ['Zinc plated, dry'],
      },
      {
        key: 'lubricated',
        label: 'Lubricated',
        unit: 'ft-lb',
        system: 'both',
        sources: ['sae-j429'],
        conditions: ['Lubricated threads'],
      },
    ],
    conditions: [
      'Torque is a proxy for bolt tension, and the relationship depends on the friction of the specific joint. Plating, lubrication and thread condition each change the figure.',
      'Where the equipment manufacturer specifies a torque for the joint, that figure governs.',
    ],
    verification: {
      status: 'needs-review',
      verifiedOn: '2026-08-17',
      note: 'HELD. The design draft was headed GRADE 5 (ZINC) while the figures read closer to dry unplated, and zinc-plated fasteners take less torque than dry unplated for the same tension. The draft was also internally consistent, with lubricated holding at 73–77 % of dry across every row, which again proves only consistency. Do not ship a single torque column: give each thread condition its own column with its own condition line, so the heading can never disagree with the numbers. Verify separately for J429 grades 2, 5 and 8, and treat metric ISO 898-1 as a different page.',
    },
    rows: [],
    pinSheet: { columns: [], rowColumns: 2 },
    printSheet: { rowColumns: 1 },
    metaTitle: '',
    metaDescription: '',
    imageAlt: '',
    related: [],
  },

  {
    slug: 'tap-drill-size-chart',
    title: 'Tap Drill Size Chart',
    subtitle: 'Tap drill diameters for ISO metric and unified threads.',
    trade: 'machining',
    completeness: 'selected',
    coverageNote: 'To be decided at verification.',
    printOrientation: 'portrait',
    sources: [
      {
        id: 'iso-261',
        standard: 'ISO 261',
        publisher: 'ISO',
        provides: 'ISO general purpose metric screw threads: coarse and fine pitch series.',
        edition: '1998',
        url: 'https://www.iso.org/standard/4165.html',
      },
      {
        id: 'asme-b1-1',
        standard: 'ASME B1.1',
        publisher: 'ASME',
        provides: 'Unified inch screw threads, UN and UNR thread form.',
        url: 'https://www.asme.org/codes-standards/find-codes-standards/b1-1-unified-inch-screw-threads-un-unr-thread-form',
      },
    ],
    columns: [
      { key: 'thread', label: 'Thread', unit: 'none', system: 'both', sources: ['iso-261', 'asme-b1-1'] },
      { key: 'pitch', label: 'Pitch', group: 'mm', unit: 'mm', system: 'metric', precision: 2, sources: ['iso-261'] },
      { key: 'tapDrill', label: 'Tap drill', group: 'mm', unit: 'mm', system: 'metric', precision: 2, sources: ['iso-261'] },
    ],
    conditions: ['Tap drill sizes assume a nominal thread engagement; the required percentage varies with material.'],
    verification: {
      status: 'needs-review',
      verifiedOn: '2026-08-17',
      note: 'HELD, and it is a near miss worth naming. Tap drill for a coarse metric thread follows the rule drill = major diameter − pitch, which reproduces the draft values exactly (M6 × 1.0 → 5.0, M8 × 1.25 → 6.8, M10 × 1.5 → 8.5). That makes the tap drill column derivable, but only from the PITCH column, and the pitch series itself is a published table from ISO 261 rather than arithmetic. A chart is only as derived as its least derivable column. Transcribe and sight-check the pitch series first; the tap drill column can then be computed and machine-checked.',
    },
    rows: [],
    pinSheet: { columns: [], rowColumns: 2 },
    printSheet: { rowColumns: 1 },
    metaTitle: '',
    metaDescription: '',
    imageAlt: '',
    related: ['drill-bit-size-chart'],
  },

  {
    slug: 'number-drill-bit-size-chart',
    title: 'Number Drill Bit Size Chart',
    subtitle: 'Number gauge drill sizes 1 to 80 with decimal inch and millimetre equivalents.',
    trade: 'machining',
    series: 'drill-sizes',
    seriesLabel: 'Number sizes (1–80)',
    completeness: 'continuous',
    coverageNote: 'Number gauge 1 through 80.',
    printOrientation: 'portrait',
    sources: [
      {
        id: 'ansi-b94-11m',
        standard: 'ANSI/ASME B94.11M',
        publisher: 'ASME',
        provides: 'Twist drill sizes for the number, letter, fractional and metric series.',
        edition: '1993',
        url: 'https://www.asme.org/codes-standards/find-codes-standards/b94-11m-twist-drills',
      },
    ],
    columns: [
      { key: 'size', label: 'No.', unit: 'none', system: 'both', sources: ['ansi-b94-11m'] },
      { key: 'inches', label: 'Diameter', group: 'in', unit: 'in', system: 'imperial', precision: 4, sources: ['ansi-b94-11m'] },
      { key: 'mm', label: 'Diameter', group: 'mm', unit: 'mm', system: 'metric', precision: 3, sources: ['ansi-b94-11m'], convertedFrom: { column: 'inches', factor: 25.4 } },
    ],
    conditions: ['Nominal bit sizes. A drilled hole runs slightly oversize.'],
    verification: {
      status: 'needs-review',
      verifiedOn: '2026-08-17',
      note: 'HELD, and worth doing early: `number drill bit size chart` measures 880/month at KD 16, one of the cheapest entries on the page map. The number series is a published table rather than arithmetic: the sizes do not follow a formula, which is exactly why it needs a sight-check against ANSI/ASME B94.11M rather than a clever generator.',
    },
    rows: [],
    pinSheet: { columns: [], rowColumns: 2 },
    printSheet: { rowColumns: 2 },
    metaTitle: '',
    metaDescription: '',
    imageAlt: '',
    related: ['drill-bit-size-chart'],
  },

  {
    slug: 'letter-drill-bit-size-chart',
    title: 'Letter Drill Bit Size Chart',
    subtitle: 'Letter gauge drill sizes A to Z with decimal inch and millimetre equivalents.',
    trade: 'machining',
    series: 'drill-sizes',
    seriesLabel: 'Letter sizes (A–Z)',
    completeness: 'continuous',
    coverageNote: 'Letter gauge A through Z.',
    printOrientation: 'portrait',
    sources: [
      {
        id: 'ansi-b94-11m',
        standard: 'ANSI/ASME B94.11M',
        publisher: 'ASME',
        provides: 'Twist drill sizes for the letter series.',
        edition: '1993',
        url: 'https://www.asme.org/codes-standards/find-codes-standards/b94-11m-twist-drills',
      },
    ],
    columns: [
      { key: 'size', label: 'Letter', unit: 'none', system: 'both', sources: ['ansi-b94-11m'] },
      { key: 'inches', label: 'Diameter', group: 'in', unit: 'in', system: 'imperial', precision: 4, sources: ['ansi-b94-11m'] },
      { key: 'mm', label: 'Diameter', group: 'mm', unit: 'mm', system: 'metric', precision: 3, sources: ['ansi-b94-11m'], convertedFrom: { column: 'inches', factor: 25.4 } },
    ],
    conditions: ['Nominal bit sizes. A drilled hole runs slightly oversize.'],
    verification: {
      status: 'needs-review',
      verifiedOn: '2026-08-17',
      note: 'HELD. Published table, no formula. Small on its own but it completes the drill hub, and a hub that names four series and delivers two is only half honest.',
    },
    rows: [],
    pinSheet: { columns: [], rowColumns: 1 },
    printSheet: { rowColumns: 1 },
    metaTitle: '',
    metaDescription: '',
    imageAlt: '',
    related: ['drill-bit-size-chart'],
  },

  {
    slug: 'metric-drill-bit-size-chart',
    title: 'Metric Drill Bit Size Chart',
    subtitle: 'Metric drill sizes with inch equivalents and nearest fractional size.',
    trade: 'machining',
    series: 'drill-sizes',
    seriesLabel: 'Metric sizes',
    completeness: 'selected',
    coverageNote: 'To be decided at verification: the full preferred series, or a labelled selection.',
    printOrientation: 'portrait',
    sources: [
      {
        id: 'iso-235',
        standard: 'ISO 235',
        publisher: 'ISO',
        provides: 'Parallel shank twist drills: preferred metric diameter series.',
        edition: '2016',
        url: 'https://www.iso.org/standard/64191.html',
      },
    ],
    columns: [
      { key: 'size', label: 'Size', group: 'mm', unit: 'mm', system: 'metric', precision: 2, sources: ['iso-235'] },
      { key: 'inches', label: 'Diameter', group: 'in', unit: 'in', system: 'imperial', precision: 4, sources: ['iso-235'] },
    ],
    conditions: ['Nominal bit sizes. A drilled hole runs slightly oversize.'],
    verification: {
      status: 'needs-review',
      verifiedOn: '2026-08-17',
      note: 'HELD. The preferred metric series is a published selection, not every 0.1 mm step, so the coverage note has to say which it is before this can go up.',
    },
    rows: [],
    pinSheet: { columns: [], rowColumns: 1 },
    printSheet: { rowColumns: 1 },
    metaTitle: '',
    metaDescription: '',
    imageAlt: '',
    related: ['drill-bit-size-chart'],
  },

  {
    slug: 'socket-size-chart',
    title: 'Socket Size Chart',
    subtitle: 'SAE and metric socket sizes with the fasteners they fit.',
    trade: 'tools',
    completeness: 'selected',
    coverageNote: 'To be decided at verification.',
    printOrientation: 'landscape',
    sources: [
      {
        id: 'asme-b18-2-2',
        standard: 'ASME B18.2.2',
        publisher: 'ASME',
        provides: 'Nuts for general applications: dimensions, including width across flats.',
        url: 'https://www.asme.org/codes-standards/find-codes-standards/b18-2-2-nuts-general-applications-machine-screw-nuts-hex-square-hex-flange-coupling-nuts',
      },
    ],
    columns: [
      { key: 'socket', label: 'Socket', unit: 'none', system: 'both', sources: ['asme-b18-2-2'] },
      { key: 'acrossFlats', label: 'Across flats', group: 'in', unit: 'in', system: 'imperial', precision: 4, sources: ['asme-b18-2-2'] },
      { key: 'boltSize', label: 'Fits bolt', unit: 'none', system: 'both', sources: ['asme-b18-2-2'] },
    ],
    conditions: ['Nominal width across flats. Worn or plated fasteners may need the next size.'],
    verification: {
      status: 'needs-review',
      verifiedOn: '2026-08-17',
      note: 'HELD. The socket list itself is conventional and easy to enumerate, but the useful column is which bolt or nut each size fits, and that comes from the width-across-flats dimensions in ASME B18.2.2. Enumerating the sockets without that column would be a page with nothing on it that a reader could not guess.',
    },
    rows: [],
    pinSheet: { columns: [], rowColumns: 2 },
    printSheet: { rowColumns: 1 },
    metaTitle: '',
    metaDescription: '',
    imageAlt: '',
    related: [],
  },

  {
    slug: 'thread-pitch-chart',
    title: 'Thread Pitch Chart',
    subtitle: 'Threads per inch and metric pitch for standard fastener series.',
    trade: 'fasteners',
    completeness: 'selected',
    coverageNote: 'To be decided at verification.',
    printOrientation: 'portrait',
    sources: [
      { id: 'asme-b1-1', standard: 'ASME B1.1', publisher: 'ASME', provides: 'UNC and UNF threads per inch by nominal size.' , url: 'https://www.asme.org/codes-standards/find-codes-standards/b1-1-unified-inch-screw-threads-un-unr-thread-form'},
      { id: 'iso-261', standard: 'ISO 261', publisher: 'ISO', provides: 'Metric coarse and fine pitch series.' , url: 'https://www.iso.org/standard/4165.html'},
    ],
    columns: [
      { key: 'size', label: 'Size', unit: 'none', system: 'both', sources: ['asme-b1-1', 'iso-261'] },
      { key: 'coarse', label: 'Coarse', unit: 'tpi', system: 'both', sources: ['asme-b1-1', 'iso-261'] },
      { key: 'fine', label: 'Fine', unit: 'tpi', system: 'both', sources: ['asme-b1-1', 'iso-261'] },
    ],
    conditions: ['Nominal thread designations. Class of fit is a separate specification.'],
    verification: {
      status: 'needs-review',
      verifiedOn: '2026-08-17',
      note: 'HELD. Pitch series are published tables. This one is worth doing early anyway: the cluster measured 0 % AI Overview, which is the cleanest signal on the page map.',
    },
    rows: [],
    pinSheet: { columns: [], rowColumns: 2 },
    printSheet: { rowColumns: 1 },
    metaTitle: '',
    metaDescription: '',
    imageAlt: '',
    related: ['tap-drill-size-chart'],
  },

  {
    slug: 'sheet-metal-gauge-chart',
    title: 'Sheet Metal Gauge Chart',
    subtitle: 'Sheet metal gauge to thickness for steel, galvanised steel and aluminium.',
    trade: 'machining',
    completeness: 'selected',
    coverageNote: 'To be decided at verification.',
    printOrientation: 'landscape',
    sources: [
      {
        id: 'msg',
        standard: 'Manufacturers Standard Gauge',
        provides: 'Gauge to thickness for uncoated and galvanised sheet steel.',
        urlNote:
          'No standards body publishes this table; it is the historic Manufacturers Standard Gauge for sheet steel, carried forward by mills and suppliers. Verify against a current mill or supplier gauge table and record which one.',
      },
      {
        id: 'awg-aluminum',
        standard: 'AWG (Brown & Sharpe) for aluminium sheet',
        provides: 'Aluminium sheet gauge follows the AWG series rather than the steel standard.',
        urlNote:
          'Not a separate document: aluminium sheet gauge follows the AWG series, so the source is the AWG definition applied to sheet rather than the steel gauge table.',
      },
    ],
    columns: [
      { key: 'gauge', label: 'Gauge', unit: 'none', system: 'both', sources: ['msg'] },
      { key: 'steelIn', label: 'Steel', group: 'in', unit: 'in', system: 'imperial', precision: 4, sources: ['msg'] },
      { key: 'galvIn', label: 'Galvanised', group: 'in', unit: 'in', system: 'imperial', precision: 4, sources: ['msg'] },
      { key: 'aluminumIn', label: 'Aluminium', group: 'in', unit: 'in', system: 'imperial', precision: 4, sources: ['awg-aluminum'] },
    ],
    conditions: [
      'Sheet gauge is material-specific: the same gauge number is a different thickness in steel, galvanised steel and aluminium.',
    ],
    verification: {
      status: 'needs-review',
      verifiedOn: '2026-08-17',
      note: 'HELD, and this is the one to build first after the sight-check capacity exists: $7.47 CPC, the highest on the page map. The trap is the one the column model already handles: three materials, three different gauge standards, so each material column must carry its own source row.',
    },
    rows: [],
    pinSheet: { columns: [], rowColumns: 2 },
    printSheet: { rowColumns: 1 },
    metaTitle: '',
    metaDescription: '',
    imageAlt: '',
    related: ['wire-gauge-chart'],
  },
];
