// Types for lib/signal-model.js (plain JS so the browser and the server share one copy).
export declare const WTB_BANDS: { maDeepBelow: number; maNear: number; maFarAbove: number; athDeep: number; athNear: number; move: number; scoreMax: number };
export declare function wtbFgBand(v: number, cls?: string | null): 'extreme-fear' | 'fear' | 'neutral' | 'greed' | 'extreme-greed';
export declare function wtbFgScore(v: number, cls?: string | null): number;
export declare function wtbMaScore(pct: number): number;
export declare function wtbAthScore(pct: number): number;
export declare function wtbMoveScore(change24h?: number | null): number;
export declare function wtbStateFromScore(score: number): 'accumulate' | 'hold' | 'caution';
export declare function wtbSignal(fgValue: number, fgClass: string | null, maPct: number, athPct: number, change24h?: number | null):
  { score: number; state: 'accumulate' | 'hold' | 'caution'; parts: { fg: number; ma: number; ath: number; move: number } };
export declare function wtbScalePos(score: number): number;
