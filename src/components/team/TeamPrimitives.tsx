'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { EmptyMessage, PageShell } from '@/components/Ui';
import { fetchMyTeamAccess, type TeamAccessState } from '@/lib/domain/team';
import { useAuth } from '@/lib/useAuth';

export function TeamAccessBoundary({
  children,
}: {
  children: ReactNode | ((access: TeamAccessState) => ReactNode);
}) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<{ loading: boolean; access: TeamAccessState | null; error: string }>({
    loading: true, access: null, error: '',
  });

  useEffect(() => {
    let alive = true;
    if (authLoading) return () => { alive = false; };
    if (!user) {
      Promise.resolve().then(() => { if (alive) setState({ loading: false, access: null, error: '' }); });
      return () => { alive = false; };
    }
    void fetchMyTeamAccess().then(access => {
      if (alive) setState({ loading: false, access, error: '' });
    }).catch(error => {
      if (alive) setState({ loading: false, access: null, error: error instanceof Error ? error.message : 'Team access could not be verified.' });
    });
    return () => { alive = false; };
  }, [authLoading, user]);

  if (authLoading || state.loading) return <PageShell><div className="ui44-loading-shell" role="status" aria-label="Loading Team workspace" /></PageShell>;
  if (!user) return <PageShell><EmptyMessage><Link href="/login">Sign in</Link> to open the private Team workspace.</EmptyMessage></PageShell>;
  if (!state.access?.authorized) return <PageShell><EmptyMessage>{state.error || 'Team access is required.'}</EmptyMessage></PageShell>;
  return typeof children === 'function' ? children(state.access) : children;
}
