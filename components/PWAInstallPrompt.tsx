import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const { t } = useTranslation('common');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Only show on mobile devices
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      if (isMobile && !isStandalone) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Remember user dismissed for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if user already dismissed or if not available
  if (!showInstallPrompt || sessionStorage.getItem('pwa-install-dismissed') === 'true') {
    return null;
  }

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        right: '16px',
        maxWidth: '320px',
        margin: '0 auto',
        padding: '16px',
        background: 'linear-gradient(135deg, #F7931A 0%, #e67e22 100%)',
        borderRadius: '12px',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
        color: 'white',
        fontSize: '14px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div style={{ flexShrink: 0 }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'white' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            Install Satoshi Assistant
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            Add to your home screen for quick Bitcoin insights!
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleInstallClick}
          style={{
            flex: 1,
            padding: '8px 16px',
            background: 'white',
            color: '#F7931A',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            color: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}