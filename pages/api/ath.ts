import type { NextApiRequest, NextApiResponse } from 'next';

let cache: { ath_usd: number; ath_eur: number; ath_date: string } | null = null;
let cacheTime = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  // 1. CoinGecko
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false',
      {
        headers: { 'User-Agent': 'whentobuybtc.xyz/1.0' },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!r.ok) throw new Error(`CoinGecko HTTP ${r.status}`);
    const data = await r.json();
    const ath_usd = data.market_data?.ath?.usd;
    const ath_eur = data.market_data?.ath?.eur;
    if (!ath_usd) throw new Error('No ATH data');

    cache = { ath_usd, ath_eur, ath_date: data.market_data?.ath_date?.usd ?? '' };
    cacheTime = Date.now();
    return res.status(200).json(cache);
  } catch (err: any) {
    console.error('ath CoinGecko error:', err.message);
  }

  // 2. Stale cache or hard fallback
  if (cache) return res.status(200).json(cache);
  return res.status(200).json({ ath_usd: 109000, ath_eur: 101000, ath_date: '2025-01-20' });
}
