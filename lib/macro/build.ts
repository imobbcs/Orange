// Builds the macro context payload. Shared by /api/macro and (later) the alert + digest emails.

import {
  Series, MarketStatus, Context,
  summarise, ecbToSeries, btcClosesByUsDate, returnCorrelation, marketStatus, contextFor, round, isStale,
} from './compute';
import { fetchFred, fetchEcb, fetchCgDaily, fetchBtcLive, cgPointsToObs } from './sources';

export type MacroResponse = {
  asOf: string;
  status: MarketStatus;
  lastUsClose: string | null;
  btc: { price: number; change24h: number; change30d: number | null } | null;
  markets: {
    spx: Series | null;   // S&P 500
    ndx: Series | null;   // Nasdaq Composite
    us10y: Series | null; // 10Y Treasury yield, %; changes in basis points
    dxy: Series | null;   // US Dollar Index, rebuilt from ECB reference rates
    gold: Series | null;  // USD per troy ounce, via PAX Gold
    eurusd: Series | null;
  };
  correlation30d: number | null; // BTC vs Nasdaq, daily log returns
  context: Context | null;
  sources: Record<string, 'ok' | 'error'>;
};

async function settle<T>(name: string, p: Promise<T>, sources: Record<string, 'ok' | 'error'>): Promise<T | null> {
  try {
    const v = await p;
    sources[name] = 'ok';
    return v;
  } catch (err: any) {
    sources[name] = 'error';
    console.error(`macro: ${name} failed:`, err?.message || err);
    return null;
  }
}

export async function buildMacro(now = new Date()): Promise<MacroResponse> {
  const sources: Record<string, 'ok' | 'error'> = {};
  const [ndxRaw, spxRaw, us10yRaw, ecb, btcDaily, goldDaily, btcLive] = await Promise.all([
    settle('fred_nasdaq', fetchFred('NASDAQCOM'), sources),
    settle('fred_sp500', fetchFred('SP500'), sources),
    settle('fred_us10y', fetchFred('DGS10'), sources),
    settle('ecb', fetchEcb(), sources),
    settle('coingecko_btc_daily', fetchCgDaily('bitcoin'), sources),
    settle('coingecko_paxg', fetchCgDaily('pax-gold'), sources),
    settle('coingecko_btc_live', fetchBtcLive(), sources),
  ]);

  const ndx = ndxRaw ? summarise(ndxRaw) : null;
  const spx = spxRaw ? summarise(spxRaw) : null;
  const us10y = us10yRaw ? summarise(us10yRaw, 'bps') : null;
  const fx = ecb ? ecbToSeries(ecb) : null;
  const dxy = fx ? summarise(fx.dxy) : null;
  const eurusd = fx ? summarise(fx.eurusd) : null;
  const gold = goldDaily ? summarise(cgPointsToObs(goldDaily)) : null;

  const mark = (x: Series | null): Series | null => (x ? { ...x, stale: isStale(x.date, now) } : null);

  const btcSummary = btcDaily ? summarise(cgPointsToObs(btcDaily)) : null;
  const btc = btcLive
    ? { price: btcLive.usd, change24h: round(btcLive.change24h, 2), change30d: btcSummary?.change30d ?? null }
    : null;

  const correlation30d = ndxRaw && btcDaily ? returnCorrelation(ndxRaw, btcClosesByUsDate(btcDaily), 30) : null;

  const lastUsClose = ndx?.date ?? spx?.date ?? null;
  const status = marketStatus(now, lastUsClose);
  const context = contextFor({
    btc24h: btc?.change24h ?? null,
    ndx1d: ndx?.change1d ?? null,
    dxy1d: dxy?.change1d ?? null,
    status,
  });

  return {
    asOf: now.toISOString(),
    status,
    lastUsClose,
    btc,
    markets: { spx: mark(spx), ndx: mark(ndx), us10y: mark(us10y), dxy: mark(dxy), gold: mark(gold), eurusd: mark(eurusd) },
    correlation30d,
    context,
    sources,
  };
}


/** Fills fields that failed this round with the previous good value (each Series carries its own date). */
export function mergeWithPrevious(next: MacroResponse, prev: MacroResponse | null): MacroResponse {
  if (!prev) return next;
  const m = { ...next.markets };
  (Object.keys(m) as (keyof MacroResponse['markets'])[]).forEach((k) => {
    if (m[k] === null && prev.markets[k]) m[k] = prev.markets[k];
  });
  return {
    ...next,
    markets: m,
    btc: next.btc ?? prev.btc,
    correlation30d: next.correlation30d ?? prev.correlation30d,
    lastUsClose: next.lastUsClose ?? prev.lastUsClose,
  };
}
