import type { NextApiRequest, NextApiResponse } from 'next';
import { monthlyAverages } from '../../lib/dca';

const CACHE_TTL = 12 * 60 * 60 * 1000; // monthly averages barely move; refresh twice a day
type Series = Record<string, number>;
let cache: { eur: Series; usd: Series | null; timestamp: number } | null = null;

// EUR monthly averages, used only when CoinGecko is unreachable. 2015-01..2024-09 are
// approximations; 2024-10 onwards are CoinGecko averages.
const FALLBACK: Record<string, number> = {
  '2015-01':240,'2015-02':218,'2015-03':262,'2015-04':218,'2015-05':215,'2015-06':225,
  '2015-07':268,'2015-08':263,'2015-09':211,'2015-10':267,'2015-11':313,'2015-12':384,
  '2016-01':378,'2016-02':355,'2016-03':388,'2016-04':395,'2016-05':433,'2016-06':568,
  '2016-07':580,'2016-08':510,'2016-09':518,'2016-10':533,'2016-11':611,'2016-12':713,
  '2017-01':795,'2017-02':897,'2017-03':940,'2017-04':1080,'2017-05':1630,'2017-06':2220,
  '2017-07':1970,'2017-08':3250,'2017-09':3050,'2017-10':4400,'2017-11':6500,'2017-12':12800,
  '2018-01':10200,'2018-02':7200,'2018-03':6700,'2018-04':6800,'2018-05':6700,'2018-06':5600,
  '2018-07':5800,'2018-08':5500,'2018-09':5400,'2018-10':5500,'2018-11':3800,'2018-12':2950,
  '2019-01':2900,'2019-02':3100,'2019-03':3300,'2019-04':4200,'2019-05':6500,'2019-06':9500,
  '2019-07':8600,'2019-08':8900,'2019-09':7700,'2019-10':7400,'2019-11':6700,'2019-12':6300,
  '2020-01':7500,'2020-02':8300,'2020-03':5200,'2020-04':6500,'2020-05':8100,'2020-06':8500,
  '2020-07':9000,'2020-08':10500,'2020-09':9600,'2020-10':10800,'2020-11':14800,'2020-12':20500,
  '2021-01':27000,'2021-02':38000,'2021-03':46000,'2021-04':47000,'2021-05':39000,'2021-06':28000,
  '2021-07':26000,'2021-08':37000,'2021-09':36000,'2021-10':47000,'2021-11':51000,'2021-12':41000,
  '2022-01':35000,'2022-02':33000,'2022-03':35000,'2022-04':36000,'2022-05':26000,'2022-06':18000,
  '2022-07':18500,'2022-08':19000,'2022-09':17500,'2022-10':17000,'2022-11':14500,'2022-12':13500,
  '2023-01':17500,'2023-02':20500,'2023-03':23000,'2023-04':24500,'2023-05':23500,'2023-06':22000,
  '2023-07':25500,'2023-08':24000,'2023-09':23500,'2023-10':24000,'2023-11':30000,'2023-12':37000,
  '2024-01':37000,'2024-02':43000,'2024-03':56000,'2024-04':54000,'2024-05':55000,'2024-06':55000,
  '2024-07':55000,'2024-08':51000,'2024-09':48000,'2024-10':62982,'2024-11':80772,'2024-12':93897,
  '2025-01':96332,'2025-02':92116,'2025-03':78816,'2025-04':76541,'2025-05':91588,'2025-06':91680,
  '2025-07':98486,'2025-08':98716,'2025-09':96281,'2025-10':98076,'2025-11':83776,'2025-12':75973,
  '2026-01':77371,'2026-02':58481,'2026-03':60053,'2026-04':62769,'2026-05':66842,'2026-06':55201,
  '2026-07':55810,'2026-08':59502,'2026-09':69736,
};

// Full daily history from CoinGecko, averaged per calendar month (lib/dca.ts). Every month
// from 2015 comes from real data; the table above is only for when CoinGecko is down.
async function fetchSeries(currency: 'eur' | 'usd'): Promise<Series> {
  const cgKey = process.env.COINGECKO_API_KEY ? `&x_cg_pro_api_key=${process.env.COINGECKO_API_KEY}` : '';
  const url = `https://pro-api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currency}&days=max&interval=daily${cgKey}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'whentobuybtc.xyz/1.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`CoinGecko ${currency} ${res.status}`);
  const data = await res.json();
  const series = monthlyAverages(data.prices as [number, number][]);
  if (Object.keys(series).length < 100) throw new Error(`CoinGecko ${currency}: too few months`);
  return series;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=3600');

  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return res.status(200).json({ monthly: cache.eur, monthlyUsd: cache.usd, count: Object.keys(cache.eur).length, source: 'coingecko-cached' });
  }

  const [eur, usd] = await Promise.allSettled([fetchSeries('eur'), fetchSeries('usd')]);
  if (eur.status === 'fulfilled') {
    cache = { eur: eur.value, usd: usd.status === 'fulfilled' ? usd.value : null, timestamp: Date.now() };
    return res.status(200).json({ monthly: cache.eur, monthlyUsd: cache.usd, count: Object.keys(cache.eur).length, source: 'coingecko' });
  }
  console.error('btc-history-monthly: CoinGecko failed, serving', cache ? 'stale cache' : 'fallback', (eur as PromiseRejectedResult).reason);
  if (cache) return res.status(200).json({ monthly: cache.eur, monthlyUsd: cache.usd, count: Object.keys(cache.eur).length, source: 'coingecko-stale' });
  return res.status(200).json({ monthly: FALLBACK, monthlyUsd: null, count: Object.keys(FALLBACK).length, source: 'fallback' });
}
