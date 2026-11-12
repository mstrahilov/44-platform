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
  back: { href: string; label?: string } | undefined;
  setBack: (back: { href: string; label?: string } | undefined) => void;
  overflowActions: TopbarOverflowAction[] | undefined;
  setOverflowActions: (actions: TopbarOverflowAction[] | undefined) => void;
};

const TopbarContext = createContext<TopbarContextValue>({
  tabs: undefined,
  setTabs: () => {},
  back: undefined,
  setBack: () => {},
  overflowActions: undefined,
  setOverflowActions: () => {},
});

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<TopbarTab[] | undefined>(undefined);
  const [back, setBack] = useState<{ href: string; label?: string } | undefined>(undefined);
  const [overflowActions, setOverflowActions] = useState<TopbarOverflowAction[] | undefined>(undefined);
  const value = useMemo(() => ({ tabs, setTabs, back, setBack, overflowActions, setOverflowActions }), [tabs, back, overflowActions]);
  return <TopbarContext.Provider value={value}>{children}</TopbarContext.Provider>;
}

export function useTopbar(): TopbarContextValue {
  return useContext(TopbarContext);
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
  const key = useMemo(() => JSON.stringify(actions?.map(action => ({ id: action.id, label: action.label, disabled: action.disabled })) ?? null), [actions]);
  useEffect(() => {
    setOverflowActions(actions);
    return () => setOverflowActions(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setOverflowActions]);
}
