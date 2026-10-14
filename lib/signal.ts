// The market temperature: one source of truth for how the three readings are scored.
//
// Each reading leans cold (+), sits in the middle (0) or leans hot (−). Every reading has a
// neutral middle band, so a value in the middle of its range never counts toward either side.
// Total range −5…+5; Cold at +3 or more, Hot at −3 or less, Mild in between (symmetric).
//
// public/app.html carries an inline copy of this logic (between the SIGNAL MODEL markers);
// tests/signal.test.ts checks the two agree. twitter-bot/bot.js has a plain-JS copy too.

export type SignalState = 'accumulate' | 'hold' | 'caution';
export type FgBand = 'extreme-fear' | 'fear' | 'neutral' | 'greed' | 'extreme-greed';

// Bands follow the index publisher's own labels when we have them, so our wording never
// contradicts the label shown next to the number. Numeric fallback = Alternative.me bands.
const LABEL_TO_BAND: Record<string, FgBand> = {
  'extreme fear': 'extreme-fear', 'fear': 'fear', 'neutral': 'neutral', 'greed': 'greed', 'extreme greed': 'extreme-greed',
};
export function fgBand(value: number, classification?: string | null): FgBand {
  const byLabel = classification ? LABEL_TO_BAND[String(classification).trim().toLowerCase()] : undefined;
  if (byLabel) return byLabel;
  return value < 25 ? 'extreme-fear' : value < 47 ? 'fear' : value < 55 ? 'neutral' : value < 76 ? 'greed' : 'extreme-greed';
}
const FG_SCORE: Record<FgBand, number> = { 'extreme-fear': 2, 'fear': 1, 'neutral': 0, 'greed': -1, 'extreme-greed': -2 };
export function fgScore(value: number, classification?: string | null): number { return FG_SCORE[fgBand(value, classification)]; }

// Price vs its 200-day average, in %. Within ±5% counts as "at the average".
export const MA_BANDS = { deepBelow: -10, near: 5, farAbove: 20 } as const;
export function maScore(pct: number): number {
  if (pct < MA_BANDS.deepBelow) return 2;
  if (pct < -MA_BANDS.near) return 1;
  if (pct <= MA_BANDS.near) return 0;
  if (pct <= MA_BANDS.farAbove) return -1;
  return -2;
}

// Distance from the all-time high, in % (0 or above = at a new high).
export const ATH_BANDS = { deep: -50, near: -20 } as const;
export function athScore(pct: number): number {
  if (pct < ATH_BANDS.deep) return 1;
  if (pct < ATH_BANDS.near) return 0;
  return -1;
}

export function stateFromScore(score: number): SignalState {
  return score >= 3 ? 'accumulate' : score <= -3 ? 'caution' : 'hold';
}

export function computeSignal(r: { fgValue: number; fgClass?: string | null; maPct: number; athPct: number }) {
  const parts = { fg: fgScore(r.fgValue, r.fgClass), ma: maScore(r.maPct), ath: athScore(r.athPct) };
  const score = parts.fg + parts.ma + parts.ath;
  return { score, state: stateFromScore(score), parts };
}

// Shared by the server routes: price (EUR), daily history (EUR), ATH (EUR), F&G → signal.
export function signalFromApis(price: number, dailyPrices: number[], athEur: number, fgValue: number, fgClass?: string | null) {
  const last = dailyPrices.slice(-200);
  const ma = last.reduce((a, b) => a + b, 0) / last.length;
  const maPct = ((price - ma) / ma) * 100;
  const athPct = ((price - athEur) / athEur) * 100;
  return { ma, maPct, athPct, ...computeSignal({ fgValue, fgClass, maPct, athPct }) };
}
