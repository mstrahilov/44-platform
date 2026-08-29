import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getAppPathUrl, getMarketingUrl } from '@/lib/siteUrl';
import marketingStyles from '../landing.module.css';
import styles from './download.module.css';

const pageTitle = 'Download 44OS';
const pageDescription = 'Bring the live 44OS experience to Mac or Windows.';
const localMacDownload = '/api/desktop/download/mac';
const localWindowsDownload = '/api/desktop/download/windows';
const publishedMacDownload = '/downloads/44OS-0.1.0-mac-universal-notarized.dmg';
const publishedWindowsDownload = '/downloads/44OS-0.1.0-windows-x64-setup.exe';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${pageTitle} · 44OS`,
  description: pageDescription,
  alternates: { canonical: `${getMarketingUrl()}/download` },
  openGraph: {
    title: `${pageTitle} · 44OS`,
    description: pageDescription,
    url: `${getMarketingUrl()}/download`,
    siteName: '44OS',
    type: 'website',
  },
};

function configuredHttpsUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function DownloadAction({ href, children }: { href: string | null; children: string }) {
  if (!href) return <span className={`${styles.downloadButton} ${styles.downloadButtonDisabled}`} aria-disabled="true">{children}</span>;
  return <a className={styles.downloadButton} href={href}>{children}</a>;
}

export default function MarketingDownloadPage() {
  const marketingUrl = getMarketingUrl();
  const appUrl = getAppPathUrl('/');
  const macUrl = configuredHttpsUrl(process.env.DESKTOP_MAC_DOWNLOAD_URL)
    ?? (process.env.NODE_ENV === 'production' ? publishedMacDownload : localMacDownload);
  const windowsUrl = configuredHttpsUrl(process.env.DESKTOP_WINDOWS_DOWNLOAD_URL)
    ?? (process.env.NODE_ENV === 'production' ? publishedWindowsDownload : localWindowsDownload);
  const version = process.env.DESKTOP_RELEASE_VERSION?.trim() || '0.1.0';
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: '44OS',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'macOS 12 or later; Windows 10 or 11 (64-bit)',
    softwareVersion: version,
    description: pageDescription,
    url: `${marketingUrl}/download`,
    isAccessibleForFree: true,
  }).replace(/</g, '\\u003c');

  return (
    <main className={`${marketingStyles.page} ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <a className={marketingStyles.skipLink} href="#download-options">Skip to downloads</a>

      <nav className={marketingStyles.navigation} aria-label="44OS">
        <div className={marketingStyles.navInner}>
          <Link className={marketingStyles.brand} href="/" aria-label="44OS by forty four">
            <span className={marketingStyles.brandMark}>44OS</span><span>by forty four</span>
          </Link>
          <div className={marketingStyles.navActions}>
            <Link className={marketingStyles.navDownloadButton} href="/download" aria-current="page">Download App</Link>
            <a className={marketingStyles.navButton} href={appUrl}>Open App</a>
          </div>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="download-title">
        <p className={styles.eyebrow}>THE DESKTOP APP</p>
        <h1 id="download-title">44OS for desktop.</h1>
        <p className={styles.intro}>A focused window for discovering, collecting, creating, and connecting. It is the same live 44OS you know from the web, with no browser tabs in the way.</p>
        <a className={styles.heroAction} href="#download-options">Choose your platform</a>
        <p className={styles.requirements}>macOS 12 or later&nbsp;&nbsp;·&nbsp;&nbsp;Windows 10 or 11, 64-bit</p>
      </section>

      <div className={styles.productVisual} aria-hidden="true">
        <Image src="/marketing/mockups/hero-combined.webp" alt="" width={1800} height={1125} sizes="(max-width: 767px) 100vw, 1100px" priority unoptimized />
      </div>

      <section id="download-options" className={styles.downloadSection} aria-labelledby="options-title">
        <header className={styles.sectionHeader}>
          <p className={styles.eyebrow}>DOWNLOAD</p>
          <h2 id="options-title">Choose your platform.</h2>
          <p>Version {version}. Your account and Library stay synced with the web application.</p>
        </header>

        <div className={styles.platformGrid}>
          <article className={styles.platformCard}>
            <h3>Download for Mac</h3>
            <p className={styles.platformCopy}>For Macs running macOS 12 or later. Approximately 5.3 MB.</p>
            <DownloadAction href={macUrl}>{macUrl ? 'Download' : 'Coming soon'}</DownloadAction>
          </article>

          <article className={styles.platformCard}>
            <h3>Download for Windows</h3>
            <p className={styles.platformCopy}>For 64-bit Windows 10 and Windows 11.</p>
            <DownloadAction href={windowsUrl}>Download</DownloadAction>
          </article>
        </div>
      </section>

      <section className={styles.installSection} aria-labelledby="install-title">
        <header className={styles.installHeader}>
          <p className={styles.eyebrow}>BEFORE YOU INSTALL</p>
          <h2 id="install-title">A transparent preview release.</h2>
        </header>
        <div className={styles.installColumns}>
          <div>
            <h3>On Mac</h3>
            <p>This release is signed with Apple Developer ID and notarized by Apple. macOS should identify 44OS as a verified developer when you download it from 44os.com.</p>
            <ol>
              <li>Open the DMG and drag the app into Applications.</li>
              <li>Open 44OS from Applications.</li>
              <li>If your Mac still shows a warning, verify that the file came from 44os.com before continuing.</li>
            </ol>
            <a href="https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unknown-developer-mh40616/mac">Read Apple&apos;s safety guidance</a>
          </div>
          <div>
            <h3>On Windows</h3>
            <p>The first Windows preview will not have a verified publisher signature. Microsoft Defender SmartScreen may identify it as an unrecognized app, and managed computers may prevent installation.</p>
            <p>Only continue if you downloaded the installer from 44os.com. If SmartScreen appears, review the filename and source before choosing More info and Run anyway.</p>
            <a href="https://learn.microsoft.com/windows/apps/package-and-deploy/smartscreen-reputation">Read Microsoft&apos;s SmartScreen guidance</a>
          </div>
        </div>
      </section>

      <section className={styles.webSection}>
        <p className={styles.eyebrow}>NO DOWNLOAD NEEDED</p>
        <h2>Prefer the browser?</h2>
        <p>The complete 44OS experience remains available on the web.</p>
        <a href={appUrl}>Open Web App</a>
      </section>

      <footer className={marketingStyles.footer}>
        <div className={marketingStyles.footerPrimary}>
          <nav className={marketingStyles.footerLinks} aria-label="Community and support">
            <Link href="/">About</Link><span aria-hidden="true">·</span>
            <Link href="/releases">Release Notes</Link><span aria-hidden="true">·</span>
            <a href={getAppPathUrl('/support')}>Support</a><span aria-hidden="true">·</span>
            <a href="mailto:support@44os.com">Contact</a>
          </nav>
          <div className={marketingStyles.footerBrand}><span className={marketingStyles.brandMark}>44OS</span> by forty four</div>
          <nav className={marketingStyles.legal} aria-label="Legal">
            <a href={getAppPathUrl('/legal/terms')}>Terms</a><span aria-hidden="true">·</span>
            <a href={getAppPathUrl('/legal/privacy')}>Privacy</a><span aria-hidden="true">·</span>
            <a href={getAppPathUrl('/legal/copyright')}>Copyright</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
