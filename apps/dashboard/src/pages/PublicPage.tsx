import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicPage, getPublicContent } from '../api/client.js';
import { useLang } from '../i18n/index.js';
import {
  OrbsBg,
  PublicNav,
  PublicFooter,
  pick,
} from '../components/PublicChrome.js';
import { Markdown } from '../lib/markdown.js';

export default function PublicPage() {
  const { slug = '' } = useParams();
  const { lang } = useLang();
  const page = useQuery({
    queryKey: ['public-page', slug],
    queryFn: () => getPublicPage(slug),
    retry: false,
  });
  const content = useQuery({
    queryKey: ['public-content'],
    queryFn: getPublicContent,
  });

  const title = page.data ? pick(lang, page.data.title) : '';
  const body = page.data ? pick(lang, page.data.body) : '';

  return (
    <div className="relative min-h-screen text-ink overflow-x-hidden flex flex-col">
      <OrbsBg />
      <PublicNav />
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-16">
        {page.isLoading && (
          <div className="h-48 animate-pulse glass rounded-glass" />
        )}
        {page.isError && (
          <div className="glass rounded-glass px-8 py-14 text-center">
            <h1 className="text-[28px] font-extrabold text-ink">
              {lang === 'en' ? 'Page not found' : 'Halaman tidak ditemukan'}
            </h1>
            <p className="text-[14px] text-mut mt-2">
              {lang === 'en'
                ? 'This page does not exist or has moved.'
                : 'Halaman ini tidak ada atau telah dipindahkan.'}
            </p>
            <Link
              to="/"
              className="inline-block mt-6 px-5 py-2.5 text-[13px] font-bold rounded-full text-white bg-grad hover:opacity-90 transition-all"
            >
              {lang === 'en' ? 'Back to home' : 'Kembali ke beranda'}
            </Link>
          </div>
        )}
        {page.data && (
          <script
            type="application/ld+json"
            // Breadcrumb structured data → rich snippet di SERP.
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                  {
                    '@type': 'ListItem',
                    position: 1,
                    name: lang === 'en' ? 'Home' : 'Beranda',
                    item: 'https://docgen.razornez.net/',
                  },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: title,
                    item: `https://docgen.razornez.net/p/${slug}`,
                  },
                ],
              }),
            }}
          />
        )}
        {page.data && (
          <article className="glass rounded-glass px-8 py-10">
            <Link
              to="/"
              className="text-[12.5px] font-medium text-mut hover:text-ink transition-colors"
            >
              ← {lang === 'en' ? 'Home' : 'Beranda'}
            </Link>
            <h1 className="mt-3 text-[34px] font-extrabold tracking-tight">
              <span className="text-grad">{title}</span>
            </h1>
            <div className="mt-4">
              <Markdown text={body} />
            </div>
          </article>
        )}
      </main>
      <PublicFooter content={content.data} />
    </div>
  );
}
