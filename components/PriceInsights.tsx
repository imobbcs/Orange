import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { PriceData } from '../types';
import { getInsightMessage } from '../utils/insights';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface FearGreedData {
  value: number;
  value_classification: string;
  timestamp: number;
}

interface PriceInsightsProps {
  className?: string;
}

export default function PriceInsights({ className }: PriceInsightsProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { data, error } = useSWR<PriceData>('/api/price', fetcher, {
    refreshInterval: 60000,
  });
  const { data: fearGreedData } = useSWR<FearGreedData>('/api/fear-greed', fetcher, {
    refreshInterval: 300000, // Update every 5 minutes
  });

  if (error || !data) {
    return null;
  }

  const insightKey = getInsightMessage(
    data.usd_24h_change,
    data.usd_72h_change || 0
  );
  const insightMessage = t(insightKey);

  const getFearGreedMessage = () => {
    if (!fearGreedData) return null;
    
    const value = fearGreedData.value;
    const currentLocale = router.locale || 'en';
    
    // Multilingual Fear & Greed messages
    const messages = {
      en: {
        extreme_fear: "Overall, the mood around Bitcoin is very cautious today. 😱",
        fear: "Overall, the mood around Bitcoin is on the cautious side today. 😬",
        greed: "Overall, the mood around Bitcoin is on the optimistic side today. 😊",
        extreme_greed: "Overall, the mood around Bitcoin is very upbeat today. 🚀"
      },
      fr: {
        extreme_fear: "Dans l'ensemble, l'ambiance autour de Bitcoin est très prudente aujourd'hui. 😱",
        fear: "Dans l'ensemble, l'ambiance autour de Bitcoin est plutôt prudente aujourd'hui. 😬",
        greed: "Dans l'ensemble, l'ambiance autour de Bitcoin est plutôt optimiste aujourd'hui. 😊",
        extreme_greed: "Dans l'ensemble, l'ambiance autour de Bitcoin est très positive aujourd'hui. 🚀"
      },
      de: {
        extreme_fear: "Insgesamt ist die Stimmung rund um Bitcoin heute sehr vorsichtig. 😱",
        fear: "Insgesamt ist die Stimmung rund um Bitcoin heute eher vorsichtig. 😬",
        greed: "Insgesamt ist die Stimmung rund um Bitcoin heute eher optimistisch. 😊",
        extreme_greed: "Insgesamt ist die Stimmung rund um Bitcoin heute sehr optimistisch. 🚀"
      },
      it: {
        extreme_fear: "Nel complesso, l'umore intorno a Bitcoin è oggi molto cauto. 😱",
        fear: "Nel complesso, l'umore intorno a Bitcoin è oggi piuttosto cauto. 😬",
        greed: "Nel complesso, l'umore intorno a Bitcoin è oggi piuttosto ottimista. 😊",
        extreme_greed: "Nel complesso, l'umore intorno a Bitcoin è oggi molto positivo. 🚀"
      }
    };
    
    const localeMessages = messages[currentLocale as keyof typeof messages] || messages.en;
    
    if (value >= 0 && value <= 24) {
      return localeMessages.extreme_fear;
    } else if (value >= 25 && value <= 49) {
      return localeMessages.fear;
    } else if (value >= 50 && value <= 74) {
      return localeMessages.greed;
    } else if (value >= 75 && value <= 100) {
      return localeMessages.extreme_greed;
    }
    
    return null;
  };

  const fearGreedMessage = getFearGreedMessage();

  const getInsightIcon = () => {
    if (data.usd_24h_change > 5) return '🚀';
    if (data.usd_24h_change > 0) return '📈';
    if (data.usd_24h_change > -5) return '📉';
    return '🔻';
  };

  const getInsightColor = () => {
    if (data.usd_24h_change > 2) return 'border-green-200 bg-green-50';
    if (data.usd_24h_change > -2) return 'border-yellow-200 bg-yellow-50';
    return 'border-red-200 bg-red-50';
  };

  return (
    <section className={`h-full flex flex-col justify-center ${className || ''}`}>
      <h3 className="text-lg font-semibold text-text-primary tracking-tight" style={{ marginBottom: '1.25rem' }}>{t('insights.title')}</h3>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-4 h-4 rounded-full bg-gradient-to-r from-accent-500 to-accent-400 mt-3 shadow-lg shadow-accent-500/30"></div>
        <div className="flex-1">
          <p className="text-6xl font-black text-text-primary tracking-tightest leading-none" style={{ 
            fontWeight: '900',
            marginBottom: fearGreedMessage ? '1rem' : '2rem'
          }}>
            {insightMessage}
          </p>
          
          {fearGreedMessage && (
            <p className="text-6xl font-black text-text-primary tracking-tightest leading-none" style={{
              fontWeight: '900',
              marginBottom: '2rem'
            }}>
              {fearGreedMessage}
            </p>
          )}
          
          <p className="footer-text" style={{
            marginTop: '1rem'
          }}>
            {t('insights.disclaimer')}
          </p>
        </div>
      </div>
    </section>
  );
}
