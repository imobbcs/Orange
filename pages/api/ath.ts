import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../server/db';
import { athCache } from '../../shared/schema';
import { desc } from 'drizzle-orm';

interface ATHData {
  ath_usd: number;
  ath_eur: number;
  ath_date: string;
}

async function fetchATHFromCoinGecko(): Promise<ATHData | null> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
    );

    if (!response.ok) {
      console.error('CoinGecko ATH API response:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (!data.market_data?.ath?.usd || !data.market_data?.ath?.eur) {
      console.error('CoinGecko: Missing ATH data');
      return null;
    }

    return {
      ath_usd: data.market_data.ath.usd,
      ath_eur: data.market_data.ath.eur,
      ath_date: data.market_data.ath_date.usd,
    };
  } catch (error) {
    console.error('CoinGecko ATH API error:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ATHData | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if we have recent cached ATH data (12 hours = twice daily)
    const [cachedATH] = await db
      .select()
      .from(athCache)
      .orderBy(desc(athCache.last_updated))
      .limit(1);

    const now = Date.now();
    const twelveHoursInMs = 12 * 60 * 60 * 1000; // 12 hours

    if (cachedATH) {
      const cacheAge = now - new Date(cachedATH.last_updated).getTime();
      
      if (cacheAge < twelveHoursInMs) {
        console.log('Using cached ATH data');
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
        return res.status(200).json({
          ath_usd: cachedATH.ath_usd,
          ath_eur: cachedATH.ath_eur,
          ath_date: cachedATH.ath_date,
        });
      }
    }

    // Fetch fresh ATH data
    const athData = await fetchATHFromCoinGecko();
    
    if (!athData) {
      // If API fails but we have cached data, use it regardless of age
      if (cachedATH) {
        console.log('ATH API failed, using cached data');
        return res.status(200).json({
          ath_usd: cachedATH.ath_usd,
          ath_eur: cachedATH.ath_eur,
          ath_date: cachedATH.ath_date,
        });
      }
      
      throw new Error('Failed to fetch ATH data and no cache available');
    }

    // Save fresh ATH data to cache
    await db.insert(athCache).values({
      ath_usd: athData.ath_usd,
      ath_eur: athData.ath_eur,
      ath_date: athData.ath_date,
    });

    console.log('Fresh ATH data fetched and cached');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
    res.status(200).json(athData);
  } catch (error) {
    console.error('Error fetching ATH data:', error);
    res.status(500).json({ error: 'Failed to fetch ATH data' });
  }
}