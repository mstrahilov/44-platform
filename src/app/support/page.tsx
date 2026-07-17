'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageShell, HubHero } from '@/components/Ui';
import { Ui44TextInput } from '@/components/ui44/Inputs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

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
    actions: [{ label: 'Reset Password', href: '/account/recovery' }],
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
      '44OS is launching without customer payments, so no new paid orders can be placed yet.',
      'When purchasing opens, 44-owned merch will be fulfilled by Printful and digital purchases will appear in the buyer Library after verified payment.',
      'Creator merch selling and creator payouts are planned for a future version.',
    ],
    actions: [{ label: 'Open Store', href: '/store' }],
  },
  {
    category: 'Library',
    question: 'What belongs in your Library',
    answer: [
      'Your Library contains music, books, sample packs, and items you saved or purchased.',
      'Free saves unlock streaming or reading where supported. Protected full downloads remain unavailable until purchasing opens.',
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
    question: 'Publish music, books, or sample packs',
    answer: [
      'Approved creators publish and manage music, books, and sample packs from Studio.',
      'Music releases can include v1.0 achievements and Overachiever bonus content. Books and sample packs use their dedicated publishing flows.',
      'Merch is 44-exclusive for this version; creators cannot add or sell merch yet.',
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
    category: 'Policies',
    question: 'Read 44OS policies',
    answer: [
      'Review the Terms of Use, Privacy Policy, and Copyright and Takedowns process before using or publishing through 44OS.',
      'Paid checkout remains unavailable until the payment, fulfillment, tax, and policy gates are approved.',
    ],
    actions: [
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Copyright', href: '/legal/copyright' },
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
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(ARTICLES[0].question);
  const [openCategories, setOpenCategories] = useState<string[]>(['Account & Login']);
  const [caseSubject, setCaseSubject] = useState('');
  const [caseMessage, setCaseMessage] = useState('');
  const [caseSubmitting, setCaseSubmitting] = useState(false);
  const [caseStatus, setCaseStatus] = useState('');
  const [caseError, setCaseError] = useState('');

  const visibleArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return ARTICLES;
    return ARTICLES.filter(article => (
      `${article.category} ${article.question} ${article.answer.join(' ')}`.toLowerCase().includes(normalizedQuery)
    ));
  }, [query]);

  const selectedArticle = visibleArticles.find(article => article.question === selectedQuestion) ?? visibleArticles[0] ?? ARTICLES[0];
  const showCaseForm = selectedArticle.question === 'Escalate to support';

  async function submitSupportCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCaseSubmitting(true);
    setCaseStatus('');
    setCaseError('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sign in before opening a support case.');
      const response = await fetch('/api/email/support', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: caseSubject, message: caseMessage }),
      });
      const payload = await response.json() as { created?: boolean; error?: string };
      if (!response.ok || !payload.created) throw new Error(payload.error || 'The support case could not be recorded.');
      setCaseSubject('');
      setCaseMessage('');
      setCaseStatus('Your support case is recorded. Acknowledgement will be sent when application email delivery is active.');
    } catch (error) {
      setCaseError(error instanceof Error ? error.message : 'The support case could not be recorded.');
    } finally {
      setCaseSubmitting(false);
    }
  }

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
          <Ui44TextInput
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
                <div key={category} className="ui44-disclosure support-sidebar-group">
                  <button
                    type="button"
                    className="ui44-disclosure-trigger support-sidebar-heading"
                    onClick={() => setOpenCategories(current => (
                      current.includes(category)
                        ? current.filter(item => item !== category)
                        : [...current, category]
                    ))}
                    aria-expanded={open}
                    aria-controls={`support-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  >
                    <span>{category}</span>
                    <span aria-hidden="true">{open ? '⌃' : '⌄'}</span>
                  </button>
                  {open && <div id={`support-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="ui44-disclosure-content">{articles.map(article => (
                      <button
                        key={article.question}
                        type="button"
                        className={article.question === selectedArticle.question ? 'support-sidebar-link support-sidebar-link-active' : 'support-sidebar-link'}
                        onClick={() => setSelectedQuestion(article.question)}
                      >
                        {article.question}
                      </button>
                    ))}</div>}
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
            {showCaseForm ? (
              <section className="support-case-intake" aria-labelledby="support-case-title">
                <h3 id="support-case-title">Open a support case</h3>
                {authLoading ? (
                  <p className="os-type-body" role="status">Checking your account…</p>
                ) : user ? (
                  <form className="support-case-form" onSubmit={submitSupportCase}>
                    <label htmlFor="support-case-subject">Subject</label>
                    <Ui44TextInput
                      id="support-case-subject"
                      className="os-input-field"
                      value={caseSubject}
                      onChange={event => setCaseSubject(event.target.value)}
                      minLength={3}
                      maxLength={160}
                      required
                    />
                    <label htmlFor="support-case-message">What happened?</label>
                    <textarea
                      id="support-case-message"
                      value={caseMessage}
                      onChange={event => setCaseMessage(event.target.value)}
                      minLength={1}
                      maxLength={10000}
                      required
                    />
                    <p className="os-type-caption">Include the page, approximate time, and what you expected. Do not include passwords or payment-card details.</p>
                    {caseError ? <p className="ui44-status ui44-status-error" role="alert">{caseError}</p> : null}
                    {caseStatus ? <p className="ui44-status" role="status">{caseStatus}</p> : null}
                    <button type="submit" className="os-button os-button-primary" disabled={caseSubmitting}>
                      {caseSubmitting ? 'Recording…' : 'Open case'}
                    </button>
                  </form>
                ) : (
                  <div className="support-reader-copy">
                    <p className="os-type-body">Sign in to create a durable support case, or email <a href="mailto:support@44os.com">support@44os.com</a> directly.</p>
                    <div className="support-reader-actions"><Link href="/login" className="os-button os-button-primary">Log In</Link></div>
                  </div>
                )}
              </section>
            ) : null}
          </article>
        </section>
      </main>
    </PageShell>
  );
}
