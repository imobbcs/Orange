import { NextApiRequest, NextApiResponse } from 'next';
import { PriceData } from '../../types';
import { storage } from '../../server/storage';

// Backup API functions
async function fetchFromCoinMarketCap(): Promise<PriceData | null> {
  try {
    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC&convert=USD,EUR',
      {
        headers: {
          'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY!,
        },
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const btcData = data.data.BTC;
    
    // Validate EUR and USD data exists
    if (!btcData.quote.USD || !btcData.quote.EUR) {
      console.error('CoinMarketCap: Missing USD or EUR price data');
      return null;
    }
    
    return {
      usd: btcData.quote.USD.price,
      eur: btcData.quote.EUR.price,
      usd_24h_change: btcData.quote.USD.percent_change_24h,
      eur_24h_change: btcData.quote.EUR.percent_change_24h,
      usd_72h_change: btcData.quote.USD.percent_change_7d * (3/7), // Approximate 72h from 7d
      eur_72h_change: btcData.quote.EUR.percent_change_7d * (3/7),
    };
  } catch (error) {
    console.error('CoinMarketCap API error:', error);
    return null;
  }
}

async function fetchFromCryptoCompare(): Promise<PriceData | null> {
  try {
    const currentResponse = await fetch(
      'https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC&tsyms=USD,EUR',
      {
        headers: {
          'Authorization': `Apikey ${process.env.CRYPTOCOMPARE_API_KEY!}`,
        },
      }
    );
    
    if (!currentResponse.ok) return null;
    
    const data = await currentResponse.json();
    const btcData = data.RAW.BTC;
    
    // Validate EUR and USD data exists
    if (!btcData.USD || !btcData.EUR || !btcData.USD.PRICE || !btcData.EUR.PRICE) {
      console.error('CryptoCompare: Missing USD or EUR price data');
      return null;
    }
    
    console.log('CryptoCompare data fetched successfully');
    return {
      usd: btcData.USD.PRICE,
      eur: btcData.EUR.PRICE,
      usd_24h_change: btcData.USD.CHANGEPCT24HOUR,
      eur_24h_change: btcData.EUR.CHANGEPCT24HOUR,
      usd_72h_change: 0, // CryptoCompare doesn't provide 72h data easily
      eur_72h_change: 0,
    };
  } catch (error) {
    console.error('CryptoCompare API error:', error);
    return null;
  }
}

async function fetchFromCoinGecko(): Promise<PriceData | null> {
  try {
    // Current price data using free CoinGecko API
    const currentResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur&include_24hr_change=true'
    );

    if (!currentResponse.ok) {
      console.error('CoinGecko API response:', currentResponse.status, currentResponse.statusText);
      return null;
    }

    const currentData = await currentResponse.json();
    
    // Validate that we have at least USD data
    if (!currentData.bitcoin || !currentData.bitcoin.usd) {
      console.error('CoinGecko: Missing USD price data');
      return null;
    }
    
    // Log if EUR is missing but continue with USD
    if (!currentData.bitcoin.eur) {
      console.warn('CoinGecko: EUR price data missing, continuing with USD only');
    }


    
    console.log('CoinGecko data fetched successfully');

    // Historical data for 72h change calculation
    const historicalResponse = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=3&interval=daily'
    );

    let usd_72h_change = 0;
    let eur_72h_change = 0;
    
    if (historicalResponse.ok) {
      const historicalData = await historicalResponse.json();
      const currentPrice = currentData.bitcoin.usd;
      const price72hAgo = historicalData.prices[0]?.[1] || currentPrice;
      usd_72h_change = ((currentPrice - price72hAgo) / price72hAgo) * 100;

      // EUR 72h change calculation
      const eur72hResponse = await fetch(
        'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=3&interval=daily'
      );
      
      if (eur72hResponse.ok) {
        const eur72hData = await eur72hResponse.json();
        const currentPriceEur = currentData.bitcoin.eur;
        const priceEur72hAgo = eur72hData.prices[0]?.[1] || currentPriceEur;
        eur_72h_change = ((currentPriceEur - priceEur72hAgo) / priceEur72hAgo) * 100;
      }
    }

    return {
      usd: currentData.bitcoin.usd,
      eur: currentData.bitcoin.eur || null, 
      usd_24h_change: currentData.bitcoin.usd_24h_change || 0,
      eur_24h_change: currentData.bitcoin.eur_24h_change || 0,
      usd_72h_change,
      eur_72h_change,
    };
  } catch (error) {
    console.error('CoinGecko API error:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PriceData | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let priceData: PriceData | null = null;
    let sourceUsed = '';

    // First check if we have recent cached data (less than 90 seconds old)
    const cachedData = await storage.getLatestPrice();
    if (cachedData) {
      // Use cached data if it's recent enough to save API calls
      const cacheAge = Date.now() - new Date(cachedData.timestamp || 0).getTime();
      if (cacheAge < 90000) { // 90 seconds
        console.log('Using recent cached data to save API calls');
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json(cachedData);
      }
    }

    // Try CoinGecko first (unlimited free API)
    priceData = await fetchFromCoinGecko();
    if (priceData && priceData.eur) {
      sourceUsed = 'coingecko';
    } else if (priceData) {
      // CoinGecko worked but missing EUR, only then try paid APIs
      console.log('CoinGecko missing EUR data, trying CoinMarketCap');
      const cmcData = await fetchFromCoinMarketCap();
      if (cmcData && cmcData.eur) {
        priceData = cmcData;
        sourceUsed = 'coinmarketcap';
      }
    }
    
    // Only use CryptoCompare as last resort for paid APIs
    if (!priceData) {
      console.log('CoinGecko completely failed, trying CoinMarketCap');
      priceData = await fetchFromCoinMarketCap();
      if (priceData) {
        sourceUsed = 'coinmarketcap';
      } else {
        console.log('CoinMarketCap failed, trying CryptoCompare as last resort');
        priceData = await fetchFromCryptoCompare();
        if (priceData) sourceUsed = 'cryptocompare';
      }
    }
    
    // If all APIs fail, use cached data regardless of age
    if (!priceData && cachedData) {
      console.log('All APIs failed, using cached database data');
      priceData = cachedData;
      sourceUsed = 'database_cache';
    }
    
    // If we still have no data
    if (!priceData) {
      throw new Error('All price APIs failed and no cached data available');
    }

    // Save successful API data to database for future caching
    if (sourceUsed !== 'database_cache') {
      await storage.savePriceData(priceData, sourceUsed);
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    
    res.status(200).json(priceData);
  } catch (error) {
    console.error('Error fetching price data:', error);
    res.status(500).json({ error: 'Failed to fetch price data from all sources' });
  }
}
