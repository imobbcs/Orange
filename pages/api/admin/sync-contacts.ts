// GET /api/admin/sync-contacts?token=<CRON_SECRET>            → preview: how many would be synced
// GET /api/admin/sync-contacts?token=<CRON_SECRET>&run=1      → start the backfill in the background
// GET /api/admin/sync-contacts?token=<CRON_SECRET>&status=1   → progress of the current / last run
//
// One-off backfill of Postgres subscribers into Resend Contacts (subscribers who signed up before
// the live sync existed). Uses the same syncResendContact() as the signup flow, so it is idempotent:
// running it twice just re-applies the same state. Confirmed → subscribed, unsubscribed → unsubscribed
// (so a Resend Broadcast can never reach them), pending (never confirmed) → skipped.
// Paced for Resend's default limit of 2 requests/second; each contact can take two calls.
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { cronAuthorized } from '../../../lib/cron-auth';
import { syncResendContact } from '../../../lib/resend-contact';
import { backfillContacts } from '../../../lib/contact-backfill';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const GAP_MS = 1100;

type Run = { startedAt: string; finishedAt: string | null; total: number; done: number; subscribed: number; unsubscribed: number };
let run: Run | null = null;
let running = false;

async function rows() {
  const r = await pool.query<{ email: string; status: string }>(
    `SELECT email, status FROM subscribers WHERE status IN ('confirmed', 'unsubscribed') ORDER BY id`
  );
  return r.rows;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!cronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY is not set' });

  if (req.query.status) return res.status(200).json({ running, run });

  const list = await rows();
  const counts = { confirmed: list.filter((r) => r.status === 'confirmed').length, unsubscribed: list.filter((r) => r.status === 'unsubscribed').length };
  const minutes = Math.ceil((list.length * GAP_MS) / 60000);

  if (!req.query.run) {
    return res.status(200).json({ preview: true, ...counts, total: list.length, estimatedMinutes: minutes,
      next: 'Add &run=1 to start. Check progress with &status=1.' });
  }
  if (running) return res.status(409).json({ error: 'A backfill is already running', run });

  running = true;
  run = { startedAt: new Date().toISOString(), finishedAt: null, total: list.length, done: 0, subscribed: 0, unsubscribed: 0 };
  res.status(202).json({ started: true, ...counts, total: list.length, estimatedMinutes: minutes, status: 'Add &status=1 (instead of &run=1) to check progress.' });

  // Runs after the response; the Node server on Railway keeps going in the background.
  (async () => {
    try {
      await backfillContacts(list, syncResendContact, run!, GAP_MS);
      console.log(`sync-contacts: done, ${run!.subscribed} subscribed, ${run!.unsubscribed} unsubscribed`);
    } catch (e: any) {
      console.error('sync-contacts: stopped:', e?.message || e);
    } finally {
      run!.finishedAt = new Date().toISOString();
      running = false;
    }
  })();
}
