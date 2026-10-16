// lib/email-templates.ts
// All email HTML, rendered server-side; Resend is only the sending layer.
//
// Design (v2): the email looks like the site. A temperature band (Cold / Mild / Hot) with the
// price, then the three readings with a plain one-liner each, then one thing to explore.
// Mobile-first single column, table layout, dark by default with a light-mode override.
//
// Voice: describes the market, third person, never buy/sell/wait advice, no em dashes.
// Every number shown comes from the same model as the site (lib/signal.ts, lib/dca.ts).

export type Lang        = 'en' | 'de';
export type SignalState = 'accumulate' | 'hold' | 'caution';

import { computeSignal, fgBand, fgScore, maScore } from './signal';
import { htmlToText } from './email-text';

/** Sender for every email. A person's name reads warmer than a brand and fits "I read every reply". */
export const EMAIL_FROM = 'Imo from When to Buy BTC <alerts@whentobuybtc.xyz>';

const SITE = 'https://whentobuybtc.xyz';

// ─── Palette ──────────────────────────────────────────────────────────────────

const TEMP: Record<SignalState, { hex: string; rgb: string; light: string; emoji: string }> = {
  accumulate: { hex: '#8EC9FF', rgb: '142,201,255', light: '#2F6FA8', emoji: '❄️' },
  hold:       { hex: '#F2C46B', rgb: '242,196,107', light: '#8A6208', emoji: '🌤️' },
  caution:    { hex: '#F7931A', rgb: '247,147,26',  light: '#B35A00', emoji: '🔥' },
};
const LEAN_STATE = (n: number): SignalState => (n > 0 ? 'accumulate' : n < 0 ? 'caution' : 'hold');

const MONO  = "font-family:'Courier New',Courier,monospace;";
const SERIF = "font-family:Georgia,'Times New Roman',Times,serif;";
const SANS  = 'font-family:Arial,Helvetica,sans-serif;';
const INK   = '#EDE8DE';
const MUTED = 'rgba(237,232,222,0.62)';
const SOFT  = 'rgba(237,232,222,0.82)';

// ─── Formatting ───────────────────────────────────────────────────────────────

function loc(lang: Lang): string { return lang === 'de' ? 'de-DE' : 'en-GB'; }
function eur(n: number, lang: Lang = 'de'): string {
  const v = Math.round(n).toLocaleString(loc(lang));
  return lang === 'de' ? `${v}&nbsp;€` : `€${v}`; // German style: 73.315 €
}
function pct(n: number, lang: Lang, dp = 1, sign = true): string {
  const s = Math.abs(n).toLocaleString(loc(lang), { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return (sign ? (n > 0 ? '+' : n < 0 ? '−' : '') : '') + s + (lang === 'de' ? '&nbsp;%' : '%');
}
function sendDate(lang: Lang, d = new Date()): string {
  return d.toLocaleDateString(loc(lang), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Vienna' });
}

export function signalLabel(s: SignalState, lang: Lang): string {
  return ({ accumulate: { en: 'Cold', de: 'Kalt' }, hold: { en: 'Mild', de: 'Mild' }, caution: { en: 'Hot', de: 'Heiß' } } as const)[s][lang];
}

// ─── Copy shared with the site (same bands, same words) ───────────────────────

const LEAN: Record<Lang, Record<SignalState, string>> = {
  en: { accumulate: 'Leans cold', hold: 'Neutral', caution: 'Leans hot' },
  de: { accumulate: 'Eher kalt', hold: 'Neutral', caution: 'Eher heiß' },
};
const LINE_FG: Record<Lang, Record<string, string>> = {
  en: { '2': 'People are scared. Prices often feel cheapest when the mood is worst.', '1': 'The mood is cautious, more worried than excited.', '0': 'The mood is neutral, neither scared nor excited.', '-1': 'The mood is upbeat. People feel good about Bitcoin.', '-2': 'The mood is euphoric. Excitement runs high.' },
  de: { '2': 'Die Leute haben Angst. Am günstigsten fühlt es sich oft an, wenn die Stimmung am schlechtesten ist.', '1': 'Die Stimmung ist vorsichtig, eher besorgt als begeistert.', '0': 'Die Stimmung ist neutral, weder ängstlich noch begeistert.', '-1': 'Die Stimmung ist gut. Die Leute fühlen sich wohl mit Bitcoin.', '-2': 'Die Stimmung ist euphorisch. Die Begeisterung ist groß.' },
};
const LINE_MA: Record<Lang, Record<string, string>> = {
  en: { '2': 'The price sits well below its long-term average.', '1': 'The price sits below its long-term average.', '0': 'The price sits close to its long-term average.', '-1': 'The price sits above its long-term average.', '-2': 'The price sits far above its long-term average.' },
  de: { '2': 'Der Kurs liegt deutlich unter seinem langfristigen Durchschnitt.', '1': 'Der Kurs liegt unter seinem langfristigen Durchschnitt.', '0': 'Der Kurs liegt nah an seinem langfristigen Durchschnitt.', '-1': 'Der Kurs liegt über seinem langfristigen Durchschnitt.', '-2': 'Der Kurs liegt weit über seinem langfristigen Durchschnitt.' },
};
const LINE_ATH: Record<Lang, Record<string, string>> = {
  en: { '1': 'The price is more than half below its all-time high.', '0': 'The price is well below its all-time high.', '-1': 'The price is within 20% of its all-time high.' },
  de: { '1': 'Der Kurs liegt mehr als die Hälfte unter dem Allzeithoch.', '0': 'Der Kurs liegt deutlich unter dem Allzeithoch.', '-1': 'Der Kurs liegt weniger als 20&nbsp;% unter dem Allzeithoch.' },
};
const FG_WORD: Record<Lang, Record<string, string>> = {
  en: { 'extreme-fear': 'Extreme fear', 'fear': 'Fear', 'neutral': 'Neutral', 'greed': 'Greed', 'extreme-greed': 'Extreme greed' },
  de: { 'extreme-fear': 'Extreme Angst', 'fear': 'Angst', 'neutral': 'Neutral', 'greed': 'Gier', 'extreme-greed': 'Extreme Gier' },
};

/** One sentence that says why the temperature reads the way it does. */
function togetherLine(state: SignalState, parts: { fg: number; ma: number; ath: number }, lang: Lang): string {
  const v = [parts.fg, parts.ma, parts.ath];
  const split = v.some(x => x > 0) && v.some(x => x < 0);
  const t = {
    en: {
      accumulate: 'The readings lean cold. Sats cost less than usual.',
      caution: 'The readings lean hot. A good stretch for anyone who has been stacking.',
      split: 'The readings pull in different directions, so the market reads mild.',
      calm: 'No reading is at an extreme, so the market reads mild.',
    },
    de: {
      accumulate: 'Die Werte zeigen Richtung kalt. Sats kosten weniger als sonst.',
      caution: 'Die Werte zeigen Richtung heiß. Eine schöne Phase für alle, die schon länger stapeln.',
      split: 'Die Werte ziehen in verschiedene Richtungen, deshalb ist der Markt mild.',
      calm: 'Kein Wert ist extrem, deshalb ist der Markt mild.',
    },
  }[lang];
  return state === 'hold' ? (split ? t.split : t.calm) : t[state];
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function shell(opts: {
  lang: Lang; preheader: string; headerRight?: string; body: string;
  footerReason: string; unsubscribeUrl: string; replyTo?: string; top?: string;
}): string {
  const { lang, preheader, headerRight = '', body, footerReason, unsubscribeUrl, replyTo = '', top = '' } = opts;
  const replyLine = replyTo
    ? (lang === 'de' ? 'Fragen? Antworte einfach auf diese Mail. Ich lese sie persönlich.' : 'Questions? Just hit reply. It&#39;s really me.')
    : '';
  const disclaimer = lang === 'de'
    ? 'Marktdaten, keine Anlageberatung. Vergangene Lagen sagen nichts Sicheres über die Zukunft. When to Buy BTC empfiehlt nie, etwas zu kaufen, zu verkaufen oder zu halten.'
    : 'Market data, not financial advice. Past conditions say nothing certain about the future. When to Buy BTC never recommends buying, selling or holding anything.';
  const tempCss = (Object.keys(TEMP) as SignalState[]).map(s =>
    `.tc-${s}{color:${TEMP[s].hex}!important}`).join('');
  const tempCssLight = (Object.keys(TEMP) as SignalState[]).map(s =>
    `.tc-${s}{color:${TEMP[s].light}!important}.tb-${s}{background-color:${TEMP[s].light}!important}.bt-${s}{background-color:${TEMP[s].light}!important;color:#FFFFFF!important}`).join('');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <style type="text/css">
    body,table,td,p,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    body{margin:0;padding:0;width:100%!important}
    a{text-decoration:none}
    .eb{background-color:#141211!important}
    .es{background-color:#1C1917!important}
    .et{color:#EDE8DE!important}
    .em{color:rgba(237,232,222,0.82)!important}
    .em2{color:rgba(237,232,222,0.62)!important}
    .ed{color:rgba(237,232,222,0.58)!important}
    .el{color:#F7931A!important}
    ${tempCss}
    @media (prefers-color-scheme:light){
      .eb{background-color:#EFEAE2!important}
      .es{background-color:#FFFFFF!important}
      .et{color:#1A1612!important}
      .em{color:#3D342C!important}
      .em2{color:#6E625A!important}
      .ed{color:#8E827A!important}
      .el{color:#B35A00!important}
      .lb{border-color:rgba(0,0,0,0.10)!important}
      .lr{background-color:rgba(0,0,0,0.10)!important}
      .card{background-color:#F7F3EE!important;border-color:rgba(0,0,0,0.08)!important}
      ${tempCssLight}
    }
    [data-ogsc] .eb{background-color:#141211!important}
    [data-ogsc] .es{background-color:#1C1917!important}
    [data-ogsc] .et{color:#EDE8DE!important}
    @media only screen and (max-width:600px){
      .es{width:100%!important}
      .ebody{padding:24px 18px 8px!important}
      .eheader{padding:16px 18px!important}
      .efooter{padding:20px 18px!important}
      .hpad{padding:22px 18px 18px!important}
      .hstate{font-size:48px!important}
      .ehl{font-size:24px!important}
      .rv{font-size:20px!important}
    }
  </style>
</head>
<body class="eb" style="margin:0;padding:0;background-color:#141211;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="eb" style="background-color:#141211;">
<tr><td align="center" style="padding:24px 10px 40px;">
${top}
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="580" class="es" style="max-width:580px;width:100%;background-color:#1C1917;">
  <tr>
    <td class="eheader lb" style="padding:20px 32px;border-bottom:1px solid rgba(237,232,222,0.08);">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td><a href="${SITE}/?utm_source=email&utm_medium=logo" style="text-decoration:none;"><img src="${SITE}/bitcoin-logo_48.png" width="22" height="22" alt="&#8383;" style="vertical-align:middle;display:inline-block;border:0;" /><span class="et" style="${SANS}font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${INK};padding-left:8px;vertical-align:middle;">WHEN TO BUY BTC</span></a></td>
        ${headerRight ? `<td align="right"><span class="em2" style="${MONO}font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};">${headerRight}</span></td>` : ''}
      </tr></table>
    </td>
  </tr>
  <tr><td class="ebody" style="padding:32px 32px 12px;">${body}</td></tr>
  <tr>
    <td class="efooter lb" style="padding:22px 32px 26px;border-top:1px solid rgba(237,232,222,0.08);">
      ${replyLine ? `<p class="em2" style="margin:0 0 10px;${MONO}font-size:11px;line-height:1.7;color:${MUTED};">${replyLine}</p>` : ''}
      <p class="ed" style="margin:0 0 8px;${MONO}font-size:11px;line-height:1.7;color:rgba(237,232,222,0.58);">${footerReason}</p>
      <p class="ed" style="margin:0 0 10px;${MONO}font-size:11px;line-height:1.7;color:rgba(237,232,222,0.58);">${disclaimer}</p>
      <p class="ed" style="margin:0;${MONO}font-size:11px;line-height:1.9;color:rgba(237,232,222,0.58);">
        <a href="${unsubscribeUrl}" class="el" style="color:#F7931A;text-decoration:none;">${lang === 'de' ? 'Abmelden' : 'Unsubscribe'}</a>
        &nbsp;&#183;&nbsp; <a href="${SITE}" class="el" style="color:#F7931A;text-decoration:none;">whentobuybtc.xyz</a>
        &nbsp;&#183;&nbsp; <a href="https://x.com/WhenToBuyBTC" class="el" style="color:#F7931A;text-decoration:none;">@WhenToBuyBTC</a>
        &nbsp;&#183;&nbsp; ${lang === 'de' ? 'Wien, &#214;sterreich' : 'Vienna, Austria'}
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Building blocks ──────────────────────────────────────────────────────────

const spacer = (h: number) => `<div style="height:${h}px;line-height:${h}px;font-size:1px;mso-line-height-rule:exactly;">&nbsp;</div>`;

function eyebrow(text: string, mb = 10): string {
  return `<p class="em2" style="margin:0 0 ${mb}px;${MONO}font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};">${text}</p>`;
}
function para(text: string, opts: { size?: number; italic?: boolean; mb?: number; cls?: string; color?: string } = {}): string {
  const { size = 16, italic = false, mb = 18, cls = 'em', color = SOFT } = opts;
  return `<p class="${cls}" style="margin:0 0 ${mb}px;${SERIF}font-size:${size}px;${italic ? 'font-style:italic;' : ''}line-height:1.7;color:${color};">${text}</p>`;
}

/** Primary button in the temperature colour (orange when no state is given). */
function button(href: string, label: string, state: SignalState = 'caution', width = 260): string {
  const c = TEMP[state];
  return `<!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:50px;v-text-anchor:middle;width:${width}px;" arcsize="0%" stroke="f" fillcolor="${c.hex}">
  <w:anchorlock/><center style="color:#09080A;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.1em;">${label.toUpperCase()}</center>
  </v:roundrect><![endif]-->
  <!--[if !mso]><!-->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
    <td class="bt-${state}" style="background-color:${c.hex};">
      <a href="${href}" class="bt-${state}" style="display:inline-block;padding:16px 30px;background-color:${c.hex};color:#09080A;${SANS}font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;">${label}</a>
    </td>
  </tr></table>
  <!--<![endif]-->`;
}

function outlineButton(href: string, label: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
    <td class="lb" style="border:1px solid rgba(237,232,222,0.25);">
      <a href="${href}" target="_blank" class="et" style="display:inline-block;padding:12px 22px;color:${INK};${SANS}font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;">${label}</a>
    </td>
  </tr></table>`;
}

const rule = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td class="lr" style="height:1px;font-size:1px;line-height:1px;mso-line-height-rule:exactly;background-color:rgba(237,232,222,0.10);padding:0;">&nbsp;</td></tr></table>`;

/** Cold / Mild / Hot bar: three segments, the current one lit, labels underneath. */
function tempScale(state: SignalState, lang: Lang): string {
  const order: SignalState[] = ['accumulate', 'hold', 'caution'];
  const seg = order.map((s, i) => `<td width="33%" class="tb-${s}" style="height:4px;font-size:1px;line-height:4px;background-color:${TEMP[s].hex};${s === state ? '' : 'opacity:0.28;'}${i ? 'border-left:3px solid transparent;' : ''}">&nbsp;</td>`).join('');
  const lab = order.map((s, i) => `<td width="33%" align="${i === 0 ? 'left' : i === 1 ? 'center' : 'right'}" style="padding-top:8px;${MONO}font-size:11px;letter-spacing:0.16em;text-transform:uppercase;">${s === state
    ? `<b class="tc-${s}" style="color:${TEMP[s].hex};">${signalLabel(s, lang)}</b>`
    : `<span class="ed" style="color:rgba(237,232,222,0.58);">${signalLabel(s, lang)}</span>`}</td>`).join('');
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>${seg}</tr><tr>${lab}</tr></table>`;
}

/** The temperature band: eyebrow, the state word, one sentence, price, and the scale. */
function tempHero(o: { state: SignalState; lang: Lang; eyebrow: string; sentence: string; price: number; changeLabel: string; change: number | null }): string {
  const c = TEMP[o.state];
  const chColor = o.change == null ? MUTED : o.change >= 0 ? '#4ADE80' : '#F87171';
  const change = o.change == null ? '' :
    `<span style="${MONO}font-size:13px;font-weight:700;color:${chColor};">${pct(o.change, o.lang, 1)}</span> <span class="em2" style="${MONO}font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};">${o.changeLabel}</span>`;
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="card" style="background-color:rgba(${c.rgb},0.09);border:1px solid rgba(${c.rgb},0.35);">
    <tr><td class="hpad" style="padding:26px 26px 20px;">
      ${eyebrow(o.eyebrow, 6)}
      <p class="hstate tc-${o.state}" style="margin:0;${SERIF}font-size:58px;font-style:italic;font-weight:400;line-height:1.1;color:${c.hex};">${signalLabel(o.state, o.lang)}.</p>
      <p class="em" style="margin:6px 0 18px;${SERIF}font-size:16px;font-style:italic;line-height:1.55;color:${SOFT};">${o.sentence}</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:18px;"><tr>
        <td valign="bottom"><span class="et" style="${SANS}font-size:30px;font-weight:400;letter-spacing:-0.01em;color:${INK};">${eur(o.price, o.lang)}</span></td>
        <td valign="bottom" align="right" style="padding-bottom:5px;">${change}</td>
      </tr></table>
      ${tempScale(o.state, o.lang)}
    </td></tr>
  </table>`;
}

/** The three readings, each with its value, which way it leans, a plain one-liner and last week's value. */
function readings(o: { lang: Lang; fgValue: number; fgClass?: string | null; maPct: number; athPct?: number | null; prev?: { fg?: number; ma?: number; ath?: number } }): string {
  const { lang } = o;
  const was = lang === 'de' ? 'war' : 'was';
  const rows: { label: string; value: string; score: number; line: string; prev?: string }[] = [];
  const fs = fgScore(o.fgValue, o.fgClass);
  rows.push({
    label: lang === 'de' ? 'Marktstimmung &#183; Fear &amp; Greed' : 'Market mood &#183; Fear &amp; Greed',
    value: String(o.fgValue), score: fs, line: (fgBand(o.fgValue, o.fgClass) === 'neutral' ? '' : `${FG_WORD[lang][fgBand(o.fgValue, o.fgClass)]}. `) + LINE_FG[lang][String(fs)],
    prev: o.prev?.fg != null && o.prev.fg !== o.fgValue ? `${was} ${o.prev.fg}` : undefined,
  });
  const ms = maScore(o.maPct);
  rows.push({
    label: lang === 'de' ? 'Langfristiger Trend &#183; 200-Tage-Schnitt' : 'Long-term trend &#183; 200-day average',
    value: pct(o.maPct, lang), score: ms, line: LINE_MA[lang][String(ms)],
    prev: o.prev?.ma != null && Math.abs(o.prev.ma - o.maPct) >= 0.05 ? `${was} ${pct(o.prev.ma, lang)}` : undefined,
  });
  if (o.athPct != null) {
    const as = computeSignal({ fgValue: 50, maPct: 0, athPct: o.athPct }).parts.ath;
    rows.push({
      label: lang === 'de' ? 'Vom Hoch &#183; Allzeithoch' : 'From the peak &#183; all-time high',
      value: pct(o.athPct, lang), score: as, line: LINE_ATH[lang][String(as)],
      prev: o.prev?.ath != null && Math.abs(o.prev.ath - o.athPct) >= 0.05 ? `${was} ${pct(o.prev.ath, lang)}` : undefined,
    });
  }
  const body = rows.map((r, i) => {
    const ls = LEAN_STATE(r.score);
    return `<tr><td class="lb" style="padding:16px 0;${i ? 'border-top:1px solid rgba(237,232,222,0.10);' : ''}">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td valign="top" style="padding-right:14px;">
          <p class="em2" style="margin:0 0 6px;${MONO}font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">${r.label}</p>
          <p class="em" style="margin:0;${SERIF}font-size:15px;line-height:1.55;color:${SOFT};">${r.line}</p>
        </td>
        <td valign="top" align="right" width="104" style="width:104px;">
          <p class="rv et" style="margin:0;${SANS}font-size:24px;line-height:1.1;color:${INK};white-space:nowrap;">${r.value}</p>
          <p class="tc-${ls}" style="margin:5px 0 0;${MONO}font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${TEMP[ls].hex};white-space:nowrap;">${LEAN[lang][ls]}</p>
          ${r.prev ? `<p class="ed" style="margin:3px 0 0;${MONO}font-size:11px;color:rgba(237,232,222,0.58);white-space:nowrap;">${r.prev}</p>` : ''}
        </td>
      </tr></table>
    </td></tr>`;
  }).join('');
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">${body}</table>`;
}

/** "Forwarded to you?" strip that sits above the email card, for people who got it from a friend. */
function forwardStrip(lang: Lang, medium: string): string {
  const url = `${SITE}/?utm_source=email&utm_medium=forward&utm_campaign=${medium}#alerts`;
  const text = lang === 'de'
    ? `Weitergeleitet bekommen? Das Bitcoin-Wetter jeden Sonntag, kostenlos. <a href="${url}" class="el" style="color:#F7931A;text-decoration:none;font-weight:700;">Abonnieren&nbsp;&#8594;</a>`
    : `Forwarded to you? Get the Bitcoin weather every Sunday, free. <a href="${url}" class="el" style="color:#F7931A;text-decoration:none;font-weight:700;">Subscribe&nbsp;&#8594;</a>`;
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="580" style="max-width:580px;width:100%;"><tr>
    <td align="center" style="padding:0 12px 12px;"><p class="em2" style="margin:0;${MONO}font-size:11px;line-height:1.6;color:${MUTED};">${text}</p></td>
  </tr></table>`;
}

/** Counter line, only when we have a real number. */
function counter(lang: Lang, count?: number, goal = 1000): string {
  if (!count) return '';
  return `${count.toLocaleString(loc(lang))} / ${goal.toLocaleString(loc(lang))} ${lang === 'de' ? 'Leser' : 'readers'}`;
}

/** Link for a shared reading: German readers' shares land on the German page; tagged per channel for Umami. */
function shareUrl(lang: Lang, channel: string, campaign: string): string {
  return `${SITE}/?${lang === 'de' ? 'lang=de&' : ''}utm_source=share&utm_medium=${channel}&utm_campaign=${campaign}`;
}

/** Bottom of digest and alert: forward ask (primary), then one-tap sharing where DACH readers actually talk. */
function spreadSection(o: { lang: Lang; shareText: string; campaign: string; subscriberCount?: number; subscriberGoal?: number }): string {
  const { lang } = o;
  const c = counter(lang, o.subscriberCount, o.subscriberGoal);
  const lead = lang === 'de'
    ? `Das hier ist ein Ein-Personen-Projekt${o.subscriberCount ? ` mit ${o.subscriberCount.toLocaleString('de-DE')} Lesern, Ziel 1.000` : ''}. Wenn es dir hilft: Leite diese Mail an eine Person weiter, die Bitcoin spart. Danke dir.`
    : `This is a one-person project${o.subscriberCount ? ` with ${o.subscriberCount.toLocaleString('en-GB')} readers, aiming for 1,000` : ''}. If it helps you, forward this email to one person who stacks sats. Thank you.`;
  const t = o.shareText;
  const links: [string, string][] = [
    ['WhatsApp', `https://wa.me/?text=${encodeURIComponent(t + ' ' + shareUrl(lang, 'whatsapp', o.campaign))}`],
    ['Telegram', `https://t.me/share/url?url=${encodeURIComponent(shareUrl(lang, 'telegram', o.campaign))}&text=${encodeURIComponent(t)}`],
    ['X', `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(shareUrl(lang, 'x', o.campaign))}`],
  ];
  const pills = links.map(([name, href]) => `<td style="padding:0 8px 8px 0;"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="lb" style="border:1px solid rgba(237,232,222,0.25);">
      <a href="${href}" target="_blank" class="et" style="display:inline-block;padding:10px 16px;color:${INK};${SANS}font-size:12px;font-weight:700;letter-spacing:0.06em;text-decoration:none;">${name}</a>
    </td></tr></table></td>`).join('');
  return `${rule}${spacer(24)}
    ${eyebrow(lang === 'de' ? 'Weitersagen' : 'Pass it on', 8)}
    ${c ? `<p class="em2" style="margin:0 0 10px;${MONO}font-size:11px;letter-spacing:0.06em;color:${MUTED};">${c}</p>` : ''}
    ${para(lead, { size: 15, mb: 14 })}
    <p class="em2" style="margin:0 0 10px;${MONO}font-size:11px;letter-spacing:0.06em;color:${MUTED};">${lang === 'de' ? 'Oder die heutige Lage mit einem Tipp teilen:' : 'Or share today&#39;s reading in one tap:'}</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>${pills}</tr></table>
    ${spacer(16)}`;
}

function shareText(state: SignalState, lang: Lang, price: number, fgValue: number, fgClass?: string | null): string {
  const word = FG_WORD[lang][fgBand(fgValue, fgClass)];
  const text = lang === 'de'
    ? `Bitcoin heute: ${signalLabel(state, lang)} ${TEMP[state].emoji} ${eur(price, lang)}, Stimmung ${fgValue} (${word}). Das Bitcoin-Wetter, kostenlos jeden Sonntag:`
    : `Bitcoin today: ${signalLabel(state, lang)} ${TEMP[state].emoji} ${eur(price, lang)}, mood ${fgValue} (${word}). The Bitcoin weather, free every Sunday:`;
  return text.replace(/&nbsp;/g, ' '); // plain text for share links
}

// ═══════════════════════════════════════════════════════════════════════════════
// Confirmation (double opt-in): as short as possible, one button
// ═══════════════════════════════════════════════════════════════════════════════

export function confirmationEmail(
  confirmUrl: string,
  unsubscribeUrl: string,
  lang: Lang,
  opts?: { signal?: SignalState; replyTo?: string }
): { subject: string; html: string; text: string } {
  const replyTo = opts?.replyTo ?? '';
  const state = opts?.signal ?? 'caution';
  const subject = lang === 'de' ? 'Ein Tap, und du bist dabei' : "One tap and you're in";
  const preheader = lang === 'de'
    ? 'Bestätige deine Adresse, dann kommt das Bitcoin-Wetter jeden Sonntag.'
    : 'Confirm your address and the Bitcoin weather arrives every Sunday.';
  const footerReason = lang === 'de'
    ? 'Du erhältst diese E-Mail, weil sich jemand mit dieser Adresse auf whentobuybtc.xyz angemeldet hat. Ohne Bestätigung bekommst du nichts weiter.'
    : 'You&#39;re getting this because someone signed up with this address at whentobuybtc.xyz. Without a confirmation, nothing else is sent.';
  const now = opts?.signal
    ? `<p class="em2" style="margin:0 0 22px;${MONO}font-size:11px;letter-spacing:0.06em;color:${MUTED};">${lang === 'de' ? 'Bitcoin gerade' : 'Bitcoin right now'}: <b class="tc-${state}" style="color:${TEMP[state].hex};">${signalLabel(state, lang)}</b></p>`
    : '';
  const body = `
    ${eyebrow(lang === 'de' ? 'Ein Schritt fehlt' : 'One step left', 12)}
    <h1 class="ehl et" style="margin:0 0 14px;${SERIF}font-size:30px;font-weight:400;line-height:1.2;color:${INK};">${lang === 'de' ? 'Tippe zum Bestätigen.' : 'Tap to confirm.'}</h1>
    ${para(lang === 'de'
      ? 'Dann kommt jeden Sonntag das Bitcoin-Wetter, plus ein Hinweis, wenn Bitcoin an einem Tag um mehr als 3&nbsp;% steigt oder fällt.'
      : 'Then the Bitcoin weather arrives every Sunday, plus a note when Bitcoin moves more than 3% in a day.', { mb: 22 })}
    ${now}
    ${button(confirmUrl, lang === 'de' ? 'E-Mail bestätigen' : 'Confirm my email', state, 240)}
    ${spacer(22)}
    <p class="ed" style="margin:0 0 14px;${MONO}font-size:11px;line-height:1.7;color:rgba(237,232,222,0.58);">
      ${lang === 'de' ? 'Button geht nicht? Diesen Link öffnen:' : 'Button not working? Open this link:'}<br />
      <a href="${confirmUrl}" class="el" style="color:#F7931A;word-break:break-all;text-decoration:none;">${confirmUrl}</a>
    </p>
    <p class="ed" style="margin:0 0 18px;${MONO}font-size:11px;line-height:1.7;color:rgba(237,232,222,0.58);">
      ${lang === 'de' ? 'Nicht angemeldet? Dann einfach ignorieren.' : 'Didn&#39;t sign up? Just ignore this.'}
    </p>`;
  const html = shell({ lang, preheader, body, footerReason, unsubscribeUrl, replyTo });
  return { subject, html, text: htmlToText(html) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Alert: Bitcoin moved more than 3% in 24 hours
// ═══════════════════════════════════════════════════════════════════════════════

export function alertEmail(opts: {
  price:            number;
  movePct:          number;
  direction:        'up' | 'down';
  signal:           SignalState;
  fgValue:          number;
  fgClass?:         string | null;
  maPct:            number;
  athPct?:          number | null;
  change24h:        number;
  unsubscribeUrl:   string;
  replyTo:          string;
  lang:             Lang;
  subscriberCount?: number;
  subscriberGoal?:  number;
  marketBlock?:     string; // optional market-context HTML (lib/macro/email.ts); omitted → no block
}): { subject: string; html: string; text: string; replyTo: string } {
  const { price, signal, fgValue, fgClass, maPct, athPct, change24h, unsubscribeUrl, replyTo, lang, marketBlock } = opts;
  const isDown = opts.direction === 'down';
  const move = Math.abs(change24h).toLocaleString(loc(lang), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + (lang === 'de' ? '&nbsp;%' : '%');
  const moveSubj = move.replace('&nbsp;', ' ');
  const label = signalLabel(signal, lang);

  const subject = lang === 'de'
    ? `${TEMP[signal].emoji} Bitcoin ${isDown ? 'fiel' : 'stieg'} heute um ${moveSubj}. Lage: ${label}`
    : `${TEMP[signal].emoji} Bitcoin ${isDown ? 'fell' : 'rose'} ${moveSubj} today. Conditions: ${label}`;
  const preheader = lang === 'de'
    ? `Jetzt ${eur(price, lang)}. Die Lage in 30 Sekunden.`
    : `Now ${eur(price, lang)}. The full picture in 30 seconds.`;
  const headline = lang === 'de'
    ? `Bitcoin ${isDown ? 'fiel' : 'stieg'} heute um ${move}.`
    : `Bitcoin ${isDown ? 'fell' : 'rose'} ${move} today.`;
  const intro = lang === 'de'
    ? (isDown ? 'Ein großer Tag nach unten. Für langfristige Halter heißt das vor allem: Sats kosten gerade weniger.' : 'Ein großer Tag nach oben. Dafür lohnen sich die ruhigen Monate.')
    : (isDown ? 'A big day down. For long-term holders, that mostly means sats cost less right now.' : 'A big day up. This is what the quiet months were for.');
  const parts = computeSignal({ fgValue, fgClass, maPct, athPct: athPct ?? -35 }).parts;
  const cta = `${SITE}/?${lang === 'de' ? 'lang=de&' : ''}utm_source=email&utm_medium=alert&utm_campaign=cta#signal`;

  // Short by design: what happened, where that leaves the market, one button.
  const body = `
    ${eyebrow(lang === 'de' ? 'Große Bewegung' : 'Big move', 10)}
    <h1 class="ehl et" style="margin:0 0 10px;${SERIF}font-size:30px;font-weight:400;line-height:1.2;color:${INK};">${headline}</h1>
    ${para(intro, { mb: 22 })}
    ${tempHero({ state: signal, lang, eyebrow: lang === 'de' ? 'Bitcoin-Lage jetzt' : 'Bitcoin conditions now', sentence: togetherLine(signal, parts, lang), price, change: change24h, changeLabel: '24h' })}
    ${spacer(8)}
    ${readings({ lang, fgValue, fgClass, maPct, athPct })}
    ${spacer(18)}
    ${marketBlock ? marketBlock : ''}
    ${button(cta, lang === 'de' ? 'Heutige Lage ansehen &#8594;' : 'See today&#39;s conditions &#8594;', signal)}
    ${spacer(28)}
    ${spreadSection({ lang, campaign: 'alert', shareText: shareText(signal, lang, price, fgValue, fgClass), subscriberCount: opts.subscriberCount, subscriberGoal: opts.subscriberGoal })}`;

  const footerReason = lang === 'de'
    ? 'Du erhältst diese E-Mail, weil du das Bitcoin-Wetter auf whentobuybtc.xyz abonniert hast. Hinweise wie dieser kommen nur, wenn Bitcoin sich an einem Tag um mehr als 3&nbsp;% bewegt.'
    : 'You&#39;re getting this because you subscribed to the Bitcoin weather at whentobuybtc.xyz. Notes like this only come when Bitcoin moves more than 3% in a day.';
  const html = shell({ lang, preheader, headerRight: lang === 'de' ? 'Hinweis' : 'Alert', body, footerReason, unsubscribeUrl, replyTo, top: forwardStrip(lang, 'alert') });
  return { subject, html, text: htmlToText(html), replyTo };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Weekly digest: every Sunday
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalcHook { amount: number; startYear: number; put: number; now: number }

/** The "what if" card: a real result from the calculator's model, plus a way in. */
function calcCard(h: CalcHook, lang: Lang): string {
  const url = `${SITE}/${lang === 'de' ? 'bitcoin-sparplan-rechner' : 'bitcoin-dca-calculator'}?utm_source=email&utm_medium=digest&utm_campaign=calculator`;
  const x = (h.now / h.put).toLocaleString(loc(lang), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const line = lang === 'de'
    ? `${eur(h.amount, lang)} im Monat in Bitcoin seit Januar ${h.startYear}: ${eur(h.put, lang)} eingezahlt, heute <b class="et" style="color:${INK};font-weight:700;">${eur(h.now, lang)}</b> wert (${x}&times;).`
    : `${eur(h.amount, lang)} a month into Bitcoin since January ${h.startYear}: ${eur(h.put, lang)} put in, worth <b class="et" style="color:${INK};font-weight:700;">${eur(h.now, lang)}</b> today (${x}&times;).`;
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="card" style="background-color:rgba(237,232,222,0.04);border:1px solid rgba(237,232,222,0.10);margin:0 0 26px;">
    <tr><td style="padding:18px 20px;">
      ${eyebrow(lang === 'de' ? 'Was wäre, wenn?' : 'What if?', 8)}
      ${para(line, { size: 15, mb: 12 })}
      <p style="margin:0;${MONO}font-size:11px;letter-spacing:0.06em;"><a href="${url}" class="el" style="color:#F7931A;text-decoration:none;font-weight:700;">${lang === 'de' ? 'Mit eigenen Zahlen ausprobieren&nbsp;&#8594;' : 'Try your own numbers&nbsp;&#8594;'}</a></p>
    </td></tr>
  </table>`;
}

/** Which combination the digest shows this week (rotates so the card stays fresh). */
export function calcHookForWeek(d = new Date()): { amount: number; startYear: number } {
  const combos = [{ amount: 50, startYear: 2019 }, { amount: 30, startYear: 2020 }, { amount: 100, startYear: 2021 }, { amount: 15, startYear: 2017 }, { amount: 50, startYear: 2022 }, { amount: 70, startYear: 2018 }];
  const week = Math.floor(d.getTime() / (7 * 86400000));
  return combos[week % combos.length];
}

const LAST_HALVING = Date.UTC(2024, 3, 20); // 4th halving, block 840,000 (fixed date, never changes)

/** The week's price path, from the daily closes the digest already loads. */
export interface WeekStats { high: number; low: number; bigDay?: { pct: number; date: string } }

/** Last 7 days from daily [timestamp, price] points: range and the biggest day-to-day move. */
export function weekStats(points: [number, number][], now = Date.now()): WeekStats | null {
  const pts = points.filter(([t, p]) => p > 0 && t >= now - 8 * 86400000).sort((a, b) => a[0] - b[0]);
  if (pts.length < 5) return null;
  const week = pts.filter(([t]) => t >= now - 7 * 86400000);
  const prices = week.map(([, p]) => p);
  let bigDay: WeekStats['bigDay'];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][0] < now - 7 * 86400000) continue;
    const pct = (pts[i][1] - pts[i - 1][1]) / pts[i - 1][1] * 100;
    if (!bigDay || Math.abs(pct) > Math.abs(bigDay.pct)) bigDay = { pct, date: new Date(pts[i][0]).toISOString() };
  }
  return { high: Math.max(...prices), low: Math.min(...prices), bigDay };
}

/** Two or three plain sentences on how the week went. Describes, never advises. */
function weekLine(w: WeekStats, lang: Lang, weekChange: number | null, prevFg?: number, fg?: number): string {
  const range = (w.high - w.low) / w.low * 100;
  const de = lang === 'de';
  const tone = range < 4 ? (de ? 'Eine ruhige Woche' : 'A quiet week') : range < 8 ? (de ? 'Eine normale Woche' : 'An ordinary week') : (de ? 'Eine unruhige Woche' : 'A choppy week');
  const r = range.toLocaleString(loc(lang), { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + (de ? '&nbsp;%' : '%');
  let out = de
    ? `${tone}. Bitcoin bewegte sich zwischen ${eur(w.low, lang)} und ${eur(w.high, lang)}, eine Spanne von ${r}`
    : `${tone}. Bitcoin moved between ${eur(w.low, lang)} and ${eur(w.high, lang)}, a ${r} range`;
  out += weekChange == null ? '.' : de
    ? `, und schloss die Woche ${weekChange >= 0 ? 'mit einem Plus' : 'mit einem Minus'} von ${pct(Math.abs(weekChange), lang, 1, false)}.`
    : `, and ended the week ${weekChange >= 0 ? 'up' : 'down'} ${pct(Math.abs(weekChange), lang, 1, false)}.`;
  if (w.bigDay && Math.abs(w.bigDay.pct) >= 2) {
    const day = new Date(w.bigDay.date).toLocaleDateString(loc(lang), { weekday: 'long', timeZone: 'Europe/Vienna' });
    out += de
      ? ` Die größte Bewegung gab es am ${day}: ${pct(w.bigDay.pct, lang)}.`
      : ` The biggest move came on ${day}: ${pct(w.bigDay.pct, lang)}.`;
  }
  if (prevFg != null && fg != null && Math.abs(fg - prevFg) >= 5) {
    out += de
      ? ` Die Stimmung ${fg > prevFg ? 'stieg' : 'fiel'} von ${prevFg} auf ${fg}.`
      : ` The mood ${fg > prevFg ? 'rose' : 'fell'} from ${prevFg} to ${fg}.`;
  }
  return out;
}

/** Personal close, so the emails read like they come from a person. */
function signOff(lang: Lang, line: string): string {
  return `<p class="em" style="margin:0 0 4px;${SERIF}font-size:16px;font-style:italic;line-height:1.6;color:${SOFT};">${line}</p>
    <p class="et" style="margin:0 0 26px;${SERIF}font-size:16px;line-height:1.6;color:${INK};">Imo</p>`;
}

export function digestEmail(opts: {
  price:            number;
  signal:           SignalState;
  fgValue:          number;
  fgClass?:         string | null;
  maPct:            number;
  athPct:           number;
  change24h:        number;
  unsubscribeUrl:   string;
  replyTo:          string;
  lang:             Lang;
  prevFgValue?:     number;
  prevMaPct?:       number;
  prevAthPct?:      number;
  prevPrice?:       number;
  subscriberCount?: number;
  subscriberGoal?:  number;
  calc?:            CalcHook | null;
  week?:            WeekStats | null;
  marketBlock?:     string; // optional market-context HTML (lib/macro/email.ts); omitted → no block
  now?:             Date;
}): { subject: string; html: string; text: string; replyTo: string } {
  const { price, signal, fgValue, fgClass, maPct, athPct, change24h, unsubscribeUrl, replyTo, lang,
    prevFgValue, prevMaPct, prevAthPct, prevPrice, marketBlock } = opts;
  const label = signalLabel(signal, lang);
  const parts = computeSignal({ fgValue, fgClass, maPct, athPct }).parts;

  // Week change: against last Sunday's price when we have it, otherwise the 24h change.
  const weekChange = prevPrice ? (price - prevPrice) / prevPrice * 100 : null;
  const change = weekChange ?? change24h;
  const changeLabel = weekChange != null ? (lang === 'de' ? 'Woche' : 'week') : '24h';

  const mood = prevFgValue != null && prevFgValue !== fgValue
    ? `${lang === 'de' ? 'Stimmung' : 'Mood'} ${prevFgValue}→${fgValue}`
    : `${lang === 'de' ? 'Stimmung' : 'Mood'} ${fgValue}`;
  const subject = `${TEMP[signal].emoji} ${lang === 'de' ? 'Bitcoin diese Woche' : 'Bitcoin this week'}: ${label}. ${mood}`;

  // What changed: did the temperature itself move since last week?
  let changed = '';
  if (prevFgValue != null && prevMaPct != null && prevAthPct != null) {
    const before = computeSignal({ fgValue: prevFgValue, maPct: prevMaPct, athPct: prevAthPct }).state;
    if (before !== signal) {
      changed = lang === 'de'
        ? `Neu diese Woche: Letzten Sonntag war es noch <b>${signalLabel(before, lang)}</b>, jetzt ist es <b>${label}</b>.`
        : `New this week: last Sunday it read <b>${signalLabel(before, lang)}</b>, now it reads <b>${label}</b>.`;
    } else {
      changed = lang === 'de' ? `Wie letzte Woche: ${label}.` : `Same as last week: ${label}.`;
    }
  }
  const preheader = `${eur(price, lang)} &#183; ${label} &#183; ${togetherLine(signal, parts, lang)}`;

  const daysSince = Math.floor(((opts.now ?? new Date()).getTime() - LAST_HALVING) / 86400000);
  const cycle = lang === 'de'
    ? `Tag ${daysSince.toLocaleString('de-DE')} seit dem letzten Halving (April 2024).`
    : `Day ${daysSince.toLocaleString('en-GB')} since the last halving (April 2024).`;

  const cta = `${SITE}/?${lang === 'de' ? 'lang=de&' : ''}utm_source=email&utm_medium=digest&utm_campaign=cta#signal`;
  const hello = lang === 'de'
    ? 'Hallo! Hier ist dein Bitcoin-Wetter für die Woche. Lesezeit: eine Minute.'
    : 'Hi, here&#39;s your Bitcoin weather for the week. It takes a minute to read.';

  const body = `
    ${para(hello, { mb: 22 })}
    ${tempHero({ state: signal, lang, eyebrow: (lang === 'de' ? 'Diese Woche &#183; ' : 'This week &#183; ') + sendDate(lang, opts.now), sentence: togetherLine(signal, parts, lang), price, change, changeLabel })}
    ${changed ? spacer(14) + `<p class="em2" style="margin:0;${MONO}font-size:11px;line-height:1.6;color:${MUTED};">${changed}</p>` : ''}
    ${opts.week ? spacer(22) + eyebrow(lang === 'de' ? 'Die Woche' : 'The week', 8) + para(weekLine(opts.week, lang, weekChange, prevFgValue, fgValue), { mb: 6 }) : spacer(8)}
    ${readings({ lang, fgValue, fgClass, maPct, athPct, prev: { fg: prevFgValue, ma: prevMaPct, ath: prevAthPct } })}
    ${spacer(16)}
    ${opts.calc ? calcCard(opts.calc, lang) : ''}
    ${marketBlock ? marketBlock : ''}
    ${button(cta, lang === 'de' ? 'Ganze Lage ansehen &#8594;' : 'See the full picture &#8594;', signal)}
    ${spacer(14)}
    <p class="ed" style="margin:0 0 26px;${MONO}font-size:11px;line-height:1.6;color:rgba(237,232,222,0.58);">${cycle}</p>
    ${signOff(lang, lang === 'de' ? 'Bis nächsten Sonntag,' : 'See you next Sunday,')}
    ${spreadSection({ lang, campaign: 'digest', shareText: shareText(signal, lang, price, fgValue, fgClass), subscriberCount: opts.subscriberCount, subscriberGoal: opts.subscriberGoal })}`;

  const footerReason = lang === 'de'
    ? 'Du erhältst diesen Wochenüberblick, weil du das Bitcoin-Wetter auf whentobuybtc.xyz abonniert hast.'
    : 'You&#39;re getting this weekly email because you subscribed to the Bitcoin weather at whentobuybtc.xyz.';
  const html = shell({ lang, preheader, headerRight: lang === 'de' ? 'Sonntag' : 'Sunday', body, footerReason, unsubscribeUrl, replyTo, top: forwardStrip(lang, 'digest') });
  return { subject, html, text: htmlToText(html), replyTo };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Welcome: sent right after confirming
// ═══════════════════════════════════════════════════════════════════════════════

/** Today's numbers for the welcome email (optional: without them the email still works). */
export interface WelcomeMarket { price: number; change24h: number | null; fgValue: number; fgClass?: string | null; maPct: number; athPct: number }

export function welcomeEmail(
  unsubscribeUrl: string,
  lang: Lang,
  opts?: { replyTo?: string; subscriberCount?: number; subscriberGoal?: number; signal?: SignalState; market?: WelcomeMarket | null }
): { subject: string; html: string; text: string } {
  const replyTo = opts?.replyTo ?? '';
  const m = opts?.market ?? null;
  const sig = m ? computeSignal({ fgValue: m.fgValue, fgClass: m.fgClass, maPct: m.maPct, athPct: m.athPct }) : null;
  const state: SignalState = sig?.state ?? opts?.signal ?? 'hold';
  const de = lang === 'de';
  const subject = de ? 'Du bist dabei. Hier ist die Lage von heute' : "You're in. Here's today's reading";
  const preheader = de
    ? (m ? `Bitcoin gerade: ${signalLabel(state, lang)}, ${eur(m.price, lang)}. Und so liest du das Bitcoin-Wetter.` : 'Was du bekommst, wann, und was Kalt, Mild und Heiß bedeuten.')
    : (m ? `Bitcoin right now: ${signalLabel(state, lang)}, ${eur(m.price, lang)}. And how to read the Bitcoin weather.` : 'What you get, when, and what Cold, Mild and Hot mean.');
  const footerReason = de
    ? 'Du erhältst diese E-Mail, weil du deine Anmeldung auf whentobuybtc.xyz bestätigt hast.'
    : 'You&#39;re getting this because you confirmed your subscription at whentobuybtc.xyz.';
  const utm = (c: string) => `utm_source=email&utm_medium=welcome&utm_campaign=${c}`;

  // 1. Today, so the first email already carries the thing people signed up for
  const today = m && sig ? `
    ${tempHero({ state, lang, eyebrow: de ? 'Bitcoin gerade' : 'Bitcoin right now', sentence: togetherLine(state, sig.parts, lang), price: m.price, change: m.change24h, changeLabel: '24h' })}
    ${spacer(8)}
    ${readings({ lang, fgValue: m.fgValue, fgClass: m.fgClass, maPct: m.maPct, athPct: m.athPct })}
    ${spacer(22)}` : '';

  // 2. What arrives when
  const when = de
    ? [['Jeden Sonntag', 'Das Bitcoin-Wetter: Temperatur, Preis, die drei Werte und wie die Woche lief. Eine Minute Lesezeit.'],
       ['Bei großen Bewegungen', 'Ein kurzer Hinweis, wenn Bitcoin an einem Tag um mehr als 3&nbsp;% steigt oder fällt. Höchstens einmal in 24 Stunden pro Richtung.']]
    : [['Every Sunday', 'The Bitcoin weather: temperature, price, the three readings and how the week went. One minute to read.'],
       ['On big moves', 'A short note when Bitcoin moves more than 3% in a day. At most once every 24 hours in the same direction.']];

  // 3. Cold / Mild / Hot
  const legend = (['accumulate', 'hold', 'caution'] as SignalState[]).map(s => {
    const txt = {
      en: { accumulate: 'Fear is high, the price sits below its long-term trend and far from its peak. Sats cost less than usual.', hold: 'Nothing extreme, or the readings disagree. Most weeks look like this.', caution: 'Excitement is high, the price runs above its trend and near its peak. A good stretch for anyone who has been stacking.' },
      de: { accumulate: 'Die Angst ist hoch, der Kurs liegt unter seinem Trend und weit vom Hoch. Sats kosten weniger als sonst.', hold: 'Nichts Extremes, oder die Werte sind sich uneinig. So sehen die meisten Wochen aus.', caution: 'Die Begeisterung ist groß, der Kurs liegt über seinem Trend und nah am Hoch. Eine schöne Phase für alle, die schon länger stapeln.' },
    }[lang][s];
    return `<tr><td class="lb" style="padding:12px 0;border-top:1px solid rgba(237,232,222,0.10);">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td valign="top" width="70" style="width:70px;"><span class="tc-${s}" style="${SERIF}font-size:20px;font-style:italic;color:${TEMP[s].hex};">${signalLabel(s, lang)}</span></td>
        <td valign="top"><p class="em" style="margin:2px 0 0;${SERIF}font-size:15px;line-height:1.6;color:${SOFT};">${txt}</p></td>
      </tr></table>
    </td></tr>`;
  }).join('');

  // 4. Inbox placement: the single biggest lever against the Promotions tab and spam folder
  const inbox = de
    ? `<b class="et" style="color:${INK};">Gmail:</b> Landet diese Mail unter &#8222;Werbung&#8220;, zieh sie in &#8222;Allgemein&#8220;.<br /><b class="et" style="color:${INK};">Alle:</b> Füge alerts@whentobuybtc.xyz zu deinen Kontakten hinzu.<br /><b class="et" style="color:${INK};">Und:</b> Antworte kurz und erzähl mir, wie du Bitcoin sparst. Ich lese jede Antwort selbst, und dein Postfach merkt sich, dass diese Mails erwünscht sind.`
    : `<b class="et" style="color:${INK};">Gmail:</b> if this landed in Promotions, drag it to Primary.<br /><b class="et" style="color:${INK};">Everyone:</b> add alerts@whentobuybtc.xyz to your contacts.<br /><b class="et" style="color:${INK};">And:</b> hit reply and tell me how you stack sats. I read every reply myself, and it tells your inbox these emails are welcome.`;

  // 5. Three tools worth a look
  const tools: [string, string, string][] = de
    ? [['/bitcoin-angst-und-gier-index', 'Angst und Gier Index', 'Die Marktstimmung heute, und was jede Zone bedeutet.'],
       ['/bitcoin-200-tage-linie', '200-Tage-Linie', 'Wo der Kurs zu seinem langfristigen Trend steht, mit Chart.'],
       ['/bitcoin-sparplan-rechner', 'Sparplan Rechner', 'Was ein fester Betrag jeden Monat seit 2015 bewirkt hätte.']]
    : [['/bitcoin-fear-and-greed-index', 'Fear &amp; Greed Index', 'Today&#39;s market mood, and what each zone means.'],
       ['/bitcoin-200-day-moving-average', '200-day moving average', 'Where the price sits against its long-term trend, with a chart.'],
       ['/bitcoin-dca-calculator', 'DCA calculator', 'What a fixed monthly amount since 2015 would have done.']];
  const toolRows = tools.map(([path, name, line], i) => `<tr><td class="lb" style="padding:12px 0;${i ? 'border-top:1px solid rgba(237,232,222,0.10);' : ''}">
      <a href="${SITE}${path}?${utm('tools')}" class="el" style="color:#F7931A;text-decoration:none;${SANS}font-size:14px;font-weight:700;">${name}&nbsp;&#8594;</a>
      <p class="em" style="margin:4px 0 0;${SERIF}font-size:15px;line-height:1.5;color:${SOFT};">${line}</p>
    </td></tr>`).join('');

  const body = `
    ${eyebrow(de ? 'Bestätigt' : 'Confirmed', 12)}
    <h1 class="ehl et" style="margin:0 0 14px;${SERIF}font-size:30px;font-weight:400;line-height:1.2;color:${INK};">${de ? 'Du bist dabei.' : 'You&#39;re in.'}</h1>
    ${para(de
      ? `Danke fürs Abonnieren. ${m ? 'Hier ist die Lage von heute, danach alles Wichtige in zwei Minuten.' : 'Hier ist alles, was du wissen musst, in zwei Minuten.'}`
      : `Thanks for subscribing. ${m ? 'Here&#39;s today&#39;s reading, then everything you need to know in two minutes.' : 'Here&#39;s everything you need to know, in two minutes.'}`, { mb: 22 })}
    ${today}
    ${eyebrow(de ? 'Wann du von mir hörst' : 'When you&#39;ll hear from me', 4)}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:26px;">
      ${when.map(([h, t], i) => `<tr><td class="lb" style="padding:12px 0;${i ? 'border-top:1px solid rgba(237,232,222,0.10);' : ''}">
        <p class="et" style="margin:0 0 4px;${SANS}font-size:14px;font-weight:700;color:${INK};">${h}</p>
        <p class="em" style="margin:0;${SERIF}font-size:15px;line-height:1.6;color:${SOFT};">${t}</p></td></tr>`).join('')}
    </table>
    ${eyebrow(de ? 'Kalt, Mild, Heiß' : 'Cold, Mild, Hot', 4)}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;">${legend}</table>
    ${para(de
      ? 'Die Temperatur beschreibt den Markt, nicht was du tun sollst. Viele langfristige Halter legen jeden Monat denselben Betrag zurück, egal bei welchem Wetter: Kalt heißt mehr Sats fürs gleiche Geld, Heiß heißt, das Sparen hat sich gelohnt.'
      : 'The temperature describes the market, not what you should do. Many long-term holders put the same amount aside every month, whatever the weather: cold means more sats for the same money, hot means the saving already paid off.', { size: 15, mb: 26 })}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="card" style="background-color:rgba(237,232,222,0.04);border:1px solid rgba(237,232,222,0.10);margin:0 0 26px;">
      <tr><td style="padding:18px 20px;">
        ${eyebrow(de ? 'Damit die Mails ankommen' : 'Make sure these reach you', 10)}
        <p class="em" style="margin:0;${SERIF}font-size:15px;line-height:1.75;color:${SOFT};">${inbox}</p>
      </td></tr>
    </table>
    ${eyebrow(de ? 'Einen Blick wert' : 'Worth a look', 4)}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:26px;">${toolRows}</table>
    ${signOff(lang, de ? 'Schön, dass du da bist,' : 'Glad to have you here,')}`;

  const html = shell({ lang, preheader, body, footerReason, unsubscribeUrl, replyTo });
  return { subject, html, text: htmlToText(html) };
}
