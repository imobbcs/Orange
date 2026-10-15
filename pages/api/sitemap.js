const SITE = 'https://whentobuybtc.xyz';
// All pages show live market data, so they change every day.
const TODAY = new Date().toISOString().slice(0, 10);

// ── Add future pages here: one object per URL. ──────────────────────────────
// To add a page, copy a block and edit loc / lastmod / priority / alternates.
const pages = [
  {
    loc: `${SITE}/`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: '1.0',
    alternates: [
      { hreflang: 'en', href: `${SITE}/` },
      { hreflang: 'de', href: `${SITE}/wann-bitcoin-kaufen` },
      { hreflang: 'x-default', href: `${SITE}/` },
    ],
  },
  {
    loc: `${SITE}/wann-bitcoin-kaufen`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: '0.9',
    alternates: [
      { hreflang: 'de', href: `${SITE}/wann-bitcoin-kaufen` },
      { hreflang: 'en', href: `${SITE}/` },
      { hreflang: 'x-default', href: `${SITE}/` },
    ],
  },
  {
    loc: `${SITE}/bitcoin-fear-and-greed-index`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: '0.8',
    alternates: [
      { hreflang: 'en', href: `${SITE}/bitcoin-fear-and-greed-index` },
      { hreflang: 'de', href: `${SITE}/bitcoin-angst-und-gier-index` },
      { hreflang: 'x-default', href: `${SITE}/bitcoin-fear-and-greed-index` },
    ],
  },
  {
    loc: `${SITE}/bitcoin-angst-und-gier-index`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: '0.8',
    alternates: [
      { hreflang: 'en', href: `${SITE}/bitcoin-fear-and-greed-index` },
      { hreflang: 'de', href: `${SITE}/bitcoin-angst-und-gier-index` },
      { hreflang: 'x-default', href: `${SITE}/bitcoin-fear-and-greed-index` },
    ],
  },
  {
    loc: `${SITE}/bitcoin-200-day-moving-average`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: '0.8',
    alternates: [
      { hreflang: 'en', href: `${SITE}/bitcoin-200-day-moving-average` },
      { hreflang: 'de', href: `${SITE}/bitcoin-200-tage-linie` },
      { hreflang: 'x-default', href: `${SITE}/bitcoin-200-day-moving-average` },
    ],
  },
  {
    loc: `${SITE}/bitcoin-200-tage-linie`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: '0.8',
    alternates: [
      { hreflang: 'en', href: `${SITE}/bitcoin-200-day-moving-average` },
      { hreflang: 'de', href: `${SITE}/bitcoin-200-tage-linie` },
      { hreflang: 'x-default', href: `${SITE}/bitcoin-200-day-moving-average` },
    ],
  },
  {
    loc: `${SITE}/bitcoin-dca-calculator`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: '0.8',
    alternates: [
      { hreflang: 'en', href: `${SITE}/bitcoin-dca-calculator` },
      { hreflang: 'de', href: `${SITE}/bitcoin-sparplan-rechner` },
      { hreflang: 'x-default', href: `${SITE}/bitcoin-dca-calculator` },
    ],
  },
  {
    loc: `${SITE}/bitcoin-sparplan-rechner`,
    lastmod: TODAY,
    changefreq: 'daily',
    priority: '0.8',
    alternates: [
      { hreflang: 'en', href: `${SITE}/bitcoin-dca-calculator` },
      { hreflang: 'de', href: `${SITE}/bitcoin-sparplan-rechner` },
      { hreflang: 'x-default', href: `${SITE}/bitcoin-dca-calculator` },
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
