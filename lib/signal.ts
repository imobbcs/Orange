// Typed wrapper around lib/signal-model.js, the one copy of the scoring rules.
// Change the rules there; the homepage and the X bot pick them up from the same file.
// Internal state names: accumulate / hold / caution (= Cold / Mild / Hot).
import * as M from './signal-model.js';

export type SignalState = 'accumulate' | 'hold' | 'caution';
export type FgBand = 'extreme-fear' | 'fear' | 'neutral' | 'greed' | 'extreme-greed';
export interface SignalParts { fg: number; ma: number; ath: number; move: number }
export interface Signal { score: number; state: SignalState; parts: SignalParts }

const B = M.WTB_BANDS;
export const MA_BANDS = { deepBelow: B.maDeepBelow, near: B.maNear, farAbove: B.maFarAbove } as const;
export const ATH_BANDS = { deep: B.athDeep, near: B.athNear } as const;
export const MOVE_BAND: number = B.move;
export const SCORE_MAX: number = B.scoreMax;

export const fgBand = (value: number, classification?: string | null): FgBand => M.wtbFgBand(value, classification);
export const fgScore = (value: number, classification?: string | null): number => M.wtbFgScore(value, classification);
export const maScore = (pct: number): number => M.wtbMaScore(pct);
export const athScore = (pct: number): number => M.wtbAthScore(pct);
export const moveScore = (change24h?: number | null): number => M.wtbMoveScore(change24h);
export const stateFromScore = (score: number): SignalState => M.wtbStateFromScore(score);
/** Where a score sits on the Cold–Mild–Hot bar (0 = cold end, 1 = hot end). */
export const scalePos = (score: number): number => M.wtbScalePos(score);

export function computeSignal(r: { fgValue: number; fgClass?: string | null; maPct: number; athPct: number; change24h?: number | null }): Signal {
  return M.wtbSignal(r.fgValue, r.fgClass ?? null, r.maPct, r.athPct, r.change24h ?? null);
}

// Shared by the server routes: price (EUR), daily history (EUR), ATH (EUR), F&G, 24h change → signal.
export function signalFromApis(price: number, dailyPrices: number[], athEur: number, fgValue: number, fgClass?: string | null, change24h?: number | null) {
  const last = dailyPrices.slice(-200);
  const ma = last.reduce((a, b) => a + b, 0) / last.length;
  const maPct = ((price - ma) / ma) * 100;
  const athPct = ((price - athEur) / athEur) * 100;
  return { ma, maPct, athPct, ...computeSignal({ fgValue, fgClass, maPct, athPct, change24h }) };
}
