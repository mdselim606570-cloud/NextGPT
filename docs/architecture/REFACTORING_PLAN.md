# Refactoring Plan

Incremental migration from the current layout toward a feature-oriented
architecture. Preserve behavior at every step; each phase must pass the
validation checklist before the next begins.

## Phase 0 — Baseline audit

- Toolchain: pnpm 12.16.1, Node 24, Next.js 14.2 (App Router), React 18,
  TypeScript 5.2, Zustand 4, Jest 29 + next/jest, ESLint 8.57,
  Tauri 2 (`src-tauri/`).
- Alias: `@/*` → `src/*` (tsconfig and jest).
- Validation commands:
  - `pnpm exec tsc --noEmit`
  - `pnpm test:ci` (fixed for pnpm 12 — see below)
  - `pnpm lint` (`next lint`)
  - `pnpm build`, `pnpm export`, `pnpm app:build` (Tauri)
  - `cargo check` inside `src-tauri/`
- `pnpm install --frozen-lockfile` requires every dependency with install
  scripts to be accounted for in `pnpm-workspace.yaml` `allowBuilds`.
  `bufferutil` and `utf-8-validate` (optional native accelerators for `ws`)
  are explicitly denied (`false`) — `ws` falls back to pure JS.

## Phase 0.5 — Validation infrastructure stabilization (done)

- **pnpm 12 test scripts**: `$(pnpm bin jest)` no longer accepts a package
  argument. Scripts now invoke
  `node --no-warnings --experimental-vm-modules node_modules/jest/bin/jest.js`
  directly, preserving the Node flags and argument forwarding.
- **ESLint crash**: `pnpm lint` crashed inside `no-unused-vars` on
  `src/constants/{paths,providers}.ts`. Root cause: string-literal enum
  members (`"302.AI" = ...`) produce scope variables with no identifiers,
  which ESLint 8.57 + @typescript-eslint/parser 6.21 cannot report.
  Fixed by renaming the members to `Ai302` (values unchanged) and updating
  the ~15 `Enum["302.AI"]` accesses to `Enum.Ai302`. No lint rules were
  disabled and no dependency changes were needed.
- **Component naming**: `_Chat`/`_MarkDownContent` were renamed to
  `ChatView`/`MarkDownContentBase` so `react-hooks/rules-of-hooks` recognizes
  them as components. `pnpm lint` now exits 0 with warnings only.
- **Missing dependencies declared**: `js-yaml` (imported by
  `src/app/store/plugin.ts`), `@jest/globals` (imported by jest.setup and
  tests). Both were previously only transitive deps invisible to pnpm's
  strict resolution.
- **Jest environment**: `jest.setup.ts` now polyfills `TextEncoder`/
  `TextDecoder` (absent in jest-environment-jsdom) and returns a
  prompts-shaped payload for `prompts.json` fetches.
- **Circular dependency**: `src/app/utils/sync.ts` captured
  `useXStore.setState` at module-eval time while stores import the utils
  barrel — a `store -> utils -> store` cycle that crashes under ESM.
  `LocalStateSetters` now uses lazy getters (see PROJECT_STRUCTURE.md).
- **MCP config path**: replaced the cwd-relative
  `app/mcp/mcp_config.json` with `resolveMcpConfigPath()` — env override,
  legacy-path fallback, then per-user config dir. See PROJECT_STRUCTURE.md.

### Baselines after stabilization

| Check | Result |
| ----- | ------ |
| `pnpm exec tsc --noEmit` | 9 errors, all pre-existing (see below) |
| `pnpm test:ci` | 37/37 suites, 180/180 tests pass |
| `pnpm lint` | exit 0, warnings only |
| `pnpm build` | passes |
| `pnpm install --frozen-lockfile` | passes |
| `cargo check` | blocked: missing system `libsoup-2.4` (see Phase 6) |

### Remaining pre-existing TypeScript errors (not migration-related)

- `src/app/components/features/artifacts.tsx` — imports `react-router`
  directly; only `react-router-dom` is a declared dependency.
- `src/app/components/layout/sidebar.tsx` — `<nextgptIcon />` used as JSX
  but the import name is lowercase.
- `src/app/components/sd/sd.tsx` — imports `Property` from `csstype`, which
  is not a declared dependency.
- `src/features/mcp/client.ts` — `Client` used as a type but only imported
  as a value via the lazy `eval("require(...)")` loader.
- `src/features/mcp/types.ts` — three zod schema calls with wrong arg counts.

## Phase 1 — Root cleanup (done)

- Moved `README_CN.md`, `README_JA.md`, `README_KO.md` →
  `docs/translations/`.
- Rewrote all relative doc links inside them (many were already stale —
  `docs/images/*` → `docs/assets/*`, `docs/vercel-*.md` →
  `docs/deployment/vercel-*.md`, etc.).
- Updated `README.md` language link and the two external
  `blob/main/README_CN.md` links in `docs/faq/faq-es.md` and `faq-ko.md`.
- Kept Dockerfile, docker-compose.yml, vercel.json and all tool
  configuration at the root (framework/deployment conventions).
- Removed the empty `src/utils/` directory.

## Phase 2 — Shim removal and config consolidation (done)

- Deleted `src/app/constant.ts` (re-export shim); all 62 imports now use
  `@/constants` directly.
- Deleted `src/app/utils.ts` (re-export shim); `@/app/utils` now resolves to
  `src/app/utils/index.ts`.
- Moved `src/app/config/` → `src/config/` (`build.ts`, `client.ts`,
  `server.ts`); rewrote ~60 import specifiers to `@/config/*` and fixed the
  `tauri.conf.json` relative path.
- Fixed `jest.config.ts` `moduleNameMapper` so `@/` maps to `<rootDir>/src/`
  (previously `<rootDir>/`, which could never resolve `src/` files).

## Phase 3 — Feature extraction (in progress)

Done:

- `src/app/mcp/` → `src/features/mcp/` (self-contained; no app-internal
  imports). All importers rewritten to `@/features/mcp/*`; tests updated.

Next candidates, ordered by risk:

1. `src/app/components/ui` → `src/shared/ui` — check for feature imports
   first (ui-lib may import stores).
2. `src/app/components/markdown` → `src/shared/ui/markdown`.
3. Split `src/app/store/` per feature (`chat`, `mask`, `prompt`, `plugin`,
   `sd`, `sync`, `access`, `config`, `update`) into
   `src/features/<name>/store/`.
4. `src/app/components/{auth,chat,settings,features,forms,realtime-chat,sd,
   voice-print}` → matching `src/features/*/components`.
5. `src/app/client/platforms/*` → `src/features/models/providers/client`;
   `src/app/api/*.ts` provider implementations → `src/server/ai/providers`,
   keeping `route.ts` files thin.
6. `src/app/locales` + `src/app/masks` → `src/shared/i18n` — **blocked** on
   decoupling `store/config` and `store/mask` dependencies (see
   PROJECT_STRUCTURE.md).
7. `src/app/utils` → split into `src/shared/utils`, feature utils, and
   `src/platform/{browser,tauri}` (`tauri.ts`, `cloud/`).
8. `tests/` → group into `unit/`, `integration/`, `e2e/` only where the test
   type is known.

## File movement map (completed)

| From | To |
| ---- | -- |
| `README_CN.md`, `README_JA.md`, `README_KO.md` | `docs/translations/` |
| `src/app/config/{build,client,server}.ts` | `src/config/` |
| `src/app/mcp/*` | `src/features/mcp/` |
| `src/app/constant.ts` | deleted (use `@/constants`) |
| `src/app/utils.ts` | deleted (use `@/app/utils` → `utils/index.ts`) |
| `src/utils/` (empty) | deleted |

## Risks and rules

- `src/config/server.ts` is server-only; never import it from client
  components. `src/config/client.ts` is isomorphic.
- `src/features/mcp/actions.ts` uses Node `fs`/`path` and `process.env.CODE`
  — treat as server-side despite living under a feature folder.
- Route handlers under `src/app/api/**/route.ts` must keep their URL paths;
  only their internal imports may change.
- `src/app/masks/build.ts` is executed by `pnpm mask` via `tsx`; its path is
  referenced in `package.json` — update the script if the file moves.
- No deletion without proving the file is unused; no API or UI behavior
  changes.

## Validation checklist (run after every migration)

| Check | Command |
| ----- | ------- |
| Types | `pnpm exec tsc --noEmit` (baseline: 9 pre-existing errors) |
| Lint | `pnpm lint` (baseline: exit 0, warnings only) |
| Tests | `pnpm test:ci` (baseline: 37/37 suites, 180 tests pass) |
| Install | `pnpm install --frozen-lockfile` |
| Web build | `pnpm build` |
| Desktop check | `cargo check` in `src-tauri/` — currently blocked by missing system `libsoup-2.4` on this machine |
| Desktop build | `pnpm app:build` (requires Tauri system deps: webkit2gtk, libsoup) |
| Docker | `docker build .` (only when Dockerfile/contexts change) |
