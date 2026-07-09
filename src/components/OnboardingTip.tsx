'use client';

import { useEffect, useState } from 'react';

const TIP_EVENT = '44-onboarding-tip-dismissed';

export function OnboardingTip({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const storageKey = `44-tip-dismissed-${id}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(storageKey) !== 'true');

    function sync() {
      setVisible(window.localStorage.getItem(storageKey) !== 'true');
    }

    window.addEventListener(TIP_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(TIP_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [storageKey]);

  function dismiss() {
    window.localStorage.setItem(storageKey, 'true');
    setVisible(false);
    window.dispatchEvent(new Event(TIP_EVENT));
  }

  if (!visible) return null;

  return (
    <aside className="onboarding-tip os-type-body-small">
      <span>{children}</span>
      <button type="button" className="onboarding-tip-dismiss" onClick={dismiss}>
        Don&apos;t show again
      </button>
    </aside>
  );
}
