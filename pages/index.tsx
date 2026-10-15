import { homeHtml } from '../lib/home-html';

export const getServerSideProps = async ({ req, res }) => {
  const { html, etag } = homeHtml();
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    // Live data is fetched client-side, so the shell can sit at the edge briefly
    'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    ETag: etag,
  };
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    res.end();
  } else {
    res.writeHead(200, headers);
    res.end(html);
  }
  return { props: {} };
};

export default function Home() { return null; }
