// Run: npx tsx --test tests/x-bot.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const bot = require('../twitter-bot/bot.js');
const pool: (string | null)[] = JSON.parse(readFileSync('twitter-bot/tweets_final.json', 'utf8'));

const base = { signal: 'Mild', emoji: '🌤️', currentPrice: 73315, fearGreed: 48, fgLabel: 'Neutral', maPct: 7.8, athPct: -31.9, change24h: -1.3,
  state: 'hold', parts: { fg: 0, ma: -1, ath: 0 } };
const ADVICE = /\b(buy now|buy more|time to buy|buy the dip|sell now|don.t sell|accumulate now|kauf jetzt|jetzt kaufen|nachkaufen)\b/i;

test('daily post: temperature, one sentence, four numbers, under 280, no dashes or advice', () => {
  const t = bot.buildSignalPost(base);
  assert.equal(t, `$BTC today: Mild 🌤️

€73,315 (−1.3% in 24h)
Mood: 48, neutral
vs 200-day average: +7.8%
From the all-time high: −31.9%

No reading is at an extreme, so the market reads mild.`);
  for (const s of [base,
    { ...base, signal: 'Cold', state: 'accumulate', parts: { fg: 2, ma: 2, ath: 1 } },
    { ...base, signal: 'Hot', state: 'caution', parts: { fg: -2, ma: -2, ath: -1 } },
    { ...base, athPct: 0.4 }, { ...base, change24h: -7.2 }, { ...base, change24h: 6.1 }, { ...base, change24h: null }]) {
    const p = bot.buildSignalPost(s);
    assert.ok(p.length <= 280, 'too long');
    assert.ok(!/[—–]/.test(p) && !ADVICE.test(p), p);
  }
  assert.ok(bot.buildSignalPost({ ...base, athPct: 0.4 }).includes('new all-time high'));
  assert.ok(bot.buildSignalPost({ ...base, change24h: -7.2 }).includes('A 7.2% drop in a day'));
  assert.ok(bot.buildSignalPost({ ...base, parts: { fg: 1, ma: -1, ath: 0 } }).includes('pull in different directions'));
  assert.ok(bot.buildSignalReply(base).includes('https://whentobuybtc.xyz/?utm_source=x&utm_medium=social&utm_campaign=daily'));
});

test('tweet pool: stable indices, clean, independent, no advice', () => {
  assert.equal(pool.length, 445, 'never delete entries: btc_tweet_log stores indices; retire with null');
  const live = pool.filter((t): t is string => typeof t === 'string');
  assert.ok(live.length >= 400);
  for (const t of live) {
    assert.ok(t.length <= 280, 'too long: ' + t.slice(0, 40));
    assert.ok(!/[—–]/.test(t), 'dash: ' + t.slice(0, 40));
    assert.ok(!/relai|trezor|bitpanda/i.test(t), 'brand: ' + t.slice(0, 40));
    assert.ok(!ADVICE.test(t), 'advice: ' + t.slice(0, 60));
    assert.ok(!/40% of all US dollars|Vierzig Prozent aller/i.test(t), 'myth: ' + t.slice(0, 40));
  }
});
