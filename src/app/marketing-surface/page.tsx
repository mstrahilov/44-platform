import Image from 'next/image';
import { getAppPathUrl, getMarketingUrl } from '@/lib/siteUrl';
import { StandaloneMigrationNotice } from '@/components/marketing/StandaloneMigrationNotice';
import styles from './landing.module.css';

const features = [
  {
    eyebrow: 'THE STORE',
    title: 'Discover and own the work.',
    body: "Browse music, books, merch, and creative assets from independent artists around the world. When you add something to your library, it's yours. Not rented. Not streamed from somewhere you don't control. Yours.",
    image: '/marketing/discover.webp',
    mobileImage: '/marketing/discover-mobile.webp',
    alt: 'The 44OS Discover screen showing independent music releases.',
  },
  {
    eyebrow: 'THE LIBRARY',
    title: "Everything you've collected, in one place.",
    body: "Your library holds everything you've saved or purchased. Listen, read, download, and unlock achievements as you go. The relationship between you and the work doesn't disappear when you close the tab.",
    image: '/marketing/library.webp',
    mobileImage: '/marketing/library-mobile.webp',
    alt: 'A 44OS Library containing saved independent work.',
  },
  {
    eyebrow: 'THE COMMUNITY',
    title: 'The people behind the work are here too.',
    body: "Ask questions. Share what you're working on. Find collaborators. Talk directly with the creators who made the things in your library. Whether you're making something or just here because you like what's being made, there's a place for you.",
    image: '/marketing/community.webp',
    mobileImage: '/marketing/community-mobile.webp',
    alt: 'The 44OS Community with public posts and replies.',
  },
  {
    eyebrow: 'FOR CREATORS',
    title: 'Publish everything in one place.',
    body: "Upload music, books, merch, and assets. Set your own prices. Keep what you earn. Fans in your library unlock achievements, receive bonus content, and follow your updates directly instead of an algorithm's version of you.\n\nPayouts go directly to your bank account, wherever you are.",
    image: '/marketing/studio.webp',
    mobileImage: '/marketing/studio-mobile.webp',
    alt: 'The 44OS Studio dashboard for independent creators.',
  },
] as const;

function ProductMockup({ desktop, mobile, alt, priority = false }: {
  desktop: string;
  mobile: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className={styles.productMockup}>
      <div className={styles.desktopDevice}>
        <Image src={desktop} alt={alt} width={1280} height={800} sizes="(max-width: 767px) 92vw, 1000px" loading="eager" priority={priority} unoptimized />
      </div>
      <div className={styles.mobileDevice}>
        <Image src={mobile} alt={`${alt} Mobile view.`} width={390} height={844} sizes="(max-width: 767px) 34vw, 260px" loading="eager" priority={priority} unoptimized />
      </div>
    </div>
  );
}

export default function MarketingLandingPage() {
  const appUrl = getAppPathUrl('/');
  const marketingUrl = getMarketingUrl();
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '44OS',
    url: `${marketingUrl}/`,
    publisher: { '@type': 'Organization', name: 'forty four', url: `${marketingUrl}/` },
    potentialAction: { '@type': 'ViewAction', target: appUrl, name: 'Open 44OS' },
  }).replace(/</g, '\\u003c');
  return (
    <main id="top" className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <nav className={styles.navigation} aria-label="44OS">
        <div className={styles.navInner}>
          <a className={styles.brand} href="#top" aria-label="44OS by forty four, return to top">
            <span>44OS</span><span aria-hidden="true">·</span><span>by forty four</span>
          </a>
          <a className={styles.navButton} href={appUrl}>Open App</a>
        </div>
      </nav>

      <StandaloneMigrationNotice appUrl={appUrl} />

      <div id="main-content">
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <h1 id="landing-title">A platform for independent creative work.</h1>
            <p>Music. Books. Merch. Assets. All in one place, owned by the people who made it.</p>
            <a className={styles.primaryButton} href={appUrl}>Open App</a>
          </div>
          <div className={styles.heroVisual}>
            <ProductMockup
              desktop="/marketing/discover.webp"
              mobile="/marketing/discover-mobile.webp"
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
                <ProductMockup desktop={feature.image} mobile={feature.mobileImage} alt={feature.alt} />
              </div>
            </section>
          ))}
        </div>

        <section className={styles.radio} aria-labelledby="radio-title">
          <div className={styles.eyebrow}>LIVE NOW</div>
          <h2 id="radio-title">44 Radio is always on.</h2>
          <a href={getAppPathUrl('/radio')}>Listen now <span aria-hidden="true">→</span></a>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerPrimary}>
          <div className={styles.footerBrand}>44OS by forty four</div>
          <nav aria-label="Footer">
            <a href={getAppPathUrl('/community')}>Community</a>
            <span aria-hidden="true">·</span>
            <a href={getAppPathUrl('/support')}>Support</a>
            <span aria-hidden="true">·</span>
            <a href="mailto:support@44os.com">Contact</a>
          </nav>
        </div>
        <nav className={styles.legal} aria-label="Legal">
          <a href={getAppPathUrl('/legal/terms')}>Terms</a>
          <a href={getAppPathUrl('/legal/privacy')}>Privacy</a>
          <a href={getAppPathUrl('/legal/copyright')}>Copyright</a>
        </nav>
      </footer>
    </main>
  );
}
