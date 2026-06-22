const SITE = 'https://whentobuybtc.xyz';

// ── Add future pages here: one object per URL. ──────────────────────────────
// To add a page, copy a block and edit loc / lastmod / priority / alternates.
const pages = [
  {
    loc: `${SITE}/`,
    lastmod: '2026-06-20',
    changefreq: 'daily',
    priority: '1.0',
    alternates: [
      { hreflang: 'en', href: `${SITE}/` },
      { hreflang: 'de', href: `${SITE}/?lang=de` },
      { hreflang: 'x-default', href: `${SITE}/` },
    ],
  },
  {
    loc: `${SITE}/wann-bitcoin-kaufen`,
    lastmod: '2026-06-20',
    changefreq: 'daily',
    priority: '0.9',
    alternates: [
      { hreflang: 'de', href: `${SITE}/wann-bitcoin-kaufen` },
      { hreflang: 'x-default', href: `${SITE}/` },
    ],
  },
];
// ────────────────────────────────────────────────────────────────────────────

function buildUrl(page) {
  const alternates = (page.alternates || [])
    .map(
      (a) =>
        `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`
    )
    .join('\n');

  return `  <url>
    <loc>${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${alternates}
  </url>`;
}

export default function handler(req, res) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.map(buildUrl).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
  res.status(200).send(body);
}
