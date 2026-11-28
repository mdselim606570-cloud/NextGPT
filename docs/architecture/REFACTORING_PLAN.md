# Refactoring Plan — File-by-File Migration

**Repository:** NextGPT (`/workspaces/NextGPT`)
**Audit type:** Read-only Phase 0 baseline audit (no source files modified)

This document is the exact file-by-file migration plan based on the feature-oriented refactoring proposal. It is layered on top of the existing `docs/architecture/REFACTORING_PLAN.md` (Phases 0–3) and `PROJECT_STRUCTURE.md`, which record completed work (Phase 0 stabilization, Phase 1 root cleanup, Phase 2 shim removal/config consolidation, Phase 3 feature extraction of `src/app/mcp/` → `src/features/mcp/`).

**Rule:** Preserve behavior at every step; each phase must pass the validation checklist (Section 5) before the next begins. No deletion without proving the file is unused; no API or UI behavior changes.

---

## 0. Baseline (current state)

Toolchain: pnpm 12.16.1, Node 24, Next.js 14.2 (App Router), React 18, TypeScript 5.2, Zustand 4, Jest 29 + next/jest, ESLint 8, Tauri 2 (`src-tauri/`).
Alias: `@/*` → `src/*` (tsconfig and jest).

Validation commands (baseline):
- `pnpm exec tsc --noEmit` — **9 errors, all pre-existing** (see Section 4)
- `pnpm test:ci` — **37/37 suites, 180/180 tests pass**
- `pnpm lint` (`next lint`) — exit 0, warnings only
- `pnpm build` — passes; `pnpm export` — passes
- `pnpm app:build` (Tauri) — **blocked** on this machine by missing system `libsoup-2.4`; `cargo check` in `src-tauri/` also blocked
- `pnpm install --frozen-lockfile` — passes

Pre-existing TypeScript errors (not migration-related, from existing `REFACTORING_PLAN.md`):
1. `src/app/components/features/artifacts.tsx` — imports `react-router` directly; only `react-router-dom` is a declared dependency.
2. `src/app/components/layout/sidebar.tsx` — `<nextgptIcon />` used as JSX but the import name is lowercase.
3. `src/app/components/sd/sd.tsx` — imports `Property` from `csstype`, which is not a declared dependency.
4. `src/features/mcp/client.ts` — `Client` used as a type but only imported as a value via the lazy `eval("require(...)")` loader.
5. `src/features/mcp/types.ts` — three zod schema calls with wrong arg counts.

(The baseline records 9 total pre-existing errors; the 5 above are the distinct root causes identified in `REFACTORING_PLAN.md`.)

---

## 1. Migration map (exact file-by-file)

| # | From | To | Blocked by? | Notes |
|---|------|-----|-------------|-------|
| 1 | `src/app/components/chat/*` | `src/features/chat/components/` | No | `chat.tsx`, `chat-list.tsx`, `search-chat.tsx`, `error.tsx`, `message-selector.tsx`, `chat.module.scss`, `message-selector.module.scss` |
| 2 | `src/app/components/realtime-chat/*` | `src/features/realtime/components/` | No | `realtime-chat.tsx`, `realtime-config.tsx`, `realtime-chat.module.scss` |
| 3 | `src/app/components/sd/*` | `src/features/image-generation/components/` | csstype error (#3) | `sd.tsx`, `sd-panel.tsx`, `sd-sidebar.tsx`, `index.tsx`, `*.module.scss` |
| 4 | `src/app/components/voice-print/*` | `src/features/voice/components/` | No | `voice-print.tsx`, `voice-print.module.scss`, `index.ts` |
| 5 | `src/app/components/settings/*` | `src/features/settings/components/` | No | `settings.tsx`, `model-config.tsx`, `tts-config.tsx`, `*.module.scss` |
| 6 | `src/app/components/auth/*` | `src/features/authentication/components/` | No | `auth.tsx`, `new-chat.tsx`, `*.module.scss` |
| 7 | `src/app/components/ui/*` | `src/components/ui/` | No | barrel + any UI primitives currently under `app/components/ui` |
| 8 | `src/shared/ui/*` | merge into `src/components/ui/` | No | `ui-lib.tsx`, `button.tsx`, `emoji.tsx`, `input-range.tsx` + `.module.scss` |
| 9 | `src/app/store/chat.ts` | `src/features/chat/store/` | store↔utils cycle (#6) | `useChatStore`, `ChatMessage`, `ChatSession`, `createMessage` |
| 10 | `src/app/store/plugin.ts` | `src/features/plugins/store/` | No | `usePluginStore`, `FunctionToolService`, `Plugin` |
| 11 | `src/app/store/prompt.ts` | `src/features/prompts/store/` | No | `usePromptStore`, `Prompt`, `SearchService` |
| 12 | `src/app/store/sd.ts` | `src/features/image-generation/store/` | csstype error (#3); imports `src/app/components/sd/sd-panel` | `useSdStore` — **coupled to `components/sd`** (imports `models`, `getModelParamBasicData` from `sd-panel`); must move `sd-panel` alongside or decouple first |
| 13 | `src/app/utils/audio.ts` | `src/lib/audio/` | No | `createTTSPlayer` (Web Audio API) |
| 14 | `src/app/utils/storage.ts` | `src/lib/storage/` | No | `safeLocalStorage` |
| 15 | `src/app/utils/hmac.ts` | `src/lib/crypto/` | No | `sign`, `hex`, `hash`, `hashWithSecret` (pure JS SHA-256 HMAC) |
| 16 | `src/app/utils/tauri.ts` | `src/lib/platform/desktop/` | No | `clientUpdate()` — consolidate all `window.__TAURI__` usage here |
| 17 | `src/app/utils/cloud/{index,webdav,upstash}.ts` | `src/server/` or `src/lib/` | mixed client/server responsibility | WebDAV/Upstash sync clients; inspect before moving (see `PROJECT_STRUCTURE.md` known coupling) |
| 18 | `src/app/locales/*` | `src/i18n/locales/` | **blocked** — locales import `../store/config` (`SubmitKey`) | Invert `SubmitKey` dependency first (see Section 4) |
| 19 | `src/app/masks/*` | `src/i18n/masks/` | **blocked** — masks import `../store/mask` and `../store`; `build.ts` path in `package.json` | Decouple mask store first; update `package.json` `"mask"` script if `build.ts` moves |
| 20 | `src/app/api/{openai,anthropic,google,azure,deepseek,moonshot,siliconflow,tencent,xai,baidu,bytedance,glm,iflytek,stability,alibaba,proxy,302ai}.ts` + `common.ts` | `src/providers/adapters/` | No | Keep route URLs unchanged; only internal imports change |
| 21 | `src/app/api/auth.ts` | server authentication layer (`src/server/auth/` or `src/server/`) | No | `auth(req, modelProvider)` access-control helper |
| 22 | `src/app/api/config/route.ts`, `[provider]/[...path]/route.ts`, `artifacts/route.ts`, `webdav/[...path]/route.ts`, `upstash/[action]/[...key]/route.ts` | stay in `src/app/api/` (thin route entry points) | — | Route handlers must keep their URL paths; only internal imports may change |
| 23 | `src/constants/models.ts` | `src/domain/models/` | No | `DEFAULT_MODELS`, `SUMMARIZE_MODEL`, `KnowledgeCutOffDate` |
| 24 | `src/constants/providers.ts` | `src/providers/registry/` | No | `ServiceProvider`, `ModelProvider` enums |
| 25 | `src/features/mcp/` | retain, align with feature conventions | No | `client.ts`, `actions.ts`, `types.ts`, `utils.ts`, `logger.ts`, `mcp_config.default.json` |

### Additional structural moves implied by the proposal
- `src/app/lib/audio.ts` (`AudioHandler`, real-time voice) → decide: consolidate with `src/app/utils/audio.ts` into `src/lib/audio/` (two overlapping audio concerns exist today — `utils/audio.ts` `createTTSPlayer` and `lib/audio.ts` `AudioHandler`).
- `src/app/store/index.ts` barrel → replace with per-feature store barrels; remove the `export * from "./..."` monolith.
- `src/app/utils/index.ts` barrel → remove/reduce as `utils` modules migrate out (`audio`, `storage`, `hmac`, `tauri`, `cloud` leave `app/utils`).
- `src/app/components/index.ts` → re-export from `src/components/ui` and feature component barrels.

---

## 2. Dependency order (phases)

Run validation (Section 5) after **each** phase.

### Phase A — Low-risk leaf utilities (no store/ui dependencies)
1. `src/app/utils/audio.ts` → `src/lib/audio/` (#13)
2. `src/app/utils/storage.ts` → `src/lib/storage/` (#14)
3. `src/app/utils/hmac.ts` → `src/lib/crypto/` (#15)
4. `src/app/utils/tauri.ts` → `src/lib/platform/desktop/` (#16)
   - Consolidate `window.__TAURI__` from `store/update.ts`, `store/plugin.ts`, `store/sync.ts` behind this abstraction.

### Phase B — Pure-UI extraction
5. `src/app/components/ui/*` → `src/components/ui/` (#7)
6. `src/shared/ui/*` → merge into `src/components/ui/` (#8)
   - `ui-lib.tsx` imports `../../app/icons/*` and `../../app/locales` — these cross-app imports must be repointed (icons → public asset path or new location; locales → not yet moved, so keep `@/app/locales` import or invert).

### Phase C — Feature components (in dependency order)
7. `src/app/components/auth/*` → `src/features/authentication/components/` (#6)
8. `src/app/components/chat/*` → `src/features/chat/components/` (#1)
9. `src/app/components/settings/*` → `src/features/settings/components/` (#5)
10. `src/app/components/realtime-chat/*` → `src/features/realtime/components/` (#2)
11. `src/app/components/voice-print/*` → `src/features/voice/components/` (#4)
12. `src/app/components/sd/*` → `src/features/image-generation/components/` (#3) — unblocked only after csstype error fixed.

### Phase D — Feature stores (depend on Phase C for `sd`)
13. `src/app/store/chat.ts` → `src/features/chat/store/` (#9) — unblocked only after store↔utils cycle broken (Phase E first, or concurrently).
14. `src/app/store/plugin.ts` → `src/features/plugins/store/` (#10)
15. `src/app/store/prompt.ts` → `src/features/prompts/store/` (#11)
16. `src/app/store/sd.ts` → `src/features/image-generation/store/` (#12) — must move `sd-panel` (from `components/sd`) or decouple its `models`/`getModelParamBasicData` exports first.

### Phase E — Break store↔utils cycle (prerequisite for store moves)
- Stop `src/app/store/*` from importing the `../utils` barrel; import specific utils modules instead.
- Stop `src/app/utils/sync.ts` from importing `../store` at top level (lazy getters already defer access; move the dependency or invert it).

### Phase F — Remaining utils & cloud
17. `src/app/utils/cloud/*` → `src/server/` or `src/lib/` (#17) — inspect mixed client/server responsibility first.
18. Shrink/remove `src/app/utils/index.ts` barrel as modules leave.

### Phase G — Constants & domain
19. `src/constants/models.ts` → `src/domain/models/` (#23)
20. `src/constants/providers.ts` → `src/providers/registry/` (#24)
21. `src/app/api/provider impls` → `src/providers/adapters/` (#20); `src/app/api/auth.ts` → server auth layer (#21).

### Phase H — i18n & masks (blocked until deps inverted)
22. `src/app/locales/*` → `src/i18n/locales/` (#18) — blocked on `SubmitKey` from `../store/config`.
23. `src/app/masks/*` → `src/i18n/masks/` (#19) — blocked on mask store decoupling; update `package.json` `"mask"` script path.

### Phase I — `src/app/` thinning
- `src/app/` retains: `page.tsx`, `layout.tsx`, route entry points (`api/*/route.ts`, `[provider]/[...path]/route.ts`), `polyfill.ts`, `command.ts`, `typing.ts`, `icons/`, `styles/`.
- Everything else extracted to `src/features/*`, `src/components/ui`, `src/lib`, `src/server`, `src/domain`, `src/providers`, `src/i18n`.

---

## 3. Blocked moves and pre-existing issues

The following moves are **blocked** until the listed issue is resolved. They must NOT be attempted before unblocking, or they will add to the pre-existing TS error count.

| Blocked move | Issue | File(s) | Resolution required |
|--------------|-------|---------|---------------------|
| #3 sd → image-generation/components | imports `Property` from `csstype` (not a declared dependency) | `src/app/components/sd/sd.tsx` | Add `csstype` to `package.json` devDependencies, or remove/replace the `Property` import |
| #12 sd store → image-generation/store | imports `models`, `getModelParamBasicData` from `src/app/components/sd/sd-panel` | `src/app/store/sd.ts` | Move `sd-panel` alongside, or extract `models`/`getModelParamBasicData` to a shared module first |
| #18 locales → src/i18n/locales | every locale imports `SubmitKey` from `../store/config` | all 21 `src/app/locales/*.ts` | Invert/remove the `SubmitKey` dependency (define it in constants or duplicate) |
| #19 masks → src/i18n/masks | masks import `../store/mask` and `../store`; `build.ts` path referenced in `package.json` | `src/app/masks/*` | Decouple mask store; update `package.json` `"mask"` script if `build.ts` moves |
| #1, #4, #5 MCP-related | `Client` used as type but only imported as value via lazy `eval("require(...)")` | `src/features/mcp/client.ts` | Import `Client` type properly from `@modelcontextprotocol/sdk` or type the return without the value import |
| #1, #4, #5 MCP-related | three zod schema calls with wrong arg counts | `src/features/mcp/types.ts` | Fix zod `z.object(...)` / `z.union(...)` / `z.record(...)` arg counts |
| #7 artifacts | imports `react-router` directly; only `react-router-dom` declared | `src/app/components/features/artifacts.tsx` | Change import to `react-router-dom` (or add `react-router`) |
| #6 sidebar | `<nextgptIcon />` used as JSX but import name is lowercase | `src/app/components/layout/sidebar.tsx` | Rename import to `NextgptIcon` or use as value correctly |

**Note:** The existing `REFACTORING_PLAN.md` baseline states `pnpm exec tsc --noEmit` yields **9 errors, all pre-existing**. The 5 distinct root causes above account for them (some files contribute multiple errors). Migration must not increase this count; ideally each phase keeps tsc at the same 9 pre-existing errors until the blocking issues are fixed, then reduces toward 0.

---

## 4. Cross-cutting boundary rules (must hold after every move)

- `src/config/server.ts` is server-only: never import it from client components or shared modules. `src/config/client.ts` is isomorphic.
- `src/features/mcp/actions.ts` uses Node `fs`/`path`/`os` and `process.env.CODE` — treat as server-side despite living under a feature folder.
- Route handlers under `src/app/api/**/route.ts` must keep their URL paths; only internal imports may change.
- `src/app/masks/build.ts` is executed by `pnpm mask` via `tsx`; its path is referenced in `package.json` — update the script if the file moves.
- `src/app/utils/sync.ts` ↔ `src/app/store/*` circular dependency: break before splitting utils.
- `src/app/locales/*.ts` import `../store/config` (`SubmitKey`) — invert before moving locales to `src/i18n/`.

---

## 5. Validation checklist (run after every migration phase)

| Check | Command | Expected / baseline |
|-------|---------|---------------------|
| Types | `pnpm exec tsc --noEmit` | 9 pre-existing errors only; must not increase |
| Lint | `pnpm lint` (`next lint`) | exit 0, warnings only |
| Tests | `pnpm test:ci` | 37/37 suites, 180/180 tests pass |
| Install | `pnpm install --frozen-lockfile` | passes (all install-script deps in `pnpm-workspace.yaml` `allowBuilds`; `bufferutil` and `utf-8-validate` denied) |
| Web build | `pnpm build` (`BUILD_MODE=standalone next build`) | passes |
| Static export | `pnpm export` (`BUILD_MODE=export BUILD_APP=1 next build`) | passes |
| Desktop check | `cargo check` inside `src-tauri/` | blocked: missing system `libsoup-2.4` on this machine |
| Desktop build | `pnpm app:build` | requires Tauri system deps (webkit2gtk, libsoup) |
| Docker | `docker build .` | only when Dockerfile/contexts change |

**pnpm 12 note:** `test`/`test:ci` invoke `node --no-warnings --experimental-vm-modules node_modules/jest/bin/jest.js` directly (not `$(pnpm bin jest)`), because `$(pnpm bin jest)` no longer accepts a package argument under pnpm 12.

---

## 6. Exit criteria for Phase 0 (this audit)

- [x] `ARCHITECTURE_INVENTORY.md` — complete source/module inventory
- [x] `DEPENDENCY_GRAPH.md` — imports, direction, circular deps
- [x] `BOUNDARY_VIOLATIONS.md` — client/server, feature, infrastructure violations
- [x] `PROVIDER_INVENTORY.md` — providers, capabilities, auth, protocol
- [x] `REFACTORING_PLAN.md` — this file: exact migration map + validation + blocked moves

Phase 0 is complete once all five Markdown files exist under `/workspaces/NextGPT/docs/architecture/` and the baseline validation results are recorded (above). No source files were modified during this audit.
