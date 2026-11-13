// GET /api/signal — today's temperature with the numbers behind it, scored by lib/signal-model.js.
// Used by the X bot (so it never carries its own copy of the rules) and ready for an embeddable widget.
import type { NextApiRequest, NextApiResponse } from 'next';
import { marketSnapshot } from '../../lib/market-ssr';
import { computeSignal } from '../../lib/signal';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');
  const m = await marketSnapshot(req, { history: true });
  if (!m.price || m.fg === null || m.maPct === null || m.athPct === null || !m.ma200 || !m.athEur) {
    return res.status(503).json({ error: 'Signal data temporarily unavailable' });
  }
  const sig = computeSignal({ fgValue: m.fg, fgClass: m.fgLabel, maPct: m.maPct, athPct: m.athPct, change24h: m.change24h });
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({
    price: m.price, change24h: m.change24h, fg: m.fg, fgLabel: m.fgLabel, ma200: m.ma200, maPct: m.maPct,
    athEur: m.athEur, athPct: m.athPct, score: sig.score, state: sig.state, parts: sig.parts, updatedAt: m.updatedAt,
  });
}
