// GET|POST /api/admin/backup?token=<CRON_SECRET>             → emails the subscriber list as CSV to the owner
// GET      /api/admin/backup?token=<CRON_SECRET>&download=1  → downloads the CSV instead
//
// Run weekly by cron-job.org ("When To Buy BTC Backup"). Sent to BACKUP_EMAIL, or REPLY_TO_EMAIL if
// that isn't set. Pings HEALTHCHECK_URL_BACKUP after each run (lib/heartbeat.ts).
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { Resend } from 'resend';
import { cronAuthorized } from '../../../lib/cron-auth';
import { withHeartbeat } from '../../../lib/heartbeat';
import { toCsv, backupSummary } from '../../../lib/backup';
import { EMAIL_FROM } from '../../../lib/email-templates';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!cronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const r = await pool.query('SELECT * FROM subscribers ORDER BY id');
    const csv = toCsv(r.rows, r.fields.map((f) => f.name));
    const day = new Date().toISOString().slice(0, 10);
    const filename = `whentobuybtc-subscribers-${day}.csv`;
    const sum = backupSummary(r.rows);

    if (req.query.download) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csv);
    }

    const to = process.env.BACKUP_EMAIL || process.env.REPLY_TO_EMAIL;
    if (!to) return res.status(500).json({ error: 'Set BACKUP_EMAIL (or REPLY_TO_EMAIL) to receive the backup' });
    if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY is not set' });

    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Subscriber backup ${day}: ${sum.confirmed} confirmed`,
      text: `Weekly backup of the subscribers table, attached as CSV.\n\n`
        + `Confirmed: ${sum.confirmed}\nPending: ${sum.pending}\nUnsubscribed: ${sum.unsubscribed}\nTotal rows: ${sum.total}\n\n`
        + `Keep this email. It holds every reader's address and their unsubscribe link tokens.\n`,
      attachments: [{ filename, content: Buffer.from(csv, 'utf8') }],
    });
    if (result.error) return res.status(502).json({ error: 'Resend: ' + JSON.stringify(result.error) });

    return res.status(200).json({ status: 'sent', ...sum });
  } catch (err: any) {
    console.error('backup error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

export default withHeartbeat('BACKUP', cronAuthorized, handler);
