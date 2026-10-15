import Head from 'next/head';

export default function NotFound() {
  return (
    <>
      <Head>
        <title>Page not found | When to Buy BTC</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          padding: '2rem 1rem',
          background: '#09080A',
          color: '#EDE8DE',
          fontFamily: '"DM Mono", ui-monospace, monospace',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6, margin: 0 }}>
          404 · Seite nicht gefunden
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: 400, margin: 0 }}>This page doesn't exist.</h1>
        <nav style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/" style={{ color: '#F7931A' }}>Today's Bitcoin signal →</a>
          <a href="/wann-bitcoin-kaufen" style={{ color: '#F7931A' }}>Wann Bitcoin kaufen →</a>
        </nav>
      </main>
    </>
  );
}
