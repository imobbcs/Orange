import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.writeHead(302, { Location: '/app.html' });
  res.end();
  return { props: {} };
};

export default function Home() { return null; }
