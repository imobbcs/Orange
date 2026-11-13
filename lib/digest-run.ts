// The Sunday digest run. Used by /api/weekly-digest (Sunday, cron-job.org) to start a run, and by
// /api/check-signal (every 15 min) to finish one that a crash or deploy left half-sent.
import type { Resend } from 'resend';
import { pool } from './db';
import { digestEmail, calcHookForWeek, weekStats, EMAIL_FROM, type SignalState, type CalcHook } from './email-templates';
import { computeDca } from './dca';
import { readerCount, READER_GOAL } from './subscribers';
import { ensurePrefColumns } from './email-prefs';
import { getMacroForEmail, includeMacroFor, macroDigestBlock } from './macro/email';
import { signalFromApis } from './signal';
import { ensureSendLog, ensureRunColumns, newRunKey, sendOnce, type Outgoing, type RunResult } from './send-once';

const BASE     = process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz';
const REPLY_TO = process.env.REPLY_TO_EMAIL || '';
const COOLDOWN_HOURS = 24;
const RESUME_WINDOW  = '6 hours';

// The "What if?" card: a real result from the calculator's model (lib/dca.ts) on real
// monthly history. Any failure → the card is left out; the digest never waits on it.
async function fetchCalcHook(priceEur: number): Promise<CalcHook | null> {
  try {
    const r = await fetch(`${BASE}/api/btc-history-monthly`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const data = await r.json();
    const { amount, startYear } = calcHookForWeek();
    const d = computeDca(data.monthly || {}, amount, startYear, priceEur);
    return d.months > 12 ? { amount, startYear, put: d.put, now: d.now } : null;
  } catch (e: any) {
    console.error('weekly-digest: calculator card skipped:', e?.message || e);
    return null;
  }
}

export async function fetchSignalData() {
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
  const currentPrice = price.eur as number;
  const fgValue      = fg.value as number;
  const change24h    = price.eur_24h_change as number;
  const fgClass      = (fg.value_classification as string) ?? null;
  const { maPct, athPct, state } = signalFromApis(currentPrice, prices, ath.ath_eur as number, fgValue, fgClass, change24h);
  const signal: SignalState = state;
  const week = weekStats(history.prices as [number, number][]);
  return { currentPrice, fgValue, fgClass, maPct, athPct, change24h, signal, week };
}


export async function ensureDigestTables() {
  // Idempotent: delta-tracking columns, then the run columns, then the per-recipient log.
  await pool.query(`
    ALTER TABLE digest_log ADD COLUMN IF NOT EXISTS fg_value INTEGER;
    ALTER TABLE digest_log ADD COLUMN IF NOT EXISTS ma_pct NUMERIC;
    ALTER TABLE digest_log ADD COLUMN IF NOT EXISTS ath_pct NUMERIC;
    ALTER TABLE digest_log ADD COLUMN IF NOT EXISTS price_eur NUMERIC;
  `);
  await ensureRunColumns(pool, 'digest_log');
  await ensureSendLog(pool);
}

/** Renders and sends this run's digest to every confirmed reader who wants it and hasn't had it yet. */
async function sendDigestRun(resend: Resend, runKey: string, runSentAt: Date | null): Promise<RunResult & { recipients: number }> {
  // Last week's values for the delta copy: the newest run before this one.
  const prev = (await pool.query(
    runSentAt
      ? 'SELECT fg_value, ma_pct, ath_pct, price_eur FROM digest_log WHERE sent_at < $1 ORDER BY sent_at DESC LIMIT 1'
      : 'SELECT fg_value, ma_pct, ath_pct, price_eur FROM digest_log ORDER BY sent_at DESC LIMIT 1',
    runSentAt ? [runSentAt] : [],
  )).rows[0];
  const num = (v: unknown) => (v != null ? Number(v) : undefined);

  const { currentPrice, fgValue, fgClass, maPct, athPct, change24h, signal, week } = await fetchSignalData();
  if (!runSentAt) {
    // Starting a new run: log it before anything is sent (this row is also next week's "last week").
    await pool.query(
      'INSERT INTO digest_log (sent_at, fg_value, ma_pct, ath_pct, price_eur, run_key) VALUES (NOW(), $1, $2, $3, $4, $5)',
      [fgValue, maPct, athPct, currentPrice, runKey],
    );
  }

  await ensurePrefColumns(pool);
  const { rows } = await pool.query<{ email: string; lang: 'en' | 'de'; unsubscribe_token: string }>(
    `SELECT email, lang, unsubscribe_token FROM subscribers WHERE status = 'confirmed' AND wants_digest`
  );
  const macro = await getMacroForEmail();
  const [readers, calc] = await Promise.all([readerCount(pool), fetchCalcHook(currentPrice)]);

  const out: Outgoing[] = rows.map(({ email, lang, unsubscribe_token }) => {
    const unsubscribeUrl = `${BASE}/api/unsubscribe?token=${unsubscribe_token}`;
    const { subject, html, text } = digestEmail({
      price: currentPrice, signal, fgValue, fgClass, maPct, athPct, change24h,
      unsubscribeUrl, replyTo: REPLY_TO, lang,
      prevFgValue: num(prev?.fg_value), prevMaPct: num(prev?.ma_pct), prevAthPct: num(prev?.ath_pct), prevPrice: num(prev?.price_eur), calc, week,
      subscriberCount: readers, subscriberGoal: READER_GOAL,
      marketBlock: macro && includeMacroFor(email) ? macroDigestBlock(macro, lang) : undefined,
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
  const r = await sendOnce(pool, resend, runKey, out);
  // Failed batches keep the run open; the 15-minute cron retries just those readers.
  if (r.failed === 0) await pool.query('UPDATE digest_log SET completed_at = NOW() WHERE run_key = $1', [runKey]);
  return { ...r, recipients: rows.length };
}

/** Sunday: start this week's run, unless one went out in the last 24 hours. */
export async function startDigest(resend: Resend) {
  await ensureDigestTables();
  const last = (await pool.query('SELECT sent_at FROM digest_log ORDER BY sent_at DESC LIMIT 1')).rows[0];
  if (last) {
    const hoursSinceLast = (Date.now() - new Date(last.sent_at).getTime()) / 3600000;
    if (hoursSinceLast < COOLDOWN_HOURS) return { status: 'cooldown', hoursSinceLast: hoursSinceLast.toFixed(1) };
  }
  const r = await sendDigestRun(resend, newRunKey('digest'), null);
  return { status: r.recipients ? 'done' : 'no_subscribers', ...r };
}

/** Finishes a digest run a crash left half-sent (null when there is none). */
export async function resumeUnfinishedDigest(resend: Resend) {
  await ensureDigestTables();
  const open = (await pool.query(
    `SELECT run_key, sent_at FROM digest_log
     WHERE completed_at IS NULL AND run_key IS NOT NULL AND sent_at > NOW() - INTERVAL '${RESUME_WINDOW}'
     ORDER BY sent_at DESC LIMIT 1`
  )).rows[0];
  if (!open) return null;
  return sendDigestRun(resend, open.run_key, new Date(open.sent_at));
}
