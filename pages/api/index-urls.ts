import { NextApiRequest, NextApiResponse } from 'next';
import { getAllPosts } from '../../utils/blog';

// Enhanced URL indexing helper that provides all URLs for search engines
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const baseUrl = 'https://whentobuybtc.xyz';
    const locales = ['en', 'fr', 'de', 'it'];
    const urls: string[] = [];

    // Main pages
    urls.push(baseUrl);
    locales.forEach(locale => {
      if (locale !== 'en') {
        urls.push(`${baseUrl}/${locale}`);
      }
    });

    // Blog index pages
    urls.push(`${baseUrl}/blog`);
    locales.forEach(locale => {
      if (locale !== 'en') {
        urls.push(`${baseUrl}/${locale}/blog`);
      }
    });

    // Blog articles for each locale
    locales.forEach(locale => {
      const posts = getAllPosts(locale);
      posts.forEach(post => {
        if (locale === 'en') {
          urls.push(`${baseUrl}/blog/${post.slug}`);
        } else {
          urls.push(`${baseUrl}/${locale}/blog/${post.slug}`);
        }
      });
    });

    res.status(200).json({
      urls,
      count: urls.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error generating URL list',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}