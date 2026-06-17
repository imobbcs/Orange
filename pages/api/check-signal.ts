// pages/api/check-signal.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { Resend } from 'resend';
import { alertEmail } from '../../lib/email-templates';

const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE     = process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz';
const REPLY_TO = process.env.REPLY_TO_EMAIL || '';

const MOVE_THRESHOLD = 0.03;
const COOLDOWN_MS    = 24 * 60 * 60 * 1000;

async function ensureTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS btc_price_history (
    recorded_at TIMESTAMPTZ PRIMARY KEY DEFAULT NOW(), price_eur NUMERIC NOT NULL)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS alert_log (
    id SERIAL PRIMARY KEY, fired_at TIMESTAMPTZ DEFAULT NOW(),
    price_eur NUMERIC NOT NULL, reference_price_eur NUMERIC NOT NULL,
    move_pct NUMERIC NOT NULL, direction TEXT NOT NULL)`);
}

async function getCurrentPrice(): Promise<number> {
  const res = await fetch(`${BASE}/api/price`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Price API ${res.status}`);
  return (await res.json()).eur;
}

async function storePriceSnapshot(price: number) {
  await pool.query('INSERT INTO btc_price_history (price_eur) VALUES ($1)', [price]);
  await pool.query("DELETE FROM btc_price_history WHERE recorded_at < NOW() - INTERVAL '7 days'");
}

async function getPriceFromHoursAgo(hours: number): Promise<number | null> {
  const r = await pool.query(
    `SELECT price_eur FROM btc_price_history WHERE recorded_at <= NOW() - ($1 || ' hours')::INTERVAL ORDER BY recorded_at DESC LIMIT 1`,
    [hours]
  );
  return r.rows.length ? parseFloat(r.rows[0].price_eur) : null;
}

async function getLastAlertTime(): Promise<Date | null> {
  const r = await pool.query('SELECT fired_at FROM alert_log ORDER BY fired_at DESC LIMIT 1');
  return r.rows.length ? new Date(r.rows[0].fired_at) : null;
}

async function logAlert(price: number, refPrice: number, movePct: number, direction: string) {
  await pool.query(
    'INSERT INTO alert_log (price_eur, reference_price_eur, move_pct, direction) VALUES ($1,$2,$3,$4)',
    [price, refPrice, movePct, direction]
  );
}

async function fetchFgAndMa(): Promise<{ fgValue: number; maPct: number }> {
  const [fgRes, histRes, priceRes] = await Promise.all([
    fetch(`${BASE}/api/fear-greed`,                        { signal: AbortSignal.timeout(8000) }),
    fetch(`${BASE}/api/history?timeframe=1y&currency=eur`, { signal: AbortSignal.timeout(8000) }),
    fetch(`${BASE}/api/price`,                             { signal: AbortSignal.timeout(8000) }),
  ]);
  const fg      = await fgRes.json();
  const history = await histRes.json();
  const price   = await priceRes.json();
  const prices  = (history.prices as [number, number][]).map(p => p[1]);
  const ma      = prices.slice(-200).reduce((a: number, b: number) => a + b, 0) / Math.min(prices.length, 200);
  const maPct   = ((price.eur - ma) / ma) * 100;
  return { fgValue: fg.value, maPct };
}

async function sendEmailAlerts(price: number, movePct: number, direction: 'up' | 'down') {
  const { rows } = await pool.query<{ email: string; lang: 'en' | 'de'; unsubscribe_token: string }>(
    `SELECT email, lang, unsubscribe_token FROM subscribers WHERE status = 'confirmed'`
  );
  if (rows.length === 0) return;

  let fgValue = 50; let maPct = 0;
  try { ({ fgValue, maPct } = await fetchFgAndMa()); } catch { /* use defaults */ }

  const signal = movePct < 0 ? 'accumulate' as const : 'caution' as const;

  const sends = rows.map(({ email, lang, unsubscribe_token }) => {
    const unsubscribeUrl = `${BASE}/api/unsubscribe?token=${unsubscribe_token}`;
    const { subject, html } = alertEmail({
      price, movePct, direction, signal, fgValue, maPct, unsubscribeUrl, replyTo: REPLY_TO, lang,
    });
    return resend.emails.send({
      from:     'When to Buy BTC <alerts@whentobuybtc.xyz>',
      to:       email,
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      subject,
      html,
    });
  });

  const results = await Promise.allSettled(sends);
  const failed  = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) console.error(`sendEmailAlerts: ${failed.length}/${rows.length} failed`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureTables();
    const currentPrice = await getCurrentPrice();
    await storePriceSnapshot(currentPrice);

    const refPrice = await getPriceFromHoursAgo(4);
    if (!refPrice) return res.status(200).json({ status: 'no_reference' });

    const movePct   = (currentPrice - refPrice) / refPrice;
    const direction = movePct >= 0 ? 'up' : 'down';

    if (Math.abs(movePct) < MOVE_THRESHOLD)
      return res.status(200).json({ status: 'no_alert', movePct: (movePct * 100).toFixed(2) + '%' });

    const lastAlert = await getLastAlertTime();
    if (lastAlert && Date.now() - lastAlert.getTime() < COOLDOWN_MS)
      return res.status(200).json({ status: 'cooldown', lastAlertHoursAgo: ((Date.now() - lastAlert.getTime()) / 3600000).toFixed(1) });

    await sendEmailAlerts(currentPrice, movePct, direction as 'up' | 'down');
    await logAlert(currentPrice, refPrice, movePct, direction);

    return res.status(200).json({ status: 'alert_sent', direction, movePct: (movePct * 100).toFixed(2) + '%' });

  } catch (err: any) {
    console.error('check-signal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
