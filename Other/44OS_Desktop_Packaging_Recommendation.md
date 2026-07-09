# 44OS Desktop Packaging Recommendation

## Recommendation

Start with **Tauri 2** for the first Mac and Windows desktop wrapper, and keep **Electron** as the fallback if 44OS needs heavier Node-side desktop integrations later.

Tauri is the better first move because 44OS is already a web-first Next.js app. It gives us a smaller app bundle, lower idle memory, direct-download distribution, native window controls, and enough deep-link support for auth callbacks without turning the app into a second platform.

## Tradeoffs

- **Tauri 2:** smallest footprint and best fit for a polished wrapper around the existing web app. Requires Rust tooling and more care around platform permissions, auto-updates, and deep links.
- **Electron:** fastest path for teams already comfortable with Node desktop apps. Larger downloads and higher memory use, but the ecosystem is mature and forgiving.
- **PWA only:** useful as a low-effort install option, but not enough for a branded desktop app with direct Mac/Windows downloads.

## Implementation Notes

- Keep `44os.com` as the canonical web surface and wrap the production app first.
- Register app deep links such as `44os://auth/callback` only after Supabase redirect URLs are updated.
- Preserve existing web routes and do not fork navigation for desktop.
- Use direct-download distribution for v1, with signed builds and an updater plan before public release.
- Do a small proof of concept before committing to packaging: login, password reset, deep links, audio playback, downloads, and file upload must all work inside the wrapper.
