// pages/api/subscribe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import crypto from 'crypto';
import { Resend } from 'resend';
import { confirmationEmail, EMAIL_FROM, type Lang, type SignalState } from '../../lib/email-templates';
import { ensurePrefColumns } from '../../lib/email-prefs';
import { syncResendContact } from '../../lib/resend-contact';
import { signalFromApis } from '../../lib/signal';

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz';
const REPLY_TO = process.env.REPLY_TO_EMAIL || '';

function token() { return crypto.randomBytes(32).toString('hex'); }

// Simple in-memory rate limit (single Railway instance): stops anyone using the form to
// flood an inbox with confirmation emails, which would also hurt our sender reputation.
const HOUR = 60 * 60 * 1000;
const hits = new Map<string, number[]>();
function limited(key: string, max: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < HOUR);
  if (recent.length >= max) { hits.set(key, recent); return true; }
  recent.push(now); hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // bound memory
  return false;
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

// Best-effort signal lookup for the confirmation email's "Right now: ..."
// teaser. Same three-indicator scoring as check-signal.ts / weekly-digest.ts.
// Short timeout and a null fallback — a slow or failed fetch here should
// never delay or break the actual signup flow, just skip the teaser.
async function fetchCurrentSignal(): Promise<SignalState | null> {
  try {
    const [fgRes, histRes, priceRes, athRes] = await Promise.all([
      fetch(`${BASE}/api/fear-greed`,                        { signal: AbortSignal.timeout(5000) }),
      fetch(`${BASE}/api/history?timeframe=1y&currency=eur`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${BASE}/api/price`,                             { signal: AbortSignal.timeout(5000) }),
      fetch(`${BASE}/api/ath`,                               { signal: AbortSignal.timeout(5000) }),
    ]);
    if (!fgRes.ok || !histRes.ok || !priceRes.ok || !athRes.ok) return null;

    const [fg, history, price, ath] = await Promise.all([
      fgRes.json(), histRes.json(), priceRes.json(), athRes.json(),
    ]);
    const prices  = (history.prices as [number, number][]).map(p => p[1]);
    return signalFromApis(price.eur, prices, ath.ath_eur as number, fg.value as number, fg.value_classification).state;
  } catch (e: any) {
    console.error('fetchCurrentSignal failed, omitting confirmation teaser:', e.message);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, lang: rawLang } = req.body ?? {};
  const lang: Lang = rawLang === 'de' ? 'de' : 'en';
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited('ip:' + ip, 20) || limited('email:' + String(email).toLowerCase().trim(), 3)) {
    return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
  }

  const confirmToken     = token();
  const unsubscribeToken = token();
  try {
    await ensurePrefColumns(pool);
    const result = await pool.query(
      `INSERT INTO subscribers (email, lang, status, confirm_token, unsubscribe_token)
       VALUES ($1, $2, 'pending', $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET lang          = EXCLUDED.lang,
             confirm_token = CASE WHEN subscribers.status = 'confirmed' THEN subscribers.confirm_token ELSE EXCLUDED.confirm_token END,
             -- Signing up again after unsubscribing starts fresh: both emails back on
             wants_digest  = CASE WHEN subscribers.status = 'unsubscribed' THEN TRUE ELSE subscribers.wants_digest END,
             wants_alerts  = CASE WHEN subscribers.status = 'unsubscribed' THEN TRUE ELSE subscribers.wants_alerts END,
             status        = CASE WHEN subscribers.status = 'unsubscribed' THEN 'pending' ELSE subscribers.status END
       RETURNING status`,
      [email.toLowerCase().trim(), lang, confirmToken, unsubscribeToken]
    );
    if (result.rows[0]?.status === 'confirmed') return res.status(200).json({ ok: true });
    const row = await pool.query(
      'SELECT confirm_token, unsubscribe_token FROM subscribers WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const { confirm_token, unsubscribe_token } = row.rows[0];
    const confirmUrl     = `${BASE}/api/confirm?token=${confirm_token}`;
    const unsubscribeUrl = `${BASE}/api/unsubscribe?token=${unsubscribe_token}`;
    const signal = await fetchCurrentSignal();
    const { subject, html, text } = confirmationEmail(confirmUrl, unsubscribeUrl, lang, {
      signal:  signal ?? undefined,
      replyTo: REPLY_TO,
    });
    const sent = await resend.emails.send({
      from:     EMAIL_FROM,
      to:       email.toLowerCase().trim(),
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      subject,
      html,
      text,
    });
    // The SDK reports a failed send as { error }, it doesn't throw: don't tell the visitor to check their inbox.
    if (sent.error) throw new Error(`confirmation email failed: ${JSON.stringify(sent.error)}`);
    // Sync to Resend Contacts as pending (unsubscribed:true) — not yet
    // opted in, so they shouldn't receive Broadcasts. Fire-and-forget:
    // never blocks the response, never fails the subscribe flow.
    void syncResendContact(email.toLowerCase().trim(), true);
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('subscribe error:', err.message);
    return res.status(500).json({ error: 'Subscription failed. Please try again.' });
  }
}
