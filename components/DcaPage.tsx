import { useMemo, useState } from 'react';
import SeoPage, { Stat, type Faq } from './SeoPage';
import { eur, pct, type MarketSnapshot } from '../lib/market-ssr';
import { computeDca, type Frequency } from '../lib/dca';

type Lang = 'en' | 'de';

function btc(n: number, lang: Lang) {
  return n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-IE', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' BTC';
}
function monthName(k: string, lang: Lang) {
  if (k === 'now') return lang === 'de' ? 'heute' : 'today';
  const [y, mo] = k.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export default function DcaPage({ m, lang }: { m: MarketSnapshot; lang: Lang }) {
  const de = lang === 'de';
  const monthly = m.monthly || {};
  const price = m.price || 0;
  const now = useMemo(() => new Date(m.updatedAt), [m.updatedAt]);
  const ready = price > 0 && Object.keys(monthly).length > 24;
  const thisYear = now.getUTCFullYear();
  const years = Array.from({ length: thisYear - 2015 + 1 }, (_, i) => 2015 + i);
  const tableYears = [2016, 2018, 2020, 2022, 2024].filter((y) => y < thisYear);

  const rows = ready ? tableYears.map((y) => ({ y, r: computeDca(monthly, 100, y, price, 'monthly', now) })) : [];
  const r2020 = rows.find((x) => x.y === 2020)?.r;
  // Smallest worst-drop across the table, so the copy below never overstates it
  const minDrop = rows.length ? Math.floor(Math.min(...rows.map(({ r }) => Math.abs((r.worst?.pct || 0) * 100))) / 5) * 5 : 0;

  const [amount, setAmount] = useState(100);
  const [start, setStart] = useState(2020);
  const [freq, setFreq] = useState<Frequency>('monthly');
  const calc = ready && amount > 0 ? computeDca(monthly, amount, start, price, freq, now) : null;

  const answerText = r2020
    ? (de
      ? `Wer seit Januar 2020 jeden Monat 100 € in Bitcoin gespart hat, hat ${eur(r2020.put, lang)} eingezahlt. Das sind heute ${eur(r2020.now, lang)} wert, das ${r2020.multiple.toLocaleString('de-DE', { maximumFractionDigits: 1 })}-Fache. Gerechnet mit dem Monatsdurchschnittskurs, ohne Gebühren und Steuern.`
      : `Saving €100 in Bitcoin every month since January 2020 means ${eur(r2020.put, lang)} paid in. Today that is worth ${eur(r2020.now, lang)}, ${r2020.multiple.toLocaleString('en-IE', { maximumFractionDigits: 1 })} times the money put in. Calculated at each month's average price, before fees and taxes.`)
    : (de ? 'Rechne aus, was ein regelmäßiger Bitcoin-Sparplan seit 2015 wert wäre.' : 'Work out what a regular Bitcoin savings plan since 2015 would be worth today.');

  const faq: Faq[] = de ? [
    { q: 'Was ist ein Bitcoin-Sparplan?', a: 'Ein fester Betrag wird in regelmäßigen Abständen in Bitcoin investiert, etwa jeden Monat 50 oder 100 €, unabhängig vom Kurs. Auf Englisch heißt das Dollar-Cost-Averaging (DCA). Bei niedrigen Kursen gibt es mehr Bitcoin fürs gleiche Geld, bei hohen weniger.' },
    { q: 'Was wären 100 € im Monat seit 2020 heute wert?', a: r2020 ? `${eur(r2020.put, lang)} eingezahlt, heute ${eur(r2020.now, lang)} wert (${r2020.multiple.toLocaleString('de-DE', { maximumFractionDigits: 1 })}-fach), insgesamt ${btc(r2020.btc, lang)}. Gerechnet mit Monatsdurchschnittskursen, ohne Gebühren und Steuern.` : 'Der Rechner oben zeigt den aktuellen Wert.' },
    { q: 'Wie rechnet der Sparplan Rechner?', a: 'Jeder Kauf wird mit dem Durchschnittskurs seines Monats in Euro bewertet (Daten von CoinGecko). Der heutige Wert ist die gesammelte Bitcoin-Menge mal dem aktuellen Kurs. Gebühren, Spreads und Steuern sind nicht enthalten.' },
    { q: 'Ist monatlich oder wöchentlich besser?', a: 'Über viele Jahre liegen beide meist nah beieinander. Wöchentlich glättet Schwankungen innerhalb eines Monats etwas stärker. Entscheidend war in der Vergangenheit vor allem, wie lange jemand dabeigeblieben ist.' },
    { q: 'Muss ich Gewinne aus Bitcoin versteuern?', a: 'In Deutschland sind Gewinne nach einem Jahr Haltedauer steuerfrei (§ 23 EStG), in Österreich gilt seit 2022 eine KESt von 27,5 %. Mehr dazu im Einsteiger-Guide. Dies ist keine Steuerberatung.' },
  ] : [
    { q: 'What is Bitcoin dollar-cost averaging (DCA)?', a: 'Buying a fixed amount of Bitcoin at regular intervals, for example €50 or €100 every month, whatever the price. When the price is low the same money buys more bitcoin, when it is high it buys less.' },
    { q: 'What would €100 a month in Bitcoin since 2020 be worth today?', a: r2020 ? `${eur(r2020.put, lang)} paid in, worth ${eur(r2020.now, lang)} today (${r2020.multiple.toLocaleString('en-IE', { maximumFractionDigits: 1 })}x), ${btc(r2020.btc, lang)} in total. Calculated at monthly average prices, before fees and taxes.` : 'The calculator above shows the current value.' },
    { q: 'How does this DCA calculator work?', a: "Each buy is priced at its month's average price in euros (CoinGecko data). Today's value is the bitcoin collected times the current price. Fees, spreads and taxes are not included." },
    { q: 'Is weekly or monthly DCA better?', a: 'Over several years the two usually end up close. Weekly smooths out swings within a month a little more. In the past, what mattered most was how long someone kept going.' },
    { q: 'What was the worst drop for a Bitcoin DCA plan?', a: r2020?.worst ? `For €100 a month since 2020 the pot fell ${pct(r2020.worst.pct * 100, lang, false)} from its peak (${monthName(r2020.worst.from, lang)} to ${monthName(r2020.worst.to, lang)}). Drops like that are part of every Bitcoin cycle so far.` : 'The calculator above shows the biggest drop for any plan.' },
  ];

  return (
    <SeoPage
      lang={lang}
      pageKey="dca"
      title={de ? 'Bitcoin Sparplan Rechner: Was wäre mein Sparplan heute wert?' : 'Bitcoin DCA Calculator: What Your Plan Would Be Worth Today'}
      description={de
        ? 'Kostenloser Bitcoin Sparplan Rechner in Euro: monatlich oder wöchentlich, ab jedem Jahr seit 2015. Mit Live-Kurs, größtem Rückgang und Ergebnistabelle.'
        : 'Free Bitcoin DCA calculator in euros: monthly or weekly, from any year since 2015. Live price, biggest drawdown and a results table for €100 a month.'}
      kicker={de ? 'Sparplan · live' : 'Dollar-cost averaging · live'}
      h1={de ? 'Bitcoin Sparplan Rechner' : 'Bitcoin DCA calculator'}
      answer={<p>{answerText}</p>}
      answerText={answerText}
      updatedAt={m.updatedAt}
      faq={faq}
    >
      <section className="sp-calc" aria-label={de ? 'Rechner' : 'Calculator'}>
        <div className="sp-calc-row">
          <div>
            <label htmlFor="dca-amt">{de ? 'Betrag (€)' : 'Amount (€)'}</label>
            <input id="dca-amt" type="number" inputMode="numeric" min={1} max={100000} value={amount}
              onChange={(e) => setAmount(Math.max(0, Math.min(100000, Number(e.target.value) || 0)))} />
          </div>
          <div>
            <label htmlFor="dca-freq">{de ? 'Rhythmus' : 'Every'}</label>
            <select id="dca-freq" value={freq} onChange={(e) => setFreq(e.target.value as Frequency)}>
              <option value="monthly">{de ? 'Monat' : 'Month'}</option>
              <option value="weekly">{de ? 'Woche' : 'Week'}</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <label htmlFor="dca-start">{de ? 'Start im Januar' : 'Starting January'}</label>
          <select id="dca-start" value={start} onChange={(e) => setStart(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {calc ? (
          <div className="sp-calc-out" aria-live="polite">
            <div className="sp-hero-num" style={{ fontSize: 'clamp(3rem, 15vw, 5.5rem)' }}>{eur(calc.now, lang)}</div>
            <div className="sp-grid">
              <Stat label={de ? 'Eingezahlt' : 'Paid in'} value={eur(calc.put, lang)} note={`${calc.buys} ${de ? 'Käufe' : 'buys'}`} />
              <Stat label={de ? 'Faktor' : 'Multiple'} value={`${calc.multiple.toLocaleString(de ? 'de-DE' : 'en-IE', { maximumFractionDigits: 2 })}x`} />
              <Stat label="Bitcoin" value={btc(calc.btc, lang)} />
              {calc.worst ? <Stat label={de ? 'Größter Rückgang' : 'Biggest drop'} value={pct(calc.worst.pct * 100, lang)} note={`${monthName(calc.worst.from, lang)} → ${monthName(calc.worst.to, lang)}`} /> : null}
              <Stat label={de ? 'Monate im Minus' : 'Months underwater'} value={`${calc.underwater} / ${calc.months}`} />
            </div>
          </div>
        ) : (
          <p className="sp-calc-out">{de ? 'Kursdaten werden geladen.' : 'Loading price data.'}</p>
        )}
      </section>

      {rows.length ? (
        <>
          <h2 className="sp-h2">{de ? '100 € im Monat: Ergebnisse nach Startjahr' : '€100 a month: results by start year'}</h2>
          <div className="sp-scroll">
            <table className="sp-table">
              <thead><tr>
                <th>{de ? 'Start' : 'Start'}</th>
                <th className="num">{de ? 'Eingezahlt' : 'Paid in'}</th>
                <th className="num">{de ? 'Wert heute' : 'Worth today'}</th>
                <th className="num">{de ? 'Faktor' : 'Multiple'}</th>
                <th className="num">{de ? 'Größter Rückgang' : 'Biggest drop'}</th>
              </tr></thead>
              <tbody>
                {rows.map(({ y, r }) => (
                  <tr key={y}>
                    <td>{de ? `Jan. ${y}` : `Jan ${y}`}</td>
                    <td className="num">{eur(r.put, lang)}</td>
                    <td className="num">{eur(r.now, lang)}</td>
                    <td className="num">{r.multiple.toLocaleString(de ? 'de-DE' : 'en-IE', { maximumFractionDigits: 1 })}x</td>
                    <td className="num">{r.worst ? pct(r.worst.pct * 100, lang) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '0.66rem', color: 'var(--g)' }}>
            {de ? 'Monatsdurchschnittskurse in Euro (CoinGecko), heutiger Live-Kurs, ohne Gebühren und Steuern. Vergangene Entwicklung ist keine Garantie für die Zukunft.'
              : "Monthly average prices in euros (CoinGecko), today's live price, before fees and taxes. Past performance does not guarantee future results."}
          </p>
        </>
      ) : null}

      {de ? (
        <>
          <h2 className="sp-h2">Warum so viele Bitcoiner regelmäßig sparen</h2>
          <p>Niemand weiß, wo der Kurs nächste Woche steht. Ein Sparplan nimmt diese Frage aus der Gleichung: Es wird jeden Monat gekauft, bei Angst und bei Euphorie. {minDrop >= 20 ? `Die Tabelle zeigt, dass jeder Startpunkt durch Rückgänge von ${minDrop} % und mehr gegangen ist. ` : ''}Wer in Rückgängen weitergespart hat, hat genau in diesen Phasen die meisten Sats bekommen.</p>
          <p>Wie heiß oder kalt der Markt gerade ist, zeigt die <a href="/wann-bitcoin-kaufen">Markttemperatur</a> aus <a href="/bitcoin-angst-und-gier-index">Angst und Gier Index</a>, <a href="/bitcoin-200-tage-linie">200-Tage-Linie</a> und Abstand zum Allzeithoch. Die Steuerregeln für Deutschland (§ 23 EStG) erklärt der <a href="/wann-bitcoin-kaufen">Einsteiger-Guide</a>.</p>
        </>
      ) : (
        <>
          <h2 className="sp-h2">Why so many Bitcoiners buy on a schedule</h2>
          <p>Nobody knows where the price will be next week. A regular plan takes that question out of the equation: it buys every month, in fear and in euphoria. {minDrop >= 20 ? `The table shows that every starting point went through drops of ${minDrop}% or more. ` : ''}Those who kept going through the drops collected the most sats during exactly those phases.</p>
          <p>How hot or cold the market is right now is what the <a href="/">market temperature</a> shows, built from the <a href="/bitcoin-fear-and-greed-index">Fear & Greed Index</a>, the <a href="/bitcoin-200-day-moving-average">200-day moving average</a> and the distance from the all-time high.</p>
        </>
      )}
    </SeoPage>
  );
}
