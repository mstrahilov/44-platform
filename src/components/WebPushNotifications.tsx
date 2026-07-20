'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import {
  WEB_PUSH_STATE_UPDATED,
  disableWebPush,
  enableWebPush,
  getWebPushState,
  isStandaloneWebApp,
  register44ServiceWorker,
  syncExistingWebPushSubscription,
  webPushSupported,
  type WebPushState,
} from '@/lib/webPush';

function useWebPushState() {
  const [state, setState] = useState<WebPushState>('unsupported');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try { setState(await getWebPushState()); }
    catch { setState('error'); }
  }, []);

  useEffect(() => {
    void register44ServiceWorker().catch(() => undefined);
    void Promise.resolve().then(refresh);
    window.addEventListener(WEB_PUSH_STATE_UPDATED, refresh);
    return () => window.removeEventListener(WEB_PUSH_STATE_UPDATED, refresh);
  }, [refresh]);

  async function enable() {
    setBusy(true);
    try { setState(await enableWebPush()); }
    catch { setState('error'); }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try { setState(await disableWebPush()); }
    catch { setState('error'); }
    finally { setBusy(false); }
  }

  return { state, busy, enable, disable };
}

export function WebPushNotificationPrompt() {
  const { user } = useAuth();
  const { state, busy, enable } = useWebPushState();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user || !webPushSupported() || !isStandaloneWebApp()) return;
    const key = `44-web-push-prompt-dismissed:${user.id}`;
    void Promise.resolve().then(() => setDismissed(window.localStorage.getItem(key) === 'true'));
    void syncExistingWebPushSubscription().catch(() => undefined);
  }, [user]);

  if (!user || dismissed || state !== 'default' || !isStandaloneWebApp()) return null;

  function dismiss() {
    window.localStorage.setItem(`44-web-push-prompt-dismissed:${user!.id}`, 'true');
    setDismissed(true);
  }

  return (
    <aside className="web-push-prompt ui44-panel ui44-panel-glass" role="dialog" aria-label="Enable notifications">
      <div className="web-push-prompt-copy">
        <div className="os-type-card-title">Stay connected</div>
        <div className="os-type-body-small">Get notified about Community replies, mentions, and new messages.</div>
      </div>
      <div className="web-push-prompt-actions">
        <button type="button" className="os-button os-button-primary os-button-compact" disabled={busy} onClick={() => void enable()}>
          {busy ? 'Enabling…' : 'Enable Notifications'}
        </button>
        <button type="button" className="os-button os-button-secondary os-button-compact" onClick={dismiss}>Not now</button>
      </div>
    </aside>
  );
}

export function WebPushSettingsRow() {
  const { state, busy, enable, disable } = useWebPushState();
  const supported = state !== 'unsupported';
  const description = state === 'enabled'
    ? 'Native notifications are enabled on this device.'
    : state === 'denied'
      ? 'Notifications are blocked in this device’s settings.'
      : supported
        ? 'Receive Community replies, mentions, and new messages on this device.'
        : 'Install 44OS on a supported device to enable native notifications.';

  return (
    <div className="settings-row ui44-list-row ui44-list-row-settings">
      <div className="settings-row-copy">
        <div className="os-type-card-title">Device Notifications</div>
        <div className="os-type-body-small">{description}</div>
      </div>
      {supported && state !== 'denied' ? (
        <button
          type="button"
          role="switch"
          aria-checked={state === 'enabled'}
          aria-label="Device notifications"
          disabled={busy}
          className={state === 'enabled' ? 'settings-toggle settings-toggle-on ui44-switch ui44-switch-on' : 'settings-toggle ui44-switch'}
          onClick={() => void (state === 'enabled' ? disable() : enable())}
        />
      ) : null}
    </div>
  );
}
