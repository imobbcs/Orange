import type { NextApiRequest, NextApiResponse } from 'next';

let cache: { value: number; value_classification: string } | null = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

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
    console.error('fear-greed error:', err.message);
    if (cache) return res.status(200).json(cache);
    return res.status(200).json({ value: 50, value_classification: 'Neutral' });
  }
}
