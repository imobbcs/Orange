import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../server/db';
import { bitcoinNewsCache } from '../../shared/schema';
import { desc } from 'drizzle-orm';

interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  published_on: number;
  imageurl?: string;
  body: string;
  tags?: string;
}

interface NewsResponse {
  articles: NewsArticle[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check cache first - data should be updated every hour
    const cached = await db.select().from(bitcoinNewsCache).orderBy(desc(bitcoinNewsCache.timestamp)).limit(3);
    
    if (cached.length === 3) {
      const cacheAge = Date.now() - new Date(cached[0].timestamp).getTime();
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
      
      if (cacheAge < oneHour) {
        console.log('Bitcoin news: Using cached data');
        const newsResponse: NewsResponse = {
          articles: cached.map(article => ({
            id: article.id.toString(),
            title: article.title,
            url: article.url,
            source: article.source,
            published_on: article.published_on,
            body: article.body || ''
          }))
        };
        return res.status(200).json(newsResponse);
      }
    }

    const apiKey = process.env.CRYPTOCOMPARE_API_KEY;
    
    if (!apiKey) {
      throw new Error('CryptoCompare API key not found');
    }

    // Fetch Bitcoin-specific news from CryptoCompare
    const response = await fetch(
      `https://min-api.cryptocompare.com/data/v2/news/?categories=BTC&excludeCategories=Sponsored,Altcoin&sortOrder=latest&limit=20&api_key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`CryptoCompare News API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.Data || !Array.isArray(data.Data)) {
      throw new Error('Invalid CryptoCompare News API response format');
    }

    // Filter for Bitcoin-specific content and take only 3 articles
    const bitcoinNews = data.Data
      .filter((article: any) => {
        const title = article.title?.toLowerCase() || '';
        
        // Must have Bitcoin or BTC in the title
        const hasBitcoinInTitle = title.includes('bitcoin') || title.includes('btc');
        
        // Exclude articles that mention other cryptocurrencies
        const hasOtherCrypto = title.includes('ethereum') || title.includes('eth') || 
                              title.includes('altcoin') || title.includes('monero') || 
                              title.includes('zcash') || title.includes('dogecoin') || 
                              title.includes('solana') || title.includes('cardano') ||
                              title.includes('ripple') || title.includes('xrp') ||
                              title.includes('litecoin') || title.includes('ltc') ||
                              title.includes('top 10') || title.includes('crypto market') ||
                              title.includes('cryptocurrencies');
        
        return hasBitcoinInTitle && !hasOtherCrypto;
      })
      .slice(0, 3)
      .map((article: any) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        source: article.source_info?.name || article.source || 'Unknown',
        published_on: article.published_on,
        body: article.body?.substring(0, 150) + '...' || ''
      }));

    // Clear old cache and store fresh data
    await db.delete(bitcoinNewsCache);
    
    // Insert fresh news articles
    if (bitcoinNews.length > 0) {
      await db.insert(bitcoinNewsCache).values(
        bitcoinNews.map(article => ({
          title: article.title,
          url: article.url,
          source: article.source,
          published_on: article.published_on,
          body: article.body
        }))
      );
    }

    console.log(`Fetched ${bitcoinNews.length} Bitcoin news articles`);

    const newsResponse: NewsResponse = {
      articles: bitcoinNews
    };

    res.status(200).json(newsResponse);

  } catch (error) {
    console.error('Bitcoin News API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Bitcoin news',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}