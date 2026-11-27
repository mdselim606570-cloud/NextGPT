# Architecture Inventory

**Repository:** NextGPT (`/workspaces/NextGPT`)
**Audit type:** Read-only Phase 0 baseline audit (no source files modified)
**Stack:** Next.js 14 (App Router), React 18, TypeScript 5.2, Zustand 4, SCSS, Jest 29, ESLint 8, pnpm 12, Tauri 2 (`src-tauri/`).

This document catalogs every major directory under `src/` plus the supporting repository areas (`src-tauri/`, `public/`, `tests/`, `scripts/`, `docs/`, config files, and generated artifacts). It distinguishes existing directories/files from target/planned directories referenced in the refactoring proposal that do not yet exist.

---

## 1. Repository root

| Path | Type | Version-controlled? | Responsibility |
|------|------|---------------------|----------------|
| `package.json` | file | yes | pnpm workspace manifest; scripts (`dev`, `build`, `export`, `lint`, `test`, `test:ci`, `mask`, `app:build`, `prompts`, `proxy-dev`) |
| `pnpm-lock.yaml` | file | yes | Lockfile |
| `pnpm-workspace.yaml` | file | yes | Workspace config; `allowBuilds` for native deps |
| `tsconfig.json` | file | yes | TS config; `@/*` → `./src/*` alias; `noEmit`, `incremental` |
| `next.config.mjs` | file | yes | Next.js config |
| `vercel.json` | file | yes | Vercel deployment config |
| `next-env.d.ts` | file | yes | Next.js TS declarations |
| `jest.config.ts` | file | yes | Jest config; `@/` moduleNameMapper → `<rootDir>/src/$1` |
| `jest.setup.ts` | file | yes | Jest setup (TextEncoder/TextDecoder polyfills, `prompts.json` mock) |
| `.eslintrc.json` | file | yes | ESLint config |
| `.prettierrc.js` | file | yes | Prettier config |
| `.eslintignore` | file | yes | ESLint ignore |
| `.babelrc` | file | yes | Babel config |
| `.dockerignore` | file | yes | Docker ignore |
| `.gitignore` | file | yes | Git ignore |
| `.gitpod.yml` | file | yes | Gitpod workspace config |
| `.npmrc` | file | yes | npm/pnpm registry config |
| `Dockerfile` | file | yes | Docker build entry point (kept at root) |
| `docker-compose.yml` | file | yes | Compose deployment (kept at root) |
| `CODE_OF_CONDUCT.md` | file | yes | |
| `LICENSE` | file | yes | MIT |
| `README.md` | file | yes | Main English documentation |
| `.env.template` | file | yes | Environment variable template (no secrets committed) |
| `.env.local` | file | no (gitignored) | Local env overrides |
| `tsconfig.tsbuildinfo` | file | no (generated) | TS incremental build info |
| `.swc/` | dir | no (generated) | SWC cache |
| `.next/` | dir | no (generated) | Next.js build output |
| `out/` | dir | no (generated) | `next export` static output |
| `target/` | dir | no (generated) | Rust/Tauri build output (under `src-tauri/target/`) |
| `docs/` | dir | yes | Documentation (architecture, assets, deployment, faq, guides, translations) |
| `scripts/` | dir | yes | Bootstrap, dev, CI helper scripts |
| `tests/` | dir | yes | Jest suite (`api/`, `client/`, `mcp/`, `models/`, `store/`, `utils/`) |
| `public/` | dir | yes | Static assets served to browser |
| `src/` | dir | yes | Application source (see below) |
| `src-tauri/` | dir | yes | Tauri desktop shell + Rust backend |

---

## 2. `src/` inventory

`src/` currently contains **5 top-level directories**: `app/`, `config/`, `constants/`, `features/`, `shared/`.

Several directories named in the refactoring proposal do **not yet exist** at the `src/` level: `providers/`, `server/`, `domain/`, `i18n/`, `lib/` (top-level). These are migration targets, not current layout. `src/app/lib/` exists as a single file (`audio.ts`), not a directory.

### 2.1 `src/app/` — Next.js App Router + application code (monolith)

This is the largest directory and mixes routing, API modules, components, state, locales, platform utilities, icons, and styles. The target state (per `REFACTORING_PLAN.md` / `PROJECT_STRUCTURE.md`) is for `src/app/` to stay thin (routes, layouts, pages, route entry points) with business features extracted to `src/features/<name>/`.

| Subdirectory | Files (key) | Responsibility | Notes |
|--------------|-------------|----------------|-------|
| (root) | `page.tsx`, `layout.tsx`, `polyfill.ts`, `command.ts`, `typing.ts` | App Router entry; root layout injects client config via `<meta name="config">`, server-side analytics/GTM/GA; polyfills; app-level commands; shared message/role types | `page.tsx` and `layout.tsx` are **server components** (no `"use client"`) |
| `api/` | `openai.ts`, `anthropic.ts`, `google.ts`, `azure.ts`, `deepseek.ts`, `moonshot.ts`, `siliconflow.ts`, `tencent/route.ts`, `xai.ts`, `baidu.ts`, `bytedance.ts`, `glm.ts`, `iflytek.ts`, `stability.ts`, `alibaba.ts`, `proxy.ts`, `302ai.ts`, `common.ts`, `auth.ts`, `config/route.ts`, `[provider]/[...path]/route.ts`, `artifacts/route.ts`, `webdav/[...path]/route.ts`, `upstash/[action]/[...key]/route.ts` | Server-side route handlers + provider proxy modules + shared auth helper. Every provider module exports a `handle(req, params)` Next.js route handler; `[provider]/[...path]/route.ts` is the catch-all dispatcher. | All import `getServerSideConfig` from `@/config/server` (server-only) |
| `client/` | `api.ts`, `controller.ts`, `platforms/*.ts` | Browser-side API client. `api.ts` defines the `LLMApi` abstract contract (`chat`, `speech`, `usage`, `models`), `ClientApi` factory, `ChatOptions`/`SpeechOptions`/`LLMModel` types, `getHeaders()`, `getClientApi()`. `platforms/` has one adapter per provider (`openai.ts` → `ChatGPTApi`, `anthropic.ts` → `ClaudeApi`, `google.ts` → `GeminiProApi`, `baidu.ts` → `ErnieApi`, `bytedance.ts` → `DoubaoApi`, `alibaba.ts` → `QwenApi`, `tencent.ts` → `HunyuanApi`, `moonshot.ts` → `MoonshotApi`, `iflytek.ts` → `SparkApi`, `deepseek.ts` → `DeepSeekApi`, `xai.ts` → `XAIApi`, `glm.ts` → `ChatGLMApi`, `siliconflow.ts` → `SiliconflowApi`, `ai302.ts` → `Ai302Api`) | `"use client"` in `platforms/openai.ts`; modules import from `@/app/store` barrel and `@/app/utils` barrel |
| `components/` | `index.ts`; subdirs `auth/`, `chat/`, `features/`, `forms/`, `layout/`, `markdown/`, `realtime-chat/`, `sd/`, `settings/`, `ui/`, `voice-print/` | React UI components grouped by area. `auth/` (auth.tsx, new-chat.tsx), `chat/` (chat.tsx, chat-list.tsx, search-chat.tsx, error.tsx, message-selector.tsx), `features/` (artifacts.tsx, exporter.tsx, mcp-market.tsx), `forms/` (mask.tsx, plugin.tsx), `layout/` (sidebar.tsx, home.tsx), `markdown/` (markdown.tsx), `realtime-chat/` (realtime-chat.tsx, realtime-config.tsx), `sd/` (sd.tsx, sd-panel.tsx, sd-sidebar.tsx, index.tsx), `settings/` (settings.tsx, model-config.tsx, tts-config.tsx), `voice-print/` (voice-print.tsx), `ui/` (barrel only) | Heavy use of `../` relative imports within `app/`; components import from `../../store`, `../../utils`, `../../locales`, `../../client`, `../../masks`, `../../icons` |
| `store/` | `index.ts` (barrel), `access.ts`, `chat.ts`, `config.ts`, `mask.ts`, `plugin.ts`, `prompt.ts`, `sd.ts`, `sync.ts`, `update.ts` | Zustand persist stores. `chat.ts` (sessions/messages/MCP/LLM orchestration, ~943 lines), `config.ts` (app config/defaults/theme/TTS/realtime), `access.ts` (per-provider API keys/URLs, validity checks, `/api/config` fetch), `mask.ts` (mask/prompt persona state), `plugin.ts` (OpenAPI plugin tool adapters), `prompt.ts` (Fuse.js prompt search), `sd.ts` (Stability image-gen task state), `sync.ts` (cloud sync WebDAV/Upstash), `update.ts` (version check, Tauri notifications) | `index.ts` re-exports every store (`export * from "./..."`). Stores import from `../utils` barrel → circular dep with `utils/sync.ts` |
| `utils/` | `index.ts` (barrel, ~32 re-exports), `audio.ts`, `storage.ts`, `hmac.ts`, `tauri.ts`, `store.ts`, `stream.ts`, `sync.ts`, `chat.ts`, `model.ts`, `model-detect.ts`, `token.ts`, `format.ts`, `merge.ts`, `clone.ts`, `object.ts`, `dom.ts`, `network.ts`, `hooks.ts`, `message.ts`, `api.ts`, `semver.ts`, `cloudflare.ts`, `auth-settings-events.ts`, `baidu.ts`, `tencent.ts`, `ms_edge_tts.ts`, `indexedDB-storage.ts`, `cloud/` (`index.ts`, `webdav.ts`, `upstash.ts`) | Shared utilities (~30 modules) + `cloud/` sync clients. `index.ts` is the backwards-compat barrel. `sync.ts` captures store `setState` via lazy getters (documents a `store -> utils -> store` module-eval cycle) | `utils/audio.ts`, `utils/storage.ts`, `utils/hmac.ts`, `utils/tauri.ts`, `utils/cloud/*` are migration targets in the refactoring plan |
| `lib/` | `audio.ts` | `AudioHandler` class (AudioContext recording/playback for real-time voice) | Single file; migration target says `src/app/utils/audio.ts` → `src/lib/audio` (note: there is already a `src/app/lib/audio.ts` and a `src/app/utils/audio.ts` — distinct, overlapping audio concerns) |
| `locales/` | `index.ts` + 21 locale files (`ar`, `bn`, `cs`, `da`, `de`, `en`, `es`, `fr`, `id`, `it`, `jp`, `ko`, `no`, `pt`, `ru`, `sk`, `tr`, `vi`, `zh`/`cn`, `tw`) | UI locale dictionaries + locale resolution (`getLang`, `changeLang`, `STT_LANG_MAP`). Every locale file imports `SubmitKey` from `../store/config` (boundary violation: i18n depends on app state) | Target: `src/i18n/locales` |
| `masks/` | `index.ts`, `build.ts`, `en.ts`, `cn.ts`, `tw.ts`, `bn.ts`, `typing.ts` | Built-in prompt masks + `build.ts` codegen script (run via `pnpm mask` / `tsx`; imports Node `fs`/`path`). Masks import from `../store/mask` and `../store` for types | Target: `src/i18n/masks`; `build.ts` path is referenced in `package.json` (`"mask": "npx tsx src/app/masks/build.ts"`) |
| `icons/` | ~55 SVG files + `nextgpt-bot.png`/`nextgpt-bot.svg` | SVG icons consumed via `@svgr/webpack` (delete.svg, send-white.svg, chat-settings.svg, mcp.svg, voice.svg, image.svg, etc.) | Imported relatively (`../../icons/...`) from components |
| `styles/` | `globals.scss`, `markdown.scss`, `highlight.scss`, `window.scss`, `animation.scss` | Global SCSS styles | Imported by `layout.tsx` |

> Note: `PROJECT_STRUCTURE.md` mentions `src/app/command.ts`, `typing.ts`, `polyfill.ts`, `global.d.ts`. `global.d.ts` does not exist on disk (stale doc reference). `command.ts` and `typing.ts` do exist at `src/app/` root.

### 2.2 `src/config/` — application configuration (already extracted from `src/app/config/` in Phase 2)

| File | Responsibility | Server/client boundary |
|------|----------------|------------------------|
| `server.ts` | `getServerSideConfig()`: env-var-driven server config (API keys for all providers, feature flags, `CODE`/`needCode`, model defaults, Vercel flags). Declares `NodeJS.ProcessEnv` augmentation. | Server-only — throws if `process` is undefined. Must never be imported by client components |
| `client.ts` | `getClientConfig()`: reads `config` meta tag in browser, falls back to `getBuildConfig()` on server | Isomorphic (browser + server) |
| `build.ts` | `getBuildConfig()`: version from `src-tauri/tauri.conf.json`, git commit info via `child_process.execSync`, `BUILD_MODE`/`BUILD_APP` | Server/Node-only (`require("child_process")`) |

### 2.3 `src/constants/` — shared constants (single source of truth; alias `@/constants`)

| File | Responsibility |
|------|----------------|
| `index.ts` | Barrel re-exporting `repo`, `endpoints`, `paths`, `providers`, `models`, `templates`, `tts`, `vision` |
| `models.ts` | `DEFAULT_MODELS` (all providers, ~450 entries with `provider` metadata), `SUMMARIZE_MODEL`, `GEMINI_SUMMARIZE_MODEL`, `DEEPSEEK_SUMMARIZE_MODEL`, `KnowledgeCutOffDate` | Target: `src/domain/models` |
| `providers.ts` | `ServiceProvider` enum, `GoogleSafetySettingsThreshold`, `ModelProvider` enum | Target: `src/providers/registry` |
| `endpoints.ts`, `paths.ts`, `repo.ts`, `templates.ts`, `tts.ts`, `vision.ts` | API paths, repo URLs, input templates, TTS defaults, vision model list |

### 2.4 `src/features/mcp/` — MCP feature module (already extracted in Phase 3; self-contained, no app-internal imports)

| File | Responsibility |
|------|----------------|
| `client.ts` | MCP SDK client lifecycle (`createClient`, `removeClient`, `listTools`, `executeRequest`). Lazy-loads `@modelcontextprotocol/sdk` via `eval("require(...)")` so bundlers exclude it from client bundles. `Client` used as a type but only imported as a value (pre-existing TS error) |
| `actions.ts` | Server actions: `initializeMcpSystem`, `add/remove/pause/resume/restartMcpServer`, `getAllTools`, `executeMcpAction`, `getMcpConfigFromFile`, `updateMcpConfig`, `isMcpEnabled`. Uses Node `fs`/`path`/`os`, `process.env.CODE`, `spark-md5`. Server-only | Treated as server-side despite living under a feature folder |
| `types.ts` | MCP message/request/response schemas (zod), `ServerConfig`, `McpClientData`, `PresetServer`, `ListToolsResponse`. Three zod calls with wrong arg counts (pre-existing TS error) | |
| `utils.ts` | `isMcpJson`, `extractMcpJson` regex helpers | |
| `logger.ts` | `MCPClientLogger` | |
| `mcp_config.default.json` | Template/example config only (not read at runtime) | |

### 2.5 `src/shared/` — cross-feature code (only `ui/` exists; target for shared UI/storage/hooks)

| Subdirectory | Files | Responsibility |
|--------------|-------|----------------|
| `ui/` | `ui-lib.tsx` (+module.scss), `button.tsx` (+module.scss), `emoji.tsx`, `input-range.tsx` (+module.scss) | UI primitives: `Popover`, `Card`, `ListItem`, `List`, `Modal`/`showModal`, `Toast`/`showToast`, `Input`, `PasswordInput`, `Select`, `showConfirm`, `showPrompt`, `showImageModal`, `Selector`, `FullScreen`, `IconButton`, `Avatar`. `ui-lib.tsx` imports icons from `../../app/icons/...` and Locale from `../../app/locales` (couples shared UI back into `app/`) | Target: merge into `src/components/ui` |

### 2.6 Directories referenced by the proposal that do NOT exist yet

| Target path | Exists? | Planned contents (per refactoring proposal) |
|-------------|---------|---------------------------------------------|
| `src/providers/` | No | Provider registry + adapters (from `src/constants/providers.ts`, `src/app/api` provider impls) |
| `src/server/` | No | Server-only layer (config, auth, provider credentials, Node APIs) |
| `src/domain/` | No | Domain models (from `src/constants/models.ts`) |
| `src/i18n/` | No | Locales + masks (from `src/app/locales`, `src/app/masks`) |
| `src/lib/` | No | Audio, storage, crypto (from `src/app/utils/audio.ts`, `storage.ts`, `hmac.ts`) |
| `src/lib/platform/` | No | Desktop Tauri abstraction (from `src/app/utils/tauri.ts`) |

---

## 3. `src-tauri/` — Tauri desktop shell

| Path | Type | Responsibility | Generated? |
|------|------|----------------|------------|
| `src-tauri/tauri.conf.json` | file | yes | Tauri config (package version read by `src/config/build.ts`) |
| `src-tauri/Cargo.toml` | file | yes | Rust manifest |
| `src-tauri/Cargo.lock` | file | yes | Rust lockfile |
| `src-tauri/build.rs` | file | yes | Build script |
| `src-tauri/src/main.rs` | file | yes | Rust backend entry |
| `src-tauri/src/stream.rs` | file | yes | Rust stream handling |
| `src-tauri/icons/` | dir | yes | Tauri app icons |
| `src-tauri/target/` | dir | no (generated) | Rust compile output |
| `src-tauri/.gitignore` | file | yes | |

`cargo check` is blocked on this machine by missing system `libsoup-2.4` (documented in existing `REFACTORING_PLAN.md`).

---

## 4. `public/` — static assets (browser-served, version-controlled)

`android-chrome-192x192.png`, `android-chrome-512x512.png`, `apple-touch-icon.png`, `favicon-*.png`, `favicon.ico`, `macos.png`, `robots.txt`, `site.webmanifest`, `serviceWorker.js`, `serviceWorkerRegister.js`, `audio-processor.js` (AudioWorklet for real-time voice), `masks.json`, `plugins.json`, `prompts.json`, `plugins/` subdir.

---

## 5. `tests/` — Jest suite (version-controlled)

Organized by area: `api/` (limit-number, get-client-config, modal-config-validator, get-bearer-token, chat-command-prefix, tts-config-validator), `client/` (valid-string), `mcp/` (extract-mcp-json, mcp-actions-require-enabled, mcp-config-path, is-mcp-json, mcp-client-environment), `models/` (model-helpers, model-provider, collect-model-table, model-available-in-server, collect-model-with-default, model-available, is-gpt4-model), `store/` (create-message), `utils/` (hmac-sign, hmac-hash, hmac-hex, vision-model-checker, platform-detection, estimate-token-length, cloudflare, safe-local-storage, adapter, get-operation-id, object-utils, format, utils, sum-module, prosody-options, format-chunks, merge).

Baseline: 37/37 suites, 180/180 tests pass (`pnpm test:ci`).

---

## 6. `scripts/` — helper scripts (version-controlled)

`scripts/bootstrap/`, `scripts/ci/`, `scripts/dev/`, `scripts/setup.sh`, `scripts/proxychains.template.conf`, `scripts/.gitignore`. Includes `fetch-prompts.mjs` (invoked by `pnpm prompts`) and `init-proxy.sh`.

---

## 7. `docs/` — documentation (version-controlled)

`architecture/` (this audit; existing `PROJECT_STRUCTURE.md`, `REFACTORING_PLAN.md`), `assets/`, `deployment/`, `faq/`, `guides/`, `translations/`.

---

## 8. Generated artifacts (NOT version-controlled)

| Artifact | Location | Produced by | Gitignored? |
|----------|----------|-------------|-------------|
| `tsconfig.tsbuildinfo` | repo root | `tsc --noEmit` (incremental) | yes |
| `.next/` | repo root | `next build` / `next dev` | yes |
| `out/` | repo root | `next export` | yes |
| `.swc/` | repo root | SWC compiler cache | yes |
| `target/` | `src-tauri/target/` | `cargo build` / Tauri | yes |

---

## 9. Version-controlled vs generated — summary

Version-controlled (committed): `src/`, `src-tauri/src/`, `src-tauri/{Cargo.toml,Cargo.lock,build.rs,tauri.conf.json,icons}`, `public/`, `tests/`, `scripts/`, `docs/`, root config files (`package.json`, `tsconfig.json`, `next.config.mjs`, `vercel.json`, `jest.config.ts`, `jest.setup.ts`, `.eslintrc.json`, `.prettierrc.js`, `Dockerfile`, `docker-compose.yml`, `README.md`, `LICENSE`, `.env.template`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`).

Generated (gitignored, do not commit): `out/`, `target/`, `.next/`, `.swc/`, `tsconfig.tsbuildinfo`, `.env.local` (local overrides).
