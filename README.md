# 44OS

44OS is a Next.js and Supabase creative platform for discovering, collecting, publishing, listening to, reading, and discussing independent work.

## Active Documentation

The project has three active handoff documents:

- [`Other/44OS_FOUNDATION.md`](Other/44OS_FOUNDATION.md) — product, architecture, data, operations, payments, and interactive contracts.
- [`Other/44OS_UI.md`](Other/44OS_UI.md) — approved visual and interaction system.
- [`Other/44OS_MILESTONES.md`](Other/44OS_MILESTONES.md) — current system check, completed work, open launch gates, and sequencing.

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

See Foundation section 9 for the complete release, migration, smoke-test, restoration, and deployment procedure.
