// Builds the homepage HTML from public/app.html. The FAQ lives in app.html's translations
// (rendered by JS in the browser); here the English items are also written into the HTML
// and into FAQPage schema, so crawlers that don't run JavaScript still read them.
// Single source of truth stays in app.html: nothing to keep in sync by hand.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';

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

let cached: { mtime: number; html: string; etag: string } | null = null;

export function homeHtml(): { html: string; etag: string } {
  const file = path.join(process.cwd(), 'public', 'app.html');
  const mtime = fs.statSync(file).mtimeMs;
  if (!cached || cached.mtime !== mtime) {
    const html = buildHomeHtml(fs.readFileSync(file, 'utf8'));
    const etag = 'W/"' + crypto.createHash('sha1').update(html).digest('base64url').slice(0, 27) + '"';
    cached = { mtime, html, etag };
  }
  return cached;
}
