// Shared check for the scheduled routes (alerts, weekly digest, email preview).
// Accepts the CRON_SECRET either as "Authorization: Bearer <secret>" or as "?token=<secret>",
// compared in constant time. No secret configured → nothing is authorised.
import { timingSafeEqual } from 'crypto';

export function secretMatches(given: unknown, secret = process.env.CRON_SECRET): boolean {
  if (!secret || typeof given !== 'string' || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function cronAuthorized(req: { headers: Record<string, any>; query: Record<string, any> }, secret = process.env.CRON_SECRET): boolean {
  const auth = String(req.headers?.authorization || '');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return secretMatches(bearer, secret) || secretMatches(req.query?.token, secret);
}
