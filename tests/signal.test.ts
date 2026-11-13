// Run: npx tsx --test tests/signal.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { buildHomeHtml } from '../lib/home-html';
import { fgBand, fgScore, maScore, athScore, moveScore, scalePos, computeSignal, stateFromScore } from '../lib/signal';

test('fear & greed: the middle is neutral, and the publisher label wins', () => {
  assert.equal(fgScore(50), 0);           // the bug: 50 used to count as greed
  assert.equal(fgScore(49), 0);
  assert.equal(fgScore(31), 1);
  assert.equal(fgScore(15), 2);
  assert.equal(fgScore(62), -1);
  assert.equal(fgScore(85), -2);
  assert.equal(fgBand(45, 'Neutral'), 'neutral'); // label from the source beats our numeric band
  assert.equal(fgBand(45, 'Fear'), 'fear');
  assert.equal(fgBand(45, ''), 'fear');
});

test('200-day average: within ±5% is "at the average"', () => {
  assert.equal(maScore(1), 0);            // the bug: +1% used to count as hot
  assert.equal(maScore(-1), 0);
  assert.equal(maScore(5), 0);
  assert.equal(maScore(-7), 1);
  assert.equal(maScore(-15), 2);
  assert.equal(maScore(12), -1);
  assert.equal(maScore(30), -2);
});

test('distance from the high', () => {
  assert.equal(athScore(-60), 1);
  assert.equal(athScore(-35), 0);
  assert.equal(athScore(-10), -1);
  assert.equal(athScore(2), -1);
});

test('a sharp day tips the temperature one step', () => {
  assert.equal(moveScore(-7.09), 1);
  assert.equal(moveScore(-5), 1);
  assert.equal(moveScore(-4.9), 0);
  assert.equal(moveScore(4.9), 0);
  assert.equal(moveScore(5), -1);
  assert.equal(moveScore(null), 0);
  assert.equal(moveScore(undefined), 0);
  // 13 Nov 2026: F&G 19, 3.3% below the 200-day average, 42.8% below the peak, −7.09% in 24h
  assert.equal(computeSignal({ fgValue: 19, maPct: -3.3, athPct: -42.8 }).state, 'hold');
  assert.equal(computeSignal({ fgValue: 19, maPct: -3.3, athPct: -42.8, change24h: -7.09 }).state, 'accumulate');
  assert.equal(computeSignal({ fgValue: 70, maPct: 12, athPct: -30, change24h: 6 }).state, 'caution');
});

test('the scale marker always sits in the zone its state names', () => {
  for (let s = -6; s <= 6; s++) {
    const p = scalePos(s), st = stateFromScore(s);
    if (st === 'accumulate') assert.ok(p > 0 && p < 1 / 3, `score ${s} at ${p}`);
    else if (st === 'hold') assert.ok(p > 1 / 3 && p < 2 / 3, `score ${s} at ${p}`);
    else assert.ok(p > 2 / 3 && p < 1, `score ${s} at ${p}`);
    if (s < 6) assert.ok(scalePos(s + 1) < p, 'colder sits further left');
  }
  assert.equal(scalePos(0), 0.5);
  assert.equal(scalePos(99), scalePos(6));
});

test('states are symmetric around zero', () => {
  assert.equal(stateFromScore(3), 'accumulate');
  assert.equal(stateFromScore(2), 'hold');
  assert.equal(stateFromScore(-2), 'hold');
  assert.equal(stateFromScore(-3), 'caution');
  assert.equal(computeSignal({ fgValue: 50, maPct: -3, athPct: -35 }).state, 'hold');
  assert.equal(computeSignal({ fgValue: 15, maPct: -20, athPct: -55 }).state, 'accumulate');
  assert.equal(computeSignal({ fgValue: 80, maPct: 25, athPct: -2 }).state, 'caution');
});

test('the homepage runs the same model file as the server', () => {
  const raw = readFileSync('public/app.html', 'utf8');
  const page = buildHomeHtml(raw);
  const m = page.match(/\/\* SIGNAL MODEL \(start\)[\s\S]*?\*\/([\s\S]*?)\/\* SIGNAL MODEL \(end\) \*\//);
  assert.ok(m, 'SIGNAL MODEL block missing from the served homepage');
  assert.ok(m![1].includes(readFileSync('lib/signal-model.js', 'utf8').trim()), 'served page does not carry lib/signal-model.js');
  // Evaluated the way the browser does (no module object), it gives the same answers as the server.
  const model = new Function(m![1] + '; return { wtbSignal, wtbScalePos };')();
  for (let sc = -7; sc <= 7; sc++) assert.equal(model.wtbScalePos(sc), scalePos(sc), `scale ${sc}`);
  for (const fg of [5, 24, 25, 47, 50, 55, 76, 90])
    for (const ma of [-30, -10, -5, 0, 5.1, 20.1])
      for (const ath of [-70, -50, -30, -19, 3])
        for (const ch of [null, -12, -5, 0, 5])
          assert.deepEqual(model.wtbSignal(fg, null, ma, ath, ch), computeSignal({ fgValue: fg, maPct: ma, athPct: ath, change24h: ch }));
  // Nothing else in the repo carries its own copy of the rules.
  assert.ok(!/function wtbSignal/.test(raw), 'app.html has its own copy again');
  assert.ok(!/function wtbSignal/.test(readFileSync('twitter-bot/bot.js', 'utf8')), 'bot.js has its own copy again');
});
