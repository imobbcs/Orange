// Server-side render of the homepage hero (price, Cold/Mild/Hot, sentence, scale, the three readings).
// public/app.html stays the single source: its translations are read from the file, and the browser
// script re-renders the same elements from the same numbers (seedFromServer → apply* functions).
// Everything here mirrors app.html's own rendering, so the hand-over is invisible.
import vm from 'vm';
import { computeSignal, type SignalState } from './signal';

export interface HeroSnapshot {
  price: number;
  priceUsd: number | null;
  change24h: number | null;
  fg: number;
  fgLabel: string | null;
  ma200: number;
  athEur: number;
}

type Lang = 'en' | 'de';
type T = Record<string, any>;

/** The `translations` object from app.html, evaluated in a sandbox. Null if it can't be read. */
export function readTranslations(html: string): { en: T; de: T } | null {
  try {
    const marker = 'const translations = {';
    let i = html.indexOf(marker);
    if (i < 0) return null;
    i += marker.length - 1;
    const from = i;
    let depth = 0, quote: string | null = null;
    for (; i < html.length; i++) {
      const c = html[i];
      if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'" || c === '`') quote = c;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) break;
    }
    const t = vm.runInNewContext('(' + html.slice(from, i + 1) + ')', {}, { timeout: 500 });
    return t && t.en && t.de ? t : null;
  } catch {
    return null;
  }
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Same formatting as app.html: numLocale(), formatPrice(), fmtPct()
const numLocale = (lang: Lang) => (lang === 'de' ? 'de-DE' : 'en-GB');
function formatPrice(p: number, lang: Lang) {
  return p >= 1000 ? Math.round(p).toLocaleString(numLocale(lang)) : p.toFixed(0);
}
function fmtPct(v: number, lang: Lang, dp = 1, signed = true) {
  const r = Number(v.toFixed(dp));
  const sign = r < 0 ? '−' : r > 0 && signed ? '+' : '';
  return sign + Math.abs(r).toLocaleString(numLocale(lang), { minimumFractionDigits: dp, maximumFractionDigits: dp }) + '%';
}

/** Replaces the content (and optionally adds attributes) of the element with this id. Leaves html unchanged if not found. */
function fill(html: string, id: string, content: string | null, attrs: Record<string, string> = {}): string {
  const re = new RegExp(`<([a-z0-9]+)([^>]*?)\\sid="${id}"([^>]*)>([\\s\\S]*?)</\\1>`);
  return html.replace(re, (_m, tag, a1, a2, inner) => {
    let open = `${a1} id="${id}"${a2}`;
    for (const [k, v] of Object.entries(attrs)) {
      const attrRe = new RegExp(`\\s${k}="[^"]*"`);
      open = attrRe.test(open) ? open.replace(attrRe, ` ${k}="${esc(v)}"`) : `${open} ${k}="${esc(v)}"`;
    }
    return `<${tag}${open}>${content === null ? inner : content}</${tag}>`;
  });
}

export function renderHero(html: string, s: HeroSnapshot, lang: Lang, tr: { en: T; de: T }, now = Date.now()): string {
  const t = tr[lang];
  const maPct = ((s.price - s.ma200) / s.ma200) * 100;
  const athPct = ((s.price - s.athEur) / s.athEur) * 100;
  const sig = computeSignal({ fgValue: s.fg, fgClass: s.fgLabel, maPct, athPct });
  const st: SignalState = sig.state;
  const name: string = t.stateName[st];
  const temp = { accumulate: 'cold', hold: 'mild', caution: 'hot' }[st];

  // Headline: same rotation and momentum pools as updateSignal()
  const day = Math.floor(now / 86400000);
  const ch = s.change24h;
  const pool: string[] = st === 'accumulate' ? (ch !== null && ch <= -5 ? t.signalAccumulateDump : t.signalAccumulate)
    : st === 'hold' ? t.signalHold
    : (ch !== null && ch >= 5 ? t.signalCautionHot : t.signalCaution);
  const headline = pool[day % pool.length];

  let out = html;
  out = out.replace(/<html lang="[a-z]+"/, `<html lang="${lang}" data-temp="${temp}"`);

  // Price + 24h change (applyPrice)
  const priceText = formatPrice(s.price, lang);
  out = fill(out, 'price-value', esc(priceText), { class: 'hero-price' });
  out = fill(out, 'hero-price', null, { style: `--chars: ${priceText.length + 0.6}` });
  if (ch !== null) {
    const prev = s.price / (1 + ch / 100);
    const changeText = `${fmtPct(ch, lang, 2)} · ${ch < 0 ? '−' : '+'}€${formatPrice(Math.abs(s.price - prev), lang)} ${lang === 'de' ? 'heute' : 'today'}`;
    out = fill(out, 'price-change', esc(changeText), { class: `change ${ch >= 0 ? 'up' : 'down'}` });
  }

  // Temperature hero (_renderTempHero); the intro animation still runs in the browser
  out = fill(out, 'hero-state', esc(name + '.'));
  out = fill(out, 'hero-sentence', esc(headline));
  (['accumulate', 'hold', 'caution'] as SignalState[]).forEach((k, i) => {
    out = fill(out, ['hs-cold', 'hs-mild', 'hs-hot'][i], esc(t.stateName[k]), k === st ? { class: 'on' } : {});
  });
  out = fill(out, 'hero-scale', null, { 'aria-label': (lang === 'de' ? 'Markttemperatur: ' : 'Market temperature: ') + name });
  const score = Math.max(-5, Math.min(5, sig.score));
  out = fill(out, 'hero-scale-marker', '', { style: `left: ${((5 - score) / 10) * 100}%` });
  out = fill(out, 'hero-why-btn', esc((lang === 'de' ? 'Warum ' : 'Why ') + name.toLowerCase() + '?'));

  // The three readings (updateHeroStrip)
  const fgColor = s.fg < 25 ? 'var(--green)' : s.fg < 75 ? 'var(--amber)' : 'var(--orange)';
  const fgState = s.fgLabel ? ((t.fgLabels && t.fgLabels[s.fgLabel]) || s.fgLabel) : '';
  out = fill(out, 'hero-fg-value', String(s.fg), { style: `color: ${fgColor};` });
  out = fill(out, 'hero-fg-state', esc(fgState), { style: `color: ${fgColor};` });
  const maColor = maPct < -10 ? 'var(--green)' : maPct < 10 ? 'var(--amber)' : 'var(--orange)';
  out = fill(out, 'hero-ma-value', esc(fmtPct(maPct, lang)), { style: `color: ${maColor};` });
  out = fill(out, 'hero-ma-state', esc(maPct >= 0 ? t.heroAbove : t.heroBelow), { style: `color: ${maColor};` });
  const athColor = athPct < -50 ? 'var(--green)' : athPct < -25 ? 'var(--amber)' : 'var(--orange)';
  const atAth = athPct >= 0;
  out = fill(out, 'hero-ath-value', esc(fmtPct(athPct, lang, 1, false)), { style: `color: ${athColor};` });
  out = fill(out, 'hero-ath-state', esc(atAth ? (lang === 'de' ? 'Neues Hoch' : 'New high') : t.heroDiscount), { style: `color: ${athColor};` });

  // Numbers for the browser script (seedFromServer)
  // Without JavaScript the intro never runs; show the server-rendered hero as is
  const noscript = '<noscript><style>.temp-hero .hero-state{clip-path:none}.temp-hero .hero-sentence,.temp-hero .hero-scale,.temp-hero .hero-strip,.temp-hero .hero-actions{opacity:1}</style></noscript>';
  const seed = `${noscript}\n<script>window.__WTB_SNAPSHOT=${JSON.stringify(s).replace(/</g, '\\u003c')};</script>\n</head>`;
  return out.replace('</head>', seed);
}
