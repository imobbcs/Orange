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
    .eb{background-color:#0D0B0F!important}
    .es{background-color:#0D0B0F!important}
    .et{color:#EDE8DE!important}
    .em{color:rgba(237,232,222,0.72)!important}
    .em2{color:rgba(237,232,222,0.38)!important}
    .ed{color:rgba(237,232,222,0.28)!important}
    .el{color:rgba(247,147,26,0.65)!important}
    .sb{background-color:rgba(247,147,26,0.05)!important;border-color:rgba(247,147,26,0.18)!important}
    .mc{background-color:rgba(247,147,26,0.03)!important;border-color:rgba(247,147,26,0.1)!important}
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
    [data-ogsc] .eb{background-color:#0D0B0F!important}
    [data-ogsc] .es{background-color:#0D0B0F!important}
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
<body class="eb" style="margin:0;padding:0;background-color:#0D0B0F;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="eb" style="background-color:#0D0B0F;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="580" class="es" style="max-width:580px;width:100%;background-color:#0D0B0F;">

  <!-- HEADER -->
  <tr>
    <td class="eheader lb" style="padding:24px 40px;border-bottom:1px solid rgba(247,147,26,0.18);">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 64 64" style="vertical-align:middle;display:inline-block;border:0;"><g transform="translate(0.006,-0.003)"><path fill="#f7931a" d="m63.033,39.744c-4.274,17.143-21.637,27.576-38.782,23.301-17.138-4.274-27.571-21.638-23.295-38.78,4.272-17.145,21.635-27.579,38.775-23.305,17.144,4.274,27.576,21.64,23.302,38.784z"/><path fill="#ffffff" d="m46.103,27.444c0.637-4.258-2.605-6.547-7.038-8.074l1.438-5.768-3.511-0.875-1.4,5.616c-0.923-0.23-1.871-0.447-2.813-0.662l1.41-5.653-3.509-0.875-1.439,5.766c-0.764-0.174-1.514-0.346-2.242-0.527l0.004-0.018-4.842-1.209-0.934,3.75s2.605,0.597,2.55,0.634c1.422,0.355,1.679,1.296,1.636,2.042l-1.638,6.571c0.098,0.025,0.225,0.061,0.365,0.117-0.117-0.029-0.242-0.061-0.371-0.092l-2.296,9.205c-0.174,0.432-0.615,1.08-1.609,0.834,0.035,0.051-2.552-0.637-2.552-0.637l-1.743,4.019,4.569,1.139c0.85,0.213,1.683,0.436,2.503,0.646l-1.453,5.834,3.507,0.875,1.439-5.772c0.958,0.26,1.888,0.5,2.798,0.726l-1.434,5.745,3.511,0.875,1.453-5.823c5.987,1.133,10.489,0.676,12.384-4.739,1.527-4.36-0.076-6.875-3.226-8.515,2.294-0.529,4.022-2.038,4.483-5.155zm-8.022,11.249c-1.085,4.36-8.426,2.003-10.806,1.412l1.928-7.729c2.38,0.594,10.012,1.77,8.878,6.317zm1.086-11.312c-0.99,3.966-7.1,1.951-9.082,1.457l1.748-7.01c1.982,0.494,8.365,1.416,7.334,5.553z"/></g></svg><span class="et" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#EDE8DE;padding-left:8px;vertical-align:middle;">WHEN TO BUY BTC</span></td>
        ${headerRight ? `<td align="right"><span class="em2" style="font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(237,232,222,0.38);">${headerRight}</span></td>` : ''}
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
      <p class="ed" style="margin:0 0 8px;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:1.7;color:rgba(237,232,222,0.28);">${footerReason}</p>
      <p class="ed" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:1.7;color:rgba(237,232,222,0.28);">${disclaimer}</p>
      <p class="ed" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.28);">
        <a href="${unsubscribeUrl}" class="el" style="color:rgba(247,147,26,0.6);text-decoration:none;">${unsubLabel}</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="https://whentobuybtc.xyz" class="el" style="color:rgba(247,147,26,0.6);text-decoration:none;">whentobuybtc.xyz</a>
        &nbsp;&nbsp;&#183;&nbsp;&nbsp;
        <a href="https://x.com/WhenToBuyBTC" class="el" style="color:rgba(247,147,26,0.6);text-decoration:none;">@WhenToBuyBTC</a>
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

// ─── Rule ─────────────────────────────────────────────────────────────────────

const rule = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr><td class="lr" style="height:1px;background-color:rgba(247,147,26,0.15);padding:0;">&nbsp;</td></tr>
</table><div style="height:28px;">&nbsp;</div>`;

// ─── Disclaimer box ───────────────────────────────────────────────────────────

function disclaimerBox(text: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
    <tr><td style="border-left:2px solid rgba(247,147,26,0.3);padding:10px 16px;">
      <p class="ed" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:1.7;color:rgba(237,232,222,0.35);">${text}</p>
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
    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Fast geschafft</p>
    <h1 class="ehl et" style="margin:0 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#EDE8DE;">
      Bestätige deine<br /><span class="hem" style="font-style:italic;color:#F7931A;">Bitcoin-Alerts.</span>
    </h1>
    ${rule}
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.72);">
      Ein Tap &#8202;&#8212;&#8202; und du erhältst Benachrichtigungen, sobald sich das Bitcoin-Signal ändert, sowie jeden Sonntag einen wöchentlichen Überblick.
    </p>
    <p class="em" style="margin:0 0 32px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.62);">
      Dies ist eine Sicherheitsbestätigung &#8202;&#8212;&#8202; wir möchten sicherstellen, dass du es wirklich bist. Deine Adresse wird niemals an Dritte weitergegeben, und du kannst dich jederzeit mit einem Klick abmelden.
    </p>
    ${ctaButton(confirmUrl, 'E-Mail bestätigen', 240)}
    <p class="ed" style="margin:22px 0 0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.28);line-height:1.7;">
      Button funktioniert nicht? Kopiere diesen Link in deinen Browser:<br />
      <a href="${confirmUrl}" class="el" style="color:rgba(247,147,26,0.5);word-break:break-all;text-decoration:none;">${confirmUrl}</a>
    </p>
    <div style="height:16px;">&nbsp;</div>
    <p class="ed" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.28);line-height:1.6;">
      Falls du dich nicht angemeldet hast, kannst du diese E-Mail einfach ignorieren. Du wirst von uns nichts weiter hören.
    </p>
  ` : `
    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.38);">One step left</p>
    <h1 class="ehl et" style="margin:0 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#EDE8DE;">
      Confirm your<br /><span class="hem" style="font-style:italic;color:#F7931A;">signal alerts.</span>
    </h1>
    ${rule}
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.72);">
      You&#39;re one tap away from receiving alerts the moment the Bitcoin signal changes &#8202;&#8212;&#8202; and a weekly digest every Sunday.
    </p>
    <p class="em" style="margin:0 0 32px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.62);">
      We sent this to make sure it's you. Your address will never be shared with third parties, and you can unsubscribe instantly at any time.
    </p>
    ${ctaButton(confirmUrl, 'Confirm my email', 220)}
    <p class="ed" style="margin:22px 0 0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.28);line-height:1.7;">
      Button not working? Paste this link into your browser:<br />
      <a href="${confirmUrl}" class="el" style="color:rgba(247,147,26,0.5);word-break:break-all;text-decoration:none;">${confirmUrl}</a>
    </p>
    <div style="height:16px;">&nbsp;</div>
    <p class="ed" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.28);line-height:1.6;">
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
  unsubscribeUrl: string;
  replyTo:        string;
  lang:           Lang;
}): { subject: string; html: string; replyTo: string } {
  const { price, movePct, direction, signal, fgValue, maPct, unsubscribeUrl, replyTo, lang } = opts;
  const pct    = Math.abs(movePct * 100).toFixed(1);
  const isDown = direction === 'down';
  const color  = signalColor(signal);
  const label  = signalLabel(signal, lang);
  const maSign = maPct >= 0 ? '+' : '';

  const headline = lang === 'de'
    ? `Bitcoin ${isDown ? 'fiel' : 'stieg'} ${pct}% in 4 Stunden`
    : `Bitcoin ${isDown ? 'dropped' : 'surged'} ${pct}% in 4 hours`;

  const greeting = lang === 'de'
    ? isDown
      ? `Das Signal hat sich geändert. Bitcoin ist in den vergangenen 4 Stunden deutlich gefallen &#8202;&#8212;&#8202; genau die Art von Moment, auf den langfristige Bitcoiner vorbereitet sind.`
      : `Das Signal hat sich geändert. Bitcoin ist in den vergangenen 4 Stunden stark gestiegen &#8202;&#8212;&#8202; langfristige Bitcoiner reagieren darauf mit Ruhe, nicht mit Aufregung.`
    : isDown
      ? `The signal just changed. Bitcoin has dropped sharply in the last 4 hours &#8202;&#8212;&#8202; exactly the kind of moment long-term Bitcoiners prepare for.`
      : `The signal just changed. Bitcoin has surged in the last 4 hours &#8202;&#8212;&#8202; long-term Bitcoiners tend to get quieter, not more excited, when this happens.`;

  const context = lang === 'de'
    ? isDown
      ? 'Das Signal basiert auf drei Indikatoren: Fear &amp; Greed, dem 200-Tage-Durchschnitt und dem Abstand vom Allzeithoch. Wenn diese Faktoren wie jetzt zusammentreffen, handeln langfristige Bitcoiner in der Regel entschlossen &#8202;&#8212;&#8202; statt auf Gewissheit zu warten.'
      : 'Das Signal basiert auf drei Indikatoren: Fear &amp; Greed, dem 200-Tage-Durchschnitt und dem Abstand vom Allzeithoch. Steigende Preise bei hoher Gier sind historisch ein Signal zur Vorsicht &#8202;&#8212;&#8202; kein Grund zur Panik, aber ein Grund innezuhalten.'
    : isDown
      ? 'The signal is based on three indicators: Fear &amp; Greed, the 200-day moving average, and distance from the all-time high. When conditions align like this, long-term Bitcoiners tend to act decisively rather than wait for certainty.'
      : 'The signal is based on three indicators: Fear &amp; Greed, the 200-day moving average, and distance from the all-time high. Rising prices with elevated greed have historically been a signal for caution &#8202;&#8212;&#8202; not panic, but patience.';

  const subject = lang === 'de'
    ? `Bitcoin ${isDown ? 'fiel' : 'stieg'} ${pct}% — Signal hat gewechselt`
    : `Bitcoin market zone: ${label} &#8202;&#8212;&#8202; BTC ${isDown ? 'dropped' : 'surged'} ${pct}%`;

  const preheader = lang === 'de'
    ? `${headline} &#8202;&#8212;&#8202; das Signal hat sich geändert.`
    : `${headline} &#8202;&#8212;&#8202; the signal just changed.`;

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
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.72);">${greetingLine}</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.72);">${greeting}</p>
    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.38);">${lang === 'de' ? 'Signal geändert' : 'Signal update'}</p>
    <h1 class="ehl" style="margin:0 0 8px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#F7931A;font-style:italic;">${headline}</h1>
    <p class="em2" style="margin:0 0 24px;font-family:'Courier New',Courier,monospace;font-size:11px;color:rgba(237,232,222,0.4);">${eur(price)}</p>
    ${rule}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.05);border:1px solid rgba(247,147,26,0.18);margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td width="34%" style="padding-right:16px;">
            <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.38);">${lang === 'de' ? 'Marktzone' : 'Market zone'}</p>
            <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.03em;color:${color};">${label}</p>
            <p class="em2" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:9px;color:rgba(237,232,222,0.45);">${signalBehaviour(signal, lang)}</p>
          </td>
          <td width="1" style="background-color:rgba(247,147,26,0.15);padding:0;">&nbsp;</td>
          <td width="33%" style="padding:0 16px;">
            <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Fear &amp; Greed</p>
            <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:500;color:#EDE8DE;">${fgValue}</p>
          </td>
          <td width="1" style="background-color:rgba(247,147,26,0.15);padding:0;">&nbsp;</td>
          <td width="32%" style="padding-left:16px;">
            <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.38);">${lang === 'de' ? 'vs 200-Tage-Schnitt' : 'Long-term avg'}</p>
            <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:500;color:#EDE8DE;">${maSign}${maPct.toFixed(1)}%</p>
          </td>
        </tr></table>
      </td></tr>
    </table>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.62);">${context}</p>
    ${disclaimerBox(disclaimerText)}
    ${ctaButton('https://whentobuybtc.xyz', ctaLabel, 240)}
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
  const chSign  = change24h >= 0 ? '+' : '';

  const subject = lang === 'de'
    ? `Dein wöchentlicher Bitcoin-Überblick: ${signalLabel(signal, lang)}`
    : `Your weekly Bitcoin snapshot: ${signalLabel(signal, lang)}`;

  const preheader = lang === 'de'
    ? `${eur(price)} &#183; ${signalLabel(signal, lang)} &#183; ${chSign}${change24h.toFixed(2)}% heute`
    : `${eur(price)} &#183; ${signalLabel(signal, lang)} &#183; ${chSign}${change24h.toFixed(2)}% today`;

  const headerRight = lang === 'de' ? 'Wöchentlicher Überblick' : 'Weekly digest';

  const footerReason = lang === 'de'
    ? 'Du erhältst diesen wöchentlichen Überblick, weil du Bitcoin-Signal-Alerts auf whentobuybtc.xyz abonniert hast.'
    : 'You\'re receiving this weekly digest because you subscribed to Bitcoin signal alerts at whentobuybtc.xyz.';

  const disclaimerText = lang === 'de'
    ? 'Dies sind Marktdaten, keine Anlageberatung. Vergangene Signal-Konditionen sind keine Garantie für zukünftige Entwicklungen. Triff stets deine eigenen informierten Entscheidungen.'
    : 'This is market data, not financial advice. Past signal conditions are not a guarantee of future performance. Always make your own informed decisions.';

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
    ? 'Hier ist dein wöchentlicher Bitcoin-Signal-Überblick. Drei Indikatoren. Ein klares Bild. Kein Rauschen.'
    : 'Here\'s your weekly Bitcoin signal snapshot. Three indicators. One clear picture. No noise.';
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

  const body = `
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.72);">${greetingLine}</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.72);">${intro1}</p>
    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.38);">${headerRight}</p>
    <h1 class="ehl et" style="margin:0 0 8px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.35;color:#EDE8DE;">
      ${signalDigestHeadline(signal, lang)}
    </h1>
    <p class="em2" style="margin:0 0 24px;font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:0.04em;color:rgba(237,232,222,0.4);">BTC &nbsp;&#183;&nbsp; ${eur(price)} &nbsp;&#183;&nbsp; ${chSign}${change24h.toFixed(2)}% ${lang === 'de' ? 'heute' : 'today'}</p>
    ${rule}
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.78);">${intros[signal][lang]}</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.05);border:1px solid rgba(247,147,26,0.18);margin-bottom:20px;">
      <tr><td style="padding:18px 24px;">
        <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.38);">${signalLabel2}</p>
        <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;letter-spacing:0.03em;color:${color};">${label}</p>
        <p class="em2" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.45);">${signalBehaviour(signal, lang)}</p>
      </td></tr>
    </table>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;"><tr>
      <td class="mc" width="32%" style="padding:14px 16px;background-color:rgba(247,147,26,0.03);border:1px solid rgba(247,147,26,0.1);">
        <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Fear &amp; Greed</p>
        <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:500;color:#EDE8DE;">${fgValue}</p>
      </td>
      <td width="8" style="padding:0;">&nbsp;</td>
      <td class="mc" width="32%" style="padding:14px 16px;background-color:rgba(247,147,26,0.03);border:1px solid rgba(247,147,26,0.1);">
        <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.38);">${maLabel}</p>
        <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:500;color:#EDE8DE;">${maSign}${maPct.toFixed(1)}%</p>
      </td>
      <td width="8" style="padding:0;">&nbsp;</td>
      <td class="mc" width="32%" style="padding:14px 16px;background-color:rgba(247,147,26,0.03);border:1px solid rgba(247,147,26,0.1);">
        <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.38);">${athLabel}</p>
        <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:500;color:#EDE8DE;">${athSign}${athPct.toFixed(1)}%</p>
      </td>
    </tr></table>
    <p class="em" style="margin:0 0 32px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.62);">${contextText}</p>
    ${disclaimerBox(disclaimerText2)}
    ${ctaButton('https://whentobuybtc.xyz', ctaLabel, 260)}
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
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.72);">Hey,</p>

    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Bestätigt</p>
    <h1 class="ehl et" style="margin:0 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#EDE8DE;">
      Du bist dabei.<br /><span style="font-style:italic;color:#F7931A;">Alerts sind aktiv.</span>
    </h1>
    ${rule}

    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.78);">
      Deine Anmeldung ist bestätigt. Hier ist genau, was dich erwartet — und warum wir das so gebaut haben.
    </p>

    <!-- When alerts fire -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Wann du eine E-Mail erhältst</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.05);border:1px solid rgba(247,147,26,0.15);margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom:14px;border-bottom:1px solid rgba(247,147,26,0.1);">
              <p class="em2" style="margin:0 0 3px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Signal-Alert</p>
              <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;line-height:1.7;color:rgba(237,232,222,0.72);">Sofort, wenn Bitcoin innerhalb von 4 Stunden um mehr als 3&nbsp;% steigt oder fällt. Maximal einmal alle 24 Stunden — kein Rauschen.</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:14px;">
              <p class="em2" style="margin:0 0 3px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Wöchentlicher Überblick</p>
              <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;line-height:1.7;color:rgba(237,232,222,0.72);">Jeden Sonntag um 17:00 Uhr — aktuelles Signal, Fear &amp; Greed, 200-Tage-Durchschnitt und ATH-Abstand auf einen Blick.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Why Bitcoin -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Warum Bitcoin</p>
    <p class="em" style="margin:0 0 16px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.62);">
      Bitcoin ist das erste knappe digitale Gut der Geschichte — auf 21 Millionen Einheiten begrenzt, und niemand kann weitere Einheiten erzeugen. In einer Welt, in der Zentralbanken die Geldmenge jährlich ausweiten, bietet Bitcoin einen Ausweg aus der schleichenden Entwertung.
    </p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.62);">
      Langfristige Bitcoiner kaufen nicht, weil sie den Kurs kennen. Sie kaufen, weil sie verstehen, was Bitcoin ist — und nutzen Momente der Panik, um konsequent zu akkumulieren, statt dem Hype hinterherzujagen.
    </p>

    <!-- Why DCA -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Warum DCA die beste Strategie ist</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.62);">
      Dollar-Cost Averaging bedeutet, regelmäßig einen festen Betrag zu investieren — unabhängig vom Kurs. Es beseitigt emotionales Timing, mittelt den Einstiegspreis über einen längeren Zeitraum und nimmt den Druck, auf den perfekten Einstiegszeitpunkt zu warten. Das Signal hilft dir, in Phasen extremer Angst etwas mehr zu kaufen — ohne zu spekulieren.
    </p>

    ${disclaimerBox(disclaimerText)}
    ${ctaButton('https://whentobuybtc.xyz', 'Signal ansehen →', 220)}
  ` : `
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.72);">Hey there,</p>

    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Confirmed</p>
    <h1 class="ehl et" style="margin:0 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#EDE8DE;">
      You&#39;re in.<br /><span style="font-style:italic;color:#F7931A;">Alerts are on.</span>
    </h1>
    ${rule}

    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.78);">
      Your subscription is confirmed. Here&#39;s exactly what to expect — and why we built this.
    </p>

    <!-- When alerts fire -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.38);">When you&#39;ll hear from us</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.05);border:1px solid rgba(247,147,26,0.15);margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom:14px;border-bottom:1px solid rgba(247,147,26,0.1);">
              <p class="em2" style="margin:0 0 3px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Signal alert</p>
              <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;line-height:1.7;color:rgba(237,232,222,0.72);">Immediately when Bitcoin moves more than 3% in 4 hours and the signal changes. Maximum once every 24 hours — no noise.</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:14px;">
              <p class="em2" style="margin:0 0 3px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Weekly digest</p>
              <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;line-height:1.7;color:rgba(237,232,222,0.72);">Every Sunday at 5PM Vienna time — current signal, Fear &amp; Greed, 200-day average, and ATH distance at a glance.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Why Bitcoin -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Why Bitcoin</p>
    <p class="em" style="margin:0 0 16px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.62);">
      Bitcoin is the first scarce digital asset in history — capped at 21 million units, with no authority able to print more. In a world where central banks expand the money supply every year, Bitcoin offers a way out of slow, silent devaluation.
    </p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.62);">
      Long-term Bitcoiners don&#39;t buy because they know the price. They buy because they understand what Bitcoin is — and they use moments of market panic to accumulate steadily, rather than chasing hype.
    </p>

    <!-- Why DCA -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Why DCA is the best strategy</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.62);">
      Dollar-cost averaging means investing a fixed amount on a regular schedule — regardless of the price. It removes emotional timing, smooths your entry price over time, and takes the pressure off finding the "perfect moment". The signal helps you buy a little more in periods of extreme fear — without speculating.
    </p>

    ${disclaimerBox(disclaimerText)}
    ${ctaButton('https://whentobuybtc.xyz', 'View the signal →', 220)}
  `;

  return { subject, html: shell({ lang, preheader, body, footerReason, unsubscribeUrl }) };
}
