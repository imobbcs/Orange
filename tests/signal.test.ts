// Run: npx tsx --test tests/signal.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fgBand, fgScore, maScore, athScore, computeSignal, stateFromScore } from '../lib/signal';

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

test('states are symmetric around zero', () => {
  assert.equal(stateFromScore(3), 'accumulate');
  assert.equal(stateFromScore(2), 'hold');
  assert.equal(stateFromScore(-2), 'hold');
  assert.equal(stateFromScore(-3), 'caution');
  assert.equal(computeSignal({ fgValue: 50, maPct: -3, athPct: -35 }).state, 'hold');
  assert.equal(computeSignal({ fgValue: 15, maPct: -20, athPct: -55 }).state, 'accumulate');
  assert.equal(computeSignal({ fgValue: 80, maPct: 25, athPct: -2 }).state, 'caution');
});

test('the inline copy in app.html and the bot match lib/signal.ts', () => {
  const html = readFileSync('public/app.html', 'utf8');
  const m = html.match(/\/\* SIGNAL MODEL \(start\)[\s\S]*?\*\/([\s\S]*?)\/\* SIGNAL MODEL \(end\) \*\//);
  assert.ok(m, 'SIGNAL MODEL block missing from app.html');
  const bot = readFileSync('twitter-bot/bot.js', 'utf8');
  const b = bot.match(/\/\* SIGNAL MODEL \(start\)[\s\S]*?\*\/([\s\S]*?)\/\* SIGNAL MODEL \(end\) \*\//);
  assert.ok(b, 'SIGNAL MODEL block missing from bot.js');
  for (const src of [m![1], b![1]]) {
    const model = new Function(src + '; return { wtbSignal };')();
    for (const fg of [5, 24, 25, 31, 46, 47, 50, 54, 55, 62, 75, 76, 90])
      for (const ma of [-30, -10.5, -10, -6, -5, 0, 3, 5, 5.1, 15, 20, 20.1, 40])
        for (const ath of [-70, -50, -49, -30, -20, -19, -5, 0, 3]) {
          const want = computeSignal({ fgValue: fg, maPct: ma, athPct: ath });
          const got = model.wtbSignal(fg, null, ma, ath);
          assert.deepEqual(got, want, `fg ${fg} ma ${ma} ath ${ath}`);
        }
  }
});
