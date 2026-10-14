// Run: npx tsx --test tests/macro-email.test.ts
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { macroMode, includeMacroFor, getMacroForEmail, macroAlertBlock, macroDigestBlock } from '../lib/macro/email';
import { alertEmail, digestEmail } from '../lib/email-templates';
import type { MacroResponse } from '../lib/macro/build';

const s = (value: number, change1d: number, change7d: number, date = '2026-10-13', stale = false) =>
  ({ value, date, change1d, change7d, change30d: 1, stale });

const LIVE: MacroResponse = {
  asOf: '2026-10-14T17:45:00Z', status: 'open', lastUsClose: '2026-10-13',
  btc: { price: 81734, change24h: -5.2, change30d: 6.4 },
  markets: {
    spx: s(7805.45, -2.1, -1.2), ndx: s(27204.38, -2.9, -2.4), us10y: s(5.24, 6, 12, '2026-10-09', true),
    dxy: s(102.225, 0.52, 0.9, '2026-10-14'), gold: s(4095.56, 1.1, -0.4, '2026-10-14'), eurusd: s(1.1195, 0.06, -0.3, '2026-10-14'),
  },
  correlation30d: 0.67,
  context: { key: 'withMarketDown', en: 'Broad risk-off. Bitcoin is falling together with US stocks.', de: 'Breiter Risk-off. Bitcoin fällt gemeinsam mit US-Aktien.',
    dollar: { en: 'The US dollar is stronger.', de: 'Der US-Dollar ist stärker.' } },
  sources: {},
};

beforeEach(() => { delete process.env.MACRO_CONTEXT; delete process.env.MACRO_CONTEXT_TEST_EMAIL; });

// ── Rollout switch ───────────────────────────────────────────────────
test('mode: default off; unknown values fall back to off', () => {
  assert.equal(macroMode(), 'off');
  process.env.MACRO_CONTEXT = 'yes please'; assert.equal(macroMode(), 'off');
  process.env.MACRO_CONTEXT = ' ON '; assert.equal(macroMode(), 'on');
  process.env.MACRO_CONTEXT = 'Test'; assert.equal(macroMode(), 'test');
});

test('includeMacroFor: off → nobody, test → only test address (case-insensitive), on → everyone', () => {
  assert.equal(includeMacroFor('a@b.c'), false);
  process.env.MACRO_CONTEXT = 'test';
  assert.equal(includeMacroFor('hello@imobabics.com'), false); // test mode without address → nobody
  process.env.MACRO_CONTEXT_TEST_EMAIL = 'Hello@ImoBabics.com';
  assert.equal(includeMacroFor('hello@imobabics.com'), true);
  assert.equal(includeMacroFor('someone@else.com'), false);
  process.env.MACRO_CONTEXT = 'on';
  assert.equal(includeMacroFor('someone@else.com'), true);
});

test('getMacroForEmail: off → null with ZERO network calls', async () => {
  let calls = 0;
  const orig = globalThis.fetch;
  (globalThis as any).fetch = async () => { calls++; throw new Error('should not be called'); };
  try {
    assert.equal(await getMacroForEmail(), null);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = orig; }
});

test('getMacroForEmail: every source failing → null (email sends unchanged)', async () => {
  process.env.MACRO_CONTEXT = 'on';
  const orig = globalThis.fetch;
  (globalThis as any).fetch = async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => '' });
  try { assert.equal(await getMacroForEmail(), null); } finally { globalThis.fetch = orig; }
});

test('getMacroForEmail: slow upstream → null after timeout, does not hang the send', async () => {
  process.env.MACRO_CONTEXT = 'on';
  const orig = globalThis.fetch;
  (globalThis as any).fetch = () => new Promise(() => {}); // never resolves
  const t0 = Date.now();
  try { assert.equal(await getMacroForEmail(false, 200), null); } finally { globalThis.fetch = orig; }
  assert.ok(Date.now() - t0 < 1500);
});

// ── Rendering ────────────────────────────────────────────────────────
test('alert block EN: label, session date, sentence, dollar note, all five markets', () => {
  const h = macroAlertBlock(LIVE, 'en');
  for (const x of ['Market context', 'last US session, Tue 13 Oct', 'Broad risk-off', 'The US dollar is stronger.', 'Nasdaq', 'S&P 500', 'US Dollar', 'US 10Y yield', 'Gold', '+6bp', '&#8722;2.90%'])
    assert.ok(h.includes(x), 'missing: ' + x);
  assert.ok(!h.includes('BTC'), 'BTC move is already in the email in EUR; block must not repeat it in USD');
});

test('alert block DE: German labels and number format', () => {
  const h = macroAlertBlock(LIVE, 'de');
  for (const x of ['Marktumfeld', 'letzte US-Sitzung', 'Breiter Risk-off', 'US 10J Rendite', '&#8722;2,90%'])
    assert.ok(h.includes(x), 'missing: ' + x);
});

test('alert block: no context sentence → numbers only; no markets → empty string', () => {
  const noCtx = macroAlertBlock({ ...LIVE, context: null }, 'en');
  assert.ok(noCtx.includes('Nasdaq') && !noCtx.includes('risk-off'));
  const empty = { ...LIVE, markets: { spx: null, ndx: null, us10y: null, dxy: null, gold: null, eurusd: null } };
  assert.equal(macroAlertBlock(empty, 'en'), '');
  assert.equal(macroDigestBlock(empty, 'en'), '');
});

test('digest block: 1W changes, stale date note, correlation in plain words', () => {
  const h = macroDigestBlock(LIVE, 'en');
  for (const x of ['Wider market this week', '1W', '&#8722;2.40%', '(as of Fri 9 Oct)', 'closely with US tech stocks', '0.67 (strong)'])
    assert.ok(h.includes(x), 'missing: ' + x);
  assert.ok(macroDigestBlock({ ...LIVE, correlation30d: 0.1 }, 'en').includes('largely on its own'));
  assert.ok(macroDigestBlock({ ...LIVE, correlation30d: 0.3 }, 'de').includes('teilweise'));
});

test('blocks: no em dashes (voice rule)', () => {
  for (const l of ['en', 'de'] as const)
    for (const h of [macroAlertBlock(LIVE, l), macroDigestBlock(LIVE, l)])
      assert.ok(!h.includes('—') && !h.includes('&#8212;'));
});

// ── Template wiring ──────────────────────────────────────────────────
const alertBase = { price: 73315, movePct: -0.052, direction: 'down' as const, signal: 'hold' as const, fgValue: 31, maPct: -4.2, change24h: -5.2,
  unsubscribeUrl: 'https://x/u', replyTo: 'r@x', lang: 'en' as const, subscriberCount: 612, subscriberGoal: 1000 };
const digestBase = { price: 73315, signal: 'hold' as const, fgValue: 31, maPct: -4.2, athPct: -35.1, change24h: -1.3,
  unsubscribeUrl: 'https://x/u', replyTo: 'r@x', lang: 'en' as const, subscriberCount: 612, subscriberGoal: 1000 };

test('templates: undefined or empty block → identical HTML; block → inserted right before the disclaimer', () => {
  const a0 = alertEmail(alertBase).html;
  assert.equal(alertEmail({ ...alertBase, marketBlock: undefined }).html, a0);
  assert.equal(alertEmail({ ...alertBase, marketBlock: '' }).html, a0);
  const a1 = alertEmail({ ...alertBase, marketBlock: '<!--MB-->' }).html;
  assert.ok(a1.indexOf('<!--MB-->') > 0 && a1.indexOf('<!--MB-->') < a1.indexOf('not financial advice'));

  const d0 = digestEmail(digestBase).html;
  assert.equal(digestEmail({ ...digestBase, marketBlock: '' }).html, d0);
  const d1 = digestEmail({ ...digestBase, marketBlock: '<!--MB-->' }).html;
  assert.ok(d1.indexOf('<!--MB-->') > 0 && d1.indexOf('<!--MB-->') < d1.indexOf('not financial advice'));
});
