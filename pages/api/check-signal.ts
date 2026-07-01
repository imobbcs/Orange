// pages/api/check-signal.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { Resend } from 'resend';
import { alertEmail } from '../../lib/email-templates';

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE     = process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz';
const REPLY_TO = process.env.REPLY_TO_EMAIL || '';

const MOVE_THRESHOLD = 0.03;              // 3% — compared against the 24h change
const COOLDOWN_MS    = 24 * 60 * 60 * 1000;

async function getCurrentPrice(): Promise<{ eur: number; change24h: number }> {
  const res = await fetch(`${BASE}/api/price`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Price API ${res.status}`);
  const data = await res.json();
  return { eur: data.eur, change24h: data.eur_24h_change ?? data.usd_24h_change ?? 0 };
}

async function storePriceSnapshot(price: number) {
  await pool.query(
    'INSERT INTO btc_price_history (recorded_at, price_eur) VALUES (NOW(), $1)',
    [price]
  );
  await pool.query("DELETE FROM btc_price_history WHERE recorded_at < NOW() - INTERVAL '7 days'");
}

// Returns the most recent alert's timestamp AND direction so the cooldown can be
// direction-aware: a repeat move in the same direction is suppressed during cooldown,
// but a fresh move in the opposite direction is allowed through.
async function getLastAlert(): Promise<{ firedAt: Date; direction: string | null } | null> {
  const r = await pool.query(
    'SELECT fired_at, direction FROM alert_log WHERE fired_at IS NOT NULL ORDER BY fired_at DESC LIMIT 1'
  );
  if (!r.rows.length) return null;
  return { firedAt: new Date(r.rows[0].fired_at), direction: r.rows[0].direction ?? null };
}

async function logAlert(price: number, refPrice: number, movePct: number, direction: string) {
  await pool.query(
    'INSERT INTO alert_log (fired_at, price_eur, reference_price_eur, move_pct, direction) VALUES (NOW(), $1, $2, $3, $4)',
    [price, refPrice, movePct, direction]
  );
}

async function fetchSignalData(): Promise<{ fgValue: number; maPct: number; signal: 'accumulate' | 'hold' | 'caution' }> {
  const [fgRes, histRes, priceRes, athRes] = await Promise.all([
    fetch(`${BASE}/api/fear-greed`,                        { signal: AbortSignal.timeout(8000) }),
    fetch(`${BASE}/api/history?timeframe=1y&currency=eur`, { signal: AbortSignal.timeout(8000) }),
    fetch(`${BASE}/api/price`,                             { signal: AbortSignal.timeout(8000) }),
    fetch(`${BASE}/api/ath`,                               { signal: AbortSignal.timeout(8000) }),
  ]);
  const fg      = await fgRes.json();
  const history = await histRes.json();
  const price   = await priceRes.json();
  const ath     = await athRes.json();

  const prices  = (history.prices as [number, number][]).map(p => p[1]);
  const ma      = prices.slice(-200).reduce((a: number, b: number) => a + b, 0) / Math.min(prices.length, 200);
  const fgValue = fg.value as number;
  const maPct   = ((price.eur - ma) / ma) * 100;
  const athPct  = ((price.eur - (ath.ath_eur as number)) / (ath.ath_eur as number)) * 100;

  const fgScore  = fgValue < 30 ? 2 : fgValue < 50 ? 1 : fgValue < 75 ? -1 : -2;
  const maScore  = maPct   < -10 ? 2 : maPct   < 0  ? 1 : maPct   < 20 ? -1 : -2;
  const athScore = athPct  < -50 ? 1 : athPct  < -25 ? 0 : -1;
  const score    = fgScore + maScore + athScore;
  const signal   = score >= 3 ? 'accumulate' as const : score <= -2 ? 'caution' as const : 'hold' as const;

  return { fgValue, maPct, signal };
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendEmailAlerts(
  price: number,
  change24h: number,
  movePct: number,
  direction: 'up' | 'down',
  fgValue: number,
  maPct: number,
  signal: 'accumulate' | 'hold' | 'caution',
) {
  const { rows } = await pool.query<{ email: string; lang: 'en' | 'de'; unsubscribe_token: string }>(
    `SELECT email, lang, unsubscribe_token FROM subscribers WHERE status = 'confirmed'`
  );
  if (rows.length === 0) return;

  let sent = 0; let failed = 0;
  for (const { email, lang, unsubscribe_token } of rows) {
    const unsubscribeUrl = `${BASE}/api/unsubscribe?token=${unsubscribe_token}`;
    const { subject, html } = alertEmail({
      price, change24h, movePct, direction, signal, fgValue, maPct, unsubscribeUrl, replyTo: REPLY_TO, lang,
    });
    const result = await resend.emails.send({
      from:     'When to Buy BTC <alerts@whentobuybtc.xyz>',
      to:       email,
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      subject,
      html,
    });
    if (result.error) {
      console.error(`sendEmailAlerts: failed for ${email}:`, JSON.stringify(result.error));
      failed++;
    } else {
      sent++;
    }
    await delay(250);
  }
  console.log(`sendEmailAlerts: ${sent}/${rows.length} sent successfully, ${failed} failed`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { eur: currentPrice, change24h } = await getCurrentPrice();
    await storePriceSnapshot(currentPrice);

    // Trigger is now the 24h change (the number subscribers actually watch),
    // not a self-computed 4h rolling window. movePct is the fractional form of change24h.
    const movePct   = change24h / 100;
    const direction: 'up' | 'down' = movePct >= 0 ? 'up' : 'down';

    if (Math.abs(movePct) < MOVE_THRESHOLD)
      return res.status(200).json({ status: 'no_alert', movePct: change24h.toFixed(2) + '%' });

    // Direction-aware cooldown: suppress a repeat alert only if it's within the cooldown
    // window AND in the same direction as the last one (so a lingering 24h reading can't
    // re-fire the same move). An opposite-direction move bypasses cooldown and fires,
    // so subscribers don't miss a reversal. Missing/NULL last direction fails open (fires).
    const lastAlert = await getLastAlert();
    if (lastAlert
        && Date.now() - lastAlert.firedAt.getTime() < COOLDOWN_MS
        && lastAlert.direction === direction) {
      return res.status(200).json({
        status: 'cooldown',
        direction,
        lastAlertHoursAgo: ((Date.now() - lastAlert.firedAt.getTime()) / 3600000).toFixed(1),
      });
    }

    let fgValue = 50; let maPct = 0; let signal: 'accumulate' | 'hold' | 'caution' = 'hold';
    try { ({ fgValue, maPct, signal } = await fetchSignalData()); } catch (e: any) {
      console.error('fetchSignalData failed, using defaults:', e.message);
    }

    await sendEmailAlerts(currentPrice, change24h, movePct, direction, fgValue, maPct, signal);
    // reference_price_eur is derived from the 24h change so the logged row stays self-consistent.
    const refPrice = currentPrice / (1 + movePct);
    await logAlert(currentPrice, refPrice, movePct, direction);

    return res.status(200).json({ status: 'alert_sent', direction, movePct: change24h.toFixed(2) + '%' });

  } catch (err: any) {
    console.error('check-signal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
