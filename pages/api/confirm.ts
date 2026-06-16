// pages/api/confirm.ts
// Handles double opt-in confirmation clicks from the email link.
// Redirects to the site with a query param so the UI can show a success state.
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.redirect(`${BASE}?email=invalid`);
  }

  try {
    const result = await pool.query(
      `UPDATE subscribers
       SET status = 'confirmed', confirmed_at = NOW()
       WHERE confirm_token = $1 AND status = 'pending'
       RETURNING id`,
      [token]
    );

    if (result.rowCount === 0) {
      // Token not found or already confirmed — redirect cleanly either way
      return res.redirect(`${BASE}?email=already`);
    }

    return res.redirect(`${BASE}?email=confirmed`);

  } catch (err: any) {
    console.error('confirm error:', err.message);
    return res.redirect(`${BASE}?email=error`);
  }
}
