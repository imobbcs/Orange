// Run: npx tsx --test tests/send-once.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendOnce, BATCH_SIZE, type Db } from '../lib/send-once';

// In-memory stand-in for the email_sends table (the three statements sendOnce uses).
function fakeDb() {
  const rows = new Set<string>();
  const db: Db = {
    async query(sql: string, p: any[] = []) {
      if (sql.startsWith('SELECT email FROM email_sends')) return { rows: Array.from(rows).filter((k) => k.startsWith(p[0] + '|')).map((k) => ({ email: k.split('|')[1] })) };
      if (sql.startsWith('INSERT INTO email_sends')) {
        const got = (p[1] as string[]).filter((e) => !rows.has(p[0] + '|' + e));
        got.forEach((e) => rows.add(p[0] + '|' + e));
        return { rows: got.map((email) => ({ email })) };
      }
      if (sql.startsWith('DELETE FROM email_sends')) { (p[1] as string[]).forEach((e) => rows.delete(p[0] + '|' + e)); return { rows: [] }; }
      throw new Error('unexpected sql: ' + sql);
    },
  };
  return { db, rows };
}
const out = (n: number) => Array.from({ length: n }, (_, i) => ({ email: `r${i}@x.test`, message: { from: 'a@b', to: `r${i}@x.test`, subject: 's', text: 't' } as any }));

test('sends in batches of 100 and never twice for the same run', async () => {
  const { db } = fakeDb();
  const calls: number[] = [];
  const sender = { batch: { send: async (m: any[]) => { calls.push(m.length); return { data: {}, error: null }; } } };
  const r1 = await sendOnce(db, sender, 'alert:1', out(250), 0);
  assert.deepEqual(calls, [BATCH_SIZE, BATCH_SIZE, 50]);
  assert.deepEqual(r1, { sent: 250, failed: 0, skipped: 0 });
  const r2 = await sendOnce(db, sender, 'alert:1', out(260), 0); // rerun after a crash: only the 10 new ones
  assert.deepEqual(r2, { sent: 10, failed: 0, skipped: 250 });
  const r3 = await sendOnce(db, sender, 'alert:2', out(5), 0);   // another run is independent
  assert.equal(r3.sent, 5);
});

test('a failed batch is retried on the next run, the rest are not', async () => {
  const { db } = fakeDb();
  let n = 0;
  const flaky = { batch: { send: async () => (++n === 2 ? { data: null, error: { message: 'rate limited' } } : { data: {}, error: null }) } };
  const r1 = await sendOnce(db, flaky, 'digest:1', out(250), 0);
  assert.deepEqual(r1, { sent: 150, failed: 100, skipped: 0 });
  const seen: string[] = [];
  const ok = { batch: { send: async (m: any[]) => { seen.push(...m.map((x) => x.to)); return { data: {}, error: null }; } } };
  const r2 = await sendOnce(db, ok, 'digest:1', out(250), 0);
  assert.deepEqual(r2, { sent: 100, failed: 0, skipped: 150 });
  assert.equal(seen[0], 'r100@x.test');
});

test('a thrown error counts as a failed batch, not a crash', async () => {
  const { db } = fakeDb();
  const boom = { batch: { send: async () => { throw new Error('network'); } } };
  assert.deepEqual(await sendOnce(db, boom, 'alert:9', out(3), 0), { sent: 0, failed: 3, skipped: 0 });
});
