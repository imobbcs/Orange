# Satoshi Assistant - Design System (Updated)

## Typography Standards

### Critical Typography Rules - DO NOT CHANGE

#### Price Values (Smart Currency Display)
- **Font Size**: Responsive with `clamp(1.75rem, 4vw, 3.5rem)` for optimal scaling
- **Font Weight**: `font-black` with `fontWeight: '900'`
- **Tracking**: `tracking-tightest`
- **Leading**: `leading-none`
- **Color**: `text-text-primary`
- **Display Logic**: Shows EUR for European users (timezone-based), USD for others

#### Section Titles (Standardized)
- **Font Size**: `text-lg` (18px equivalent)
- **Font Weight**: `font-semibold`
- **Color**: `text-text-primary`
- **Tracking**: `tracking-tight`
- **Bottom Margin**: `1.25rem` for consistent spacing

#### Educational Content & News Headlines
- **Title**: "Did you know? 🤔" with thinking emoji for engagement
- **Content Font**: `text-base font-normal` for readability (forced with `fontWeight: 'normal'`)
- **Color**: `text-text-secondary`
- **Leading**: `leading-relaxed` for comfortable reading
- **News Headlines**: Identical styling to educational content to maintain consistency

#### Price Change Indicators
- **Colors**: Green (`#22c55e`) for positive, red (`#ef4444`) for negative changes
- **Icons**: ↗ for gains, ↘ for losses
- **Spacing**: `0.25rem` margin between percentage and "in 24h" text
- **Typography**: `text-sm font-medium` matching main currency color

#### Spacing Standards
- **Price Insight to Disclaimer**: 2rem margin with subtle border separator
- **Price Box Padding**: Responsive `p-4 sm:p-5 md:p-6 lg:p-7`
- **News Headlines**: 1rem spacing between items
- **Card Padding**: 1rem (`p-4`)

#### Critical CSS Classes
```css
/* Smart responsive price display */
.price-display-value {
  font-size: clamp(1.75rem, 4vw, 3.5rem);
  font-weight: 900;
  @apply font-black text-text-primary tracking-tightest leading-none;
}

/* Price change indicators */
.price-change-positive {
  color: #22c55e;
}

.price-change-negative {
  color: #ef4444;
}

/* News headlines - consistent with educational content */
.news-headline-text {
  @apply text-base font-normal text-text-secondary leading-relaxed tracking-normal;
  font-weight: normal !important;
}

/* Price insights typography */
.price-insight-text {
  @apply text-6xl font-black text-text-primary tracking-tightest leading-none;
  font-weight: 900;
  margin-bottom: 2rem;
}

/* Disclaimer spacing */
.insight-disclaimer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(139, 148, 158, 0.1);
}
```

## Layout Standards

### Bento Grid System
- Desktop: Language selector aligned with bento boxes
- Mobile: Language selector above page title
- Breakpoint: 480px for mobile layout

### Interactive Elements
- **News Headlines**: Direct clickable links with subtle 1% scale hover animation
- **Language Selector**: Smooth transitions and hover states
- **Chart Interactions**: Hover tooltips and responsive design

### Content Guidelines
- **News Filtering**: Strict Bitcoin-only content, excludes other cryptocurrencies
- **Educational Tips**: Time-based rotation with 15 unique insights
- **Market Sentiment**: Fear & Greed Index with user-friendly explanations

### Color Palette
- **Primary Accent**: #F7931A (Bitcoin Orange) - used for links, buttons, and highlights
- **Secondary Accent**: #e67e22 (Darker orange for gradients)
- **Background**: Dark navy gradient from #0f172a to #0a111f
- **Cards**: Semi-transparent dark with subtle borders
- **Text Primary**: #e2e8f0 (high contrast white)
- **Text Secondary**: #94a3b8 (muted gray)
- **Text Tertiary**: #64748b (subtle gray)
- **Success**: #22c55e (green for positive changes)
- **Error**: #ef4444 (red for negative changes)

## Component Specifications

### PriceDisplay Component (Smart Currency System)
- **Single Currency Display**: Shows EUR for European users, USD for others
- **Geolocation Detection**: Uses timezone to determine user location
- **Responsive Typography**: `clamp(1.75rem, 4vw, 3.5rem)` with `font-weight: 900`
- **24h Change Indicator**: Green/red arrows with percentage and "in 24h" label
- **Responsive Padding**: `p-4 sm:p-5 md:p-6 lg:p-7` for optimal spacing

### PriceInsights Component
- Main insight uses `text-6xl font-black`
- Disclaimer separated with 2rem spacing and border
- Bitcoin orange accent dot indicator

### Social Share Component
- **Share Message**: "Is it a good time to buy Bitcoin? Get smart insights with Satoshi Assistant"
- **Platforms**: Twitter, Facebook, LinkedIn, Telegram, WhatsApp, and Copy Link
- **Professional Image**: 1200x630 optimized for social media
- **Multilingual Support**: Translated messages for all 4 languages

### PWA Install Prompt
- **Mobile-Only Display**: Only appears on mobile devices
- **Smart Detection**: Uses user agent and standalone mode checking
- **Styling**: Bitcoin orange gradient with white install button
- **Session Memory**: Remembers dismissal for current session
- **Proper Sizing**: Fixed 320px max-width card at bottom of screen

### Visitor Counter
- **Minimal Design**: Small, unobtrusive display
- **Database Backed**: PostgreSQL storage for accurate counts
- **Real-time Updates**: Increments on each unique visit

## Technical Specifications

### API Architecture
- **Primary API**: CoinGecko (unlimited free calls)
- **Secondary API**: CoinMarketCap (reduced usage ~70% fewer calls)
- **Fallback API**: CryptoCompare (emergency backup ~90% fewer calls)
- **Triple Redundancy**: Ensures 99.9% uptime for price data

### Database Optimization
- **Price Cache**: 90 seconds for real-time data
- **News Cache**: 30 minutes for article freshness
- **Fear & Greed Cache**: 4 hours for sentiment data
- **Visitor Tracking**: Real-time PostgreSQL updates

### SEO Implementation
- **Structured Data**: JSON-LD with Creative Commons license
- **Sitemap**: XML format with ISO dates for all 4 languages
- **Meta Tags**: Dynamic per-page optimization
- **Social Sharing**: Open Graph 1200x630 images

### PWA Features
- **Manifest**: Complete with shortcuts and categories
- **Service Worker Ready**: Offline capability prepared
- **Install Prompt**: Mobile-optimized with smart detection
- **Icons**: SVG and ICO format support

### Performance Features
- **Mobile Viewport**: Fixed CSS to prevent white space scrolling
- **Image Optimization**: Social sharing images optimized
- **Caching Strategy**: Multi-layer caching for optimal speed
- **Code Splitting**: Blog and main app separated

## Development Guidelines

1. **Smart Currency Display**: Always show single currency based on user timezone (EUR for Europe, USD for others)
2. **Responsive Typography**: Use `clamp(1.75rem, 4vw, 3.5rem)` for price values to ensure optimal scaling
3. **Maintain consistent spacing** between sections (2rem standard)
4. **Preserve visual hierarchy** with proper font weights and sizes
5. **Test on mobile** to ensure responsive behavior across all screen sizes
6. **Keep accent colors** unified across all interactive elements
7. **Force font-weight normal** for news headlines to match educational content

## Testing Checklist

Before any typography changes:
- [ ] Price values use responsive `clamp(1.75rem, 4vw, 3.5rem)` sizing
- [ ] Smart currency detection shows correct currency for user location
- [ ] Price change indicators display correct colors (green/red)
- [ ] News headlines match educational content styling (font-weight: normal)
- [ ] Spacing between price value and change indicator is optimal
- [ ] Visual hierarchy is maintained across all screen sizes
- [ ] Mobile responsiveness works on narrow screens (Surface Duo)
- [ ] Font weights are consistent (900 for price values)

---

**Last Updated**: May 26, 2025
**Critical Elements**: Smart Currency Display, Responsive Typography, Visual Consistency