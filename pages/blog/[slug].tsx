import { GetStaticProps, GetStaticPaths } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Header from '../../components/Header';
import { trackEvent } from '../../utils/analytics';
import { getAllPosts, getPostBySlug, markdownToHtml, BlogPost } from '../../utils/blog';

interface BlogPostProps {
  post: BlogPost & { htmlContent: string };
}

export default function BlogPostPage({ post }: BlogPostProps) {
  const { t } = useTranslation('common');
  const router = useRouter();

  useEffect(() => {
    // Track blog post views
    trackEvent('blog_post_view', 'content', post.slug);
  }, [post.slug]);

  return (
    <>
      <Head>
        <title>{`${post.title} - Satoshi Assistant`}</title>
        <meta name="description" content={post.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="keywords" content="Bitcoin, cryptocurrency, education, blockchain, investment, guide" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={`https://whentobuybtc.xyz${router.asPath}`} />
        
        {/* Hreflang for multilingual SEO */}
        <link rel="alternate" hrefLang="x-default" href={`https://whentobuybtc.xyz/blog/${post.slug}`} />
        <link rel="alternate" hrefLang="en" href={`https://whentobuybtc.xyz/blog/${post.slug}`} />
        <link rel="alternate" hrefLang="fr" href={`https://whentobuybtc.xyz/fr/blog/${post.slug}`} />
        <link rel="alternate" hrefLang="de" href={`https://whentobuybtc.xyz/de/blog/${post.slug}`} />
        <link rel="alternate" hrefLang="it" href={`https://whentobuybtc.xyz/it/blog/${post.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://whentobuybtc.xyz${router.asPath}`} />
        <meta property="og:site_name" content="Satoshi Assistant" />
        <meta property="og:locale" content={router.locale || 'en'} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        
        {/* Article meta */}
        <meta property="article:published_time" content={post.date} />
        <meta property="article:modified_time" content={post.date} />
        <meta property="article:author" content="Satoshi Assistant" />
        <meta property="article:section" content="Bitcoin Education" />
        <meta property="article:tag" content="Bitcoin" />
        <meta property="article:tag" content="Cryptocurrency" />
        <meta property="article:tag" content="Education" />
        
        {/* Enhanced Article Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              "headline": post.title,
              "description": post.description,
              "datePublished": post.date,
              "dateModified": post.date,
              "url": `https://whentobuybtc.xyz${router.asPath}`,
              "mainEntityOfPage": `https://whentobuybtc.xyz${router.asPath}`,
              "author": {
                "@type": "Organization",
                "name": "Satoshi Assistant",
                "url": "https://whentobuybtc.xyz"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Satoshi Assistant",
                "url": "https://whentobuybtc.xyz"
              },
              "articleSection": "Bitcoin Education",
              "keywords": ["Bitcoin", "Cryptocurrency", "Education", "Investment", "Blockchain"],
              "inLanguage": router.locale || "en"
            })
          }}
        />
      </Head>

      <div className="min-h-screen bg-[#0F172A]">
        <Header isBlogPage={true} />
        
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem' }}>
          {/* Navigation */}
          <nav style={{ marginBottom: '2rem', paddingTop: '1.5rem' }}>
            <Link href="/blog" className="footer-text hover:text-orange-400 transition-colors" style={{ color: 'inherit', textDecoration: 'none' }}>
              {t('blog.back_to_blog')}
            </Link>
          </nav>

          {/* Article */}
          <article style={{
            backgroundColor: 'rgba(30, 41, 59, 0.4)',
            borderRadius: '1rem',
            border: '1px solid rgba(75, 85, 99, 0.6)',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            marginBottom: '4rem'
          }}>
            {/* Header */}
            <header className="blog-header" style={{
              padding: '3rem 3rem 2.5rem 3rem',
              borderBottom: '1px solid rgba(75, 85, 99, 0.4)',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)'
            }}>
              <time style={{
                display: 'inline-block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#F7931A',
                backgroundColor: 'rgba(247, 147, 26, 0.1)',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                marginBottom: '1.5rem',
                marginTop: '0.5rem'
              }}>
                {new Date(post.date).toLocaleDateString(router.locale || 'en', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
              <h1 className="blog-title" style={{
                fontWeight: '800',
                color: '#FFFFFF',
                marginBottom: '1.5rem',
                lineHeight: '1.2',
                letterSpacing: '-0.025em'
              }}>
                {post.title}
              </h1>
              <p className="blog-description" style={{
                color: '#D1D5DB',
                lineHeight: '1.6',
                maxWidth: '100%'
              }}>
                {post.description}
              </p>
            </header>

            {/* Content */}
            <div className="blog-content-wrapper">
              <div 
                className="blog-content-area"
                dangerouslySetInnerHTML={{ __html: post.htmlContent }}
              />
              
              <style jsx>{`
                /* Responsive layout */
                .blog-header {
                  padding: 3rem 3rem 2.5rem 3rem !important;
                }
                
                .blog-content-wrapper {
                  padding: 3rem;
                }
                
                .blog-title {
                  font-size: 2.5rem;
                }
                
                .blog-description {
                  font-size: 1.25rem;
                }
                
                @media (max-width: 768px) {
                  .blog-header {
                    padding: 2rem 1.5rem;
                  }
                  
                  .blog-content-wrapper {
                    padding: 2rem 1.5rem;
                  }
                  
                  .blog-title {
                    font-size: 1.875rem;
                  }
                  
                  .blog-description {
                    font-size: 1.125rem;
                  }
                }
                
                @media (max-width: 480px) {
                  .blog-header {
                    padding: 1.5rem 1rem;
                  }
                  
                  .blog-content-wrapper {
                    padding: 1.5rem 1rem;
                  }
                  
                  .blog-title {
                    font-size: 1.5rem;
                  }
                  
                  .blog-description {
                    font-size: 1rem;
                  }
                }
                
                /* Content styling */
                .blog-content-area :global(h1:first-child) {
                  display: none;
                }
                
                .blog-content-area :global(h1) {
                  font-size: 2rem;
                  font-weight: 700;
                  color: #E5E7EB;
                  margin: 2.5rem 0 1.25rem 0;
                  line-height: 1.3;
                }
                
                .blog-content-area :global(h2) {
                  font-size: 1.75rem;
                  font-weight: 600;
                  color: #E5E7EB;
                  margin: 2rem 0 1rem 0;
                  line-height: 1.3;
                }
                
                .blog-content-area :global(h3) {
                  font-size: 1.5rem;
                  font-weight: 600;
                  color: #F7931A;
                  margin: 1.75rem 0 0.75rem 0;
                  line-height: 1.4;
                }
                
                .blog-content-area :global(h4) {
                  font-size: 1.25rem;
                  font-weight: 600;
                  color: #E5E7EB;
                  margin: 1.5rem 0 0.75rem 0;
                  line-height: 1.4;
                }
                
                .blog-content-area :global(p) {
                  color: #C9D1D9;
                  font-size: 1.125rem;
                  line-height: 1.7;
                  margin: 1.25rem 0;
                  font-weight: 400;
                }
                
                .blog-content-area :global(ul),
                .blog-content-area :global(ol) {
                  margin: 1.5rem 0;
                  padding-left: 1.5rem;
                }
                
                .blog-content-area :global(li) {
                  color: #C9D1D9;
                  margin: 0.5rem 0;
                  line-height: 1.6;
                  font-size: 1.125rem;
                }
                
                .blog-content-area :global(li::marker) {
                  color: #F7931A;
                }
                
                .blog-content-area :global(strong) {
                  color: #E5E7EB;
                  font-weight: 700;
                }
                
                .blog-content-area :global(em) {
                  color: #F7931A;
                  font-style: italic;
                }
                
                .blog-content-area :global(a) {
                  color: #F7931A;
                  text-decoration: none;
                  font-weight: 600;
                  transition: color 0.2s ease;
                  border-bottom: 1px solid rgba(247, 147, 26, 0.3);
                }
                
                .blog-content-area :global(a:hover) {
                  color: #E6851A;
                  border-bottom-color: #E6851A;
                }
                
                .blog-content-area :global(blockquote) {
                  border-left: 4px solid #F7931A;
                  padding: 1.25rem 1.75rem;
                  margin: 1.75rem 0;
                  background: rgba(247, 147, 26, 0.08);
                  border-radius: 0.5rem;
                  color: #E5E7EB;
                  font-style: italic;
                  font-size: 1.125rem;
                }
                
                .blog-content-area :global(code) {
                  background: rgba(247, 147, 26, 0.1);
                  color: #F7931A;
                  padding: 0.25rem 0.5rem;
                  border-radius: 0.375rem;
                  font-size: 1rem;
                  font-weight: 600;
                }
                
                .blog-content-area :global(pre) {
                  background: rgba(30, 41, 59, 0.8);
                  padding: 1.5rem;
                  border-radius: 0.5rem;
                  overflow-x: auto;
                  margin: 1.5rem 0;
                  border: 1px solid rgba(75, 85, 99, 0.3);
                }
                
                .blog-content-area :global(pre code) {
                  background: none;
                  padding: 0;
                  color: #C9D1D9;
                }
                
                /* Mobile responsive adjustments */
                @media (max-width: 768px) {
                  .blog-content-area :global(h1) {
                    font-size: 1.75rem;
                    margin: 2rem 0 1rem 0;
                  }
                  
                  .blog-content-area :global(h2) {
                    font-size: 1.5rem;
                    margin: 1.75rem 0 0.75rem 0;
                  }
                  
                  .blog-content-area :global(h3) {
                    font-size: 1.25rem;
                    margin: 1.5rem 0 0.5rem 0;
                  }
                  
                  .blog-content-area :global(p) {
                    font-size: 1rem;
                    margin: 1rem 0;
                  }
                  
                  .blog-content-area :global(li) {
                    font-size: 1rem;
                  }
                  
                  .blog-content-area :global(blockquote) {
                    padding: 1rem 1.25rem;
                    margin: 1.25rem 0;
                    font-size: 1rem;
                  }
                  
                  .blog-content-area :global(pre) {
                    padding: 1rem;
                    margin: 1.25rem 0;
                  }
                }
                
                @media (max-width: 480px) {
                  .blog-content-area :global(h1) {
                    font-size: 1.5rem;
                  }
                  
                  .blog-content-area :global(h2) {
                    font-size: 1.25rem;
                  }
                  
                  .blog-content-area :global(h3) {
                    font-size: 1.125rem;
                  }
                  
                  .blog-content-area :global(p) {
                    font-size: 0.95rem;
                    line-height: 1.6;
                  }
                  
                  .blog-content-area :global(li) {
                    font-size: 0.95rem;
                  }
                  
                  .blog-content-area :global(blockquote) {
                    padding: 0.75rem 1rem;
                    font-size: 0.95rem;
                  }
                  
                  .blog-content-area :global(pre) {
                    padding: 0.75rem;
                  }
                }
              `}</style>
            </div>
          </article>

          {/* Bottom CTA */}
          <div style={{ marginTop: '3rem', marginBottom: '4rem' }}>
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
                  ⚡ Try Satoshi Assistant
                </h2>
                <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed" style={{ marginBottom: '1.2rem' }}>
                  Our simple app gives you smart Bitcoin insights to help you make confident decisions.
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
                    const target = e.currentTarget as HTMLAnchorElement;
                    target.style.transform = 'translateY(-2px)';
                    target.style.boxShadow = '0 6px 20px rgba(247, 147, 26, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLAnchorElement;
                    target.style.transform = 'translateY(0)';
                    target.style.boxShadow = '0 4px 15px rgba(247, 147, 26, 0.25)';
                  }}
                >
                  Open Satoshi Assistant →
                </Link>
              </div>
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
            <p className="footer-text" style={{
              marginBottom: '0.5rem'
            }}>
              {t('footer.data_source')}
            </p>
            <p className="footer-text" style={{
              marginBottom: '0.5rem'
            }}>
              <a 
                href="/blog" 
                style={{ 
                  color: '#F7931A', 
                  textDecoration: 'none',
                  fontWeight: '500' 
                }}
                onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'}
                onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'}
              >
                Discover our blog →
              </a>
            </p>
            <p className="footer-text">
              {t('footer.last_updated')}: Jan 27, 06:00 PM EST
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const locales = ['en', 'fr', 'de', 'it'];
  const paths: any[] = [];
  
  // Generate paths for all locales
  locales.forEach(locale => {
    const posts = getAllPosts(locale);
    posts.forEach(post => {
      paths.push({
        params: { slug: post.slug },
        locale: locale
      });
    });
  });

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params, locale }) => {
  const slug = params?.slug as string;
  const post = getPostBySlug(slug, locale ?? 'en');

  if (!post) {
    return {
      notFound: true,
    };
  }

  const htmlContent = await markdownToHtml(post.content);

  return {
    props: {
      post: {
        ...post,
        htmlContent,
      },
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};