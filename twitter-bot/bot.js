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

async function postTweet(text, replyToId) {
  const url = 'https://api.x.com/2/tweets';
  const body = JSON.stringify(replyToId ? { text, reply: { in_reply_to_tweet_id: replyToId } } : { text });
  const authHeader = buildAuthHeader('POST', url, {});

  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
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
  // The site scores the temperature (lib/signal-model.js); the bot only reads the result,
  // so it can never drift from what the site and the emails show.
  console.log('Fetching signal from whentobuybtc.xyz/api/signal...');
  const r = await fetch(`${SITE_BASE}/api/signal`, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`signal API ${r.status}`);
  return fromSignalApi(await r.json());
}

const STATE_LABEL = { accumulate: ['Cold', '❄️'], hold: ['Mild', '🌤️'], caution: ['Hot', '🔥'] };
function fromSignalApi(d) {
  const [signal, emoji] = STATE_LABEL[d.state];
  console.log(`Signal: ${signal} (score ${d.score}) · F&G ${d.fg} · vs MA ${d.maPct.toFixed(1)}% · from ATH ${d.athPct.toFixed(1)}%`);
  return { fearGreed: d.fg, fgLabel: d.fgLabel, vsMA: d.maPct.toFixed(1), fromATH: d.athPct.toFixed(1), signal, emoji,
    currentPrice: Math.round(d.price), state: d.state, parts: d.parts, maPct: d.maPct, athPct: d.athPct,
    change24h: typeof d.change24h === 'number' ? d.change24h : null };
}

// ─── SIGNAL POST ─────────────────────────────────────────────────────────────
// One post a day, written like the site: the temperature, one plain sentence, the four numbers.
// The link goes in a reply (X shows link posts to fewer people). Describes, never advises.

const SITE_URL = 'https://whentobuybtc.xyz';

function fmtPct(v, signed = true) {
  const r = Number(v.toFixed(1));
  const sign = r < 0 ? '−' : (r > 0 && signed ? '+' : '');
  return sign + Math.abs(r).toFixed(1) + '%';
}

function signalSentence(s) {
  if (s.athPct >= 0) return 'Bitcoin is at a new all-time high. A day to celebrate for long-term holders.';
  if (s.change24h !== null && s.change24h <= -5) return `A ${fmtPct(Math.abs(s.change24h), false)} drop in a day. For long-term holders, that means cheaper sats.`;
  if (s.change24h !== null && s.change24h >= 5) return `Up ${fmtPct(s.change24h, false)} in a day. This is what the quiet months were for.`;
  const v = [s.parts.fg, s.parts.ma, s.parts.ath];
  if (s.state === 'accumulate') return 'The readings lean cold. Sats cost less than usual.';
  if (s.state === 'caution') return 'The readings lean hot. A good stretch for anyone who has been stacking.';
  return v.some(x => x > 0) && v.some(x => x < 0)
    ? 'The readings pull in different directions, so the market reads mild.'
    : 'No reading is at an extreme, so the market reads mild.';
}

function buildSignalPost(s) {
  const price = s.currentPrice.toLocaleString('en-GB');
  const change = s.change24h === null ? '' : ` (${fmtPct(s.change24h)} in 24h)`;
  const mood = String(s.fgLabel || '').toLowerCase();
  return `$BTC today: ${s.signal} ${s.emoji}

€${price}${change}
Mood: ${s.fearGreed}${mood ? `, ${mood}` : ''}
vs 200-day average: ${fmtPct(s.maPct)}
From the all-time high: ${fmtPct(s.athPct)}

${signalSentence(s)}`;
}

function buildSignalReply(s) {
  return `Why it reads ${s.signal.toLowerCase()}, and the free Sunday email: ${SITE_URL}/?utm_source=x&utm_medium=social&utm_campaign=daily`;
}

async function postSignal() {
  const s = await fetchSignal();
  const text = buildSignalPost(s);
  console.log('Posting signal:\n', text);
  const result = await postTweet(text);
  const id = result.data?.id;
  console.log('Posted:', id);
  // Link as a reply; never fail the job over it
  if (id) {
    try { const r = await postTweet(buildSignalReply(s), id); console.log('Reply:', r.data?.id); }
    catch (e) { console.error('Reply failed (signal post is up):', e.message); }
  }
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

  // Load tweets. Retired tweets are null so every index (logged in btc_tweet_log) keeps its meaning.
  const tweets = require('./tweets_final.json');
  const live = [...tweets.keys()].filter(i => typeof tweets[i] === 'string' && tweets[i].trim());

  // Find which indices have been used
  const used = await client.query('SELECT tweet_index FROM btc_tweet_log');
  const usedSet = new Set(used.rows.map(r => r.tweet_index));

  // If every live tweet has been used, start a new cycle
  if (live.every(i => usedSet.has(i))) {
    await client.query('DELETE FROM btc_tweet_log');
    usedSet.clear();
    console.log('All tweets used — cycle reset.');
  }

  // Pick a random unused index
  const available = live.filter(i => !usedSet.has(i));
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

if (require.main === module) (async () => {
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

module.exports = { buildSignalPost, buildSignalReply, signalSentence, fromSignalApi };
