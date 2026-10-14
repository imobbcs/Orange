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

// 'caution' uses the brand orange, not red. Red is reserved for an actual
// negative 24h price move (see priceBlock's chColor) — using it here too meant
// a green, positive price day could still render inside a red box whenever the
// signal read high-greed, which read as "something's wrong" when nothing was.
function signalColor(s: SignalState): string {
  return s === 'accumulate' ? '#4ADE80' : s === 'caution' ? '#F7931A' : '#FBBF24';
}

function signalLabel(s: SignalState, lang: Lang): string {
  const map: Record<SignalState, Record<Lang, string>> = {
    accumulate: { en: 'Cold', de: 'Kalt' },
    hold:       { en: 'Mild', de: 'Mild' },
    caution:    { en: 'Hot',  de: 'Heiß' },
  };
  return map[s][lang];
}

// Rotates by day (same 86400000ms window as the site's updateSignal()), and
// swaps in a momentum-aware pool when the 24h move is sharp, so this line
// doesn't read as flat or passive on a day the price is actually moving hard.
// Mirrors the fix applied to app.html's signalAccumulate/Caution copy.
//
// Describes what the composite signal itself is reading, not what "most
// Bitcoiners" are doing. The old copy used an unbacked crowd claim as a way
// to imply a course of action without stating it outright — this says the
// same underlying thing (why the signal reads the way it does) as a checkable
// fact about the three indicators instead of a claim about other people.
// Voice: describe the market and how long-term holders tend to see it, third person.
// Never buy/sell/wait advice. Both directions are good news for a long-term holder.
function signalBehaviour(s: SignalState, lang: Lang, change24h?: number): string {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const hotPump  = change24h !== undefined && change24h >= 5;
  const hardDump = change24h !== undefined && change24h <= -5;

  const pools: Record<SignalState, Record<Lang, string[]>> = {
    accumulate: {
      en: hardDump ? [
        'A drop this sharp is exactly the kind of day the signal is built for.',
        'Fear spiking alongside a move this size. Long-term holders tend to see days like this as cheaper sats.',
        'This is the setup the signal watches for: a sharp move down with fear to match.',
        'Fear, trend, and distance from the highs are all lining up hard right now.',
      ] : [
        'Fear is elevated and price is sitting below its long-term trend.',
        'Fear up, price below its long-term trend. Long-term holders tend to see this as cheaper sats.',
        'Fear, trend, and distance from the highs are all leaning the same way.',
        'The setup the signal is built to catch: elevated fear, price below trend.',
      ],
      de: hardDump ? [
        'Ein so starker Rückgang ist genau das Muster, für das das Signal gebaut ist.',
        'Ein Kursrutsch dieser Größe bei hoher Angst. Langfristige Halter sehen solche Tage meist als günstigere Sats.',
        'Genau dieses Muster beobachtet das Signal: starker Rückgang bei hoher Angst.',
        'Angst, Trend und Abstand vom Hoch zeigen gerade alle stark in dieselbe Richtung.',
      ] : [
        'Die Angst ist erhöht, der Preis liegt unter dem langfristigen Trend.',
        'Angst hoch, Preis unter dem langfristigen Trend. Langfristige Halter sehen das meist als günstigere Sats.',
        'Angst, Trend und Abstand vom Hoch zeigen alle in dieselbe Richtung.',
        'Das Muster, auf das das Signal reagiert: erhöhte Angst, Preis unter dem Trend.',
      ],
    },
    hold: {
      en: [
        'Nothing extreme right now across fear, trend, or distance from the highs.',
        'Fear, trend, and distance from the highs are all reading calm.',
        'A quiet reading across all three indicators, no strong pull either way.',
        'None of the three indicators is doing anything unusual at the moment.',
      ],
      de: [
        'Gerade schlägt keiner der drei Indikatoren stark aus.',
        'Angst, Trend und Abstand vom Hoch lesen sich gerade alle ruhig.',
        'Eine ruhige Lesung über alle drei Indikatoren hinweg.',
        'Keiner der drei Indikatoren zeigt gerade etwas Ungewöhnliches.',
      ],
    },
    caution: {
      en: hotPump ? [
        'Big green day. Long-term holders tend to enjoy days like this and keep their regular plan.',
        'Enjoy the move. Greed is elevated and price is stretched above its trend.',
        'This is what holding through the quiet stretches is for.',
        'A day to celebrate. Long-term holders tend to keep their regular plan through moves like this.',
      ] : [
        'Greed is elevated and price is running hot above its trend.',
        'Fear, trend, and distance from the highs are all reading hot at once.',
        'A hot reading. Long-term holders tend to enjoy it and keep their regular plan.',
        'Greed up, price stretched above trend. Long-term holders tend to keep their regular plan.',
      ],
      de: hotPump ? [
        'Starker grüner Tag. Langfristige Halter genießen solche Tage meist und bleiben bei ihrem Plan.',
        'Genieß die Bewegung. Die Gier ist erhöht, der Preis liegt deutlich über dem Trend.',
        'Dafür hält man durch die ruhigen Phasen.',
        'Ein Tag zum Feiern. Langfristige Halter bleiben bei solchen Bewegungen meist bei ihrem Plan.',
      ] : [
        'Die Gier ist erhöht, der Preis läuft heiß über dem Trend.',
        'Angst, Trend und Abstand vom Hoch lesen sich gerade alle heiß.',
        'Eine heiße Lesung. Langfristige Halter genießen das meist und bleiben bei ihrem Plan.',
        'Gier hoch, Preis weit über dem Trend. Langfristige Halter bleiben meist bei ihrem regulären Plan.',
      ],
    },
  };

  const pool = pools[s][lang];
  return pool[dayIndex % pool.length];
}

function signalDigestHeadline(s: SignalState, lang: Lang): string {
  const map: Record<SignalState, Record<Lang, string>> = {
    accumulate: {
      en: 'The Bitcoin market reads <span style="font-style:italic;color:#4ADE80;">cold</span> this week.',
      de: 'Der Bitcoin-Markt ist diese Woche <span style="font-style:italic;color:#4ADE80;">kalt</span>.',
    },
    hold: {
      en: 'The Bitcoin market reads <span style="font-style:italic;color:#FBBF24;">mild</span> this week.',
      de: 'Der Bitcoin-Markt ist diese Woche <span style="font-style:italic;color:#FBBF24;">mild</span>.',
    },
    caution: {
      en: 'The Bitcoin market reads <span style="font-style:italic;color:#F7931A;">hot</span> this week.',
      de: 'Der Bitcoin-Markt ist diese Woche <span style="font-style:italic;color:#F7931A;">heiß</span>.',
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
    ? `Tag <strong style="color:#F7931A;">${daysSince}</strong> in Zyklus 5: ${daysSince} Tage seit dem letzten Halving.`
    : `Day <strong style="color:#F7931A;">${daysSince}</strong> of cycle 5: ${daysSince} days since the last halving.`;
  return { label, text };
}

// ─── Week-over-week delta helpers (digest) ─────────────────────────────────────
// digest_log now stores each week's fg_value/ma_pct/ath_pct/price_eur, so the
// digest can say what changed instead of just what the numbers are today.

function fgTrendWord(curr: number, prev: number, lang: Lang): string {
  const diff = curr - prev;
  if (Math.abs(diff) < 3) return lang === 'de' ? 'kaum verändert' : 'little changed';
  if (lang === 'de') return diff > 0 ? 'deutlich gestiegen' : 'deutlich gefallen';
  return diff > 0 ? 'risen notably' : 'fallen notably';
}

// One-sentence "what changed" line for the digest body. Returns null on the
// first-ever send (no prior row to compare against), in which case the digest
// falls back to the static definitions paragraph instead.
function weekChangeSummary(fgValue: number, prevFgValue: number | undefined, lang: Lang): string | null {
  if (prevFgValue == null || prevFgValue === fgValue) return null;
  const trend = fgTrendWord(fgValue, prevFgValue, lang);
  return lang === 'de'
    ? `Fear &amp; Greed ist seit letzter Woche von ${prevFgValue} auf ${fgValue} ${trend}. Das ist die eigentliche Geschichte dieser Woche.`
    : `Fear &amp; Greed has ${trend} since last week, from ${prevFgValue} to ${fgValue}. That's the real story this week.`;
}

// Small "was X" subtext rendered under a stat box when a prior value exists
// and differs meaningfully from the current one.
function statDelta(curr: number, prev: number | undefined, lang: Lang, isPct: boolean): string {
  if (prev == null) return '';
  const same = isPct ? Math.abs(curr - prev) < 0.05 : curr === prev;
  if (same) return '';
  const prevStr = isPct ? `${prev >= 0 ? '+' : ''}${prev.toFixed(1)}%` : `${prev}`;
  const was = lang === 'de' ? 'war' : 'was';
  return `<p class="em2" style="margin:3px 0 0;font-family:'Courier New',Courier,monospace;font-size:9px;color:rgba(237,232,222,0.4);">${was} ${prevStr}</p>`;
}

// ─── Shared shell ─────────────────────────────────────────────────────────────

function shell(opts: {
  lang:           Lang;
  preheader:      string;
  headerRight?:   string;
  body:           string;
  footerReason:   string;
  unsubscribeUrl: string;
  replyTo?:       string;
}): string {
  const { lang, preheader, headerRight = '', body, footerReason, unsubscribeUrl, replyTo = '' } = opts;

  const unsubLabel  = lang === 'de' ? 'Abmelden'              : 'Unsubscribe';
  const replyLine   = replyTo
    ? (lang === 'de'
        ? 'Fragen? Antworte einfach auf diese Mail. Ich lese sie persönlich.'
        : 'Questions? Just hit reply. It&#39;s really me.')
    : '';
  const disclaimer  = lang === 'de'
    ? 'Keine Anlageberatung. When to Buy BTC stellt ausschließlich Marktdaten bereit, keine Empfehlung zum Kauf, Verkauf oder Halten von Vermögenswerten. Bitte triff eigene, informierte Entscheidungen.'
    : 'Not financial advice. When to Buy BTC provides market data only, not a recommendation to buy, sell, or hold any asset. Always do your own research.';
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

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

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
      ${replyLine ? `<p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:1.7;color:rgba(237,232,222,0.55);">${replyLine}</p>` : ''}
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

// Plain-language label for a raw Fear & Greed value (0-100), standard bands.
function fgWord(value: number, lang: Lang): string {
  const bands: Array<[number, Record<Lang, string>]> = [
    [24,  { en: 'Extreme Fear',  de: 'Extreme Angst' }],
    [44,  { en: 'Fear',          de: 'Angst' }],
    [55,  { en: 'Neutral',       de: 'Neutral' }],
    [75,  { en: 'Greed',         de: 'Gier' }],
    [100, { en: 'Extreme Greed', de: 'Extreme Gier' }],
  ];
  for (const [max, labels] of bands) {
    if (value <= max) return labels[lang];
  }
  return bands[bands.length - 1][1][lang];
}

function signalShareText(signal: SignalState, lang: Lang, price: number, change24h: number, fgValue: number): string {
  const label = signalLabel(signal, lang);
  const sign  = change24h >= 0 ? '+' : '';
  const word  = fgWord(fgValue, lang);
  return lang === 'de'
    ? `Bitcoin: ${eur(price)}, ${sign}${change24h.toFixed(1)}% heute. Fear & Greed bei ${fgValue} (${word}). Signal: ${label}. Kostenloser Live-Tracker für langfristige Halter: https://whentobuybtc.xyz`
    : `Bitcoin: ${eur(price)}, ${sign}${change24h.toFixed(1)}% today. Fear & Greed at ${fgValue} (${word}). Signal: ${label}. Free live tracker for long-term holders: https://whentobuybtc.xyz`;
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

// Forward + share-to-X block appended to digest and alert emails. Forwarding is
// the primary ask (native to email, and the actual growth mechanic that matters);
// X is offered as a secondary option underneath. subscriberCount, when passed,
// renders a live progress line ("612 / 1,000 subscribers").
function spreadSection(opts: {
  lang:             Lang;
  forwardLead:      string;
  shareText:        string;
  shareLabel:       string;
  subscriberCount?: number;
  subscriberGoal?:  number;
}): string {
  const { lang, forwardLead, shareText, shareLabel, subscriberCount, subscriberGoal = 1000 } = opts;
  const heading = lang === 'de' ? 'Signal weitergeben' : 'Spread the signal';
  const locale  = lang === 'de' ? 'de-DE' : 'en-US';
  const progress = subscriberCount != null
    ? `<p class="em2" style="margin:0 0 12px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.05em;color:rgba(237,232,222,0.55);">${subscriberCount.toLocaleString(locale)} / ${subscriberGoal.toLocaleString(locale)} ${lang === 'de' ? 'Abonnenten' : 'subscribers'}</p>`
    : '';
  const secondaryLabel = lang === 'de' ? 'Oder auf X teilen:' : 'Or share on X:';
  return `${rule}
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${heading}</p>
    ${progress}
    <p class="em" style="margin:0 0 18px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.8;color:rgba(237,232,222,0.78);">${forwardLead}</p>
    <p class="ed" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(237,232,222,0.42);">${secondaryLabel}</p>
    ${shareButton(shareTweetUrl(shareText), shareLabel)}
    <div style="height:24px;line-height:24px;font-size:1px;mso-line-height-rule:exactly;">&nbsp;</div>`;
}

// De-emphasized, single-line version for the digest — the box competed with
// the site's own CTA for attention, which is backwards given 99% of digest
// readers are already subscribed.
function subscribeLineSmall(lang: Lang, campaign: string): string {
  const url = `https://whentobuybtc.xyz/?utm_source=email&utm_medium=${campaign}&utm_campaign=forward#alerts`;
  const text = lang === 'de'
    ? `Wurde dir das weitergeleitet? <a href="${url}" class="el" style="color:rgba(247,147,26,0.75);text-decoration:none;">Kostenlos abonnieren &#8594;</a>`
    : `Was this forwarded to you? <a href="${url}" class="el" style="color:rgba(247,147,26,0.75);text-decoration:none;">Subscribe free &#8594;</a>`;
  return `<p class="ed" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.42);">${text}</p>`;
}

// Small print line placed directly under the single CTA button in the alert
// and welcome emails. One line does double duty: it's the forward ask for an
// existing subscriber, and it's the value pitch ("free, no noise, one-click
// unsubscribe") for whoever that email gets forwarded to. Replaces what used
// to be three competing elements (a second CTA button, an X-share button, and
// a separate "was this forwarded to you" box).
//
// subscriberCount defaults to the real current count rather than hiding the
// line when the caller doesn't pass one. Update the default as the number
// moves, or better, wire the caller to pass the live count from the DB.
function forwardAskLine(lang: Lang, subscriberCount: number = 16, subscriberGoal = 1000): string {
  const locale = lang === 'de' ? 'de-DE' : 'en-US';
  const counter = ` (${subscriberCount.toLocaleString(locale)} ${lang === 'de' ? 'von' : 'of'} ${subscriberGoal.toLocaleString(locale)} ${lang === 'de' ? 'Abonnenten' : 'subscribers'})`;
  const text = lang === 'de'
    ? `Kennst du jemanden, der das sehen sollte? Leite diese Mail weiter. Kostenlos, kein Lärm, jederzeit mit einem Klick abbestellbar.${counter}`
    : `Know someone who should see this? Forward this email along. Free to join, no noise, one-click unsubscribe any time.${counter}`;
  return `<p class="ed" style="margin:16px 0 0;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:1.7;color:rgba(237,232,222,0.42);">${text}</p>`;
}

// Plain hyperlinked text — the most demoted CTA form (below the outline button).
function textLink(href: string, label: string): string {
  return `<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.02em;">
    <a href="${href}" class="el" style="color:rgba(247,147,26,0.75);text-decoration:none;">${label}</a>
  </p>`;
}

// ─── Rule ─────────────────────────────────────────────────────────────────────

const rule = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr><td class="lr" style="height:1px;font-size:1px;line-height:1px;mso-line-height-rule:exactly;background-color:rgba(247,147,26,0.15);padding:0;">&nbsp;</td></tr>
</table><div style="height:28px;line-height:28px;font-size:1px;mso-line-height-rule:exactly;">&nbsp;</div>`;

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
// `opts` is a new optional 4th arg so existing call sites (positional 3-arg
// calls) keep compiling unchanged. Pass opts.signal once the confirm route has
// it available to tease the current signal above the CTA.

export function confirmationEmail(
  confirmUrl: string,
  unsubscribeUrl: string,
  lang: Lang,
  opts?: { signal?: SignalState; replyTo?: string }
): { subject: string; html: string } {
  const signal  = opts?.signal;
  const replyTo = opts?.replyTo ?? '';

  const subject = lang === 'de'
    ? 'Bitte bestätige deine Bitcoin-Signal-Alerts'
    : 'Confirm your Bitcoin signal alerts';

  const preheader = lang === 'de'
    ? 'Ein Tap zur Bestätigung, dann kommt jeden Sonntag dein Wochenüberblick.'
    : 'One tap to confirm, then your weekly read arrives every Sunday.';

  const footerReason = lang === 'de'
    ? 'Du erhältst diese E-Mail, weil du dich auf whentobuybtc.xyz angemeldet hast. Dies ist eine einmalige Bestätigung. Bis zur Bestätigung werden keine weiteren E-Mails versendet.'
    : 'You\'re receiving this because you subscribed at whentobuybtc.xyz. This is a one-time confirmation. No further emails will be sent until you confirm.';

  const signalTeaser = signal
    ? `<p class="em2" style="margin:0 0 24px;font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:0.05em;color:rgba(237,232,222,0.55);">${lang === 'de' ? 'Gerade jetzt' : 'Right now'}: <span style="color:${signalColor(signal)};font-weight:700;">${signalLabel(signal, lang)}</span></p>`
    : '';

  const body = lang === 'de' ? `
    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Fast geschafft</p>
    <h1 class="ehl et" style="margin:0 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#EDE8DE;">
      Bestätige deine<br /><span class="hem" style="font-style:italic;color:#F7931A;">Bitcoin-Alerts.</span>
    </h1>
    ${rule}
    ${signalTeaser}
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.88);">
      Ein Tap, und du bekommst jeden Sonntag einen kurzen Wochenüberblick, plus einen Hinweis, wenn Bitcoin an einem Tag um mehr als 3&nbsp;% steigt oder fällt.
    </p>
    <p class="em" style="margin:0 0 32px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      Dies ist eine Sicherheitsbestätigung. Wir möchten sicherstellen, dass du es wirklich bist. Deine Adresse wird niemals an Dritte weitergegeben, und du kannst dich jederzeit mit einem Klick abmelden.
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
    ${signalTeaser}
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.88);">
      You&#39;re one tap away from a short weekly read every Sunday, plus a note when Bitcoin moves more than 3% in a day.
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

  return { subject, html: shell({ lang, preheader, body, footerReason, unsubscribeUrl, replyTo }) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2: Signal alert
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Alert explanation ────────────────────────────────────────────────────────
// Built from the actual readings, never from the price direction alone, so it can't
// claim the indicators agree when they don't. Agreement uses the same thresholds as
// the score (Fear & Greed below 50 and price below its 200-day average both count
// toward the low-price side). Third person, never advice.
export function alertExplanation(signal: SignalState, fgValue: number, maPct: number, lang: Lang): string {
  const below  = maPct < 0;
  const absMa  = Math.abs(maPct).toFixed(1);
  const moodEn = fgValue < 25 ? 'extreme fear' : fgValue < 47 ? 'fear' : fgValue < 55 ? 'neutral' : fgValue < 76 ? 'greed' : 'extreme greed';
  const moodDe = fgValue < 25 ? 'extreme Angst' : fgValue < 47 ? 'Angst' : fgValue < 55 ? 'neutral' : fgValue < 76 ? 'Gier' : 'extreme Gier';
  const readEn = `Market mood reads ${moodEn} (Fear &amp; Greed ${fgValue}) and the price is ${absMa}% ${below ? 'below' : 'above'} its 200-day average.`;
  const readDe = `Die Marktstimmung zeigt ${moodDe} (Fear &amp; Greed ${fgValue}), und der Preis liegt ${absMa.replace('.', ',')}&nbsp;% ${below ? 'unter' : '\u00fcber'} seinem 200-Tage-Schnitt.`;
  const disagree = (fgValue < 50) !== below;
  const take: Record<string, { en: string; de: string }> = {
    accumulate: {
      en: 'Together with the distance from the peak, prices are low compared with recent history. Long-term holders tend to see days like this as cheaper sats.',
      de: 'Zusammen mit dem Abstand vom Hoch sind die Preise niedrig im Vergleich zur j\u00fcngsten Vergangenheit. Langfristige Halter sehen solche Tage meist als g\u00fcnstigere Sats.',
    },
    caution: {
      en: 'Together with the distance from the peak, prices are stretched. Long-term holders tend to enjoy days like this and keep their regular plan.',
      de: 'Zusammen mit dem Abstand vom Hoch sind die Preise gestreckt. Langfristige Halter genie\u00dfen solche Tage meist und bleiben bei ihrem Plan.',
    },
    holdSplit: {
      en: 'The two readings point different ways, so the signal stays in the middle. Most long-term holders simply keep their regular plan.',
      de: 'Die beiden Werte zeigen in unterschiedliche Richtungen, deshalb bleibt das Signal in der Mitte. Die meisten langfristigen Halter bleiben einfach bei ihrem Plan.',
    },
    holdCalm: {
      en: 'Neither reading is extreme, so the signal stays in the middle. Most long-term holders simply keep their regular plan.',
      de: 'Keiner der Werte ist extrem, deshalb bleibt das Signal in der Mitte. Die meisten langfristigen Halter bleiben einfach bei ihrem Plan.',
    },
  };
  const key = signal === 'hold' ? (disagree ? 'holdSplit' : 'holdCalm') : signal;
  return lang === 'de' ? `${readDe} ${take[key].de}` : `${readEn} ${take[key].en}`;
}

export function alertEmail(opts: {
  price:            number;
  movePct:          number;
  direction:        'up' | 'down';
  signal:           SignalState;
  fgValue:          number;
  maPct:            number;
  change24h:        number;
  unsubscribeUrl:   string;
  replyTo:          string;
  lang:             Lang;
  subscriberCount?: number;
  subscriberGoal?:  number;
  marketBlock?:     string; // optional market-context HTML (lib/macro/email.ts); omitted → output unchanged
}): { subject: string; html: string; replyTo: string } {
  const { price, movePct, direction, signal, fgValue, maPct, change24h, unsubscribeUrl, replyTo, lang, subscriberCount, subscriberGoal, marketBlock } = opts;
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
      ? `Bitcoin ist heute deutlich gefallen. Ein Tag, auf den langfristige Bitcoiner vorbereitet sind.`
      : `Bitcoin steht heute deutlich im Plus. Wenn du die ruhigen Phasen durchgehalten hast, ist das hier der Teil, der sich auszahlt.`
    : isDown
      ? `Bitcoin has dropped sharply today. The kind of day long-term Bitcoiners plan for in advance.`
      : `Bitcoin is up sharply today. If you've been holding through the quiet stretches, this is the part that makes it worth it.`;

  const context = alertExplanation(signal, fgValue, maPct, lang);

  const subject = lang === 'de'
    ? `Bitcoin ${isDown ? 'fiel' : 'stieg'} ${pct}%. Markt heute: ${label}`
    : `Bitcoin ${isDown ? 'dropped' : 'surged'} ${pct}%. Market today: ${label}`;

  const preheader = lang === 'de'
    ? `${headline}. Markt heute: ${label}.`
    : `${headline}. Market today: ${label}.`;

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
            <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${lang === 'de' ? 'Markt heute' : 'Market today'}</p>
            <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.03em;color:${color};">${label}</p>
            <p class="em2" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:9px;color:rgba(237,232,222,0.55);">${signalBehaviour(signal, lang, change24h)}</p>
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
    ${marketBlock ?? ''}${disclaimerBox(disclaimerText)}
    ${ctaButton('https://whentobuybtc.xyz/?utm_source=email&utm_medium=alert&utm_campaign=cta#signal', ctaLabel, 240)}
    ${forwardAskLine(lang, subscriberCount, subscriberGoal)}
  `;

  return { subject, html: shell({ lang, preheader, headerRight, body, footerReason, unsubscribeUrl, replyTo }), replyTo };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3: Weekly digest
// ═══════════════════════════════════════════════════════════════════════════════

export function digestEmail(opts: {
  price:            number;
  signal:           SignalState;
  fgValue:          number;
  maPct:            number;
  athPct:           number;
  change24h:        number;
  unsubscribeUrl:   string;
  replyTo:          string;
  lang:             Lang;
  prevFgValue?:     number;
  prevMaPct?:       number;
  prevAthPct?:      number;
  subscriberCount?: number;
  subscriberGoal?:  number;
  marketBlock?:     string; // optional market-context HTML (lib/macro/email.ts); omitted → output unchanged
}): { subject: string; html: string; replyTo: string } {
  const {
    price, signal, fgValue, maPct, athPct, change24h, unsubscribeUrl, replyTo, lang,
    prevFgValue, prevMaPct, prevAthPct, subscriberGoal, marketBlock,
  } = opts;
  // Defaults to the real current count rather than hiding the progress line
  // and forward-ask narrative below when the caller doesn't pass a live
  // value. Update this default as the number moves, or better, wire the
  // sending route to pass the actual count from the DB on every send.
  const subscriberCount = opts.subscriberCount ?? 16;
  const color   = signalColor(signal);
  const label   = signalLabel(signal, lang);
  const maSign  = maPct   >= 0 ? '+' : '';
  const athSign = athPct  >= 0 ? '+' : '';

  const subjectMap: Record<SignalState, Record<Lang, string>> = {
    accumulate: { en: 'Bitcoin this week: Cold', de: 'Bitcoin diese Woche: Kalt' },
    hold:       { en: 'Bitcoin this week: Mild', de: 'Bitcoin diese Woche: Mild' },
    caution:    { en: 'Bitcoin this week: Hot',  de: 'Bitcoin diese Woche: Heiß' },
  };
  // Subject always carries the current F&G value (so it varies week to week
  // even on a flat "hold" streak), and shows the prior→current arrow once
  // history exists — that's the actual delta story, right in the inbox list.
  const baseSubject = subjectMap[signal][lang];
  const subject = prevFgValue != null && prevFgValue !== fgValue
    ? `${baseSubject}. ${lang === 'de' ? 'Stimmung' : 'Mood'} ${prevFgValue}\u2192${fgValue}`
    : `${baseSubject}. ${lang === 'de' ? 'Stimmung' : 'Mood'} ${fgValue}`;

  const preheaderMap: Record<SignalState, Record<Lang, string>> = {
    accumulate: { en: 'Markets are fearful. Here\'s where the three indicators stand.', de: 'Angst am Markt. So stehen die drei Indikatoren.' },
    hold:       { en: 'Steady week. Here\'s where the three indicators stand.',         de: 'Ruhige Woche. So stehen die drei Indikatoren.' },
    caution:    { en: 'Greed is running high. Here\'s where the three indicators stand.', de: 'Gier am Markt. So stehen die drei Indikatoren.' },
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
      en: 'Greed is elevated across the board. Long-term holders tend to enjoy stretches like this and keep their regular plan.',
      de: 'Die Gier ist insgesamt erhöht. Langfristige Halter genießen solche Phasen meist und bleiben bei ihrem Plan.',
    },
  };

  const greetingLine = lang === 'de' ? 'Hey,' : 'Hey there,';
  const intro1       = lang === 'de'
    ? 'ich hoffe, deine Woche läuft gut. Hier ist, wo Bitcoin gerade steht: drei Indikatoren, kein Lärm, einfach das, was die Daten zeigen.'
    : 'Hope you\'re having a good week. Here\'s where Bitcoin stands right now: three indicators, no noise, just what the data shows.';
  const ctaLabel     = lang === 'de' ? 'Vollständiges Signal &#8594;' : 'Full signal breakdown &#8594;';
  const signalLabel2 = lang === 'de' ? 'Markt heute' : 'Market today';
  const maLabel      = lang === 'de' ? '200-Tage-Schnitt' : 'Long-term avg';
  const athLabel     = lang === 'de' ? 'Abstand ATH'      : 'From ATH';
  // Signal-specific "why this combination matters" line, replacing what used
  // to be a static Fear&Greed/200-day/ATH glossary paragraph. The numbers
  // themselves are already in the stat boxes above — this explains what
  // having them line up this way (rather than any one number alone) means.
  const insight: Record<SignalState, Record<Lang, string>> = {
    accumulate: {
      en: 'Fear spikes on their own happen most weeks. This week fear and a price below its long-term trend show up together, which is what makes the market read cold. Long-term holders tend to see stretches like this as cheaper sats.',
      de: 'Ein kurzer Angst-Ausschlag allein kommt fast jede Woche vor. Diese Woche treffen Angst und ein Preis unter dem langfristigen Trend zusammen, deshalb liest sich der Markt kalt. Langfristige Halter sehen solche Phasen meist als günstigere Sats.',
    },
    hold: {
      en: 'None of the three indicators is doing anything extreme right now, and that\'s the signal itself: a quiet reading across fear, trend, and drawdown usually means the market is between stories, not on the edge of one.',
      de: 'Keiner der drei Indikatoren schlägt gerade stark aus, das ist selbst das Signal. Eine ruhige Lesung über Angst, Trend und Abstand vom Hoch bedeutet meist: Der Markt ist zwischen zwei Geschichten, nicht kurz vor einer.',
    },
    caution: {
      en: 'High greed on its own isn\'t rare. What matters is that it\'s showing up at the same time price is running well above its long-term trend and sitting close to its highs, and historically that combination has mattered more than any single number on its own.',
      de: 'Hohe Gier allein ist nichts Besonderes. Entscheidend ist, dass sie gerade zusammenfällt mit einem Preis deutlich über dem langfristigen Trend und nahe am Hoch, und historisch war diese Kombination aussagekräftiger als jede einzelne Zahl für sich.',
    },
  };
  const contextText = insight[signal][lang];

  const disclaimerText2 = lang === 'de'
    ? 'Dies sind Marktdaten, keine Anlageberatung. Vergangene Signallagen sind keine Garantie für zukünftige Entwicklungen. Bitte triff eigene, informierte Entscheidungen.'
    : 'This is market data, not financial advice. Past signal conditions are not a guarantee of future performance. Always make your own informed decisions.';

  // Cycle marker (date math only).
  const cycle = cycleMarker(lang);

  // "What changed since last week" — the actual reason to open a weekly email.
  // Falls back to nothing (not an error) on the first-ever send.
  const changeSummary = weekChangeSummary(fgValue, prevFgValue, lang);

  // UTM-tagged CTA. Query string MUST come before the #signal fragment, or the
  // params get swallowed into the hash and Umami never sees them.
  const ctaUrl = 'https://whentobuybtc.xyz/?utm_source=email&utm_medium=digest&utm_campaign=cta#signal';

  const body = `
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.88);">${greetingLine}</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.88);">${intro1}</p>
    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${headerRight}</p>
    <h1 class="ehl et" style="margin:0 0 8px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.35;color:#EDE8DE;">
      ${signalDigestHeadline(signal, lang)}
    </h1>
    ${rule}
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;font-style:italic;line-height:1.8;color:rgba(237,232,222,0.88);">${intros[signal][lang]}</p>
    ${changeSummary ? `<p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">${changeSummary}</p>` : ''}
    ${priceBlock(price, change24h, lang)}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.07);border:1px solid rgba(247,147,26,0.22);margin-bottom:20px;">
      <tr><td style="padding:18px 24px;">
        <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${signalLabel2}</p>
        <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;letter-spacing:0.03em;color:${color};">${label}</p>
        <p class="em2" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:10px;color:rgba(237,232,222,0.55);">${signalBehaviour(signal, lang, change24h)}</p>
      </td></tr>
    </table>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;"><tr>
      <td class="mc" width="32%" style="padding:14px 16px;background-color:rgba(247,147,26,0.05);border:1px solid rgba(247,147,26,0.15);">
        <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Fear &amp; Greed</p>
        <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:500;color:#EDE8DE;">${fgValue}</p>
        ${statDelta(fgValue, prevFgValue, lang, false)}
      </td>
      <td width="8" style="padding:0;">&nbsp;</td>
      <td class="mc" width="32%" style="padding:14px 16px;background-color:rgba(247,147,26,0.05);border:1px solid rgba(247,147,26,0.15);">
        <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${maLabel}</p>
        <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:500;color:#EDE8DE;">${maSign}${maPct.toFixed(1)}%</p>
        ${statDelta(maPct, prevMaPct, lang, true)}
      </td>
      <td width="8" style="padding:0;">&nbsp;</td>
      <td class="mc" width="32%" style="padding:14px 16px;background-color:rgba(247,147,26,0.05);border:1px solid rgba(247,147,26,0.15);">
        <p class="em2" style="margin:0 0 5px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${athLabel}</p>
        <p class="et" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:500;color:#EDE8DE;">${athSign}${athPct.toFixed(1)}%</p>
        ${statDelta(athPct, prevAthPct, lang, true)}
      </td>
    </tr></table>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
      <tr><td style="border-left:2px solid rgba(247,147,26,0.3);padding:10px 16px;">
        <p class="em2" style="margin:0 0 4px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,232,222,0.55);">${cycle.label}</p>
        <p class="em" style="margin:0;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.6;color:rgba(237,232,222,0.88);">${cycle.text}</p>
      </td></tr>
    </table>
    <p class="em" style="margin:0 0 32px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">${contextText}</p>
    ${marketBlock ?? ''}${disclaimerBox(disclaimerText2)}
    ${ctaButton(ctaUrl, ctaLabel, 240)}
    <div style="height:24px;line-height:24px;font-size:1px;mso-line-height-rule:exactly;">&nbsp;</div>
    ${spreadSection({
      lang,
      forwardLead: lang === 'de'
        ? `Ich bin ein Ein-Personen-Projekt mit aktuell ${subscriberCount.toLocaleString('de-DE')} Abonnenten und will 1.000 erreichen. Wenn dir das hier weiterhilft, leite diese Mail an eine Person weiter, die das sehen sollte. So komme ich dahin. Danke dir! &#10084;&#65039;`
        : `I&#39;m a one-person project with ${subscriberCount.toLocaleString('en-US')} subscribers right now, trying to reach 1,000. If this is useful, forward it to one person who should see it. That&#39;s how I get there. Thank you! &#10084;&#65039;`,
      shareText: signalShareText(signal, lang, price, change24h, fgValue),
      shareLabel: lang === 'de' ? 'Auf X teilen' : 'Share on X',
      subscriberCount,
      subscriberGoal,
    })}
    ${rule}
    ${subscribeLineSmall(lang, 'digest')}
  `;

  return { subject, html: shell({ lang, preheader, headerRight, body, footerReason, unsubscribeUrl, replyTo }), replyTo };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 4: Welcome (sent after double opt-in confirmed)
// ═══════════════════════════════════════════════════════════════════════════════
// `opts` is a new optional 3rd arg so an existing 2-arg call site keeps
// compiling unchanged until it's updated to pass replyTo/subscriberCount.

export function welcomeEmail(
  unsubscribeUrl: string,
  lang: Lang,
  opts?: { replyTo?: string; subscriberCount?: number; subscriberGoal?: number }
): { subject: string; html: string } {
  const replyTo         = opts?.replyTo ?? '';
  const subscriberCount = opts?.subscriberCount;
  const subscriberGoal  = opts?.subscriberGoal ?? 1000;

  const subject = lang === 'de'
    ? 'Du bist dabei: Bitcoin-Signal-Alerts aktiv'
    : 'You\'re in: Bitcoin signal alerts are on';

  const preheader = lang === 'de'
    ? 'Willkommen. Hier ist alles, was du über deine Alerts wissen musst.'
    : 'Welcome. Here\'s everything you need to know about your alerts.';

  const footerReason = lang === 'de'
    ? 'Du erhältst diese E-Mail, weil du Bitcoin-Signal-Alerts auf whentobuybtc.xyz bestätigt hast.'
    : 'You\'re receiving this because you confirmed your subscription to Bitcoin signal alerts at whentobuybtc.xyz.';

  const disclaimerText = lang === 'de'
    ? 'Dies sind Marktdaten, keine Anlageberatung. Vergangene Signallagen sind keine Garantie für zukünftige Entwicklungen. Bitte triff eigene, informierte Entscheidungen.'
    : 'This is market data, not financial advice. Past signal conditions are not a guarantee of future performance. Always make your own informed decisions.';

  // Above-the-fold reply ask. Welcome emails get the best open rates of any
  // send type; a first-day reply from a new subscriber is one of the
  // strongest deliverability signals a small sender can get.
  const replyCallout = lang === 'de' ? `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.07);border:1px solid rgba(247,147,26,0.22);margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <p class="em2" style="margin:0 0 8px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Sag Hallo</p>
        <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.75;color:rgba(237,232,222,0.88);">Antworte einfach auf diese Mail und erzähl mir kurz, wie du Bitcoin ansammelst. Ich lese jede Antwort persönlich.</p>
      </td></tr>
    </table>
  ` : `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.07);border:1px solid rgba(247,147,26,0.22);margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <p class="em2" style="margin:0 0 8px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Say hello</p>
        <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.75;color:rgba(237,232,222,0.88);">Just hit reply and tell me how you stack sats. I read every reply myself.</p>
      </td></tr>
    </table>
  `;

  // Alert-trigger description, corrected to match check-signal.ts exactly:
  // fires on |24h change| >= 3% alone (no "and the signal changes" condition —
  // that clause was in the EN copy but not the trigger logic). Also now
  // reflects the direction-aware cooldown: same-direction moves are capped at
  // once per 24h, but an opposite-direction reversal can fire sooner.
  const alertRow = lang === 'de'
    ? 'Sofort, wenn Bitcoin an einem Tag um mehr als 3&nbsp;% steigt oder fällt. Maximal einmal alle 24 Stunden in dieselbe Richtung. Bei einer Trendwende kann trotzdem früher eine neue Meldung kommen.'
    : 'Immediately when Bitcoin moves more than 3% in a day. Capped at once every 24 hours in the same direction. A sharp reversal can still trigger a fresh alert sooner.';

  const body = lang === 'de' ? `
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.88);">Hey,</p>

    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Bestätigt</p>
    <h1 class="ehl et" style="margin:0 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#EDE8DE;">
      Du bist dabei.<br /><span style="font-style:italic;color:#F7931A;">Alerts sind aktiv.</span>
    </h1>
    ${rule}

    ${replyCallout}

    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.8;color:rgba(237,232,222,0.78);">
      Deine Anmeldung ist bestätigt. Hier ist genau, was dich erwartet.
    </p>

    <!-- When alerts fire -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Wann du eine E-Mail erhältst</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.07);border:1px solid rgba(247,147,26,0.22);margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom:14px;border-bottom:1px solid rgba(247,147,26,0.1);">
              <p class="em2" style="margin:0 0 3px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Signal-Alert</p>
              <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;line-height:1.7;color:rgba(237,232,222,0.88);">${alertRow}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:14px;">
              <p class="em2" style="margin:0 0 3px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Wöchentlicher Überblick</p>
              <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;line-height:1.7;color:rgba(237,232,222,0.88);">Jeden Sonntag um 17:00 Uhr: aktuelles Signal, Fear &amp; Greed, 200-Tage-Durchschnitt und ATH-Abstand auf einen Blick.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Why Bitcoin -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Warum Bitcoin</p>
    <p class="em" style="margin:0 0 16px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      Bitcoin ist das erste knappe digitale Gut der Geschichte, auf 21 Millionen Einheiten begrenzt, und niemand kann weitere Einheiten erzeugen. In einer Welt, in der Zentralbanken die Geldmenge jährlich ausweiten, bietet Bitcoin einen Ausweg aus der schleichenden Entwertung.
    </p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      Das ist der Grund, ihn zu halten. Wann und wie viel du dazukaufst, dafür ist das Signal da.
    </p>

    <!-- Why DCA -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Warum DCA die beste Strategie ist</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      Du musst das nicht timen. Leg jedes Mal den gleichen Betrag am gleichen Tag zurück und lass das Signal dir sagen, wann du etwas mehr dazukaufen kannst. Es gibt keinen perfekten Moment, auf den man warten muss.
    </p>

    ${disclaimerBox(disclaimerText)}
    ${ctaButton('https://whentobuybtc.xyz', 'Signal ansehen →', 220)}
    ${forwardAskLine(lang, subscriberCount, subscriberGoal)}
  ` : `
    <p class="em" style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:1.75;color:rgba(237,232,222,0.88);">Hey there,</p>

    <p class="em2" style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Confirmed</p>
    <h1 class="ehl et" style="margin:0 0 6px;font-family:Georgia,'Times New Roman',Times,serif;font-size:28px;font-weight:400;line-height:1.25;color:#EDE8DE;">
      You&#39;re in.<br /><span style="font-style:italic;color:#F7931A;">Alerts are on.</span>
    </h1>
    ${rule}

    ${replyCallout}

    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.8;color:rgba(237,232,222,0.78);">
      Your subscription is confirmed. Here&#39;s exactly what to expect.
    </p>

    <!-- When alerts fire -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">When you&#39;ll hear from us</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="sb" style="background-color:rgba(247,147,26,0.07);border:1px solid rgba(247,147,26,0.22);margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding-bottom:14px;border-bottom:1px solid rgba(247,147,26,0.1);">
              <p class="em2" style="margin:0 0 3px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Signal alert</p>
              <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;line-height:1.7;color:rgba(237,232,222,0.88);">${alertRow}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:14px;">
              <p class="em2" style="margin:0 0 3px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Weekly digest</p>
              <p class="em" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:13px;line-height:1.7;color:rgba(237,232,222,0.88);">Every Sunday at 5PM Vienna time: current signal, Fear &amp; Greed, 200-day average, and ATH distance at a glance.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Why Bitcoin -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Why Bitcoin</p>
    <p class="em" style="margin:0 0 16px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      Bitcoin is the first scarce digital asset in history, capped at 21 million units, with no authority able to print more. In a world where central banks expand the money supply every year, Bitcoin offers a way out of slow, silent devaluation.
    </p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      That&#39;s the case for it. Everything else, when to add and how much, is what the signal&#39;s here for.
    </p>

    <!-- Why DCA -->
    <p class="em2" style="margin:0 0 10px;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,232,222,0.55);">Why DCA is the best strategy</p>
    <p class="em" style="margin:0 0 28px;font-family:Georgia,'Times New Roman',Times,serif;font-size:14px;line-height:1.85;color:rgba(237,232,222,0.78);">
      You don&#39;t need to time this. Put in the same amount on the same day, every time, and let the signal tell you when to add a bit more. There&#39;s no perfect moment to wait for.
    </p>

    ${disclaimerBox(disclaimerText)}
    ${ctaButton('https://whentobuybtc.xyz', 'View the signal →', 220)}
    ${forwardAskLine(lang, subscriberCount, subscriberGoal)}
  `;

  return { subject, html: shell({ lang, preheader, body, footerReason, unsubscribeUrl, replyTo }) };
}
