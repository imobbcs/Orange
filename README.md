# When to Buy BTC

A free Bitcoin market signal for long-term thinkers. Combines Fear & Greed, the 200-day moving average, and ATH distance into one clear signal. No noise. No trading advice.

🌐 [whentobuybtc.xyz](https://whentobuybtc.xyz)

---

## What it does

- **Live Bitcoin signal** — Accumulate / Hold / Caution, updated in real time
- **Three indicators** — Fear & Greed Index, 200-day moving average, distance from ATH
- **Live price** — EUR/USD with automatic currency detection by location
- **Price chart** — 1M / 3M / 1Y historical chart with 200-day MA overlay
- **"What if?" calculator** — Shows what daily habits (coffee, cigarettes, etc.) would be worth if invested in Bitcoin monthly since 2015
- **Push notifications** — Opt-in alerts when the signal changes
- **Relai integration** — Direct link to buy Bitcoin via Relai with referral code
- **EN / DE** — English and German language support
- **Cinematic design** — Dark, atmospheric UI with animated celestial sigil, particle field, and grain

---

## Tech stack

- **Framework** — Next.js with TypeScript
- **Frontend** — Single-page `app.html` served via Next.js rewrite
- **Fonts** — Bebas Neue, Cormorant Garamond, DM Mono (Google Fonts)
- **Charts** — Hand-built SVG (habits chart) and Canvas (price chart), no charting library
- **Internationalization** — next-i18next (EN / DE)
- **Push notifications** — OneSignal
- **APIs** — CoinGecko (primary), CryptoCompare (fallback)

---

## API endpoints

| Endpoint | Description |
|---|---|
| `/api/price` | Live BTC price in EUR and USD |
| `/api/fear-greed` | Fear & Greed Index |
| `/api/ath` | All-time high price |
| `/api/history` | Historical price data (1m / 3m / 1y) |
| `/api/btc-history-monthly` | Monthly BTC prices since 2015 for the What If calculator |

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
CRYPTOCOMPARE_API_KEY=your_key_here
```

---

## Project structure

```
/pages
  index.tsx          # Redirects to /app.html
  /api               # All API route handlers
/public
  app.html           # Main frontend (single page)
  social-image.png   # OG image
  sitemap.xml
  robots.txt
next.config.js
next-i18next.config.js
```

---

Built by [Imo Babics](https://imobabics.com) · Not financial advice
