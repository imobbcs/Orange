// Pure calculation layer for the macro context strip.
// No network, no env, no Date.now() unless passed in, so everything here is unit-testable.

import { CONTEXT_COPY, DOLLAR_COPY, ContextKey } from './context-copy';

export type Obs = { date: string; value: number }; // date = YYYY-MM-DD, ascending order

export type Series = {
  value: number;
  date: string;
  change1d: number | null;  // % (or bps for yields)
  change30d: number | null; // % (or bps for yields)
};

export type MarketStatus = 'open' | 'weekend' | 'holiday';

// ── Basic series math ────────────────────────────────────────────────

/** Sorts ascending and drops non-finite values (FRED uses "." for missing). */
export function clean(obs: Obs[]): Obs[] {
  return obs
    .filter((o) => o && typeof o.date === 'string' && Number.isFinite(o.value))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Last observation on or before `date`. */
function onOrBefore(obs: Obs[], date: string): Obs | null {
  for (let i = obs.length - 1; i >= 0; i--) if (obs[i].date <= date) return obs[i];
  return null;
}

/**
 * Summarises a series: latest value, change vs previous observation, change vs ~30 calendar days ago.
 * mode 'pct' → percent change; mode 'bps' → absolute change × 100 (for yields quoted in %).
 */
export function summarise(raw: Obs[], mode: 'pct' | 'bps' = 'pct'): Series | null {
  const obs = clean(raw);
  if (obs.length === 0) return null;
  const last = obs[obs.length - 1];
  const prev = obs.length > 1 ? obs[obs.length - 2] : null;
  const month = onOrBefore(obs, addDays(last.date, -30));
  const delta = (from: Obs | null) => {
    if (!from || from === last) return null;
    if (mode === 'bps') return round((last.value - from.value) * 100, 1);
    if (from.value === 0) return null;
    return round(((last.value - from.value) / from.value) * 100, 2);
  };
  return { value: last.value, date: last.date, change1d: delta(prev), change30d: delta(month) };
}

export function round(n: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// ── Dollar index (ICE DXY formula) from ECB EUR reference rates ─────

/** ECB quotes units of currency per 1 EUR. Keys: USD, JPY, GBP, CAD, SEK, CHF. */
export type EcbDay = { date: string; rates: Record<string, number> };

/**
 * ICE US Dollar Index formula, rebuilt from ECB cross rates.
 * DXY = 50.14348112 × EURUSD^-0.576 × USDJPY^0.136 × GBPUSD^-0.119 × USDCAD^0.091 × USDSEK^0.042 × USDCHF^0.036
 */
export function dxyFromEcb(rates: Record<string, number>): number | null {
  const usd = rates.USD, jpy = rates.JPY, gbp = rates.GBP, cad = rates.CAD, sek = rates.SEK, chf = rates.CHF;
  if (![usd, jpy, gbp, cad, sek, chf].every((v) => Number.isFinite(v) && v > 0)) return null;
  const eurusd = usd;
  const usdjpy = jpy / usd;
  const gbpusd = usd / gbp;
  const usdcad = cad / usd;
  const usdsek = sek / usd;
  const usdchf = chf / usd;
  return (
    50.14348112 *
    Math.pow(eurusd, -0.576) *
    Math.pow(usdjpy, 0.136) *
    Math.pow(gbpusd, -0.119) *
    Math.pow(usdcad, 0.091) *
    Math.pow(usdsek, 0.042) *
    Math.pow(usdchf, 0.036)
  );
}

export function ecbToSeries(days: EcbDay[]): { dxy: Obs[]; eurusd: Obs[] } {
  const dxy: Obs[] = [];
  const eurusd: Obs[] = [];
  for (const d of days) {
    const x = dxyFromEcb(d.rates);
    if (x !== null) dxy.push({ date: d.date, value: round(x, 3) });
    if (Number.isFinite(d.rates.USD)) eurusd.push({ date: d.date, value: d.rates.USD });
  }
  return { dxy, eurusd };
}

// ── BTC alignment + correlation ──────────────────────────────────────

/**
 * CoinGecko daily points are stamped 00:00 UTC. The BTC price at 00:00 UTC on D+1 is ~4h after
 * the US close on D (20:00 UTC in summer, 21:00 in winter), so it is the closest BTC "close" to
 * the equity session on D. Returns a map of equity-date → BTC price.
 */
export function btcClosesByUsDate(points: [number, number][]): Map<string, number> {
  const out = new Map<string, number>();
  for (const [ts, price] of points) {
    const d = new Date(ts);
    // Only use points within 2h of midnight UTC (skips the trailing "now" point).
    const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
    if (minutes > 120 && minutes < 1320) continue;
    // Snap to nearest midnight, then step back one day to the US session it closes.
    const snapped = new Date(Math.round(ts / 86400000) * 86400000);
    const usDate = addDays(snapped.toISOString().slice(0, 10), -1);
    out.set(usDate, price);
  }
  return out;
}

/** Pearson correlation of daily log returns over the last `n` common trading days. Null if < 20 pairs. */
export function returnCorrelation(equity: Obs[], btcByDate: Map<string, number>, n = 30): number | null {
  const eq = clean(equity).filter((o) => btcByDate.has(o.date));
  const a: number[] = [];
  const b: number[] = [];
  for (let i = 1; i < eq.length; i++) {
    const b0 = btcByDate.get(eq[i - 1].date)!;
    const b1 = btcByDate.get(eq[i].date)!;
    if (eq[i - 1].value <= 0 || b0 <= 0) continue;
    a.push(Math.log(eq[i].value / eq[i - 1].value));
    b.push(Math.log(b1 / b0));
  }
  const xs = a.slice(-n);
  const ys = b.slice(-n);
  if (xs.length < 20) return null;
  const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return round(num / Math.sqrt(dx * dy), 2);
}

// ── Market status (US equities) ──────────────────────────────────────

/** Weekday (0=Sun) and YYYY-MM-DD for `now` in America/New_York. */
function nyCalendar(now: Date): { dow: number; date: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const dows: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dow: dows[get('weekday')], date: `${get('year')}-${get('month')}-${get('day')}` };
}

/** Most recent weekday strictly before `date`. */
function prevWeekday(date: string): string {
  let d = addDays(date, -1);
  for (;;) {
    const dow = new Date(d + 'T12:00:00Z').getUTCDay();
    if (dow !== 0 && dow !== 6) return d;
    d = addDays(d, -1);
  }
}

/**
 * 'weekend' on Sat/Sun New York time. 'holiday' on a weekday when the latest equity close is older
 * than the previous weekday (exchange holiday, or data delayed). Otherwise 'open'.
 */
export function marketStatus(now: Date, lastEquityDate: string | null): MarketStatus {
  const { dow, date } = nyCalendar(now);
  if (dow === 0 || dow === 6) return 'weekend';
  if (lastEquityDate && lastEquityDate < prevWeekday(date)) return 'holiday';
  return 'open';
}

// ── Context sentence ─────────────────────────────────────────────────

export const QUIET_BTC = 1.5;   // |BTC 24h| below this → calm day
export const FLAT_EQUITY = 0.5; // |Nasdaq session| below this → stocks flat
export const DOLLAR_MOVE = 0.3; // |DXY 1d| at or above this → mention the dollar

export type Context = {
  key: ContextKey;
  en: string;
  de: string;
  dollar: { en: string; de: string } | null;
};

export function contextFor(input: {
  btc24h: number | null;
  ndx1d: number | null;
  dxy1d: number | null;
  status: MarketStatus;
}): Context | null {
  const { btc24h, ndx1d, dxy1d, status } = input;
  if (btc24h === null || !Number.isFinite(btc24h)) return null;

  let key: ContextKey;
  if (status === 'weekend') key = 'weekend';
  else if (status === 'holiday') key = 'holiday';
  else if (Math.abs(btc24h) < QUIET_BTC) key = 'quiet';
  else if (ndx1d === null || !Number.isFinite(ndx1d)) return null;
  else if (Math.abs(ndx1d) < FLAT_EQUITY) key = btc24h < 0 ? 'btcOnlyDown' : 'btcOnlyUp';
  else if (Math.sign(btc24h) === Math.sign(ndx1d)) key = btc24h < 0 ? 'withMarketDown' : 'withMarketUp';
  else key = btc24h < 0 ? 'againstMarketDown' : 'againstMarketUp';

  // Only call out the dollar when it moves the "expected" way for the BTC move
  // (stronger dollar on a BTC drop, weaker dollar on a BTC rise). Skip on calm days.
  let dollar: Context['dollar'] = null;
  if (key !== 'quiet' && dxy1d !== null && Number.isFinite(dxy1d)) {
    if (btc24h < 0 && dxy1d >= DOLLAR_MOVE) dollar = DOLLAR_COPY.stronger;
    else if (btc24h > 0 && dxy1d <= -DOLLAR_MOVE) dollar = DOLLAR_COPY.weaker;
  }

  return { key, en: CONTEXT_COPY[key].en, de: CONTEXT_COPY[key].de, dollar };
}
