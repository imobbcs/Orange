// lib/email-templates.ts
// Generates all transactional email HTML server-side.
// No Resend template dashboard needed — Resend is used as a sending layer only.
// All URLs are passed in as strings, so no variables appear in href attributes.

export type Lang        = 'en' | 'de';
export type SignalState = 'accumulate' | 'hold' | 'caution';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function eur(n: number): string {
  return '€' + Math.round(n).toLocaleString('de-DE');
}

function signalColor(s: SignalState): string {
  return s === 'accumulate' ? '#4ADE80' : s === 'caution' ? '#F87171' : '#FBBF24';
}

function signalLabel(s: SignalState, lang: Lang): string {
  const map: Record<SignalState, Record<Lang, string>> = {
    accumulate: { en: 'Buying zone',    de: 'Kaufzone'   },
    hold:       { en: 'Watch and wait', de: 'Abwarten'   },
    caution:    { en: 'Caution zone',      de: 'Vorsichtszone'      },
  };
  return map[s][lang];
}

function signalBehaviour(s: SignalState, lang: Lang): string {
  const map: Record<SignalState, Record<Lang, string>> = {
    accumulate: { en: 'Most Bitcoiners are buying.',  de: 'Die meisten Bitcoiner kaufen.' },
    hold:       { en: 'Most Bitcoiners are holding.', de: 'Die meisten Bitcoiner halten.' },
    caution:    { en: 'Most Bitcoiners are cautious.', de: 'Die meisten Bitcoiner sind vorsichtig.' },
  };
  return map[s][lang];
}

function signalDigestHeadline(s: SignalState, lang: Lang): string {
  const map: Record<SignalState, Record<Lang, string>> = {
    accumulate: {
      en: 'The data points to a <span style="font-style:italic;color:#F7931A;">buying zone</span> this week.',
      de: 'Die Daten deuten diese Woche auf eine <span style="font-style:italic;color:#F7931A;">Kaufzone</span> hin.',
    },
    hold: {
      en: 'The data points to a <span style="font-style:italic;color:#FBBF24;">watch and wait</span> zone this week.',
      de: 'Die Daten deuten diese Woche auf <span style="font-style:italic;color:#FBBF24;">Abwarten</span> hin.',
    },
    caution: {
      en: 'The data points to a <span style="font-style:italic;color:#F87171;">caution zone</span> this week.',
      de: 'Die Daten deuten diese Woche auf eine <span style="font-style:italic;color:#F87171;">Vorsichtszone</span> hin.',
    },
  };
  return map[s][lang];
}

// ─── Cycle marker (halving context — date math only, no API) ──────────────────
// Anchored to the confirmed 4th halving: 2024-04-20 (block 840,000). This date
// is in the past and never changes, so "days since" is always correct. We do NOT
// compute "days until" the next halving: it is block-height based and drifts by
// days across sources, so a hard-coded target would ship a wrong number.

const LAST_HALVING = Date.UTC(2024, 3, 20); // month is 0-indexed: 3 = April

function cycleMarker(lang: Lang): { label: string; text: string } {
  const daysSince = Math.floor((Date.now() - LAST_HALVING) / 86400000);
  const label = lang === 'de' ? 'Halving-Zyklus' : 'Halving cycle';
  const text = lang === 'de'
    ? `Tag <strong style="color:#F7931A;">${daysSince}</strong> in Zyklus 5 &#8202;&#8212;&#8202; ${daysSince} Tage seit dem letzten Halving.`
    : `Day <strong style="color:#F7931A;">${daysSince}</strong> of cycle 5 &#8202;&#8212;&#8202; ${daysSince} days since the last halving.`;
  return { label, text };
}

// ─── Shared shell ─────────────────────────────────────────────────────────────

function shell(opts: {
  lang:           Lang;
  preheader:      string;
  headerRight?:   string;
  body:           string;
  footerReason:   string;
  unsubscribeUrl: string;
}): string {
  const { lang, preheader, headerRight = '', body, footerReason, unsubscribeUrl } = opts;

  const unsubLabel  = lang === 'de' ? 'Abmelden'              : 'Unsubscribe';
  const disclaimer  = lang === 'de'
    ? 'Keine Anlageberatung. When to Buy BTC stellt ausschließlich Marktdaten bereit &#8202;&#8212;&#8202; keine Empfehlung zum Kauf, Verkauf oder Halten von Vermögenswerten. Bitte triff eigene, informierte Entscheidungen.'
    : 'Not financial advice. When to Buy BTC provides market data only &#8202;&#8212;&#8202; not a recommendation to buy, sell, or hold any asset. Always do your own research.';
  const location    = lang === 'de' ? 'Wien, &#214;sterreich' : 'Vienna, Austria';

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
    .eb{background-color:#1C1917!important}
    .es{background-color:#1C1917!important}
    .et{color:#EDE8DE!important}
    .em{color:rgba(237,232,222,0.88)!important}
    .em2{color:rgba(237,232,222,0.55)!important}
    .ed{color:rgba(237,232,222,0.42)!important}
    .el{color:rgba(247,147,26,0.75)!important}
    .sb{background-color:rgba(247,147,26,0.07)!important;border-color:rgba(247,147,26,0.22)!important}
    .mc{background-color:rgba(247,147,26,0.05)!important;border-color:rgba(247,147,26,0.15)!important}
    @media (prefers-color-scheme:light){
      .eb{background-color:#F0ECE4!important}
      .es{background-color:#FFFFFF!important}
      .et{color:#1A1612!important}
      .em{color:#4A3F35!important}
      .em2{color:#7A6E65!important}
      .ed{color:#9A8E85!important}
      .el{color:#C4680A!important}
      .hem{color:#C4680A!important}
      .lb{border-color:rgba(0,0,0,0.08)!important}
      .lr{background-color:rgba(0,0,0,0.08)!important}
      .sb{background-color:#FDF9F4!important;border-color:rgba(0,0,0,0.1)!important}
      .mc{background-color:#F7F3EE!important;border-color:rgba(0,0,0,0.08)!important}
    }
    [data-ogsc] .eb{background-color:#1C1917!important}
    [data-ogsc] .es{background-color:#1C1917!important}
    [data-ogsc] .et{color:#EDE8DE!important}
    @media only screen and (max-width:600px){
      .es{width:100%!important}
      .ebody{padding:28px 20px!important}
      .eheader{padding:18px 20px!important}
      .efooter{padding:20px!important}
      .ehl{font-size:24px!important}
    }
  </style>
</head>
<body class="eb" style="margin:0;padding:0;background-color:#1C1917;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="eb" style="background-color:#1C1917;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="580" class="es" style="max-width:580px;width:100%;background-color:#1C1917;">

  <!-- HEADER -->
  <tr>
    <td class="eheader lb" style="padding:24px 40px;border-bottom:1px solid rgba(247,147,26,0.18);">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td><img src="https://whentobuybtc.xyz/bitcoin-logo_48.png" width="24" height="24" alt="&#8383;" style="vertical-align:middle;display:inline-block;border:0;" /><span class="et" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#EDE8DE;padding-left:8px;vertical-align:middle;">WHEN TO BUY BTC</span></td>
        ${headerRight ? `<td align="right"><span class="em2" style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${headerRight}</span></td>` : ''}
      </tr></table>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td class="ebody" style="padding:40px 40px 32px;">
      ${body}
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td class="efooter lb" style="padding:24px 40px;border-top:1px solid rgba(247,147,26,0.08);">
      <p class="ed" style="margin:0 0 8px;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:1.7;color:rgba(237,232,222,0.42);">${footerReason}</p>
      <p class="ed" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:1.7;color:rgba(237,232,222,0.42);">${disclaimer}</p>
      <p class="ed" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.42);">
        <a href="${unsubscribeUrl}" class="el" style="color:rgba(247,147,26,0.75);text-decoration:none;">${unsubLabel}</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="https://whentobuybtc.xyz" class="el" style="color:rgba(247,147,26,0.75);text-decoration:none;">whentobuybtc.xyz</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="https://x.com/WhenToBuyBTC" class="el" style="color:rgba(247,147,26,0.75);text-decoration:none;">@WhenToBuyBTC</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;${location}
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── CTA button (Outlook-safe) ────────────────────────────────────────────────

function ctaButton(href: string, label: string, width = 220): string {
  return `<!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
    href="${href}" style="height:48px;v-text-anchor:middle;width:${width}px;" arcsize="0%" stroke="f" fillcolor="#F7931A">
  <w:anchorlock/><center style="color:#09080A;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">${label.toUpperCase()}</center>
  </v:roundrect><![endif]-->
  <!--[if !mso]><!-->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
    <td style="background-color:#F7931A;">
      <a href="${href}" style="display:inline-block;padding:14px 30px;background-color:#F7931A;color:#09080A;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;mso-hide:all;">${label}</a>
    </td>
  </tr></table>
  <!--<![endif]-->`;
}

// ─── Share helpers (growth: prefilled X post + forward/share asks) ─────────────

function shareTweetUrl(text: string): string {
  return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
}

function signalShareText(signal: SignalState, lang: Lang): string {
  const map: Record<SignalState, Record<Lang, string>> = {
    accumulate: {
      en: 'Bitcoin is in the buying zone right now. Live signal for long-term holders: https://whentobuybtc.xyz',
      de: 'Bitcoin ist gerade in der Kaufzone. Live-Signal für langfristige Halter: https://whentobuybtc.xyz',
    },
    hold: {
      en: 'Bitcoin signal: watch and wait. Live signal for long-term holders: https://whentobuybtc.xyz',
      de: 'Bitcoin-Signal diese Woche: Abwarten. Live-Signal für langfristige Halter: https://whentobuybtc.xyz',
    },
    caution: {
      en: 'Bitcoin is in the caution zone right now. Live signal for long-term holders: https://whentobuybtc.xyz',
      de: 'Bitcoin ist gerade in der Vorsichtszone. Live-Signal für langfristige Halter: https://whentobuybtc.xyz',
    },
  };
  return map[signal][lang];
}

// Secondary (outline) button — used for the share-to-X action so it does not
// compete with the primary orange CTA.
function shareButton(href: string, label: string, width = 200): string {
  return `<!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
    href="${href}" style="height:46px;v-text-anchor:middle;width:${width}px;" arcsize="0%" strokecolor="#F7931A" fillcolor="#1C1917">
  <w:anchorlock/><center style="color:#F7931A;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">${label.toUpperCase()}</center>
  </v:roundrect><![endif]-->
  <!--[if !mso]><!-->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
    <td style="border:1px solid #F7931A;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:13px 28px;color:#F7931A;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;mso-hide:all;">${label}</a>
    </td>
  </tr></table>
  <!--<![endif]-->`;
}

// Forward + share-to-X block appended to digest and alert emails.
function spreadSection(opts: { lang: Lang; lead: string; shareText: string; buttonLabel: string }): string {
  const { lead, shareText, buttonLabel } = opts;
  const heading = opts.lang === 'de' ? 'Signal weitergeben' : 'Spread the signal';
  return `${rule}
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${heading}</p>
    <p class="em" style="margin:0 0 18px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.8;color:rgba(237,232,222,0.78);">${lead}</p>
    ${shareButton(shareTweetUrl(shareText), buttonLabel)}`;
}

// Subscribe block aimed at a reader who received the email as a forward.
// Used by both the digest and the alert. The URL must put the query string
// before the #alerts fragment so Umami records the UTM params.
function subscribeBlock(lang: Lang, campaign: string): string {
  const url = `https://whentobuybtc.xyz/?utm_source=email&utm_medium=${campaign}&utm_campaign=forward#alerts`;
  const heading = lang === 'de' ? 'Wurde dir diese Mail weitergeleitet?' : 'Was this forwarded to you?';
  const body    = lang === 'de'
    ? 'Hol dir das Signal in dein eigenes Postfach — kostenlos, kein Lärm, jederzeit mit einem Klick abbestellbar.'
    : 'Get the signal in your own inbox — free, no noise, one-click unsubscribe any time.';
  const button  = lang === 'de' ? 'Kostenlos abonnieren &#8594;' : 'Subscribe free &#8594;';
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.07);border:1px solid rgba(247,147,26,0.22);margin-bottom:8px;">
      <tr><td style="padding:22px 24px;">
        <p class="em2" style="margin:0 0 8px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${heading}</p>
        <p class="em" style="margin:0 0 18px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.7;color:rgba(237,232,222,0.88);">${body}</p>
        ${ctaButton(url, button, 220)}
      </td></tr>
    </table>`;
}

// Plain hyperlinked text — the most demoted CTA form (below the outline button).
function textLink(href: string, label: string): string {
  return `<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.02em;">
    <a href="${href}" class="el" style="color:rgba(247,147,26,0.75);text-decoration:none;">${label}</a>
  </p>`;
}

// ─── Rule ─────────────────────────────────────────────────────────────────────

const rule = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr><td class="lr" style="height:1px;background-color:rgba(247,147,26,0.15);padding:0;">&nbsp;</td></tr>
</table><div style="height:28px;">&nbsp;</div>`;

// ─── Disclaimer box ───────────────────────────────────────────────────────────

function disclaimerBox(text: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
    <tr><td style="border-left:2px solid rgba(247,147,26,0.3);padding:10px 16px;">
      <p class="ed" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:1.7;color:rgba(237,232,222,0.42);">${text}</p>
    </td></tr>
  </table>`;
}

// ─── Price block ──────────────────────────────────────────────────────────────

function priceBlock(price: number, change24h: number, lang: Lang): string {
  const chSign = change24h >= 0 ? '+' : '';
  const chColor = change24h >= 0 ? '#4ADE80' : '#F87171';
  const priceLabel = lang === 'de' ? 'Bitcoin-Preis' : 'Bitcoin price';
  const changeLabel = '24h';
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.07);border:1px solid rgba(247,147,26,0.22);margin-bottom:8px;">
    <tr><td style="padding:20px 24px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td>
          <p class="em2" style="margin:0 0 6px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${priceLabel}</p>
          <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:0.02em;color:#EDE8DE;">${eur(price)}</p>
        </td>
        <td align="right" style="vertical-align:bottom;">
          <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:14px;font-weight:600;color:${chColor};">${chSign}${change24h.toFixed(2)}%</p>
          <p class="em2" style="margin:3px 0 0;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${changeLabel}</p>
        </td>
      </tr></table>
    </td></tr>
  </table>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 1: Confirmation
// ═══════════════════════════════════════════════════════════════════════════════

export function confirmationEmail(confirmUrl: string, unsubscribeUrl: string, lang: Lang): {
  subject: string; html: string;
} {
  const subject = lang === 'de'
    ? 'Bitte bestätige deine Bitcoin-Signal-Alerts'
    : 'Confirm your Bitcoin signal alerts';

  const preheader = lang === 'de'
    ? 'Ein Tap zur Bestätigung — und du verpasst kein Signal mehr.'
    : 'One tap to confirm — then you\'ll never miss a signal change.';

  const footerReason = lang === 'de'
    ? 'Du erhältst diese E-Mail, weil du dich auf whentobuybtc.xyz angemeldet hast. Dies ist eine einmalige Bestätigung &#8202;&#8212;&#8202; bis zur Bestätigung werden keine weiteren E-Mails versendet.'
    : 'You\'re receiving this because you subscribed at whentobuybtc.xyz. This is a one-time confirmation &#8202;&#8212;&#8202; no further emails will be sent until you confirm.';

  const body = lang === 'de' ? `
    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Fast geschafft</p>
    <h1 class="ehl et" style="margin:0 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#EDE8DE;">
      Bestätige deine<br /><span class="hem" style="font-style:italic;color:#F7931A;">Bitcoin-Alerts.</span>
    </h1>
    ${rule}
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.88);">
      Ein Tap &#8202;&#8212;&#8202; und du erhältst Benachrichtigungen, sobald sich das Bitcoin-Signal ändert, sowie jeden Sonntag einen wöchentlichen Überblick.
    </p>
    <p class="em" style="margin:0 0 32px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      Dies ist eine Sicherheitsbestätigung &#8202;&#8212;&#8202; wir möchten sicherstellen, dass du es wirklich bist. Deine Adresse wird niemals an Dritte weitergegeben, und du kannst dich jederzeit mit einem Klick abmelden.
    </p>
    ${ctaButton(confirmUrl, 'E-Mail bestätigen', 240)}
    <p class="ed" style="margin:22px 0 0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.42);line-height:1.7;">
      Button funktioniert nicht? Kopiere diesen Link in deinen Browser:<br />
      <a href="${confirmUrl}" class="el" style="color:rgba(247,147,26,0.75);word-break:break-all;text-decoration:none;">${confirmUrl}</a>
    </p>
    <div style="height:16px;">&nbsp;</div>
    <p class="ed" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.42);line-height:1.6;">
      Falls du dich nicht angemeldet hast, kannst du diese E-Mail einfach ignorieren. Du wirst von uns nichts weiter hören.
    </p>
  ` : `
    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.55);">One step left</p>
    <h1 class="ehl et" style="margin:0 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#EDE8DE;">
      Confirm your<br /><span class="hem" style="font-style:italic;color:#F7931A;">signal alerts.</span>
    </h1>
    ${rule}
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.88);">
      You&#39;re one tap away from receiving alerts the moment the Bitcoin signal changes &#8202;&#8212;&#8202; and a weekly digest every Sunday.
    </p>
    <p class="em" style="margin:0 0 32px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      We sent this to make sure it's you. Your address will never be shared with third parties, and you can unsubscribe instantly at any time.
    </p>
    ${ctaButton(confirmUrl, 'Confirm my email', 220)}
    <p class="ed" style="margin:22px 0 0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.42);line-height:1.7;">
      Button not working? Paste this link into your browser:<br />
      <a href="${confirmUrl}" class="el" style="color:rgba(247,147,26,0.75);word-break:break-all;text-decoration:none;">${confirmUrl}</a>
    </p>
    <div style="height:16px;">&nbsp;</div>
    <p class="ed" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.42);line-height:1.6;">
      If you didn&#39;t request this, you can safely ignore it. Nothing will happen.
    </p>
  `;

  return { subject, html: shell({ lang, preheader, body, footerReason, unsubscribeUrl }) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2: Signal alert
// ═══════════════════════════════════════════════════════════════════════════════

export function alertEmail(opts: {
  price:          number;
  movePct:        number;
  direction:      'up' | 'down';
  signal:         SignalState;
  fgValue:        number;
  maPct:          number;
  change24h:      number;
  unsubscribeUrl: string;
  replyTo:        string;
  lang:           Lang;
}): { subject: string; html: string; replyTo: string } {
  const { price, movePct, direction, signal, fgValue, maPct, change24h, unsubscribeUrl, replyTo, lang } = opts;
  const pct    = Math.abs(movePct * 100).toFixed(1);
  const isDown = direction === 'down';
  const color  = signalColor(signal);
  const label  = signalLabel(signal, lang);
  const maSign = maPct >= 0 ? '+' : '';

  const headline = lang === 'de'
    ? `Bitcoin ${isDown ? 'fiel' : 'stieg'} ${pct}% heute`
    : `Bitcoin ${isDown ? 'dropped' : 'surged'} ${pct}% today`;

  const greeting = lang === 'de'
    ? isDown
      ? `Bitcoin ist heute deutlich gefallen &#8202;&#8212;&#8202; genau die Art von Moment, auf den langfristige Bitcoiner vorbereitet sind.`
      : `Bitcoin ist heute stark gestiegen &#8202;&#8212;&#8202; langfristige Bitcoiner reagieren darauf mit Ruhe, nicht mit Aufregung.`
    : isDown
      ? `Bitcoin has dropped sharply today &#8202;&#8212;&#8202; exactly the kind of moment long-term Bitcoiners prepare for.`
      : `Bitcoin has surged today &#8202;&#8212;&#8202; long-term Bitcoiners tend to get quieter, not more excited, when this happens.`;

  const context = lang === 'de'
    ? isDown
      ? 'Das Signal basiert auf drei Indikatoren: Fear &amp; Greed, dem 200-Tage-Durchschnitt und dem Abstand vom Allzeithoch. Wenn diese Faktoren wie jetzt zusammentreffen, handeln langfristige Bitcoiner in der Regel entschlossen &#8202;&#8212;&#8202; statt auf Gewissheit zu warten.'
      : 'Das Signal basiert auf drei Indikatoren: Fear &amp; Greed, dem 200-Tage-Durchschnitt und dem Abstand vom Allzeithoch. Steigende Preise bei hoher Gier sind historisch ein Signal zur Vorsicht &#8202;&#8212;&#8202; kein Grund zur Panik, aber ein Grund innezuhalten.'
    : isDown
      ? 'The signal is based on three indicators: Fear &amp; Greed, the 200-day moving average, and distance from the all-time high. When conditions align like this, long-term Bitcoiners tend to act decisively rather than wait for certainty.'
      : 'The signal is based on three indicators: Fear &amp; Greed, the 200-day moving average, and distance from the all-time high. Rising prices with elevated greed have historically been a signal for caution &#8202;&#8212;&#8202; not panic, but patience.';

  const subject = lang === 'de'
    ? `Bitcoin ${isDown ? 'fiel' : 'stieg'} ${pct}% \u2014 Signal jetzt: ${label}`
    : `Bitcoin ${isDown ? 'dropped' : 'surged'} ${pct}% \u2014 signal now: ${label.toLowerCase()}`;

  const preheader = lang === 'de'
    ? `${headline} &#8202;&#8212;&#8202; Signal jetzt: ${label}.`
    : `${headline} &#8202;&#8212;&#8202; signal now: ${label.toLowerCase()}.`;

  const headerRight = lang === 'de' ? 'Signal-Alert' : 'Signal alert';

  const footerReason = lang === 'de'
    ? 'Du erhältst diese E-Mail, weil du Bitcoin-Signal-Alerts auf whentobuybtc.xyz abonniert hast.'
    : 'You\'re receiving this because you subscribed to Bitcoin signal alerts at whentobuybtc.xyz.';

  const disclaimerText = lang === 'de'
    ? 'Dies sind Marktdaten, keine Anlageberatung. Vergangene Signallagen sind keine Garantie für zukünftige Entwicklungen. Bitte triff eigene, informierte Entscheidungen.'
    : 'This is market data, not financial advice. Past signal conditions are not a guarantee of future performance. Always make your own informed decisions.';
  const ctaLabel = lang === 'de' ? 'Signal ansehen &#8594;' : 'View full signal &#8594;';
  const greetingLine = lang === 'de' ? 'Hey,' : 'Hey there,';

  const body = `
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.88);">${greetingLine}</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.88);">${greeting}</p>
    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${lang === 'de' ? 'Große Bewegung' : 'Big move'}</p>
    <h1 class="ehl" style="margin:0 0 8px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#F7931A;font-style:italic;">${headline}</h1>
    ${rule}
    ${priceBlock(price, change24h, lang)}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.07);border:1px solid rgba(247,147,26,0.22);margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td width="34%" style="padding-right:16px;">
            <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${lang === 'de' ? 'Marktzone' : 'Market zone'}</p>
            <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.03em;color:${color};">${label}</p>
            <p class="em2" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:9px;color:rgba(237,232,222,0.55);">${signalBehaviour(signal, lang)}</p>
          </td>
          <td width="1" style="background-color:rgba(247,147,26,0.15);padding:0;">&nbsp;</td>
          <td width="33%" style="padding:0 16px;">
            <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Fear &amp; Greed</p>
            <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:500;color:#EDE8DE;">${fgValue}</p>
          </td>
          <td width="1" style="background-color:rgba(247,147,26,0.15);padding:0;">&nbsp;</td>
          <td width="32%" style="padding-left:16px;">
            <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${lang === 'de' ? 'vs 200-Tage-Schnitt' : 'Long-term avg'}</p>
            <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:500;color:#EDE8DE;">${maSign}${maPct.toFixed(1)}%</p>
          </td>
        </tr></table>
      </td></tr>
    </table>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">${context}</p>
    ${disclaimerBox(disclaimerText)}
    ${shareButton('https://whentobuybtc.xyz/?utm_source=email&utm_medium=alert&utm_campaign=cta#alerts', ctaLabel, 240)}
    ${spreadSection({
      lang,
      lead: lang === 'de'
        ? 'Bitcoin hat sich gerade stark bewegt — teile es mit deinen Followern.'
        : 'Bitcoin just made a big move. Worth sharing with your followers.',
      shareText: lang === 'de'
        ? `Bitcoin ist gerade ${pct}% ${isDown ? 'gefallen' : 'gestiegen'}, das Signal steht jetzt auf ${label}. Live-Signal für langfristige Halter: https://whentobuybtc.xyz`
        : `Bitcoin just ${isDown ? 'dropped' : 'surged'} ${pct}% and the signal is now ${label.toLowerCase()}. Live signal for long-term holders: https://whentobuybtc.xyz`,
      buttonLabel: lang === 'de' ? 'Auf X teilen' : 'Share on X',
    })}
    ${rule}
    ${subscribeBlock(lang, 'alert')}
  `;

  return { subject, html: shell({ lang, preheader, headerRight, body, footerReason, unsubscribeUrl }), replyTo };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3: Weekly digest
// ═══════════════════════════════════════════════════════════════════════════════

export function digestEmail(opts: {
  price:          number;
  signal:         SignalState;
  fgValue:        number;
  maPct:          number;
  athPct:         number;
  change24h:      number;
  unsubscribeUrl: string;
  replyTo:        string;
  lang:           Lang;
}): { subject: string; html: string; replyTo: string } {
  const { price, signal, fgValue, maPct, athPct, change24h, unsubscribeUrl, replyTo, lang } = opts;
  const color   = signalColor(signal);
  const label   = signalLabel(signal, lang);
  const maSign  = maPct   >= 0 ? '+' : '';
  const athSign = athPct  >= 0 ? '+' : '';

  const subjectMap: Record<SignalState, Record<Lang, string>> = {
    accumulate: { en: 'Bitcoin is in the buying zone this week',  de: 'Bitcoin ist diese Woche in der Kaufzone' },
    hold:       { en: 'Bitcoin this week: watch and wait',        de: 'Bitcoin diese Woche: Abwarten' },
    caution:    { en: 'Bitcoin is in the caution zone this week', de: 'Bitcoin ist diese Woche in der Vorsichtszone' },
  };
  const subject = subjectMap[signal][lang];

  const preheaderMap: Record<SignalState, Record<Lang, string>> = {
    accumulate: { en: 'Markets are fearful — here\'s where the three indicators stand.', de: 'Angst am Markt — so stehen die drei Indikatoren.' },
    hold:       { en: 'Steady week — here\'s where the three indicators stand.',         de: 'Ruhige Woche — so stehen die drei Indikatoren.' },
    caution:    { en: 'Greed is running high — here\'s where the three indicators stand.', de: 'Gier am Markt — so stehen die drei Indikatoren.' },
  };
  const preheader = `${eur(price)} &#183; ${signalLabel(signal, lang)} &#183; ${preheaderMap[signal][lang]}`;

  const headerRight = lang === 'de' ? 'Wöchentlicher Überblick' : 'Weekly digest';

  const footerReason = lang === 'de'
    ? 'Du erhältst diesen wöchentlichen Überblick, weil du Bitcoin-Signal-Alerts auf whentobuybtc.xyz abonniert hast.'
    : 'You\'re receiving this weekly digest because you subscribed to Bitcoin signal alerts at whentobuybtc.xyz.';

  const intros: Record<SignalState, Record<Lang, string>> = {
    accumulate: {
      en: 'Markets are fearful. Long-term Bitcoiners tend to treat moments like these as signal, not noise.',
      de: 'Die Stimmung am Markt ist angespannt. Langfristige Bitcoiner sehen solche Momente als Signal, nicht als Lärm.',
    },
    hold: {
      en: 'Markets are neither particularly fearful nor greedy. Steady conditions favour steady plans.',
      de: 'Die Märkte sind weder ängstlich noch überhitzt. Wer einen Plan hat, hält ihn.',
    },
    caution: {
      en: 'Greed is running high. Long-term Bitcoiners tend to get quiet when the market gets loud.',
      de: 'Gier bestimmt die Stimmung. Langfristige Bitcoiner halten inne, wenn der Markt überhitzt.',
    },
  };

  const greetingLine = lang === 'de' ? 'Hey,' : 'Hey there,';
  const intro1       = lang === 'de'
    ? 'ich hoffe, deine Woche läuft gut. Hier ist, wo Bitcoin gerade steht — drei Indikatoren, kein Lärm, einfach das, was die Daten zeigen.'
    : 'Hope you\'re having a good week. Here\'s where Bitcoin stands right now — three indicators, no noise, just what the data shows.';
  const ctaLabel     = lang === 'de' ? 'Vollständiges Signal &#8594;' : 'Full signal breakdown &#8594;';
  const signalLabel2 = lang === 'de' ? 'Marktzone' : 'Market zone';
  const maLabel      = lang === 'de' ? '200-Tage-Schnitt' : 'Long-term avg';
  const athLabel     = lang === 'de' ? 'Abstand ATH'      : 'From ATH';
  const contextText  = lang === 'de'
    ? 'Diese drei Indikatoren bilden gemeinsam das zusammengesetzte Signal. Der Fear &amp; Greed Index misst, wie emotional der Markt gerade ist — von extremer Angst bis extremer Gier. Der 200-Tage-Durchschnitt ist der Durchschnittspreis der letzten 200 Tage und gilt als Maßstab für den langfristigen Trend. Der Abstand vom Allzeithoch zeigt, wie weit Bitcoin von seinem historischen Höchstpreis entfernt ist. Das vollständige Signal findest du auf whentobuybtc.xyz.'
    : 'These three indicators together form the composite signal. The Fear &amp; Greed Index measures how emotional the market is right now — from extreme fear to extreme greed. The 200-day average is the average price over the past 200 days, used as a gauge of the long-term trend. Distance from ATH shows how far Bitcoin is from the highest price it has ever reached. The full signal is at whentobuybtc.xyz.';

  const disclaimerText2 = lang === 'de'
    ? 'Dies sind Marktdaten, keine Anlageberatung. Vergangene Signallagen sind keine Garantie für zukünftige Entwicklungen. Bitte triff eigene, informierte Entscheidungen.'
    : 'This is market data, not financial advice. Past signal conditions are not a guarantee of future performance. Always make your own informed decisions.';

  // Cycle marker (date math only).
  const cycle = cycleMarker(lang);

  // UTM-tagged CTA. Query string MUST come before the #alerts fragment, or the
  // params get swallowed into the hash and Umami never sees them.
  const ctaUrl = 'https://whentobuybtc.xyz/?utm_source=email&utm_medium=digest&utm_campaign=cta#alerts';

  const body = `
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.88);">${greetingLine}</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.88);">${intro1}</p>
    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${headerRight}</p>
    <h1 class="ehl et" style="margin:0 0 8px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.35;color:#EDE8DE;">
      ${signalDigestHeadline(signal, lang)}
    </h1>
    ${rule}
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.88);">${intros[signal][lang]}</p>
    ${priceBlock(price, change24h, lang)}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.07);border:1px solid rgba(247,147,26,0.22);margin-bottom:20px;">
      <tr><td style="padding:18px 24px;">
        <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${signalLabel2}</p>
        <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;letter-spacing:0.03em;color:${color};">${label}</p>
        <p class="em2" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.55);">${signalBehaviour(signal, lang)}</p>
      </td></tr>
    </table>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;"><tr>
      <td class="mc" width="32%" style="padding:14px 16px;background-color:rgba(247,147,26,0.05);border:1px solid rgba(247,147,26,0.15);">
        <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Fear &amp; Greed</p>
        <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:500;color:#EDE8DE;">${fgValue}</p>
      </td>
      <td width="8" style="padding:0;">&nbsp;</td>
      <td class="mc" width="32%" style="padding:14px 16px;background-color:rgba(247,147,26,0.05);border:1px solid rgba(247,147,26,0.15);">
        <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${maLabel}</p>
        <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:500;color:#EDE8DE;">${maSign}${maPct.toFixed(1)}%</p>
      </td>
      <td width="8" style="padding:0;">&nbsp;</td>
      <td class="mc" width="32%" style="padding:14px 16px;background-color:rgba(247,147,26,0.05);border:1px solid rgba(247,147,26,0.15);">
        <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${athLabel}</p>
        <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:500;color:#EDE8DE;">${athSign}${athPct.toFixed(1)}%</p>
      </td>
    </tr></table>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      <tr><td style="border-left:2px solid rgba(247,147,26,0.3);padding:10px 16px;">
        <p class="em2" style="margin:0 0 4px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${cycle.label}</p>
        <p class="em" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.6;color:rgba(237,232,222,0.88);">${cycle.text}</p>
      </td></tr>
    </table>
    <p class="em" style="margin:0 0 32px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">${contextText}</p>
    ${disclaimerBox(disclaimerText2)}
    ${textLink(ctaUrl, ctaLabel)}
    ${rule}
    ${subscribeBlock(lang, 'digest')}
    ${spreadSection({
      lang,
      lead: lang === 'de'
        ? 'Wenn dir diese Mails weiterhelfen, leite sie gerne an jemanden weiter, der öfter auf den Bitcoin-Kurs schaut, als er zugeben würde — oder teile sie auf X. Ich bin ein Ein-Personen-Projekt und will 1.000 Abonnenten erreichen — über Mundpropaganda komme ich dahin. Danke dir! &#10084;&#65039;'
        : 'If you find these useful, forward this to someone who checks the Bitcoin price more than they&#39;d like to admit — or share it on X. I&#39;m a one-person project trying to reach 1,000 subscribers, and word of mouth is how I get there. Thank you! &#10084;&#65039;',
      shareText: signalShareText(signal, lang),
      buttonLabel: lang === 'de' ? 'Auf X teilen' : 'Share on X',
    })}
  `;

  return { subject, html: shell({ lang, preheader, headerRight, body, footerReason, unsubscribeUrl }), replyTo };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 4: Welcome (sent after double opt-in confirmed)
// ═══════════════════════════════════════════════════════════════════════════════

export function welcomeEmail(unsubscribeUrl: string, lang: Lang): {
  subject: string; html: string;
} {
  const subject = lang === 'de'
    ? 'Du bist dabei — Bitcoin-Signal-Alerts aktiv'
    : 'You\'re in — Bitcoin signal alerts are on';

  const preheader = lang === 'de'
    ? 'Willkommen. Hier ist alles, was du über deine Alerts wissen musst.'
    : 'Welcome. Here\'s everything you need to know about your alerts.';

  const footerReason = lang === 'de'
    ? 'Du erhältst diese E-Mail, weil du Bitcoin-Signal-Alerts auf whentobuybtc.xyz bestätigt hast.'
    : 'You\'re receiving this because you confirmed your subscription to Bitcoin signal alerts at whentobuybtc.xyz.';

  const disclaimerText = lang === 'de'
    ? 'Dies sind Marktdaten, keine Anlageberatung. Vergangene Signallagen sind keine Garantie für zukünftige Entwicklungen. Bitte triff eigene, informierte Entscheidungen.'
    : 'This is market data, not financial advice. Past signal conditions are not a guarantee of future performance. Always make your own informed decisions.';

  const body = lang === 'de' ? `
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.88);">Hey,</p>

    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Bestätigt</p>
    <h1 class="ehl et" style="margin:0 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#EDE8DE;">
      Du bist dabei.<br /><span style="font-style:italic;color:#F7931A;">Alerts sind aktiv.</span>
    </h1>
    ${rule}

    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.88);">
      Deine Anmeldung ist bestätigt. Hier ist genau, was dich erwartet — und warum wir das so gebaut haben.
    </p>

    <!-- When alerts fire -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Wann du eine E-Mail erhältst</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.07);border:1px solid rgba(247,147,26,0.22);margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom:14px;border-bottom:1px solid rgba(247,147,26,0.1);">
              <p class="em2" style="margin:0 0 3px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Signal-Alert</p>
              <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;line-height:1.7;color:rgba(237,232,222,0.88);">Sofort, wenn Bitcoin an einem Tag um mehr als 3&nbsp;% steigt oder fällt. Maximal einmal alle 24 Stunden — kein Rauschen.</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:14px;">
              <p class="em2" style="margin:0 0 3px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Wöchentlicher Überblick</p>
              <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;line-height:1.7;color:rgba(237,232,222,0.88);">Jeden Sonntag um 17:00 Uhr — aktuelles Signal, Fear &amp; Greed, 200-Tage-Durchschnitt und ATH-Abstand auf einen Blick.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Why Bitcoin -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Warum Bitcoin</p>
    <p class="em" style="margin:0 0 16px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      Bitcoin ist das erste knappe digitale Gut der Geschichte — auf 21 Millionen Einheiten begrenzt, und niemand kann weitere Einheiten erzeugen. In einer Welt, in der Zentralbanken die Geldmenge jährlich ausweiten, bietet Bitcoin einen Ausweg aus der schleichenden Entwertung.
    </p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      Langfristige Bitcoiner kaufen nicht, weil sie den Kurs kennen. Sie kaufen, weil sie verstehen, was Bitcoin ist — und nutzen Momente der Panik, um konsequent zu akkumulieren, statt dem Hype hinterherzujagen.
    </p>

    <!-- Why DCA -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Warum DCA die beste Strategie ist</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      Dollar-Cost Averaging bedeutet, regelmäßig einen festen Betrag zu investieren — unabhängig vom Kurs. Es beseitigt emotionales Timing, mittelt den Einstiegspreis über einen längeren Zeitraum und nimmt den Druck, auf den perfekten Einstiegszeitpunkt zu warten. Das Signal hilft dir, in Phasen extremer Angst etwas mehr zu kaufen — ohne zu spekulieren.
    </p>

    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Signal weitergeben</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      Noch etwas: Wenn du jemanden kennst, der Bitcoin sammelt, schick diese Mail einfach weiter. So wächst das hier.
    </p>

    ${disclaimerBox(disclaimerText)}
    ${ctaButton('https://whentobuybtc.xyz', 'Signal ansehen →', 220)}
  ` : `
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.88);">Hey there,</p>

    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Confirmed</p>
    <h1 class="ehl et" style="margin:0 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#EDE8DE;">
      You&#39;re in.<br /><span style="font-style:italic;color:#F7931A;">Alerts are on.</span>
    </h1>
    ${rule}

    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.88);">
      Your subscription is confirmed. Here&#39;s exactly what to expect — and why we built this.
    </p>

    <!-- When alerts fire -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">When you&#39;ll hear from us</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.07);border:1px solid rgba(247,147,26,0.22);margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom:14px;border-bottom:1px solid rgba(247,147,26,0.1);">
              <p class="em2" style="margin:0 0 3px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Signal alert</p>
              <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;line-height:1.7;color:rgba(237,232,222,0.88);">Immediately when Bitcoin moves more than 3% in a day and the signal changes. Maximum once every 24 hours — no noise.</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:14px;">
              <p class="em2" style="margin:0 0 3px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Weekly digest</p>
              <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;line-height:1.7;color:rgba(237,232,222,0.88);">Every Sunday at 5PM Vienna time — current signal, Fear &amp; Greed, 200-day average, and ATH distance at a glance.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Why Bitcoin -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Why Bitcoin</p>
    <p class="em" style="margin:0 0 16px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      Bitcoin is the first scarce digital asset in history — capped at 21 million units, with no authority able to print more. In a world where central banks expand the money supply every year, Bitcoin offers a way out of slow, silent devaluation.
    </p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      Long-term Bitcoiners don&#39;t buy because they know the price. They buy because they understand what Bitcoin is — and they use moments of market panic to accumulate steadily, rather than chasing hype.
    </p>

    <!-- Why DCA -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Why DCA is the best strategy</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      Dollar-cost averaging means investing a fixed amount on a regular schedule — regardless of the price. It removes emotional timing, smooths your entry price over time, and takes the pressure off finding the "perfect moment". The signal helps you buy a little more in periods of extreme fear — without speculating.
    </p>

    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Spread the signal</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      One more thing: if you know someone who&#39;s stacking sats, forward this email along. That&#39;s exactly how this grows.
    </p>

    ${disclaimerBox(disclaimerText)}
    ${ctaButton('https://whentobuybtc.xyz', 'View the signal →', 220)}
  `;

  return { subject, html: shell({ lang, preheader, body, footerReason, unsubscribeUrl }) };
}
