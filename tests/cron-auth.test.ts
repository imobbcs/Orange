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

test('?token= survives what browsers and copy-paste do to it, and still rejects wrong secrets', () => {
  const S = 'ab+cd/ef==';
  const ok = (token: any) => cronAuthorized({ headers: {}, query: { token } }, S);
  assert.equal(ok('ab cd/ef=='), true);          // "+" arrives as a space
  assert.equal(ok(' ab+cd/ef== '), true);        // pasted with spaces
  assert.equal(ok('Bearer ab+cd/ef=='), true);   // copied from the cron-job.org header field
  assert.equal(ok(['ab+cd/ef==']), true);        // repeated param
  assert.equal(ok('ab cd/ef='), false);
  assert.equal(ok('Bearer'), false);
  assert.equal(cronAuthorized({ headers: {}, query: { token: 'anything' } }, ''), false); // no secret set → locked
});

test('alerts, digest and backup check the secret before doing anything', () => {
  for (const f of ['pages/api/check-signal.ts', 'pages/api/weekly-digest.ts', 'pages/api/admin/backup.ts']) {
    const s = readFileSync(f, 'utf8');
    const h = s.indexOf('async function handler');
    assert.match(s, /export default withHeartbeat\('[A-Z]+', cronAuthorized, handler\)/, f);
    const guard = s.indexOf('if (!cronAuthorized(req))', h);
    assert.ok(h > 0 && guard > h, f);
    assert.ok(guard < s.indexOf('await ', h), `${f}: guard must come before any work`);
  }
});
