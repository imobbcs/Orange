import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { VisitorData } from '../types';

export default function VisitorCounter() {
  const { t } = useTranslation('common');
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);
  const [hasIncremented, setHasIncremented] = useState(false);

  useEffect(() => {
    const fetchAndIncrementVisitors = async () => {
      try {
        // First, get current count
        const getResponse = await fetch('/api/counter');
        const currentData = await getResponse.json();
        
        // Check if we've already incremented this session
        const sessionKey = 'satoshi_visited';
        const hasVisited = sessionStorage.getItem(sessionKey);
        
        if (!hasVisited && !hasIncremented) {
          // Increment the counter
          const postResponse = await fetch('/api/counter', {
            method: 'POST',
          });
          const newData = await postResponse.json();
          setVisitorData(newData);
          sessionStorage.setItem(sessionKey, 'true');
          setHasIncremented(true);
        } else {
          setVisitorData(currentData);
        }
      } catch (error) {
        console.error('Failed to fetch visitor count:', error);
        // Show a default message if the API fails
        setVisitorData({ count: 0, lastUpdated: new Date().toISOString() });
      }
    };

    fetchAndIncrementVisitors();
  }, [hasIncremented]);

  if (!visitorData) {
    return (
      <div className="card bg-slate-100">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="visitor-counter" style={{ 
      textAlign: 'center', 
      marginBottom: '2rem',
      padding: '0 1.5rem'
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        background: 'rgba(22, 27, 34, 0.5)',
        borderRadius: '2rem',
        border: '1px solid rgba(139, 148, 158, 0.1)'
      }}>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: '#F7931A',
          animation: 'pulse 2s infinite'
        }}></span>
        <span className="caption" style={{ fontWeight: '500' }}>
          {t('visitor.counter').replace('[NUMBER]', visitorData.count.toLocaleString())}
        </span>
      </div>
    </div>
  );
}
