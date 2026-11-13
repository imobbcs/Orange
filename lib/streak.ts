// "Mild since 2 Nov": how long the market has had today's temperature.
// Rebuilt from history instead of logged, so it is right from day one and needs no table:
// for each past day, the same four inputs the live reading uses (lib/signal.ts) are taken from
// that day's close, its 200-day average, the all-time high up to that day, that day's Fear & Greed
// and the close-to-close move.
import { computeSignal, type SignalState } from './signal';

export interface FgDay { ts: number; value: number; cls?: string | null }
export interface DayState { d: string; s: SignalState }

const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

/** Daily states for the last `window` full days before today (oldest first). Days without data are left out. */
export function dailyStates(prices: [number, number][], fg: FgDay[], ath: { eur: number; date: string } | null, window = 180, today = dayKey(Date.now())): DayState[] {
  const byDay = new Map<string, [number, number]>();
  for (const p of prices) if (p[1] > 0) byDay.set(dayKey(p[0]), p); // one point per UTC day (last wins)
  const days = Array.from(byDay.values()).sort((a, b) => a[0] - b[0]).filter((p) => dayKey(p[0]) < today);
  const fgByDay = new Map(fg.map((f) => [dayKey(f.ts), f]));
  const athTs = ath ? Date.parse(ath.date) : NaN;

  const out: DayState[] = [];
  let peak = 0, sum = 0;
  for (let i = 0; i < days.length; i++) {
    const [ts, price] = days[i];
    peak = Math.max(peak, price);
    sum += price;
    if (i >= 200) sum -= days[i - 200][1];
    if (i < 199 || i < days.length - window) continue;
    const f = fgByDay.get(dayKey(ts));
    if (!f) continue;
    const top = ath && isFinite(athTs) && athTs <= ts + 86400000 ? Math.max(peak, ath.eur) : peak;
    const ma = sum / 200;
    const sig = computeSignal({
      fgValue: f.value, fgClass: f.cls ?? null,
      maPct: ((price - ma) / ma) * 100,
      athPct: ((price - top) / top) * 100,
      change24h: i > 0 ? (price / days[i - 1][1] - 1) * 100 : null,
    });
    out.push({ d: dayKey(ts), s: sig.state });
  }
  return out;
}

/** The run that ends today: full past days in a row with the same state as `live` (gaps without data are skipped). */
export function currentRun(history: DayState[], live: SignalState): { since: string | null; pastDays: number; capped: boolean } {
  let since: string | null = null, n = 0;
  for (let i = history.length - 1; i >= 0 && history[i].s === live; i--) { since = history[i].d; n++; }
  return { since, pastDays: n, capped: n > 0 && n === history.length };
}
