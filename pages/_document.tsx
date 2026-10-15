import Document, { Html, Head, Main, NextScript } from 'next/document';

// The data pages and /wann-bitcoin-kaufen render through React. The homepage is public/app.html,
// served as-is by pages/index.tsx, so nothing here reaches it.
// Page-specific tags (title, description, robots, author, structured data) live in the page.
class MyDocument extends Document {
  render() {
    const { page, locale } = this.props.__NEXT_DATA__;
    const DE_PAGES = ['/wann-bitcoin-kaufen', '/bitcoin-angst-und-gier-index', '/bitcoin-200-tage-linie', '/bitcoin-sparplan-rechner'];
    const lang = DE_PAGES.includes(page) ? 'de' : locale || 'en';
    return (
      <Html lang={lang}>
        <Head>
          <meta name="theme-color" content="#F7931A" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <link rel="manifest" href="/manifest.json" />
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
