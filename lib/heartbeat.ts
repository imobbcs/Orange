// Dead-man's switch for the scheduled jobs. Each job pings its own check URL when it finishes
// (healthchecks.io or any service with the same URL scheme): a plain ping means "ran fine",
// "<url>/fail" means "ran and failed". If a ping doesn't arrive on schedule, the service emails
// the owner, so a job that silently stops running is noticed within hours, not weeks.
//
// URLs come from env (HEALTHCHECK_URL_SIGNAL, HEALTHCHECK_URL_DIGEST, HEALTHCHECK_URL_BACKUP).
// Not set → no ping. A ping never throws and never holds a job up for more than 5 seconds.

export type Job = 'SIGNAL' | 'DIGEST' | 'BACKUP';

export function heartbeatUrl(job: Job, ok: boolean, env: Record<string, string | undefined> = process.env): string | null {
  const base = (env[`HEALTHCHECK_URL_${job}`] || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\//.test(base)) return null;
  return ok ? base : `${base}/fail`;
}

export async function heartbeat(job: Job, ok: boolean, message = ''): Promise<void> {
  const url = heartbeatUrl(job, ok);
  if (!url) return;
  try {
    await fetch(url, { method: 'POST', body: message.slice(0, 10000), signal: AbortSignal.timeout(5000) });
  } catch (e: any) {
    console.error(`heartbeat ${job}: ping failed:`, e?.message || e);
  }
}

type Res = { statusCode: number; json: (body: any) => any };

/** Wraps a scheduled API route: once an authorised run has answered, pings the job's check URL
 *  (fail on a 5xx or a thrown error) with the route's JSON reply as the message. Requests that
 *  aren't authorised never ping, so a stranger hitting the URL can't fake a run or raise an alarm. */
export function withHeartbeat<Q, R extends Res>(job: Job, isAuthorized: (req: Q) => boolean, handler: (req: Q, res: R) => Promise<unknown>) {
  return async (req: Q, res: R) => {
    if (!isAuthorized(req)) return handler(req, res);
    let reply: unknown = null;
    const json = res.json.bind(res);
    res.json = (body: any) => { reply = body; return json(body); };
    try {
      await handler(req, res);
    } catch (e: any) {
      await heartbeat(job, false, String(e?.message || e));
      throw e;
    }
    const failed = res.statusCode >= 500 || (reply as any)?.failed > 0;
    await heartbeat(job, !failed, JSON.stringify(reply));
  };
}
