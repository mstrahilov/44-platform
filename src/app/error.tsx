'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('44OS route error', { message: error.message, digest: error.digest }); }, [error]);
  return <main className="centered-message ui44-state ui44-state-error" role="alert"><h1 className="os-type-page-title ui44-type ui44-type-page-title">44OS hit a problem</h1><p className="os-type-body">Your account data is safe. Try this screen again, or return home if the problem continues.</p>{error.digest && <p className="os-type-meta">Reference: {error.digest}</p>}<div className="dashboard-row-actions"><button className="os-button os-button-primary" type="button" onClick={reset}>Try Again</button><Link className="os-button os-button-secondary" href="/">Return Home</Link></div></main>;
}
