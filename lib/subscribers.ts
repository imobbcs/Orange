// Live reader count for the emails, floored to the nearest 10 like the site (never overpromise).
// Returns undefined on any error, and the emails then simply leave the counter out.
import type { Pool } from 'pg';

export async function readerCount(pool: Pool): Promise<number | undefined> {
  try {
    const r = await pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM subscribers WHERE status = 'confirmed'`);
    const n = Math.floor(parseInt(r.rows[0].count, 10) / 10) * 10;
    return n > 0 ? n : undefined;
  } catch (e: any) {
    console.error('readerCount failed:', e?.message || e);
    return undefined;
  }
}

export const READER_GOAL = 1000;
