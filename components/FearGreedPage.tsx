import SeoPage, { StateBadge, Stat, type Faq } from './SeoPage';
import { eur, pct, type MarketSnapshot } from '../lib/market-ssr';
import type { FgBand } from '../lib/signal';

type Lang = 'en' | 'de';

const BAND: Record<FgBand, { en: string; de: string; range: string; leanEn: string; leanDe: string }> = {
  'extreme-fear': { en: 'Extreme fear', de: 'Extreme Angst', range: '0–24', leanEn: 'Leans cold (counts double)', leanDe: 'Zeigt Richtung kalt (zählt doppelt)' },
  fear: { en: 'Fear', de: 'Angst', range: '25–46', leanEn: 'Leans cold', leanDe: 'Zeigt Richtung kalt' },
  neutral: { en: 'Neutral', de: 'Neutral', range: '47–54', leanEn: 'Middle, no lean', leanDe: 'Mitte, keine Richtung' },
  greed: { en: 'Greed', de: 'Gier', range: '55–75', leanEn: 'Leans hot', leanDe: 'Zeigt Richtung heiß' },
  'extreme-greed': { en: 'Extreme greed', de: 'Extreme Gier', range: '76–100', leanEn: 'Leans hot (counts double)', leanDe: 'Zeigt Richtung heiß (zählt doppelt)' },
};

const MOOD: Record<FgBand, { en: string; de: string }> = {
  'extreme-fear': { en: 'Most market participants are scared. Moods like this tend to show up after sharp drops.', de: 'Die meisten Marktteilnehmer haben Angst. Solche Phasen folgen oft auf starke Kursrückgänge.' },
  fear: { en: 'The mood is nervous. Sellers are louder than buyers, but nobody is panicking yet.', de: 'Die Stimmung ist nervös. Verkäufer sind lauter als Käufer, Panik herrscht aber noch nicht.' },
  neutral: { en: 'The mood is balanced. Neither fear nor greed dominates.', de: 'Die Stimmung ist ausgeglichen. Weder Angst noch Gier überwiegen.' },
  greed: { en: 'The mood is optimistic. Buyers are confident and prices have usually been rising.', de: 'Die Stimmung ist optimistisch. Käufer sind zuversichtlich, die Kurse sind meist gestiegen.' },
  'extreme-greed': { en: 'Euphoria. Moods like this tend to show up near local highs, when headlines are loud.', de: 'Euphorie. Solche Phasen zeigen sich oft in der Nähe lokaler Hochs, wenn die Schlagzeilen laut sind.' },
};

export default function FearGreedPage({ m, lang }: { m: MarketSnapshot; lang: Lang }) {
  const de = lang === 'de';
  const band = m.fgBand;
  const label = band ? BAND[band][lang] : (de ? 'Lädt' : 'Loading');
  const fgText = m.fg !== null ? String(m.fg) : '–';

  const answerText = de
    ? `Der Bitcoin Fear & Greed Index (Angst und Gier Index) steht heute bei ${fgText} von 100: ${label}. Der Index misst die Stimmung am Kryptomarkt auf einer Skala von 0 (extreme Angst) bis 100 (extreme Gier).`
    : `The Bitcoin Fear & Greed Index is at ${fgText} out of 100 today: ${label}. The index measures crypto market mood on a scale from 0 (extreme fear) to 100 (extreme greed).`;

  const faq: Faq[] = de ? [
    { q: 'Wo steht der Bitcoin Fear & Greed Index heute?', a: `Heute bei ${fgText} von 100 (${label}). Der Wert auf dieser Seite wird automatisch aktualisiert, die Quelle ist CoinMarketCap mit alternative.me als Ausweichquelle.` },
    { q: 'Was bedeutet extreme Angst bei Bitcoin?', a: 'Ein Wert unter 25 zeigt, dass die meisten Marktteilnehmer pessimistisch sind. Solche Phasen folgten in der Vergangenheit oft auf starke Kursrückgänge. Das beschreibt die Stimmung, nicht den künftigen Kurs.' },
    { q: 'Wie wird der Angst und Gier Index berechnet?', a: 'CoinMarketCap kombiniert Kursdynamik, Volatilität, Derivatedaten und Social-Media-Signale. Der ursprüngliche Index von alternative.me gewichtet Volatilität, Handelsvolumen, Social Media, Bitcoin-Dominanz und Google Trends. Beide ergeben einen Wert von 0 bis 100.' },
    { q: 'Ist der Fear & Greed Index ein Kaufsignal?', a: 'Nein. Er misst die Stimmung, nicht den fairen Preis. When to Buy BTC nutzt ihn als einen von drei Messwerten für die Markttemperatur und sagt niemandem, wann er kaufen oder verkaufen soll.' },
    { q: 'Wie oft wird der Index aktualisiert?', a: 'Die Quellen veröffentlichen einmal täglich einen neuen Wert. Diese Seite fragt ihn alle paar Stunden ab.' },
  ] : [
    { q: "What is the Bitcoin Fear and Greed Index today?", a: `Today it is at ${fgText} out of 100 (${label}). The value on this page updates automatically. The source is CoinMarketCap, with alternative.me as a fallback.` },
    { q: 'What does extreme fear mean for Bitcoin?', a: 'A reading below 25 means most market participants are pessimistic. In the past, readings like that often followed sharp price drops. It describes the mood, not where the price goes next.' },
    { q: 'How is the Fear and Greed Index calculated?', a: "CoinMarketCap blends price momentum, volatility, derivatives data and social media signals. alternative.me's original index weighs volatility, trading volume, social media, Bitcoin dominance and Google Trends. Both produce a score from 0 to 100." },
    { q: 'Is the Fear and Greed Index a buy signal?', a: 'No. It measures mood, not fair value. When to Buy BTC uses it as one of three readings for its market temperature and never tells anyone when to buy or sell.' },
    { q: 'How often does the Fear and Greed Index update?', a: 'The sources publish a new value once a day. This page checks for it every few hours.' },
  ];

  return (
    <SeoPage
      lang={lang}
      pageKey="fg"
      title={de ? 'Bitcoin Fear & Greed Index heute: Angst und Gier Index live' : 'Bitcoin Fear & Greed Index Today: Live Value and Meaning'}
      description={de
        ? `Bitcoin Angst und Gier Index heute: ${fgText}/100 (${label}). Live-Wert, Bedeutung der Zonen und wie Langfrist-Halter die Stimmung einordnen. Kostenlos, ohne Anmeldung.`
        : `Bitcoin Fear & Greed Index today: ${fgText}/100 (${label}). Live value, what each zone means and how long-term holders read market mood. Free, no sign-up.`}
      kicker={de ? 'Marktstimmung · live' : 'Market mood · live'}
      h1={de ? 'Bitcoin Fear & Greed Index heute' : 'Bitcoin Fear & Greed Index today'}
      answer={<p>{answerText}</p>}
      answerText={answerText}
      updatedAt={m.updatedAt}
      faq={faq}
    >
      <section className="sp-hero" aria-label={de ? 'Aktueller Wert' : 'Current value'}>
        <StateBadge state={m.state} lang={lang} />
        <div className="sp-hero-num">{fgText}</div>
        <div className="sp-hero-label">{label}</div>
        {m.fg !== null ? (
          <>
            <div className="sp-gauge" role="img" aria-label={`${fgText} / 100`}>
              <span className="sp-gauge-pin" style={{ left: `${Math.min(100, Math.max(0, m.fg))}%` }} />
            </div>
            <div className="sp-gauge-scale"><span>{de ? 'Angst' : 'Fear'}</span><span>Neutral</span><span>{de ? 'Gier' : 'Greed'}</span></div>
          </>
        ) : null}
        {band ? <p style={{ marginTop: '1.25rem' }}>{MOOD[band][lang]}</p> : null}
        <div className="sp-grid">
          <Stat label={de ? 'Bitcoin-Kurs' : 'Bitcoin price'} value={eur(m.price, lang)} note={m.change24h !== null ? `${pct(m.change24h, lang)} 24h` : undefined} />
          <Stat label={de ? 'Zum 200-Tage-Schnitt' : 'Vs 200-day average'} value={pct(m.maPct, lang)} />
          <Stat label={de ? 'Zum Allzeithoch' : 'From all-time high'} value={pct(m.athPct, lang)} />
        </div>
      </section>

      <h2 className="sp-h2">{de ? 'Was die Zonen bedeuten' : 'What each zone means'}</h2>
      <div className="sp-scroll">
        <table className="sp-table">
          <thead><tr><th>{de ? 'Wert' : 'Score'}</th><th>{de ? 'Zone' : 'Zone'}</th><th>{de ? 'In der Markttemperatur' : 'In the market temperature'}</th></tr></thead>
          <tbody>
            {(Object.keys(BAND) as FgBand[]).map((k) => (
              <tr key={k} className={k === band ? 'now' : undefined}>
                <td className="num">{BAND[k].range}</td>
                <td>{BAND[k][lang]}{k === band ? (de ? ' ← heute' : ' ← today') : ''}</td>
                <td>{de ? BAND[k].leanDe : BAND[k].leanEn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {de ? (
        <>
          <h2 className="sp-h2">Was der Index misst</h2>
          <p>Der Fear & Greed Index fasst die Stimmung am Kryptomarkt in einer Zahl zusammen. Er schaut darauf, wie stark und wie schnell sich der Kurs bewegt, wie viel gehandelt wird, was in sozialen Medien passiert und wie stark Bitcoin im Vergleich zum restlichen Markt ist. Starke Schwankungen nach unten und leise Kanäle drücken den Wert Richtung Angst. Steigende Kurse, hohes Volumen und laute Euphorie schieben ihn Richtung Gier.</p>
          <h2 className="sp-h2">Wie Langfrist-Halter ihn lesen</h2>
          <p>Viele Langfrist-Halter sehen den Index als Wetterbericht, nicht als Fahrplan. Ein ängstlicher Markt bedeutet für sie vor allem mehr Sats fürs gleiche Geld. Ein gieriger Markt zeigt, dass sich das Sparen gelohnt hat. Die meisten bleiben bei ihrem regelmäßigen Sparplan, egal bei welcher Temperatur.</p>
          <p>When to Buy BTC kombiniert den Index mit zwei weiteren Messwerten, dem <a href="/bitcoin-200-tage-linie">Abstand zur 200-Tage-Linie</a> und dem Abstand zum Allzeithoch. Zusammen ergibt das die <a href="/wann-bitcoin-kaufen">Markttemperatur: Kalt, Mild oder Heiß</a>.</p>
          <h2 className="sp-h2">Grenzen des Index</h2>
          <p>Stimmung kann lange extrem bleiben. Der Index hat 2021 monatelang Gier gezeigt, während der Kurs weiter stieg, und 2022 monatelang Angst, während er weiter fiel. Er sagt nichts über den fairen Wert von Bitcoin. Deshalb steht er hier nie allein.</p>
        </>
      ) : (
        <>
          <h2 className="sp-h2">What the index measures</h2>
          <p>The Fear & Greed Index squeezes crypto market mood into one number. It looks at how hard and how fast the price is moving, how much is being traded, what is happening on social media and how strong Bitcoin is against the rest of the market. Sharp drops and quiet channels push the score toward fear. Rising prices, heavy volume and loud euphoria push it toward greed.</p>
          <h2 className="sp-h2">How long-term holders read it</h2>
          <p>Many long-term holders treat the index like a weather report, not a roadmap. A fearful market mostly means more sats for the same money. A greedy market shows that saving has paid off. Most stick to their regular buying plan whatever the temperature.</p>
          <p>When to Buy BTC combines the index with two other readings, the <a href="/bitcoin-200-day-moving-average">distance from the 200-day moving average</a> and the distance from the all-time high. Together they make the <a href="/">market temperature: Cold, Mild or Hot</a>.</p>
          <h2 className="sp-h2">Limits of the index</h2>
          <p>Mood can stay extreme for a long time. In 2021 the index showed greed for months while the price kept rising, and in 2022 it showed fear for months while the price kept falling. It says nothing about what Bitcoin is worth. That is why it never stands alone here.</p>
        </>
      )}
    </SeoPage>
  );
}
