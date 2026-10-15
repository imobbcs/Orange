import type { GetServerSideProps } from 'next';
import MovingAveragePage from '../components/MovingAveragePage';
import { marketSnapshot, type MarketSnapshot } from '../lib/market-ssr';

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
  return { props: { m: await marketSnapshot(req, { monthly: false }) } };
};

export default function Page({ m }: { m: MarketSnapshot }) {
  return <MovingAveragePage m={m} lang="de" />;
}
