'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageShell, HubHero } from '@/components/Ui';

type SupportArticle = {
  category: string;
  question: string;
  answer: string[];
  actions?: Array<{ label: string; href: string }>;
};

const ARTICLES: SupportArticle[] = [
  {
    category: 'Account & Login',
    question: 'Reset your password',
    answer: [
      'Open the Account section in Settings, then send a reset link to your login email.',
      'Use the newest reset email if you requested more than one. Reset links can expire, so request a fresh one if the link fails.',
      'If the link opens in a different browser than the one you normally use, sign in again there or copy the link into your main browser.',
    ],
    actions: [{ label: 'Open Account Settings', href: '/settings#account' }],
  },
  {
    category: 'Account & Login',
    question: 'You are unexpectedly signed out',
    answer: [
      'Check whether you are using private browsing, clearing browser storage, or opening email links in another browser.',
      'If it keeps happening, include your account email, browser, device, and whether the issue happens in a private window when you contact support.',
    ],
  },
  {
    category: 'Orders',
    question: 'Find merch and item orders',
    answer: [
      'Digital items appear in your Library after purchase or save.',
      'Merch orders are fulfilled by the creator. Creators manage paid local-fulfillment orders from Studio orders.',
      'If an order looks wrong, include the item name, buyer email, creator name, and checkout time when contacting support.',
    ],
    actions: [{ label: 'Open Orders', href: '/studio/orders' }],
  },
  {
    category: 'Library',
    question: 'What belongs in your Library',
    answer: [
      'Your Library contains music, books, sample packs, and items you saved or purchased.',
      'Free saves unlock streaming or reading where supported. Paid purchases unlock downloads only when the creator enabled downloadable files.',
      'Removing an item hides it from your Library. Re-adding it should restore the existing Library item.',
    ],
    actions: [{ label: 'Open Library', href: '/library' }],
  },
  {
    category: 'Dock & Settings',
    question: 'Customize the Dock',
    answer: [
      'Open the Appearance section in Settings to switch between Full and Compact Dock mode and select your landing app.',
      'Library, Browse, Community, Radio, Support, and Settings are the signed-in Dock surfaces.',
      'Signed-out visitors see Browse, Community, Radio, Support, and Log In. Search lives in the desktop topbar and mobile Dock.',
    ],
    actions: [{ label: 'Open Dock Settings', href: '/settings#dock' }],
  },
  {
    category: 'Creator Uploads',
    question: 'Publish music, books, sample packs, or merch',
    answer: [
      'Creators publish and manage work from Studio. Use the profile shortcut buttons for fast access to new releases, books, sample packs, and merch.',
      'Music releases can include v1.0 achievements and Overachiever bonus content. Books, sample packs, and merch use their dedicated publishing flows.',
      'Future formats will be added to the same catalog model after the launch foundation is stable.',
    ],
    actions: [{ label: 'Open Studio', href: '/studio' }],
  },
  {
    category: 'Radio',
    question: 'How 44 Radio works',
    answer: [
      '44 Radio uses a shared playlist and timing anchor so listeners join the same current track position.',
      'If Radio shows setup or no playable tracks, the reviewed Radio SQL and playlist entries need to be checked before live data can work.',
      'Click the artwork to open the release, the track title to open the track, or the artist name to open the creator profile.',
    ],
    actions: [{ label: 'Open Radio', href: '/radio' }],
  },
  {
    category: 'Troubleshooting',
    question: 'First steps when something looks wrong',
    answer: [
      'Refresh the page, then try signing out and back in.',
      'Check whether the issue also happens in a private browser window. That helps separate account data from local browser state.',
      'When reporting, include the page URL, what you clicked, what you expected, and a screenshot if possible.',
    ],
  },
  {
    category: 'Contact',
    question: 'Escalate to support',
    answer: [
      'Send a concise description of the issue to support@44os.com.',
      'Include your account email, page URL, affected item/order/profile, and the time the issue happened.',
      'For order issues, include whether you are the buyer or creator.',
    ],
  },
];

const CATEGORIES = Array.from(new Set(ARTICLES.map(article => article.category)));

export default function SupportPage() {
  const [query, setQuery] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(ARTICLES[0].question);
  const [openCategories, setOpenCategories] = useState<string[]>(['Account & Login']);

  const visibleArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return ARTICLES;
    return ARTICLES.filter(article => (
      `${article.category} ${article.question} ${article.answer.join(' ')}`.toLowerCase().includes(normalizedQuery)
    ));
  }, [query]);

  const selectedArticle = visibleArticles.find(article => article.question === selectedQuestion) ?? visibleArticles[0] ?? ARTICLES[0];

  return (
    <PageShell>
      <main className="app-page">
        <HubHero title="Support" copy="Find help for account access, orders, Library, Dock settings, Radio, creator tools, and troubleshooting." />

        <nav className="support-breadcrumbs" aria-label="Support path">
          <span>Home</span>
          <span aria-hidden="true">›</span>
          <span>{selectedArticle.category}</span>
          <span aria-hidden="true">›</span>
          <span>{selectedArticle.question}</span>
        </nav>

        <form className="support-search" role="search" onSubmit={event => event.preventDefault()}>
          <input
            className="os-input-field"
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search support"
            aria-label="Search support"
          />
        </form>

        <section className="support-layout" aria-label="Support articles">
          <aside className="support-sidebar">
            {CATEGORIES.map(category => {
              const articles = visibleArticles.filter(article => article.category === category);
              if (!articles.length) return null;
              const open = openCategories.includes(category) || articles.some(article => article.question === selectedArticle.question);
              return (
                <div key={category} className="support-sidebar-group">
                  <button
                    type="button"
                    className="support-sidebar-heading"
                    onClick={() => setOpenCategories(current => (
                      current.includes(category)
                        ? current.filter(item => item !== category)
                        : [...current, category]
                    ))}
                    aria-expanded={open}
                  >
                    <span>{category}</span>
                    <span aria-hidden="true">{open ? '⌃' : '⌄'}</span>
                  </button>
                  {open && articles.map(article => (
                      <button
                        key={article.question}
                        type="button"
                        className={article.question === selectedArticle.question ? 'support-sidebar-link support-sidebar-link-active' : 'support-sidebar-link'}
                        onClick={() => setSelectedQuestion(article.question)}
                      >
                        {article.question}
                      </button>
                    ))}
                </div>
              );
            })}
          </aside>

          <article className="support-reader">
            <div className="os-type-eyebrow">{selectedArticle.category}</div>
            <h2 className="os-type-page-title">{selectedArticle.question}</h2>
            <div className="support-reader-copy">
              {selectedArticle.answer.map(paragraph => (
                <p key={paragraph} className="os-type-body">{paragraph}</p>
              ))}
            </div>
            {selectedArticle.actions?.length ? (
              <div className="support-reader-actions">
                {selectedArticle.actions.map(action => (
                  <Link key={action.href} href={action.href} className="os-button os-button-primary">
                    {action.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </article>
        </section>
      </main>
    </PageShell>
  );
}
