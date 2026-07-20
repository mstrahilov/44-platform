'use client';

import { useEffect, useState } from 'react';
import styles from '@/app/marketing-surface/landing.module.css';

export function StandaloneMigrationNotice({ appUrl }: { appUrl: string }) {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const synchronize = () => setStandalone(media.matches || navigatorWithStandalone.standalone === true);
    const initialSync = window.setTimeout(synchronize, 0);
    media.addEventListener('change', synchronize);
    return () => {
      window.clearTimeout(initialSync);
      media.removeEventListener('change', synchronize);
    };
  }, []);

  if (!standalone) return null;
  return (
    <aside className={styles.migrationNotice} aria-labelledby="migration-title">
      <div>
        <strong id="migration-title">44OS has moved.</strong>
        <p>Open the app at its new address, add it to your Home Screen again, and re-enable notifications there.</p>
      </div>
      <a className={styles.primaryButton} href={appUrl}>Open App</a>
    </aside>
  );
}
