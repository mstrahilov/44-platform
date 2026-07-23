import type { Metadata } from 'next';
import Link from 'next/link';
import { getAppPathUrl, getMarketingUrl } from '@/lib/siteUrl';
import { PUBLIC_RELEASES } from '@/lib/releases';
import marketingStyles from '../landing.module.css';
import styles from './releases.module.css';

const pageTitle = 'Release Notes';
const pageDescription = 'Meaningful updates and improvements to 44OS.';

export const metadata: Metadata = {
  title: `${pageTitle} · 44OS`,
  description: pageDescription,
  alternates: { canonical: `${getMarketingUrl()}/releases` },
  openGraph: {
    title: `${pageTitle} · 44OS`,
    description: pageDescription,
    url: `${getMarketingUrl()}/releases`,
    siteName: '44OS',
    type: 'website',
  },
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export default function MarketingReleasesPage() {
  const marketingUrl = getMarketingUrl();
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${pageTitle} · 44OS`,
    description: pageDescription,
    url: `${marketingUrl}/releases`,
    hasPart: PUBLIC_RELEASES.map(release => ({
      '@type': 'TechArticle',
      headline: `44OS ${release.version}`,
      datePublished: release.publishedAt,
      url: `${marketingUrl}/releases#version-${release.slug}`,
    })),
  }).replace(/</g, '\\u003c');

  return (
    <main className={`${marketingStyles.page} ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <a className={styles.skipLink} href="#release-history">Skip to release history</a>

      <nav className={styles.navigation} aria-label="44OS">
        <div className={styles.navInner}>
          <Link className={styles.brand} href="/" aria-label="44OS by forty four">
            <span className={styles.brandMark}>44OS</span><span>by forty four</span>
          </Link>
          <a className={styles.navButton} href={getAppPathUrl('/')}>Open App</a>
        </div>
      </nav>

      <div id="release-history" className={styles.releaseHistory}>
        {PUBLIC_RELEASES.map((release, index) => (
          <article id={`version-${release.slug}`} className={styles.release} key={release.version}>
            <header className={styles.releaseHeader}>
              <div className={styles.releaseIdentity}>
                <p className={styles.eyebrow}>RELEASE NOTES</p>
                {index === 0
                  ? <h1>44OS {release.version}</h1>
                  : <h2>44OS {release.version}</h2>}
              </div>
              <time dateTime={release.publishedAt}>
                {dateFormatter.format(new Date(`${release.publishedAt}T00:00:00Z`))}
              </time>
            </header>
            <div className={styles.sections}>
              {release.sections.map(section => (
                <section className={styles.section} key={section.title}>
                  <h3>{section.title}</h3>
                  <ul>
                    {section.items.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              ))}
            </div>
          </article>
        ))}
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <nav aria-label="44OS links">
            <Link href="/">About</Link>
            <span aria-hidden="true">·</span>
            <a href={getAppPathUrl('/support')}>Support</a>
            <span aria-hidden="true">·</span>
            <a href="mailto:support@44os.com">Contact</a>
          </nav>
          <div><span className={styles.brandMark}>44OS</span> by forty four</div>
        </div>
      </footer>
    </main>
  );
}
