// Plain-text part for every email, derived from the HTML so the two can never drift apart.
// Multipart (HTML + text) mail scores better with spam filters, and some readers prefer text.

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#183;': '·', '&middot;': '·',
  '&#8594;': '→', '&rarr;': '→', '&times;': '×', '&#8383;': '₿', '&#214;': 'Ö', '&zwnj;': '', '&#8212;': '-',
};

function decode(s: string): string {
  return s.replace(/&[a-z#0-9]+;/gi, (e) => (e in ENTITIES ? ENTITIES[e] : /^&#\d+;$/.test(e) ? String.fromCharCode(+e.slice(2, -1)) : e));
}

export function htmlToText(html: string): string {
  let s = html;
  s = s.replace(/<head[\s\S]*?<\/head>/i, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');                                  // Outlook-only VML blocks and comments
  s = s.replace(/<div style="display:none[\s\S]*?<\/div>/i, '');          // preheader
  // Links: "label (url)", or just the url when the label is the url; drop the logo link
  s = s.replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
    const label = decode(inner.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (!label || /^WHEN TO BUY BTC$/i.test(label.replace(/^₿\s*/, ''))) return label;
    if (href.startsWith('#') || href.startsWith('mailto:')) return label;
    return label === href ? href : `${label} (${href})`;
  });
  s = s.replace(/<img[^>]*>/gi, '');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|h1|h2|h3|tr|table|li)>/gi, '\n');
  s = s.replace(/<\/td>/gi, '  ');
  s = s.replace(/<[^>]+>/g, '');
  s = decode(s);
  return s
    .split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
