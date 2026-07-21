import Image from 'next/image';
import { getAppPathUrl, getMarketingUrl } from '@/lib/siteUrl';
import { StandaloneMigrationNotice } from '@/components/marketing/StandaloneMigrationNotice';
import styles from './landing.module.css';

const features = [
  {
    eyebrow: 'THE STORE',
    title: 'Discover something new.',
    body: 'Browse music, books, merch, and creative assets from independent creators around the world. Listen to music for free, save your favorites to your library, and buy downloads when you want to support a creator directly. Purchased downloads are yours to keep.',
    image: '/marketing/mockups/store-combined.webp',
    alt: 'The 44OS Discover screen showing independent music releases.',
  },
  {
    eyebrow: 'THE LIBRARY',
    title: "Everything you've collected, in one place.",
    body: "Your library keeps everything you've saved or purchased together. Listen, read, download your purchases, and unlock achievements as you go. It stays synced across your devices, so your collection is ready wherever you sign in.",
    image: '/marketing/mockups/library-combined.webp',
    alt: 'A 44OS Library containing saved independent work.',
  },
  {
    eyebrow: 'THE COMMUNITY',
    title: 'The people behind the work are here too.',
    body: "Ask questions, share what you're working on, and find collaborators. Talk directly with the creators behind the work you enjoy. And make some new friends along the way.",
    image: '/marketing/mockups/community-combined.webp',
    alt: 'The 44OS Community with public posts and replies.',
  },
  {
    eyebrow: 'FOR CREATORS',
    title: 'Publish everything in one place.',
    body: 'Upload music, books, merch, and creative assets. Set your own prices and publish updates from one place. People can follow your work, add it to their libraries, and hear from you directly.\n\nWhen someone buys your work, your earnings are paid to your connected bank account.',
    image: '/marketing/mockups/studio-combined.webp',
    alt: 'The 44OS Studio dashboard for independent creators.',
  },
] as const;

function ProductMockup({ image, alt, priority = false }: {
  image: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className={styles.productMockup}>
      <Image src={image} alt={alt} width={1800} height={1125} sizes="(max-width: 767px) 100vw, 1100px" loading={priority ? 'eager' : 'lazy'} priority={priority} unoptimized />
    </div>
  );
}

export default function MarketingLandingPage() {
  const appUrl = getAppPathUrl('/');
  const marketingUrl = getMarketingUrl();
  const description = 'Music, books, merch, and creative assets from independent artists, all in one place.';
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${marketingUrl}/#website`,
        name: '44OS',
        alternateName: '44 OS',
        url: `${marketingUrl}/`,
        description,
        publisher: { '@id': `${marketingUrl}/#organization` },
        potentialAction: { '@type': 'ViewAction', target: appUrl, name: 'Open 44OS' },
      },
      {
        '@type': 'Organization',
        '@id': `${marketingUrl}/#organization`,
        name: '44OS',
        alternateName: 'forty four',
        url: `${marketingUrl}/`,
        logo: {
          '@type': 'ImageObject',
          url: `${marketingUrl}/icon-512.png`,
          width: 512,
          height: 512,
        },
        email: 'support@44os.com',
      },
    ],
  }).replace(/</g, '\\u003c');
  return (
    <main id="top" className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <nav className={styles.navigation} aria-label="44OS">
        <div className={styles.navInner}>
          <a className={styles.brand} href="#top" aria-label="44OS by forty four, return to top">
            <span className={styles.brandMark}>44OS</span><span>by forty four</span>
          </a>
          <a className={styles.navButton} href={appUrl}>Open App</a>
        </div>
      </nav>

      <StandaloneMigrationNotice appUrl={appUrl} />

      <div id="main-content">
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <h1 id="landing-title">A platform for independent creative work.</h1>
            <p>Music. Books. Merch. Assets. Discover new work and connect with the creators that made it.</p>
            <a className={styles.primaryButton} href={appUrl}>Open App</a>
          </div>
          <div className={styles.heroVisual}>
            <ProductMockup
              image="/marketing/mockups/hero-combined.webp"
              alt="44OS Discover showing new independent music releases."
              priority
            />
          </div>
        </section>

        <div className={styles.features}>
          {features.map((feature, index) => (
            <section className={`${styles.feature} ${index % 2 ? styles.featureReverse : ''}`} key={feature.eyebrow}>
              <div className={styles.featureCopy}>
                <div className={styles.eyebrow}>{feature.eyebrow}</div>
                <h2>{feature.title}</h2>
                {feature.body.split('\n\n').map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              </div>
              <div className={styles.featureVisual}>
                <ProductMockup image={feature.image} alt={feature.alt} />
              </div>
            </section>
          ))}
        </div>

        <section className={styles.radio} aria-labelledby="radio-title">
          <div className={styles.eyebrow}>LIVE NOW</div>
          <h2 id="radio-title">44 Radio is always on.</h2>
          <a href={getAppPathUrl('/radio')}>Listen now</a>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerPrimary}>
          <nav className={styles.footerLinks} aria-label="Community and support">
            <a href={getAppPathUrl('/community')}>Community</a>
            <span aria-hidden="true">·</span>
            <a href={getAppPathUrl('/support')}>Support</a>
            <span aria-hidden="true">·</span>
            <a href="mailto:support@44os.com">Contact</a>
          </nav>
          <div className={styles.footerBrand}><span className={styles.brandMark}>44OS</span> by forty four</div>
          <nav className={styles.legal} aria-label="Legal">
            <a href={getAppPathUrl('/legal/terms')}>Terms</a>
            <span aria-hidden="true">·</span>
            <a href={getAppPathUrl('/legal/privacy')}>Privacy</a>
            <span aria-hidden="true">·</span>
            <a href={getAppPathUrl('/legal/copyright')}>Copyright</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
