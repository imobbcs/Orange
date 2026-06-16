// pages/api/unsubscribe.ts
// One-click unsubscribe from the footer of every email.
// RFC 8058 compliant: GET is enough (no second confirmation page).
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
    await pool.query(
      `UPDATE subscribers
       SET status = 'unsubscribed', unsubscribed_at = NOW()
       WHERE unsubscribe_token = $1`,
      [token]
    );

    // Always redirect cleanly — don't expose whether the token was valid
    return res.redirect(`${BASE}?email=unsubscribed`);

  } catch (err: any) {
    console.error('unsubscribe error:', err.message);
    return res.redirect(`${BASE}?email=error`);
  }
}
