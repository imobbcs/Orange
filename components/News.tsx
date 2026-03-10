import { useTranslation } from 'next-i18next';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  published_on: number;
  body: string;
}

interface NewsResponse {
  articles: NewsArticle[];
}

interface NewsProps {
  className?: string;
}

export default function News({ className }: NewsProps) {
  const { t } = useTranslation('common');
  const { data, error } = useSWR<NewsResponse>('/api/bitcoin-news', fetcher, {
    refreshInterval: 900000, // Update every 15 minutes
  });

  const formatTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  if (error) {
    return (
      <section className={`h-full flex flex-col justify-center ${className || ''}`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-4 h-4 rounded-full bg-gradient-to-r from-accent-500 to-accent-400 mt-3 shadow-lg shadow-accent-500/30"></div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary mb-4 tracking-tight">Bitcoin News</h3>
            <p className="text-base text-text-secondary">Unable to load news at the moment.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!data || !data.articles || data.articles.length === 0) {
    return (
      <section className={`h-full flex flex-col justify-center ${className || ''}`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-4 h-4 rounded-full bg-gradient-to-r from-accent-500 to-accent-400 mt-3 shadow-lg shadow-accent-500/30"></div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary mb-4 tracking-tight">Bitcoin News</h3>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              <div className="h-4 bg-gray-300 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`h-full flex flex-col justify-start ${className || ''}`}>
      <h3 className="text-lg font-semibold text-text-primary tracking-tight" style={{ marginBottom: '1.25rem' }}>
        Bitcoin News
      </h3>
      
      <div className="space-y-6">
        {data.articles.map((article) => (
          <article key={article.id} style={{ marginBottom: '1rem' }}>
            <a 
              href={article.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block cursor-pointer no-underline news-headline-link"
              style={{ color: 'inherit', textDecoration: 'none', fontWeight: 'normal' }}
            >
              <p className="text-base font-normal text-text-secondary leading-relaxed tracking-normal mb-3 news-headline-text" style={{ fontWeight: 'normal' }}>
                {article.title}
              </p>
            </a>
            
            <div className="flex items-center space-x-3 footer-text">
              <span>{article.source}</span>
              <span> • </span>
              <span>{formatTimeAgo(article.published_on)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}