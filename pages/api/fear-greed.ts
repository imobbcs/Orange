import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../server/db';
import { fearGreedCache } from '../../shared/schema';
import { desc } from 'drizzle-orm';

interface FearGreedData {
  value: number;
  value_classification: string;
  timestamp: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check cache first - data should be updated every 6 hours
    const cached = await db.select().from(fearGreedCache).orderBy(desc(fearGreedCache.timestamp)).limit(1);
    
    if (cached.length > 0) {
      const cacheAge = Date.now() - new Date(cached[0].timestamp).getTime();
      const sixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
      
      if (cacheAge < sixHours) {
        console.log('Fear & Greed Index: Using cached data');
        const fearGreedData: FearGreedData = {
          value: cached[0].value,
          value_classification: cached[0].classification,
          timestamp: Math.floor(new Date(cached[0].timestamp).getTime() / 1000)
        };
        return res.status(200).json(fearGreedData);
      }
    }

    // Fetch fresh data from the official Fear & Greed Index API
    const response = await fetch('https://api.alternative.me/fng/');
    
    if (!response.ok) {
      throw new Error(`Fear & Greed API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.data || !data.data[0]) {
      throw new Error('Invalid Fear & Greed API response format');
    }
    
    const fearGreedData: FearGreedData = {
      value: parseInt(data.data[0].value),
      value_classification: data.data[0].value_classification,
      timestamp: parseInt(data.data[0].timestamp)
    };
    
    // Cache the fresh data
    await db.insert(fearGreedCache).values({
      value: fearGreedData.value,
      classification: fearGreedData.value_classification
    });

    console.log(`Fear & Greed Index: ${fearGreedData.value} (${fearGreedData.value_classification})`);
    
    res.status(200).json(fearGreedData);
    
  } catch (error) {
    console.error('Fear & Greed Index API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Fear & Greed Index data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}