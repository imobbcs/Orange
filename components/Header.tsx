import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { findEquivalentArticle } from '../utils/articleMapping';

interface HeaderProps {
  isBlogPage?: boolean;
}

export default function Header({ isBlogPage = false }: HeaderProps) {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const [timeGreeting, setTimeGreeting] = useState('morning');

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    return 'evening';
  };

  useEffect(() => {
    setTimeGreeting(getTimeBasedGreeting());
  }, []);

  // Update greeting when language changes
  useEffect(() => {
    setTimeGreeting(getTimeBasedGreeting());
  }, [i18n.language]);

  const handleLanguageChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = event.target.value;
    
    // Add loading state for smooth transition
    event.target.style.opacity = '0.7';
    event.target.style.pointerEvents = 'none';
    
    try {
      // If on a blog post page, try to find equivalent article in target language
      if (router.pathname === '/blog/[slug]') {
        const currentSlug = router.query.slug as string;
        const equivalentSlug = findEquivalentArticle(currentSlug, newLocale);
        
        if (equivalentSlug) {
          // Navigate to equivalent article in new language
          await router.push('/blog/[slug]', `/blog/${equivalentSlug}`, { 
            locale: newLocale,
            shallow: false
          });
        } else {
          // Fallback to blog index if no equivalent found
          await router.push('/blog', '/blog', { 
            locale: newLocale,
            shallow: false
          });
        }
      } else {
        // For other pages, navigate normally
        await router.push(router.pathname, router.asPath, { 
          locale: newLocale,
          shallow: false
        });
      }
    } catch (error) {
      console.error('Language switch error:', error);
    } finally {
      // Reset loading state
      event.target.style.opacity = '1';
      event.target.style.pointerEvents = 'auto';
    }
  };

  return (
    <header className="modern-header">
      <div className="header-container">
        {/* Desktop language selector */}
        <div className="language-selector-desktop">
          <div className="select-wrapper">
            <select 
              className="modern-select"
              value={i18n.language} 
              onChange={handleLanguageChange}
            >
              <option value="en">🇺🇸 EN</option>
              <option value="de">🇩🇪 DE</option>
              <option value="it">🇮🇹 IT</option>
              <option value="fr">🇫🇷 FR</option>
            </select>
            <svg className="select-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {/* Mobile language selector - ABOVE title */}
        <div className="language-selector-mobile">
          <div className="select-wrapper">
            <select 
              className="modern-select"
              value={i18n.language} 
              onChange={handleLanguageChange}
            >
              <option value="en">🇺🇸 EN</option>
              <option value="de">🇩🇪 DE</option>
              <option value="it">🇮🇹 IT</option>
              <option value="fr">🇫🇷 FR</option>
            </select>
            <svg className="select-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {/* Main header content */}
        <div className="title-section">
          <img 
            src="/bitcoin-logo.svg" 
            alt="Bitcoin Logo" 
            className="bitcoin-logo"
          />
          <h1 className="main-title text-text-primary">
            {isBlogPage ? 'Satoshi Blog' : 'Satoshi Assistant'}
          </h1>
        </div>
        
        <p className="subtitle text-text-tertiary">
          {isBlogPage ? (
            <>
              {t('blog.description')}
              <br />
              <a 
                href="/" 
                className="text-orange-400 hover:text-orange-300 transition-colors text-sm"
                style={{ color: '#F7931A', textDecoration: 'none' }}
              >
                {t('blog.promo_button')} →
              </a>
            </>
          ) : (
            t(`greetings.${timeGreeting}`)
          )}
        </p>
      </div>
    </header>
  );
}
