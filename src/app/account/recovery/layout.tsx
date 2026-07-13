import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/metadata';

export const metadata = buildPageMetadata({ title: 'Account Recovery', description: 'Recover access to your 44OS account.', path: '/account/recovery' });
export default function RecoveryLayout({ children }: { children: ReactNode }) { return children; }
