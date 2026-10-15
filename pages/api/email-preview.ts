// GET /api/email-preview?token=<CRON_SECRET>&type=alert|digest|welcome|confirm&lang=en|de&dir=up|down&state=accumulate|hold|caution
//
// Renders the alert or weekly-digest email in the browser with LIVE market context and
// SAMPLE signal values. Sends nothing, writes nothing. Protected by CRON_SECRET.

import type { NextApiRequest, NextApiResponse } from 'next';
import { alertEmail, digestEmail, welcomeEmail, confirmationEmail, type SignalState } from '../../lib/email-templates';
import { getMacroForEmail, macroAlertBlock, macroDigestBlock, macroMode } from '../../lib/macro/email';

import { secretMatches as tokenOk } from '../../lib/cron-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!tokenOk(req.query.token)) return res.status(401).json({ error: 'Unauthorized' });

  const type = ['digest', 'welcome', 'confirm'].includes(String(req.query.type)) ? String(req.query.type) : 'alert';
  const state: SignalState = req.query.state === 'accumulate' || req.query.state === 'caution' ? req.query.state : 'hold';
  const lang = req.query.lang === 'de' ? 'de' : 'en';
  const down = req.query.dir !== 'up';

  const macro = await getMacroForEmail(true);
  const base = { unsubscribeUrl: '#', replyTo: '', lang, subscriberCount: 612, subscriberGoal: 1000 } as const;

  const sample = { accumulate: { fg: 18, fgClass: 'Extreme Fear', ma: -14.2, ath: -55.1 }, hold: { fg: 50, fgClass: 'Neutral', ma: -1.8, ath: -29.6 }, caution: { fg: 81, fgClass: 'Extreme Greed', ma: 24.5, ath: -3.2 } }[state];
  const { subject, html } = type === 'alert'
    ? alertEmail({
        ...base, price: 74595, movePct: down ? -0.052 : 0.041, direction: down ? 'down' : 'up',
        signal: state, fgValue: sample.fg, fgClass: sample.fgClass, maPct: sample.ma, athPct: sample.ath, change24h: down ? -5.2 : 4.1,
        marketBlock: macro ? macroAlertBlock(macro, lang) : undefined,
      })
    : type === 'digest' ? digestEmail({
        ...base, price: 74595, signal: state, fgValue: sample.fg, fgClass: sample.fgClass, maPct: sample.ma, athPct: sample.ath, change24h: -1.3,
        prevFgValue: 40, prevMaPct: -6, prevAthPct: -31, prevPrice: 72300,
        calc: { amount: 50, startYear: 2019, put: 4700, now: 20693 },
        marketBlock: macro ? macroDigestBlock(macro, lang) : undefined,
      })
    : type === 'welcome' ? welcomeEmail('#', lang, { replyTo: 'x' })
    : confirmationEmail('https://whentobuybtc.xyz/api/confirm?token=sample', '#', lang, { signal: state });

  const q = (t: string, l: string, d = '') => `?token=${encodeURIComponent(String(req.query.token))}&type=${t}&lang=${l}${d}`;
  const banner = `<div style="font-family:Courier New,monospace;font-size:12px;line-height:1.6;background:#F7931A;color:#09080A;padding:10px 16px;">
    <b>PREVIEW, nothing sent.</b> Market block uses LIVE data${macro ? '' : ' (<b>unavailable right now, so the email shows without it</b>)'}; signal numbers are samples.
    Rollout switch MACRO_CONTEXT = <b>${macroMode()}</b>.<br>
    Subject: <b>${subject.replace(/</g, '&lt;')}</b><br>
    <a href="${q('digest', 'en')}">Digest EN</a> · <a href="${q('digest', 'de')}">Digest DE</a> ·
    <a href="${q('alert', 'en', '&dir=down')}">Alert EN ↓</a> · <a href="${q('alert', 'en', '&dir=up')}">Alert EN ↑</a> · <a href="${q('alert', 'de', '&dir=down')}">Alert DE ↓</a> ·
    <a href="${q('welcome', 'en')}">Welcome EN</a> · <a href="${q('welcome', 'de')}">Welcome DE</a> · <a href="${q('confirm', 'en')}">Confirm EN</a> · <a href="${q('confirm', 'de')}">Confirm DE</a> ·
    State: <a href="${q(type, lang, '&state=accumulate')}">Cold</a> · <a href="${q(type, lang, '&state=hold')}">Mild</a> · <a href="${q(type, lang, '&state=caution')}">Hot</a>
  </div>`;

  const i = html.indexOf('<body');
  const j = i >= 0 ? html.indexOf('>', i) : -1;
  const out = j >= 0 ? html.slice(0, j + 1) + banner + html.slice(j + 1) : banner + html;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(out);
}
