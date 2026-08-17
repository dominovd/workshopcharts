import type { APIRoute } from 'astro';
import { publishedCharts } from '../data/registry.ts';

/**
 * Sitemap.
 *
 * Only published charts. A held chart has no page, so it must not appear here
 * either — and because both lists come from the registry, it cannot.
 *
 * The `/sheet/` routes are excluded deliberately: they are the source documents
 * the PDF and PNG are rendered from, and they should not compete with the chart
 * page. robots.txt disallows them as well.
 */
const STATIC = [
  { path: '/', priority: '0.8' },
  { path: '/charts/', priority: '0.7' },
  { path: '/for-shop-class/', priority: '0.6' },
  { path: '/how-we-verify/', priority: '0.5' },
  { path: '/about/', priority: '0.4' },
  { path: '/contact/', priority: '0.3' },
  { path: '/privacy/', priority: '0.1' },
  { path: '/terms/', priority: '0.1' },
];

export const GET: APIRoute = ({ site }) => {
  const base = site?.href.replace(/\/$/, '') ?? 'https://workshopcharts.com';

  const entries = [
    ...STATIC.map((s) => ({ loc: `${base}${s.path}`, priority: s.priority, lastmod: undefined })),
    // Charts get the highest priority and a real lastmod: the date the data was
    // last checked, which is a fact we already track rather than the build date.
    ...publishedCharts.map((c) => ({
      loc: `${base}/${c.slug}/`,
      priority: '1.0',
      lastmod: c.verification.verifiedOn,
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url>\n    <loc>${e.loc}</loc>\n${
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : ''
      }    <priority>${e.priority}</priority>\n  </url>`,
  )
  .join('\n')}
</urlset>
`;

  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
