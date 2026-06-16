// pages/api/subscribe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import crypto from 'crypto';
import { Resend } from 'resend';
import { confirmationEmail, type Lang } from '../../lib/email-templates';

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE   = process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz';
const REPLY_TO = process.env.REPLY_TO_EMAIL || '';

function token() { return crypto.randomBytes(32).toString('hex'); }

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
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
    const { subject, html } = confirmationEmail(confirmUrl, unsubscribeUrl, lang);

    await resend.emails.send({
      from:     'When to Buy BTC <alerts@whentobuybtc.xyz>',
      to:       email.toLowerCase().trim(),
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      subject,
      html,
    });

    return res.status(200).json({ ok: true });

  } catch (err: any) {
    console.error('subscribe error:', err.message);
    return res.status(500).json({ error: 'Subscription failed. Please try again.' });
  }
}
