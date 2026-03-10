import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const sitemapUrl = 'https://whentobuybtc.xyz/api/sitemap.xml';
    
    // Google Search Console Sitemap Ping
    const googleResponse = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
    
    // Bing Webmaster Tools Sitemap Ping
    const bingResponse = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);

    return res.status(200).json({
      success: true,
      google: googleResponse.status === 200 ? 'submitted' : 'failed',
      bing: bingResponse.status === 200 ? 'submitted' : 'failed',
      sitemap: sitemapUrl,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}