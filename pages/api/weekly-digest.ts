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

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Manually-updated for now (per Imo — live query comes later once traffic
// growth makes it worth wiring up automatically). Bump this every so often.
const SUBSCRIBER_COUNT = 612;
const SUBSCRIBER_GOAL  = 1000;

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
    // Idempotent — adds the delta-tracking columns the first time this runs
    // after deploy, no-ops on every run after that. Cheap enough to run every
    // week on a cron this infrequent.
    await pool.query(`
      ALTER TABLE digest_log ADD COLUMN IF NOT EXISTS fg_value INTEGER;
      ALTER TABLE digest_log ADD COLUMN IF NOT EXISTS ma_pct NUMERIC;
      ALTER TABLE digest_log ADD COLUMN IF NOT EXISTS ath_pct NUMERIC;
      ALTER TABLE digest_log ADD COLUMN IF NOT EXISTS price_eur NUMERIC;
    `);

    const lastDigest = await pool.query(
      'SELECT sent_at, fg_value, ma_pct, ath_pct, price_eur FROM digest_log ORDER BY sent_at DESC LIMIT 1'
    );
    if (lastDigest.rows.length > 0) {
      const hoursSinceLast = (Date.now() - new Date(lastDigest.rows[0].sent_at).getTime()) / 3600000;
      if (hoursSinceLast < 24)
        return res.status(200).json({ status: 'cooldown', hoursSinceLast: hoursSinceLast.toFixed(1) });
    }

    const { currentPrice, fgValue, maPct, athPct, change24h, signal } = await fetchSignalData();

    // Previous week's values for the delta copy — read before we overwrite
    // with this week's row. undefined on the very first send (no prior row).
    const prevRow      = lastDigest.rows[0];
    const prevFgValue  = prevRow?.fg_value  != null ? Number(prevRow.fg_value)  : undefined;
    const prevMaPct    = prevRow?.ma_pct    != null ? Number(prevRow.ma_pct)    : undefined;
    const prevAthPct   = prevRow?.ath_pct   != null ? Number(prevRow.ath_pct)   : undefined;

    // Guard insert — placed right before the send loop (same race-prevention
    // pattern as before), now carrying this week's values so next week's run
    // has something to diff against.
    await pool.query(
      'INSERT INTO digest_log (sent_at, fg_value, ma_pct, ath_pct, price_eur) VALUES (NOW(), $1, $2, $3, $4)',
      [fgValue, maPct, athPct, currentPrice]
    );

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
        prevFgValue, prevMaPct, prevAthPct,
        subscriberCount: SUBSCRIBER_COUNT, subscriberGoal: SUBSCRIBER_GOAL,
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
