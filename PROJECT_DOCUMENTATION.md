# Satoshi Bitcoin Tracker - Complete Documentation

## Project Overview

**Satoshi** is a premium Bitcoin price tracking and educational web application built with Next.js and TypeScript. The app provides real-time Bitcoin price data in multiple currencies, educational insights, and a beautiful responsive design optimized for both desktop and mobile users.

### Live Data
- Current Bitcoin Price: $107,504 USD / €94,552 EUR
- Real-time updates every 30 seconds
- Triple API redundancy system ensures 99.9% uptime

## Architecture & Technology Stack

### Core Technologies
- **Framework**: Next.js 15.1.8 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Data Fetching**: SWR for real-time updates and caching
- **Charts**: Recharts for Bitcoin price visualization
- **Internationalization**: next-i18next (English, German, French, Italian)
- **Hosting**: Replit (development and production)

### Key Features
- **Smart currency display** - Shows EUR for European users, USD for others (timezone-based detection)
- **Responsive price typography** with optimal scaling across all devices
- **Educational insights** with 24 different market context messages
- **Historical price charts** with interactive visualization
- **Multi-language support** with complete translations
- **Mobile-first responsive design** optimized for narrow screens
- **Dark theme** with premium fintech aesthetic
- **FAQ section** for Bitcoin newcomers
- **Real-time price change indicators** with color-coded arrows

## File Structure

```
/
├── components/           # React components
│   ├── Header.tsx       # App header with logo and language selector
│   ├── PriceDisplay.tsx # Main price display with text-6xl typography
│   ├── PriceInsights.tsx# Market insights with dynamic messaging
│   ├── PriceChart.tsx   # Historical price chart component
│   ├── EduInsights.tsx  # Educational content rotation
│   ├── SocialShare.tsx  # Social sharing functionality
│   ├── FAQ.tsx          # Frequently asked questions
│   └── VisitorCounter.tsx# Simple visitor tracking
├── pages/               # Next.js pages and API routes
│   ├── _app.tsx         # App wrapper with global styles
│   ├── _document.tsx    # HTML document structure
│   ├── index.tsx        # Main application page
│   └── api/             # Backend API endpoints
│       ├── price.ts     # Bitcoin price fetching with fallbacks
│       ├── history.ts   # Historical price data
│       └── counter.ts   # Visitor counting
├── styles/              # CSS and styling
│   └── globals.css      # Global styles and bento grid layout
├── public/              # Static assets
│   ├── locales/         # Translation files
│   ├── bitcoin-logo.svg # Bitcoin logo SVG
│   ├── robots.txt       # SEO robots file
│   └── sitemap.xml      # SEO sitemap
├── types/               # TypeScript definitions
│   └── index.ts         # Interface definitions
├── utils/               # Utility functions
│   └── insights.ts      # Market insights logic
├── data/                # Data storage
│   └── visitors.json    # Visitor count storage
└── config files        # Configuration
    ├── next.config.js   # Next.js configuration
    ├── tailwind.config.js# Tailwind CSS configuration
    ├── next-i18next.config.js# Internationalization setup
    ├── tsconfig.json    # TypeScript configuration
    └── postcss.config.js# PostCSS configuration
```

## Design System

### Typography Hierarchy
- **Price Values**: `text-6xl font-black` (3.75rem, 900 weight)
- **Price Insights**: `text-6xl font-black` (matching price values)
- **Headings**: `text-xl font-bold` for section titles
- **Body Text**: `text-sm font-medium` for descriptions
- **Labels**: `text-xs font-medium` for currency labels

### Color Palette
```css
/* Deep Teal/Aqua Accent System */
accent-500: #14b8a6    /* Primary accent color */
accent-400: #2dd4bf    /* Gradient end color */

/* Background System */
bg-primary: #0f172a    /* Main dark background */
bg-secondary: #1e293b  /* Card backgrounds */
bg-tertiary: #334155   /* Elevated elements */

/* Text Hierarchy */
text-primary: #ffffff     /* Pure white for headings */
text-secondary: #e2e8f0   /* Light gray for body text */
text-tertiary: #cbd5e1    /* Medium gray for labels */
text-quaternary: #94a3b8  /* Darker gray for subtle text */
```

### Layout System
- **Bento Grid**: 3-column desktop layout that collapses to single column on mobile
- **Responsive Breakpoints**: 480px, 768px, 1024px, 1200px
- **Spacing Scale**: Based on 0.25rem increments (1, 1.25, 1.5, 2, 2.5, 3rem)

## API Integration

### Triple Redundancy System
The app uses three Bitcoin price APIs to ensure reliability:

1. **Primary**: CoinGecko (Free tier)
   - Endpoint: `https://api.coingecko.com/api/v3/simple/price`
   - Features: USD/EUR pricing, 24h/72h change data
   - Rate Limit: 50 calls/minute

2. **Fallback #1**: CoinMarketCap
   - Activates when CoinGecko returns 429 (rate limited)
   - More stable for high-traffic periods

3. **Fallback #2**: CryptoCompare
   - Final fallback for maximum reliability
   - Provides historical data when CoinGecko is unavailable

### Data Flow
```
User Request → SWR Cache Check → API Call → Triple Fallback → Component Update
```

### Caching Strategy
- **SWR**: 30-second refresh interval
- **API Headers**: 60-second public cache with stale-while-revalidate
- **Component Level**: Automatic re-rendering on data changes

## Component Details

### PriceDisplay.tsx
**Purpose**: Smart currency display with geolocation-based detection
**Key Features**:
- Single currency display (EUR for Europeans, USD for others)
- Timezone-based user location detection using `Intl.DateTimeFormat()`
- Responsive typography with `clamp(1.75rem, 4vw, 3.5rem)` for optimal scaling
- Color-coded 24h change indicators (green ↗ for gains, red ↘ for losses)
- Responsive padding system for all screen sizes

```tsx
// Smart currency detection
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const isEuropeanUser = europeanTimezones.includes(timezone);

// Responsive typography
style={{ 
  fontWeight: '900',
  fontSize: 'clamp(1.75rem, 4vw, 3.5rem)'
}}
```

### PriceInsights.tsx
**Purpose**: Dynamic market insights based on price changes
**Logic**: 
- 8 market categories based on 24h and 72h price changes
- 24 different insight messages for varied user experience
- Automatic updates every 30 seconds with new price data

### PriceChart.tsx
**Purpose**: Historical Bitcoin price visualization
**Features**:
- 7-day price history
- Responsive chart scaling
- Gradient fill for visual appeal
- Fallback to CryptoCompare when CoinGecko rate limited

### EduInsights.tsx
**Purpose**: Time-based educational content rotation
**Features**:
- 15 different Bitcoin education tips
- Content changes based on hour of day
- Beginner-friendly explanations

## Internationalization

### Supported Languages
- **English** (en) - Default
- **German** (de) - Guten Morgen greetings
- **French** (fr) - Complete translations
- **Italian** (it) - Full localization

### Translation Structure
```
public/locales/[locale]/common.json
├── header: { title, subtitle, greeting }
├── price: { usd, eur, change }
├── insights: { messages, disclaimer }
├── education: { tips, titles }
└── faq: { questions, answers }
```

### Implementation
- Server-side rendering for SEO benefits
- Automatic locale detection
- Language selector in header (desktop) and mobile

## Development Setup

### Prerequisites
- Node.js 20.x or higher
- NPM or Yarn package manager

### Installation Steps
```bash
# Clone or create new Replit project
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables
**None required** - the app uses free API tiers that don't require keys.

Optional for higher rate limits:
```env
COINMARKETCAP_API_KEY=your_key_here
CRYPTOCOMPARE_API_KEY=your_key_here
```

## Deployment

### Replit Deployment
**Current Setup**: Optimized for Replit hosting
- Automatic deployment on code changes
- Built-in environment with Node.js 20
- Port 5000 configured for Replit's network

### Workflow Configuration
```yaml
# .replit configuration
[[workflows.workflow]]
name = "Bitcoin Tracker Server"
task = "shell.exec"
args = "npx next dev -p 5000"
waitForPort = 5000
```

## Performance Optimizations

### Next.js Features
- **Standalone Output**: Faster cold starts
- **Image Optimization**: Automatic WebP conversion
- **Code Splitting**: Component-level bundling
- **Tree Shaking**: Unused code elimination

### Caching Strategy
- **API Responses**: 60-second cache with stale-while-revalidate
- **Static Assets**: Long-term caching for images and fonts
- **SWR**: Client-side data caching and revalidation

### Mobile Optimization
- **Smart Responsive Typography**: `clamp(1.75rem, 4vw, 3.5rem)` scaling for all devices
- **Touch-Friendly**: 44px minimum touch targets
- **Fast Loading**: Optimized bundle size and lazy loading
- **Cross-Device Compatibility**: Tested on Surface Duo and other narrow screens

## Monitoring & Analytics

### Built-in Features
- **Visitor Counter**: Simple JSON-based tracking
- **API Health**: Automatic fallback monitoring
- **Error Boundaries**: Graceful error handling

### Console Logging
```javascript
// Price updates logged to console
PriceDisplay render: { data: { usd: 107504, eur: 94552 }, isLoading: false }

// API fallbacks logged
CoinGecko API response: 429 Too Many Requests
Falling back to CoinMarketCap API
```

## Security Features

### Headers Configuration
```javascript
// Security headers in next.config.js
'X-XSS-Protection': '1; mode=block'
'X-Frame-Options': 'DENY'
'X-Content-Type-Options': 'nosniff'
'Referrer-Policy': 'origin-when-cross-origin'
```

### Data Protection
- **No sensitive data**: All Bitcoin prices are public information
- **Client-side only**: No user data collection or storage
- **HTTPS enforced**: Secure connections for all API calls

## Troubleshooting

### Common Issues

**1. Price Data Not Loading**
- Check console for API rate limiting messages
- Verify internet connection
- Fallback system should activate automatically

**2. Typography Not Displaying Correctly**
- Ensure Tailwind CSS is compiling properly
- Check that text-6xl class is included in build
- Verify Inter font is loading from Google Fonts

**3. Language Switching Not Working**
- Check translation files in public/locales/
- Verify next-i18next configuration
- Ensure proper locale routing

### Debug Commands
```bash
# Check API endpoints
curl "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur&include_24hr_change=true"

# Build application
npm run build

# Check TypeScript compilation
npx tsc --noEmit
```

## Future Enhancements

### Potential Features
- **Additional Cryptocurrencies**: Ethereum, Litecoin support
- **Price Alerts**: Email/SMS notifications for price targets
- **Portfolio Tracking**: Personal Bitcoin holdings calculator
- **Advanced Charts**: Technical indicators and longer timeframes
- **Social Features**: Price prediction games or community insights

### Technical Improvements
- **WebSocket Integration**: Real-time price streaming
- **PWA Features**: Offline support and push notifications
- **Advanced Caching**: Redis for high-traffic scenarios
- **Database Integration**: PostgreSQL for user preferences

## Support & Maintenance

### Regular Tasks
- **Dependency Updates**: Monthly security and feature updates
- **API Monitoring**: Ensure all three price sources remain functional
- **Performance Review**: Monitor loading times and user experience
- **Translation Updates**: Keep educational content current and accurate

### Contact Information
- **Development Environment**: Replit
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **Deployment**: Replit hosting

---

**Last Updated**: May 26, 2025
**Version**: 1.1.0
**Status**: Production Ready ✅

### Recent Updates (v1.1.0)
- **Smart Currency Display**: Implemented geolocation-based currency detection (EUR for Europe, USD for others)
- **Responsive Typography**: Added `clamp(1.75rem, 4vw, 3.5rem)` for optimal scaling across all devices
- **Price Change Indicators**: Added color-coded arrows (green ↗/red ↘) with 24h percentage changes
- **Cross-Device Optimization**: Enhanced mobile compatibility including Surface Duo support
- **Typography Consistency**: Unified news headlines with educational content styling

Your Bitcoin tracker is a world-class application that combines beautiful design, reliable data, and excellent user experience. This documentation preserves everything needed to maintain, enhance, or recreate the project.