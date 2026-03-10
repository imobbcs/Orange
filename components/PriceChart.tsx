import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import useSWR from 'swr';
import { AreaChart, Area, Tooltip, ResponsiveContainer, YAxis } from 'recharts';
import { trackEvent } from '../utils/analytics';
import { HistoryData } from '../types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Bitcoin logo component using the updated image
const BitcoinLogo = () => (
  <img 
    src="/bitcoin-logo-new.png" 
    alt="Bitcoin logo" 
    width="20" 
    height="20" 
    style={{ flexShrink: 0, marginLeft: '6px' }}
  />
);

interface PriceChartProps {
  className?: string;
}

// Define timeframes with translation keys
const timeframeConfigs = [
  { key: '1w', translationKey: 'timeframe_1w', days: 7 },
  { key: '1m', translationKey: 'timeframe_1m', days: 30 },
  { key: '3m', translationKey: 'timeframe_3m', days: 90 },
  { key: '1y', translationKey: 'timeframe_1y', days: 365 },
];

export default function PriceChart({ className }: PriceChartProps) {
  const { t } = useTranslation('common');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  
  // Create timeframes with translated labels
  const timeframes = timeframeConfigs.map(config => ({
    ...config,
    label: t(`chart.${config.translationKey}`)
  }));
  
  const { data, error, isLoading } = useSWR<HistoryData>(
    `/api/history?timeframe=${selectedTimeframe}`, 
    fetcher, 
    {
      refreshInterval: 900000, // Refresh every 15 minutes
    }
  );

  const renderTimeframeButtons = () => (
    <div 
      style={{ 
        display: 'inline-flex',
        gap: '4px',
        backgroundColor: '#1f283b',
        padding: '4px',
        borderRadius: '8px',
        border: '1px solid #374151'
      }}
    >
      {timeframes.map((tf) => (
        <button
          key={tf.key}
          onClick={() => {
            setSelectedTimeframe(tf.key);
            trackEvent('chart_timeframe_change', 'user_interaction', tf.key);
          }}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: '500',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            backgroundColor: selectedTimeframe === tf.key ? '#F7931A' : 'transparent',
            color: selectedTimeframe === tf.key ? '#ffffff' : '#e2e8f0'
          }}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );

  if (error) {
    return (
      <section className={`h-full flex flex-col ${className || ''}`}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
          <h3 className="text-lg font-semibold text-text-primary tracking-tight inline-flex items-center">
            Bitcoin chart
            <BitcoinLogo />
          </h3>
          {renderTimeframeButtons()}
        </div>
        <div className="flex-1 bg-[#161B22] rounded-xl p-6 flex items-center justify-center">
          <p className="text-[#8B949E]">{t('chart.error_load')}</p>
        </div>
      </section>
    );
  }

  if (isLoading || !data) {
    return (
      <section className={`h-full flex flex-col ${className || ''}`}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
          <h3 className="text-lg font-semibold text-text-primary tracking-tight inline-flex items-center">
            Bitcoin chart
            <BitcoinLogo />
          </h3>
          {renderTimeframeButtons()}
        </div>
        <div className="flex-1 bg-[#161B22] rounded-xl p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F7931A]"></div>
        </div>
      </section>
    );
  }

  // Process the data
  const cleanData = data.prices
    .map(([timestamp, price]) => ({
      timestamp,
      price: Math.round(price),
      date: new Date(timestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      rawDate: new Date(timestamp)
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  // Calculate Y-axis domain with 2% padding
  const prices = cleanData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.02;
  const yDomain = [Math.max(0, minPrice - padding), maxPrice + padding];

  if (cleanData.length === 0) {
    return (
      <section className={`h-full flex flex-col ${className || ''}`}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
          <h3 className="text-lg font-semibold text-text-primary tracking-tight inline-flex items-center">
            Bitcoin chart
            <BitcoinLogo />
          </h3>
          {renderTimeframeButtons()}
        </div>
        <div className="flex-1 bg-[#161B22] rounded-xl p-6 flex items-center justify-center">
          <p className="text-[#8B949E]">{t('chart.no_data')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`h-full flex flex-col ${className || ''}`}>
      <div className="flex justify-between items-center" style={{ marginBottom: '1.25rem' }}>
        <h3 className="text-lg font-semibold text-text-primary tracking-tight inline-flex items-center">
          Bitcoin chart
          <BitcoinLogo />
        </h3>
        {renderTimeframeButtons()}
      </div>
      <div className="flex-1 bg-[#161B22] rounded-xl p-6" style={{ minHeight: '300px' }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={250}>
          <AreaChart 
            data={cleanData} 
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="bitcoinGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F7931A" stopOpacity={0.2}/>
                <stop offset="100%" stopColor="#F7931A" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <YAxis hide domain={yDomain} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#F7931A"
              strokeWidth={3}
              fill="url(#bitcoinGradient)"
              strokeLinecap="round"
              strokeLinejoin="round"
              animationDuration={2000}
              animationBegin={300}
              dot={false}
              activeDot={{ 
                r: 5, 
                fill: '#F7931A',
                stroke: '#ffffff',
                strokeWidth: 3,
                style: { 
                  filter: 'drop-shadow(0 0 8px rgba(247, 147, 26, 0.8))',
                  transition: 'all 0.2s ease-out'
                }
              }}
              connectNulls={true}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div style={{
                      backgroundColor: 'rgba(13, 17, 23, 0.95)',
                      border: '1px solid rgba(48, 54, 61, 0.8)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(12px)',
                      color: '#E2E8F0',
                      fontSize: '14px',
                      fontWeight: '500',
                      lineHeight: '1.4'
                    }}>
                      <div style={{ 
                        color: '#8B949E', 
                        fontSize: '12px', 
                        marginBottom: '4px',
                        fontWeight: '400'
                      }}>
                        {data.rawDate.toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                      <div style={{ color: '#F7931A', fontWeight: '600' }}>
                        ${data.price.toLocaleString('en-US')}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
              cursor={false}
              animationDuration={150}
              animationEasing="ease-out"
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}