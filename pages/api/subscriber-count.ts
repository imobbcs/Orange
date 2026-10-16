// pages/api/subscriber-count.ts
// Returns the number of confirmed email subscribers, floored to nearest 10.
// Same response shape as /api/visitor-count: { subscribers: number }
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { READER_MIN_SHOWN } from '../../lib/subscribers';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM subscribers WHERE status = 'confirmed'`
    );
    const exact = parseInt(result.rows[0].count, 10);
    // Floor to nearest 10 — never overpromise
    const floored = Math.max(0, Math.floor(exact / 10) * 10);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    // Small lists aren't social proof: report 0 so the site hides the line until the list has grown
    return res.status(200).json({ subscribers: floored >= READER_MIN_SHOWN ? floored : 0 });
  } catch (err: any) {
    console.error('subscriber-count error:', err.message);
    return res.status(500).json({ subscribers: 0 });
  }
}
