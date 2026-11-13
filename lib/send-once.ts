// Sends one email run (an alert or a weekly digest) so that nobody gets it twice and a crash
// can be picked up where it stopped.
//
// - Every recipient of a run is recorded in email_sends (run key + email) BEFORE their email goes
//   out. A rerun of the same key skips everyone already recorded. A failed batch is un-recorded,
//   so the next run retries exactly those people.
// - Emails go out through Resend's batch endpoint, 100 per call, paced for the 2 calls/second limit.
//   1,000 readers ≈ 10 calls ≈ 6 seconds (it was ~1 email per 250ms, one by one).
import type { CreateEmailOptions } from 'resend';

export interface Db { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> }
export interface BatchSender { batch: { send: (emails: CreateEmailOptions[]) => Promise<{ data: unknown; error: unknown }> } }
export interface Outgoing { email: string; message: CreateEmailOptions }
export interface RunResult { sent: number; failed: number; skipped: number }

export const BATCH_SIZE = 100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function ensureSendLog(db: Db) {
  await db.query(`CREATE TABLE IF NOT EXISTS email_sends (
    send_key TEXT NOT NULL,
    email    TEXT NOT NULL,
    sent_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (send_key, email)
  )`);
}

export async function sendOnce(db: Db, sender: BatchSender, key: string, out: Outgoing[], gapMs = 600): Promise<RunResult> {
  const done = new Set((await db.query('SELECT email FROM email_sends WHERE send_key = $1', [key])).rows.map((r) => r.email));
  const todo = out.filter((o) => !done.has(o.email));
  const res: RunResult = { sent: 0, failed: 0, skipped: out.length - todo.length };

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const chunk = todo.slice(i, i + BATCH_SIZE);
    // Claim first; only send to the rows this run actually claimed (a parallel run can't double-send).
    const claimed = new Set((await db.query(
      `INSERT INTO email_sends (send_key, email) SELECT $1, unnest($2::text[]) ON CONFLICT DO NOTHING RETURNING email`,
      [key, chunk.map((c) => c.email)],
    )).rows.map((r) => r.email));
    const mine = chunk.filter((c) => claimed.has(c.email));
    res.skipped += chunk.length - mine.length;
    if (!mine.length) continue;

    let error: unknown = null;
    try { error = (await sender.batch.send(mine.map((m) => m.message))).error; } catch (e) { error = e; }
    if (error) {
      console.error(`sendOnce ${key}: batch of ${mine.length} failed:`, JSON.stringify((error as any)?.message ?? error));
      await db.query('DELETE FROM email_sends WHERE send_key = $1 AND email = ANY($2::text[])', [key, mine.map((m) => m.email)]);
      res.failed += mine.length;
    } else {
      res.sent += mine.length;
    }
    if (i + BATCH_SIZE < todo.length) await sleep(gapMs);
  }
  console.log(`sendOnce ${key}: ${res.sent} sent, ${res.failed} failed, ${res.skipped} already had it`);
  return res;
}

/** Adds run_key + completed_at to a run table. Rows that exist when completed_at is added count as completed,
 *  so deploying this never re-sends an older run. */
export async function ensureRunColumns(db: Db, table: 'alert_log' | 'digest_log') {
  await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS run_key TEXT`);
  await db.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NOW()`);
  await db.query(`ALTER TABLE ${table} ALTER COLUMN completed_at DROP DEFAULT`);
}

export function newRunKey(kind: 'alert' | 'digest'): string {
  return `${kind}:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`;
}
