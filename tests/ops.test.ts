// Run: npx tsx --test tests/ops.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heartbeatUrl, withHeartbeat } from '../lib/heartbeat';
import { toCsv, backupSummary } from '../lib/backup';

test('heartbeat URL: success, fail, unset, not https', () => {
  const env = { HEALTHCHECK_URL_SIGNAL: 'https://hc-ping.com/abc/' };
  assert.equal(heartbeatUrl('SIGNAL', true, env), 'https://hc-ping.com/abc');
  assert.equal(heartbeatUrl('SIGNAL', false, env), 'https://hc-ping.com/abc/fail');
  assert.equal(heartbeatUrl('DIGEST', true, env), null);
  assert.equal(heartbeatUrl('SIGNAL', true, { HEALTHCHECK_URL_SIGNAL: 'http://x' }), null);
});

function fakeRes() {
  const r: any = { statusCode: 200 };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
}

async function pings(authorized: boolean, run: (res: any) => void | Promise<void>) {
  const calls: string[] = [];
  const orig = globalThis.fetch;
  process.env.HEALTHCHECK_URL_DIGEST = 'https://hc-ping.com/d';
  globalThis.fetch = (async (url: any) => { calls.push(String(url)); return new Response('OK'); }) as any;
  try {
    const h = withHeartbeat('DIGEST', () => authorized, async (_q: any, res: any) => { await run(res); });
    await h({}, fakeRes()).catch(() => {});
  } finally {
    globalThis.fetch = orig;
    delete process.env.HEALTHCHECK_URL_DIGEST;
  }
  return calls;
}

test('withHeartbeat pings ok, fail on 5xx, fail on failed sends, fail on throw, nothing when unauthorised', async () => {
  assert.deepEqual(await pings(true, (res) => res.status(200).json({ status: 'done', sent: 3, failed: 0 })), ['https://hc-ping.com/d']);
  assert.deepEqual(await pings(true, (res) => res.status(200).json({ status: 'cooldown' })), ['https://hc-ping.com/d']);
  assert.deepEqual(await pings(true, (res) => res.status(500).json({ error: 'db' })), ['https://hc-ping.com/d/fail']);
  assert.deepEqual(await pings(true, (res) => res.status(200).json({ sent: 2, failed: 1 })), ['https://hc-ping.com/d/fail']);
  assert.deepEqual(await pings(true, () => { throw new Error('boom'); }), ['https://hc-ping.com/d/fail']);
  assert.deepEqual(await pings(false, (res) => res.status(401).json({ error: 'Unauthorized' })), []);
});

test('CSV: header, quoting, dates, nulls, formula guard', () => {
  const d = new Date('2026-10-16T09:00:00Z');
  const csv = toCsv([
    { id: 1, email: 'a@b.com', lang: 'de', confirmed_at: d, note: null },
    { id: 2, email: '=HYPERLINK("x")@b.com', lang: 'en', confirmed_at: null, note: 'a, "b"\nc' },
  ]);
  assert.equal(csv,
    'id,email,lang,confirmed_at,note\r\n'
    + '1,a@b.com,de,2026-10-16T09:00:00.000Z,\r\n'
    + '2,"\'=HYPERLINK(""x"")@b.com",en,,"a, ""b""\nc"\r\n');
  assert.equal(toCsv([], ['id', 'email']), 'id,email\r\n');
});

test('backup summary counts by status', () => {
  assert.deepEqual(backupSummary([{ status: 'confirmed' }, { status: 'confirmed' }, { status: 'pending' }, { status: 'unsubscribed' }]),
    { total: 4, confirmed: 2, pending: 1, unsubscribed: 1 });
});
