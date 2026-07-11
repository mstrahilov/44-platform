'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type CommunitySetupGateProps = {
  open: boolean;
  onClose: () => void;
};

export function CommunitySetupGate({ open, onClose }: CommunitySetupGateProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    onClose();
    router.push('/profile');
  }, [onClose, open, router]);

  return null;
}
