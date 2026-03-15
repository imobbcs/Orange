import type { NextApiRequest, NextApiResponse } from 'next';

let cache: { value: number; value_classification: string } | null = null;
let cacheTime = 0;
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  // CoinMarketCap Fear & Greed Index (same source most people reference)
  try {
    const r = await fetch('https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY!,
        'User-Agent': 'whentobuybtc.xyz/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`CoinMarketCap HTTP ${r.status}`);
    const data = await r.json();
    const entry = data.data;
    if (!entry) throw new Error('No data');

    cache = {
      value: Math.round(entry.value),
      value_classification: entry.value_classification,
    };
    cacheTime = Date.now();
    return res.status(200).json(cache);
  } catch (err: any) {
    console.error('fear-greed CMC error:', err.message);
  }

  // Fallback to alternative.me
  try {
    const r = await fetch('https://api.alternative.me/fng/?limit=1', {
      headers: { 'User-Agent': 'whentobuybtc.xyz/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const entry = data.data?.[0];
    if (!entry) throw new Error('No data');

    cache = {
      value: parseInt(entry.value),
      value_classification: entry.value_classification,
    };
    cacheTime = Date.now();
    return res.status(200).json(cache);
  } catch (err: any) {
    console.error('fear-greed alternative.me error:', err.message);
    if (cache) return res.status(200).json(cache);
    return res.status(200).json({ value: 50, value_classification: 'Neutral' });
  }
}
