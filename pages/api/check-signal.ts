import type { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const ONESIGNAL_APP_ID = '528df914-2cb6-4e5b-af01-3c849ce8e393';
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY!;
const PRICE_API = process.env.NEXT_PUBLIC_BASE_URL || 'https://whentobuybtc.xyz';

const MOVE_THRESHOLD = 0.05;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS btc_price_history (
      recorded_at TIMESTAMPTZ PRIMARY KEY DEFAULT NOW(),
      price_eur NUMERIC NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS alert_log (
      id SERIAL PRIMARY KEY,
      fired_at TIMESTAMPTZ DEFAULT NOW(),
      price_eur NUMERIC NOT NULL,
      reference_price_eur NUMERIC NOT NULL,
      move_pct NUMERIC NOT NULL,
      direction TEXT NOT NULL
    )
  `;
}

async function getCurrentPrice(): Promise<number> {
  const res = await fetch(`${PRICE_API}/api/price`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Price API ${res.status}`);
  const data = await res.json();
  return data.eur;
}

async function storePriceSnapshot(price: number) {
  await sql`INSERT INTO btc_price_history (price_eur) VALUES (${price})`;
  await sql`DELETE FROM btc_price_history WHERE recorded_at < NOW() - INTERVAL '7 days'`;
}

async function getPriceFromHoursAgo(hours: number): Promise<number | null> {
  const rows = await sql`
    SELECT price_eur FROM btc_price_history
    WHERE recorded_at <= NOW() - (${hours} || ' hours')::INTERVAL
    ORDER BY recorded_at DESC LIMIT 1
  `;
  return rows.length ? parseFloat(rows[0].price_eur) : null;
}

async function getLastAlertTime(): Promise<Date | null> {
  const rows = await sql`SELECT fired_at FROM alert_log ORDER BY fired_at DESC LIMIT 1`;
  return rows.length ? new Date(rows[0].fired_at) : null;
}

async function logAlert(price: number, refPrice: number, movePct: number, direction: string) {
  await sql`
    INSERT INTO alert_log (price_eur, reference_price_eur, move_pct, direction)
    VALUES (${price}, ${refPrice}, ${movePct}, ${direction})
  `;
}

function buildNotification(price: number, movePct: number, direction: 'up' | 'down', lang: 'en' | 'de') {
  const pct = Math.abs(movePct * 100).toFixed(1);
  const fmt = (n: number) => '€' + Math.round(n).toLocaleString('de-DE');

  if (lang === 'de') {
    return direction === 'down'
      ? { heading: `Bitcoin fiel ${pct}% in 4 Stunden`, message: `BTC steht bei ${fmt(price)}. Bitcoiner kaufen.` }
      : { heading: `Bitcoin stieg ${pct}% in 4 Stunden`, message: `BTC steht bei ${fmt(price)}. Bitcoiner halten — und verkaufen nicht in den Hype hinein.` };
  }
  return direction === 'down'
    ? { heading: `Bitcoin dropped ${pct}% in 4 hours`, message: `BTC is now ${fmt(price)}. Bitcoiners are buying.` }
    : { heading: `Bitcoin surged ${pct}% in 4 hours`, message: `BTC is now ${fmt(price)}. Bitcoiners are holding — and not selling into the hype.` };
}

async function sendPush(price: number, movePct: number, direction: 'up' | 'down') {
  const sends = [
    { lang: 'en' as const, filters: [{ field: 'tag', key: 'lang', relation: '!=', value: 'de' }] },
    { lang: 'de' as const, filters: [{ field: 'tag', key: 'lang', relation: '=', value: 'de' }] },
  ];

  for (const { lang, filters } of sends) {
    const { heading, message } = buildNotification(price, movePct, direction, lang);
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${ONESIGNAL_API_KEY}` },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        filters,
        headings: { en: heading },
        contents: { en: message },
        url: 'https://whentobuybtc.xyz',
        web_push_topic: 'btc-price-alert',
        ttl: 3600,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OneSignal ${lang} error ${res.status}: ${err}`);
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await ensureTables();

    const currentPrice = await getCurrentPrice();
    await storePriceSnapshot(currentPrice);

    const refPrice = await getPriceFromHoursAgo(4);
    if (!refPrice) {
      return res.status(200).json({ status: 'no_reference', message: 'Not enough price history yet' });
    }

    const movePct = (currentPrice - refPrice) / refPrice;
    const absMove = Math.abs(movePct);
    const direction = movePct >= 0 ? 'up' : 'down';

    if (absMove < MOVE_THRESHOLD) {
      return res.status(200).json({ status: 'no_alert', movePct: (movePct * 100).toFixed(2) + '%' });
    }

    const lastAlert = await getLastAlertTime();
    if (lastAlert && Date.now() - lastAlert.getTime() < COOLDOWN_MS) {
      const hoursAgo = ((Date.now() - lastAlert.getTime()) / 3600000).toFixed(1);
      return res.status(200).json({ status: 'cooldown', lastAlertHoursAgo: hoursAgo });
    }

    await sendPush(currentPrice, movePct, direction as 'up' | 'down');
    await logAlert(currentPrice, refPrice, movePct, direction);

    return res.status(200).json({ status: 'alert_sent', direction, movePct: (movePct * 100).toFixed(2) + '%' });

  } catch (err: any) {
    console.error('check-signal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
