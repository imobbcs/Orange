import { NextApiRequest, NextApiResponse } from 'next';
import { HistoryData } from '../../types';

async function fetchHistoryFromCoinGecko(days: number = 30, currency: string = 'eur'): Promise<HistoryData | null> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currency}&days=${days}`
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

async function fetchHistoryFromCryptoCompare(days: number = 30, currency: string = 'EUR'): Promise<HistoryData | null> {
  try {
    const response = await fetch(
      `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=${currency.toUpperCase()}&limit=${days}`,
      {
        headers: {
          'Authorization': `Apikey ${process.env.CRYPTOCOMPARE_API_KEY!}`,
        },
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    console.log(`CryptoCompare historical data fetched successfully (${currency.toUpperCase()})`);
    return {
      prices: data.Data.Data.map((item: any) => [
        item.time * 1000, // Convert to milliseconds
        item.close,       // Close price in requested currency
      ]),
    };
  } catch (error) {
    console.error('CryptoCompare history API error:', error);
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

  // Validate currency — only allow eur or usd
  const validCurrencies = ['eur', 'usd'];
  const resolvedCurrency = validCurrencies.includes((currency as string)?.toLowerCase())
    ? (currency as string).toLowerCase()
    : 'eur'; // default to EUR

  try {
    // Try CoinGecko first (supports currency natively)
    let historyData = await fetchHistoryFromCoinGecko(days, resolvedCurrency);

    // Fallback to CryptoCompare
    if (!historyData) {
      console.log('Falling back to CryptoCompare for historical data');
      historyData = await fetchHistoryFromCryptoCompare(days, resolvedCurrency);
    }

    if (!historyData) {
      throw new Error('All historical data APIs failed');
    }

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).json(historyData);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ error: 'Failed to fetch historical data from all sources' });
  }
}
