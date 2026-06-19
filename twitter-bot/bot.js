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

async function fetchSignal() {
  // Fear & Greed
  const fgRes = await fetch('https://api.alternative.me/fng/?limit=1');
  const fgData = await fgRes.json();
  const fearGreed = parseInt(fgData.data[0].value, 10);
  const fgLabel   = fgData.data[0].value_classification;

  // BTC price + 200-day MA via CoinGecko
  const cgRes = await fetch(
    'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=210&interval=daily'
  );
  const cgData = await cgRes.json();
  const prices = cgData.prices.map(p => p[1]);
  const currentPrice = prices[prices.length - 1];
  const ma200 = prices.slice(-200).reduce((a, b) => a + b, 0) / 200;
  const vsMA = ((currentPrice - ma200) / ma200 * 100).toFixed(1);

  // ATH distance via CoinGecko
  const athRes = await fetch(
    'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true'
  );
  const athData = await athRes.json();
  const ath = athData.market_data.ath.eur;
  const fromATH = ((currentPrice - ath) / ath * 100).toFixed(1);

  // Composite signal (same logic as your site)
  let score = 0;
  if (fearGreed < 25) score += 2;
  else if (fearGreed < 45) score += 1;

  if (parseFloat(vsMA) < -10) score += 2;
  else if (parseFloat(vsMA) < 0) score += 1;

  if (parseFloat(fromATH) < -40) score += 2;
  else if (parseFloat(fromATH) < -20) score += 1;

  let signal, emoji;
  if (score >= 4)      { signal = 'ACCUMULATE'; emoji = '🟢'; }
  else if (score >= 2) { signal = 'HOLD';       emoji = '🟡'; }
  else                 { signal = 'CAUTION';     emoji = '🔴'; }

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

  const text =
`BTC signal - ${today}

${s.emoji} ${s.signal}

Fear & Greed: ${s.fearGreed} (${s.fgLabel})
vs 200-day avg: ${vsMAStr}
From ATH: ${athStr}`;

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
