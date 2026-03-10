import { useState } from 'react';
import { useTranslation } from 'next-i18next';

export default function FAQ() {
  const { t } = useTranslation('common');
  const [openItems, setOpenItems] = useState<number[]>([]);

  const faqItems = [
    { key: 'question_1' },
    { key: 'question_2' },
    { key: 'question_3' },
    { key: 'question_4' },
    { key: 'question_5' }
  ];

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="faq-container" style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      marginBottom: '3rem',
      marginTop: '0rem',
      padding: '0 2.5rem'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {faqItems.map((item, index) => (
          <div key={index} style={{
            borderBottom: '1px solid rgba(139, 148, 158, 0.2)',
            paddingTop: '1.5rem',
            paddingBottom: '1.5rem'
          }}>
            <button
              onClick={() => toggleItem(index)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#94A3B8',
                lineHeight: '1.4',
                transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#E2E8F0';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94A3B8';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <span style={{ paddingRight: '1rem' }}>
                {t(`faq.${item.key}`)}
              </span>
              <div style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.3s ease',
                transform: openItems.includes(index) ? 'rotate(45deg)' : 'rotate(0deg)'
              }}>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#F7931A" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
            </button>
            
            <div style={{
              overflow: 'hidden',
              transition: 'max-height 0.3s ease, opacity 0.3s ease',
              maxHeight: openItems.includes(index) ? '500px' : '0',
              opacity: openItems.includes(index) ? 1 : 0
            }}>
              <p style={{
                marginTop: '1rem',
                fontSize: '1rem',
                lineHeight: '1.6',
                color: '#94A3B8',
                paddingRight: '2rem'
              }}>
                {t(`faq.answer_${item.key.split('_')[1]}`)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
