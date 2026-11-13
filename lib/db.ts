// One Postgres pool for the whole app (it used to be one per API file, seven in total).
// Kept on globalThis so dev hot-reloads don't open a new pool on every change.
import { Pool } from 'pg';

const g = globalThis as unknown as { __wtbPool?: Pool };
export const pool: Pool = g.__wtbPool ?? (g.__wtbPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 }));
