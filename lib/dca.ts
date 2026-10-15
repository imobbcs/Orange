// The "What if?" calculator: buy a fixed amount of Bitcoin every month at that month's
// average price, from January of the start year until today.
//
// public/app.html carries an inline copy (between the DCA MODEL markers);
// tests/dca.test.ts checks the two give the same results.

export type Monthly = Record<string, number>;

export function monthlyAverages(prices: [number, number][], firstMonth = '2015-01'): Monthly {
  const byMonth: Record<string, { sum: number; n: number }> = {};
  for (const [ts, price] of prices) {
    if (!(price > 0)) continue;
    const d = new Date(ts);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (key < firstMonth) continue;
    const m = byMonth[key] || (byMonth[key] = { sum: 0, n: 0 });
    m.sum += price; m.n += 1;
  }
  const out: Monthly = {};
  for (const k of Object.keys(byMonth).sort()) out[k] = Math.round(byMonth[k].sum / byMonth[k].n);
  return out;
}

export interface DcaPoint { m: string; put: number; value: number }
export type Frequency = 'monthly' | 'weekly';

export interface DcaResult {
  months: number; buys: number; put: number; btc: number; now: number; multiple: number;
  worst: { pct: number; from: string; to: string; recovered: string | null } | null;
  underwater: number; // months in which the pot was worth less than what had gone in
  series: DcaPoint[];
}

/** Buy dates: monthly = once per month that has a price; weekly = every 7 days from 1 Jan of the
 *  start year up to `now`, each priced at its month's average (the history is monthly). */
function buysPerMonth(monthly: Monthly, startYear: number, frequency: Frequency, now: Date): [string, number][] {
  const keys = Object.keys(monthly).filter(k => +k.slice(0, 4) >= startYear && monthly[k] > 0).sort();
  if (frequency === 'monthly') return keys.map(k => [k, 1] as [string, number]);
  const count: Record<string, number> = {};
  for (let t = Date.UTC(startYear, 0, 1); t <= now.getTime(); t += 7 * 86400000) {
    const d = new Date(t);
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (monthly[k] > 0) count[k] = (count[k] || 0) + 1;
  }
  return keys.filter(k => count[k]).map(k => [k, count[k]] as [string, number]);
}

export function computeDca(monthly: Monthly, amount: number, startYear: number, priceNow: number, frequency: Frequency = 'monthly', now: Date = new Date()): DcaResult {
  const plan = buysPerMonth(monthly, startYear, frequency, now);
  let btc = 0, put = 0, buys = 0, peak = 0, peakM = '', underwater = 0;
  let worst: DcaResult['worst'] = null, worstPeak = 0;
  const series: DcaPoint[] = [];
  for (const [k, n] of plan) {
    btc += n * amount / monthly[k];
    put += n * amount;
    buys += n;
    const value = btc * monthly[k];
    series.push({ m: k, put, value });
    if (value < put) underwater++;
    if (worst && !worst.recovered && value >= worstPeak) worst.recovered = k;
    if (value > peak) { peak = value; peakM = k; }
    const dd = (value - peak) / peak;
    if (dd < (worst ? worst.pct : 0)) {
      if (!worst || worst.from !== peakM) worstPeak = peak;
      worst = { pct: dd, from: peakM, to: k, recovered: null };
    }
  }
  const nowValue = btc * priceNow;
  if (worst && !worst.recovered && nowValue >= worstPeak) worst.recovered = 'now';
  if (series.length) series.push({ m: 'now', put, value: nowValue });
  return { months: plan.length, buys, put, btc, now: nowValue, multiple: put ? nowValue / put : 0, worst, underwater, series };
}
