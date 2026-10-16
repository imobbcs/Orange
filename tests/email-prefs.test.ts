// Run: npx tsx --test tests/email-prefs.test.ts
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  prefsFor, choiceOf, parseChoice, isOneClick, maskEmail, preferencesPage, applyChoice, ensurePrefColumns, _resetSchemaFlag,
  type PrefRow,
} from '../lib/email-prefs';
import { alertEmail, digestEmail, welcomeEmail } from '../lib/email-templates';

// A tiny in-memory stand-in for the subscribers table, enough for the two UPDATEs.
function fakePool(rows: Record<string, PrefRow>) {
  const calls: string[] = [];
  return {
    calls,
    async query(sql: string, params: any[] = []) {
      calls.push(sql.replace(/\s+/g, ' ').trim());
      const r = rows[params[0]];
      if (/^\s*ALTER TABLE/m.test(sql)) return { rows: [] };
      if (!r) return { rows: [] };
      if (/SET status = 'unsubscribed'/.test(sql)) r.status = 'unsubscribed';
      else if (/SET wants_digest/.test(sql)) {
        r.wants_digest = params[1]; r.wants_alerts = params[2];
        if (r.status === 'unsubscribed' && r.confirmed_at !== null) r.status = 'confirmed';
      }
      return { rows: [{ ...r }] };
    },
  } as any;
}
const row = (o: Partial<PrefRow> = {}): PrefRow =>
  ({ email: 'imo@example.com', lang: 'en', status: 'confirmed', wants_digest: true, wants_alerts: true, confirmed_at: new Date('2026-01-01'), ...o });

beforeEach(() => _resetSchemaFlag());

test('choices map to the two flags and back', () => {
  assert.deepEqual(prefsFor('both'), { wantsDigest: true, wantsAlerts: true });
  assert.deepEqual(prefsFor('digest'), { wantsDigest: true, wantsAlerts: false });
  assert.deepEqual(prefsFor('alerts'), { wantsDigest: false, wantsAlerts: true });
  for (const c of ['both', 'digest', 'alerts', 'none'] as const) assert.equal(choiceOf(prefsFor(c)), c);
  assert.equal(parseChoice('digest'), 'digest');
  assert.equal(parseChoice('everything'), null);
  assert.equal(parseChoice(undefined), null);
});

test('one-click detection: only the exact RFC 8058 body', () => {
  assert.ok(isOneClick({ 'List-Unsubscribe': 'One-Click' }));
  assert.ok(isOneClick('List-Unsubscribe=One-Click'));
  assert.ok(!isOneClick({ choice: 'none' }));
  assert.ok(!isOneClick({}));
  assert.ok(!isOneClick(undefined));
});

test('schema: columns added once per process, retried after a failure', async () => {
  const p = fakePool({});
  await ensurePrefColumns(p); await ensurePrefColumns(p);
  assert.equal(p.calls.filter((c: string) => c.includes('ADD COLUMN IF NOT EXISTS wants_digest')).length, 1);
  _resetSchemaFlag();
  let n = 0;
  const bad = { query: async () => { n++; if (n === 1) throw new Error('db down'); return { rows: [] }; } } as any;
  await assert.rejects(ensurePrefColumns(bad));
  await ensurePrefColumns(bad);
  assert.equal(n, 2);
});

test('applyChoice: switch to Sundays only, then unsubscribe, then turn back on', async () => {
  const db = { t1: row() };
  const p = fakePool(db);
  let r = await applyChoice(p, 't1', 'digest');
  assert.equal(r!.status, 'confirmed'); assert.equal(r!.wants_alerts, false); assert.equal(r!.wants_digest, true);
  r = await applyChoice(p, 't1', 'none');
  assert.equal(r!.status, 'unsubscribed');
  r = await applyChoice(p, 't1', 'both');
  assert.equal(r!.status, 'confirmed'); assert.equal(r!.wants_alerts, true);
  assert.equal(await applyChoice(p, 'nope', 'both'), null);
});

test('applyChoice: a reader who never confirmed is never switched on by this page', async () => {
  const db = { t: row({ status: 'unsubscribed', confirmed_at: null }) };
  const r = await applyChoice(fakePool(db), 't', 'both');
  assert.equal(r!.status, 'unsubscribed');
});

test('page: current choice preselected, masked email, unsubscribe-all form, token escaped', () => {
  const h = preferencesPage({ kind: 'manage', row: row({ wants_alerts: false }), token: 'ab"c' }, 'en');
  assert.ok(/value="digest" checked/.test(h));
  assert.ok(!/value="both" checked/.test(h));
  assert.ok(h.includes('i••@example.com') && !h.includes('imo@example.com'));
  assert.ok(h.includes('name="choice" value="none"') && h.includes('Unsubscribe from all emails'));
  assert.ok(h.includes('value="ab&quot;c"') && !h.includes('ab"c'));
  assert.ok(h.includes('<meta name="robots" content="noindex">'));
});

test('page: saved, unsubscribed, resumed, pending and bad-link states, EN and DE', () => {
  assert.ok(preferencesPage({ kind: 'manage', row: row({ wants_digest: false }), token: 't', notice: 'saved' }, 'en')
    .includes('only hear from me on big moves'));
  const out = preferencesPage({ kind: 'manage', row: row({ status: 'unsubscribed' }), token: 't' }, 'de');
  assert.ok(out.includes('Du bist abgemeldet.') && out.includes('E-Mails wieder einschalten'));
  const outPending = preferencesPage({ kind: 'manage', row: row({ status: 'unsubscribed', confirmed_at: null }), token: 't' }, 'en');
  assert.ok(!outPending.includes('name="choice"') && outPending.includes('Sign up again'));
  assert.ok(preferencesPage({ kind: 'manage', row: row(), token: 't', notice: 'resumed' }, 'en').includes('Welcome back'));
  assert.ok(preferencesPage({ kind: 'manage', row: row({ status: 'pending' }), token: 't' }, 'en').includes('haven&#39;t confirmed'));
  assert.ok(preferencesPage({ kind: 'invalid' }, 'de').includes('funktioniert nicht mehr'));
  assert.ok(preferencesPage({ kind: 'error' }, 'en').includes('Nothing was changed'));
});

test('maskEmail', () => {
  assert.equal(maskEmail('a@b.co'), 'a••@b.co');
  assert.equal(maskEmail('verylongname@b.co'), 'v••••••@b.co');
  assert.equal(maskEmail('broken'), '');
});

test('emails: footer link says what it does; alerts offer Sundays only; welcome mentions the choice', () => {
  const base = { price: 1, signal: 'hold' as const, fgValue: 50, maPct: 0, athPct: -30, change24h: -5, unsubscribeUrl: 'https://x/u?token=t', replyTo: '' };
  const a = alertEmail({ ...base, movePct: -0.05, direction: 'down', lang: 'en' });
  assert.ok(a.html.includes('Choose emails or unsubscribe') && a.html.includes('Sundays only?'));
  assert.ok(alertEmail({ ...base, movePct: -0.05, direction: 'down', lang: 'de' }).html.includes('Nur noch sonntags?'));
  const d = digestEmail({ ...base, lang: 'de' });
  assert.ok(d.html.includes('E-Mails wählen oder abmelden') && !d.html.includes('Nur noch sonntags?'));
  assert.ok(welcomeEmail('#u', 'en', {}).html.includes('Only want one of the two?'));
});
