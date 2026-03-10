import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    const { locale } = this.props.__NEXT_DATA__;
    return (
      <Html lang={locale || 'en'}>
        <Head>
          <meta charSet="utf-8" />
          <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
          <meta name="author" content="Satoshi Assistant" />
          <meta name="generator" content="Next.js" />
          <meta name="theme-color" content="#F7931A" />
          <meta name="msapplication-TileColor" content="#F7931A" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          
          {/* Canonical and Language Alternates */}
          <link rel="canonical" href="https://whentobuybtc.xyz" />
          <link rel="alternate" hrefLang="en" href="https://whentobuybtc.xyz/en" />
          <link rel="alternate" hrefLang="fr" href="https://whentobuybtc.xyz/fr" />
          <link rel="alternate" hrefLang="de" href="https://whentobuybtc.xyz/de" />
          <link rel="alternate" hrefLang="it" href="https://whentobuybtc.xyz/it" />
          <link rel="alternate" hrefLang="x-default" href="https://whentobuybtc.xyz" />
          
          {/* Performance and Resource Hints */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://api.coingecko.com" />
          <link rel="dns-prefetch" href="https://api.coinmarketcap.com" />
          <link rel="dns-prefetch" href="https://api.cryptocompare.com" />
          <link rel="dns-prefetch" href="https://alternative.me" />
          <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" as="style" />
          
          {/* Favicon and App Icons */}
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="icon" type="image/png" href="/favicon.png" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <link rel="manifest" href="/manifest.json" />
          
          {/* Structured Data for Bitcoin Price */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": "Satoshi Assistant - Bitcoin Price Tracker",
                "description": "Real-time Bitcoin price tracking with educational insights and market analysis. Live BTC prices in USD/EUR with historical charts.",
                "url": "https://whentobuybtc.xyz",
                "applicationCategory": "FinanceApplication",
                "operatingSystem": "All",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD"
                },
                "author": {
                  "@type": "Organization",
                  "name": "Satoshi Assistant"
                },
                "dateModified": new Date().toISOString(),
                "inLanguage": ["en", "fr", "de", "it"],
                "keywords": "Bitcoin, BTC, price tracker, cryptocurrency, real-time, market analysis, educational, multilingual"
              })
            }}
          />
          <style jsx global>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            body {
              font-family: 'Inter', sans-serif;
              background: #0F172A;
              color: #E2E8F0;
              line-height: 1.5;
              -webkit-font-smoothing: antialiased;
            }
            
            .card {
              background: #1E2630;
              border: 1px solid #2A303C;
              border-radius: 20px;
              padding: 32px;
              transition: all 0.15s ease;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            
            .card:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              border-color: rgba(247, 147, 26, 0.2);
            }
            
            /* Grid spacing for premium feel */
            .bento-grid {
              display: grid;
              gap: 24px;
            }
            
            @media (min-width: 768px) {
              .bento-grid {
                gap: 28px;
              }
            }
            
            @media (min-width: 1024px) {
              .bento-grid {
                gap: 32px;
              }
            }

          `}</style>
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
