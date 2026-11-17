# 44OS

44OS is a Next.js and Supabase creative platform for discovering, collecting, publishing, listening to, reading, and discussing independent work.

## Start here

Read these two documents before changing product behavior:

- [`Other/44OS_SYSTEM.md`](Other/44OS_SYSTEM.md) — shared product, architecture, data, authorization, UI, client-boundary, and release rules.
- [`Other/44OS_PLAN.md`](Other/44OS_PLAN.md) — the single active cross-client work list and acceptance gates.

The native iOS repository is maintained separately at `/Users/miro/Developer/44OS-iOS` and [`github.com/mstrahilov/44ios`](https://github.com/mstrahilov/44ios). Its workflow instructions point back to these canonical documents. Do not create another Foundation, UI, transition, audit, proposal, or roadmap file.

## Local Development

```bash
npm install
npm run dev
```

The local app runs at `http://localhost:3000`.

## Primary Checks

```bash
npm run lint
npm run typecheck
npm run audit:ui-cleanup
npm run test:security
npm run test:observability
npm run test:hardening-contract
npm run build
```

See `Other/44OS_SYSTEM.md` for the security, release, migration, smoke-test, restoration, and deployment rules.

## Audio Processing Operations

New release-track audio currently uses direct Supabase uploads. The private source and verified MP3 pipeline remains installed behind `NEXT_PUBLIC_AUDIO_PIPELINE_ENABLED`; keep it false until a signed production canary proves the complete path end to end.

Installed 44OS web apps can opt into standards-based Web Push for Community replies, mentions, and inbox messages. Push delivery uses VAPID credentials, a private subscription table, immediate authenticated delivery passes, and a daily recovery job; in-app notification events remain the source of truth.

```bash
# Read-only production inventory; writes the manifest to /tmp by default.
npm run audio:inventory

# Explicit production mutation: repairs the two audited URLs, registers current
# MP3s without copying them, and queues current WAVs. It never deletes storage.
npm run audio:register-legacy
```

The FFmpeg worker and deployment script live in `workers/audio-transcoder`. Cleanup is deployed fail-closed with `AUDIO_CLEANUP_ENABLED=false`; it is enabled only after the seven-day rollback observation window. Orphan quarantine is a separate explicit command and retains verified copies for 30 days.
