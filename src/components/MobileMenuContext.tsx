'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type MobileMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const MobileMenuContext = createContext<MobileMenuContextValue>({
  open: false,
  setOpen: () => {},
  toggle: () => {},
});

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const value = useMemo(() => ({ open, setOpen, toggle: () => setOpen(value => !value) }), [open]);
  return <MobileMenuContext.Provider value={value}>{children}</MobileMenuContext.Provider>;
}

export function useMobileMenu() {
  return useContext(MobileMenuContext);
}
