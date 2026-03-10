# Satoshi Assistant - Bitcoin Price Tracker

A cutting-edge Bitcoin educational and price tracking web application that delivers real-time financial insights through an immersive, multilingual user experience focused on beginner-friendly cryptocurrency education.

## Features

- **Real-time Bitcoin Price Tracking** - Live USD/EUR prices with 30-second updates
- **Interactive Price Charts** - Historical data visualization with smooth animations
- **Market Insights** - 24 different contextual messages based on market conditions
- **Educational Content** - Rotating Bitcoin tips throughout the day
- **Multi-language Support** - English, German, Italian, and French
- **Responsive Design** - Optimized for mobile and desktop users
- **Triple API Redundancy** - CoinGecko → CoinMarketCap → CryptoCompare fallback

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS with custom animations
- **Data Fetching**: SWR with automatic revalidation
- **Internationalization**: next-i18next
- **Charts**: Recharts library
- **APIs**: CoinGecko, CoinMarketCap, CryptoCompare

## Deployment

### Railway Deployment

1. **Create Railway Project**
   - Connect your GitHub repository
   - Railway will automatically detect the Next.js app

2. **Environment Variables**
   ```
   NODE_ENV=production
   ```

3. **Automatic Deployment**
   - Every push to main branch triggers new deployment
   - Built-in SSL certificates and global CDN

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## API Rate Limits

The app uses free APIs with built-in fallback logic:
- CoinGecko (primary) - 30 calls/minute
- CoinMarketCap (fallback) - 333 calls/month  
- CryptoCompare (fallback) - 250,000 calls/month

## License

MIT License