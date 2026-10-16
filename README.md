# When to Buy BTC

The Bitcoin weather for long-term holders. Three readings (market mood, the 200-day average and distance from the all-time high) add up to one temperature: **Cold, Mild or Hot**. Descriptive only, never advice.

🌐 [whentobuybtc.xyz](https://whentobuybtc.xyz) · 🇩🇪 [whentobuybtc.xyz/wann-bitcoin-kaufen](https://whentobuybtc.xyz/wann-bitcoin-kaufen)

---

## What it does

- **Live price as the hero**: in euros for every visitor, with the 24h change
- **Today's temperature**: Cold / Mild / Hot (Kalt / Mild / Heiß) with a one-line reading and a cold-to-hot scale
- **Why this temperature**: one card per reading (mood, trend, peak), each leaning colder or warmer, plus a **Together** box that adds them up
- **Wider market**: S&P 500, Nasdaq, gold and the US 10-year yield, and whether Bitcoin moved with the market or on its own (context only, never part of the score)
- **Price chart**: 1M / 3M / 1Y with the 200-day average
- **"What if?" calculator**: any amount, monthly or weekly, any start year since 2015. Result in EUR and BTC with a worth-vs-put-in chart
- **Email**: a Sunday digest for everyone, plus an alert when Bitcoin moves 3% or more in 24 hours. The alerts section shows a live preview of the email
- **EN / DE** throughout, with locale number formatting
- **Share**: WhatsApp, X, Telegram, Signal, copy link

Awards: CSSDA Best UI, Best UX, Best Innovation, Special Kudos.

---

## The temperature model

One source of truth: `lib/signal.ts`. Each reading scores from +2 (leans cold) to −2 (leans hot). The total runs from −5 to +5:

| Reading | Leans cold | Middle (0) | Leans hot |
|---|---|---|---|
| Fear & Greed | Extreme fear +2, fear +1 | Neutral | Greed −1, extreme greed −2 |
| Price vs 200-day average | below −10% +2, below −5% +1 | within ±5% | above +5% −1, above +20% −2 |
| Distance from all-time high | more than 50% below +1 | 20–50% below | within 20% −1 |

**Cold** at +3 or more, **Hot** at −3 or less, **Mild** in between. Fear & Greed bands follow the publisher's own label, with a numeric fallback (25 / 47 / 55 / 76).

The same logic is copied into `public/app.html` (between the `SIGNAL MODEL` markers) and `twitter-bot/bot.js`. `tests/signal.test.ts` checks that all copies agree. Internal state names are still `accumulate` / `hold` / `caution` (= Cold / Mild / Hot).

The calculator model is `lib/dca.ts` (mirrored as `wtbDca` in `app.html`). It buys at each month's average price, values at today's price, and makes weekly buys every 7 days from 1 January of the start year.

---

## Tech stack

- **Next.js 15** (Pages Router) on **Railway**, with **Postgres** on Railway
- **Frontend**: one self-contained `public/app.html`, served at `/` by `pages/index.tsx` (200, no redirect). Hand-built canvas charts, no UI framework
- **German SEO page**: `pages/wann-bitcoin-kaufen.tsx`, server-rendered React
- **Data pages** (EN + DE, server-rendered with live numbers): Fear & Greed, 200-day moving average, DCA calculator. Shared layout in `components/SeoPage.tsx`
- **Email**: [Resend](https://resend.com) (sending plus Contacts sync). Postgres is the source of truth for subscribers
- **Analytics**: Umami v3, self-hosted at `umami-orange.up.railway.app`
- **Scheduler**: [cron-job.org](https://cron-job.org) calls the two cron endpoints with `Authorization: Bearer <CRON_SECRET>`
- **Fonts**: Bebas Neue, Cormorant Garamond, DM Mono (Google Fonts)

---

## Data sources

| Endpoint | Source | Cache |
|---|---|---|
| `/api/price` | CoinGecko Pro | 90 s |
| `/api/fear-greed` | CoinMarketCap, fallback Alternative.me. Returns 503 rather than a made-up value | 3 h |
| `/api/ath` | CoinGecko Pro | 12 h |
| `/api/history` | CoinGecko Pro market chart (the site uses `timeframe=1y` for the 200-day average) | 5 min |
| `/api/btc-history-monthly` | CoinGecko Pro (`days=max`, EUR + USD), monthly averages since 2015 | 12 h |
| `/api/macro` | FRED (S&P 500, Nasdaq, US 10Y), ECB (FX), CoinGecko (BTC, gold via PAXG). Every field fails soft | 15 min |
| `/api/visitor-count` | Umami stats | 10 min |
| `/api/subscriber-count` | Postgres, floored to the nearest 10 | |

The German page reads the block height from mempool.space in the browser (halving countdown).

---

## API endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/price` `/api/fear-greed` `/api/ath` `/api/history` | GET | Market data for the site and emails |
| `/api/btc-history-monthly` | GET | Monthly prices for the calculator and the digest's "What if?" card |
| `/api/macro` | GET | Wider-market context |
| `/api/visitor-count` `/api/subscriber-count` | GET | Counters |
| `/api/subscribe` | POST | Double opt-in: stores a pending subscriber, sends the confirmation email |
| `/api/confirm` | GET | Confirms, sends the welcome email, redirects to `/?email=confirmed#alerts` |
| `/api/unsubscribe` | GET | One-click unsubscribe from any email footer |
| `/api/check-signal` | GET/POST, **Bearer** | Alert check (every 15 min). Sends when the 24h move is ≥3%, with a 24h same-direction cooldown |
| `/api/weekly-digest` | POST, **Bearer** | Sunday digest (Sundays 15:00 UTC), 24h cooldown |
| `/api/admin/backup` | GET/POST, **Bearer** | Weekly: emails the `subscribers` table as CSV to `BACKUP_EMAIL`. `&download=1` downloads it instead |
| `/api/email-preview` | GET, `?token=` | Renders any email in the browser with live market data. Sends nothing |
| `/api/sitemap` | GET | XML sitemap (also at `/sitemap.xml`) |

Cron endpoints accept `Authorization: Bearer <CRON_SECRET>` (or `?token=`, see `lib/cron-auth.ts`).

**Monitoring:** every scheduled job pings its own [healthchecks.io](https://healthchecks.io) check when it finishes (`<url>` on success, `<url>/fail` on a 5xx, an error or failed sends). A missing ping means the job stopped running; either way the owner gets an email. See `lib/heartbeat.ts`. Unset URL → no ping.

---

## Emails

Templates live in `lib/email-templates.ts`, EN and DE:

- **Confirmation** ("One tap and you're in"), with today's temperature as a teaser
- **Welcome**: how to read the temperature
- **Alert**: big 24h move, the three readings, a plain-language explanation
- **Weekly digest**: this week's temperature, week-over-week changes, a "What if?" card from the calculator model, and the wider market

The market block in alerts and digests is controlled by `MACRO_CONTEXT`: `off` (default), `test` (only `MACRO_CONTEXT_TEST_EMAIL`) or `on`.

Preview everything at `/api/email-preview?token=<CRON_SECRET>&type=digest|alert|welcome|confirm&lang=en|de&state=accumulate|hold|caution`.

Tables: `subscribers`, `alert_log`, `digest_log`, `btc_price_history` (snapshot written on each alert check, 7-day retention; not read by the app).

---

## Environment variables (Railway)

| Variable | Used by |
|---|---|
| `DATABASE_URL` | Postgres (subscribers, logs) |
| `RESEND_API_KEY` | Sending email, Contacts sync |
| `REPLY_TO_EMAIL` | Reply-To on every email ("just hit reply") |
| `CRON_SECRET` | Auth for `/api/check-signal`, `/api/weekly-digest`, `/api/email-preview` |
| `COINGECKO_API_KEY` | CoinGecko Pro |
| `COINMARKETCAP_API_KEY` | Fear & Greed (primary) |
| `FRED_API_KEY` | `/api/macro` |
| `UMAMI_PASSWORD` | Visitor counter |
| `NEXT_PUBLIC_BASE_URL` | Optional, defaults to `https://whentobuybtc.xyz` |
| `MACRO_CONTEXT`, `MACRO_CONTEXT_TEST_EMAIL` | Optional, market block in emails |
| `HEALTHCHECK_URL_SIGNAL`, `HEALTHCHECK_URL_DIGEST`, `HEALTHCHECK_URL_BACKUP` | Optional, healthchecks.io ping URLs |
| `BACKUP_EMAIL` | Optional, where the weekly backup goes (default `REPLY_TO_EMAIL`) |

The X bot (`twitter-bot/`) runs as separate Railway cron services with `POST_TYPE` (`signal` / `bullish`), `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`, `DATABASE_URL` and optionally `HEALTHCHECK_URL` (its own check). Railway reference variables come through empty in cron services, so use `DATABASE_PUBLIC_URL` directly.

---

## Project structure

```
pages/
  index.tsx                  Serves public/app.html at / (FAQ + FAQPage schema added server-side)
  wann-bitcoin-kaufen.tsx    German SEO page (SSR)
  bitcoin-*.tsx              Data pages, EN + DE pairs (SSR)
  404.tsx
  _document.tsx, _app.tsx
  api/                       Endpoints above
lib/
  signal.ts                  Temperature model (shared)
  dca.ts                     Calculator model (shared)
  email-templates.ts         All emails, EN/DE
  macro/                     Wider-market sources, maths, copy, email blocks
  subscribers.ts             Live reader count for emails
  resend-contact.ts          Resend Contacts sync (REST, fire-and-forget)
  cron-auth.ts               Bearer / token check for cron endpoints
  market-ssr.ts              Live market snapshot for the data pages
  home-html.ts               Builds the homepage HTML from app.html (server-rendered FAQ)
components/                  Data page layout and the three data pages
public/
  app.html                   The whole homepage (HTML, CSS, JS)
  llms.txt, robots.txt, manifest.json, icons, OG images
tests/                       node:test suites (signal parity, DCA, macro, emails, copy)
twitter-bot/                 X posting bot (separate Railway service)
next.config.js               Redirects, headers (CSP, noindex on /api)
railway.toml                 Start command
```

---

## Development

```bash
npm install
npm run dev                                   # http://localhost:3000
npm test                                      # unit tests (also run by CI on every PR)
npx tsc --noEmit -p .                         # type check
npm run build && npm start                    # production build
```

Without API keys the market endpoints return errors. Point the browser at production data, or mock the `/api/*` routes, to work on the UI.

---

## Deployment

Railway deploys every push to `main`. Changes go through pull requests; merges are done by hand. Don't commit `package-lock.json`.

---

## Notes

- `app.html` can be edited directly in the GitHub web editor. Keep it a single file
- Copy rules: third-person and descriptive ("most long-term holders…"), never buy/sell/wait instructions, no em dashes, every string in EN and DE
- When editing the signal bands, change `lib/signal.ts`, the `SIGNAL MODEL` block in `app.html` and `twitter-bot/bot.js` together; the parity test will fail otherwise
- Umami v3 returns `stats.visitors` as a plain number

---

Built by [Imo Babics](https://imobabics.com) · Market data only, not financial advice
