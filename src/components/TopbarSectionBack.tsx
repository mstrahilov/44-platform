'use client';

import { usePathname } from 'next/navigation';
import { useTopbarBack } from '@/components/TopbarContext';

type ParentRoute = {
  prefix: string;
  href: string;
  label: string;
};

export function TopbarSectionBack({
  rootHref,
  rootLabel,
  parentRoutes = [],
}: {
  rootHref: string;
  rootLabel: string;
  parentRoutes?: ParentRoute[];
}) {
  const pathname = usePathname();
  const parent = parentRoutes.find(route => pathname.startsWith(route.prefix));
  useTopbarBack(pathname === rootHref
    ? undefined
    : { href: parent?.href ?? rootHref, label: parent?.label ?? rootLabel });
  return null;
}
