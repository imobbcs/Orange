import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { getCurrentTip } from '../utils/insights';

interface EduInsightsProps {
  className?: string;
}

export default function EduInsights({ className }: EduInsightsProps) {
  const { t } = useTranslation('common');
  const [currentTip, setCurrentTip] = useState('');
  
  useEffect(() => {
    const tipKey = getCurrentTip();
    setCurrentTip(t(tipKey));
  }, [t]);

  return (
    <section className={`h-full flex flex-col ${className || ''}`}>
      <h3 className="text-lg font-semibold text-text-primary tracking-tight" style={{ marginBottom: '1.25rem' }}>{t('education.title')}</h3>
      <div className="flex-1 flex items-start">
        <p className="text-base font-normal text-text-secondary leading-relaxed tracking-normal">
          {currentTip}
        </p>
      </div>
    </section>
  );
}
