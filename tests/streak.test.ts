// Run: npx tsx --test tests/streak.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyStates, currentRun } from '../lib/streak';
import { computeSignal } from '../lib/signal';

const DAY = 86400000;
const start = Date.UTC(2025, 0, 1);
// 400 days: flat at 100k for 300 days, then a slide to 60k (a fearful drawdown)
const prices: [number, number][] = Array.from({ length: 400 }, (_, i) => [start + i * DAY, i < 300 ? 100000 : 100000 - (i - 299) * 400]);
const fg = prices.map(([ts], i) => ({ ts, value: i < 300 ? 50 : 18, cls: null }));
const today = new Date(start + 400 * DAY).toISOString().slice(0, 10);

test('rebuilds each past day with the live model', () => {
  const h = dailyStates(prices, fg, null, 180, today);
  assert.equal(h.length, 180);
  assert.equal(h[h.length - 1].d, new Date(start + 399 * DAY).toISOString().slice(0, 10));
  // Day 399: price 60k, 200-day avg well above, 40% below the 100k peak, extreme fear
  const ma = prices.slice(200, 400).reduce((a, p) => a + p[1], 0) / 200;
  const want = computeSignal({ fgValue: 18, maPct: (60000 - ma) / ma * 100, athPct: -40, change24h: (60000 / 60400 - 1) * 100 }).state;
  assert.equal(h[h.length - 1].s, want);
  assert.equal(h[0].s, 'hold'); // flat, neutral mood
});

test('a known all-time high above the window counts from its date', () => {
  const athDate = new Date(start + 350 * DAY).toISOString();
  const h = dailyStates(prices, fg, { eur: 200000, date: athDate }, 180, today);
  const before = h.find((x) => x.d === new Date(start + 340 * DAY).toISOString().slice(0, 10))!;
  const after = h.find((x) => x.d === new Date(start + 360 * DAY).toISOString().slice(0, 10))!;
  assert.ok(before && after);
  assert.equal(after.s, 'accumulate'); // 60–70% below a 200k high: deep discount + fear
});

test('days without Fear & Greed data are skipped, not guessed', () => {
  const gap = fg.filter((_, i) => i !== 390);
  const h = dailyStates(prices, gap, null, 180, today);
  assert.equal(h.length, 179);
});

test('the run counts back from the live state', () => {
  const h = [{ d: '2026-10-30', s: 'caution' }, { d: '2026-10-31', s: 'hold' }, { d: '2026-11-01', s: 'hold' }] as const;
  assert.deepEqual(currentRun([...h], 'hold'), { since: '2026-10-31', pastDays: 2, capped: false });
  assert.deepEqual(currentRun([...h], 'accumulate'), { since: null, pastDays: 0, capped: false });
  assert.deepEqual(currentRun([{ d: '2026-11-01', s: 'hold' }], 'hold'), { since: '2026-11-01', pastDays: 1, capped: true });
});
