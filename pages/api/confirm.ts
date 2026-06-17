// pages/api/confirm.ts
// Handles double opt-in confirmation clicks from the email link.
// Redirects to the site with a query param so the UI can show a success state.
// Also sends a welcome email confirming the subscription is active.
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { Resend } from 'resend';
import { welcomeEmail, type Lang } from '../../lib/email-templates';

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz';
const REPLY_TO = process.env.REPLY_TO_EMAIL || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.redirect(`${BASE}?email=invalid`);
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
      return res.redirect(`${BASE}?email=already`);
    }

    // Redirect immediately — don't wait for the welcome email
    res.redirect(`${BASE}?email=confirmed`);

    // Send welcome email in the background
    const { email, lang, unsubscribe_token } = result.rows[0];
    const unsubscribeUrl = `${BASE}/api/unsubscribe?token=${unsubscribe_token}`;
    const { subject, html } = welcomeEmail(unsubscribeUrl, lang as Lang);

    resend.emails.send({
      from:     'When to Buy BTC <alerts@whentobuybtc.xyz>',
      to:       email,
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      subject,
      html,
    }).catch(err => console.error('welcome email error:', err.message));

  } catch (err: any) {
    console.error('confirm error:', err.message);
    return res.redirect(`${BASE}?email=error`);
  }
}
