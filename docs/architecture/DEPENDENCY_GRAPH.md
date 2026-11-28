# Dependency Graph

**Repository:** NextGPT (`/workspaces/NextGPT`)
**Audit type:** Read-only Phase 0 baseline audit (no source files modified)

This document analyzes imports, dependency direction, and circular dependencies across `src/app/**`. It focuses on:
- Cross-directory imports within `src/app/`
- Circular dependencies (e.g. store <-> utils barrel)
- `../` relative paths vs `@/` aliases
- Specific hotspots called out in the audit scope:
  - `src/app/store/*` importing from the utils barrel
  - `src/app/utils/sync.ts` capturing `store.setState` at module-eval time
  - `src/app/locales` importing `../store/config` and `../config/client`
  - Import of server-only code from client components

---

## 1. Import style baseline

Two import styles coexist in `src/app/`:

| Style | Alias / form | Resolution | Typical use |
|-------|--------------|------------|-------------|
| `@/` alias | `@/config/*`, `@/constants`, `@/app/utils`, `@/app/store`, `@/features/mcp/*`, `@/shared/ui/*` | `tsconfig.json` `paths`: `@/*` → `./src/*`; `jest.config.ts` `moduleNameMapper`: `@/` → `<rootDir>/src/$1` | Cross-app imports (config, constants, store barrel, features, shared) |
| `../` relative | `../../store`, `../../utils`, `../../locales`, `../../client`, `../../masks`, `../../icons`, `../utils`, `../client/api` | Relative to file location | Intra-`src/app` imports (components → store/utils/locales/client/masks/icons) |

The `@/` alias is used for imports that cross the `app/` boundary or reach shared top-level modules (`@/config`, `@/constants`, `@/features/mcp`, `@/shared/ui`). The `../` form dominates inside `src/app/` because components live several levels deep and reference sibling barrels.

---

## 2. Cross-directory imports within `src/app/`

The following directed dependencies were observed by reading the source (representative samples):

### Components → stores / utils / locales / client / masks / icons
- `src/app/components/chat/chat-list.tsx` → `../../store` (`useChatStore`), `../../store/mask` (`Mask`), `../../locales` (Locale), `../../utils` (`useMobileScreen`), `../forms/mask` (`MaskAvatar`), `../../icons/delete.svg`
- `src/app/components/chat/message-selector.tsx` → `../../store` (`ChatMessage`, `useAppConfig`, `useChatStore`), `../../typing` (`Updater`), `../forms/mask` (`MaskAvatar`), `../../locales`, `../../utils` (`getMessageTextContent`)
- `src/app/components/forms/mask.tsx` → `../chat/error` (`ErrorBoundary`), `../../store/mask`, `../../store`, `../../client/api` (`MultimodalContent`, `ROLES`), `../../locales`, `../../utils`, `../../typing`, `../settings/model-config` (`ModelConfigList`), `../../masks` (`BUILTIN_MASK_STORE`)
- `src/app/components/forms/plugin.tsx` → `../chat/error` (`ErrorBoundary`), `../../store/plugin`, `../../locales`
- `src/app/components/features/exporter.tsx` → `../../store`, `../../utils`, `../../icons/*`, `../chat/message-selector`, `../../utils/format`, `../../client/api` (`ClientApi`, `getClientApi`)
- `src/app/components/features/artifacts.tsx` → `../../utils` (`copyToClipboard`, `downloadAs`), `../layout/home` (`Loading`), `../../icons/*`, `../../locales`
- `src/app/components/layout/sidebar.tsx` → (read but import list not fully captured; imports `../../store`, `../../locales`, `../../utils`)
- `src/app/components/settings/settings.tsx` → `../../store`, `../../locales`, `../../utils`, `../../constants`
- `src/app/components/auth/auth.tsx` → `../../store`, `../../locales`, `../../utils`
- `src/app/components/realtime-chat/realtime-chat.tsx` → `../../store`, `../../client/api`, `../../utils`
- `src/app/components/voice-print/voice-print.tsx` → `../../store`, `../../utils`, `../../locales`

### Store modules → utils barrel
- `src/app/store/chat.ts` → `../utils` (`getMessageTextContent`, `isDalle3`, `trimTopic`), `../utils/storage` (`safeLocalStorage`), `../utils/indexedDB-storage`, `../client/api` (`ClientApi`, `MultimodalContent`, `RequestMessage`, `getClientApi`), `../client/controller` (`ChatControllerPool`), `../locales` (Locale), `../utils/format` (`prettyObject`), `../utils/store` (`createPersistStore`), `../utils/token` (`estimateTokenLength`), `../utils/model` (`collectModelsWithDefaultModel`), `./config`, `./access`, `./mask`, `@/features/mcp/actions`, `@/features/mcp/utils`, `@/constants`
- `src/app/store/config.ts` → `../client/api` (`LLMModel`), `../typing`, `@/config/client` (`getClientConfig`), `@/constants`, `../utils/store` (`createPersistStore`)
- `src/app/store/access.ts` → `../client/api` (`getHeaders`), `@/config/client` (`getClientConfig`), `../utils/store` (`createPersistStore`), `../utils/clone` (`ensure`), `../utils/model` (`getModelProvider`), `./config` (`DEFAULT_CONFIG`), `@/constants`
- `src/app/store/sync.ts` → `../utils/sync` (`getLocalAppState`, `mergeAppState`, `setLocalAppState`, `GetStoreState`), `../utils` (`downloadAs`, `readFromFile`), `../utils/cloud` (`createSyncClient`, `ProviderType`), `@/config/client` (`getClientConfig`), `@/constants`, `@/shared/ui/ui-lib` (`showToast`), `../locales`
- `src/app/store/mask.ts` → `../masks` (`BUILTIN_MASKS`), `../locales` (`getLang`, `Lang`), `./chat` (`DEFAULT_TOPIC`, `ChatMessage`), `./config` (`ModelConfig`, `useAppConfig`), `@/constants`, `../utils/store` (`createPersistStore`)
- `src/app/store/plugin.ts` → `../utils` (`adapter`, `getOperationId`), `../utils/store` (`createPersistStore`), `./access` (`useAccessStore`), `@/config/client`, `@/constants`
- `src/app/store/prompt.ts` → `../locales` (`getLang`), `../utils/store` (`createPersistStore`), `@/constants`
- `src/app/store/sd.ts` → `@/app/client/api` (`getBearerToken`), `@/app/utils/store` (`createPersistStore`), `@/app/utils/chat` (`uploadImage`, `base64Image2Blob`), `@/app/components/sd/sd-panel` (`models`, `getModelParamBasicData`), `./access`, `@/constants`
- `src/app/store/update.ts` → `../utils` (`clientUpdate`), `../icons/nextgpt-bot.png`, `../locales`, `../client/api` (`ClientApi`), `@/config/client`, `@/constants`

### Store modules → stores (intra-store coupling)
- `src/app/store/chat.ts` → `./config` (`useAppConfig`), `./access` (`useAccessStore`), `./mask`
- `src/app/store/sync.ts` → transitively depends on all stores via `../utils/sync`
- `src/app/store/mask.ts` → `./chat`, `./config`
- `src/app/store/plugin.ts` → `./access`
- `src/app/store/sd.ts` → `./access`

### utils barrel → utils submodules (and back to store)
- `src/app/utils/index.ts` re-exports `./dom`, `./message`, `./model-detect`, `./network`, `./storage`, `./api`, `./tauri`, `./semver`, `./audio`, `./auth-settings-events`, `./baidu`, `./chat`, `./clone`, `./cloudflare`, `./format`, `./hmac`, `./hooks`, `./indexedDB-storage`, `./merge`, `./model`, `./ms_edge_tts`, `./object`, `./store`, `./stream` (as `tauriStreamFetch`), `./sync`, `./tencent`, `./token`, `./cloud`
- `src/app/utils/sync.ts` → `../store` (`useAccessStore`, `useAppConfig`, `useChatStore`), `../store/mask` (`useMaskStore`), `../store/prompt` (`usePromptStore`), `@/constants`, `./merge`

### Client API → stores / utils / config / locales / constants
- `src/app/client/api.ts` → `@/config/client`, `@/constants`, `../store` (`ChatMessageTool`, `ChatMessage`, `ModelType`, `useAccessStore`, `useChatStore`), `./platforms/*` (all 14 provider adapters)
- `src/app/client/platforms/openai.ts` → `@/constants`, `@/app/store` (`ChatMessageTool`, `useAccessStore`, `useAppConfig`, `useChatStore`, `usePluginStore`), `@/app/utils/model`, `@/app/utils/chat`, `@/app/utils/cloudflare`, `@/app/typing`, `../api` (`ChatOptions`, `getHeaders`, `LLMApi`, `LLMModel`, `LLMUsage`, `MultimodalContent`, `SpeechOptions`), `../../locales` (Locale), `@/config/client`, `@/app/utils` (`getMessageTextContent`, `isVisionModel`, `isDalle3`, `getTimeoutMSByModel`), `@/app/utils/stream` (`fetch`)
- `src/app/client/controller.ts` → (controller for stop/retry; imports stores)

### locales → store / config / utils
- `src/app/locales/index.ts` → `../utils/merge` (`merge`), `../utils/storage` (`safeLocalStorage`), `./cn` … `./sk` (all 21 locales)
- `src/app/locales/*.ts` (all 21 files: ar, bn, cs, da, de, en, es, fr, id, it, jp, ko, no, pt, ru, sk, tr, vi, cn/zh, tw) → `../store/config` (`SubmitKey`). **This is a cross-boundary import: every locale dictionary depends on app state.**
- Note: `locales/index.ts` does **not** import `../config/client` (contrary to one audit hypothesis); it imports `../utils/merge` and `../utils/storage` only. Individual locale files import `../store/config` only.

### MCP feature → external only (self-contained)
- `src/features/mcp/actions.ts` → `./client`, `./logger`, `./types`, Node `fs`/`path`/`os`, `spark-md5`. No app-internal imports.
- `src/features/mcp/client.ts` → `./logger`, `./types`, `zod`, `@modelcontextprotocol/sdk` (lazy `eval("require(...)")`). No app-internal imports.
- `src/features/mcp/types.ts` → `zod`, `@modelcontextprotocol/sdk/client/index.js`. No app-internal imports.

### config → constants / app utils
- `src/config/server.ts` → `@/constants` (`DEFAULT_MODELS`, `DEFAULT_GA_ID`), `@/app/utils/model` (`isGPT4Model`)
- `src/config/client.ts` → `./build` (`getBuildConfig`)
- `src/config/build.ts` → `../../src-tauri/tauri.conf.json` (relative path out of `src/`), `@/constants` (`DEFAULT_INPUT_TEMPLATE`)

---

## 3. Circular dependencies

### 3.1 `store` <-> `utils` barrel (the primary cycle)

```
src/app/store/* (chat, config, access, mask, sync, …)
   imports "../utils" / "../utils/storage" / "../utils/indexedDB-storage"
         v
src/app/utils/index.ts (barrel)
   export * from "./sync"   <-- re-exports sync.ts
         v
src/app/utils/sync.ts
   imports "../store" (useAccessStore, useAppConfig, useChatStore)
         v
back to src/app/store/*
```

This is a **module-eval-time circular dependency**: `store` modules import the `utils` barrel, which re-exports `sync.ts`, which imports `store` modules at the top level.

**Mitigation already in place:** `src/app/utils/sync.ts` (`LocalStateSetters`, lines 36-52) uses **lazy getters** for `useXStore.setState` so store access is deferred past module evaluation. The comment at lines 34-35 explicitly documents the cycle:

> Eager `useXStore.setState` references here create a module-eval-time circular dependency (store -> utils -> store) that breaks under ESM.

**Residual risk:** The cycle *still exists* at the graph level; only the access pattern is deferred. Before `utils` is split (per the refactoring plan), the cycle should be broken properly (e.g. stores should not import the utils barrel; `sync.ts` should not import stores at top level).

### 3.2 `store` ↔ `store` intra-store coupling
- `chat.ts` imports `./config`, `./access`, `./mask`
- `mask.ts` imports `./chat`, `./config`
- `plugin.ts` imports `./access`
- `sd.ts` imports `./access`
- `sync.ts` (via `utils/sync.ts`) depends on all stores

These form a small strongly-connected component among `chat`, `config`, `mask`, `access`. Not a module-eval crash (Zustand stores are created lazily via `createPersistStore`), but it tightens coupling and blocks moving individual stores into feature folders without moving their dependencies too.

### 3.3 `components` → `store` barrel → everything
Components import from `../../store` (the barrel), which re-exports all 9 stores. This means any component importing `useChatStore` transitively pulls in `config`, `mask`, `plugin`, `prompt`, `sd`, `sync`, `update`, `access`. This inflates bundle size and obstructs per-feature extraction.

### 3.4 `utils/sync.ts` → `store` → `utils` (transitive)
`utils/sync.ts` imports `../store` (barrel), which re-exports `sync.ts` itself indirectly via `store/index.ts` → `./sync`. Wait: `store/index.ts` re-exports `./sync` (`src/app/store/sync.ts`), NOT `src/app/utils/sync.ts`. These are two different files:
- `src/app/store/sync.ts` — the sync Zustand store
- `src/app/utils/sync.ts` — the sync state merge helpers

`src/app/store/sync.ts` imports `../utils/sync` (the utils helper) and `../utils` (barrel) and `../utils/cloud`. `src/app/utils/sync.ts` imports `../store` (barrel). So there is an indirect cycle:

```
src/app/store/sync.ts → ../utils (barrel) → ./sync (utils/sync.ts) → ../store (barrel) → ./sync (store/sync.ts)
```

This is a second, indirect store ↔ utils cycle mediated by the two `sync` files.

---

## 4. `../` relative vs `@/` alias — distribution

| Area | Predominant style | Examples |
|------|-------------------|----------|
| `src/app/components/*` | `../` relative | `../../store`, `../../utils`, `../../locales`, `../../client`, `../../masks`, `../../icons`, `../forms/*`, `../chat/*`, `../layout/*` |
| `src/app/store/*` | Mixed | `../utils`, `../utils/*`, `../client/*`, `../locales`, `./config`, `./access`, `@/config/client`, `@/constants`, `@/features/mcp/*` |
| `src/app/utils/*` | `../` relative (to store) | `../store`, `../store/mask`, `../store/prompt`, `@/constants` |
| `src/app/client/*` | Mixed | `@/constants`, `@/app/store`, `@/app/utils/*`, `@/app/typing`, `../api`, `../../locales`, `@/config/client` |
| `src/app/locales/*` | `../` relative | `../store/config`, `../utils/merge`, `../utils/storage`, `./cn` … `./sk` |
| `src/app/api/*` | `@/` alias (cross-app) + `./` relative | `@/config/server`, `@/constants`, `@/app/utils/format`, `@/app/utils/model`, `@/app/utils/cloudflare`, `./auth`, `./common` |
| `src/app/layout.tsx`, `page.tsx` | `@/` alias | `@/config/client`, `@/config/server`, `./components/layout/home` |

**Takeaway:** `../` relative paths dominate inside `src/app/` and couple modules to their physical location, making moves brittle (every move requires rewriting relative import specifiers). `@/` aliases are used for cross-app and shared modules and are more move-resilient.

---

## 5. Server-only code imported from client components

`src/config/server.ts` is **server-only** (throws if `process` is undefined; reads `process.env.*`, including `CODE`/`OPENAI_API_KEY`/provider keys). Confirmed importers (via `from "@/config/server"`):

**Server-side only (safe):**
- `src/app/layout.tsx` (server component)
- `src/app/page.tsx` (server component)
- All `src/app/api/*` route handlers (`openai.ts`, `anthropic.ts`, `google.ts`, `azure.ts`, `deepseek.ts`, `moonshot.ts`, `siliconflow.ts`, `tencent/route.ts`, `xai.ts`, `baidu.ts`, `bytedance.ts`, `glm.ts`, `iflytek.ts`, `stability.ts`, `alibaba.ts`, `proxy.ts`, `302ai.ts`, `common.ts`, `auth.ts`, `config/route.ts`, `artifacts/route.ts`, `webdav/[...path]/route.ts`, `upstash/[action]/[...key]/route.ts`)

**Client components:** No `"use client"` component under `src/app/components/` or `src/app/client/` was found importing `@/config/server`. Grep for `from "@/config/server"` returned only layout/page/api files. So there is **no direct** server-config import from a client component.

**Indirect leakage (intentional but a boundary concern):** `layout.tsx` (a server component) calls `getServerSideConfig()` and `getClientConfig()` and serializes the client config into `<meta name="config" content={JSON.stringify(getClientConfig())}>`. The client config is derived partly from build/env data. Some server-derived values therefore reach the browser through the HTML meta tag. This is by design (client needs build mode, default model, template) but means `getServerSideConfig` outputs flow into client-rendered UI.

---

## 6. `src/app/utils/sync.ts` module-eval `setState` capture

`src/app/utils/sync.ts` defines `LocalStateSetters` (lines 36-52):

```ts
const LocalStateSetters = {
  get [StoreKey.Chat]() { return useChatStore.setState; },
  get [StoreKey.Access]() { return useAccessStore.setState; },
  get [StoreKey.Config]() { return useAppConfig.setState; },
  get [StoreKey.Mask]() { return useMaskStore.setState; },
  get [StoreKey.Prompt]() { return usePromptStore.setState; },
} as const;
```

These are **lazy getters**, so `setState` is resolved at call time, not module-eval time. The cycle is mitigated but not removed. `LocalStateGetters` (lines 54-60) calls `useXStore.getState()` eagerly inside getter closures, but the closures are only invoked at runtime by `getLocalAppState()`/`setLocalAppState()`, so they are also deferred.

The comment at lines 34-35 explicitly acknowledges the design trade-off. For the refactoring (splitting `utils` into `src/lib`, `src/server`, feature utils), this file should be relocated and the store dependency broken.

---

## 7. Summary of dependency-direction risks relevant to refactoring

| Risk | Location | Impact on migration |
|------|----------|---------------------|
| Store ↔ utils barrel cycle | `store/*` ↔ `utils/index.ts` → `utils/sync.ts` → `store/*` | Must be broken before `utils` is split into `src/lib` / `src/server` |
| Intra-store coupling | `chat` ↔ `config`/`mask`/`access`; `mask` ↔ `chat`/`config` | Moving one store to a feature folder requires moving dependents together |
| Component → store barrel | `components/*` → `../../store` (re-exports all 9 stores) | Bloats bundles; blocks per-feature component extraction |
| `../` relative imports | Throughout `src/app/components/` | Every move requires rewriting relative import specifiers; use `@/` where possible post-move |
| locales → `../store/config` | All 21 `src/app/locales/*.ts` | Blocks moving locales to `src/i18n/` until the `SubmitKey` dependency is inverted/removed |
| Server config → client leakage | `layout.tsx` meta tag serializes client config | Keep `getClientConfig()` isomorphic; avoid importing `getServerSideConfig` in client-bound modules |
