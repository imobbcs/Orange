// Run: npx tsx --test tests/dca.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { computeDca, monthlyAverages } from '../lib/dca';

test('monthly averages: calendar months, from 2015', () => {
  const d = (s: string) => Date.parse(s + 'T00:00:00Z');
  const m = monthlyAverages([[d('2014-12-31'), 1], [d('2015-01-01'), 100], [d('2015-01-31'), 300], [d('2015-02-01'), 50], [d('2015-02-02'), 0]]);
  assert.deepEqual(m, { '2015-01': 200, '2015-02': 50 });
});

test('dca: hand-checked example', () => {
  // €100/month for 3 months at 100, 50, 200; price today 400
  const r = computeDca({ '2019-12': 1, '2020-01': 100, '2020-02': 50, '2020-03': 200 }, 100, 2020, 400);
  assert.equal(r.months, 3);
  assert.equal(r.put, 300);
  assert.ok(Math.abs(r.btc - 3.5) < 1e-12);        // 1 + 2 + 0.5
  assert.equal(r.now, 1400);
  assert.ok(Math.abs(r.multiple - 1400 / 300) < 1e-12);
  // values by month: 100, 100 (2 btc × 50), 700; never below a previous high → no drawdown
  assert.equal(r.worst, null);
  assert.equal(r.underwater, 1);                    // Feb: worth 100, put in 200
  assert.equal(r.series.at(-1)!.m, 'now');
});

test('dca: worst drop and recovery', () => {
  const r = computeDca({ '2021-01': 100, '2021-02': 200, '2021-03': 50, '2021-04': 60, '2021-05': 300 }, 100, 2021, 300);
  // values: 100, 300, 175, 310, then higher
  const btcs = [1, 1.5, 3.5, 3.5 + 100 / 60, 3.5 + 100 / 60 + 1 / 3];
  assert.ok(Math.abs(r.btc - btcs[4]) < 1e-12);
  // Feb value = 1.5×200 = 300 (peak); Mar value = 3.5×50 = 175 → −41.7%
  assert.equal(r.worst!.from, '2021-02');
  assert.equal(r.worst!.to, '2021-03');
  assert.ok(Math.abs(r.worst!.pct - (175 - 300) / 300) < 1e-12);
  assert.equal(r.worst!.recovered, '2021-04');      // Apr: (3.5 + 100/60) × 60 = 310, back above 300
});

test('the inline copy in app.html matches lib/dca.ts', () => {
  const html = readFileSync('public/app.html', 'utf8');
  const m = html.match(/\/\* DCA MODEL \(start\)[\s\S]*?\*\/([\s\S]*?)\/\* DCA MODEL \(end\) \*\//);
  assert.ok(m, 'DCA MODEL block missing from app.html');
  const wtbDca = new Function(m![1] + '; return wtbDca;')();
  const monthly: Record<string, number> = {}; let p = 250;
  for (let y = 2015; y <= 2026; y++) for (let mo = 1; mo <= 12; mo++) { p *= 1 + Math.sin(y * 7 + mo) * 0.2 + 0.03; monthly[`${y}-${String(mo).padStart(2, '0')}`] = Math.round(p); }
  for (const amt of [1, 15, 50, 333, 5000]) for (const y of [2015, 2017, 2018, 2021, 2024, 2026]) for (const now of [1000, 60000, 90000])
    assert.deepEqual(wtbDca(monthly, amt, y, now), JSON.parse(JSON.stringify(computeDca(monthly, amt, y, now))));
});
