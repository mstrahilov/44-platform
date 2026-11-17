'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type TopbarTab = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  variant?: 'pill' | 'section';
};

export type TopbarOverflowAction = {
  id: string;
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
};

type TopbarContextValue = {
  tabs: TopbarTab[] | undefined;
  setTabs: (tabs: TopbarTab[] | undefined) => void;
  toolbarTitle: string | undefined;
  setToolbarTitle: (title: string | undefined) => void;
  back: { href: string; label?: string } | undefined;
  setBack: (back: { href: string; label?: string } | undefined) => void;
  overflowActions: TopbarOverflowAction[] | undefined;
  setOverflowActions: (actions: TopbarOverflowAction[] | undefined) => void;
};

const TopbarContext = createContext<TopbarContextValue>({
  tabs: undefined,
  setTabs: () => {},
  toolbarTitle: undefined,
  setToolbarTitle: () => {},
  back: undefined,
  setBack: () => {},
  overflowActions: undefined,
  setOverflowActions: () => {},
});

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<TopbarTab[] | undefined>(undefined);
  const [toolbarTitle, setToolbarTitle] = useState<string | undefined>(undefined);
  const [back, setBack] = useState<{ href: string; label?: string } | undefined>(undefined);
  const [overflowActions, setOverflowActions] = useState<TopbarOverflowAction[] | undefined>(undefined);
  const value = useMemo(() => ({ tabs, setTabs, toolbarTitle, setToolbarTitle, back, setBack, overflowActions, setOverflowActions }), [tabs, toolbarTitle, back, overflowActions]);
  return <TopbarContext.Provider value={value}>{children}</TopbarContext.Provider>;
}

export function useTopbar(): TopbarContextValue {
  return useContext(TopbarContext);
}

/** Register the current page name in the shared mobile toolbar. */
export function useTopbarTitle(title: string | undefined) {
  const { setToolbarTitle } = useContext(TopbarContext);
  useEffect(() => {
    setToolbarTitle(title);
    return () => setToolbarTitle(undefined);
  }, [title, setToolbarTitle]);
}

/**
 * Register a back link that appears in the topbar's left area.
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

export function useTopbarOverflow(actions: TopbarOverflowAction[] | undefined) {
  const { setOverflowActions } = useContext(TopbarContext);
  useEffect(() => {
    setOverflowActions(actions);
  }, [actions, setOverflowActions]);
  useEffect(() => () => setOverflowActions(undefined), [setOverflowActions]);
}
