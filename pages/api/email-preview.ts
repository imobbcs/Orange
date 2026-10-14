// GET /api/email-preview?token=<CRON_SECRET>&type=alert|digest&lang=en|de&dir=up|down
//
// Renders the alert or weekly-digest email in the browser with LIVE market context and
// SAMPLE signal values. Sends nothing, writes nothing. Protected by CRON_SECRET.

import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';
import { alertEmail, digestEmail } from '../../lib/email-templates';
import { getMacroForEmail, macroAlertBlock, macroDigestBlock, macroMode } from '../../lib/macro/email';

function tokenOk(given: unknown): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!tokenOk(req.query.token)) return res.status(401).json({ error: 'Unauthorized' });

  const type = req.query.type === 'digest' ? 'digest' : 'alert';
  const lang = req.query.lang === 'de' ? 'de' : 'en';
  const down = req.query.dir !== 'up';

  const macro = await getMacroForEmail(true);
  const base = { unsubscribeUrl: '#', replyTo: '', lang, subscriberCount: 612, subscriberGoal: 1000 } as const;

  const { subject, html } = type === 'alert'
    ? alertEmail({
        ...base, price: 73315, movePct: down ? -0.052 : 0.041, direction: down ? 'down' : 'up',
        signal: 'hold', fgValue: 31, maPct: -4.2, change24h: down ? -5.2 : 4.1,
        marketBlock: macro ? macroAlertBlock(macro, lang) : undefined,
      })
    : digestEmail({
        ...base, price: 73315, signal: 'hold', fgValue: 31, maPct: -4.2, athPct: -35.1, change24h: -1.3,
        prevFgValue: 40, prevMaPct: -2, prevAthPct: -30,
        marketBlock: macro ? macroDigestBlock(macro, lang) : undefined,
      });

  const q = (t: string, l: string, d = '') => `?token=${encodeURIComponent(String(req.query.token))}&type=${t}&lang=${l}${d}`;
  const banner = `<div style="font-family:Courier New,monospace;font-size:12px;line-height:1.6;background:#F7931A;color:#09080A;padding:10px 16px;">
    <b>PREVIEW, nothing sent.</b> Market block uses LIVE data${macro ? '' : ' (<b>unavailable right now, so the email shows without it</b>)'}; signal numbers are samples.
    Rollout switch MACRO_CONTEXT = <b>${macroMode()}</b>.<br>
    Subject: <b>${subject.replace(/</g, '&lt;')}</b><br>
    <a href="${q('alert', 'en', '&dir=down')}">Alert EN ↓</a> · <a href="${q('alert', 'en', '&dir=up')}">Alert EN ↑</a> ·
    <a href="${q('alert', 'de', '&dir=down')}">Alert DE ↓</a> · <a href="${q('digest', 'en')}">Digest EN</a> · <a href="${q('digest', 'de')}">Digest DE</a>
  </div>`;

  const i = html.indexOf('<body');
  const j = i >= 0 ? html.indexOf('>', i) : -1;
  const out = j >= 0 ? html.slice(0, j + 1) + banner + html.slice(j + 1) : banner + html;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(out);
}
