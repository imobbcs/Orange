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

/** Ways a secret typed or pasted into a browser address bar gets changed: a "+" arrives as a
 *  space, a copied "Bearer " prefix, surrounding whitespace. Each is still compared in constant time. */
function tokenCandidates(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw) return [];
  const t = raw.trim().replace(/^Bearer\s+/i, '');
  return Array.from(new Set([raw, t, t.replace(/ /g, '+')]));
}

export function cronAuthorized(req: { headers: Record<string, any>; query: Record<string, any> }, secret = process.env.CRON_SECRET): boolean {
  const auth = String(req.headers?.authorization || '');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const q = Array.isArray(req.query?.token) ? req.query.token[0] : req.query?.token;
  return secretMatches(bearer, secret) || tokenCandidates(q).some((c) => secretMatches(c, secret));
}
