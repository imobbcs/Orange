// Shared shell for the indexable data pages. Server-rendered so every number, heading and
// FAQ answer is in the HTML that search engines and AI crawlers read.
import Head from 'next/head';
import { useState, type ReactNode } from 'react';
import type { SignalState } from '../lib/signal';

const SITE = 'https://whentobuybtc.xyz';
type Lang = 'en' | 'de';

export interface Faq { q: string; a: string }

export const PAGES: Record<string, { en: { path: string; label: string }; de: { path: string; label: string } }> = {
  signal: { en: { path: '/', label: "Today's Bitcoin signal" }, de: { path: '/?lang=de', label: 'Das heutige Bitcoin-Signal' } },
  fg: { en: { path: '/bitcoin-fear-and-greed-index', label: 'Bitcoin Fear & Greed Index' }, de: { path: '/bitcoin-angst-und-gier-index', label: 'Angst und Gier Index' } },
  ma: { en: { path: '/bitcoin-200-day-moving-average', label: 'Bitcoin 200-day moving average' }, de: { path: '/bitcoin-200-tage-linie', label: 'Bitcoin 200-Tage-Linie' } },
  dca: { en: { path: '/bitcoin-dca-calculator', label: 'Bitcoin DCA calculator' }, de: { path: '/bitcoin-sparplan-rechner', label: 'Bitcoin Sparplan Rechner' } },
};

const STATE: Record<SignalState, { en: string; de: string; color: string }> = {
  accumulate: { en: 'Cold', de: 'Kalt', color: '#8EC9FF' },
  hold: { en: 'Mild', de: 'Mild', color: '#F2C46B' },
  caution: { en: 'Hot', de: 'Heiß', color: '#F7931A' },
};

export function StateBadge({ state, lang }: { state: SignalState | null; lang: Lang }) {
  if (!state) return null;
  const s = STATE[state];
  return (
    <span className="sp-badge" style={{ color: s.color, borderColor: s.color }}>
      <span className="sp-dot" style={{ background: s.color }} aria-hidden="true" />
      {lang === 'de' ? `Markt heute: ${s.de}` : `Market today: ${s.en}`}
    </span>
  );
}

export function Stat({ label, value, note, big }: { label: string; value: string; note?: string; big?: boolean }) {
  return (
    <div className={big ? 'sp-stat sp-stat-big' : 'sp-stat'}>
      <div className="sp-stat-label">{label}</div>
      <div className="sp-stat-value">{value}</div>
      {note ? <div className="sp-stat-note">{note}</div> : null}
    </div>
  );
}

/** Signs up in place (same endpoint and double opt-in as the homepage), so search visitors don't have to change page. */
function SignupForm({ lang, page }: { lang: Lang; page: string }) {
  const de = lang === 'de';
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'invalid' | 'error'>('idle');
  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setState('invalid'); return; }
    setState('sending');
    try {
      const r = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v, lang }) });
      const d = await r.json().catch(() => ({}));
      setState(d && d.ok ? 'ok' : 'error');
    } catch { setState('error'); }
  }
  if (state === 'ok') {
    return (
      <div className="sp-ok" role="status">
        <p className="sp-ok-title">{de ? 'Fast geschafft.' : 'Almost there.'}</p>
        <p>{de ? `Wir haben eine Mail an ${email.trim()} geschickt. Tippe auf den Link darin, dann kommt das Bitcoin-Wetter jeden Sonntag.` : `We sent an email to ${email.trim()}. Tap the link in it and the Bitcoin weather arrives every Sunday.`}</p>
        <p className="sp-ok-hint">{de ? 'Nichts da? Schau im Spam- oder Werbung-Ordner nach.' : 'Nothing there? Check your spam or Promotions folder.'}</p>
      </div>
    );
  }
  return (
    <form className="sp-form" onSubmit={submit} noValidate>
      <input className="sp-input" type="email" name="email" autoComplete="email" inputMode="email" enterKeyHint="send" aria-label="Email"
        placeholder={de ? 'deine@email.de' : 'your@email.com'} value={email} onChange={(e) => { setEmail(e.target.value); if (state !== 'sending') setState('idle'); }} />
      <button className="sp-btn" type="submit" disabled={state === 'sending'}
        data-umami-event="email-subscribe" data-umami-event-form="data-page" data-umami-event-page={page}>
        {state === 'sending' ? (de ? 'Wird gesendet…' : 'Sending…') : (de ? 'Kostenlos erhalten' : 'Get it free')}
      </button>
      {state === 'invalid' ? <p className="sp-msg" role="alert">{de ? 'Bitte eine gültige E-Mail-Adresse eingeben.' : 'Please enter a valid email address.'}</p> : null}
      {state === 'error' ? <p className="sp-msg" role="alert">{de ? 'Das hat nicht geklappt. Bitte gleich nochmal versuchen.' : 'That didn\'t work. Please try again in a moment.'}</p> : null}
    </form>
  );
}

interface Props {
  lang: Lang;
  pageKey: keyof typeof PAGES;
  title: string;
  description: string;
  kicker: string;
  h1: string;
  answer: ReactNode; // the one-paragraph direct answer (featured snippet / AI citation target)
  answerText: string; // plain-text version of the answer for schema
  updatedAt: string;
  faq: Faq[];
  children: ReactNode;
}

export default function SeoPage(p: Props) {
  const de = p.lang === 'de';
  const path = PAGES[p.pageKey][p.lang].path;
  const alt = PAGES[p.pageKey][de ? 'en' : 'de'].path;
  const url = SITE + path;
  const enUrl = SITE + PAGES[p.pageKey].en.path;
  const deUrl = SITE + PAGES[p.pageKey].de.path;
  const homeLabel = de ? 'Startseite' : 'Home';
  const ogImage = de ? `${SITE}/og-wann-bitcoin-kaufen.png` : `${SITE}/social-image.png`;

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': url,
      url,
      name: p.title,
      description: p.description,
      inLanguage: p.lang,
      dateModified: p.updatedAt,
      isPartOf: { '@type': 'WebSite', name: 'When to Buy BTC', url: SITE + '/' },
      author: { '@type': 'Person', name: 'Imo Babics', url: 'https://imobabics.com' },
      publisher: { '@type': 'Organization', name: 'When to Buy BTC', url: SITE + '/' },
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.sp-answer'] },
      mainEntity: { '@type': 'Question', name: p.h1, acceptedAnswer: { '@type': 'Answer', text: p.answerText } },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: homeLabel, item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: PAGES[p.pageKey][p.lang].label, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];

  const related = (Object.keys(PAGES) as (keyof typeof PAGES)[]).filter((k) => k !== p.pageKey);

  return (
    <>
      <Head>
        <title>{p.title}</title>
        <meta name="description" content={p.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <meta name="author" content="Imo Babics" />
        <link rel="canonical" href={url} />
        <link rel="alternate" hrefLang="en" href={enUrl} />
        <link rel="alternate" hrefLang="de" href={deUrl} />
        <link rel="alternate" hrefLang="x-default" href={enUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="When to Buy BTC" />
        <meta property="og:locale" content={de ? 'de_DE' : 'en_GB'} />
        <meta property="og:title" content={p.title} />
        <meta property="og:description" content={p.description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={p.title} />
        <meta name="twitter:description" content={p.description} />
        <meta name="twitter:image" content={ogImage} />
        <script defer src="https://umami-orange.up.railway.app/script.js" data-website-id="c884bf96-c757-4dfb-b2bb-8195d5876958" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;1,300;1,400&family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="sp-nav">
        <a href={de ? '/?lang=de' : '/'} className="sp-logo">When to Buy <b>BTC</b></a>
        <a href={alt} className="sp-lang" hrefLang={de ? 'en' : 'de'} lang={de ? 'en' : 'de'}>{de ? 'EN' : 'DE'}</a>
      </header>

      <main className="sp-main">
        <nav className="sp-crumbs" aria-label={de ? 'Brotkrumen' : 'Breadcrumb'}>
          <a href={de ? '/?lang=de' : '/'}>{homeLabel}</a> <span aria-hidden="true">/</span> <span>{PAGES[p.pageKey][p.lang].label}</span>
        </nav>

        <p className="sp-kicker">{p.kicker}</p>
        <h1 className="sp-h1">{p.h1}</h1>
        <div className="sp-answer">{p.answer}</div>
        <p className="sp-updated">
          {de ? 'Live-Daten, zuletzt aktualisiert: ' : 'Live data, last updated: '}
          <time dateTime={p.updatedAt}>{new Date(p.updatedAt).toLocaleString(de ? 'de-DE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Vienna' })} (Wien)</time>
        </p>

        {p.children}

        <section className="sp-cta">
          <p className="sp-cta-title">{de ? 'Das Bitcoin-Wetter, jeden Sonntag.' : 'The Bitcoin weather, every Sunday.'}</p>
          <p className="sp-cta-text">{de
            ? 'Kostenlos. Dazu eine kurze Notiz, wenn Bitcoin an einem Tag 3 % oder mehr bewegt. Keine Werbung, jederzeit abbestellbar.'
            : 'Free. Plus a short note when Bitcoin moves 3% or more in a day. No ads, unsubscribe anytime.'}</p>
          <SignupForm lang={p.lang} page={p.pageKey} />
        </section>

        <section className="sp-faq">
          <h2 className="sp-h2">{de ? 'Häufige Fragen' : 'Frequently asked questions'}</h2>
          {p.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <nav className="sp-related" aria-label={de ? 'Weitere Tools' : 'More tools'}>
          <h2 className="sp-h2">{de ? 'Weitere Tools' : 'More free tools'}</h2>
          <ul>
            {related.map((k) => (
              <li key={k}><a href={PAGES[k][p.lang].path}>{PAGES[k][p.lang].label} →</a></li>
            ))}
          </ul>
        </nav>
      </main>

      <footer className="sp-foot">
        <p>{de
          ? 'Beschreibt den Markt, gibt keine Kauf- oder Verkaufsempfehlung. Keine Anlageberatung.'
          : 'Describes the market. Never tells anyone to buy or sell. Not financial advice.'}</p>
        <p>© {new Date(p.updatedAt).getFullYear()} whentobuybtc.xyz · {de ? 'Gebaut von' : 'Built by'} <a href="https://imobabics.com" rel="author">Imo Babics</a> · {de ? 'Daten' : 'Data'}: CoinGecko, CoinMarketCap, alternative.me</p>
      </footer>
    </>
  );
}

const CSS = `
:root { --o:#F7931A; --bg:#09080A; --c:#EDE8DE; --g:rgba(237,232,222,0.55); --b:rgba(237,232,222,0.12);
  --title:'Bebas Neue', Impact, sans-serif; --display:'Cormorant Garamond', Georgia, serif; --mono:'DM Mono', ui-monospace, monospace; }
* { box-sizing: border-box; }
html { overflow-x: hidden; }
body { margin:0; background: var(--bg); color: var(--c); font-family: var(--display); font-size: 1.15rem; line-height: 1.6;
  background-image: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(247,147,26,0.10), transparent 70%); background-repeat:no-repeat; }
a { color: var(--o); }
.sp-nav { position: sticky; top:0; z-index:10; display:flex; justify-content:space-between; align-items:center; padding: 1rem 1.25rem;
  background: linear-gradient(180deg, rgba(9,8,10,0.95), rgba(9,8,10,0.75)); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-bottom:1px solid var(--b); }
.sp-logo { font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--c); text-decoration:none; min-height:44px; display:flex; align-items:center; gap:0.5em; }
.sp-logo b { color: var(--o); font-weight:400; }
.sp-lang { font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.15em; color: var(--g); text-decoration:none; min-width:44px; min-height:44px; display:flex; align-items:center; justify-content:center; }
.sp-main { max-width: 760px; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
.sp-crumbs { font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.06em; color: var(--g); margin-bottom: 2rem; }
.sp-crumbs a { color: var(--g); text-decoration:none; }
.sp-kicker { font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--o); margin: 0 0 0.75rem; }
.sp-h1 { font-family: var(--title); font-weight:400; font-size: clamp(2.6rem, 11vw, 4.6rem); line-height: 0.95; letter-spacing: 0.01em; margin: 0 0 1.25rem; }
.sp-h2 { font-family: var(--title); font-weight:400; font-size: clamp(1.7rem, 6vw, 2.4rem); line-height:1; letter-spacing: 0.02em; margin: 3rem 0 1rem; }
.sp-h3 { font-family: var(--mono); font-weight:500; font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--o); margin: 2rem 0 0.5rem; }
.sp-answer { font-size: 1.3rem; line-height: 1.5; border-left: 2px solid var(--o); padding: 0.25rem 0 0.25rem 1rem; }
.sp-answer p { margin: 0; }
.sp-updated { font-family: var(--mono); font-size: 0.66rem; letter-spacing: 0.06em; color: var(--g); margin: 1rem 0 2rem; }
.sp-badge { display:inline-flex; align-items:center; gap:0.55rem; font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.14em; text-transform: uppercase; border:1px solid; padding: 0.55rem 1rem; border-radius: 999px; }
.sp-dot { width:8px; height:8px; border-radius:50%; box-shadow: 0 0 10px currentColor; }
.sp-hero { border:1px solid var(--b); border-radius: 18px; padding: 1.5rem; background: linear-gradient(160deg, rgba(247,147,26,0.07), rgba(255,255,255,0.01) 60%); }
.sp-hero-num { font-family: var(--title); font-size: clamp(5rem, 30vw, 9rem); line-height: 0.85; color: var(--o); margin: 0.5rem 0; }
.sp-hero-label { font-family: var(--title); font-size: clamp(1.8rem, 8vw, 2.6rem); letter-spacing: 0.04em; line-height:1; }
.sp-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 0.75rem; margin-top: 1rem; }
@media (min-width: 640px) { .sp-grid { grid-template-columns: repeat(3, minmax(0,1fr)); } }
.sp-stat { border:1px solid var(--b); border-radius: 12px; padding: 0.9rem 1rem; background: rgba(255,255,255,0.015); }
.sp-stat-label { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--g); }
.sp-stat-value { font-family: var(--title); font-size: 1.9rem; line-height: 1.1; margin-top: 0.25rem; font-variant-numeric: tabular-nums; }
.sp-stat-note { font-family: var(--mono); font-size: 0.62rem; color: var(--g); margin-top: 0.15rem; }
.sp-gauge { position:relative; height: 10px; border-radius: 999px; margin: 1.5rem 0 0.5rem;
  background: linear-gradient(90deg, #7CC4FF 0%, #4ADE80 25%, #FBBF24 50%, #F7931A 75%, #EF4444 100%); }
.sp-gauge-pin { position:absolute; top:50%; width: 20px; height: 20px; border-radius:50%; background: var(--c); border: 3px solid var(--bg); transform: translate(-50%,-50%); box-shadow: 0 0 0 1px var(--c); }
.sp-gauge-scale { display:flex; justify-content:space-between; font-family: var(--mono); font-size: 0.58rem; letter-spacing: 0.08em; color: var(--g); text-transform: uppercase; }
.sp-table { width:100%; border-collapse: collapse; font-family: var(--mono); font-size: 0.78rem; margin: 1rem 0; }
.sp-table th, .sp-table td { text-align:left; padding: 0.65rem 0.5rem; border-bottom: 1px solid var(--b); vertical-align: top; }
.sp-table th { font-weight:400; font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--g); }
.sp-table td.num, .sp-table th.num { text-align:right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.sp-table tr.now td { color: var(--o); }
.sp-scroll { overflow-x:auto; -webkit-overflow-scrolling: touch; }
.sp-chart { width:100%; height:auto; display:block; margin: 1rem 0 0.25rem; }
.sp-legend { display:flex; gap:1.25rem; font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.08em; color: var(--g); text-transform: uppercase; }
.sp-legend i { display:inline-block; width:14px; height:2px; vertical-align: middle; margin-right: 0.4rem; }
.sp-cta { margin: 3rem 0 0; padding: 1.75rem 1.5rem; border:1px solid rgba(247,147,26,0.4); border-radius: 18px; background: rgba(247,147,26,0.05); text-align:center; }
.sp-cta-title { font-family: var(--title); font-size: clamp(1.7rem, 7vw, 2.3rem); line-height:1; margin: 0 0 0.6rem; }
.sp-cta-text { color: var(--g); margin: 0 0 1.25rem; }
.sp-form { display:flex; flex-wrap:wrap; gap: 0.6rem; justify-content:center; max-width: 480px; margin: 0 auto; }
.sp-input { flex: 1 1 220px; min-width: 0; min-height: 48px; padding: 0 1rem; border-radius: 999px; border: 1px solid rgba(237,232,222,0.25); background: var(--bg); color: var(--c); font-family: var(--mono); font-size: 16px; }
.sp-input:focus { outline: none; border-color: var(--o); }
.sp-form .sp-btn { flex: 0 0 auto; border: 0; cursor: pointer; }
.sp-form .sp-btn:disabled { opacity: 0.6; cursor: default; }
.sp-msg { flex-basis: 100%; margin: 0.2rem 0 0; font-family: var(--mono); font-size: 0.72rem; color: #F87171; }
.sp-ok { text-align: center; }
.sp-ok-title { font-family: var(--title); font-size: 1.8rem; line-height: 1; margin: 0 0 0.5rem; color: var(--o); }
.sp-ok-hint { font-family: var(--mono); font-size: 0.7rem; color: var(--g); }
.sp-btn { display:inline-flex; align-items:center; min-height: 48px; padding: 0 1.6rem; background: var(--o); color: var(--bg); font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; text-decoration:none; border-radius: 999px; }
.sp-faq details { border-bottom: 1px solid var(--b); padding: 0.4rem 0; }
.sp-faq summary { cursor:pointer; padding: 0.7rem 0; font-size: 1.2rem; list-style: none; display:flex; justify-content:space-between; gap: 1rem; }
.sp-faq summary::-webkit-details-marker { display:none; }
.sp-faq summary::after { content:'+'; font-family: var(--mono); color: var(--o); }
.sp-faq details[open] summary::after { content:'−'; }
.sp-faq details p { margin: 0 0 0.8rem; color: rgba(237,232,222,0.8); }
.sp-related ul { list-style:none; padding:0; margin:0; display:grid; gap: 0.5rem; }
.sp-related a { display:flex; min-height: 48px; align-items:center; padding: 0 1rem; border:1px solid var(--b); border-radius: 12px; text-decoration:none; font-family: var(--mono); font-size: 0.78rem; letter-spacing: 0.04em; }
.sp-foot { border-top: 1px solid var(--b); padding: 2rem 1.25rem; text-align:center; font-family: var(--mono); font-size: 0.64rem; letter-spacing: 0.04em; color: var(--g); line-height: 1.8; }
.sp-foot a { color: var(--g); }
.sp-calc { border:1px solid var(--b); border-radius: 18px; padding: 1.25rem; background: rgba(255,255,255,0.015); }
.sp-calc-row { display:grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.sp-calc label { display:block; font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--g); margin-bottom: 0.35rem; }
.sp-calc input, .sp-calc select { width:100%; min-height: 48px; background: var(--bg); color: var(--c); border:1px solid var(--b); border-radius: 10px; padding: 0 0.8rem; font-family: var(--mono); font-size: 16px; }
.sp-calc-out { margin-top: 1.25rem; }
p { margin: 0 0 1rem; }
`;
