// GET /api/macro: wider-market context for Bitcoin (US-first, EUR as secondary).
//
// Fail-soft by design: every source is fetched independently, any field can be null,
// a failed field falls back to its last good value, and the endpoint only returns 503
// when nothing at all is available. Used by the site's "Wider market" line and (behind MACRO_CONTEXT) the emails.

import type { NextApiRequest, NextApiResponse } from 'next';
import { buildMacro, mergeWithPrevious, MacroResponse } from '../../lib/macro/build';

const TTL = 15 * 60 * 1000; // 15 min; equities/FX are daily, BTC 24h drift is fine at this cadence
let cache: { data: MacroResponse; at: number } | null = null;
let inflight: Promise<MacroResponse> | null = null;

const CACHE_HEADER = 'public, s-maxage=900, stale-while-revalidate=1800';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (cache && Date.now() - cache.at < TTL) {
    res.setHeader('Cache-Control', CACHE_HEADER);
    return res.status(200).json(cache.data);
  }

  try {
    // Coalesce concurrent cold-cache requests into one upstream fetch.
    inflight = inflight || buildMacro();
    const fresh = await inflight;
    if (Object.values(fresh.sources).some((s) => s === 'ok')) {
      const data = mergeWithPrevious(fresh, cache?.data ?? null);
      cache = { data, at: Date.now() };
      res.setHeader('Cache-Control', CACHE_HEADER);
      return res.status(200).json(data);
    }
  } catch (err: any) {
    console.error('macro: build failed:', err?.message || err);
  } finally {
    inflight = null;
  }

  if (cache) return res.status(200).json(cache.data); // stale, but better than nothing
  return res.status(503).json({ error: 'Macro data temporarily unavailable' });
}
