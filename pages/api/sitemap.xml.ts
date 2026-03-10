import { NextApiRequest, NextApiResponse } from 'next';
import { getAllPosts } from '../../utils/blog';

// Cache sitemap for 1 hour
let sitemapCache: { content: string; timestamp: number } | null = null;
const SITEMAP_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check cache first
  if (sitemapCache && Date.now() - sitemapCache.timestamp < SITEMAP_CACHE_DURATION) {
    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(sitemapCache.content);
    return;
  }

  const baseUrl = 'https://whentobuybtc.xyz';
  const locales = ['en', 'fr', 'de', 'it'];
  const currentDate = new Date().toISOString();
  
  let urls = [];
  let totalPosts = 0;
  
  // Add main pages for each locale
  locales.forEach(locale => {
    urls.push(`  <url>
    <loc>${baseUrl}${locale === 'en' ? '' : `/${locale}`}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>`);
    
    urls.push(`  <url>
    <loc>${baseUrl}${locale === 'en' ? '' : `/${locale}`}/blog</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);
  });
  
  // URLs to exclude from sitemap (404 errors due to language-locale mismatches)
  const excludedUrls = [
    // Original exclusions
    'blog/bitcoin-dca-oder-einmal',
    'blog/bitcoin-mythen-entzaubert',
    'de/blog/bitcoin-beginner-mistakes',
    
    // French slugs in English locale
    'blog/bitcoin-erreurs-debutants',
    'blog/indice-peur-cupidite',
    
    // German slugs in English locale
    'blog/bitcoin-wer-hat-die-meisten',
    
    // Italian slugs in English locale
    'blog/bitcoin-vs-altcoin',
    'blog/bitcoin-halving-spiegato',
    'blog/miti-bitcoin-sfatare',
    
    // English slugs in French locale
    'fr/blog/bitcoin-investment-dca-vs-lump',
    'fr/blog/bitcoin-myths-busted',
    'fr/blog/bitcoin-halving-explained',
    
    // German slugs in French locale
    'fr/blog/bitcoin-mythen-entzaubert',
    'fr/blog/bitcoin-volatilitaet-erklaert',
    
    // English slugs in Italian locale
    'it/blog/bitcoin-volatility-explained'
  ];

  // Add blog posts for each locale
  locales.forEach(locale => {
    const localePosts = getAllPosts(locale);
    totalPosts += localePosts.length;
    localePosts.forEach(post => {
      const urlPath = `${locale === 'en' ? '' : `${locale}/`}blog/${post.slug}`;
      
      // Skip excluded URLs
      if (excludedUrls.includes(urlPath)) {
        console.log(`⚠️  Excluding problematic URL from sitemap: ${urlPath}`);
        return;
      }
      
      urls.push(`  <url>
    <loc>${baseUrl}${locale === 'en' ? '' : `/${locale}`}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.date).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    });
  });

  // Log sitemap generation for monitoring
  console.log(`📄 Sitemap generated: ${totalPosts} blog posts across ${locales.length} languages`);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  // Cache the result
  sitemapCache = {
    content: sitemap,
    timestamp: Date.now()
  };

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(sitemap);
}