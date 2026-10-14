// Run: npx tsx --test tests/temperature-names.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { alertEmail, digestEmail } from '../lib/email-templates';

const OLD = [/buying zone/i, /kaufzone/i, /patience zone/i, /geduldzone/i, /watch and wait/i, /\babwarten\b/i, /Akkumulieren/, /market zone/i, /Marktzone/];
const ADVICE = [/pace new buys/i, /add extra/i, /add-more/i, /buying signal/i, /buy signals?\b/i, /Kaufsignal/i, /entry point/i, /Einstiegschance|Einstiegsniveau|ein Einstiegspunkt/i, /drosseln/i, /kürzerzutreten/i, /patience over/i, /Geduld statt/i, /Nachkaufen/i, /most Bitcoiners are buying/i, /kaufen genau jetzt/i, /time to act/i];

const sources = {
  site: readFileSync('public/app.html', 'utf8'),
  dePage: readFileSync('pages/wann-bitcoin-kaufen.tsx', 'utf8'),
  bot: readFileSync('twitter-bot/bot.js', 'utf8'),
  llms: readFileSync('public/llms.txt', 'utf8'),
};

test('no old state names or advice wording on site, DE page, X bot, llms.txt', () => {
  for (const [name, txt] of Object.entries(sources)) {
    for (const r of [...OLD, ...ADVICE]) assert.ok(!r.test(txt), `${name}: ${r}`);
  }
});

test('site: both languages define Cold/Mild/Hot and the plain metric labels', () => {
  const s = sources.site;
  assert.ok(s.includes('stateName: {"accumulate": "Cold", "hold": "Mild", "caution": "Hot"}'));
  assert.ok(s.includes('stateName: {"accumulate": "Kalt", "hold": "Mild", "caution": "Heiß"}'));
  for (const k of ['miMood', 'miTrend', 'miPeak']) assert.equal((s.match(new RegExp(`\\b${k}: `, 'g')) || []).length, 2, k);
});

test('site: footer uses the real score (all 3 indicators), not its own 2-indicator copy', () => {
  const s = sources.site;
  assert.ok(s.includes('window._signalScore = score;'));
  assert.ok(!s.includes("score >= 2 ? 'ACCUMULATE'"));
});

test('emails: every state name renders, both languages, subjects use plain words', () => {
  const names = { accumulate: ['Cold', 'Kalt'], hold: ['Mild', 'Mild'], caution: ['Hot', 'Heiß'] } as const;
  for (const signal of ['accumulate', 'hold', 'caution'] as const) {
    (['en', 'de'] as const).forEach((lang, i) => {
      const a = alertEmail({ price: 1, movePct: -0.05, direction: 'down', signal, fgValue: 31, maPct: 1, change24h: -5, unsubscribeUrl: '#', replyTo: '', lang });
      assert.ok(a.subject.endsWith(names[signal][i]), a.subject);
      const d = digestEmail({ price: 1, signal, fgValue: 31, maPct: 1, athPct: -3, change24h: 1, unsubscribeUrl: '#', replyTo: '', lang, prevFgValue: 40 });
      assert.ok(d.subject.includes(names[signal][i]) && !d.subject.includes('F&G'), d.subject);
      for (const r of [...OLD, ...ADVICE]) { assert.ok(!r.test(a.html + a.subject), `alert ${lang} ${signal}: ${r}`); assert.ok(!r.test(d.html + d.subject), `digest ${lang} ${signal}: ${r}`); }
    });
  }
});
