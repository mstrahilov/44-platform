# 44OS

44OS is a Next.js and Supabase creative platform for discovering, collecting, publishing, listening to, reading, and discussing independent work.

## Active Documentation

The project has three active handoff documents:

- [`Other/44OS_FOUNDATION.md`](Other/44OS_FOUNDATION.md) — product, architecture, data, operations, payments, and interactive contracts.
- [`Other/44OS_UI.md`](Other/44OS_UI.md) — approved visual and interaction system.
- [`Other/44OS_MILESTONES.md`](Other/44OS_MILESTONES.md) — the single ordered list of current work and acceptance criteria.

Other historical plans and audit ledgers are intentionally retired. Use Git history if implementation chronology is required.

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

See Foundation’s **Security, release, and recovery** section for the complete release, migration, smoke-test, restoration, and deployment procedure.

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
