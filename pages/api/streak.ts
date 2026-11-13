// GET /api/streak — the temperature of each of the last 180 days, rebuilt from history (lib/streak.ts).
// The homepage counts back from today's live reading to show "Mild since 2 Nov".
import type { NextApiRequest, NextApiResponse } from 'next';
import { dailyStates, type DayState, type FgDay } from '../../lib/streak';

const TTL = 3 * 60 * 60 * 1000;
let cache: { days: DayState[]; at: number } | null = null;
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz';

async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
  return r.json();
}

// Same source order as /api/fear-greed: CoinMarketCap, then Alternative.me.
async function fgHistory(): Promise<FgDay[]> {
  try {
    const d = await json('https://pro-api.coinmarketcap.com/v3/fear-and-greed/historical?limit=500', {
      headers: { 'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY || '', 'User-Agent': 'whentobuybtc.xyz/1.0' },
    });
    const rows = (d.data || []).map((x: any) => ({ ts: Number(x.timestamp) * 1000, value: Math.round(x.value), cls: x.value_classification }));
    if (rows.length > 30) return rows;
  } catch (e: any) { console.error('streak: CMC history failed:', e.message); }
  const d = await json('https://api.alternative.me/fng/?limit=500', { headers: { 'User-Agent': 'whentobuybtc.xyz/1.0' } });
  return (d.data || []).map((x: any) => ({ ts: Number(x.timestamp) * 1000, value: parseInt(x.value, 10), cls: x.value_classification }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!cache || Date.now() - cache.at > TTL) {
    try {
      const key = process.env.COINGECKO_API_KEY ? `&x_cg_pro_api_key=${process.env.COINGECKO_API_KEY}` : '';
      const [chart, fg, ath] = await Promise.all([
        json(`https://pro-api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=730&interval=daily${key}`, { headers: { 'User-Agent': 'whentobuybtc.xyz/1.0' } }),
        fgHistory(),
        json(`${BASE}/api/ath`).catch(() => null),
      ]);
      const days = dailyStates(chart.prices, fg, ath?.ath_eur ? { eur: ath.ath_eur, date: ath.ath_date } : null);
      if (days.length) cache = { days, at: Date.now() };
    } catch (e: any) {
      console.error('streak error:', e.message);
    }
  }
  if (!cache) return res.status(503).json({ error: 'History temporarily unavailable' });
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  return res.status(200).json({ days: cache.days });
}
