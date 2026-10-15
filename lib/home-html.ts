// Builds the homepage HTML from public/app.html. The FAQ lives in app.html's translations
// (rendered by JS in the browser); here the English items are also written into the HTML
// and into FAQPage schema, so crawlers that don't run JavaScript still read them.
// Single source of truth stays in app.html: nothing to keep in sync by hand.
// homeHtml() also fills the hero with today's numbers (lib/home-hero.ts).
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';
import type { IncomingMessage } from 'http';
import { marketSnapshot } from './market-ssr';
import { readTranslations, renderHero, type HeroSnapshot } from './home-hero';

interface FaqItem { q: string; a: string }

function extractArray(src: string, marker: string): string | null {
  const start = src.indexOf(marker);
  if (start < 0) return null;
  let i = src.indexOf('[', start), depth = 0, quote: string | null = null;
  const from = i;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) return src.slice(from, i + 1);
  }
  return null;
}

export function englishFaq(html: string): FaqItem[] {
  try {
    const arr = extractArray(html, 'faqItems: [');
    if (!arr) return [];
    const items = vm.runInNewContext('(' + arr + ')', {}, { timeout: 200 });
    return Array.isArray(items) ? items.filter((x) => x && typeof x.q === 'string' && typeof x.a === 'string') : [];
  } catch {
    return [];
  }
}

const strip = (h: string) => h.replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>\s*<p>/gi, ' ').replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildHomeHtml(raw: string): string {
  const faq = englishFaq(raw);
  if (!faq.length) return raw;
  const items = faq.map((item, i) => `
      <div class="faq-item" id="faq-item-${i}">
        <button class="faq-question" aria-expanded="false" onclick="toggleFaq(${i})" aria-controls="faq-answer-${i}">
          <span class="faq-question-text">${escAttr(item.q)}</span>
          <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="faq-answer" id="faq-answer-${i}" role="region">
          <div class="faq-answer-inner">${item.a}</div>
        </div>
      </div>`).join('');
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: strip(f.q), acceptedAnswer: { '@type': 'Answer', text: strip(f.a) } })),
  };
  const ld = `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>\n</head>`;
  return raw
    .replace('<!-- Items injected by JS from translations -->', items)
    .replace('</head>', ld);
}

// ── Static part: app.html + server-rendered FAQ, rebuilt only when the file changes ──
let base: { mtime: number; html: string; tr: ReturnType<typeof readTranslations> } | null = null;

function baseHtml() {
  const file = path.join(process.cwd(), 'public', 'app.html');
  const mtime = fs.statSync(file).mtimeMs;
  if (!base || base.mtime !== mtime) {
    const raw = fs.readFileSync(file, 'utf8');
    base = { mtime, html: buildHomeHtml(raw), tr: readTranslations(raw) };
  }
  return base;
}

// ── Live part: today's numbers. Never makes a visitor wait long: serves the last good snapshot
// while a fresh one loads in the background, and waits at most ~1.5s when there is none yet. ──
const FRESH_MS = 60 * 1000;      // refresh in the background after a minute
const MAX_AGE_MS = 30 * 60 * 1000; // older than this, don't show it (fall back to the plain page)
const FIRST_WAIT_MS = 1500;
let snap: { data: HeroSnapshot; at: number } | null = null;
let inflight: Promise<void> | null = null;

function refresh(req: IncomingMessage): Promise<void> {
  inflight = inflight || marketSnapshot(req, { history: true })
    .then((m) => {
      if (m.price && m.fg !== null && m.ma200 && m.athEur) {
        snap = { at: Date.now(), data: { price: m.price, priceUsd: m.priceUsd, change24h: m.change24h, fg: m.fg, fgLabel: m.fgLabel, ma200: m.ma200, athEur: m.athEur } };
      }
    })
    .catch(() => {})
    .finally(() => { inflight = null; });
  return inflight;
}

async function currentSnapshot(req: IncomingMessage): Promise<HeroSnapshot | null> {
  const age = snap ? Date.now() - snap.at : Infinity;
  if (age < FRESH_MS) return snap!.data;
  const pending = refresh(req);
  if (age < MAX_AGE_MS) return snap!.data;
  await Promise.race([pending, new Promise((r) => setTimeout(r, FIRST_WAIT_MS))]);
  return snap && Date.now() - snap.at < MAX_AGE_MS ? snap.data : null;
}

const pages = new Map<string, { html: string; etag: string }>();

/** The homepage for this request: hero filled with today's numbers when available, plain app.html otherwise. */
export async function homeHtml(req: IncomingMessage, lang: 'en' | 'de' = 'en'): Promise<{ html: string; etag: string }> {
  const b = baseHtml();
  const data = b.tr ? await currentSnapshot(req) : null;
  const key = `${b.mtime}|${lang}|${data ? snap!.at : 'plain'}`;
  let page = pages.get(key);
  if (!page) {
    let html = b.html;
    if (data && b.tr) {
      try { html = renderHero(html, data, lang, b.tr); } catch (e) { console.error('home hero render failed:', (e as Error).message); }
    }
    page = { html, etag: 'W/"' + crypto.createHash('sha1').update(html).digest('base64url').slice(0, 27) + '"' };
    if (pages.size > 20) pages.clear();
    pages.set(key, page);
  }
  return page;
}
