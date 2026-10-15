// Run: npx tsx --test tests/emails-v3.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alertEmail, digestEmail, confirmationEmail, welcomeEmail, weekStats, EMAIL_FROM } from '../lib/email-templates';
import { htmlToText } from '../lib/email-text';

const market = { price: 73315, change24h: -1.3, fgValue: 48, fgClass: 'Neutral', maPct: 7.8, athPct: -31.9 };
const all = (lang: 'en' | 'de') => [
  confirmationEmail('https://whentobuybtc.xyz/api/confirm?token=t', '#u', lang, { signal: 'hold', replyTo: 'r@x' }),
  welcomeEmail('#u', lang, { replyTo: 'r@x', market }),
  welcomeEmail('#u', lang, { replyTo: 'r@x' }),
  digestEmail({ price: 73315, signal: 'hold', fgValue: 48, fgClass: 'Neutral', maPct: 7.8, athPct: -31.9, change24h: -1.3, unsubscribeUrl: '#u', replyTo: 'r@x', lang,
    prevFgValue: 31, prevMaPct: 12, prevAthPct: -29, prevPrice: 76100, week: { high: 76400, low: 70100, bigDay: { pct: -4.1, date: '2026-10-13T00:00:00Z' } } }),
  alertEmail({ price: 69800, movePct: -0.052, direction: 'down', signal: 'hold', fgValue: 29, fgClass: 'Fear', maPct: 2.6, athPct: -35.2, change24h: -5.2, unsubscribeUrl: '#u', replyTo: 'r@x', lang, subscriberCount: 612 }),
];

test('every email has a plain-text part with the content and links, no markup', () => {
  for (const lang of ['en', 'de'] as const) for (const e of all(lang)) {
    assert.ok(e.text && e.text.length > 200, 'text part missing');
    assert.ok(!/<[a-z!/][^>]*>/i.test(e.text), 'markup left in text');
    assert.ok(!/&[a-z#0-9]+;/i.test(e.text), 'entity left in text: ' + (e.text.match(/&[a-z#0-9]+;/i) || [])[0]);
    assert.ok(/https:\/\/whentobuybtc\.xyz/.test(e.text), 'links missing from text');
  }
  assert.ok(htmlToText('<p>A &amp; B</p><a href="https://x.y/z">Go</a>').includes('A & B\nGo (https://x.y/z)'));
});

test('one disclaimer per email, in the footer', () => {
  for (const lang of ['en', 'de'] as const) for (const e of all(lang)) {
    const n = (e.html.match(/not financial advice|keine Anlageberatung/gi) || []).length;
    assert.equal(n, 1, `${lang}: ${n} disclaimers`);
  }
});

test('no text smaller than 11px', () => {
  for (const lang of ['en', 'de'] as const) for (const e of all(lang)) {
    const sizes = Array.from(e.html.matchAll(/font-size:(\d+)px/g)).map((m) => +m[1]).filter((n) => n > 1); // 1px = spacer cells
    assert.ok(Math.min(...sizes) >= 11, 'found ' + Math.min(...sizes) + 'px');
  }
});

test('sharing: WhatsApp, Telegram and X, tagged per channel; German shares land on the German page', () => {
  const [, , , d] = all('de');
  for (const ch of ['wa.me', 't.me/share', 'twitter.com/intent']) assert.ok(d.html.includes(ch), ch);
  const wa = decodeURIComponent((d.html.match(/https:\/\/wa\.me\/\?text=[^"]+/) || [''])[0]);
  assert.ok(wa.includes('lang=de&utm_source=share&utm_medium=whatsapp&utm_campaign=digest'), wa);
  assert.ok(d.html.includes('lang=de&amp;utm_source=email') || d.html.includes('lang=de&utm_source=email'), 'German CTA should open the German site');
});

test('welcome: today\'s reading when data is there, inbox tips, tools, still fine without data', () => {
  const w = welcomeEmail('#u', 'en', { market });
  assert.ok(w.subject.includes("today's reading"));
  assert.ok(w.html.includes('Mild.') && w.html.includes('€73,315'));
  assert.ok(w.html.includes('drag it to Primary') && w.html.includes('add alerts@whentobuybtc.xyz to your contacts'));
  for (const p of ['/bitcoin-fear-and-greed-index', '/bitcoin-200-day-moving-average', '/bitcoin-dca-calculator']) assert.ok(w.html.includes(p), p);
  const de = welcomeEmail('#u', 'de', { market });
  for (const p of ['/bitcoin-angst-und-gier-index', '/bitcoin-200-tage-linie', '/bitcoin-sparplan-rechner']) assert.ok(de.html.includes(p), p);
  const bare = welcomeEmail('#u', 'en', {});
  assert.ok(!bare.html.includes('Bitcoin right now') && bare.html.includes('Cold, Mild, Hot'));
});

test('digest: the week in plain words', () => {
  const [, , , d] = all('en');
  assert.ok(d.html.includes('A choppy week. Bitcoin moved between €70,100 and €76,400, a 9.0% range, and ended the week down 3.7%.'));
  assert.ok(d.html.includes('The biggest day was Tuesday, at −4.1%.'));
  assert.ok(d.html.includes('The mood rose from 31 to 48.'));
  assert.ok(d.html.includes('See you next Sunday,'));
});

test('weekStats: range and biggest day from daily points', () => {
  const now = Date.UTC(2026, 9, 18, 15);
  const pts: [number, number][] = [100, 102, 99, 104, 101, 101, 103, 110].map((p, i) => [now - (7 - i) * 86400000 - 3600000, p * 700]);
  const w = weekStats(pts, now)!;
  assert.equal(w.high, 110 * 700);
  assert.ok(Math.abs(w.bigDay!.pct - (110 - 103) / 103 * 100) < 1e-9);
  assert.equal(weekStats(pts.slice(0, 3), now), null);
});

test('alert stays short: no repeated numbers paragraph', () => {
  const a = all('en')[4];
  assert.ok(!a.html.includes('Market mood reads'), 'old explanation paragraph still present');
  assert.ok(EMAIL_FROM.startsWith('Imo from When to Buy BTC <'));
});
