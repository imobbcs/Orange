// Run: npx tsx --test tests/macro.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarise, dxyFromEcb, ecbToSeries, btcClosesByUsDate, returnCorrelation, marketStatus, contextFor, isStale,
} from '../lib/macro/compute';
import { parseFred, parseEcbCsv, cgPointsToObs } from '../lib/macro/sources';
import { mergeWithPrevious, MacroResponse } from '../lib/macro/build';

// ── summarise ────────────────────────────────────────────────────────
test('summarise: 1d and 30d % change, ignores NaN and unsorted input', () => {
  const s = summarise([
    { date: '2026-10-09', value: 110 },
    { date: '2026-09-09', value: 100 },
    { date: '2026-10-08', value: NaN }, // FRED "." holiday
    { date: '2026-10-07', value: 105 },
  ])!;
  assert.equal(s.date, '2026-10-09');
  assert.equal(s.value, 110);
  assert.equal(s.change1d, 4.76); // vs 10-07 (NaN day skipped)
  assert.equal(s.change30d, 10);  // vs 09-09
});

test('summarise: bps mode for yields', () => {
  const s = summarise([
    { date: '2026-09-01', value: 4.0 },
    { date: '2026-10-01', value: 4.2 },
    { date: '2026-10-02', value: 4.15 },
  ], 'bps')!;
  assert.equal(s.change1d, -5);
  assert.equal(s.change30d, 15);
});

test('summarise: empty / single point', () => {
  assert.equal(summarise([]), null);
  const s = summarise([{ date: '2026-10-01', value: 5 }])!;
  assert.equal(s.change1d, null);
  assert.equal(s.change30d, null);
});

// ── DXY ──────────────────────────────────────────────────────────────
test('dxyFromEcb: matches published DXY within 0.3', () => {
  // ECB reference rates 2 Jan 2024 (EUR base). ICE DXY closed ~102.2 that day.
  const v = dxyFromEcb({ USD: 1.0956, JPY: 155.33, GBP: 0.86655, CAD: 1.4587, SEK: 11.0915, CHF: 0.9295 })!;
  assert.ok(Math.abs(v - 102.2) < 0.3, `got ${v}`);
});

test('dxyFromEcb: missing currency → null', () => {
  assert.equal(dxyFromEcb({ USD: 1.1, JPY: 160 }), null);
});

// ── Parsers ──────────────────────────────────────────────────────────
test('parseFred: "." becomes NaN and is dropped by summarise', () => {
  const obs = parseFred({ observations: [
    { date: '2026-10-08', value: '100' }, { date: '2026-10-09', value: '.' }, { date: '2026-10-10', value: '102' },
  ] });
  assert.equal(obs.length, 3);
  assert.ok(Number.isNaN(obs[1].value));
  assert.equal(summarise(obs)!.change1d, 2);
});

test('parseFred: malformed payload → []', () => {
  assert.deepEqual(parseFred({}), []);
  assert.deepEqual(parseFred(null), []);
});

test('parseEcbCsv: groups currencies by day, handles quoted fields', () => {
  const csv = [
    'KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE,TITLE_COMPL',
    'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-10-09,1.1000,"ECB reference rate, US dollar/Euro"',
    'EXR.D.JPY.EUR.SP00.A,D,JPY,EUR,SP00,A,2026-10-09,165.00,"x, y"',
    'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-10-08,1.0900,""',
    'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-10-07,NaN,""',
  ].join('\n');
  const days = parseEcbCsv(csv);
  assert.deepEqual(days.map((d) => d.date), ['2026-10-08', '2026-10-09']);
  assert.equal(days[1].rates.USD, 1.1);
  assert.equal(days[1].rates.JPY, 165);
  const { eurusd, dxy } = ecbToSeries(days);
  assert.equal(eurusd.length, 2);
  assert.equal(dxy.length, 0); // incomplete basket → no DXY rather than a wrong one
});

test('parseEcbCsv: unexpected header throws (so the source is marked error)', () => {
  assert.throws(() => parseEcbCsv('A,B\n1,2'));
});

test('cgPointsToObs: one point per UTC day, last wins', () => {
  const day = Date.UTC(2026, 9, 9);
  const obs = cgPointsToObs([[day, 1], [day + 3600e3, 2], [day + 86400e3, 3]]);
  assert.deepEqual(obs, [{ date: '2026-10-09', value: 2 }, { date: '2026-10-10', value: 3 }]);
});

// ── BTC alignment + correlation ──────────────────────────────────────
test('btcClosesByUsDate: 00:00 UTC on D+1 maps to US session D; skips intraday "now" point', () => {
  const m = btcClosesByUsDate([
    [Date.UTC(2026, 9, 10, 0, 0), 60000],      // → 2026-10-09 session
    [Date.UTC(2026, 9, 11, 0, 3), 61000],      // small offset still snaps → 2026-10-10
    [Date.UTC(2026, 9, 11, 14, 20), 62000],    // live point, ignored
  ]);
  assert.equal(m.get('2026-10-09'), 60000);
  assert.equal(m.get('2026-10-10'), 61000);
  assert.equal(m.size, 2);
});

function series(n: number, f: (i: number) => number) {
  const eq = [];
  const btc = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const date = new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10);
    eq.push({ date, value: 100 * Math.exp(f(i)) });
    btc.set(date, 50000 * Math.exp(2 * f(i))); // BTC = 2× leveraged Nasdaq in log space
  }
  return { eq, btc };
}

test('returnCorrelation: perfectly co-moving series → 1', () => {
  const { eq, btc } = series(40, (i) => Math.sin(i) * 0.02);
  assert.equal(returnCorrelation(eq, btc), 1);
});

test('returnCorrelation: inverse → -1, too few points → null', () => {
  const { eq, btc } = series(40, (i) => Math.sin(i) * 0.02);
  const inv = new Map(Array.from(btc.entries()).map(([d, v]) => [d, 1e9 / v]));
  assert.equal(returnCorrelation(eq, inv), -1);
  const short = series(15, (i) => i * 0.01);
  assert.equal(returnCorrelation(short.eq, short.btc), null);
});

// ── Market status ────────────────────────────────────────────────────
test('marketStatus: weekend in New York time, not UTC', () => {
  // Sat 01:00 UTC is still Friday evening in New York.
  assert.equal(marketStatus(new Date('2026-10-10T01:00:00Z'), '2026-10-09'), 'open');
  assert.equal(marketStatus(new Date('2026-10-10T15:00:00Z'), '2026-10-09'), 'weekend');
  assert.equal(marketStatus(new Date('2026-10-11T15:00:00Z'), '2026-10-09'), 'weekend');
});

test('marketStatus: Monday with Friday close is normal; stale close is holiday', () => {
  assert.equal(marketStatus(new Date('2026-10-12T15:00:00Z'), '2026-10-09'), 'open');
  assert.equal(marketStatus(new Date('2026-10-14T15:00:00Z'), '2026-10-09'), 'holiday');
});

// ── Staleness ────────────────────────────────────────────────────────
test('isStale: normal lags are fresh, holiday + FRED lag is stale', () => {
  const wed = new Date('2026-10-14T17:45:00Z');
  assert.equal(isStale('2026-10-13', wed), false); // yesterday's close
  assert.equal(isStale('2026-10-12', wed), false); // one extra day of lag
  assert.equal(isStale('2026-10-09', wed), true);  // live 10Y case: Columbus Day + lag
  const sat = new Date('2026-10-17T15:00:00Z');
  assert.equal(isStale('2026-10-16', sat), false); // Friday close on a weekend
  const mon = new Date('2026-10-19T14:00:00Z');
  assert.equal(isStale('2026-10-16', mon), false); // Friday close on Monday
  assert.equal(isStale('2026-10-15', mon), false);
  assert.equal(isStale('2026-10-14', mon), true);
});

// ── Context rules ────────────────────────────────────────────────────
const ctx = (btc24h: number | null, ndx1d: number | null, dxy1d: number | null = 0, status: any = 'open') =>
  contextFor({ btc24h, ndx1d, dxy1d, status });

test('context: classification grid', () => {
  assert.equal(ctx(-6, -3)!.key, 'withMarketDown');
  assert.equal(ctx(5, 2)!.key, 'withMarketUp');
  assert.equal(ctx(-6, 0.2)!.key, 'btcOnlyDown');
  assert.equal(ctx(4, -0.4)!.key, 'btcOnlyUp');
  assert.equal(ctx(-4, 1.2)!.key, 'againstMarketDown');
  assert.equal(ctx(4, -1.2)!.key, 'againstMarketUp');
  assert.equal(ctx(1.7, -3)!.key, 'quiet'); // live 14 Oct case: -1.69% is a routine move
  assert.equal(ctx(-6, -3, 0, 'weekend')!.key, 'weekend');
  assert.equal(ctx(-6, null, 0, 'holiday')!.key, 'holiday');
});

test('context: boundaries', () => {
  assert.equal(ctx(2.5, 2)!.key, 'withMarketUp'); // 2.5 is not quiet
  assert.equal(ctx(-2.49, -2)!.key, 'quiet');
  assert.equal(ctx(-1.69, -0.15)!.key, 'quiet'); // exact live reading on 14 Oct 2026
  assert.equal(ctx(-3, -0.5)!.key, 'withMarketDown'); // 0.5 is not flat
  assert.equal(ctx(-3, -0.49)!.key, 'btcOnlyDown');
});

test('context: missing data → null rather than a guess', () => {
  assert.equal(ctx(null, -2), null);
  assert.equal(ctx(-5, null), null); // open market, no Nasdaq → no claim
  assert.equal(ctx(0.5, null)!.key, 'quiet'); // calm day needs no equity data
});

test('context: dollar note only when it moves the expected way', () => {
  assert.ok(ctx(-5, -2, 0.5)!.dollar!.en.includes('stronger'));
  assert.ok(ctx(5, 2, -0.5)!.dollar!.en.includes('weaker'));
  assert.equal(ctx(-5, -2, -0.5)!.dollar, null);
  assert.equal(ctx(-5, -2, 0.2)!.dollar, null);
  assert.equal(ctx(0.5, 0, 1)!.dollar, null); // quiet day: no extra noise
});

test('context copy: EN + DE present, no em dashes (voice rule)', () => {
  const keys = ['weekend', 'holiday', 'quiet', 'btcOnlyDown', 'btcOnlyUp', 'withMarketDown', 'withMarketUp', 'againstMarketDown', 'againstMarketUp'];
  const inputs: Record<string, [number, number, string]> = {
    weekend: [-5, 0, 'weekend'], holiday: [-5, 0, 'holiday'], quiet: [0, 0, 'open'],
    btcOnlyDown: [-5, 0, 'open'], btcOnlyUp: [5, 0, 'open'], withMarketDown: [-5, -2, 'open'],
    withMarketUp: [5, 2, 'open'], againstMarketDown: [-5, 2, 'open'], againstMarketUp: [5, -2, 'open'],
  };
  for (const k of keys) {
    const [b, n, s] = inputs[k];
    const c = ctx(b, n, 0, s)!;
    assert.equal(c.key, k);
    for (const t of [c.en, c.de]) {
      assert.ok(t.length > 10);
      assert.ok(!t.includes('—'), `em dash in: ${t}`);
    }
  }
});

// ── Merge ────────────────────────────────────────────────────────────
test('mergeWithPrevious: failed fields keep last good value, fresh fields win', () => {
  const s = (v: number) => ({ value: v, date: '2026-10-09', change1d: 0, change30d: 0 });
  const base: MacroResponse = {
    asOf: '', status: 'open', lastUsClose: '2026-10-09', btc: null, correlation30d: null, context: null, sources: {},
    markets: { spx: null, ndx: null, us10y: null, dxy: null, gold: null, eurusd: null },
  };
  const prev = { ...base, correlation30d: 0.4, markets: { ...base.markets, spx: s(1), gold: s(2) } };
  const next = { ...base, markets: { ...base.markets, spx: s(9) } };
  const m = mergeWithPrevious(next, prev);
  assert.equal(m.markets.spx!.value, 9);
  assert.equal(m.markets.gold!.value, 2);
  assert.equal(m.correlation30d, 0.4);
  assert.equal(m.markets.ndx, null);
});
