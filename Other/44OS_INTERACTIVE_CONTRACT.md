# 44OS Interactive Launch Contract

This is the implementation contract for M17 Unity/WebGL infrastructure. It is intentionally usable before the first export exists, but runtime acceptance remains pending until a real production build is hosted and exercised.

## 1. Item And Build Model

- An interactive experience remains one canonical Item. `interactive_builds` is its reviewed executable manifest, not a second catalog record.
- One current manifest is allowed per Item. Replacing a build updates that manifest while preserving the Item ID, Library relationship, entitlements, achievements, and event history.
- Supported runtimes are `unity_webgl` and standards-based `webgl`. Existing `item_capabilities.webgl`, `item_assets.webgl`, and legacy `catalog_items.launch_url` remain compatible, but new Library launches use `/launch/[itemId]` and the reviewed manifest.
- Creators and Item editors may prepare owned manifests and event definitions. Only a 44 admin may move a build to `ready`.
- A ready entry URL must live on an active, exact-match HTTPS origin in `interactive_origins`. The initial isolated host is `https://interactive.44os.com`.

The manifest records runtime/build/Unity versions, compression and fallback, WebGL and WebAssembly requirements, cross-origin-isolation requirement, desktop/mobile support, browsers, input methods, orientation, reported minimum memory, heap target, download size, and maximum session duration.

## 2. Launch Lifecycle

1. An entitled signed-in user opens `/launch/[itemId]` from the Library.
2. 44OS reads the ready manifest and checks browser, device class, WebGL 2, WebAssembly, and reported memory metadata.
3. `begin_interactive_launch` rechecks entitlement, Item visibility, reviewed build status, and exact allowed origin, then issues an opaque token for an expiring session. Only a SHA-256 digest is stored.
4. The isolated build loads in a sandboxed iframe. It must send `ready`; 44OS replies with `initialize`. The session token is retained by the parent and is never posted into the build.
5. Normal progress messages are bounded, sequenced, idempotent, and explicitly stored as `client` trust. Exit, expiry, load failure, and unsupported-device states always retain a route back to the originating Library Item.

The bridge protocol is `44os.interactive.v1`. Build-to-parent messages are `ready`, `progress`, `achievement-intent`, `error`, and `exit`. The parent accepts messages only from the iframe window, the manifest's exact origin, the active session ID, and the current protocol version. Payloads must be JSON objects no larger than 16 KiB. `progress` requires a positive per-session sequence number and an enabled Item-owned progress definition.

An `achievement-intent` message is informational only. It cannot grant an achievement.

## 3. Trusted Events And Replay Protection

Interactive progress may be either ordinary client progress or trusted server progress. Achievements require trusted server events.

The browser and Unity build never receive a signing secret. A future 44-controlled game service signs a request to `POST /api/interactive/events` with:

- `x-44-key-id`
- `x-44-timestamp` as an ISO instant within five minutes of receipt
- `x-44-nonce` as a 16–128 character URL-safe random value
- `x-44-signature` as lowercase SHA-256 HMAC hex

The HMAC input is the newline-joined sequence:

```text
44os-interactive-v1
keyId
timestamp
nonce
externalEventId
sessionId
userId
itemId
eventKey
occurredAt
sha256(canonicalJson(payload))
```

Object keys in canonical JSON are recursively sorted; array order is preserved. Signing keys are supplied only through server environment variable `INTERACTIVE_EVENT_SIGNING_KEYS`, a JSON map of key ID to at least 32-character secret. The route fails closed when that variable or `SUPABASE_SERVICE_ROLE_KEY` is absent.

After constant-time HMAC validation, a service-only RPC rechecks the active session/user/Item/definition boundary. Unique external event IDs and `(key ID, nonce)` pairs provide durable replay rejection. Accepted events are append-only. A signed progress event can supersede client progress; client progress cannot overwrite signed progress. A mapped achievement is issued through the existing server achievement/entitlement audit path.

## 4. Hosting, Sandboxing, And Resources

- Unity files belong on the isolated interactive origin, never inline in 44OS and never on a creator-controlled arbitrary host.
- The parent iframe sandbox allows scripts, same-origin behavior within the isolated host, pointer lock, and downloads. It does not allow top navigation, popups, forms, camera, microphone, geolocation, or 44OS credentials. Fullscreen and gamepad are explicit iframe permissions.
- The 44OS CSP admits frames only from self and `https://interactive.44os.com`. The interactive host needs its own narrow CSP.
- Brotli or gzip builds must be served with correct `Content-Encoding`; immutable hashed assets should receive long-lived caching. The host must report correct WASM MIME types.
- Threaded/SharedArrayBuffer builds must declare `requires_cross_origin_isolation` and the isolated host must supply compatible COOP/COEP/CORP or CORS headers for every dependent resource. The build's `ready` message must report `crossOriginIsolated: true`; otherwise 44OS fails visibly.
- Manifests record download and heap expectations. Database bounds prevent nonsensical values (2 GiB download ceiling and 4 GiB heap metadata ceiling), but launch approval must use real export profiling. The first production build should target a materially smaller download and conservative heap based on device acceptance, not those ceilings.
- Mobile support is opt-in per build. Unknown browser memory is not treated as proof of incompatibility; a reported value below the manifest minimum is.

## 5. Future Desktop Wrapper

The later desktop wrapper should use a dedicated interactive window/webview with no default native IPC capability. Tauri capabilities must be assigned by exact window/webview label and must not grant remote interactive origins filesystem, shell, updater, clipboard, process, or arbitrary command access. Remote content should not share a privileged webview, and Linux/Android iframe limitations require a separate-window boundary rather than relying on iframe identity for native permissions.

The wrapper must preserve the same versioned bridge and signed server-event contract so achievements do not become locally forgeable. It also needs explicit GPU/WebView minimums, cache quota/eviction behavior, update rollback, crash recovery, safe local storage locations, code-signing/notarization, deep-link validation, offline policy, and per-platform controller/fullscreen acceptance before distribution.

## 6. Export-Dependent Acceptance

M17 runtime acceptance resumes when an actual Unity export is available. Required evidence includes compression headers, WASM MIME type, COOP/COEP behavior when threaded, exact bridge integration, load/progress/error/exit signals, real memory and download measurements, keyboard/touch/gamepad behavior, fullscreen and pointer lock, Safari/Chrome/Firefox/Edge desktop, supported iOS/Android browsers, slow-network recovery, session expiry, replay attempts, and a signed test achievement from a server-owned signer.

Primary references reviewed July 13, 2026:

- Unity 6 system requirements: https://docs.unity3d.com/6000.0/Documentation/Manual/system-requirements.html
- Unity Web technical limitations: https://docs.unity3d.com/Manual/webgl-technical-overview.html
- MDN iframe sandbox: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
- MDN cross-origin isolation: https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated
- Tauri CSP: https://v2.tauri.app/security/csp/
- Tauri capabilities: https://v2.tauri.app/security/capabilities/
