// pages/api/subscribe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import crypto from 'crypto';
import { Resend } from 'resend';
import { confirmationEmail, type Lang, type SignalState } from '../../lib/email-templates';
import { syncResendContact } from '../../lib/resend-contact';

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz';
const REPLY_TO = process.env.REPLY_TO_EMAIL || '';

function token() { return crypto.randomBytes(32).toString('hex'); }

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
    const ma      = prices.slice(-200).reduce((a: number, b: number) => a + b, 0) / Math.min(prices.length, 200);
    const fgValue = fg.value as number;
    const maPct   = ((price.eur - ma) / ma) * 100;
    const athPct  = ((price.eur - (ath.ath_eur as number)) / (ath.ath_eur as number)) * 100;

    const fgScore  = fgValue < 30 ? 2 : fgValue < 50 ? 1 : fgValue < 75 ? -1 : -2;
    const maScore  = maPct   < -10 ? 2 : maPct   < 0  ? 1 : maPct   < 20 ? -1 : -2;
    const athScore = athPct  < -50 ? 1 : athPct  < -25 ? 0 : -1;
    const score    = fgScore + maScore + athScore;

    return score >= 3 ? 'accumulate' : score <= -2 ? 'caution' : 'hold';
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
  const confirmToken     = token();
  const unsubscribeToken = token();
  try {
    const result = await pool.query(
      `INSERT INTO subscribers (email, lang, status, confirm_token, unsubscribe_token)
       VALUES ($1, $2, 'pending', $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET lang          = EXCLUDED.lang,
             confirm_token = CASE WHEN subscribers.status = 'confirmed' THEN subscribers.confirm_token ELSE EXCLUDED.confirm_token END,
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
    const { subject, html } = confirmationEmail(confirmUrl, unsubscribeUrl, lang, {
      signal:  signal ?? undefined,
      replyTo: REPLY_TO,
    });
    await resend.emails.send({
      from:     'When to Buy BTC <alerts@whentobuybtc.xyz>',
      to:       email.toLowerCase().trim(),
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      subject,
      html,
    });
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
