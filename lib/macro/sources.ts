// Network layer for macro context. Every fetcher throws on failure; the API route
// isolates each one so a single broken source never takes down the others.

import { EcbDay, Obs } from './compute';

const UA = { 'User-Agent': 'whentobuybtc.xyz/1.0' };
const TIMEOUT = 8000;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// ── FRED (St. Louis Fed): US equities + 10Y yield ────────────────────
// Series: NASDAQCOM (Nasdaq Composite close), SP500 (S&P 500 close), DGS10 (10Y Treasury, %).
// Needs FRED_API_KEY (free: https://fred.stlouisfed.org/docs/api/api_key.html).

export async function fetchFred(seriesId: string, days = 75): Promise<Obs[]> {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error('FRED_API_KEY not set');
  const url =
    `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}` +
    `&api_key=${key}&file_type=json&observation_start=${isoDaysAgo(days)}`;
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`FRED ${seriesId} HTTP ${r.status}`);
  const data = await r.json();
  return parseFred(data);
}

export function parseFred(data: any): Obs[] {
  const rows = Array.isArray(data?.observations) ? data.observations : [];
  // FRED marks missing days (e.g. holidays) with value ".", which parseFloat turns into NaN.
  return rows.map((o: any) => ({ date: String(o.date), value: parseFloat(o.value) }));
}

// ── ECB reference rates: EUR/USD + inputs for the dollar index ───────
// Free, no key. Published once per TARGET business day around 16:00 CET.

const ECB_CCY = ['USD', 'JPY', 'GBP', 'CAD', 'SEK', 'CHF'];

export async function fetchEcb(days = 75): Promise<EcbDay[]> {
  const url =
    `https://data-api.ecb.europa.eu/service/data/EXR/D.${ECB_CCY.join('+')}.EUR.SP00.A` +
    `?startPeriod=${isoDaysAgo(days)}&format=csvdata&detail=dataonly`;
  const r = await fetch(url, { headers: { ...UA, Accept: 'text/csv' }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`ECB HTTP ${r.status}`);
  return parseEcbCsv(await r.text());
}

/** Minimal quote-aware CSV line splitter (ECB wraps some fields in quotes). */
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

export function parseEcbCsv(csv: string): EcbDay[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const head = splitCsv(lines[0]);
  const iCcy = head.indexOf('CURRENCY');
  const iDate = head.indexOf('TIME_PERIOD');
  const iVal = head.indexOf('OBS_VALUE');
  if (iCcy < 0 || iDate < 0 || iVal < 0) throw new Error('ECB CSV: unexpected header');
  const byDate = new Map<string, Record<string, number>>();
  for (const line of lines.slice(1)) {
    const f = splitCsv(line);
    const v = parseFloat(f[iVal]);
    if (!Number.isFinite(v)) continue;
    const date = f[iDate];
    if (!byDate.has(date)) byDate.set(date, {});
    byDate.get(date)![f[iCcy]] = v;
  }
  return Array.from(byDate.entries())
    .map(([date, rates]) => ({ date, rates }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ── CoinGecko Pro: BTC (daily + live) and gold via PAX Gold ──────────
// PAXG is a token backed 1:1 by a troy ounce of LBMA gold, so its USD price tracks spot gold
// closely and keeps us on the API we already pay for.

function cgKey(): string {
  return process.env.COINGECKO_API_KEY ? `&x_cg_pro_api_key=${process.env.COINGECKO_API_KEY}` : '';
}

export async function fetchCgDaily(coinId: string, days = 75): Promise<[number, number][]> {
  const url = `https://pro-api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily${cgKey()}`;
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`CoinGecko ${coinId} HTTP ${r.status}`);
  const data = await r.json();
  if (!Array.isArray(data?.prices)) throw new Error(`CoinGecko ${coinId}: no prices`);
  return data.prices as [number, number][];
}

export async function fetchBtcLive(): Promise<{ usd: number; change24h: number }> {
  const url = `https://pro-api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true${cgKey()}`;
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`CoinGecko price HTTP ${r.status}`);
  const data = await r.json();
  return { usd: data.bitcoin.usd, change24h: data.bitcoin.usd_24h_change };
}

/** Converts CoinGecko points to one observation per UTC day (last point of the day wins). */
export function cgPointsToObs(points: [number, number][]): Obs[] {
  const byDate = new Map<string, number>();
  for (const [ts, v] of points) byDate.set(new Date(ts).toISOString().slice(0, 10), v);
  return Array.from(byDate.entries()).map(([date, value]) => ({ date, value }));
}
