import type { NextApiRequest, NextApiResponse } from 'next';

let cache: { ath_usd: number; ath_eur: number; ath_date: string } | null = null;
let cacheTime = 0;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  try {
    const cgKey = process.env.COINGECKO_API_KEY ? `&x_cg_pro_api_key=${process.env.COINGECKO_API_KEY}` : '';
    const r = await fetch(
      `https://pro-api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false${cgKey}`,
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

  if (cache) return res.status(200).json(cache);
  // Last known all-time high (an ATH only ever rises, so this can only understate it).
  // Update when a new ATH is set: CoinGecko 2025-10-06, $126,080 / €107,662.
  return res.status(200).json({ ath_usd: 126080, ath_eur: 107662, ath_date: '2025-10-06T10:57:42.000Z' });
}
