import { GetServerSideProps } from 'next';

interface SignalData {
  fearGreed: number | null;
  fearGreedLabel: string;
  maPercent: number | null;
  maPrice: number | null;
  currentPrice: number | null;
  athPercent: number | null;
  signal: 'accumulate' | 'hold' | 'caution' | 'unknown';
  score: number;
  updatedAt: string;
}

function computeSignal(fg: number | null, ma: number | null, ath: number | null): { signal: 'accumulate' | 'hold' | 'caution' | 'unknown'; score: number } {
  if (fg === null || ma === null || ath === null) return { signal: 'unknown', score: 0 };

  let score = 0;

  // Fear & Greed (0–100): lower = more fear = better to accumulate
  if (fg <= 25) score += 2;
  else if (fg <= 45) score += 1;
  else if (fg >= 75) score -= 1;

  // vs 200-day MA: negative = below MA = historically good entry
  if (ma <= -10) score += 2;
  else if (ma <= 0) score += 1;
  else if (ma >= 50) score -= 1;

  // ATH distance: further = more room
  if (ath <= -40) score += 2;
  else if (ath <= -20) score += 1;
  else if (ath >= -5) score -= 1;

  if (score >= 3) return { signal: 'accumulate', score };
  if (score <= 0) return { signal: 'caution', score };
  return { signal: 'hold', score };
}

function getFearGreedLabel(value: number): string {
  if (value <= 25) return 'Extreme Angst';
  if (value <= 45) return 'Angst';
  if (value <= 55) return 'Neutral';
  if (value <= 75) return 'Gier';
  return 'Extreme Gier';
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const host = req.headers.host || 'whentobuybtc.xyz';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const base = `${protocol}://${host}`;

  const data: SignalData = {
    fearGreed: null,
    fearGreedLabel: '',
    maPercent: null,
    maPrice: null,
    currentPrice: null,
    athPercent: null,
    signal: 'unknown',
    score: 0,
    updatedAt: new Date().toISOString(),
  };

  try {
    const [fgRes, priceRes, athRes, histRes] = await Promise.allSettled([
      fetch(`${base}/api/fear-greed`),
      fetch(`${base}/api/price`),
      fetch(`${base}/api/ath`),
      fetch(`${base}/api/history?timeframe=1y&currency=eur`),
    ]);

    if (fgRes.status === 'fulfilled' && fgRes.value.ok) {
      const fg = await fgRes.value.json();
      data.fearGreed = fg.value ?? null;
      data.fearGreedLabel = data.fearGreed !== null ? getFearGreedLabel(data.fearGreed) : '';
    }

    if (priceRes.status === 'fulfilled' && priceRes.value.ok) {
      const price = await priceRes.value.json();
      data.currentPrice = price.eur ?? price.usd ?? null;
    }

    if (athRes.status === 'fulfilled' && athRes.value.ok) {
      const ath = await athRes.value.json();
      if (ath.ath_eur && data.currentPrice) {
        data.athPercent = ((data.currentPrice - ath.ath_eur) / ath.ath_eur) * 100;
      }
    }

    if (histRes.status === 'fulfilled' && histRes.value.ok) {
      const hist = await histRes.value.json();
      if (hist.ma200 && data.currentPrice) {
        data.maPrice = hist.ma200;
        data.maPercent = ((data.currentPrice - hist.ma200) / hist.ma200) * 100;
      }
    }
  } catch (_) {}

  const { signal, score } = computeSignal(data.fearGreed, data.maPercent, data.athPercent);
  data.signal = signal;
  data.score = score;

  return { props: { data } };
};

function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('de-DE', { maximumFractionDigits: 0 });
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SignalBadge({ signal }: { signal: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    accumulate: { label: 'Akkumulieren', color: '#4ADE80', bg: 'rgba(74,222,128,0.07)', border: 'rgba(74,222,128,0.25)' },
    hold:       { label: 'Halten',       color: '#FBBF24', bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.25)' },
    caution:    { label: 'Vorsicht',     color: '#F87171', bg: 'rgba(248,113,113,0.07)', border: 'rgba(248,113,113,0.25)' },
    unknown:    { label: 'Lädt…',        color: '#4A4540', bg: 'transparent',            border: 'rgba(74,69,64,0.3)' },
  };
  const s = map[signal] || map.unknown;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.7rem 1.6rem',
      border: `1px solid ${s.border}`,
      background: s.bg,
      color: s.color,
      fontFamily: "'DM Mono', monospace",
      fontSize: '0.75rem',
      letterSpacing: '0.2em',
      textTransform: 'uppercase' as const,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: s.color,
        boxShadow: `0 0 8px ${s.color}`,
        display: 'inline-block',
        flexShrink: 0,
      }} />
      {s.label}
    </span>
  );
}

function MetricRow({ id, value, label, desc, color }: {
  id: string; value: string; label: string; desc: string; color: string;
}) {
  return (
    <div style={{
      padding: '2rem',
      borderBottom: '1px solid rgba(247,147,26,0.1)',
    }}>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: '0.6rem',
        letterSpacing: '0.25em',
        textTransform: 'uppercase' as const,
        color: 'rgba(237,232,222,0.4)',
        marginBottom: '0.75rem',
      }}>{id}</div>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 'clamp(2.2rem, 6vw, 3.5rem)',
        color,
        lineHeight: 1,
        marginBottom: '0.5rem',
        letterSpacing: '0.02em',
      }}>{value}</div>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: '0.68rem',
        letterSpacing: '0.08em',
        color: 'rgba(237,232,222,0.55)',
        marginBottom: '0.4rem',
        textTransform: 'uppercase' as const,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: '1rem',
        color: 'rgba(237,232,222,0.7)',
        lineHeight: 1.6,
        fontStyle: 'italic',
      }}>{desc}</div>
    </div>
  );
}

export default function WannBitcoinKaufen({ data }: { data: SignalData }) {

  const signalColors: Record<string, string> = {
    accumulate: '#4ADE80',
    hold: '#FBBF24',
    caution: '#F87171',
    unknown: '#4A4540',
  };

  const signalColor = signalColors[data.signal] || signalColors.unknown;

  const fgColor = data.fearGreed !== null
    ? (data.fearGreed <= 45 ? '#4ADE80' : data.fearGreed >= 65 ? '#F87171' : '#FBBF24')
    : '#4A4540';

  const maColor = data.maPercent !== null
    ? (data.maPercent <= 0 ? '#4ADE80' : data.maPercent <= 30 ? '#FBBF24' : '#F87171')
    : '#4A4540';

  const athColor = data.athPercent !== null
    ? (data.athPercent <= -30 ? '#4ADE80' : data.athPercent <= -10 ? '#FBBF24' : '#F87171')
    : '#4A4540';

  const fgDesc = data.fearGreed !== null
    ? (data.fearGreed <= 25
        ? 'Fast alle verkaufen gerade oder trauen sich nicht zu kaufen. Solche Momente sind selten — und waren in der Vergangenheit oft genau die, die langfristige Bitcoiner abgewartet haben.'
        : data.fearGreed <= 45
        ? 'Viele sind unsicher und halten sich zurück. Der Markt ist nervös — nicht panisch, aber auch nicht entspannt.'
        : data.fearGreed >= 75
        ? 'Im Moment kaufen sehr viele — aus Angst, etwas zu verpassen. Solche Phasen enden oft mit einem Rückgang.'
        : 'Weder Panik noch Euphorie. Der Markt bewegt sich gerade ohne großen Druck in eine Richtung.')
    : 'Wird geladen.';

  const maDesc = data.maPercent !== null
    ? (data.maPercent <= -10
        ? `Bitcoin kostet gerade ${Math.abs(data.maPercent).toFixed(0)}% weniger als sein 200-Tage-Durchschnitt. Das ist wie ein Produkt, das deutlich unter seinem üblichen Preis verkauft wird.`
        : data.maPercent <= 10
        ? `Bitcoin liegt nahe an seinem 200-Tage-Durchschnitt — das ist in etwa sein "normaler" Preis der letzten Monate.`
        : `Bitcoin kostet gerade ${data.maPercent.toFixed(0)}% mehr als sein 200-Tage-Durchschnitt. Der Preis ist deutlich über dem, was in den letzten Monaten als normal galt.`)
    : 'Wird geladen.';

  const athDesc = data.athPercent !== null
    ? (data.athPercent <= -40
        ? `Der bisherige Höchstpreis liegt ${Math.abs(data.athPercent).toFixed(0)}% über dem heutigen Preis. Historisch waren solche Abstände vom Höchststand selten und haben nicht lange angedauert.`
        : data.athPercent <= -15
        ? `Noch ${Math.abs(data.athPercent).toFixed(0)}% bis zum bisherigen Höchststand. Der Preis hat noch Luft nach oben, bevor er in unbekanntes Terrain kommt.`
        : data.athPercent <= -5
        ? `Bitcoin ist nur noch ${Math.abs(data.athPercent).toFixed(0)}% vom bisherigen Höchststand entfernt. Der Markt ist nah an historischen Hochs.`
        : `Bitcoin hat seinen bisherigen Höchststand erreicht oder übertroffen. Neues Terrain.`)
    : 'Wird geladen.';

  const signalHeadline: Record<string, string> = {
    accumulate: 'Der Markt zeigt gerade Schwäche — das Signal steht auf Akkumulieren.',
    hold: 'Der Markt ist ruhig — das Signal steht auf Halten.',
    caution: 'Der Markt läuft heiß — das Signal steht auf Vorsicht.',
    unknown: 'Das Signal wird berechnet.',
  };

  const signalExplain: Record<string, string> = {
    accumulate: 'Alle drei Indikatoren zeigen gleichzeitig Schwäche: Angst im Markt, Preis unter dem Durchschnitt, weit vom Höchststand entfernt. Das bedeutet nicht, dass der Preis morgen steigt — aber historisch waren das die Phasen, in denen langfristige Bitcoin-Käufer günstig eingestiegen sind.',
    hold: 'Die Indikatoren zeigen kein klares Bild in eine Richtung. Weder besonders günstige noch besonders riskante Bedingungen — eine neutrale Phase.',
    caution: 'Viele kaufen gerade, der Preis liegt weit über dem Durchschnitt und nahe am Höchststand. In der Vergangenheit folgten auf solche Phasen oft starke Rückgänge. Das heißt nicht, dass es so sein muss — aber es ist ein Zeichen, vorsichtig zu sein.',
    unknown: '',
  };

  const updatedStr = new Date(data.updatedAt).toLocaleString('de-AT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const priceStr = data.currentPrice !== null ? `€${formatPrice(data.currentPrice)}` : '—';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,300;1,400&family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html {
          background: #0e0c10;
          color: #EDE8DE;
          font-family: 'Cormorant Garamond', Georgia, serif;
          -webkit-font-smoothing: antialiased;
          scroll-behavior: smooth;
        }

        body { background: #0e0c10; min-height: 100vh; }

        /* ── WARM AMBIENT GLOW — this page breathes ── */
        body::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 80% 50% at 50% 0%,
              rgba(247,147,26,0.07) 0%,
              rgba(247,147,26,0.025) 40%,
              transparent 70%),
            radial-gradient(ellipse 60% 40% at 50% 100%,
              rgba(247,147,26,0.04) 0%,
              transparent 60%);
        }

        /* ── NAV ── */
        .wbc-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.5rem 4rem;
          background: linear-gradient(180deg, rgba(14,12,16,0.98) 0%, transparent 100%);
        }
        .wbc-nav-logo {
          font-family: 'DM Mono', monospace; font-size: 0.65rem;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #EDE8DE; text-decoration: none; opacity: 0.65;
          transition: opacity 0.2s;
        }
        .wbc-nav-logo:hover { opacity: 1; }
        .wbc-nav-logo span { color: #F7931A; }
        .wbc-nav-back {
          font-family: 'DM Mono', monospace; font-size: 0.6rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(237,232,222,0.3); text-decoration: none;
          transition: color 0.2s;
        }
        .wbc-nav-back:hover { color: #F7931A; }

        /* ── HERO ── */
        .wbc-hero {
          position: relative; z-index: 1;
          min-height: 100vh;
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          text-align: center;
          padding: 9rem 2rem 5rem;
        }
        .wbc-eyebrow {
          font-family: 'DM Mono', monospace; font-size: 0.62rem;
          letter-spacing: 0.3em; text-transform: uppercase;
          color: #F7931A; margin-bottom: 1.75rem; font-weight: 400;
          opacity: 0.8;
        }
        .wbc-h1 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(4.5rem, 13vw, 10rem);
          font-weight: 400; line-height: 0.88;
          letter-spacing: 0.01em; color: #EDE8DE;
          margin-bottom: 1.75rem;
        }
        .wbc-h1 em { color: #F7931A; font-style: normal; }

        .wbc-hero-intro {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(1.2rem, 2.5vw, 1.5rem);
          font-style: italic; color: rgba(237,232,222,0.75);
          max-width: 540px; line-height: 1.65; margin-bottom: 3rem;
        }

        .wbc-signal-block {
          display: flex; flex-direction: column;
          align-items: center; gap: 0.65rem;
        }
        .wbc-signal-label {
          font-family: 'DM Mono', monospace; font-size: 0.56rem;
          letter-spacing: 0.28em; text-transform: uppercase;
          color: rgba(237,232,222,0.35);
        }
        .wbc-updated {
          font-family: 'DM Mono', monospace; font-size: 0.54rem;
          letter-spacing: 0.08em; color: rgba(237,232,222,0.2);
          margin-top: 0.1rem;
        }
        .wbc-scroll-hint {
          margin-top: 3rem;
          font-family: 'DM Mono', monospace; font-size: 0.56rem;
          letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(237,232,222,0.18);
          display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
        }
        .wbc-scroll-line {
          width: 1px; height: 44px;
          background: linear-gradient(to bottom, rgba(247,147,26,0.3), transparent);
        }

        /* ── SECTIONS ── */
        .wbc-section {
          position: relative; z-index: 1;
          max-width: 800px; margin: 0 auto;
          padding: 5rem 2rem;
        }

        .wbc-section-label {
          font-family: 'DM Mono', monospace; font-size: 0.58rem;
          letter-spacing: 0.28em; text-transform: uppercase;
          color: #F7931A; margin-bottom: 0.9rem; opacity: 0.85;
        }
        .wbc-h2 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(2.2rem, 5vw, 3.8rem);
          font-weight: 400; line-height: 1.0; letter-spacing: 0.02em;
          color: #EDE8DE; margin-bottom: 1.75rem;
        }
        .wbc-body {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(1.1rem, 2vw, 1.25rem);
          line-height: 1.85; color: rgba(237,232,222,0.75);
        }
        .wbc-body p + p { margin-top: 1.2rem; }
        .wbc-body strong { color: #EDE8DE; font-weight: 600; }
        .wbc-body em { font-style: italic; }

        /* ── DIVIDER ── */
        .wbc-divider {
          position: relative; z-index: 1;
          max-width: 800px; margin: 0 auto;
          display: flex; align-items: center; gap: 1.5rem; padding: 0 2rem;
        }
        .wbc-divider-line { flex: 1; height: 1px; background: rgba(247,147,26,0.07); }
        .wbc-divider-center { color: #F7931A; font-size: 0.65rem; opacity: 0.35; }

        /* ── SIGNAL SUMMARY ── */
        .wbc-signal-summary {
          margin: 2rem 0;
          padding: 2rem 2.25rem;
          background: rgba(247,147,26,0.03);
          border: 1px solid rgba(247,147,26,0.12);
          border-left-width: 3px;
        }
        .wbc-signal-summary-headline {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(1.15rem, 2.5vw, 1.4rem);
          font-style: italic; line-height: 1.5;
          margin-bottom: 0.9rem;
        }
        .wbc-signal-summary-explain {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.05rem; line-height: 1.8;
          color: rgba(237,232,222,0.65);
        }
        .wbc-disclaimer {
          margin-top: 1.25rem; padding-top: 1.25rem;
          border-top: 1px solid rgba(237,232,222,0.06);
          font-family: 'DM Mono', monospace; font-size: 0.56rem;
          letter-spacing: 0.06em; color: rgba(237,232,222,0.22);
          line-height: 1.7;
        }

        /* ── INSTRUMENT PANEL ── */
        .wbc-instrument {
          margin-top: 2.5rem;
          background: rgba(14,12,16,0.6);
          border: 1px solid rgba(247,147,26,0.1);
        }
        .wbc-instrument-header {
          padding: 0.85rem 1.75rem;
          border-bottom: 1px solid rgba(247,147,26,0.08);
          display: flex; justify-content: space-between; align-items: center;
        }
        .wbc-instrument-label {
          display: flex; align-items: center; gap: 0.6rem;
          font-family: 'DM Mono', monospace; font-size: 0.56rem;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: rgba(237,232,222,0.3);
        }
        .wbc-status-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #F7931A; box-shadow: 0 0 5px rgba(247,147,26,0.5);
          animation: pulse 2.5s ease-in-out infinite; flex-shrink: 0;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .wbc-instrument-footer {
          padding: 0.7rem 1.75rem;
          border-top: 1px solid rgba(247,147,26,0.07);
          font-family: 'DM Mono', monospace; font-size: 0.54rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(237,232,222,0.22);
          display: flex; gap: 2rem; flex-wrap: wrap;
        }

        /* ── METRIC ROW ── */
        .wbc-metric {
          padding: 1.75rem;
          border-bottom: 1px solid rgba(247,147,26,0.07);
        }
        .wbc-metric:last-child { border-bottom: none; }
        .wbc-metric-id {
          font-family: 'DM Mono', monospace; font-size: 0.56rem;
          letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(237,232,222,0.3); margin-bottom: 0.6rem;
        }
        .wbc-metric-value {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(2rem, 5.5vw, 3.2rem);
          line-height: 1; letter-spacing: 0.02em;
          margin-bottom: 0.35rem;
        }
        .wbc-metric-sublabel {
          font-family: 'DM Mono', monospace; font-size: 0.62rem;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: rgba(237,232,222,0.4); margin-bottom: 0.75rem;
        }
        .wbc-metric-desc {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.05rem; font-style: italic;
          color: rgba(237,232,222,0.62); line-height: 1.7;
        }

        /* ── FAQ ── */
        .wbc-faq { margin-top: 1.5rem; }
        .wbc-faq-item {
          padding: 1.75rem 0;
          border-top: 1px solid rgba(247,147,26,0.07);
        }
        .wbc-faq-item:last-child {
          border-bottom: 1px solid rgba(247,147,26,0.07);
        }
        .wbc-faq-q {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(1.3rem, 3vw, 1.9rem);
          letter-spacing: 0.03em; color: #EDE8DE;
          margin-bottom: 0.65rem; line-height: 1.1;
        }
        .wbc-faq-a {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(1.05rem, 2vw, 1.15rem);
          line-height: 1.8; color: rgba(237,232,222,0.68);
          font-style: italic;
        }

        /* ── ORIGIN ── */
        .wbc-origin {
          border-left: 2px solid rgba(247,147,26,0.28);
          padding-left: 1.5rem; margin: 2rem 0;
        }
        .wbc-origin-text {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(1.1rem, 2vw, 1.25rem);
          font-style: italic; color: rgba(237,232,222,0.72);
          line-height: 1.8;
        }
        .wbc-origin-cite {
          display: block; margin-top: 0.65rem;
          font-family: 'DM Mono', monospace; font-size: 0.56rem;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: rgba(247,147,26,0.4);
        }

        /* ── HOMEPAGE HANDOFF ── */
        .wbc-handoff {
          margin-top: 2.5rem;
          background: rgba(247,147,26,0.04);
          border: 1px solid rgba(247,147,26,0.15);
          padding: 2.5rem;
          text-align: center;
        }
        .wbc-handoff-eyebrow {
          font-family: 'DM Mono', monospace; font-size: 0.56rem;
          letter-spacing: 0.25em; text-transform: uppercase;
          color: rgba(237,232,222,0.28); margin-bottom: 0.75rem;
        }
        .wbc-handoff-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          color: #EDE8DE; letter-spacing: 0.02em;
          margin-bottom: 0.65rem; line-height: 1.05;
        }
        .wbc-handoff-sub {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.1rem; font-style: italic;
          color: rgba(237,232,222,0.55); line-height: 1.65;
          max-width: 420px; margin: 0 auto 1.75rem;
        }
        .wbc-handoff-bookmark {
          display: block; margin-top: 1rem;
          font-family: 'DM Mono', monospace; font-size: 0.56rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(237,232,222,0.22);
        }
        .wbc-btn-primary {
          display: inline-block;
          background: #F7931A; color: #000;
          font-family: 'DM Mono', monospace; font-size: 0.7rem;
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 0.9rem 2.25rem; text-decoration: none;
          transition: opacity 0.2s; border: none; cursor: pointer;
        }
        .wbc-btn-primary:hover { opacity: 0.85; }

        /* ── EMAIL ── */
        .wbc-email-section {
          position: relative; z-index: 1;
          max-width: 800px; margin: 0 auto;
          padding: 0 2rem 6rem;
        }
        .wbc-email-wrap {
          background: rgba(14,12,16,0.7);
          border: 1px solid rgba(247,147,26,0.15);
          padding: 3rem; text-align: center;
        }
        .wbc-email-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(1.8rem, 4vw, 3rem);
          color: #EDE8DE; letter-spacing: 0.02em;
          margin-bottom: 0.6rem; line-height: 1.05;
        }
        .wbc-email-title em { color: #F7931A; font-style: normal; }
        .wbc-email-sub {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.1rem; font-style: italic;
          color: rgba(237,232,222,0.6); line-height: 1.65;
          max-width: 400px; margin: 0 auto 2rem;
        }
        .wbc-email-row {
          display: flex; max-width: 380px; margin: 0 auto 0.75rem;
        }
        .wbc-email-input {
          flex: 1;
          background: rgba(237,232,222,0.05);
          border: 1px solid rgba(247,147,26,0.2); border-right: none;
          color: #EDE8DE;
          font-family: 'DM Mono', monospace; font-size: 0.75rem;
          letter-spacing: 0.04em; padding: 0.85rem 1rem;
          outline: none; transition: border-color 0.2s;
        }
        .wbc-email-input:focus { border-color: rgba(247,147,26,0.45); }
        .wbc-email-input::placeholder { color: rgba(237,232,222,0.2); }
        .wbc-email-btn {
          background: #F7931A; color: #000;
          border: 1px solid #F7931A;
          font-family: 'DM Mono', monospace; font-size: 0.66rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 0.85rem 1.2rem; cursor: pointer;
          transition: opacity 0.2s; white-space: nowrap;
        }
        .wbc-email-btn:hover { opacity: 0.85; }
        .wbc-email-btn:disabled { opacity: 0.4; cursor: default; }
        .wbc-email-msg {
          font-family: 'DM Mono', monospace; font-size: 0.6rem;
          letter-spacing: 0.06em; min-height: 1.2em;
          color: rgba(237,232,222,0.3);
        }
        .wbc-email-msg.ok { color: #4ADE80; }
        .wbc-email-msg.err { color: #F87171; }
        .wbc-email-meta {
          font-family: 'DM Mono', monospace; font-size: 0.54rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(237,232,222,0.16); margin-top: 1.25rem;
        }

        /* ── STICKY MOBILE BAR ── */
        .wbc-sticky-bar {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
          background: rgba(14,12,16,0.97);
          border-top: 1px solid rgba(247,147,26,0.15);
          padding: 0.85rem 1.25rem;
          gap: 0.75rem;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transform: translateY(100%);
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .wbc-sticky-bar.visible { transform: translateY(0); }
        .wbc-sticky-btn-ghost {
          flex: 1; padding: 0.75rem;
          background: transparent;
          border: 1px solid rgba(247,147,26,0.25);
          color: rgba(237,232,222,0.7);
          font-family: 'DM Mono', monospace; font-size: 0.62rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; text-decoration: none;
          text-align: center; transition: border-color 0.2s, color 0.2s;
        }
        .wbc-sticky-btn-ghost:hover { border-color: rgba(247,147,26,0.5); color: #EDE8DE; }
        .wbc-sticky-btn-orange {
          flex: 1; padding: 0.75rem;
          background: #F7931A; color: #000;
          border: 1px solid #F7931A;
          font-family: 'DM Mono', monospace; font-size: 0.62rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; text-decoration: none;
          text-align: center; transition: opacity 0.2s;
        }
        .wbc-sticky-btn-orange:hover { opacity: 0.88; }

        /* ── FOOTER ── */
        .wbc-footer {
          position: relative; z-index: 1;
          padding: 2.5rem 2rem; text-align: center;
          border-top: 1px solid rgba(247,147,26,0.06);
          font-family: 'DM Mono', monospace; font-size: 0.54rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(237,232,222,0.16);
        }
        .wbc-footer a { color: rgba(237,232,222,0.22); text-decoration: none; transition: color 0.2s; }
        .wbc-footer a:hover { color: #F7931A; }
        .wbc-footer p + p { margin-top: 0.5rem; }

        /* ── RESPONSIVE ── */
        @media (max-width: 700px) {
          .wbc-nav { padding: 1.1rem 1.25rem; }
          .wbc-hero { padding: 7rem 1.25rem 3.5rem; }
          .wbc-section { padding: 3.5rem 1.25rem; }
          .wbc-email-section { padding: 0 1.25rem 8rem; }
          .wbc-email-wrap { padding: 2rem 1.25rem; }
          .wbc-email-row { flex-direction: column; max-width: 100%; }
          .wbc-email-input { border-right: 1px solid rgba(247,147,26,0.2); border-bottom: none; }
          .wbc-email-btn { width: 100%; }
          .wbc-handoff { padding: 2rem 1.25rem; }
          .wbc-signal-summary { padding: 1.5rem; }
          .wbc-sticky-bar { display: flex; }
          .wbc-instrument-footer { gap: 0.6rem; }
          .wbc-metric { padding: 1.5rem 1.25rem; }
        }

        @media (prefers-reduced-motion: reduce) {
          .wbc-status-dot { animation: none; }
          .wbc-sticky-bar { transition: none; }
        }
      `}</style>

      <head>
        <title>Wann Bitcoin kaufen — Das aktuelle Marktsignal</title>
        <meta name="description" content="Jetzt Bitcoin kaufen oder warten? Drei Indikatoren zeigen, was der Markt gerade macht — einfach erklärt, täglich aktualisiert. Kostenlos und ohne Anmeldung." />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <link rel="canonical" href="https://whentobuybtc.xyz/wann-bitcoin-kaufen" />
        <link rel="alternate" hreflang="de" href="https://whentobuybtc.xyz/wann-bitcoin-kaufen" />
        <link rel="alternate" hreflang="en" href="https://whentobuybtc.xyz/" />
        <link rel="alternate" hreflang="x-default" href="https://whentobuybtc.xyz/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://whentobuybtc.xyz/wann-bitcoin-kaufen" />
        <meta property="og:title" content="Wann Bitcoin kaufen — Das aktuelle Marktsignal" />
        <meta property="og:description" content="Jetzt Bitcoin kaufen oder warten? Drei Indikatoren zeigen, was der Markt gerade macht — einfach erklärt, täglich aktualisiert." />
        <meta property="og:locale" content="de_DE" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Wann ist ein guter Zeitpunkt, Bitcoin zu kaufen?",
              "acceptedAnswer": { "@type": "Answer", "text": "Es gibt keinen perfekten Zeitpunkt. Aber drei Indikatoren helfen einzuschätzen, ob der Markt gerade günstig oder überhitzt ist: der Fear & Greed Index, der Abstand zum 200-Tage-Durchschnitt und der Abstand vom Allzeithoch." }
            },
            {
              "@type": "Question",
              "name": "Soll ich jetzt Bitcoin kaufen oder warten?",
              "acceptedAnswer": { "@type": "Answer", "text": "Das kann dir niemand sagen — und niemand sollte es. Was du wissen kannst: was der Markt gerade tut, ob er historisch teuer oder günstig erscheint, und ob die Stimmung von Angst oder Euphorie getrieben ist." }
            },
            {
              "@type": "Question",
              "name": "Was ist der Fear & Greed Index?",
              "acceptedAnswer": { "@type": "Answer", "text": "Der Fear & Greed Index misst die aktuelle Marktstimmung auf einer Skala von 0 (extreme Angst) bis 100 (extreme Gier). Wenn fast alle Angst haben, verkaufen viele — und der Preis fällt. Wenn alle gierig sind, kaufen viele — und der Preis steigt oft bis zu einem Punkt, wo es kippt." }
            },
            {
              "@type": "Question",
              "name": "Was ist der 200-Tage-Durchschnitt bei Bitcoin?",
              "acceptedAnswer": { "@type": "Answer", "text": "Der Durchschnittspreis der letzten 200 Tage. Liegt der aktuelle Preis darunter, gilt Bitcoin historisch als günstig bewertet. Liegt er weit darüber, ist der Markt aufgeheizt." }
            }
          ]
        })}} />
        <script defer src="https://umami-orange.up.railway.app/script.js" data-website-id="c884bf96-c757-4dfb-b2bb-8195d5876958" />
      </head>

      {/* STICKY BAR — mobile only, appears after hero */}
      <div className="wbc-sticky-bar" id="wbc-sticky-bar">
        <a href="#email" className="wbc-sticky-btn-ghost">Email-Alerts</a>
        <a href="/" className="wbc-sticky-btn-orange">Zum Tool →</a>
      </div>

      <nav className="wbc-nav">
        <a href="/" className="wbc-nav-logo">When to Buy <span>BTC</span></a>
        <a href="/" className="wbc-nav-back">← Zum Tool</a>
      </nav>

      <main>

        {/* ── HERO ── */}
        <section className="wbc-hero">
          <p className="wbc-eyebrow">Bitcoin verstehen — für Einsteiger</p>
          <h1 className="wbc-h1">Wann<br />Bitcoin<br /><em>kaufen?</em></h1>
          <p className="wbc-hero-intro">
            Eine Frage, die sich fast jeder stellt. Hier bekommst du keine Empfehlung —
            aber die Daten, die dir helfen, selbst eine Entscheidung zu treffen.
          </p>
          <div className="wbc-signal-block">
            <span className="wbc-signal-label">Das Signal gerade</span>
            <SignalBadge signal={data.signal} />
            <span className="wbc-updated">Aktualisiert: {updatedStr}</span>
          </div>
          <div className="wbc-scroll-hint">
            <span>Was bedeutet das?</span>
            <div className="wbc-scroll-line" />
          </div>
        </section>

        <div className="wbc-divider"><div className="wbc-divider-line" /><span className="wbc-divider-center">✦</span><div className="wbc-divider-line" /></div>

        {/* ── WAS PASSIERT GERADE ── */}
        <section className="wbc-section">
          <p className="wbc-section-label">Was gerade passiert</p>
          <h2 className="wbc-h2">Der Markt auf einen Blick.</h2>
          <div className="wbc-body">
            <p>
              Bitcoin kostet gerade <strong>{priceStr}</strong>. Ob das viel oder wenig ist,
              lässt sich nicht am Preis allein ablesen — sondern daran, wie er im
              Vergleich zu historischen Werten und der aktuellen Marktstimmung steht.
            </p>
            <p>
              Dafür gibt es drei Indikatoren. Zusammen ergeben sie das Signal oben.
            </p>
          </div>

          <div className="wbc-signal-summary" style={{ borderLeftColor: signalColor }}>
            <p className="wbc-signal-summary-headline" style={{ color: signalColor }}>
              {signalHeadline[data.signal]}
            </p>
            {data.signal !== 'unknown' && (
              <p className="wbc-signal-summary-explain">{signalExplain[data.signal]}</p>
            )}
            <p className="wbc-disclaimer">
              Kein Finanzrat. Das Signal zeigt, was die Daten sagen — nicht, was du tun sollst.
            </p>
          </div>
        </section>

        <div className="wbc-divider"><div className="wbc-divider-line" /><span className="wbc-divider-center">✦</span><div className="wbc-divider-line" /></div>

        {/* ── DIE DREI INDIKATOREN ── */}
        <section className="wbc-section">
          <p className="wbc-section-label">Die drei Indikatoren</p>
          <h2 className="wbc-h2">So entsteht das Signal.</h2>
          <div className="wbc-body">
            <p>
              Hinter dem Signal stecken drei Zahlen, die Bitcoiner seit Jahren beobachten.
              Keine davon ist ein Geheimtipp — aber zusammen geben sie ein klareres Bild als jede einzeln.
            </p>
          </div>

          <div className="wbc-instrument">
            <div className="wbc-instrument-header">
              <div className="wbc-instrument-label">
                <div className="wbc-status-dot" />
                Live-Daten
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.54rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(237,232,222,0.2)' }}>
                {updatedStr}
              </div>
            </div>

            <div className="wbc-metric">
              <div className="wbc-metric-id">01 / Fear & Greed Index</div>
              <div className="wbc-metric-value" style={{ color: fgColor }}>
                {data.fearGreed !== null ? data.fearGreed : '—'}
              </div>
              <div className="wbc-metric-sublabel">{data.fearGreedLabel || ''}</div>
              <p className="wbc-metric-desc">{fgDesc}</p>
            </div>

            <div className="wbc-metric">
              <div className="wbc-metric-id">02 / vs. 200-Tage-Durchschnitt</div>
              <div className="wbc-metric-value" style={{ color: maColor }}>
                {data.maPercent !== null ? `${data.maPercent >= 0 ? '+' : ''}${data.maPercent.toFixed(0)}%` : '—'}
              </div>
              <div className="wbc-metric-sublabel">
                {data.maPrice !== null ? `200-Tage-Ø: €${formatPrice(data.maPrice)}` : ''}
              </div>
              <p className="wbc-metric-desc">{maDesc}</p>
            </div>

            <div className="wbc-metric">
              <div className="wbc-metric-id">03 / Abstand vom Allzeithoch</div>
              <div className="wbc-metric-value" style={{ color: athColor }}>
                {data.athPercent !== null ? `${data.athPercent >= 0 ? '+' : ''}${data.athPercent.toFixed(0)}%` : '—'}
              </div>
              <div className="wbc-metric-sublabel">
                {data.currentPrice !== null ? `Aktuell: €${formatPrice(data.currentPrice)}` : ''}
              </div>
              <p className="wbc-metric-desc">{athDesc}</p>
            </div>

            <div className="wbc-instrument-footer">
              <span>Signal: <span style={{ color: signalColor, marginLeft: '0.35rem' }}>
                {data.signal === 'accumulate' ? 'Akkumulieren' : data.signal === 'hold' ? 'Halten' : data.signal === 'caution' ? 'Vorsicht' : '—'}
              </span></span>
              <span>Aktualisiert: {updatedStr}</span>
            </div>
          </div>
        </section>

        <div className="wbc-divider"><div className="wbc-divider-line" /><span className="wbc-divider-center">✦</span><div className="wbc-divider-line" /></div>

        {/* ── FAQ ── */}
        <section className="wbc-section">
          <p className="wbc-section-label">Häufige Fragen</p>
          <h2 className="wbc-h2">Was viele sich fragen.</h2>
          <div className="wbc-faq">
            <div className="wbc-faq-item">
              <p className="wbc-faq-q">Soll ich jetzt Bitcoin kaufen oder warten?</p>
              <p className="wbc-faq-a">Das kann dir niemand beantworten — und jeder, der es behauptet, lügt. Was du wissen kannst: ob der Markt gerade ängstlich oder euphorisch ist, ob Bitcoin historisch teuer oder günstig erscheint, und was in ähnlichen Situationen in der Vergangenheit passiert ist. Genau das zeigt dieses Tool.</p>
            </div>
            <div className="wbc-faq-item">
              <p className="wbc-faq-q">Was bedeutet „Akkumulieren"?</p>
              <p className="wbc-faq-a">Nach und nach kaufen — über einen längeren Zeitraum, nicht alles auf einmal. Das Signal „Akkumulieren" bedeutet, dass alle drei Indikatoren gleichzeitig Schwäche zeigen. Historisch war das selten und hat nicht lange angedauert. Kein Versprechen, kein Rat.</p>
            </div>
            <div className="wbc-faq-item">
              <p className="wbc-faq-q">Bitcoin kaufen oder nicht — wie entscheide ich das?</p>
              <p className="wbc-faq-a">Indem du verstehst, was du kaufst. Bitcoin ist volatil — der Preis kann stark fallen. Wer das weiß, einen langen Zeithorizont hat und nur das investiert, was er nicht sofort braucht, trifft eine bessere Entscheidung als jemand, der aus Angst vor dem Verpassen kauft.</p>
            </div>
            <div className="wbc-faq-item">
              <p className="wbc-faq-q">Was ist der 200-Tage-Durchschnitt?</p>
              <p className="wbc-faq-a">Der Durchschnittspreis der letzten 200 Tage. Eine der meistbeachteten Zahlen im Bitcoin-Markt. Liegt der aktuelle Preis darunter, gilt Bitcoin historisch als günstig bewertet. Liegt er weit darüber, ist der Markt aufgeheizt. Simpel — aber aussagekräftig.</p>
            </div>
          </div>
        </section>

        <div className="wbc-divider"><div className="wbc-divider-line" /><span className="wbc-divider-center">✦</span><div className="wbc-divider-line" /></div>

        {/* ── ORIGIN + HANDOFF ── */}
        <section className="wbc-section">
          <p className="wbc-section-label">Warum dieses Tool existiert</p>
          <h2 className="wbc-h2">Gebaut für eine einfache Frage.</h2>
          <div className="wbc-body">
            <p>Meine Freunde und meine Familie haben mich immer wieder gefragt: <em>„Wann soll ich Bitcoin kaufen?"</em></p>
            <div className="wbc-origin">
              <p className="wbc-origin-text">
                Ich wollte ihnen keine Antwort geben — ich wollte ihnen zeigen, wie man selbst
                eine findet. Was macht der Markt gerade? Was sagen die Daten? Warum bewegt sich
                der Preis so wie er sich bewegt? Die Entscheidung soll bei ihnen bleiben.
              </p>
              <cite className="wbc-origin-cite">— Imo Babics, Entwickler</cite>
            </div>
            <p>
              Daraus ist When to Buy BTC geworden. Kostenlos, kein Account, keine Empfehlungen.
              Nur die Daten — täglich aktualisiert. Das Tool ist auf <strong>lopp.net</strong> gelistet,
              einer der bekanntesten Bitcoin-Ressourcen-Seiten weltweit.
            </p>
          </div>

          <div className="wbc-handoff">
            <p className="wbc-handoff-eyebrow">Das vollständige Tool</p>
            <p className="wbc-handoff-title">Signal. Chart. Kalkulator.</p>
            <p className="wbc-handoff-sub">
              Die Hauptseite zeigt das komplette Dashboard — mit Preisverlauf,
              200-Tage-Durchschnitt und dem „Was wäre wenn?"-Rechner.
            </p>
            <a href="/" className="wbc-btn-primary">Zum Tool →</a>
            <span className="wbc-handoff-bookmark">
              Tipp: Speichere die Hauptseite als Lesezeichen — das Signal ändert sich täglich.
            </span>
          </div>
        </section>

        <div className="wbc-divider"><div className="wbc-divider-line" /><span className="wbc-divider-center">✦</span><div className="wbc-divider-line" /></div>

        {/* ── EMAIL ── */}
        <section className="wbc-email-section" id="email">
          <div className="wbc-email-wrap">
            <p className="wbc-section-label" style={{ marginBottom: '0.9rem' }}>Signal-Benachrichtigungen</p>
            <h2 className="wbc-email-title">Den richtigen Moment<br /><em>nicht verpassen.</em></h2>
            <p className="wbc-email-sub">
              Wenn das Signal wechselt, bekommst du eine E-Mail.
              Kein Lärm, kein Spam — nur der Moment, der zählt.
            </p>
            <div className="wbc-email-row">
              <input className="wbc-email-input" id="wbc-email-input" type="email" autoComplete="email" inputMode="email" placeholder="deine@email.com" />
              <button className="wbc-email-btn" id="wbc-email-btn"
                onClick={() => {
                  if (typeof window === 'undefined') return;
                  const input = document.getElementById('wbc-email-input') as HTMLInputElement;
                  const btn = document.getElementById('wbc-email-btn') as HTMLButtonElement;
                  const msg = document.getElementById('wbc-email-msg') as HTMLParagraphElement;
                  const email = input.value.trim();
                  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    msg.textContent = 'Bitte gib eine gültige E-Mail-Adresse ein.';
                    msg.className = 'wbc-email-msg err';
                    input.focus(); return;
                  }
                  btn.disabled = true; btn.textContent = 'Wird eingetragen…';
                  msg.textContent = ''; msg.className = 'wbc-email-msg';
                  fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, lang: 'de' }),
                  })
                    .then(r => r.json())
                    .then(d => {
                      if (d.ok) {
                        msg.textContent = 'Du bist dabei. Das nächste Signal kommt direkt in dein Postfach.';
                        msg.className = 'wbc-email-msg ok';
                        input.value = ''; btn.textContent = 'Eingetragen ✓';
                      } else throw new Error();
                    })
                    .catch(() => {
                      msg.textContent = 'Etwas ist schiefgelaufen. Versuch es nochmal.';
                      msg.className = 'wbc-email-msg err';
                      btn.disabled = false; btn.textContent = 'Benachrichtigen';
                    });
                }}
              >Benachrichtigen</button>
            </div>
            <p className="wbc-email-msg" id="wbc-email-msg" aria-live="polite" />
            <p className="wbc-email-meta">Kostenlos · Kein Account · Jederzeit abmeldbar</p>
          </div>
        </section>

      </main>

      <footer className="wbc-footer">
        <p><a href="/">When to Buy BTC</a> · <a href="https://imobabics.com" target="_blank" rel="noopener noreferrer">Imo Babics</a> · <a href="mailto:WhenToBuyBTC@pm.me">Kontakt</a></p>
        <p>Kein Finanzrat. Nur Daten. Die Entscheidung liegt bei dir.</p>
      </footer>

      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          var bar = document.getElementById('wbc-sticky-bar');
          if (!bar) return;
          var hero = document.querySelector('.wbc-hero');
          if (!hero) return;
          var shown = false;
          function onScroll() {
            var heroBottom = hero.getBoundingClientRect().bottom;
            if (!shown && heroBottom < 0) {
              bar.classList.add('visible');
              shown = true;
            } else if (shown && heroBottom >= 0) {
              bar.classList.remove('visible');
              shown = false;
            }
          }
          window.addEventListener('scroll', onScroll, { passive: true });
        })();
      `}} />
    </>
  );
}
