/**
 * whentobuybtc.xyz — X Posting Bot
 *
 * Runs as a Railway cron service.
 * POST_TYPE env var controls which post fires:
 *   "signal"  → daily signal post (set cron to run at e.g. 09:00 UTC)
 *   "bullish" → rotating bullish tweet (set cron to run at e.g. 18:00 UTC)
 */

const { Client } = require('pg');

// ─── CONFIG ─────────────────────────────────────────────────────────────────

const POST_TYPE = process.env.POST_TYPE; // "signal" or "bullish"

// X API credentials (set in Railway environment variables)
const X_API_KEY        = process.env.X_API_KEY;
const X_API_SECRET     = process.env.X_API_SECRET;
const X_ACCESS_TOKEN   = process.env.X_ACCESS_TOKEN;
const X_ACCESS_SECRET  = process.env.X_ACCESS_SECRET;

// Railway Postgres (same DB you already use)
const DATABASE_URL = process.env.DATABASE_URL;

// ─── TWITTER OAUTH 1.0a (no external library needed) ────────────────────────

const crypto = require('crypto');

function oauthSign(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${pct(k)}=${pct(params[k])}`)
    .join('&');
  const base = `${method}&${pct(url)}&${pct(sortedParams)}`;
  const signingKey = `${pct(consumerSecret)}&${pct(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(base).digest('base64');
}

function pct(str) {
  return encodeURIComponent(String(str));
}

function buildAuthHeader(method, url, extraParams = {}) {
  const oauthParams = {
    oauth_consumer_key:     X_API_KEY,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            X_ACCESS_TOKEN,
    oauth_version:          '1.0',
  };

  const allParams = { ...oauthParams, ...extraParams };
  oauthParams.oauth_signature = oauthSign(
    method, url, allParams, X_API_SECRET, X_ACCESS_SECRET
  );

  const headerValue = 'OAuth ' + Object.keys(oauthParams)
    .map(k => `${pct(k)}="${pct(oauthParams[k])}"`)
    .join(', ');

  return headerValue;
}

async function postTweet(text) {
  const url = 'https://api.x.com/2/tweets';
  const body = JSON.stringify({ text });
  const authHeader = buildAuthHeader('POST', url, {});

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`X API error: ${JSON.stringify(data)}`);
  return data;
}

// ─── SIGNAL FETCH ────────────────────────────────────────────────────────────
// Fetches data directly from whentobuybtc.xyz's own API endpoints.
// Same sources, same logic as the site — guaranteed to match exactly.

const SITE_BASE = 'https://whentobuybtc.xyz';

async function fetchSignal() {
  console.log('Fetching signal from whentobuybtc.xyz APIs...');

  // Run all three fetches in parallel
  const [fgRes, priceRes, athRes, historyRes] = await Promise.all([
    fetch(`${SITE_BASE}/api/fear-greed`),
    fetch(`${SITE_BASE}/api/price`),
    fetch(`${SITE_BASE}/api/ath`),
    fetch(`${SITE_BASE}/api/history?timeframe=1y&currency=eur`),
  ]);

  if (!fgRes.ok)      throw new Error(`fear-greed API ${fgRes.status}`);
  if (!priceRes.ok)   throw new Error(`price API ${priceRes.status}`);
  if (!athRes.ok)     throw new Error(`ath API ${athRes.status}`);
  if (!historyRes.ok) throw new Error(`history API ${historyRes.status}`);

  const [fgData, priceData, athData, historyData] = await Promise.all([
    fgRes.json(),
    priceRes.json(),
    athRes.json(),
    historyRes.json(),
  ]);

  // Fear & Greed
  const fearGreed = parseInt(fgData.value, 10);
  const fgLabel   = fgData.value_classification;
  console.log(`Fear & Greed: ${fearGreed} (${fgLabel})`);

  // Current price
  const currentPrice = priceData.eur;
  console.log(`Price: ${Math.round(currentPrice)} EUR`);

  // 200-day MA from history
  const prices = historyData.prices.map(p => p[1]);
  const last200 = prices.slice(-200);
  const ma200 = last200.reduce((a, b) => a + b, 0) / last200.length;
  const vsMA = ((currentPrice - ma200) / ma200 * 100).toFixed(1);
  console.log(`MA200: ${Math.round(ma200)} EUR, vs MA: ${vsMA}%`);

  // ATH distance
  const ath = athData.ath_eur;
  const fromATH = ((currentPrice - ath) / ath * 100).toFixed(1);
  console.log(`ATH: ${Math.round(ath)} EUR, from ATH: ${fromATH}%`);

  // Composite signal: same model as lib/signal.ts and app.html (see SIGNAL MODEL below)
  const { score, state } = wtbSignal(fearGreed, fgLabel, parseFloat(vsMA), parseFloat(fromATH));

  let signal, emoji;
  if (state === 'accumulate') { signal = 'Cold'; emoji = '❄️'; }
  else if (state === 'hold')  { signal = 'Mild'; emoji = '🌤️'; }
  else                        { signal = 'Hot';  emoji = '🔥'; }

  console.log(`Signal: ${signal} (score ${score})`);
  return { fearGreed, fgLabel, vsMA, fromATH, signal, emoji, currentPrice: Math.round(currentPrice) };
}

// ─── SIGNAL POST ─────────────────────────────────────────────────────────────

async function postSignal() {
  const s = await fetchSignal();

  const vsMAStr  = parseFloat(s.vsMA)  >= 0 ? `+${s.vsMA}%` : `${s.vsMA}%`;
  const athStr   = parseFloat(s.fromATH) >= 0 ? `+${s.fromATH}%` : `${s.fromATH}%`;

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const price = s.currentPrice.toLocaleString('en-GB');

  const text =
`$BTC price signal - ${today}

${s.emoji} Market today: ${s.signal}

Bitcoin price: €${price}
Fear & Greed: ${s.fearGreed} (${s.fgLabel})
vs 200-day avg: ${vsMAStr}
From ATH: ${athStr}

#Bitcoin #BTC`;

  console.log('Posting signal:\n', text);
  const result = await postTweet(text);
  console.log('Posted:', result.data?.id);
}

// ─── BULLISH TWEET ───────────────────────────────────────────────────────────

async function postBullish() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Create table if first run
  await client.query(`
    CREATE TABLE IF NOT EXISTS btc_tweet_log (
      id SERIAL PRIMARY KEY,
      tweet_index INTEGER NOT NULL,
      posted_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Load tweets
  const tweets = require('./tweets_final.json');
  const total = tweets.length;

  // Find which indices have been used
  const used = await client.query('SELECT tweet_index FROM btc_tweet_log');
  const usedSet = new Set(used.rows.map(r => r.tweet_index));

  // If all used, reset cycle
  if (usedSet.size >= total) {
    await client.query('DELETE FROM btc_tweet_log');
    usedSet.clear();
    console.log('All tweets used — cycle reset.');
  }

  // Pick a random unused index
  const available = [...Array(total).keys()].filter(i => !usedSet.has(i));
  const idx = available[Math.floor(Math.random() * available.length)];
  const text = tweets[idx];

  console.log(`Posting tweet #${idx}:\n`, text);
  const result = await postTweet(text);
  console.log('Posted:', result.data?.id);

  // Log it
  await client.query('INSERT INTO btc_tweet_log (tweet_index) VALUES ($1)', [idx]);
  await client.end();
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

(async () => {
  try {
    if (!POST_TYPE) throw new Error('POST_TYPE env var not set ("signal" or "bullish")');

    if (POST_TYPE === 'signal')  await postSignal();
    if (POST_TYPE === 'bullish') await postBullish();

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Bot error:', err.message);
    process.exit(1);
  }
})();

/* SIGNAL MODEL (start) — keep in sync with lib/signal.ts (tests/signal.test.ts checks it).
   Each reading leans cold (+), neutral (0) or hot (−); every reading has a neutral middle.
   Total −5…+5: Cold at +3 or more, Hot at −3 or less, Mild in between. */
function wtbFgBand(v, cls) {
  var m = { 'extreme fear': 'extreme-fear', 'fear': 'fear', 'neutral': 'neutral', 'greed': 'greed', 'extreme greed': 'extreme-greed' };
  var k = cls ? m[String(cls).trim().toLowerCase()] : null;
  if (k) return k;
  return v < 25 ? 'extreme-fear' : v < 47 ? 'fear' : v < 55 ? 'neutral' : v < 76 ? 'greed' : 'extreme-greed';
}
function wtbSignal(fgValue, fgClass, maPct, athPct) {
  var fg = { 'extreme-fear': 2, 'fear': 1, 'neutral': 0, 'greed': -1, 'extreme-greed': -2 }[wtbFgBand(fgValue, fgClass)];
  var ma = maPct < -10 ? 2 : maPct < -5 ? 1 : maPct <= 5 ? 0 : maPct <= 20 ? -1 : -2;
  var ath = athPct < -50 ? 1 : athPct < -20 ? 0 : -1;
  var score = fg + ma + ath;
  return { score: score, state: score >= 3 ? 'accumulate' : score <= -3 ? 'caution' : 'hold', parts: { fg: fg, ma: ma, ath: ath } };
}
/* SIGNAL MODEL (end) */

