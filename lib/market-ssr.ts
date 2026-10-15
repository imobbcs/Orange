// Server-side market snapshot for the indexable data pages (fear & greed, 200-day average,
// DCA calculator). Reads the site's own cached API routes so crawlers see real numbers in the HTML.
import type { IncomingMessage } from 'http';
import { computeSignal, fgBand, type FgBand, type SignalState } from './signal';

export interface MarketSnapshot {
  price: number | null;
  change24h: number | null;
  fg: number | null;
  fgBand: FgBand | null;
  ma200: number | null;
  maPct: number | null;
  athEur: number | null;
  athDate: string | null;
  athPct: number | null;
  state: SignalState | null;
  score: number | null;
  /** Last ~165 days: [timestamp, price, 200-day average] for a small chart. */
  maSeries: [number, number, number][];
  /** Monthly average prices in EUR, "YYYY-MM" → price (only when requested). */
  monthly: Record<string, number> | null;
  updatedAt: string;
}

function baseUrl(req: IncomingMessage) {
  // Fixed base: never build server-side fetch URLs from an arbitrary Host header.
  const host = req.headers.host || '';
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)
    ? `http://${host}`
    : (process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz');
}

async function getJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export async function marketSnapshot(req: IncomingMessage, opts: { history?: boolean; monthly?: boolean } = {}): Promise<MarketSnapshot> {
  const base = baseUrl(req);
  const [fg, price, ath, hist, monthly] = await Promise.all([
    getJson(`${base}/api/fear-greed`),
    getJson(`${base}/api/price`),
    getJson(`${base}/api/ath`),
    opts.history !== false ? getJson(`${base}/api/history?timeframe=1y&currency=eur`) : Promise.resolve(null),
    opts.monthly ? getJson(`${base}/api/btc-history-monthly`) : Promise.resolve(null),
  ]);

  const s: MarketSnapshot = {
    price: price?.eur ?? null,
    change24h: typeof price?.eur_24h_change === 'number' ? price.eur_24h_change : null,
    fg: typeof fg?.value === 'number' ? fg.value : null,
    fgBand: null,
    ma200: null, maPct: null,
    athEur: ath?.ath_eur ?? null,
    athDate: ath?.ath_date ? String(ath.ath_date).slice(0, 10) : null,
    athPct: null,
    state: null, score: null,
    maSeries: [],
    monthly: monthly?.monthly ?? null,
    updatedAt: new Date().toISOString(),
  };

  if (s.fg !== null) s.fgBand = fgBand(s.fg, fg?.value_classification);
  if (s.price && s.athEur) s.athPct = ((s.price - s.athEur) / s.athEur) * 100;

  const pts: [number, number][] = Array.isArray(hist?.prices) ? hist.prices : [];
  if (pts.length >= 200 && s.price) {
    const closes = pts.map((p) => p[1]);
    const last200 = closes.slice(-200);
    s.ma200 = last200.reduce((a, b) => a + b, 0) / last200.length;
    s.maPct = ((s.price - s.ma200) / s.ma200) * 100;
    // Rolling 200-day average for every day that has 200 days behind it
    let sum = closes.slice(0, 200).reduce((a, b) => a + b, 0);
    for (let i = 199; i < closes.length; i++) {
      if (i > 199) sum += closes[i] - closes[i - 200];
      s.maSeries.push([pts[i][0], Math.round(closes[i]), Math.round(sum / 200)]);
    }
  }

  if (s.fg !== null && s.maPct !== null && s.athPct !== null) {
    const r = computeSignal({ fgValue: s.fg, fgClass: fg?.value_classification, maPct: s.maPct, athPct: s.athPct });
    s.state = r.state;
    s.score = r.score;
  }
  return s;
}

export function eur(n: number | null, lang: 'en' | 'de' = 'en', digits = 0): string {
  if (n === null || !isFinite(n)) return '–';
  const v = n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-IE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return lang === 'de' ? `${v} €` : `€${v}`;
}

export function pct(n: number | null, lang: 'en' | 'de' = 'en', signed = true): string {
  if (n === null || !isFinite(n)) return '–';
  const v = Math.abs(n).toLocaleString(lang === 'de' ? 'de-DE' : 'en-IE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const sign = signed ? (n > 0 ? '+' : n < 0 ? '−' : '') : '';
  return lang === 'de' ? `${sign}${v} %` : `${sign}${v}%`;
}

export function longDate(iso: string, lang: 'en' | 'de' = 'en'): string {
  return new Date(iso).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Vienna' });
}
