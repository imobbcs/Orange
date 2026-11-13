// pages/api/check-signal.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { pool } from '../../lib/db';
import { ensureSendLog, ensureRunColumns, newRunKey, sendOnce, type Outgoing } from '../../lib/send-once';
import { resumeUnfinishedDigest } from '../../lib/digest-run';
import { alertEmail, EMAIL_FROM } from '../../lib/email-templates';
import { getMacroForEmail, includeMacroFor, macroAlertBlock } from '../../lib/macro/email';
import { signalFromApis } from '../../lib/signal';
import { readerCount, READER_GOAL } from '../../lib/subscribers';
import { ensurePrefColumns } from '../../lib/email-prefs';
import { cronAuthorized } from '../../lib/cron-auth';

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE     = process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz';
const REPLY_TO = process.env.REPLY_TO_EMAIL || '';

const MOVE_THRESHOLD = 0.03;              // 3% — compared against the 24h change
const COOLDOWN_MS    = 24 * 60 * 60 * 1000;
const RESUME_WINDOW  = '3 hours';             // an alert run left unfinished this recently is completed on the next run


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

// Logged BEFORE anything is sent (completed_at stays empty until the run finishes), so a crash
// mid-send leaves a row the next run can finish instead of a cooldown-less retry that emails everyone again.
async function startAlertRun(price: number, refPrice: number, movePct: number, direction: string): Promise<string> {
  const key = newRunKey('alert');
  await pool.query(
    'INSERT INTO alert_log (fired_at, price_eur, reference_price_eur, move_pct, direction, run_key) VALUES (NOW(), $1, $2, $3, $4, $5)',
    [price, refPrice, movePct, direction, key]
  );
  return key;
}

async function unfinishedAlertRun(): Promise<{ key: string; price: number; movePct: number; direction: 'up' | 'down' } | null> {
  const r = await pool.query(
    `SELECT run_key, price_eur, move_pct, direction FROM alert_log
     WHERE completed_at IS NULL AND run_key IS NOT NULL AND fired_at > NOW() - INTERVAL '${RESUME_WINDOW}' ORDER BY fired_at DESC LIMIT 1`
  );
  if (!r.rows.length) return null;
  const row = r.rows[0];
  return { key: row.run_key, price: Number(row.price_eur), movePct: Number(row.move_pct), direction: row.direction === 'up' ? 'up' : 'down' };
}

type Readings = { fgValue: number; fgClass: string | null; maPct: number; athPct: number | null; signal: 'accumulate' | 'hold' | 'caution' };

async function fetchSignalData(): Promise<Readings> {
  const [fgRes, histRes, priceRes, athRes] = await Promise.all([
    fetch(`${BASE}/api/fear-greed`,                        { signal: AbortSignal.timeout(8000) }),
    fetch(`${BASE}/api/history?timeframe=1y&currency=eur`, { signal: AbortSignal.timeout(8000) }),
    fetch(`${BASE}/api/price`,                             { signal: AbortSignal.timeout(8000) }),
    fetch(`${BASE}/api/ath`,                               { signal: AbortSignal.timeout(8000) }),
  ]);
  if (!fgRes.ok || !histRes.ok || !priceRes.ok || !athRes.ok) throw new Error('One or more signal APIs failed');
  const fg      = await fgRes.json();
  const history = await histRes.json();
  const price   = await priceRes.json();
  const ath     = await athRes.json();

  const prices  = (history.prices as [number, number][]).map(p => p[1]);
  const fgValue = fg.value as number;
  const fgClass = (fg.value_classification as string) ?? null;
  const { maPct, athPct, state: signal } = signalFromApis(price.eur, prices, ath.ath_eur as number, fgValue, fgClass, price.eur_24h_change ?? null);

  return { fgValue, fgClass, maPct, athPct, signal };
}


async function sendEmailAlerts(
  runKey: string,
  price: number,
  change24h: number,
  movePct: number,
  direction: 'up' | 'down',
  r: Readings,
) {
  await ensurePrefColumns(pool);
  const { rows } = await pool.query<{ email: string; lang: 'en' | 'de'; unsubscribe_token: string }>(
    `SELECT email, lang, unsubscribe_token FROM subscribers WHERE status = 'confirmed' AND wants_alerts`
  );
  if (rows.length === 0) return { sent: 0, failed: 0, skipped: 0 };

  // Market context (off unless MACRO_CONTEXT=test|on). Fetched once; null → emails unchanged.
  const macro = await getMacroForEmail();
  const readers = await readerCount(pool);

  const out: Outgoing[] = rows.map(({ email, lang, unsubscribe_token }) => {
    const unsubscribeUrl = `${BASE}/api/unsubscribe?token=${unsubscribe_token}`;
    const { subject, html, text } = alertEmail({
      price, change24h, movePct, direction, signal: r.signal, fgValue: r.fgValue, fgClass: r.fgClass, maPct: r.maPct, athPct: r.athPct,
      unsubscribeUrl, replyTo: REPLY_TO, lang,
      subscriberCount: readers, subscriberGoal: READER_GOAL,
      marketBlock: macro && includeMacroFor(email) ? macroAlertBlock(macro, lang) : undefined,
    });
    return { email, message: {
      from:     EMAIL_FROM,
      to:       email,
      ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
      // One-click unsubscribe (RFC 8058): Gmail/Yahoo show their own Unsubscribe button
      headers:  { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      subject,
      html,
      text,
    } };
  });
  return sendOnce(pool, resend, runKey, out);
}

async function finishAlertRun(runKey: string, failed: number) {
  // A run with failed batches stays open, so the next run (15 min later) retries just those readers.
  if (failed === 0) await pool.query('UPDATE alert_log SET completed_at = NOW() WHERE run_key = $1', [runKey]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // Only the scheduler may run this: it can email every subscriber.
  if (!cronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await ensureSendLog(pool);
    await ensureRunColumns(pool, 'alert_log');

    // Finish anything a crash or deploy left half-sent: first an alert run, then the Sunday digest.
    const open = await unfinishedAlertRun();
    if (open) {
      let readings: Readings;
      try { readings = await fetchSignalData(); } catch (e: any) {
        return res.status(200).json({ status: 'readings_unavailable' });
      }
      const r = await sendEmailAlerts(open.key, open.price, open.movePct * 100, open.movePct, open.direction, readings);
      await finishAlertRun(open.key, r.failed);
      return res.status(200).json({ status: 'alert_resumed', ...r });
    }
    // A failing digest resume must never block this run's alert check.
    let digest = null;
    try { digest = await resumeUnfinishedDigest(resend); } catch (e: any) { console.error('digest resume failed:', e.message); }
    if (digest) return res.status(200).json({ status: 'digest_resumed', ...digest });

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

    // If the readings can't be fetched, don't invent them: skip this run and try again next time.
    let readings: Readings;
    try { readings = await fetchSignalData(); } catch (e: any) {
      console.error('fetchSignalData failed, alert postponed:', e.message);
      return res.status(200).json({ status: 'readings_unavailable' });
    }

    // reference_price_eur is derived from the 24h change so the logged row stays self-consistent.
    const refPrice = currentPrice / (1 + movePct);
    const runKey = await startAlertRun(currentPrice, refPrice, movePct, direction);
    const result = await sendEmailAlerts(runKey, currentPrice, change24h, movePct, direction, readings);
    await finishAlertRun(runKey, result.failed);

    return res.status(200).json({ status: 'alert_sent', direction, movePct: change24h.toFixed(2) + '%', ...result });

  } catch (err: any) {
    console.error('check-signal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
