import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HubHero, PageShell } from '@/components/Ui';
import { buildPageMetadata } from '@/lib/metadata';
import {
  SUPPORT_ARTICLES,
  getSupportArticle,
  getSupportCategory,
  supportArticleHref,
} from '@/lib/supportArticles';

type SupportArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SUPPORT_ARTICLES.map(article => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: SupportArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getSupportArticle(slug);
  if (!article) return {};
  return buildPageMetadata({
    title: `${article.title} – Support`,
    description: article.description,
    path: supportArticleHref(article),
  });
}

export default async function SupportArticlePage({ params }: SupportArticlePageProps) {
  const { slug } = await params;
  const article = getSupportArticle(slug);
  if (!article) notFound();
  const category = getSupportCategory(article.category);
  const related = SUPPORT_ARTICLES
    .filter(candidate => candidate.category === article.category && candidate.slug !== article.slug)
    .slice(0, 4);

  return (
    <PageShell>
      <main className="app-page support-article-page">
        <nav className="support-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/support">Support</Link>
          <span aria-hidden="true">›</span>
          {category ? <Link href={`/support#support-category-${category.id}`}>{category.title}</Link> : null}
          <span aria-hidden="true">›</span>
          <span aria-current="page">{article.title}</span>
        </nav>

        <HubHero title={article.title} copy={article.description} />

        <div className="support-article-layout">
          <article className="support-article-document ui44-panel ui44-panel-glass">
            <p className="support-article-intro">{article.description}</p>
            {article.sections.map(section => (
              <section key={section.heading} className="support-article-section">
                <h2>{section.heading}</h2>
                {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                {section.steps?.length ? (
                  <ol>{section.steps.map(step => <li key={step}>{step}</li>)}</ol>
                ) : null}
                {section.bullets?.length ? (
                  <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>
                ) : null}
              </section>
            ))}

            {article.actions?.length ? (
              <div className="support-reader-actions">
                {article.actions.map(action => (
                  action.href.startsWith('mailto:')
                    ? <a key={action.href} href={action.href} className="os-button os-button-primary">{action.label}</a>
                    : <Link key={action.href} href={action.href} className="os-button os-button-primary">{action.label}</Link>
                ))}
              </div>
            ) : null}
          </article>

          <aside className="support-related ui44-panel ui44-panel-glass" aria-labelledby="support-related-title">
            <h2 id="support-related-title">Related help</h2>
            <nav aria-label="Related help articles">
              {related.map(candidate => (
                <Link key={candidate.slug} href={supportArticleHref(candidate)}>
                  <span>{candidate.title}</span>
                  <span aria-hidden="true">›</span>
                </Link>
              ))}
            </nav>
            <Link href="/support" className="os-button os-button-secondary os-button-compact">All help topics</Link>
          </aside>
        </div>
      </main>
    </PageShell>
  );
}
