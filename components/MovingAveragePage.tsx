import SeoPage, { StateBadge, Stat, type Faq } from './SeoPage';
import { eur, pct, type MarketSnapshot } from '../lib/market-ssr';

type Lang = 'en' | 'de';

const ZONES = [
  { key: 'deep', test: (p: number) => p < -10, en: 'More than 10% below', de: 'Mehr als 10 % darunter', leanEn: 'Leans cold (counts double)', leanDe: 'Zeigt Richtung kalt (zählt doppelt)' },
  { key: 'below', test: (p: number) => p >= -10 && p < -5, en: '5 to 10% below', de: '5 bis 10 % darunter', leanEn: 'Leans cold', leanDe: 'Zeigt Richtung kalt' },
  { key: 'at', test: (p: number) => p >= -5 && p <= 5, en: 'Within 5% either way', de: 'Bis 5 % in beide Richtungen', leanEn: 'Middle, no lean', leanDe: 'Mitte, keine Richtung' },
  { key: 'above', test: (p: number) => p > 5 && p <= 20, en: '5 to 20% above', de: '5 bis 20 % darüber', leanEn: 'Leans hot', leanDe: 'Zeigt Richtung heiß' },
  { key: 'far', test: (p: number) => p > 20, en: 'More than 20% above', de: 'Mehr als 20 % darüber', leanEn: 'Leans hot (counts double)', leanDe: 'Zeigt Richtung heiß (zählt doppelt)' },
];

function Chart({ series, lang }: { series: MarketSnapshot['maSeries']; lang: Lang }) {
  if (series.length < 10) return null;
  const W = 600, H = 240, pad = 6;
  const vals = series.flatMap((d) => [d[1], d[2]]);
  const min = Math.min(...vals) * 0.97, max = Math.max(...vals) * 1.02;
  const x = (i: number) => pad + (i / (series.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
  const line = (k: 1 | 2) => series.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join('');
  const area = `${line(1)}L${x(series.length - 1).toFixed(1)},${H}L${x(0).toFixed(1)},${H}Z`;
  const first = new Date(series[0][0]).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { month: 'short', year: 'numeric' });
  const de = lang === 'de';
  return (
    <figure style={{ margin: '1.5rem 0 0' }}>
      <svg className="sp-chart" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={de ? `Bitcoin-Kurs und 200-Tage-Linie in Euro seit ${first}` : `Bitcoin price and 200-day moving average in euros since ${first}`}>
        <defs>
          <linearGradient id="spfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#EDE8DE" stopOpacity="0.12" />
            <stop offset="1" stopColor="#EDE8DE" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spfill)" />
        <path d={line(1)} fill="none" stroke="#EDE8DE" strokeWidth="1.6" strokeLinejoin="round" />
        <path d={line(2)} fill="none" stroke="#F7931A" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx={x(series.length - 1)} cy={y(series[series.length - 1][1])} r="4" fill="#EDE8DE" />
      </svg>
      <figcaption className="sp-legend">
        <span><i style={{ background: '#EDE8DE' }} />{de ? 'Kurs' : 'Price'}</span>
        <span><i style={{ background: '#F7931A' }} />{de ? '200-Tage-Linie' : '200-day average'}</span>
        <span>{de ? `seit ${first}` : `since ${first}`}</span>
      </figcaption>
    </figure>
  );
}

export default function MovingAveragePage({ m, lang }: { m: MarketSnapshot; lang: Lang }) {
  const de = lang === 'de';
  const zone = m.maPct !== null ? ZONES.find((z) => z.test(m.maPct!)) : undefined;
  const dir = m.maPct === null ? '' : m.maPct >= 0 ? (de ? 'über' : 'above') : (de ? 'unter' : 'below');
  const dist = m.maPct !== null ? pct(Math.abs(m.maPct), lang, false) : '–';

  const answerText = de
    ? `Die 200-Tage-Linie von Bitcoin liegt heute bei ${eur(m.ma200, lang)}. Der Kurs steht bei ${eur(m.price, lang)} und damit ${dist} ${dir} dem Durchschnitt der letzten 200 Tage.`
    : `Bitcoin's 200-day moving average is ${eur(m.ma200, lang)} today. The price is ${eur(m.price, lang)}, which is ${dist} ${dir} the average of the last 200 days.`;

  const faq: Faq[] = de ? [
    { q: 'Wo liegt die 200-Tage-Linie von Bitcoin heute?', a: `Bei ${eur(m.ma200, lang)}. Der Kurs liegt ${dist} ${dir} der Linie. Berechnet aus den Tageskursen der letzten 200 Tage in Euro (Quelle: CoinGecko).` },
    { q: 'Was bedeutet es, wenn Bitcoin unter der 200-Tage-Linie liegt?', a: 'Der Kurs ist günstiger als im Schnitt der letzten gut sechs Monate. In der Vergangenheit lagen Bärenmärkte wie 2018, 2022 und das Frühjahr 2020 klar unter der Linie. Das beschreibt den Trend, nicht den nächsten Kurs.' },
    { q: 'Was ist der Unterschied zwischen GD 200 und 200-Wochen-Linie?', a: 'Der GD 200 (200-Tage-Durchschnitt) zeigt den mittelfristigen Trend der letzten gut sechs Monate. Die 200-Wochen-Linie umfasst knapp vier Jahre und damit etwa einen ganzen Halving-Zyklus. Sie reagiert viel langsamer.' },
    { q: 'Ist die 200-Tage-Linie ein Kaufsignal?', a: 'Nein. Sie zeigt, wo der Kurs im Vergleich zu seinem eigenen Trend steht. When to Buy BTC nutzt sie als einen von drei Messwerten für die Markttemperatur und gibt keine Kauf- oder Verkaufsempfehlung.' },
    { q: 'Wie oft wird der Wert aktualisiert?', a: 'Der Kurs wird laufend abgefragt, die 200-Tage-Linie mit jedem neuen Tageskurs neu berechnet.' },
  ] : [
    { q: "What is Bitcoin's 200-day moving average today?", a: `It is ${eur(m.ma200, lang)}. The price is ${dist} ${dir} it. Calculated from the last 200 daily prices in euros (source: CoinGecko).` },
    { q: 'What does it mean when Bitcoin is below the 200-day moving average?', a: 'The price is cheaper than its average over the last six-plus months. In the past, bear markets such as 2018, 2022 and spring 2020 traded clearly below the line. It describes the trend, not the next move.' },
    { q: 'What is the difference between the 200-day and the 200-week moving average?', a: 'The 200-day average tracks the medium-term trend over roughly six and a half months. The 200-week average covers almost four years, about one full halving cycle, and moves far more slowly.' },
    { q: 'Is the 200-day moving average a buy signal?', a: 'No. It shows where the price sits against its own trend. When to Buy BTC uses it as one of three readings for its market temperature and never tells anyone to buy or sell.' },
    { q: 'How often does it update?', a: 'The price is checked continuously and the 200-day average is recalculated with every new daily price.' },
  ];

  return (
    <SeoPage
      lang={lang}
      pageKey="ma"
      title={de ? 'Bitcoin 200-Tage-Linie heute: GD 200 live in Euro' : 'Bitcoin 200-Day Moving Average Today: Live in Euros'}
      description={de
        ? `Bitcoin 200-Tage-Linie heute: ${eur(m.ma200, lang)}. Kurs ${dist} ${dir} dem GD 200. Live-Chart, Bedeutung der Abstände und wie Langfrist-Halter den Trend lesen.`
        : `Bitcoin 200-day moving average today: ${eur(m.ma200, lang)}. Price is ${dist} ${dir} it. Live chart, what the distance means and how long-term holders read the trend.`}
      kicker={de ? 'Trend · live' : 'Trend · live'}
      h1={de ? 'Bitcoin 200-Tage-Linie heute' : 'Bitcoin 200-day moving average today'}
      answer={<p>{answerText}</p>}
      answerText={answerText}
      updatedAt={m.updatedAt}
      faq={faq}
    >
      <section className="sp-hero" aria-label={de ? 'Aktueller Wert' : 'Current value'}>
        <StateBadge state={m.state} lang={lang} />
        <div className="sp-hero-num" style={{ fontSize: 'clamp(3.6rem, 18vw, 6.5rem)' }}>{pct(m.maPct, lang)}</div>
        <div className="sp-hero-label">{de ? `${dir} der 200-Tage-Linie` : `${dir} the 200-day average`}</div>
        <div className="sp-grid">
          <Stat label={de ? '200-Tage-Linie' : '200-day average'} value={eur(m.ma200, lang)} />
          <Stat label={de ? 'Bitcoin-Kurs' : 'Bitcoin price'} value={eur(m.price, lang)} note={m.change24h !== null ? `${pct(m.change24h, lang)} 24h` : undefined} />
          <Stat label={de ? 'Zum Allzeithoch' : 'From all-time high'} value={pct(m.athPct, lang)} />
        </div>
        <Chart series={m.maSeries} lang={lang} />
      </section>

      <h2 className="sp-h2">{de ? 'Was der Abstand bedeutet' : 'What the distance means'}</h2>
      <div className="sp-scroll">
        <table className="sp-table">
          <thead><tr><th>{de ? 'Kurs zur Linie' : 'Price vs average'}</th><th>{de ? 'In der Markttemperatur' : 'In the market temperature'}</th></tr></thead>
          <tbody>
            {ZONES.map((z) => (
              <tr key={z.key} className={z === zone ? 'now' : undefined}>
                <td>{z[lang]}{z === zone ? (de ? ' ← heute' : ' ← today') : ''}</td>
                <td>{de ? z.leanDe : z.leanEn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {de ? (
        <>
          <h2 className="sp-h2">Was die 200-Tage-Linie ist</h2>
          <p>Die 200-Tage-Linie, auch GD 200 oder SMA 200 genannt, ist der Durchschnitt der Tageskurse der letzten 200 Tage. Sie glättet das tägliche Auf und Ab und zeigt, in welche Richtung sich der Kurs über gut sechs Monate bewegt. Liegt der Kurs darüber, spricht man von einem Aufwärtstrend. Liegt er darunter, von einem Abwärtstrend.</p>
          <h2 className="sp-h2">Warum Bitcoiner auf sie schauen</h2>
          <p>Die Linie ist eine der ältesten Trendgrößen an den Finanzmärkten und funktioniert bei Bitcoin wie ein Spiegel der Stimmung über mehrere Monate. Weit darüber war Bitcoin meist in euphorischen Phasen, deutlich darunter in Bärenmärkten. Für viele Langfrist-Halter zeigt ein Kurs unter der Linie vor allem, dass Bitcoin gerade günstiger ist als im Schnitt der letzten Monate.</p>
          <p>When to Buy BTC kombiniert den Abstand zur Linie mit dem <a href="/bitcoin-angst-und-gier-index">Fear & Greed Index</a> und dem Abstand zum Allzeithoch zur <a href="/wann-bitcoin-kaufen">Markttemperatur</a>. Wie sich ein regelmäßiger Sparplan über alle diese Phasen entwickelt hätte, zeigt der <a href="/bitcoin-sparplan-rechner">Sparplan Rechner</a>.</p>
          <h2 className="sp-h2">So wird sie hier berechnet</h2>
          <p>Einfacher Durchschnitt der letzten 200 Tageskurse in Euro, Daten von CoinGecko. Der Abstand ist (Kurs − Linie) ÷ Linie. Wer auf anderen Seiten einen leicht anderen Wert sieht: Dort wird meist in US-Dollar gerechnet.</p>
        </>
      ) : (
        <>
          <h2 className="sp-h2">What the 200-day moving average is</h2>
          <p>The 200-day moving average, also called the 200 DMA or SMA 200, is the average of the last 200 daily prices. It smooths out the daily noise and shows which way the price has been moving over roughly six and a half months. A price above it is usually called an uptrend. A price below it, a downtrend.</p>
          <h2 className="sp-h2">Why Bitcoiners watch it</h2>
          <p>It is one of the oldest trend measures in finance, and for Bitcoin it works like a mirror of mood over several months. Far above it, Bitcoin has usually been in euphoric phases. Clearly below it, in bear markets. For many long-term holders, a price under the line mostly means Bitcoin is cheaper than its average of the last few months.</p>
          <p>When to Buy BTC combines the distance from the line with the <a href="/bitcoin-fear-and-greed-index">Fear & Greed Index</a> and the distance from the all-time high into one <a href="/">market temperature</a>. To see how a regular buying plan would have done through all these phases, try the <a href="/bitcoin-dca-calculator">DCA calculator</a>.</p>
          <h2 className="sp-h2">How it is calculated here</h2>
          <p>A simple average of the last 200 daily prices in euros, data from CoinGecko. The distance is (price − average) ÷ average. If another site shows a slightly different number, it is most likely calculating in US dollars.</p>
        </>
      )}
    </SeoPage>
  );
}
