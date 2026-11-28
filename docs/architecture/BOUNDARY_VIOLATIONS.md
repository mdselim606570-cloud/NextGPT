# Boundary Violations

**Repository:** NextGPT (`/workspaces/NextGPT`)
**Audit type:** Read-only Phase 0 baseline audit (no source files modified)

This document identifies client/server, feature, and infrastructure boundary violations. A "boundary violation" is code that crosses an architectural layer it should not: server-only code reachable from the browser, provider credentials in client-reachable modules, platform globals outside an abstraction layer, and Node APIs (`fs`/`path`) in modules that could be bundled to the client.

---

## 1. Server-only code imported by client components or shared modules

### `src/config/server.ts` — server-only module

`src/config/server.ts` is explicitly server-only:
- Declares `NodeJS.ProcessEnv` augmentation with provider API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `AZURE_API_KEY`, `BAIDU_API_KEY`, `TENCENT_SECRET_KEY`, `STABILITY_API_KEY`, `DEEPSEEK_API_KEY`, `XAI_API_KEY`, `CHATGLM_API_KEY`, `SILICONFLOW_API_KEY`, `AI302_API_KEY`, etc.), `CODE`/`needCode`, feature flags, Vercel flags, and Cloudflare KV credentials.
- `getServerSideConfig()` throws `Error("[Server Config] you are importing a nodejs-only module outside of nodejs")` when `typeof process === "undefined"`.
- Computes `ACCESS_CODES` from `process.env.CODE` at module-eval time (lines 103-114).
- Returns `code: process.env.CODE` and `codes: ACCESS_CODES` (the hashed access-code set) in its result (lines 261-263).

**Direct importers of `getServerSideConfig` from `@/config/server`:**
- `src/app/layout.tsx` (server component, no `"use client"`) — line 9
- `src/app/page.tsx` (server component, async, no `"use client"`) — line 3
- All `src/app/api/*` route handlers (server-side): `openai.ts`, `anthropic.ts`, `google.ts`, `azure.ts`, `deepseek.ts`, `moonshot.ts`, `siliconflow.ts`, `tencent/route.ts`, `xai.ts`, `baidu.ts`, `bytedance.ts`, `glm.ts`, `iflytek.ts`, `stability.ts`, `alibaba.ts`, `proxy.ts`, `302ai.ts`, `common.ts`, `auth.ts`, `config/route.ts`, `artifacts/route.ts`, `webdav/[...path]/route.ts`, `upstash/[action]/[...key]/route.ts`

**Client components:** No `"use client"` component under `src/app/components/` or `src/app/client/` was found importing `@/config/server` directly. Grep for `from "@/config/server"` returned only `layout.tsx`, `page.tsx`, and `api/*` files. So there is **no direct** server-config import from a client component.

### Indirect leakage to the browser (intentional but a boundary concern)

`src/app/layout.tsx` is a server component that calls both `getClientConfig()` and `getServerSideConfig()` and serializes the client config into the HTML:

```tsx
<meta name="config" content={JSON.stringify(getClientConfig())} />
```

`getClientConfig()` reads the `config` meta tag on the client, or falls back to `getBuildConfig()` on the server. Some server-derived values (build mode, default model, template, version, commit info) therefore reach the browser through the rendered HTML. `page.tsx` similarly injects `<Analytics />` conditionally on `serverConfig?.isVercel`.

This is **by design** (the client needs build mode and defaults), but it means server config values flow into client-rendered UI. The refactoring target is to keep `getClientConfig()` isomorphic and avoid importing `getServerSideConfig` in any module that ends up in a client bundle.

---

## 2. Provider credentials in client-reachable modules

### `src/app/store/access.ts` — per-provider API keys held in client state

`useAccessStore` (Zustand, persisted to localStorage) holds plaintext API keys and URLs for every provider in client state:
- `openaiApiKey`, `azureApiKey`, `azureApiVersion`, `googleApiKey`, `anthropicApiKey`, `baiduApiKey`, `baiduSecretKey`, `bytedanceApiKey`, `alibabaApiKey`, `moonshotApiKey`, `stabilityApiKey`, `tencentSecretKey`, `tencentSecretId`, `iflytekApiKey`, `iflytekApiSecret`, `deepseekApiKey`, `xaiApiKey`, `chatglmApiKey`, `siliconflowApiKey`, `ai302ApiKey` (lines 72-140).

These are persisted via `createPersistStore` (Zustand persist middleware) to browser localStorage/indexedDB. This means provider credentials configured by the user are stored on the client. The store also fetches server config via `fetch("/api/config", ...)` (line 255) and mutates `DEFAULT_CONFIG` (a module-level shared object — a side-effect risk).

### `src/app/client/api.ts` — `getHeaders()` reads client access-store keys at runtime

`getHeaders()` (lines 244-366) reads `accessStore.getState()` and `useChatStore.getState()` to build authorization headers, selecting the API key based on provider:
```ts
const apiKey = isGoogle ? accessStore.googleApiKey : isAzure ? accessStore.azureApiKey : ... : accessStore.openaiApiKey;
```
It also handles `accessCode` with `ACCESS_CODE_PREFIX`. These are client-side credentials used to call provider APIs directly from the browser (or via `/api/*` proxy routes).

**Boundary implication:** Provider credentials live in client Zustand state and are read by client API modules. Moving auth to a "server authentication layer" (per the refactoring plan: `src/app/api/auth.ts` → server authentication layer) must account for the fact that `client/api.ts` and `access.ts` currently manage keys on the client.

---

## 3. Tauri / `window` globals used outside a platform abstraction

Tauri integration is scattered rather than isolated behind a single platform abstraction:

| File | Tauri/window usage | Lines |
|------|-------------------|-------|
| `src/app/utils/tauri.ts` | `(window as any).__TAURI__?.updater.checkUpdate()` / `installUpdate()` | 6-24 |
| `src/app/store/update.ts` | `window.__TAURI__?.notification.isPermissionGranted()` / `requestPermission()` / `sendNotification()` | 92-128 |
| `src/app/store/plugin.ts` | `window.__TAURI__ ? adapter : ["xhr"]` for OpenAPI client adapter (line 74); `fetch("./plugins.json")` rehydration | 74, 239-268 |
| `src/app/store/sync.ts` | `location.reload()` (imports `isApp` from `getClientConfig()`) | 60, 78 |
| `src/app/store/chat.ts` | `location.reload()` in `clearAllData` | 827 |
| `src/app/locales/index.ts` | `window`, `navigator`, `Intl.Locale`, `location.reload()` | 89-92, 106-107, 134 |
| `src/shared/ui/ui-lib.tsx` | `window.addEventListener("keydown")`, `document.createElement`, `document.body.appendChild`, `createRoot` | 123-136, 182-200, 232-256 |

**Assessment:** `src/app/utils/tauri.ts` exists as a would-be platform abstraction (`clientUpdate()`), but it is **not** the single point of Tauri access. `window.__TAURI__` is referenced directly in `store/update.ts`, `store/plugin.ts`, and `store/sync.ts`. Per the refactoring plan, `src/app/utils/tauri.ts` → `src/lib/platform/desktop`; the migration should consolidate all `__TAURI__`/`window.__TAURI__` usage behind that abstraction.

---

## 4. `src/config/server.ts` imported from client components

As established in Section 1, `src/config/server.ts` is imported **only** by server-side modules (`layout.tsx`, `page.tsx`, `api/*`). No client component imports it directly. However:

- `layout.tsx` passes server config into the client via the `<meta name="config">` tag and conditionally renders `SpeedInsights`/`GoogleTagManager`/`GoogleAnalytics` based on `serverConfig?.isVercel`/`.gtmId`/`.gaId`.
- `page.tsx` conditionally renders `<Analytics />` based on `serverConfig?.isVercel`.

So while there is no **code-level** import of server-only code from a client component, there is a **data-level** flow of server config into the client boundary. This should be preserved only through the isomorphic `getClientConfig()` path, not by importing `getServerSideConfig` in client modules.

---

## 5. `fs` / `path` usage in files that could be bundled to the browser

Grep for `import ... fs` / `import ... path` across `src/` found exactly two locations:

| File | Imports | Context | Bundled to browser? |
|------|---------|---------|---------------------|
| `src/features/mcp/actions.ts` | `fs/promises`, `fs` (`existsSync`), `os`, `path`, `process.env.CODE`, `spark-md5` | Server actions: `resolveMcpConfigPath()`, `getMcpConfigFromFile()`, `updateMcpConfig()` read/write `mcp_config.json` on disk. | **No** — treated as server-side ("use server" module); uses Node-only APIs |
| `src/app/masks/build.ts` | `fs`, `path` | Build-time codegen script run via `pnpm mask` / `tsx src/app/masks/build.ts`. Not imported by app code. | **No** — Node build script, not bundled |

**`src/config/build.ts`** also uses `require("child_process")` (`execSync` for git commit info) — Node-only, server/build time only.

No `fs`/`path` usage was found in `src/app/components/`, `src/app/client/`, or `src/app/store/` — so no client component directly bundles Node file-system APIs. The refactoring target (`src/server/` for server-only code, `src/app/utils/cloud/*` → `src/server` or `src/lib`) aligns with keeping these out of client bundles.

---

## 6. Boundary-violation summary table

| # | Violation | File(s) | Severity | Refactoring implication |
|---|-----------|---------|----------|-------------------------|
| 1 | Server-only `getServerSideConfig` (API keys, `CODE`) reachable via HTML meta tag | `src/app/layout.tsx`, `src/app/page.tsx` | Medium | Keep behind isomorphic `getClientConfig()`; never import `@/config/server` from client modules |
| 2 | Provider API keys stored in persisted client Zustand state | `src/app/store/access.ts` | High | Server auth layer (`src/app/api/auth.ts` → server) must reconcile with client key state |
| 3 | Client API headers built from access-store keys | `src/app/client/api.ts` (`getHeaders`) | Medium | Moves with provider adapters to `src/providers/adapters`; keep key selection out of UI |
| 4 | `window.__TAURI__` used outside platform abstraction | `src/app/utils/tauri.ts`, `src/app/store/update.ts`, `src/app/store/plugin.ts` | Medium | Consolidate behind `src/lib/platform/desktop` |
| 5 | i18n depends on app state (`SubmitKey` from `../store/config`) | All 21 `src/app/locales/*.ts` | Medium | Blocks `src/app/locales` → `src/i18n/locales` until dependency inverted |
| 6 | `store` ↔ `utils` barrel module-eval cycle | `src/app/store/*` ↔ `src/app/utils/index.ts` → `src/app/utils/sync.ts` | Medium | Break before splitting `utils` into `src/lib` / `src/server` |
| 7 | `fs`/`path`/`process.env.CODE` under a feature folder (MCP) | `src/features/mcp/actions.ts` | Low (server-side) | Treat as server-only; relocate toward `src/server/` or keep isolated |
| 8 | `fs`/`path` in build script (not bundled) | `src/app/masks/build.ts` | Low | Update `package.json` `"mask"` script path if `build.ts` moves |
