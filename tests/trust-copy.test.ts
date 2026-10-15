// Run: npx tsx --test tests/trust-copy.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { alertExplanation, alertEmail, digestEmail, confirmationEmail, welcomeEmail } from '../lib/email-templates';

test('alert explanation: built from readings, never claims agreement that is not there', () => {
  // Live 14 Oct case: fear (31) but price 16% ABOVE trend → the two disagree.
  const split = alertExplanation('hold', 31, 16.2, 'en');
  assert.ok(split.includes('fear (Fear &amp; Greed 31)'));
  assert.ok(split.includes('16.2% above its 200-day average'));
  assert.ok(split.includes('point different ways'));
  assert.ok(!/same way/.test(split));

  assert.ok(alertExplanation('hold', 52, 3, 'en').includes('Neither reading is extreme')); // greed side + above trend agree
});

test('alert explanation: every state and both languages', () => {
  assert.ok(alertExplanation('hold', 62, -8, 'en').includes('point different ways')); // greed vs. below trend
  assert.ok(alertExplanation('hold', 52, -3, 'en').includes('Neither reading is extreme')); // neutral mood, at the average
  assert.ok(alertExplanation('hold', 40, -3, 'en').includes('Neither reading is extreme'));
  assert.ok(alertExplanation('accumulate', 18, -12, 'en').includes('cheaper sats'));
  assert.ok(alertExplanation('caution', 82, 25, 'en').includes('keep their regular plan'));
  const de = alertExplanation('accumulate', 18, -12.4, 'de');
  assert.ok(de.includes('extreme Angst') && de.includes('12,4&nbsp;% unter') && de.includes('günstigere Sats'));
});

const ADVICE = [/pace new buys/i, /add extra/i, /add-more/i, /time to act/i, /zum Handeln/i, /kürzerzutreten/i, /Nachkaufen/i, /drosseln/i, /patience over urgency/i];
const DASHES = [/—/, /&#8212;/, /&mdash;/];

function allEmails(): string[] {
  const out: string[] = [];
  for (const lang of ['en', 'de'] as const) {
    for (const signal of ['accumulate', 'hold', 'caution'] as const) {
      for (const change24h of [-7, -4, 4, 7]) {
        const a = alertEmail({ price: 73315, movePct: change24h / 100, direction: change24h < 0 ? 'down' : 'up', signal, fgValue: 31, maPct: 16.2, change24h,
          unsubscribeUrl: '#', replyTo: 'r@x', lang, subscriberCount: 612, subscriberGoal: 1000 });
        out.push(a.subject + a.html);
      }
      const d = digestEmail({ price: 73315, signal, fgValue: 31, maPct: 16.2, athPct: -32, change24h: -1.3, unsubscribeUrl: '#', replyTo: 'r@x', lang,
        prevFgValue: 40, prevMaPct: 12, prevAthPct: -30, subscriberCount: 612, subscriberGoal: 1000 });
      out.push(d.subject + d.html);
    }
    const c: any = confirmationEmail('https://x/confirm', '#', lang, { signal: 'hold', replyTo: 'r@x' });
    out.push(typeof c === 'string' ? c : c.subject + c.html);
  }
  return out;
}

test('emails: no em dashes and no buy/wait advice wording, all variants', () => {
  for (const h of allEmails()) {
    for (const r of DASHES) assert.ok(!r.test(h), 'em dash found');
    for (const r of ADVICE) assert.ok(!r.test(h), 'advice wording found: ' + r);
  }
});

test('emails: main buttons send subscribers to the signal, not the signup form', () => {
  const a = alertEmail({ price: 1, movePct: -0.05, direction: 'down', signal: 'hold', fgValue: 31, maPct: 1, change24h: -5, unsubscribeUrl: '#', replyTo: '', lang: 'en' });
  assert.ok(a.html.includes('utm_medium=alert&utm_campaign=cta#signal'));
  const d = digestEmail({ price: 1, signal: 'hold', fgValue: 31, maPct: 1, athPct: -3, change24h: 1, unsubscribeUrl: '#', replyTo: '', lang: 'en' });
  assert.ok(d.html.includes('utm_medium=digest&utm_campaign=cta#signal'));
});

test('site: alerts copy matches what alerts do; no "4 hours" mock; no "time to act"', () => {
  const html = readFileSync('public/app.html', 'utf8');
  for (const bad of ['in 4 hours', 'in 4 Stunden', 'the moment the signal shifts', 'wenn das Signal kippt', "time to act", 'zum Handeln aufruft', 'Never miss a', 'Verpasse keine'])
    assert.ok(!html.includes(bad), 'still present: ' + bad);
  assert.ok(html.includes('more than 3% in a day') && html.includes('mehr als 3 %'));
});

test('emails v2: welcome has no advice, digest shows the calculator card and what changed', () => {
  for (const lang of ['en', 'de'] as const) {
    const w = welcomeEmail('#', lang, { replyTo: 'r@x' });
    for (const r of [...DASHES, ...ADVICE, /tell you when to add/i, /when to add and how much/i, /wann du etwas mehr dazukaufen/i]) assert.ok(!r.test(w.subject + w.html), `welcome ${lang}: ${r}`);
  }
  const d = digestEmail({ price: 74595, signal: 'caution', fgValue: 81, maPct: 24.5, athPct: -3.2, change24h: 1, unsubscribeUrl: '#', replyTo: '', lang: 'en',
    prevFgValue: 50, prevMaPct: -1.8, prevAthPct: -29.6, prevPrice: 72000, calc: { amount: 50, startYear: 2019, put: 4700, now: 20693 } });
  assert.ok(d.html.includes('€20,693') && d.html.includes('€4,700') && d.html.includes('#whatif'));
  assert.ok(d.html.includes('last Sunday it read <b>Mild</b>, now it reads <b>Hot</b>'));
  assert.ok(d.html.includes('+3.6%'));                                   // week change vs last Sunday's price
  assert.ok(d.html.includes('utm_medium=forward&utm_campaign=digest'));   // forwarded-to-you strip
  const a = alertEmail({ price: 1, movePct: -0.05, direction: 'down', signal: 'hold', fgValue: 31, maPct: 1, change24h: -5, unsubscribeUrl: '#', replyTo: '', lang: 'en' });
  assert.ok(!a.html.includes('/ 1,000 readers'));                          // no count → no counter line
});
