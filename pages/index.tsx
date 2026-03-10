import { GetStaticProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import PriceDisplay from '../components/PriceDisplay';
import PriceChart from '../components/PriceChart';
import PriceInsights from '../components/PriceInsights';
import News from '../components/News';
import EduInsights from '../components/EduInsights';
import SocialShare from '../components/SocialShare';
import VisitorCounter from '../components/VisitorCounter';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import FAQ from '../components/FAQ';
import BlogPrefetch from '../components/BlogPrefetch';
import useSWR from 'swr';
import { PriceData } from '../types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { data: priceData } = useSWR<PriceData>('/api/price', fetcher, {
    refreshInterval: 60000,
  });

  const currentPrice = priceData?.usd ? `$${Math.round(priceData.usd).toLocaleString()}` : '';
  const dynamicTitle = currentPrice 
    ? `1 BTC = ${currentPrice} | ${t('app.name')} | ${t('app.title_insights')}` 
    : `${t('app.name')} | ${t('app.title_loading')}`;
  const dynamicDescription = t('app.description');
  const socialDescription = t('app.description');

  return (
    <>
      <Head>
        <title>{dynamicTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/bitcoin-logo.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/bitcoin-logo.svg" />
        <link rel="manifest" href="/manifest.json" />
        
        <meta name="description" content={dynamicDescription} />
        <meta name="keywords" content={t('app.keywords')} />
        
        {/* Enhanced Open Graph */}
        <meta property="og:title" content={dynamicTitle} />
        <meta property="og:description" content={socialDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://whentobuybtc.xyz${router.asPath}`} />
        <meta property="og:image" content="https://whentobuybtc.xyz/social-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Is it a good time to buy Bitcoin? - Satoshi Assistant" />
        <meta property="og:site_name" content="Satoshi Assistant" />
        <meta property="og:locale" content={router.locale || 'en'} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={`https://whentobuybtc.xyz${router.asPath}`} />
        
        {/* Hreflang for multilingual homepage */}
        <link rel="alternate" hrefLang="x-default" href="https://whentobuybtc.xyz" />
        <link rel="alternate" hrefLang="en" href="https://whentobuybtc.xyz" />
        <link rel="alternate" hrefLang="fr" href="https://whentobuybtc.xyz/fr" />
        <link rel="alternate" hrefLang="de" href="https://whentobuybtc.xyz/de" />
        <link rel="alternate" hrefLang="it" href="https://whentobuybtc.xyz/it" />
        
        {/* Enhanced Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@whentobuybtc" />
        <meta name="twitter:creator" content="@whentobuybtc" />
        <meta name="twitter:title" content={dynamicTitle} />
        <meta name="twitter:description" content={socialDescription} />
        <meta name="twitter:image" content="https://whentobuybtc.xyz/social-image.png" />
        <meta name="twitter:image:alt" content="Satoshi Assistant - Smart Bitcoin insights and real-time trends" />
        
        {/* Additional SEO Meta Tags */}
        <meta name="application-name" content="Satoshi Assistant" />
        <meta name="apple-mobile-web-app-title" content="Satoshi Assistant" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Performance Hints */}
        <link rel="preload" as="fetch" href="/api/price" crossOrigin="anonymous" />
        <link rel="preload" as="fetch" href="/api/history" crossOrigin="anonymous" />
        <link rel="prefetch" href="/api/fear-greed" />
        <link rel="prefetch" href="/api/bitcoin-news" />
        <link rel="prefetch" href="/blog" />
        <link rel="prefetch" href={`/_next/data/${router.locale === 'en' ? 'development' : router.locale}/blog.json`} />
        
        {/* Icons */}
        <link rel="icon" href="/generated-icon.png" />
        <link rel="apple-touch-icon" href="/generated-icon.png" />
        <link rel="shortcut icon" href="/generated-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": t('app.name'),
              "description": t('app.description'),
              "url": "https://whentobuybtc.xyz",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Any",
              "inLanguage": router.locale || 'en',
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "Real-time Bitcoin price tracking",
                "Multi-currency support (USD/EUR)",
                "Market analysis and insights", 
                "Educational Bitcoin content",
                "Fear & Greed Index integration",
                "Historical price charts",
                "Multi-language support (EN/FR/DE/IT)",
                "Bitcoin news feed",
                "Educational content for beginners"
              ],
              "about": {
                "@type": "Thing",
                "name": "Bitcoin",
                "description": "Bitcoin (BTC) cryptocurrency price tracking and educational resources"
              },
              "mainEntity": {
                "@type": "MonetaryAmount",
                "currency": "USD",
                "value": priceData?.usd || null
              },
              "author": {
                "@type": "Organization",
                "name": "Satoshi Assistant"
              },
              "dateModified": new Date().toISOString(),
              "keywords": "Bitcoin, BTC, cryptocurrency, price tracker, real-time data, market analysis, educational content"
            })
          }}
        />
        
        {priceData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Dataset",
                "name": "Bitcoin Price Data",
                "description": "Real-time Bitcoin price information in USD and EUR",
                "creator": {
                  "@type": "Organization",
                  "name": "Satoshi Assistant"
                },
                "license": "https://creativecommons.org/licenses/by/4.0/",
                "distribution": {
                  "@type": "DataDownload",
                  "encodingFormat": "application/json",
                  "contentUrl": "https://whentobuybtc.xyz/api/price"
                },
                "variableMeasured": [
                  {
                    "@type": "PropertyValue",
                    "name": "Bitcoin Price USD",
                    "value": priceData.usd,
                    "unitText": "USD"
                  },
                  {
                    "@type": "PropertyValue", 
                    "name": "Bitcoin Price EUR",
                    "value": priceData.eur,
                    "unitText": "EUR"
                  },
                  {
                    "@type": "PropertyValue",
                    "name": "24h Price Change",
                    "value": priceData.usd_24h_change,
                    "unitText": "percent"
                  }
                ],
                "dateModified": new Date().toISOString()
              })
            }}
          />
        )}

      </Head>

      <div className="min-h-screen bg-[#0F172A]">
        <Header />
        
        <main className="bento-container">
          {/* Price Display - 1/3 width, first row */}
          <div className="bento-box price-box">
            <PriceDisplay />
          </div>
          
          {/* Price Insights - 2/3 width, first row */}
          <div className="bento-box insights-box">
            <PriceInsights />
          </div>
          
          {/* Chart - full width, second row (3rd priority) */}
          <div className="bento-box chart-box">
            <PriceChart />
          </div>
          
          {/* Bitcoin News - full width, third row */}
          <div className="bento-box news-box">
            <News />
          </div>
          
          {/* Educational Insights - 2/3 width, fourth row */}
          <div className="bento-box education-box">
            <EduInsights />
          </div>
          
          {/* Social Share - 1/3 width, fourth row */}
          <div className="bento-box social-box">
            <SocialShare />
          </div>
        </main>
        
        <FAQ />
        <VisitorCounter />
        <PWAInstallPrompt />
        <BlogPrefetch />
        
        <footer style={{
          textAlign: 'center',
          padding: '2rem 0',
          marginTop: '2rem'
        }}>
          <div style={{
            maxWidth: '64rem',
            margin: '0 auto',
            padding: '0 1.5rem'
          }}>
            <p className="footer-text" style={{
              marginBottom: '0.5rem'
            }} dangerouslySetInnerHTML={{ __html: t('footer.created_by') }}>
            </p>
            <p className="footer-text" style={{
              marginBottom: '0.5rem'
            }}>
              {t('footer.data_source')}
            </p>
            <p className="footer-text" style={{
              marginBottom: '0.5rem'
            }}>
              <a 
                href="/blog" 
                style={{ 
                  color: '#F7931A', 
                  textDecoration: 'none',
                  fontWeight: '500' 
                }}
                onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'}
                onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'}
              >
                Discover our blog →
              </a>
            </p>
            {priceData && (
              <p className="footer-text">
                {t('footer.last_updated')}: {new Date().toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short'
                })}
              </p>
            )}
          </div>
        </footer>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};
