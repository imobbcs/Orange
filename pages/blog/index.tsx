import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { getAllPosts } from '../../utils/blog';
import type { BlogPost } from '../../utils/blog';
import Header from '../../components/Header';

interface BlogIndexProps {
  posts: BlogPost[];
}

export default function BlogIndex({ posts }: BlogIndexProps) {
  const { t } = useTranslation('common');
  const router = useRouter();

  return (
    <>
      <Head>
        <title>{`${t('blog.title')} - ${t('app.name')}`}</title>
        <meta 
          name="description" 
          content={t('blog.description')} 
        />
        <meta name="keywords" content={t('blog.keywords')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={`https://whentobuybtc.xyz${router.asPath}`} />
        
        {/* Hreflang for multilingual blog index */}
        <link rel="alternate" hrefLang="x-default" href="https://whentobuybtc.xyz/blog" />
        <link rel="alternate" hrefLang="en" href="https://whentobuybtc.xyz/blog" />
        <link rel="alternate" hrefLang="fr" href="https://whentobuybtc.xyz/fr/blog" />
        <link rel="alternate" hrefLang="de" href="https://whentobuybtc.xyz/de/blog" />
        <link rel="alternate" hrefLang="it" href="https://whentobuybtc.xyz/it/blog" />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${t('blog.title')} - ${t('app.name')}`} />
        <meta property="og:description" content={t('blog.description')} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://whentobuybtc.xyz${router.asPath}`} />
        <meta property="og:site_name" content="Satoshi Assistant" />
        <meta property="og:locale" content={router.locale || 'en'} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${t('blog.title')} - ${t('app.name')}`} />
        <meta name="twitter:description" content={t('blog.description')} />
        
        {/* Blog Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Blog",
              "name": `${t('blog.title')} - ${t('app.name')}`,
              "description": t('blog.description'),
              "url": `https://whentobuybtc.xyz${router.asPath}`,
              "inLanguage": router.locale || 'en',
              "publisher": {
                "@type": "Organization",
                "name": "Satoshi Assistant",
                "url": "https://whentobuybtc.xyz"
              },
              "blogPost": posts.map(post => ({
                "@type": "BlogPosting",
                "headline": post.title,
                "description": post.description,
                "url": `https://whentobuybtc.xyz${router.locale === 'en' ? '' : `/${router.locale}`}/blog/${post.slug}`,
                "datePublished": post.date,
                "author": {
                  "@type": "Organization",
                  "name": "Satoshi Assistant"
                }
              }))
            })
          }}
        />
      </Head>

      <div className="min-h-screen bg-[#0F172A]">
        <Header isBlogPage={true} />

        {/* Blog Content */}
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem', marginBottom: '4rem' }}>
          {/* Blog Posts List */}
          <div>
            {posts.map((post, index) => (
              <article key={post.slug} className="bento-box bg-gray-800/40 border border-gray-700/50 hover:border-orange-500/30 transition-all duration-300 group" style={{ marginBottom: index === posts.length - 1 ? '0' : '2rem' }}>
                <div className="flex items-start justify-between gap-8">
                  <div className="flex-grow min-w-0">
                    {/* Date and Title on same line */}
                    <div className="flex items-center gap-4 mb-3">
                      <time className="caption text-gray-400 flex-shrink-0">
                        {new Date(post.date).toLocaleDateString(router.locale || 'en', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </time>
                      <h2 className="heading-lg text-white group-hover:text-orange-400 transition-colors">
                        <Link 
                          href={`/blog/${post.slug}`}
                          className="block"
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {post.title}
                        </Link>
                      </h2>
                    </div>
                    
                    {/* Description */}
                    <p className="body-secondary text-gray-300 leading-relaxed">
                      {post.description}
                    </p>
                  </div>
                  
                  {/* Read More Link */}
                  <div className="flex-shrink-0">
                    <Link 
                      href={`/blog/${post.slug}`}
                      className="caption text-gray-400 hover:text-orange-400 transition-colors whitespace-nowrap"
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {t('blog.read_more')} →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem', marginBottom: '4rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(55, 65, 81, 0.8) 0%, rgba(75, 85, 99, 0.6) 100%)',
            border: '1px solid rgba(247, 147, 26, 0.2)',
            borderRadius: '1rem',
            padding: '2.5rem',
            textAlign: 'center',
            backdropFilter: 'blur(15px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">
                {t('blog.promo_title')}
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed" style={{ marginBottom: '1.2rem' }}>
                {t('blog.promo_description')}
              </p>
              <Link 
                href="/"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #F7931A 0%, #e6851a 100%)',
                  color: 'white',
                  padding: '0.875rem 2rem',
                  borderRadius: '0.75rem',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(247, 147, 26, 0.25)',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(247, 147, 26, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(247, 147, 26, 0.25)';
                }}
              >
                {t('blog.promo_button')} →
              </Link>
            </div>
          </div>
        </div>
        
        <footer style={{
          textAlign: 'center',
          padding: '2rem 0',
          marginTop: '2rem'
        }}>
          <div style={{
            maxWidth: '64rem',
            margin: '0 auto',
            padding: '0 1.5rem'
          }}>
            <p className="footer-text" style={{
              marginBottom: '0.5rem'
            }} dangerouslySetInnerHTML={{ __html: t('footer.created_by') }}>
            </p>
            <p className="footer-text">
              Price data from CoinGecko, chart data from CryptoCompare
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  const posts = getAllPosts(locale ?? 'en');
  
  return {
    props: {
      posts,
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};