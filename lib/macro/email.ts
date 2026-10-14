// Market-context block for the alert and weekly-digest emails, plus the rollout switch.
//
// Rollout via Railway env vars, read on every send (changing a var redeploys the service):
//   MACRO_CONTEXT=off   (default)  emails are byte-for-byte identical to before
//   MACRO_CONTEXT=test             only MACRO_CONTEXT_TEST_EMAIL gets the block
//   MACRO_CONTEXT=on               every subscriber gets the block
// Any failure fetching market data → no block, email sends exactly as before.

import { buildMacro, MacroResponse } from './build';
import type { Series } from './compute';

type Lang = 'en' | 'de';
type Mode = 'off' | 'test' | 'on';

export function macroMode(): Mode {
  const v = (process.env.MACRO_CONTEXT || 'off').trim().toLowerCase();
  return v === 'on' || v === 'test' ? v : 'off';
}

export function includeMacroFor(email: string): boolean {
  const mode = macroMode();
  if (mode === 'on') return true;
  if (mode === 'test') {
    const t = (process.env.MACRO_CONTEXT_TEST_EMAIL || '').trim().toLowerCase();
    return t.length > 0 && email.trim().toLowerCase() === t;
  }
  return false;
}

/** Fetches market data once per send run. Never throws; returns null when off, slow or empty. */
export async function getMacroForEmail(force = false, timeoutMs = 12000): Promise<MacroResponse | null> {
  if (!force && macroMode() === 'off') return null;
  try {
    const m = await Promise.race([
      buildMacro(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (!m) return null;
    const anyMarket = Object.values(m.markets).some(Boolean);
    return anyMarket ? m : null;
  } catch (err: any) {
    console.error('macro email: fetch failed, sending without block:', err?.message || err);
    return null;
  }
}

// ── Rendering ────────────────────────────────────────────────────────

const MONO = "font-family:'Courier New',Courier,monospace;";
const SERIF = "font-family:Georgia,'Times New Roman',Times,serif;";
const MUTED = 'rgba(237,232,222,0.55)';

const L = {
  en: {
    alertLabel: 'Market context', lastSession: 'last US session',
    digestLabel: 'Wider market this week', week: '1W', asOf: 'as of',
    names: { ndx: 'Nasdaq', spx: 'S&P 500', dxy: 'US Dollar', us10y: 'US 10Y yield', gold: 'Gold' } as Record<string, string>,
    corr: 'BTC and Nasdaq, 30-day correlation',
    corrWords: ['weak', 'moderate', 'strong'],
    corrLine: [
      'Bitcoin has been moving largely on its own this month.',
      'Bitcoin has been moving partly in step with US tech stocks this month.',
      'Bitcoin has been moving closely with US tech stocks this month.',
    ],
    locale: 'en-GB', num: 'en-US',
  },
  de: {
    alertLabel: 'Marktumfeld', lastSession: 'letzte US-Sitzung',
    digestLabel: 'Gesamtmarkt diese Woche', week: '1W', asOf: 'Stand',
    names: { ndx: 'Nasdaq', spx: 'S&P 500', dxy: 'US-Dollar', us10y: 'US 10J Rendite', gold: 'Gold' } as Record<string, string>,
    corr: 'BTC und Nasdaq, 30-Tage-Korrelation',
    corrWords: ['schwach', 'mittel', 'stark'],
    corrLine: [
      'Bitcoin hat sich diesen Monat weitgehend eigenständig bewegt.',
      'Bitcoin hat sich diesen Monat teilweise im Gleichschritt mit US-Tech-Aktien bewegt.',
      'Bitcoin hat sich diesen Monat eng mit US-Tech-Aktien bewegt.',
    ],
    locale: 'de-DE', num: 'de-DE',
  },
};

function fmt(v: number, dp: number, lang: Lang): string {
  return v.toLocaleString(L[lang].num, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function chg(v: number | null | undefined, unit: 'pct' | 'bps', lang: Lang): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return `<span class="em2" style="color:${MUTED};">n/a</span>`;
  const color = Math.abs(v) < 0.05 ? MUTED : v > 0 ? '#4ADE80' : '#F87171';
  const sign = v > 0 ? '+' : v < 0 ? '&#8722;' : '';
  const body = unit === 'bps' ? `${sign}${fmt(Math.abs(v), 0, lang)}bp` : `${sign}${fmt(Math.abs(v), 2, lang)}%`;
  return `<span${color === MUTED ? ' class="em2"' : ''} style="color:${color};">${body}</span>`;
}

function day(iso: string, lang: Lang): string {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString(L[lang].locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function corrIndex(r: number): number {
  return Math.abs(r) < 0.2 ? 0 : Math.abs(r) < 0.5 ? 1 : 2;
}

function frame(label: string, inner: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      <tr><td style="border-left:2px solid #F7931A;padding:12px 16px;background-color:rgba(247,147,26,0.05);">
        <p class="em2" style="margin:0 0 8px;${MONO}font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">${label}</p>
        ${inner}
      </td></tr>
    </table>`;
}

const ORDER: [keyof MacroResponse['markets'], 'pct' | 'bps', number][] = [
  ['ndx', 'pct', 0], ['spx', 'pct', 0], ['dxy', 'pct', 2], ['us10y', 'bps', 2], ['gold', 'pct', 0],
];

/** Alert email: what the wider market did in the last US session, plus the context sentence. */
export function macroAlertBlock(m: MacroResponse, lang: Lang): string {
  const t = L[lang];
  const parts = ORDER.filter(([k]) => m.markets[k]).map(([k, unit]) => {
    const s = m.markets[k] as Series;
    return `${t.names[k]} ${chg(s.change1d, unit, lang)}`;
  });
  if (parts.length === 0) return '';
  const when = m.lastUsClose ? ` &#183; ${t.lastSession}, ${day(m.lastUsClose, lang)}` : '';
  const sentence = m.context
    ? `<p class="em" style="margin:0 0 8px;${SERIF}font-size:15px;font-style:italic;line-height:1.6;color:#EDE8DE;">${m.context[lang]}${
        m.context.dollar ? ` <span class="em2" style="color:rgba(237,232,222,0.7);">${m.context.dollar[lang]}</span>` : ''}</p>`
    : '';
  const line = `<p class="em" style="margin:0;${MONO}font-size:12px;line-height:1.7;color:rgba(237,232,222,0.88);">${parts.join(' &#183; ')}</p>`;
  return frame(t.alertLabel + when, sentence + line);
}

/** Weekly digest: 1-week change table + 30-day correlation in plain words. */
export function macroDigestBlock(m: MacroResponse, lang: Lang): string {
  const t = L[lang];
  const rows = ORDER.filter(([k]) => m.markets[k]).map(([k, unit, dp]) => {
    const s = m.markets[k] as Series;
    const val = k === 'gold' ? `$${fmt(s.value, 0, lang)}` : k === 'us10y' ? `${fmt(s.value, dp, lang)}%` : fmt(s.value, dp, lang);
    const stale = s.stale ? ` <span class="em2" style="color:${MUTED};">(${t.asOf} ${day(s.date, lang)})</span>` : '';
    return `<tr>
          <td class="em" style="padding:4px 0;${MONO}font-size:12px;color:rgba(237,232,222,0.88);">${t.names[k]}${stale}</td>
          <td class="et" align="right" style="padding:4px 12px;${MONO}font-size:12px;color:#EDE8DE;">${val}</td>
          <td align="right" style="padding:4px 0;${MONO}font-size:12px;">${chg(s.change7d, unit, lang)}</td>
        </tr>`;
  });
  if (rows.length === 0) return '';
  const head = `<tr><td></td><td></td><td class="em2" align="right" style="padding:0 0 4px;${MONO}font-size:9px;letter-spacing:0.14em;color:${MUTED};">${t.week}</td></tr>`;
  const table = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">${head}${rows.join('')}</table>`;
  const r = m.correlation30d;
  const corr = r === null || r === undefined
    ? ''
    : `<p class="em" style="margin:12px 0 0;${SERIF}font-size:14px;line-height:1.7;color:rgba(237,232,222,0.88);">${t.corrLine[corrIndex(r)]}
        <span class="em2" style="${MONO}font-size:11px;color:${MUTED};">${t.corr}: ${fmt(r, 2, lang)} (${t.corrWords[corrIndex(r)]})</span></p>`;
  return frame(t.digestLabel, table + corr);
}
