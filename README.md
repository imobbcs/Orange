# When to Buy BTC
A free Bitcoin market signal for long-term thinkers. Combines Fear & Greed, the 200-day moving average, and ATH distance into one clear signal. No noise. No trading advice.
🌐 [whentobuybtc.xyz](https://whentobuybtc.xyz)
---
## What it does
- **Live Bitcoin signal** — Accumulate / Hold / Caution, updated in real time
- **Three indicators** — Fear & Greed Index, 200-day moving average, distance from ATH
- **Live price** — EUR/USD with automatic currency detection by location
- **Price chart** — 1M / 3M / 1Y historical chart with 200-day MA overlay
- **"What if?" calculator** — Shows what daily habits (coffee, gym, takeaways, etc.) would be worth if invested in Bitcoin monthly since 2015
- **Email alerts** — Opt-in email notifications when the signal changes, plus a weekly Sunday digest
- **Visitor counter** — Live count of unique visitors via Umami analytics
- **Subscriber counter** — Live count of email subscribers shown in the alerts section
- **Relai integration** — Direct link to buy Bitcoin via Relai with referral code IMO
- **Trezor integration** — Direct link to hardware wallet via Trezor referral
- **EN / DE** — English and German language support
- **Cinematic design** — Dark, atmospheric UI with animated starfield, particle energy field, horizon chart, and film grain — CSSDA Best UI, Best UX, Best Innovation, and Special Kudos awards
---
## Tech stack
- **Framework** — Next.js
- **Frontend** — Single-page `app.html` served via Next.js rewrite from `/`
- **Fonts** — Bebas Neue, Cormorant Garamond, DM Mono (Google Fonts)
- **Charts** — Hand-built Canvas (price chart, hero horizon chart), no charting library
- **Analytics** — Umami v3 (self-hosted on Railway)
- **Internationalization** — next-i18next (EN / DE)
- **APIs** — see Data sources section below
---
## Data sources

| Endpoint | Primary | Fallback 1 | Fallback 2 |
|---|---|---|---|
| `/api/price` | CoinGecko Demo | CoinMarketCap | CryptoCompare |
| `/api/fear-greed` | CoinMarketCap | Alternative.me | — |
| `/api/ath` | CoinGecko Demo | Stale cache | Hardcoded fallback |
| `/api/history` | CoinGecko Demo | CryptoCompare | — |
| `/api/btc-history-monthly` | CryptoCompare | Hardcoded fallback | — |

---
## API endpoints
| Endpoint | Description |
|---|---|
| `/api/price` | Live BTC price in EUR and USD |
| `/api/fear-greed` | Fear & Greed Index |
| `/api/ath` | All-time high price |
| `/api/history` | Historical price data (1m / 3m / 1y) |
| `/api/btc-history-monthly` | Monthly BTC prices since 2015 for the What If calculator |
| `/api/visitor-count` | Unique visitor count from Umami v3 |
| `/api/subscriber-count` | Email subscriber count |
| `/api/subscribe` | Handles email subscription (POST) |
| `/api/sitemap` | XML sitemap |
---
## Local development
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).
---
## Deployment
Deployed on [Railway](https://railway.app) via GitHub. Every push to `main` triggers a new deployment automatically.
```bash
# Environment variables required
COINGECKO_API_KEY=your_coingecko_demo_key_here
CRYPTOCOMPARE_API_KEY=your_key_here
UMAMI_PASSWORD=your_umami_password_here
```
---
## Project structure
```
/pages
  index.tsx                  # Serves app.html directly via getServerSideProps (200, no redirect)
  wann-bitcoin-kaufen.tsx    # German SEO landing page (SSR, targets "wann bitcoin kaufen")
  /api               # All API route handlers
    price.ts
    fear-greed.ts
    ath.ts
    history.ts
    btc-history-monthly.ts
    visitor-count.ts
    subscriber-count.ts
    subscribe.ts
    sitemap.ts
/public
  app.html           # Main frontend (single page)
  Bitcoin.svg        # Favicon and email avatar
  social-image.png   # OG image
  manifest.json
  robots.txt
next.config.js
next-i18next.config.js
```
---
## SEO
- **German landing page** at `/wann-bitcoin-kaufen` — purpose-built SSR page targeting "wann bitcoin kaufen" and related DACH queries. Uses `getServerSideProps` to fetch live signal data server-side so Google can index it. Includes FAQPage schema markup, hreflang tags, mobile sticky bar, and a footer link from `app.html` (visible only in DE language mode). Submitted to Google Search Console.
- **Sitemap** at `/sitemap.xml` includes both the homepage and the German SEO page (priority 0.9, daily changefreq)
- **hreflang** configured across homepage, SEO page, and sitemap — homepage points German users to `/?lang=de`, SEO page has its own de/en/x-default triangle
- **Glossary pages** (`/200-tage-durchschnitt-bitcoin`, `/fear-and-greed-index-bitcoin`) deferred pending keyword volume validation

---
## Notes
- `app.html` is edited directly via the GitHub web editor and served via a Next.js `getServerSideProps` in `index.tsx` — no redirect, URL stays clean at `whentobuybtc.xyz/`
- CoinGecko Demo API key is passed as `x_cg_demo_api_key` query param — if env var is missing, falls back to keyless request gracefully
- Umami v3 returns visitor stats as plain numbers (e.g. `stats.visitors`), not as `{value, prev}` objects
- Railway container restarts resolve simultaneous API timeout errors (`UND_ERR_CONNECT_TIMEOUT`) across multiple external APIs
---
Built by [Imo Babics](https://imobabics.com) · Not financial advice
