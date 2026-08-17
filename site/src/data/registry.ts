import type { Chart, Trade, TruthLevel } from './schema.ts';
import { PUBLISHABLE } from './schema.ts';
import { wireGaugeChart } from './charts/wire-gauge-chart.ts';
import { drillBitSizeChart } from './charts/drill-bit-size-chart.ts';
import { fractionDecimalMmChart } from './charts/fraction-decimal-mm-chart.ts';
import { pendingCharts } from './charts/pending.ts';

/** Every chart the project knows about, published or held. */
export const allCharts: Chart[] = [
  wireGaugeChart,
  drillBitSizeChart,
  fractionDecimalMmChart,
  ...pendingCharts,
];

/**
 * Charts that get a page, a card and a sitemap entry.
 *
 * Publication is a data property, not an editorial decision made in a template.
 * Flip a chart's `verification.status` to `verified` after a sight-check and it
 * appears everywhere at once — grid, trade counts, sitemap, related links — with
 * no page to remember to update.
 */
export const publishedCharts: Chart[] = allCharts.filter((c) =>
  PUBLISHABLE.includes(c.verification.status),
);

export const pendingVerification: Chart[] = allCharts.filter(
  (c) => c.verification.status === 'needs-review',
);

export function chartBySlug(slug: string): Chart | undefined {
  return allCharts.find((c) => c.slug === slug);
}

export function publishedBySlug(slug: string): Chart | undefined {
  return publishedCharts.find((c) => c.slug === slug);
}

// ---------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------

export interface TradeInfo {
  id: Trade;
  label: string;
  blurb: string;
  /** Charts live on the site right now. */
  published: number;
  /** Charts drafted and held pending a sight-check. */
  inVerification: number;
}

const TRADE_META: Record<Trade, { label: string; blurb: string }> = {
  electrical: { label: 'Electrical', blurb: 'Wire, gauge and circuit reference' },
  machining: { label: 'Machining', blurb: 'Drills, taps and stock sizes' },
  fasteners: { label: 'Fasteners', blurb: 'Bolts, threads and torque' },
  tools: { label: 'Tools & Materials', blurb: 'Sockets, keys and conversions' },
};

/**
 * Counts computed from the data, never written by hand.
 *
 * The design draft carried "125+ charts", "140+", "90+" and "110+" on these
 * tiles — 465 charts, against a first-wave map of about thirty. Numbers on a
 * catalogue tile are a promise the next click either keeps or breaks, and the
 * cheapest way to keep it is to make the tile incapable of saying anything the
 * registry does not contain.
 */
export const trades: TradeInfo[] = (Object.keys(TRADE_META) as Trade[]).map((id) => ({
  id,
  ...TRADE_META[id],
  published: publishedCharts.filter((c) => c.trade === id).length,
  inVerification: pendingVerification.filter((c) => c.trade === id).length,
}));

export const siteCounts = {
  published: publishedCharts.length,
  inVerification: pendingVerification.length,
  total: allCharts.length,
};

/**
 * The truth levels actually present in the published set, for the About page and
 * the dark trust block. Derived so the copy cannot drift from the data.
 */
export const publishedTruthLevels: TruthLevel[] = [
  ...new Set(publishedCharts.map((c) => c.verification.status)),
];

/** Most recent sight-check or build audit across the published set. */
export const lastVerifiedOn: string = publishedCharts
  .map((c) => c.verification.verifiedOn)
  .sort()
  .at(-1)!;
