// Run: npx tsx --test tests/contact-backfill.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backfillContacts } from '../lib/contact-backfill';

test('backfill: confirmed → subscribed, unsubscribed stays unsubscribed, every contact once', async () => {
  const calls: [string, boolean][] = [];
  const progress = { total: 3, done: 0, subscribed: 0, unsubscribed: 0 };
  await backfillContacts(
    [{ email: 'a@x.com', status: 'confirmed' }, { email: 'b@x.com', status: 'unsubscribed' }, { email: 'c@x.com', status: 'confirmed' }],
    async (e, u) => { calls.push([e, u]); }, progress, 0);
  assert.deepEqual(calls, [['a@x.com', false], ['b@x.com', true], ['c@x.com', false]]);
  assert.deepEqual(progress, { total: 3, done: 3, subscribed: 2, unsubscribed: 1 });
});
