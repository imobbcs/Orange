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
    accumulate: { en: 'Accumulate', de: 'Akkumulieren' },
    hold:       { en: 'Hold',       de: 'Halten'       },
    caution:    { en: 'Caution',    de: 'Vorsicht'      },
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
    ? 'Keine Anlageberatung. When to Buy BTC stellt ausschließlich Marktdaten bereit &#8202;&#8212;&#8202; keine Empfehlung zum Kauf, Verkauf oder Halten von Vermögenswerten. Triff deine eigenen Entscheidungen.'
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
        <td><span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#F7931A;">&#8383;</span><span class="et" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#EDE8DE;padding-left:8px;">WHEN TO BUY BTC</span></td>
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
      Dies ist eine Double-Opt-in-Bestätigung &#8202;&#8212;&#8202; wir möchten sicherstellen, dass du es wirklich bist. Wir geben deine Adresse niemals an Dritte weiter, und du kannst dich jederzeit sofort abmelden.
    </p>
    ${ctaButton(confirmUrl, 'E-Mail bestätigen', 240)}
    <p class="ed" style="margin:22px 0 0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.28);line-height:1.7;">
      Button funktioniert nicht? Kopiere diesen Link in deinen Browser:<br />
      <a href="${confirmUrl}" class="el" style="color:rgba(247,147,26,0.5);word-break:break-all;text-decoration:none;">${confirmUrl}</a>
    </p>
    <div style="height:16px;">&nbsp;</div>
    <p class="ed" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.28);line-height:1.6;">
      Wenn du dich nicht angemeldet hast, kannst du diese E-Mail einfach ignorieren. Es passiert nichts.
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
      This is a double opt-in confirmation &#8202;&#8212;&#8202; we want to make sure it&#39;s really you. We&#39;ll never share your address with third parties, and you can unsubscribe instantly at any time.
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
      ? `Das Signal hat sich geändert. Bitcoin ist in den letzten 4 Stunden deutlich gefallen &#8202;&#8212;&#8202; genau die Art von Moment, auf den langfristige Bitcoiner vorbereitet sind.`
      : `Das Signal hat sich geändert. Bitcoin ist in den letzten 4 Stunden stark gestiegen &#8202;&#8212;&#8202; langfristige Bitcoiner werden jetzt ruhiger, nicht aufgeregter.`
    : isDown
      ? `The signal just changed. Bitcoin has dropped sharply in the last 4 hours &#8202;&#8212;&#8202; exactly the kind of moment long-term Bitcoiners prepare for.`
      : `The signal just changed. Bitcoin has surged in the last 4 hours &#8202;&#8212;&#8202; long-term Bitcoiners tend to get quieter, not more excited, when this happens.`;

  const context = lang === 'de'
    ? isDown
      ? 'Das Signal basiert auf drei Indikatoren: Fear &amp; Greed, dem 200-Tage-Durchschnitt und dem Abstand vom Allzeithoch. Wenn diese Faktoren wie jetzt zusammentreffen, handeln langfristige Bitcoiner in der Regel entschlossen &#8202;&#8212;&#8202; statt auf Gewissheit zu warten.'
      : 'Das Signal basiert auf drei Indikatoren: Fear &amp; Greed, dem 200-Tage-Durchschnitt und dem Abstand vom Allzeithoch. Steigende Preise bei hoher Gier sind historisch ein Signal zur Vorsicht &#8202;&#8212;&#8202; nicht zur Panik, aber zum Innehalten.'
    : isDown
      ? 'The signal is based on three indicators: Fear &amp; Greed, the 200-day moving average, and distance from the all-time high. When conditions align like this, long-term Bitcoiners tend to act decisively rather than wait for certainty.'
      : 'The signal is based on three indicators: Fear &amp; Greed, the 200-day moving average, and distance from the all-time high. Rising prices with elevated greed have historically been a signal for caution &#8202;&#8212;&#8202; not panic, but patience.';

  const subject = lang === 'de'
    ? `Bitcoin-Signal: ${label} &#8202;&#8212;&#8202; BTC ${isDown ? 'fiel' : 'stieg'} ${pct}%`
    : `Bitcoin signal: ${label} &#8202;&#8212;&#8202; BTC ${isDown ? 'dropped' : 'surged'} ${pct}%`;

  const preheader = lang === 'de'
    ? `${headline} &#8202;&#8212;&#8202; das Signal hat sich geändert.`
    : `${headline} &#8202;&#8212;&#8202; the signal just changed.`;

  const headerRight = lang === 'de' ? 'Signal-Alert' : 'Signal alert';

  const footerReason = lang === 'de'
    ? 'Du erhältst diese E-Mail, weil du Bitcoin-Signal-Alerts auf whentobuybtc.xyz abonniert hast.'
    : 'You\'re receiving this because you subscribed to Bitcoin signal alerts at whentobuybtc.xyz.';

  const disclaimerText = lang === 'de'
    ? 'Dies sind Marktdaten, keine Anlageberatung. Vergangene Signal-Konditionen sind keine Garantie für zukünftige Entwicklungen. Triff stets deine eigenen informierten Entscheidungen.'
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
            <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Signal</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:0.03em;color:${color};">${label}</p>
          </td>
          <td width="1" style="background-color:rgba(247,147,26,0.15);padding:0;">&nbsp;</td>
          <td width="33%" style="padding:0 16px;">
            <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.38);">Fear &amp; Greed</p>
            <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:500;color:#EDE8DE;">${fgValue}</p>
          </td>
          <td width="1" style="background-color:rgba(247,147,26,0.15);padding:0;">&nbsp;</td>
          <td width="32%" style="padding-left:16px;">
            <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.38);">${lang === 'de' ? 'vs 200-Tage-Schnitt' : 'vs 200D avg'}</p>
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
    ? `Dein wöchentliches Bitcoin-Signal: ${label}`
    : `Your weekly Bitcoin signal: ${label}`;

  const preheader = lang === 'de'
    ? `${eur(price)} &#183; Signal: ${label} &#183; ${chSign}${change24h.toFixed(2)}% heute`
    : `${eur(price)} &#183; Signal: ${label} &#183; ${chSign}${change24h.toFixed(2)}% today`;

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
      de: 'Die Märkte sind in Angst. Langfristige Bitcoiner sehen solche Momente als Signal, nicht als Lärm.',
    },
    hold: {
      en: 'Markets are neither particularly fearful nor greedy. Steady conditions favour steady plans.',
      de: 'Die Märkte sind weder besonders ängstlich noch gierig. Stabile Bedingungen sprechen für stabile Pläne.',
    },
    caution: {
      en: 'Greed is running high. Long-term Bitcoiners tend to get quiet when the market gets loud.',
      de: 'Gier dominiert den Markt. Langfristige Bitcoiner werden ruhiger, wenn der Markt lauter wird.',
    },
  };

  const greetingLine = lang === 'de' ? 'Hey,' : 'Hey there,';
  const intro1       = lang === 'de'
    ? 'Hier ist dein wöchentlicher Bitcoin-Signal-Überblick. Eine Aussage, drei Indikatoren, kein Rauschen.'
    : 'Here\'s your weekly Bitcoin signal snapshot. One number, three indicators, no noise.';
  const ctaLabel     = lang === 'de' ? 'Vollständiges Signal &#8594;' : 'Full signal breakdown &#8594;';
  const signalLabel2 = lang === 'de' ? 'Aktuelles Signal' : 'Current signal';
  const maLabel      = lang === 'de' ? '200-Tage-Schnitt' : '200-day avg';
  const athLabel     = lang === 'de' ? 'Abstand ATH'      : 'From ATH';
  const contextText  = lang === 'de'
    ? 'Diese drei Indikatoren bilden gemeinsam das zusammengesetzte Signal. Fear &amp; Greed zeigt die aktuelle Marktstimmung, der 200-Tage-Durchschnitt gibt Kontext zum Trend, und der Abstand vom Allzeithoch zeigt, wo wir uns im längeren Zyklus befinden.'
    : 'These three indicators together form the composite signal. Fear &amp; Greed reflects current market sentiment, the 200-day average gives context on trend, and distance from ATH shows where we are in the longer cycle.';

  const body = `
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.72);">${greetingLine}</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.72);">${intro1}</p>
    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.38);">${headerRight}</p>
    <h1 class="ehl et" style="margin:0 0 8px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#EDE8DE;">
      ${lang === 'de' ? 'Das Signal steht diese Woche<br />auf' : 'The signal is'} <span style="font-style:italic;color:#F7931A;">${label}${lang === 'de' ? '.' : ' this week.'}</span>
    </h1>
    <p class="em2" style="margin:0 0 24px;font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:0.04em;color:rgba(237,232,222,0.4);">BTC &nbsp;&#183;&nbsp; ${eur(price)} &nbsp;&#183;&nbsp; ${chSign}${change24h.toFixed(2)}% ${lang === 'de' ? 'heute' : 'today'}</p>
    ${rule}
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.78);">${intros[signal][lang]}</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.05);border:1px solid rgba(247,147,26,0.18);margin-bottom:20px;">
      <tr><td style="padding:18px 24px;">
        <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.38);">${signalLabel2}</p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;letter-spacing:0.03em;color:${color};">${label}</p>
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
    ${disclaimerBox(disclaimerText)}
    ${ctaButton('https://whentobuybtc.xyz', ctaLabel, 260)}
  `;

  return { subject, html: shell({ lang, preheader, headerRight, body, footerReason, unsubscribeUrl }), replyTo };
}
