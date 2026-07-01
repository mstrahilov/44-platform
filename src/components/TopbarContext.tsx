'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type TopbarTab = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

type TopbarContextValue = {
  tabs: TopbarTab[] | undefined;
  setTabs: (tabs: TopbarTab[] | undefined) => void;
  back: { href: string; label?: string } | undefined;
  setBack: (back: { href: string; label?: string } | undefined) => void;
};

const TopbarContext = createContext<TopbarContextValue>({
  tabs: undefined,
  setTabs: () => {},
  back: undefined,
  setBack: () => {},
});

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<TopbarTab[] | undefined>(undefined);
  const [back, setBack] = useState<{ href: string; label?: string } | undefined>(undefined);
  const value = useMemo(() => ({ tabs, setTabs, back, setBack }), [tabs, back]);
  return <TopbarContext.Provider value={value}>{children}</TopbarContext.Provider>;
}

export function useTopbar(): TopbarContextValue {
  return useContext(TopbarContext);
}

/**
 * Register a set of tabs to appear in the global topbar.
 * Passing undefined clears them. Cleanup on unmount clears too.
 */
export function useTopbarTabs(tabs: TopbarTab[] | undefined) {
  const { setTabs } = useContext(TopbarContext);
  const key = useMemo(() => JSON.stringify(tabs?.map(t => [t.id, t.label, t.href, t.active])), [tabs]);
  const stableSet = useCallback((t: TopbarTab[] | undefined) => setTabs(t), [setTabs]);
  useEffect(() => {
    stableSet(tabs);
    return () => stableSet(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, stableSet]);
}

/**
 * Register a back link that appears in the topbar's left area when no tabs are set.
 */
export function useTopbarBack(back: { href: string; label?: string } | undefined) {
  const { setBack } = useContext(TopbarContext);
  const key = useMemo(() => JSON.stringify(back), [back]);
  const stableSet = useCallback((b: { href: string; label?: string } | undefined) => setBack(b), [setBack]);
  useEffect(() => {
    stableSet(back);
    return () => stableSet(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, stableSet]);
}
