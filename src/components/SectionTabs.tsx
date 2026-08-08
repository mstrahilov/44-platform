'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, type MouseEventHandler, type ReactNode } from 'react';
import { useTopbar, type TopbarTab } from '@/components/TopbarContext';

export function SectionTabs({
  ariaLabel,
  className = '',
  dockToTopbar = false,
  topbarOnly = false,
  topbarTabs,
  children,
}: {
  ariaLabel: string;
  className?: string;
  dockToTopbar?: boolean;
  topbarOnly?: boolean;
  topbarTabs?: TopbarTab[];
  children: ReactNode;
}) {
  const railRef = useRef<HTMLElement | null>(null);
  const topbarTabsRef = useRef<TopbarTab[] | undefined>(topbarTabs);
  const dockedRef = useRef(false);
  const { setTabs } = useTopbar();
  const tabsSignature = useMemo(() => JSON.stringify(topbarTabs?.map(tab => ({
    id: tab.id,
    label: tab.label,
    href: tab.href,
    active: tab.active,
    variant: tab.variant,
  }))), [topbarTabs]);

  useEffect(() => {
    topbarTabsRef.current = topbarTabs;
  });

  useEffect(() => {
    if (topbarOnly || dockedRef.current) setTabs(topbarTabsRef.current);
  }, [setTabs, tabsSignature, topbarOnly]);

  useEffect(() => {
    if (!topbarOnly || !topbarTabsRef.current?.length) return;
    setTabs(topbarTabsRef.current);
    return () => setTabs(undefined);
  }, [setTabs, topbarOnly]);

  useEffect(() => {
    if (topbarOnly || !dockToTopbar || !topbarTabsRef.current?.length) return;
    const rail = railRef.current;
    const scroller = document.querySelector<HTMLElement>('.app-main-content');
    if (!rail || !scroller) return;

    let frame = 0;
    function updateDockedState() {
      frame = 0;
      const docked = rail!.getBoundingClientRect().top <= scroller!.getBoundingClientRect().top;
      if (docked === dockedRef.current) return;
      dockedRef.current = docked;
      rail!.dataset.topbarDocked = docked ? 'true' : 'false';
      setTabs(docked ? topbarTabsRef.current : undefined);
    }
    function scheduleUpdate() {
      if (!frame) frame = window.requestAnimationFrame(updateDockedState);
    }

    scheduleUpdate();
    scroller.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (dockedRef.current) setTabs(undefined);
      dockedRef.current = false;
      delete rail.dataset.topbarDocked;
    };
  }, [dockToTopbar, setTabs, topbarOnly]);

  if (topbarOnly) return null;

  return (
    <nav ref={railRef} className={`section-tab-rail ${className}`.trim()} aria-label={ariaLabel}>
      {children}
    </nav>
  );
}

export function SectionTab({
  active,
  href,
  onClick,
  controls,
  className = '',
  children,
}: {
  active: boolean;
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  controls?: string;
  className?: string;
  children: ReactNode;
}) {
  const sharedProps = {
    className: `section-tab ${className}`.trim(),
    'aria-current': active ? 'page' as const : undefined,
    'aria-controls': controls,
  };

  if (href) {
    return (
      <Link {...sharedProps} href={href} onClick={onClick as MouseEventHandler<HTMLAnchorElement> | undefined}>
        {children}
      </Link>
    );
  }

  return (
    <button {...sharedProps} type="button" onClick={onClick as MouseEventHandler<HTMLButtonElement> | undefined}>
      {children}
    </button>
  );
}
