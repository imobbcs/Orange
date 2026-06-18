export const getServerSideProps = async ({ res }) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(process.cwd(), 'public', 'app.html'), 'utf8');
  res.end(html);
  return { props: {} };
};

export default function Home() { return null; }
