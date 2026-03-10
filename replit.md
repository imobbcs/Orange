# Bitcoin Tracker Project Documentation

## Overview
Satoshi Assistant is a multilingual Bitcoin educational and price tracking platform serving real-time data, market insights, and educational content across EN, FR, DE, and IT languages at whentobuybtc.xyz.

## Recent Changes
- **2025-07-07**: Enhanced Bitcoin chart with multiple timeframes and refined multilingual UI
  - Added 1W, 1M, 3M, 1Y timeframe selection buttons with professional fintech design
  - Changed chart title from "Bitcoin in the last month" to "Bitcoin chart" across all languages
  - Updated API to support dynamic timeframe parameters with proper validation
  - Redesigned timeframe selector with proper dark theme colors (#1f283b background, #e2e8f0 text) and light gray border
  - Added multilingual support for timeframe labels (EN: 1W/1M/3M/1Y, FR: 1S/1M/3M/1A, DE: 1W/1M/3M/1J, IT: 1S/1M/3M/1A)
- **2025-07-07**: Cleaned up sitemap to exclude language-locale mismatched URLs
  - Removed 13 problematic URLs that returned 404 errors due to wrong language-locale combinations
  - Enhanced exclusion list with detailed categorization by mismatch type
  - Improved Google Search Console compatibility by only including valid URLs
- **2025-07-04**: Updated dynamic browser tab titles with enhanced branding and multilingual support
  - Active price: "1 BTC = [price] | Satoshi Assistant | [Smart Insights in user language]"
  - Loading state: "Satoshi Assistant | [Price Tracker & Insights in user language]"
- **2025-07-04**: Updated meta descriptions across all languages with new messaging emphasizing clarity and jargon-free approach
- **2025-07-04**: Optimized API call frequencies to reduce daily usage by ~74 calls
  - Fear & Greed Index: 4h → 6h (4 calls/day, -2 calls)
  - Bitcoin News: 30min → 1h (24 calls/day, -24 calls)  
  - Price Charts: 10min → 15min (~96 calls/day, -48 calls)
  - ATH data display now shows bold price digits using inline styling
- **2025-07-04**: Added new multilingual blog post "When to Buy Bitcoin?"
  - Created German original: "Wann Bitcoin kaufen?" covering timing strategies and DCA approach
  - Added English version: "When to Buy Bitcoin?" with practical buying strategies
  - Added French version: "Quand acheter du Bitcoin ?" with investment guidance
  - Added Italian version: "Quando comprare Bitcoin?" with long-term approach focus
  - All versions include anti-speculation messaging and beginner-friendly advice
- **2025-07-03**: Added new multilingual blog post "Bitcoin: Who Owns the Most?"
  - Created German original version: "Bitcoin: Wer hat die meisten?"
  - Added English translation: "Bitcoin: Who Owns the Most?"  
  - Added French translation: "Bitcoin : Qui en possède le plus ?"
  - Added Italian translation: "Bitcoin: Chi ne ha di più?"
  - All versions properly formatted with SEO metadata and consistent styling
- **2025-07-03**: Fixed React JSX runtime compatibility issues
  - Updated TypeScript configuration for Next.js 15 compatibility
  - Resolved Next.js dev indicators configuration warnings
  - Successfully restarted development server on port 5000
- **2025-06-25**: Fixed deployment configuration issue
  - Resolved TypeScript compilation errors in price API
  - Updated storage interface to include timestamp for proper caching
  - Fixed Next.js dev indicators configuration warnings
  - Downgraded React 19 to React 18 for Next.js compatibility
  - Completed production build successfully
- **2025-06-25**: Fixed Google Search Console 404 errors by creating missing German blog posts with English-style URLs
- **2025-06-25**: Enhanced sitemap generation with logging and validation to prevent future SEO issues
- **2025-06-25**: Verified all 38 blog posts across 4 languages are properly indexed
- **2025-06-11**: Added "Will Bitcoin Hit $1 Million?" blog post across all 4 languages
- **2025-05-27**: Implemented comprehensive SEO improvements and search engine submission tools

## Project Architecture

### Blog System
- **Content Structure**: 46+ blog posts across 4 languages (EN, FR, DE, IT)
- **URL Strategy**: Supports both localized slugs and English-style URLs for SEO compatibility
- **SEO Integration**: Automatic sitemap generation, structured data, search engine submission
- **Latest Addition**: "When to Sell Bitcoin?" - practical guidance on selling strategies, emotional control, and exit planning across all 4 languages

### API System
- **Price Data**: Triple redundancy (CoinGecko → CoinMarketCap → CryptoCompare)
- **Caching Strategy**: 90s for prices, 30min for news, 4h for Fear & Greed Index
- **Database**: PostgreSQL with Drizzle ORM for persistence

### Key Files
- `pages/api/sitemap.xml.ts`: Dynamic sitemap generation with all blog URLs
- `utils/blog.ts`: Blog post management and URL routing
- `shared/schema.ts`: Database schema definitions
- `server/storage.ts`: Database operations with caching

## User Preferences
- Prefers concise, professional communication
- Values SEO optimization and search engine visibility
- Requires multilingual content consistency
- Expects proactive error prevention
- **Critical**: Multilingual blog posts must be organized correctly:
  - German: `content/blog/de/`
  - English: `content/blog/` (root)
  - French: `content/blog/fr/`
  - Italian: `content/blog/it/`

## Critical Notes
- **URL Mapping**: Always ensure German blog posts have both German slugs AND English-style URLs for Google compatibility
- **Sitemap**: Regenerates hourly with all blog posts automatically included
- **Translation Keys**: All insight messages must have proper variants (_1, _2, _3) across all languages