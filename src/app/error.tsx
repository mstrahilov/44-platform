'use client';

import { useEffect } from 'react';
import { OS44Button } from '@/components/OS44Button';

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('44OS route error', { message: error.message, digest: error.digest }); }, [error]);
  return (
    <main className="route-error-screen ui44-state ui44-state-error" role="alert">
      <div className="route-error-content">
        <h1 className="os-type-page-title ui44-type ui44-type-page-title">44OS hit a problem</h1>
        <p className="os-type-body">Refresh the page to try again.</p>
        <OS44Button className="os-button os-button-primary" type="button" onClick={reset}>Try Again</OS44Button>
      </div>
    </main>
  );
}
