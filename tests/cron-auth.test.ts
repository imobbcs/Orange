// Run: npx tsx --test tests/cron-auth.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { cronAuthorized } from '../lib/cron-auth';

test('scheduled routes: secret via Bearer header or ?token=, nothing else', () => {
  const S = 's3cret-value';
  assert.equal(cronAuthorized({ headers: { authorization: `Bearer ${S}` }, query: {} }, S), true);
  assert.equal(cronAuthorized({ headers: {}, query: { token: S } }, S), true);
  assert.equal(cronAuthorized({ headers: {}, query: {} }, S), false);
  assert.equal(cronAuthorized({ headers: { authorization: 'Bearer wrong' }, query: { token: 'nope' } }, S), false);
  assert.equal(cronAuthorized({ headers: { authorization: S }, query: {} }, S), false);     // no "Bearer "
  assert.equal(cronAuthorized({ headers: { authorization: 'Bearer ' }, query: {} }, ''), false); // no secret set → locked
});

test('alerts and digest both check the secret before doing anything', () => {
  for (const f of ['pages/api/check-signal.ts', 'pages/api/weekly-digest.ts']) {
    const s = readFileSync(f, 'utf8');
    const h = s.indexOf('export default async function handler');
    const guard = s.indexOf('if (!cronAuthorized(req))', h);
    assert.ok(h > 0 && guard > h, f);
    assert.ok(guard < s.indexOf('await ', h), `${f}: guard must come before any work`);
  }
});
