import type { NextApiRequest, NextApiResponse } from 'next';

let cache: { usd: number; eur: number; usd_24h_change: number; eur_24h_change: number } | null = null;
let cacheTime = 0;
const CACHE_TTL = 90 * 1000; // 90 seconds

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.status(200).json(cache);
  }

  // 1. CoinGecko (free, no key)
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur&include_24hr_change=true',
      {
        headers: { 'User-Agent': 'whentobuybtc.xyz/1.0' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!r.ok) throw new Error(`CoinGecko HTTP ${r.status}`);
    const data = await r.json();
    cache = {
      usd: data.bitcoin.usd,
      eur: data.bitcoin.eur,
      usd_24h_change: data.bitcoin.usd_24h_change,
      eur_24h_change: data.bitcoin.eur_24h_change,
    };
    cacheTime = Date.now();
    return res.status(200).json(cache);
  } catch (err: any) {
    console.error('price CoinGecko error:', err.message);
  }

  // 2. CoinMarketCap fallback
  if (process.env.COINMARKETCAP_API_KEY) {
    try {
      const r = await fetch(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC&convert=USD,EUR',
        {
          headers: {
            'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY,
            'User-Agent': 'whentobuybtc.xyz/1.0',
          },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!r.ok) throw new Error(`CMC HTTP ${r.status}`);
      const data = await r.json();
      const btc = data.data?.BTC?.quote;
      cache = {
        usd: btc?.USD?.price,
        eur: btc?.EUR?.price,
        usd_24h_change: btc?.USD?.percent_change_24h,
        eur_24h_change: btc?.EUR?.percent_change_24h,
      };
      cacheTime = Date.now();
      return res.status(200).json(cache);
    } catch (err: any) {
      console.error('price CMC error:', err.message);
    }
  }

  // 3. CryptoCompare fallback — use pricemultifull to get 24h change
  if (process.env.CRYPTOCOMPARE_API_KEY) {
    try {
      const r = await fetch(
        'https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC&tsyms=USD,EUR',
        {
          headers: { authorization: `Apikey ${process.env.CRYPTOCOMPARE_API_KEY}` },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!r.ok) throw new Error(`CryptoCompare HTTP ${r.status}`);
      const data = await r.json();
      const btc = data.RAW?.BTC;
      cache = {
        usd: btc?.USD?.PRICE,
        eur: btc?.EUR?.PRICE,
        usd_24h_change: btc?.USD?.CHANGEPCT24HOUR ?? 0,
        eur_24h_change: btc?.EUR?.CHANGEPCT24HOUR ?? 0,
      };
      cacheTime = Date.now();
      return res.status(200).json(cache);
    } catch (err: any) {
      console.error('price CryptoCompare error:', err.message);
    }
  }

  if (cache) return res.status(200).json(cache);
  return res.status(503).json({ error: 'Price data temporarily unavailable' });
}
