// pages/api/confirm.ts
// Handles double opt-in confirmation clicks from the email link.
// Redirects to the site with a query param so the UI can show a success state.
// Also sends a welcome email confirming the subscription is active.
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { Resend } from 'resend';
import { welcomeEmail, EMAIL_FROM, type Lang, type WelcomeMarket } from '../../lib/email-templates';
import { marketSnapshot } from '../../lib/market-ssr';
import { syncResendContact } from '../../lib/resend-contact';
import { readerCount, READER_GOAL } from '../../lib/subscribers';

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz';
const REPLY_TO = process.env.REPLY_TO_EMAIL || '';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.redirect(`${BASE}?email=invalid#alerts`);
  }
  try {
    const result = await pool.query(
      `UPDATE subscribers
       SET status = 'confirmed', confirmed_at = NOW()
       WHERE confirm_token = $1 AND status = 'pending'
       RETURNING id, email, lang, unsubscribe_token`,
      [token]
    );
    if (result.rowCount === 0) {
      return res.redirect(`${BASE}?email=already#alerts`);
    }
    // Redirect immediately — don't wait for the welcome email
    res.redirect(`${BASE}?email=confirmed#alerts`);
    // Send welcome email in the background
    const { email, lang, unsubscribe_token } = result.rows[0];
    const unsubscribeUrl = `${BASE}/api/unsubscribe?token=${unsubscribe_token}`;
    // Today's reading for the top of the welcome email; any failure → the email goes out without it
    let market: WelcomeMarket | null = null;
    try {
      const m = await marketSnapshot(req, { history: true });
      if (m.price && m.fg !== null && m.maPct !== null && m.athPct !== null) {
        market = { price: m.price, change24h: m.change24h, fgValue: m.fg, fgClass: m.fgLabel, maPct: m.maPct, athPct: m.athPct };
      }
    } catch (e: any) { console.error('welcome email: market snapshot skipped:', e?.message || e); }
    const { subject, html, text } = welcomeEmail(unsubscribeUrl, lang as Lang, {
      market,
      replyTo:         REPLY_TO,
      subscriberCount: await readerCount(pool),
      subscriberGoal:  READER_GOAL,
    });
    resend.emails.send({
      from:     EMAIL_FROM,
      to:       email,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      // One-click unsubscribe (RFC 8058): Gmail/Yahoo show their own Unsubscribe button
      headers:  { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      subject,
      html,
      text,
    }).then(r => { if (r.error) console.error('welcome email error:', JSON.stringify(r.error)); })
      .catch(err => console.error('welcome email error:', err.message));
    // Sync to Resend Contacts as confirmed (unsubscribed:false) — now
    // eligible for Broadcasts. Fire-and-forget, same as the welcome email.
    void syncResendContact(email, false);
  } catch (err: any) {
    console.error('confirm error:', err.message);
    return res.redirect(`${BASE}?email=error`);
  }
}
