// pages/api/weekly-digest.ts
// Cron: 0 15 * * 0 (Sunday 17:00 Vienna time)
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { Resend } from 'resend';
import { digestEmail, type SignalState } from '../../lib/email-templates';

const pool     = new Pool({ connectionString: process.env.DATABASE_URL });
const resend   = new Resend(process.env.RESEND_API_KEY);
const BASE     = process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz';
const REPLY_TO = process.env.REPLY_TO_EMAIL || '';

async function fetchSignalData() {
  const [priceRes, fgRes, athRes, histRes] = await Promise.all([
    fetch(`${BASE}/api/price`,                             { signal: AbortSignal.timeout(10000) }),
    fetch(`${BASE}/api/fear-greed`,                        { signal: AbortSignal.timeout(10000) }),
    fetch(`${BASE}/api/ath`,                               { signal: AbortSignal.timeout(10000) }),
    fetch(`${BASE}/api/history?timeframe=1y&currency=eur`, { signal: AbortSignal.timeout(10000) }),
  ]);
  if (!priceRes.ok || !fgRes.ok || !athRes.ok || !histRes.ok)
    throw new Error('One or more signal APIs failed');
  const [price, fg, ath, history] = await Promise.all([
    priceRes.json(), fgRes.json(), athRes.json(), histRes.json(),
  ]);
  const prices       = (history.prices as [number, number][]).map(p => p[1]);
  const ma           = prices.slice(-200).reduce((a: number, b: number) => a + b, 0) / Math.min(prices.length, 200);
  const currentPrice = price.eur as number;
  const fgValue      = fg.value as number;
  const maPct        = ((currentPrice - ma) / ma) * 100;
  const athPct       = ((currentPrice - (ath.ath_eur as number)) / (ath.ath_eur as number)) * 100;
  const change24h    = price.eur_24h_change as number;
  const fgScore  = fgValue < 30 ? 2 : fgValue < 50 ? 1 : fgValue < 75 ? -1 : -2;
  const maScore  = maPct   < -10 ? 2 : maPct   < 0  ? 1 : maPct   < 20 ? -1 : -2;
  const athScore = athPct  < -50 ? 1 : athPct  < -25 ? 0 : -1;
  const score    = fgScore + maScore + athScore;
  const signal: SignalState = score >= 3 ? 'accumulate' : score <= -2 ? 'caution' : 'hold';
  return { currentPrice, fgValue, maPct, athPct, change24h, signal };
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const auth = req.headers.authorization;
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`)
    return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { currentPrice, fgValue, maPct, athPct, change24h, signal } = await fetchSignalData();
    const { rows } = await pool.query<{ email: string; lang: 'en' | 'de'; unsubscribe_token: string }>(
      `SELECT email, lang, unsubscribe_token FROM subscribers WHERE status = 'confirmed'`
    );
    if (rows.length === 0) return res.status(200).json({ status: 'no_subscribers' });

    let sent = 0; let failed = 0;
    for (const { email, lang, unsubscribe_token } of rows) {
      const unsubscribeUrl = `${BASE}/api/unsubscribe?token=${unsubscribe_token}`;
      const { subject, html } = digestEmail({
        price: currentPrice, signal, fgValue, maPct, athPct, change24h,
        unsubscribeUrl, replyTo: REPLY_TO, lang,
      });
      const result = await resend.emails.send({
        from:     'When to Buy BTC <alerts@whentobuybtc.xyz>',
        to:       email,
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
        subject,
        html,
      });
      if (result.error) {
        console.error(`weekly-digest: failed for ${email}:`, JSON.stringify(result.error));
        failed++;
      } else {
        sent++;
      }
      await delay(250);
    }

    console.log(`weekly-digest: ${sent}/${rows.length} sent successfully, ${failed} failed`);
    return res.status(200).json({ status: 'done', sent, failed });
  } catch (err: any) {
    console.error('weekly-digest error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
