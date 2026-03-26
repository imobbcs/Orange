export default function Sitemap() {
  return null;
}

export async function getServerSideProps({ res }) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://whentobuybtc.xyz/</loc>
    <lastmod>2026-03-26</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="en" href="https://whentobuybtc.xyz/"/>
    <xhtml:link rel="alternate" hreflang="de" href="https://whentobuybtc.xyz/?lang=de"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://whentobuybtc.xyz/"/>
  </url>
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400');
  res.write(sitemap);
  res.end();

  return { props: {} };
}
