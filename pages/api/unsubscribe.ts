// pages/api/unsubscribe.ts
// Behind the "Manage emails or unsubscribe" link in every email footer.
//
//   GET  ?token=…                         → the settings page (changes nothing, safe for link scanners)
//   POST token=…&choice=both|digest|alerts → save which emails to get
//   POST token=…&choice=none               → unsubscribe from everything
//   POST ?token=… List-Unsubscribe=One-Click → the inbox's own unsubscribe button (RFC 8058): instant
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { syncResendContact } from '../../lib/resend-contact';
import {
  ensurePrefColumns, loadByToken, applyChoice, parseChoice, isOneClick, preferencesPage,
  type Lang, type PageState,
} from '../../lib/email-prefs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function guessLang(req: NextApiRequest): Lang {
  if (req.query.lang === 'de') return 'de';
  return /^de\b/i.test(String(req.headers['accept-language'] || '')) ? 'de' : 'en';
}

function send(res: NextApiResponse, status: number, state: PageState, lang: Lang) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(preferencesPage(state, lang));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const raw = typeof req.query.token === 'string' ? req.query.token : typeof body.token === 'string' ? body.token : '';
  const token = raw.trim();

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  }

  // Inbox one-click: no page, just unsubscribe and answer 200.
  if (req.method === 'POST' && isOneClick(req.body)) {
    if (!token) return res.status(400).end();
    try {
      await ensurePrefColumns(pool);
      const row = await applyChoice(pool, token, 'none');
      if (row) void syncResendContact(row.email, true);
      return res.status(200).end();
    } catch (err: any) {
      console.error('one-click unsubscribe error:', err.message);
      return res.status(500).end();
    }
  }

  if (!token) return send(res, 400, { kind: 'invalid' }, guessLang(req));

  try {
    await ensurePrefColumns(pool);
    const before = await loadByToken(pool, token);
    // Don't reveal whether a token exists beyond "this link doesn't work".
    if (!before) return send(res, 404, { kind: 'invalid' }, guessLang(req));

    if (req.method === 'GET') return send(res, 200, { kind: 'manage', row: before, token }, before.lang);

    const choice = parseChoice(body.choice);
    if (!choice) return send(res, 400, { kind: 'manage', row: before, token }, before.lang);

    const after = await applyChoice(pool, token, choice);
    if (!after) return send(res, 404, { kind: 'invalid' }, before.lang);

    // Keep Resend Contacts in step with whether this reader gets anything at all.
    if (before.status !== after.status && (after.status === 'unsubscribed' || before.status === 'unsubscribed')) {
      void syncResendContact(after.email, after.status === 'unsubscribed');
    }
    const notice = before.status === 'unsubscribed' && after.status === 'confirmed' ? 'resumed' : 'saved';
    console.log(`email prefs: ${choice}${notice === 'resumed' ? ' (resumed)' : ''}`);
    return send(res, 200, { kind: 'manage', row: after, token, notice }, after.lang);
  } catch (err: any) {
    console.error('email prefs error:', err.message);
    return send(res, 500, { kind: 'error' }, guessLang(req));
  }
}
