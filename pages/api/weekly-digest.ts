// pages/api/weekly-digest.ts
// Called by cron-job.org ("When To Buy BTC Weekly"): POST every Sunday 15:00 UTC, Authorization: Bearer CRON_SECRET
// The run itself lives in lib/digest-run.ts (so /api/check-signal can finish one a crash left half-sent).
import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { cronAuthorized } from '../../lib/cron-auth';
import { startDigest } from '../../lib/digest-run';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!cronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    return res.status(200).json(await startDigest(resend));
  } catch (err: any) {
    console.error('weekly-digest error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
