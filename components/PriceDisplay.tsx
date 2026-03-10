import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import useSWR from 'swr';
import { PriceData } from '../types';

interface ATHData {
  ath_usd: number;
  ath_eur: number;
  ath_date: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PriceDisplayProps {
  className?: string;
}

export default function PriceDisplay({ className }: PriceDisplayProps = {}) {
  const { t } = useTranslation('common');
  const { data, error, isLoading } = useSWR<PriceData>('/api/price', fetcher, {
    refreshInterval: 60000, // Refresh every minute
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  // Fetch ATH data separately (cached for 12 hours)
  const { data: athData, error: athError } = useSWR<ATHData>('/api/ath', fetcher, {
    refreshInterval: 12 * 60 * 60 * 1000, // Refresh every 12 hours
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // Debug logging
  console.log('PriceDisplay render:', { data, error, isLoading });

  // Keep last valid prices to prevent showing 0 or null
  const [lastValidPrices, setLastValidPrices] = useState<PriceData | null>(null);
  const [greeting, setGreeting] = useState('Hello!');
  const [isEuropeanUser, setIsEuropeanUser] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good morning!');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Good afternoon!');
    } else if (hour >= 18 && hour < 22) {
      setGreeting('Good evening!');
    } else {
      setGreeting('Hello!');
    }

    // Detect user location to show relevant currency
    const detectLocation = async () => {
      try {
        // Use timezone to detect European users
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const europeanTimezones = [
          'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
          'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Vienna', 'Europe/Zurich', 
          'Europe/Stockholm', 'Europe/Oslo', 'Europe/Copenhagen', 'Europe/Helsinki',
          'Europe/Warsaw', 'Europe/Prague', 'Europe/Budapest', 'Europe/Athens',
          'Europe/Lisbon', 'Europe/Dublin', 'Europe/Luxembourg'
        ];
        
        setIsEuropeanUser(europeanTimezones.includes(timezone));
      } catch (error) {
        // Default to USD if detection fails
        setIsEuropeanUser(false);
      }
    };

    detectLocation();
  }, []);

  // Update last valid prices when we get valid data
  useEffect(() => {
    if (data && data.usd && data.usd > 0) {
      setLastValidPrices(prev => ({
        usd: data.usd,
        eur: data.eur && data.eur > 0 ? data.eur : prev?.eur,
        usd_24h_change: data.usd_24h_change || (prev?.usd_24h_change || 0),
        eur_24h_change: data.eur_24h_change || (prev?.eur_24h_change || 0),
        usd_72h_change: data.usd_72h_change || (prev?.usd_72h_change || 0),
        eur_72h_change: data.eur_72h_change || (prev?.eur_72h_change || 0),
      }));
    }
  }, [data]);

  // Use last valid prices if current data is invalid
  const displayData = (data && data.usd && data.usd > 0) ? data : lastValidPrices;

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-[#475569]">Unable to load Bitcoin price data</p>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F7931A] mx-auto mb-4"></div>
          <p className="text-[#475569]">Loading Bitcoin price...</p>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const calculateATHDistance = (currentPrice: number, athPrice: number) => {
    if (!athPrice || athPrice === 0) return 0;
    return ((currentPrice - athPrice) / athPrice) * 100;
  };

  // Don't render if we don't have any valid price data (including cached)
  if (!displayData || typeof displayData.usd !== 'number' || displayData.usd <= 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F7931A] mx-auto mb-4"></div>
          <p className="text-[#475569]">Loading Bitcoin price...</p>
        </div>
      </div>
    );
  }

  return (
    <section className={`flex flex-col ${className || ''}`}>
      <div className="flex flex-col">
        <div className="bg-bg-tertiary rounded-lg p-4 sm:p-5 md:p-6 lg:p-7 border border-accent-500/20 text-center">
          <p className="text-xs font-medium text-text-quaternary mb-2 tracking-wide uppercase">
            {isEuropeanUser ? t('price.eur') : t('price.usd')}
          </p>
          <p className="font-black text-text-primary tracking-tightest leading-none" style={{ 
            fontWeight: '900',
            fontSize: 'clamp(1.75rem, 4vw, 3.5rem)'
          }}>
            {isEuropeanUser 
              ? (displayData.eur && displayData.eur > 0 ? `€${formatPrice(displayData.eur)}` : 'Loading...')
              : `$${formatPrice(displayData.usd)}`
            }
          </p>
          <div className="mt-3 flex items-center justify-center gap-1">
            <span 
              className="text-sm font-medium"
              style={{ 
                color: (isEuropeanUser ? displayData.eur_24h_change : displayData.usd_24h_change) >= 0 
                  ? '#22c55e' 
                  : '#ef4444'
              }}
            >
              {(isEuropeanUser ? displayData.eur_24h_change : displayData.usd_24h_change) >= 0 ? '↗' : '↘'}
            </span>
            <span 
              className="text-sm font-medium"
              style={{ 
                color: (isEuropeanUser ? displayData.eur_24h_change : displayData.usd_24h_change) >= 0 
                  ? '#22c55e' 
                  : '#ef4444'
              }}
            >
              {Math.abs(isEuropeanUser ? displayData.eur_24h_change : displayData.usd_24h_change).toFixed(2)}%
            </span>
            <span className="text-xs text-text-quaternary" style={{ marginLeft: '0.25rem' }}>in 24h</span>
          </div>

          {/* ATH Information */}
          {athData && (
            <div style={{ marginTop: '19px', paddingTop: '12px' }}>
              <div className="text-sm text-text-secondary leading-relaxed">
                <div className="mb-1">
                  {t('price.ath_highest_ever')}{' '}
                  {isEuropeanUser 
                    ? <>€<span style={{ fontWeight: 'bold' }}>{formatPrice(athData.ath_eur)}</span>.</>
                    : <>$<span style={{ fontWeight: 'bold' }}>{formatPrice(athData.ath_usd)}</span>.</>
                  }
                </div>
                <div className="text-text-quaternary">
                  {(() => {
                    const currentPrice = isEuropeanUser ? displayData.eur : displayData.usd;
                    const athPrice = isEuropeanUser ? athData.ath_eur : athData.ath_usd;
                    const distance = calculateATHDistance(currentPrice || 0, athPrice || 0);
                    
                    if (distance >= -0.1) {
                      return t('price.ath_at_record');
                    } else {
                      return t('price.ath_distance_new_record', { percent: Math.abs(distance).toFixed(0) });
                    }
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
