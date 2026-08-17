import type { APIRoute } from 'astro';
import { publishedCharts } from '../data/registry.ts';

/**
 * What `scripts/render-sheets.mjs` should render.
 *
 * Emitted by the build so the renderer reads the same registry the pages did.
 * A hand-kept list of slugs in the script is how you end up rendering five sheets
 * for six pages.
 */
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      publishedCharts.map((c) => ({
        slug: c.slug,
        printOrientation: c.printOrientation,
        title: c.title,
      })),
    ),
    { headers: { 'content-type': 'application/json' } },
  );
