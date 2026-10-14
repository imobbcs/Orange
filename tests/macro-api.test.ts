// Run: npx tsx --test tests/macro-api.test.ts
// End-to-end test of /api/macro with all upstream APIs mocked.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const DAY = 86400000;
const today = Date.UTC(2026, 9, 14); // Wed

function fredJson(start: number, drift: number) {
  const obs = [];
  for (let i = 60; i >= 1; i--) {
    const d = new Date(today - i * DAY);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    obs.push({ date: d.toISOString().slice(0, 10), value: String(start * (1 + drift * (60 - i)) * (1 + 0.01 * Math.sin(i))) });
  }
  return { observations: obs };
}
function cgChart(start: number) {
  const prices = [];
  for (let i = 75; i >= 0; i--) prices.push([today - i * DAY, start * (1 + 0.02 * Math.sin(i))]);
  prices.push([today + 14 * 3600e3, start * 0.95]); // live point
  return { prices };
}
function ecbCsv() {
  const rows = ['KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE'];
  const r: Record<string, number> = { USD: 1.16, JPY: 176, GBP: 0.87, CAD: 1.62, SEK: 11, CHF: 0.93 };
  for (let i = 45; i >= 1; i--) {
    const date = new Date(today - i * DAY).toISOString().slice(0, 10);
    for (const c of Object.keys(r)) rows.push(`EXR.D.${c}.EUR.SP00.A,D,${c},EUR,SP00,A,${date},${r[c] * (1 + 0.001 * i)}`);
  }
  return rows.join('\n');
}

let failing = new Set<string>();
(globalThis as any).fetch = async (url: string) => {
  const ok = (body: any, text = false) => ({ ok: true, status: 200, json: async () => body, text: async () => (text ? body : JSON.stringify(body)) });
  const fail = { ok: false, status: 500, json: async () => ({}), text: async () => '' };
  const hit = (k: string) => (failing.has(k) ? fail : null);
  if (url.includes('stlouisfed')) {
    const id = /series_id=(\w+)/.exec(url)![1];
    return hit(id) || ok(id === 'DGS10' ? fredJson(4.1, 0.0005) : id === 'SP500' ? fredJson(6500, 0.001) : fredJson(22000, 0.001));
  }
  if (url.includes('ecb.europa.eu')) return hit('ecb') || ok(ecbCsv(), true);
  if (url.includes('pax-gold')) return hit('paxg') || ok(cgChart(4000));
  if (url.includes('coins/bitcoin/market_chart')) return hit('btcDaily') || ok(cgChart(110000));
  if (url.includes('simple/price')) return hit('btcLive') || ok({ bitcoin: { usd: 104000, usd_24h_change: -5.2 } });
  throw new Error('unexpected url ' + url);
};

function mockRes() {
  const r: any = { code: 0, body: null, headers: {} };
  r.status = (c: number) => { r.code = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  r.setHeader = (k: string, v: string) => { r.headers[k] = v; };
  return r;
}
import handler from '../pages/api/macro';
import { buildMacro } from '../lib/macro/build';

const ALL = ['NASDAQCOM', 'SP500', 'DGS10', 'ecb', 'paxg', 'btcDaily', 'btcLive'];
beforeEach(() => { failing = new Set(); process.env.FRED_API_KEY = 'test'; });

// Handler tests run in order and share the route's in-memory cache on purpose.
test('handler: every source down, cold cache → 503', async () => {
  failing = new Set(ALL);
  const res = mockRes();
  await handler({ method: 'GET' } as any, res);
  assert.equal(res.code, 503);
});

test('handler: all sources ok → full payload', async () => {
  const res = mockRes();
  await handler({ method: 'GET' } as any, res);
  assert.equal(res.code, 200);
  const b = res.body;
  for (const k of ['spx', 'ndx', 'us10y', 'dxy', 'gold', 'eurusd']) assert.ok(b.markets[k], k);
  assert.ok(b.markets.dxy.value > 80 && b.markets.dxy.value < 130, 'dxy plausible: ' + b.markets.dxy.value);
  assert.equal(b.btc.change24h, -5.2);
  assert.equal(typeof b.correlation30d, 'number');
  assert.ok(b.context && b.context.en && b.context.de);
  assert.ok(Object.values(b.sources).every((s) => s === 'ok'));
  assert.ok(res.headers['Cache-Control'].includes('s-maxage=900'));
});

test('handler: later total outage → still 200 from cache', async () => {
  failing = new Set(ALL);
  const res = mockRes();
  await handler({ method: 'GET' } as any, res);
  assert.equal(res.code, 200);
  assert.ok(res.body.markets.ndx);
});

test('handler: POST → 405', async () => {
  const res = mockRes();
  await handler({ method: 'POST' } as any, res);
  assert.equal(res.code, 405);
});

test('build: no FRED key (day-one deploy) → equities null, rest present, no false context claim', async () => {
  delete process.env.FRED_API_KEY;
  const b = await buildMacro(new Date('2026-10-14T15:00:00Z'));
  assert.equal(b.markets.ndx, null);
  assert.equal(b.markets.us10y, null);
  assert.ok(b.markets.dxy && b.markets.gold && b.btc);
  assert.equal(b.sources.fred_nasdaq, 'error');
  // BTC -5.2% on a weekday with no Nasdaq data must not produce a with/against-market sentence.
  assert.equal(b.context, null);
  assert.equal(b.status, 'open');
});

test('build: weekend → weekend context even with full data', async () => {
  const b = await buildMacro(new Date('2026-10-17T15:00:00Z')); // Saturday
  assert.equal(b.status, 'weekend');
  assert.equal(b.context!.key, 'weekend');
});

test('build: one source failing only nulls that field', async () => {
  failing = new Set(['paxg']);
  const b = await buildMacro(new Date('2026-10-14T15:00:00Z'));
  assert.equal(b.markets.gold, null);
  assert.equal(b.sources.coingecko_paxg, 'error');
  assert.ok(b.markets.ndx && b.markets.dxy && b.btc && b.context);
});
