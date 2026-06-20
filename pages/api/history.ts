import { NextApiRequest, NextApiResponse } from 'next';
import { HistoryData } from '../../types';

let cache: { data: HistoryData; timeframe: string; currency: string } | null = null;

async function fetchHistoryFromCoinGecko(days: number = 30, currency: string = 'eur'): Promise<HistoryData | null> {
  try {
    const cgKey = process.env.COINGECKO_API_KEY ? `&x_cg_demo_api_key=${process.env.COINGECKO_API_KEY}` : '';
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currency}&days=${days}${cgKey}`
    );
    if (!response.ok) {
      console.error('CoinGecko History API response:', response.status, response.statusText);
      return null;
    }
    const data = await response.json();
    console.log(`CoinGecko historical data fetched successfully (${currency.toUpperCase()})`);
    return {
      prices: data.prices.map((price: [number, number]) => [
        price[0], // timestamp
        price[1], // price in requested currency
      ]),
    };
  } catch (error) {
    console.error('CoinGecko history API error:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HistoryData | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { timeframe, currency } = req.query;

  const validTimeframes: Record<string, number> = { '1w': 7, '1m': 30, '3m': 90, '1y': 365 };
  const days = validTimeframes[timeframe as string] || 30;

  const validCurrencies = ['eur', 'usd'];
  const resolvedCurrency = validCurrencies.includes((currency as string)?.toLowerCase())
    ? (currency as string).toLowerCase()
    : 'eur';

  const historyData = await fetchHistoryFromCoinGecko(days, resolvedCurrency);

  if (historyData) {
    cache = { data: historyData, timeframe: timeframe as string, currency: resolvedCurrency };
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(historyData);
  }

  // Stale cache fallback
  if (cache) {
    console.log('history: CoinGecko failed, serving stale cache');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(cache.data);
  }

  return res.status(500).json({ error: 'Failed to fetch historical data' });
}
