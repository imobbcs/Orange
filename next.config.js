// Locale routing only (no translation library): English at /, the old /de routes redirect below.
const i18n = { defaultLocale: 'en', locales: ['en', 'de'], localeDetection: false };
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  i18n,
  poweredByHeader: false,
  compress: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  devIndicators: {
    position: 'bottom-right'
  },
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    '*.replit.dev',
    '*.riker.replit.dev'
  ],
  async redirects() {
    return [
      // Defensive domain → German SEO page (single-hop 301)
      {
        source: '/:path*',
        has: [{ type: 'host', value: '(www\\.)?wannbitcoinkaufen\\.de' }],
        destination: 'https://whentobuybtc.xyz/wann-bitcoin-kaufen',
        permanent: true,
      },
      // www → non-www
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.whentobuybtc.xyz' }],
        destination: 'https://whentobuybtc.xyz/:path*',
        permanent: true,
      },
      // Old German locale routes → German SEO page
      {
        source: '/de',
        destination: '/wann-bitcoin-kaufen',
        permanent: true,
      },
      {
        source: '/de/:path*',
        destination: '/wann-bitcoin-kaufen',
        permanent: true,
      },
      // Old French locale routes → homepage
      {
        source: '/fr',
        destination: '/',
        permanent: true,
      },
      {
        source: '/fr/:path*',
        destination: '/',
        permanent: true,
      },
      // Old Italian locale routes → homepage
      {
        source: '/it',
        destination: '/',
        permanent: true,
      },
      {
        source: '/it/:path*',
        destination: '/',
        permanent: true,
      },
      // Old blog routes → homepage
      {
        source: '/blog',
        destination: '/',
        permanent: true,
      },
      {
        source: '/blog/:path*',
        destination: '/',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/sitemap.xml',
          destination: '/api/sitemap',
        },
      ],
      afterFiles: [
        {
          source: '/',
          destination: '/app.html',
        },
      ],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: '/app.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex',
          },
        ],
      },
      // Email flows and cron endpoints must never be cached (after the /api catch-all: the last matching rule wins per header)
      ...['/api/confirm', '/api/unsubscribe', '/api/subscribe', '/api/check-signal', '/api/weekly-digest', '/api/email-preview'].map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      })),
      {
        source: '/api/visitor-count',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://umami-orange.up.railway.app; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://umami-orange.up.railway.app https://mempool.space; img-src 'self' data:; frame-ancestors 'none';"
          }
        ]
      }
    ];
  },
};
module.exports = nextConfig;
