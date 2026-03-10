import { NextApiRequest, NextApiResponse } from 'next';

// Enhanced indexing helper that provides multiple indexing signals
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Submit to Google using ping method
    const sitemapUrl = 'https://whentobuybtc.xyz/api/sitemap.xml';
    const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    
    await fetch(googlePingUrl);

    // Submit to Bing
    const bingPingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    await fetch(bingPingUrl);

    res.status(200).json({ 
      message: 'Sitemap submitted to search engines',
      timestamp: new Date().toISOString(),
      sitemap: sitemapUrl
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Error during indexing submission',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}