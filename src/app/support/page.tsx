'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { HubHero, PageShell } from '@/components/Ui';
import { Ui44TextInput } from '@/components/ui44/Inputs';
import {
  SUPPORT_ARTICLES,
  SUPPORT_CATEGORIES,
  searchSupportArticles,
  supportArticleHref,
} from '@/lib/supportArticles';

export default function SupportPage() {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim();
  const matches = useMemo(() => searchSupportArticles(normalizedQuery), [normalizedQuery]);
  const popular = SUPPORT_ARTICLES.filter(article => article.popular).slice(0, 6);

  return (
    <PageShell>
      <main className="app-page support-center">
        <HubHero
          title="Support"
          copy="Find clear answers about 44OS accounts, Library, purchases, Merch, Community, and creator tools."
        />

        <section className="support-search-hero" aria-labelledby="support-search-title">
          <h2 id="support-search-title" className="os-type-panel-title">How can we help?</h2>
          <label className="page-search-control support-search ui44-composed-field ui44-composed-field-search">
            <span className="os-icon os-icon-search os-icon-sm" aria-hidden="true" />
            <Ui44TextInput
              surface="bare"
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search help articles"
              aria-label="Search help articles"
            />
          </label>
          <p className="os-type-meta">Try “refund,” “download,” “Creator pricing,” or “reset password.”</p>
        </section>

        {normalizedQuery ? (
          <section className="support-results" aria-live="polite" aria-labelledby="support-results-title">
            <div className="support-section-heading">
              <h2 id="support-results-title" className="os-type-section-title">Search results</h2>
              <span className="os-type-meta">{matches.length} article{matches.length === 1 ? '' : 's'}</span>
            </div>
            {matches.length ? (
              <div className="support-article-list ui44-list-surface ui44-panel ui44-panel-glass ui44-panel-overflow-clip">
                {matches.map(article => (
                  <SupportArticleLink key={article.slug} article={article} />
                ))}
              </div>
            ) : (
              <div className="support-empty ui44-panel ui44-panel-glass">
                <h3>No matching article yet</h3>
                <p>Try fewer words or email Support with the page, account, Item, or order involved.</p>
                <a className="os-button os-button-primary" href="mailto:support@44os.com?subject=44OS%20support%20request">Email Support</a>
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="support-quick" aria-labelledby="support-quick-title">
              <h2 id="support-quick-title" className="os-type-section-title">Quick help</h2>
              <div className="support-quick-grid">
                {popular.map(article => (
                  <Link key={article.slug} href={supportArticleHref(article)} className="support-quick-card ui44-panel ui44-panel-glass">
                    <span className="support-quick-title">{article.title}</span>
                    <span className="os-type-meta">{article.description}</span>
                    <span className="support-card-arrow" aria-hidden="true">›</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="support-categories" aria-labelledby="support-categories-title">
              <h2 id="support-categories-title" className="os-type-section-title">Browse help topics</h2>
              <div className="support-category-grid">
                {SUPPORT_CATEGORIES.map(category => {
                  const articles = SUPPORT_ARTICLES.filter(article => article.category === category.id);
                  return (
                    <section key={category.id} className="support-category-card ui44-panel ui44-panel-glass" aria-labelledby={`support-category-${category.id}`}>
                      <div className="support-category-copy">
                        <h3 id={`support-category-${category.id}`}>{category.title}</h3>
                        <p>{category.description}</p>
                      </div>
                      <ul className="support-category-links">
                        {articles.map(article => (
                          <li key={article.slug}>
                            <Link href={supportArticleHref(article)}>
                              <span>{article.title}</span>
                              <span aria-hidden="true">›</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <section className="support-contact ui44-panel ui44-panel-glass" aria-labelledby="support-contact-title">
          <div>
            <h2 id="support-contact-title" className="os-type-section-title">Still need help?</h2>
            <p className="os-type-body">Email the monitored 44OS Support mailbox. Include useful context, but never send a password, authentication link, or full payment-card details.</p>
          </div>
          <a className="os-button os-button-primary" href="mailto:support@44os.com?subject=44OS%20support%20request">Email Support</a>
        </section>
      </main>
    </PageShell>
  );
}

function SupportArticleLink({ article }: { article: (typeof SUPPORT_ARTICLES)[number] }) {
  const category = SUPPORT_CATEGORIES.find(entry => entry.id === article.category);
  return (
    <Link href={supportArticleHref(article)} className="support-article-row ui44-list-row ui44-list-row-interactive">
      <span className="support-article-row-copy">
        <span className="os-type-eyebrow">{category?.title}</span>
        <span className="support-article-row-title">{article.title}</span>
        <span className="os-type-meta">{article.description}</span>
      </span>
      <span className="support-card-arrow" aria-hidden="true">›</span>
    </Link>
  );
}
