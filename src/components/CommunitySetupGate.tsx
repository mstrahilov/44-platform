'use client';

import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type CommunitySetupGateProps = {
  open: boolean;
  onClose: () => void;
};

export function CommunitySetupGate({ open, onClose }: CommunitySetupGateProps) {
  const router = useRouter();

  return (
    <ConfirmDialog
      open={open}
      title="Finish your community profile"
      description="Please finish setting up your community profile first."
      confirmLabel="Set Up Profile"
      cancelLabel="Dismiss"
      onCancel={onClose}
      onConfirm={() => {
        onClose();
        router.push('/account?setup=community');
      }}
    />
  );
}
