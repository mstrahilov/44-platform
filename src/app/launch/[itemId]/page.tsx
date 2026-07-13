'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { beginInteractiveLaunch, endInteractiveLaunch, getInteractiveBuild, recordInteractiveProgress, type InteractiveBuild, type InteractiveLaunch } from '@/lib/domain/interactive';
import { INTERACTIVE_PROTOCOL, interactiveEntryOrigin, parseInteractiveBridgeMessage } from '@/lib/interactiveBridge';

type LaunchState = 'loading' | 'signed-out' | 'unavailable' | 'unsupported' | 'starting' | 'running' | 'failed' | 'expired' | 'exited';
type Compatibility = { browser: string; mobile: boolean; webgl2: boolean; wasm: boolean; deviceMemoryMb: number | null; reasons: string[] };

const MOBILE_UNSUPPORTED_MESSAGE = 'Interactive experiences are available on desktop and laptop computers only. A keyboard and mouse are required.';

function readDeviceCapabilities(): Omit<Compatibility, 'reasons'> {
  const agent = navigator.userAgent;
  const browser = /Edg\//.test(agent) ? 'edge' : /Firefox\//.test(agent) ? 'firefox' : /Chrome\//.test(agent) ? 'chrome' : /Safari\//.test(agent) ? 'safari' : 'unknown';
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(agent)
    || window.matchMedia('(max-width: 768px)').matches
    || (navigator.maxTouchPoints > 1 && window.matchMedia('(max-width: 900px)').matches);
  const canvas = document.createElement('canvas');
  const webgl2 = Boolean(canvas.getContext('webgl2'));
  const wasm = typeof WebAssembly === 'object';
  const memoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const deviceMemoryMb = typeof memoryGb === 'number' ? memoryGb * 1024 : null;
  return { browser, mobile, webgl2, wasm, deviceMemoryMb };
}

function detectCompatibility(build: InteractiveBuild): Compatibility {
  const device = readDeviceCapabilities();
  const reasons: string[] = [];
  if (device.mobile) reasons.push(MOBILE_UNSUPPORTED_MESSAGE);
  if (build.webgl_version === 2 && !device.webgl2) reasons.push('This experience requires WebGL 2.');
  if (build.wasm_required && !device.wasm) reasons.push('This experience requires WebAssembly.');
  if (!build.supported_browsers.includes(device.browser as InteractiveBuild['supported_browsers'][number])) reasons.push('This browser is not listed as compatible with this build.');
  if (!device.mobile && !build.supports_desktop) reasons.push('This build is not available on desktop computers.');
  if (build.minimum_device_memory_mb && device.deviceMemoryMb && device.deviceMemoryMb < build.minimum_device_memory_mb) reasons.push('This device reports less memory than the build requires.');
  return { ...device, reasons };
}

export default function InteractiveLaunchPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const search = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const returnTo = search.get('returnTo')?.startsWith('/library/') ? search.get('returnTo')! : '/library';
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<LaunchState>('loading');
  const [build, setBuild] = useState<InteractiveBuild | null>(null);
  const [launch, setLaunch] = useState<InteractiveLaunch | null>(null);
  const [compatibility, setCompatibility] = useState<Compatibility | null>(null);
  const [message, setMessage] = useState('');

  const entryOrigin = useMemo(() => launch ? interactiveEntryOrigin(launch.entry_url) : null, [launch]);

  const start = useCallback(async () => {
    if (!user || !build || !compatibility) return;
    setState('starting');
    setMessage('Preparing the experience…');
    try {
      const nextLaunch = await beginInteractiveLaunch(itemId, {
        browser: compatibility.browser,
        mobile: compatibility.mobile,
        webgl2: compatibility.webgl2,
        wasm: compatibility.wasm,
        deviceMemoryMb: compatibility.deviceMemoryMb,
        language: navigator.language,
      });
      setLaunch(nextLaunch);
      setMessage('Loading the interactive build…');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The experience could not be started.');
      setState('failed');
    }
  }, [build, compatibility, itemId, user]);

  useEffect(() => {
    const device = readDeviceCapabilities();
    if (device.mobile) {
      Promise.resolve().then(() => {
        setCompatibility({ ...device, reasons: [MOBILE_UNSUPPORTED_MESSAGE] });
        setState('unsupported');
      });
      return;
    }
    if (authLoading) return;
    if (!user) { Promise.resolve().then(() => setState('signed-out')); return; }
    let alive = true;
    getInteractiveBuild(itemId).then(nextBuild => {
      if (!alive) return;
      if (!nextBuild?.entry_url) { setState('unavailable'); return; }
      const result = detectCompatibility(nextBuild);
      setBuild(nextBuild);
      setCompatibility(result);
      setState(result.reasons.length ? 'unsupported' : 'starting');
      if (!result.reasons.length) {
        setMessage('Preparing the experience…');
        beginInteractiveLaunch(itemId, {
          browser: result.browser, mobile: result.mobile, webgl2: result.webgl2, wasm: result.wasm,
          deviceMemoryMb: result.deviceMemoryMb, language: navigator.language,
        }).then(nextLaunch => { if (alive) { setLaunch(nextLaunch); setMessage('Loading the interactive build…'); } })
          .catch(error => { if (alive) { setMessage(error instanceof Error ? error.message : 'The experience could not be started.'); setState('failed'); } });
      }
    }).catch(() => { if (alive) setState('unavailable'); });
    return () => { alive = false; };
  }, [authLoading, itemId, user]);

  useEffect(() => {
    if (!launch || !entryOrigin) return;
    const expiryTimer = window.setTimeout(() => { setState('expired'); setLaunch(null); }, Math.max(0, new Date(launch.expires_at).getTime() - Date.now()));
    function receive(event: MessageEvent) {
      if (event.origin !== entryOrigin || event.source !== frameRef.current?.contentWindow) return;
      const incoming = parseInteractiveBridgeMessage(event.data);
      if (!incoming || incoming.sessionId !== launch!.session_id) return;
      if (incoming.type === 'ready') {
        if (build?.requires_cross_origin_isolation && incoming.crossOriginIsolated !== true) {
          setMessage('This build requires cross-origin isolation, but its host headers are incomplete.');
          setState('failed');
          return;
        }
        frameRef.current?.contentWindow?.postMessage({ protocol: INTERACTIVE_PROTOCOL, type: 'initialize', sessionId: launch!.session_id }, entryOrigin!);
        setState('running');
        setMessage('');
      } else if (incoming.type === 'progress' && incoming.eventKey && Number.isInteger(incoming.sequence) && incoming.sequence! > 0) {
        void recordInteractiveProgress({ sessionId: launch!.session_id, sessionToken: launch!.session_token, sequenceNumber: incoming.sequence!, eventKey: incoming.eventKey, payload: incoming.payload ?? {}, occurredAt: incoming.occurredAt })
          .catch(() => setMessage('Progress could not be synchronized. The experience can continue.'));
      } else if (incoming.type === 'achievement-intent') {
        setMessage('Achievement verification is pending trusted server confirmation.');
      } else if (incoming.type === 'error') {
        setMessage(incoming.message || 'The interactive build reported an error.');
        setState('failed');
      } else if (incoming.type === 'exit') {
        void endInteractiveLaunch(launch!.session_id, launch!.session_token).catch(() => undefined);
        setState('exited');
      }
    }
    window.addEventListener('message', receive);
    return () => { window.clearTimeout(expiryTimer); window.removeEventListener('message', receive); };
  }, [build?.requires_cross_origin_isolation, entryOrigin, launch]);

  const title = state === 'unsupported' ? 'Desktop Required' : state === 'unavailable' ? 'Experience Coming Soon' : state === 'expired' ? 'Session Expired' : state === 'exited' ? 'Experience Closed' : state === 'failed' ? 'Could Not Launch' : 'Interactive Experience';
  return <section className="interactive-launch-page" aria-label="Interactive experience" aria-live="polite">
    <div className="interactive-launch-surface">
      <Link className="interactive-launch-close" href={returnTo} aria-label="Return to Library" title="Return to Library">×</Link>
      {launch && !['failed','expired','exited'].includes(state) ? <>
        <iframe ref={frameRef} title="Interactive experience" src={launch.entry_url} className="interactive-launch-frame"
          sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-downloads" allow="fullscreen; gamepad" referrerPolicy="no-referrer" />
        {state !== 'running' && <div className="interactive-launch-overlay" role="status"><span className="interactive-launch-spinner" aria-hidden="true" /><p>{message}</p></div>}
      </> : <div className="interactive-launch-state">
        <p className="os-type-label">44OS Interactive</p>
        <h1>{title}</h1>
        {state === 'loading' || state === 'starting' ? <><span className="interactive-launch-spinner" aria-hidden="true" /><p>{message || 'Checking this device…'}</p></> : null}
        {state === 'signed-out' ? <><p>Sign in and open this experience from your Library.</p><Link className="os-button os-button-primary" href="/login">Sign In</Link></> : null}
        {state === 'unavailable' ? <p>No approved WebGL build is attached to this Item yet.</p> : null}
        {state === 'unsupported' ? <><p>This build cannot run reliably on the current device.</p><ul>{compatibility?.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></> : null}
        {state === 'failed' ? <><p role="alert">{message}</p>{build && compatibility && <button className="os-button os-button-primary" type="button" onClick={start}>Try Again</button>}</> : null}
        {state === 'expired' ? <><p>Your launch session ended. Progress already accepted by 44OS remains saved.</p><button className="os-button os-button-primary" type="button" onClick={start}>Start New Session</button></> : null}
        {state === 'exited' ? <><p>The experience closed normally.</p><Link className="os-button os-button-primary" href={returnTo}>Return to Library</Link></> : null}
      </div>}
    </div>
  </section>;
}
