/**
 * Definitional arithmetic.
 *
 * Everything in this file is a formula or an identity, not a transcription.
 * That is the reason charts built from it may be published without a human
 * sight-check: `scripts/check-data.ts` recomputes each value from the same
 * definition and fails on any drift, so for these tables the machine check
 * genuinely is a truth check.
 *
 * Nothing that merely *looks* computable belongs here. ISO metric coarse
 * pitches, NEC ampacities and AS568 O-ring dimensions are published tables
 * that happen to contain numbers; putting them behind a function would
 * launder a transcription into something that reads as derived.
 */

/** Exact by definition. */
export const MM_PER_INCH = 25.4;

// ---------------------------------------------------------------------------
// American Wire Gauge
// ---------------------------------------------------------------------------

/**
 * AWG is a defined geometric series, not a measured list: 36 AWG is 0.005 in,
 * 0000 AWG is 0.4600 in, and the 39 steps between them are in constant ratio.
 *
 *   d(n) = 0.005 × 92^((36 − n) / 39)  inches
 *
 * The gauge number runs negative for the aught sizes: 0 is n = 0, 00 is n = −1,
 * 000 is n = −2, 0000 is n = −3.
 */
export function awgDiameterInches(n: number): number {
  return 0.005 * Math.pow(92, (36 - n) / 39);
}

/** Circular mils: the square of the diameter expressed in mils. Definitional. */
export function circularMils(diameterInches: number): number {
  return Math.pow(diameterInches * 1000, 2);
}

/** Cross-sectional area of a round conductor. Definitional. */
export function areaMm2(diameterMm: number): number {
  return (Math.PI / 4) * Math.pow(diameterMm, 2);
}

/** `0000`, `000`, `00`, `0`, then `1`, `2`, … */
export function awgLabel(n: number): string {
  return n <= 0 ? '0'.repeat(1 - n) : String(n);
}

export interface AwgRow {
  n: number;
  label: string;
  diameterIn: number;
  diameterMm: number;
  circularMils: number;
  areaMm2: number;
}

/**
 * The continuous series from `from` to `to` inclusive, no gaps.
 *
 * Continuity is a deliberate choice, not a default. A reference table that
 * silently omits sizes reads as exhaustive and is not, and here the omissions
 * would have landed exactly where the audience needs them: 16, 18, 20 and 22
 * AWG are the working range for speaker wire and 12 V circuits, which are two
 * of this axis's own pages.
 */
export function awgSeries(from = -3, to = 40): AwgRow[] {
  const rows: AwgRow[] = [];
  for (let n = from; n <= to; n++) {
    const diameterIn = awgDiameterInches(n);
    const diameterMm = diameterIn * MM_PER_INCH;
    rows.push({
      n,
      label: awgLabel(n),
      diameterIn,
      diameterMm,
      circularMils: circularMils(diameterIn),
      areaMm2: areaMm2(diameterMm),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Fractional inch sizes
// ---------------------------------------------------------------------------

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** `12/64` → `3/16`, `32/64` → `1/2`, `64/64` → `1`. */
export function reduceFraction(numerator: number, denominator: number): string {
  const d = gcd(numerator, denominator);
  const n = numerator / d;
  const den = denominator / d;
  return den === 1 ? String(n) : `${n}/${den}`;
}

export interface FractionRow {
  sixtyFourths: number;
  label: string;
  inches: number;
  mm: number;
}

/**
 * Fractional sizes in 64ths.
 *
 * Note what is NOT here: a separate "decimal equivalent" column. For a
 * fractional size the diameter in inches and the decimal equivalent are the
 * same number, and on a sheet meant to be read from a metre away a duplicated
 * column costs the density that is the reason to print it at all.
 */
export function sixtyFourthsSeries(from = 1, to = 64): FractionRow[] {
  const rows: FractionRow[] = [];
  for (let i = from; i <= to; i++) {
    const inches = i / 64;
    rows.push({
      sixtyFourths: i,
      label: reduceFraction(i, 64),
      inches,
      mm: inches * MM_PER_INCH,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Fixed decimal places, with thousands separators above 9999.
 *
 * Precision is fixed per column and never varies by row: a reference table that
 * shows more digits on some rows than others invites the reader to read the
 * difference as meaningful.
 */
export function fmt(value: number, precision: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}
