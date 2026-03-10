import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function BlogPrefetch() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch blog pages after initial load
    const prefetchTimer = setTimeout(() => {
      router.prefetch('/blog');
      
      // Prefetch a few popular blog articles
      const popularSlugs = [
        'bitcoin-beginner-mistakes',
        'bitcoin-vs-altcoins', 
        'fear-greed-index',
        'bitcoin-volatility-explained'
      ];
      
      popularSlugs.forEach(slug => {
        router.prefetch(`/blog/${slug}`);
      });
    }, 2000); // Prefetch after 2 seconds to not interfere with initial load

    return () => clearTimeout(prefetchTimer);
  }, [router]);

  return null; // This component renders nothing
}