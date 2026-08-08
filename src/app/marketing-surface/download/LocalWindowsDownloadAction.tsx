'use client';

import { useEffect, useState } from 'react';
import styles from './download.module.css';

export default function LocalWindowsDownloadAction({ href }: { href: string }) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(href, { method: 'HEAD', cache: 'no-store', signal: controller.signal })
      .then(response => setAvailable(response.ok))
      .catch(() => setAvailable(false));
    return () => controller.abort();
  }, [href]);

  if (available) return <a className={styles.downloadButton} href={href}>Download</a>;
  return <span className={`${styles.downloadButton} ${styles.downloadButtonDisabled}`} aria-disabled="true">Coming soon</span>;
}
