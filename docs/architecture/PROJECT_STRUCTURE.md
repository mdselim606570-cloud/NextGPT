# Project Structure

This document describes the actual directory layout of the repository after the
first refactoring pass, the responsibility of each area, and the intended
dependency boundaries.

## Repository layout

```
.
├── CODE_OF_CONDUCT.md
├── Dockerfile                  # Docker build entry point (kept at root)
├── LICENSE
├── README.md                   # Main documentation (English)
├── docker-compose.yml          # Compose deployment (kept at root)
├── docs/
│   ├── architecture/           # This documentation
│   ├── assets/                 # Images used by documentation
│   ├── deployment/             # Deployment guides (vercel-*, bt-*, cloudflare-*)
│   ├── faq/                    # FAQ documents per locale
│   ├── guides/                 # Contributor guides (translation, user manual)
│   └── translations/           # Translated READMEs (README_CN/JA/KO.md)
├── jest.config.ts
├── jest.setup.ts
├── next-env.d.ts
├── next.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── public/                     # Static assets and browser-served scripts
├── scripts/                    # Bootstrap, dev and CI helper scripts
├── src/
│   ├── app/                    # Next.js App Router + application code
│   ├── config/                 # Application configuration (build/client/server)
│   ├── constants/              # Shared constant definitions
│   └── features/
│       └── mcp/                # MCP (Model Context Protocol) integration
├── src-tauri/                  # Tauri desktop shell and Rust backend
├── tests/                      # Jest test suite (api, client, components, mcp, ...)
├── tsconfig.json
└── vercel.json
```

## `src/` module responsibilities

### `src/app/` — Next.js application

Next.js App Router entry points live here (`layout.tsx`, `page.tsx`,
`api/**/route.ts`). The directory still contains substantial application code
that is planned to migrate to feature modules (see
`REFACTORING_PLAN.md`).

| Path | Contents |
| ---- | -------- |
| `src/app/api/` | Route handlers (`route.ts`) plus shared server helpers and provider proxy modules (`openai.ts`, `anthropic.ts`, `google.ts`, `azure.ts`, `proxy.ts`, `common.ts`, `auth.ts`, ...) |
| `src/app/api/[provider]/[...path]/route.ts` | Generic catch-all provider proxy route |
| `src/app/client/` | Browser-side API client (`api.ts`, `controller.ts`) and per-provider client adapters (`platforms/*.ts`) |
| `src/app/components/` | React components grouped by area: `auth`, `chat`, `settings`, `features` (artifacts, exporter, mcp-market), `forms`, `layout`, `markdown`, `realtime-chat`, `sd` (image generation), `ui`, `voice-print` |
| `src/app/store/` | Zustand stores: `access`, `chat`, `config`, `mask`, `plugin`, `prompt`, `sd`, `sync`, `update`, plus `index.ts` barrel |
| `src/app/utils/` | Shared utilities (~30 modules) plus `cloud/` (upstash, webdav) |
| `src/app/locales/` | UI locale dictionaries (21 locales) and locale resolution logic |
| `src/app/masks/` | Built-in prompt masks plus the `build.ts` codegen script (`pnpm mask`) |
| `src/app/styles/` | Global SCSS (globals, markdown, highlight, window, animation) |
| `src/app/icons/` | SVG icons consumed via `@svgr/webpack` |
| `src/app/lib/` | Small shared helpers (`audio.ts`) |
| `src/app/command.ts`, `typing.ts`, `polyfill.ts`, `global.d.ts` | App-level commands, shared types, polyfills, global declarations |

### `src/config/` — application configuration

- `build.ts` — build-time config (version from `src-tauri/tauri.conf.json`,
  git commit info, `BUILD_MODE`/`BUILD_APP` env handling). Server-only.
- `client.ts` — `getClientConfig()`: reads the `config` meta tag in the
  browser, falls back to `getBuildConfig()` on the server.
- `server.ts` — `getServerSideConfig()`: env-var driven server config
  (API keys, feature flags, model defaults). **Server-only — must never be
  imported by client components.**

All imports use the `@/config/<name>` alias.

### `src/constants/` — shared constants

`endpoints`, `models`, `paths`, `providers`, `repo`, `templates`, `tts`,
`vision`, `index`. Imported via the `@/constants` alias. This is the single
source of truth for constants; the former `src/app/constant.ts` re-export
shim has been removed.

### `src/features/mcp/` — MCP feature module

Self-contained Model Context Protocol integration: `client.ts` (SDK client
management), `actions.ts` (server actions), `types.ts`, `utils.ts`,
`logger.ts`, `mcp_config.default.json` (template/example only — it is not
read at runtime).

**Config resolution** (`resolveMcpConfigPath()` in `actions.ts`):

1. `MCP_CONFIG_PATH` env var (absolute path recommended).
2. Legacy `<cwd>/app/mcp/mcp_config.json`, only when the file already exists
   (preserves configs created by earlier versions).
3. Per-user config dir: `%APPDATA%/nextgpt` on Windows, otherwise
   `$XDG_CONFIG_HOME/nextgpt` (default `~/.config/nextgpt`).

The resolved file is `mcp_config.json`; when missing or unreadable,
`getMcpConfigFromFile` falls back to `DEFAULT_MCP_CONFIG` in memory. Writes
(`updateMcpConfig`) create the parent directory as needed and never overwrite
on startup. Covered by `tests/mcp/mcp-config-path.test.ts`.

> Note: `client.ts` lazy-loads the CJS MCP SDK via `eval("require(...)")` so
> bundlers do not pull it into client bundles. Jest runs as ESM, so the MCP
> test provides `createRequire` explicitly.

## Alias map

`tsconfig.json` defines `@/*` → `./src/*`. `jest.config.ts` maps the same
alias to `<rootDir>/src/$1`.

## Boundary rules (target)

- `src/app/` should stay thin: routes, layouts, pages and route entry points.
- Business features belong in `src/features/<name>/` (components, hooks,
  stores, services, types).
- Server-only code (provider credentials, Node APIs, `fs`, server config)
  must live outside client-reachable modules. Today most of it still sits in
  `src/app/api/` and `src/features/mcp/`; the target is `src/server/`.
- `src/shared/` is for genuinely cross-feature code (UI primitives, hooks,
  storage, types). Nothing has been migrated there yet.
- `src/platform/` will isolate browser vs Tauri integrations (today mostly
  `src/app/utils/tauri.ts` and `src/app/utils/cloud/`).

## Known coupling that blocks further moves

- `src/app/locales/*.ts` import `../store/config` (`SubmitKey`) and
  `../config/client` (`getClientConfig`). Moving locales into `src/shared/`
  would make shared code depend on app state — the dependency must be
  inverted first.
- `src/app/utils/sync.ts` ↔ `src/app/store/*` is a circular dependency
  (store modules import the `../utils` barrel which re-exports `sync.ts`).
  `LocalStateSetters` uses lazy getters to defer store access past module
  evaluation; the cycle itself still exists and should be broken properly
  (e.g. stores should not import the utils barrel) before utils are split.
- `src/app/masks/*.ts` import `../store/mask` and `../store` for types, and
  `build.ts` is a Node script run via `tsx`. Keep in place until the mask
  store is decoupled.
- `src/app/utils/cloud/{upstash,webdav}.ts` mix client and server
  responsibilities; they need inspection before moving to `src/features/sync`
  or `src/platform/`.
