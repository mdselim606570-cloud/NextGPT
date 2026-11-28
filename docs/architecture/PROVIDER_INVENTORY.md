# Provider Inventory

**Repository:** NextGPT (`/workspaces/NextGPT`)
**Audit type:** Read-only Phase 0 baseline audit (no source files modified)

This document inventories every AI provider integration: server-side API route modules under `src/app/api/` and client-side platform adapters under `src/app/client/platforms/`. For each provider it notes the auth method, capabilities, contract consistency, request/response shape, error handling, and whether the file is a Next.js `route.ts` (an actual HTTP endpoint) or an internal module.

---

## 1. Layout of provider code

### Server side — `src/app/api/`

| File | Kind | Role |
|------|------|------|
| `openai.ts` | internal module (exports `handle`) | OpenAI / Azure-compatible chat proxy route handler |
| `anthropic.ts` | internal module (exports `handle`) | Anthropic Claude proxy route handler |
| `google.ts` | internal module (exports `handle`) | Google Gemini proxy route handler |
| `azure.ts` | internal module (exports `handle`) | Azure OpenAI proxy route handler |
| `deepseek.ts` | internal module (exports `handle`) | DeepSeek proxy route handler |
| `moonshot.ts` | internal module (exports `handle`) | Moonshot (Kimi) proxy route handler |
| `siliconflow.ts` | internal module (exports `handle`) | SiliconFlow proxy route handler |
| `tencent/route.ts` | Next.js `route.ts` (GET/POST) | Tencent Hunyuan proxy route endpoint |
| `xai.ts` | internal module (exports `handle`) | xAI Grok proxy route handler |
| `baidu.ts` | internal module (exports `handle`) | Baidu Ernie proxy route handler |
| `bytedance.ts` | internal module (exports `handle`) | ByteDance Doubao proxy route handler |
| `glm.ts` | internal module (exports `handle`) | ChatGLM / Zhipu proxy route handler |
| `iflytek.ts` | internal module (exports `handle`) | iFlytek Spark proxy route handler |
| `stability.ts` | internal module (exports `handle`) | Stability AI image-generation proxy route handler |
| `alibaba.ts` | internal module (exports `handle`) | Alibaba Qwen proxy route handler |
| `proxy.ts` | internal module (exports `handle`) | Generic forward proxy (arbitrary base URL) |
| `302ai.ts` | internal module (exports `handle`) | 302.AI proxy route handler |
| `common.ts` | internal module (no route) | Shared `requestOpenai()` helper used by OpenAI-compatible providers |
| `auth.ts` | internal module (no route) | Shared `auth(req, modelProvider)` access-control helper |
| `config/route.ts` | Next.js `route.ts` (GET/POST) | Public runtime config endpoint (`DangerConfig`) |
| `[provider]/[...path]/route.ts` | Next.js `route.ts` (GET/POST) | Catch-all provider dispatcher; routes to the provider-specific `handle` |
| `artifacts/route.ts` | Next.js `route.ts` | Artifacts endpoint |
| `webdav/[...path]/route.ts` | Next.js `route.ts` | WebDAV sync endpoint |
| `upstash/[action]/[...key]/route.ts` | Next.js `route.ts` | Upstash sync endpoint |

All server provider modules import `getServerSideConfig` from `@/config/server` (server-only). Most import `auth` from `./auth`. Most import `prettyObject` from `@/app/utils/format` and `isModelNotavailableInServer` from `@/app/utils/model`. All follow the same pattern: `handle(req, { params })` → auth → upstream `fetch` → return `NextResponse` / `Response`. All export `runtime = "edge"` where applicable.

### Client side — `src/app/client/platforms/`

| File | Class | Role |
|------|-------|------|
| `openai.ts` | `ChatGPTApi implements LLMApi` | OpenAI/Azure chat + DALL-E 3 image + TTS + usage |
| `anthropic.ts` | `ClaudeApi implements LLMApi` | Anthropic Claude chat |
| `google.ts` | `GeminiProApi implements LLMApi` | Google Gemini chat |
| `baidu.ts` | `ErnieApi implements LLMApi` | Baidu Ernie chat |
| `bytedance.ts` | `DoubaoApi implements LLMApi` | ByteDance Doubao chat |
| `alibaba.ts` | `QwenApi implements LLMApi` | Alibaba Qwen chat |
| `tencent.ts` | `HunyuanApi implements LLMApi` | Tencent Hunyuan chat |
| `moonshot.ts` | `MoonshotApi implements LLMApi` | Moonshot Kimi chat |
| `iflytek.ts` | `SparkApi implements LLMApi` | iFlytek Spark chat |
| `deepseek.ts` | `DeepSeekApi implements LLMApi` | DeepSeek chat |
| `xai.ts` | `XAIApi implements LLMApi` | xAI Grok chat |
| `glm.ts` | `ChatGLMApi implements LLMApi` | ChatGLM chat |
| `siliconflow.ts` | `SiliconflowApi implements LLMApi` | SiliconFlow chat |
| `ai302.ts` | `Ai302Api implements LLMApi` | 302.AI chat |

All client platform classes implement the `LLMApi` abstract contract defined in `src/app/client/api.ts`:
```ts
abstract class LLMApi {
  abstract chat(options: ChatOptions): Promise<void>;
  abstract speech(options: SpeechOptions): Promise<ArrayBuffer>;
  abstract usage(): Promise<LLMUsage>;
  abstract models(): Promise<LLMModel[]>;
}
```

### The client contract — `src/app/client/api.ts`

| Export | Kind | Description |
|--------|------|-------------|
| `LLMApi` | abstract class | The consistent contract all 14 client providers implement (`chat`, `speech`, `usage`, `models`) |
| `ClientApi` | class | Factory: constructor takes `ModelProvider`, instantiates the matching platform adapter; exposes `.llm: LLMApi` plus `share()`, `prompts()`, `masks()` stubs |
| `getClientApi(provider: ServiceProvider)` | function | Factory function mapping `ServiceProvider` → `ClientApi` (used by `src/app/store/chat.ts`) |
| `getHeaders()` | function | Builds request headers from `useAccessStore` / `useChatStore` state (per-provider API key selection) |
| `getBearerToken()`, `validString()` | helpers | Auth-header helpers |
| `ChatOptions`, `SpeechOptions`, `LLMConfig`, `LLMModel`, `LLMUsage`, `MultimodalContent`, `RequestMessage` | interfaces | Shared request/response shapes |

**Contract consistency:** The 14 client adapters all implement `LLMApi`, so there IS a consistent contract at the TypeScript level. However, implementation detail diverges (e.g. OpenAI handles DALL-E 3 image payloads and O1/O3/GPT-5 reasoning models specially; each platform builds its own request payload). Error handling is per-adapter (OpenAI throws `Locale.Error.Unauthorized` on 401; others vary).

---

## 2. Per-provider detail

### OpenAI — `src/app/api/openai.ts` + `src/app/client/platforms/openai.ts`

- **Server route (`api/openai.ts`):** `handle(req, { params })`. Allows only paths in `OpenaiPath` set. Auth via `auth(req, ModelProvider.GPT)`. Proxies to `serverConfig.baseUrl || OPENAI_BASE_URL` via `requestOpenai()` in `common.ts`. Filters models when `disableGPT4`. Returns `NextResponse`. Not a `route.ts` file itself (invoked by the catch-all `[provider]/[...path]/route.ts`).
- **Client (`client/platforms/openai.ts`):** `ChatGPTApi` (also used for Azure). `"use client"`. Supports chat (streaming & non-streaming), DALL-E 3 image generation (`response_format: "b64_json"`), TTS (`speech`), usage (usage/subs endpoints), model listing. Handles O1/O3/GPT-5 reasoning-model quirks (`max_completion_tokens`, developer role). Uses `getHeaders()` and a custom `fetch` from `@/app/utils/stream` (SSE with tool-calling parsing via `streamWithThink`). Auth: bearer token from `getHeaders()`; Azure uses `api-key` header.
- **Contract:** Implements full `LLMApi` (chat, speech, usage, models). `disableListModels = true` by default (returns `DEFAULT_MODELS` slice).

### Azure — `src/app/api/azure.ts` + `client/platforms/openai.ts` (shared class)

- **Server route:** Same pattern as OpenAI; distinguishes Azure by `azure/deployments` path, uses `azureApiKey` as `api-key` header, `azureApiVersion` query param, deployment-name substitution from `AZURE_URL`.
- **Client:** `ChatGPTApi` is shared with OpenAI (`"azure and openai, using same models"`). Azure chat path built via `Azure.ChatPath(deployName, apiVersion)`; image via `Azure.ImagePath`. `getAuthHeader()` returns `"api-key"` for Azure.
- **Auth:** Azure API key via `api-key` header (not `Authorization: Bearer`).

### Google (Gemini) — `src/app/api/google.ts` + `client/platforms/google.ts`

- **Server route:** Same pattern; uses `googleApiKey` as `x-goog-api-key` header.
- **Client:** `GeminiProApi`. `getAuthHeader()` returns `"x-goog-api-key"`; bearer token with `noBearer: true`.
- **Auth:** `x-goog-api-key` header.

### Anthropic (Claude) — `src/app/api/anthropic.ts` + `client/platforms/anthropic.ts`

- **Server route:** Same pattern; allows `Anthropic.ChatPath` / `ChatPath1`. Uses `anthropicApiKey`.
- **Client:** `ClaudeApi`. `getAuthHeader()` returns `"x-api-key"`; bearer token with `noBearer: true`.
- **Auth:** `x-api-key` header.

### Baidu (Ernie) — `src/app/api/baidu.ts` + `client/platforms/baidu.ts`

- **Server route:** Same pattern. Uses `baiduApiKey` + `baiduSecretKey`.
- **Client:** `ErnieApi`. Note: "when using baidu api in app, not set auth header" (`getHeaders` returns early if `isBaidu && clientConfig?.isApp`). Baidu uses a signature/auth scheme (API key + secret key) rather than bearer.
- **Auth:** Custom (API key + secret key), header suppressed in Tauri app mode.

### ByteDance (Doubao) — `src/app/api/bytedance.ts` + `client/platforms/bytedance.ts`

- **Server route:** Same pattern. Uses `bytedanceApiKey`.
- **Client:** `DoubaoApi`. Bearer token via `getHeaders()`.
- **Auth:** Bearer.

### Alibaba (Qwen) — `src/app/api/alibaba.ts` + `client/platforms/alibaba.ts`

- **Server route:** Same pattern. Uses `alibabaApiKey`.
- **Client:** `QwenApi`. Defines `MultimodalContentForAlibaba` (`text`/`image`) — a distinct multimodal shape from the standard `MultimodalContent`.
- **Auth:** Bearer.

### Tencent (Hunyuan) — `src/app/api/tencent/route.ts` + `client/platforms/tencent.ts`

- **Server route:** IS a `route.ts` file (GET/POST). Uses `tencentSecretKey` + `tencentSecretId` (Tencent Cloud signature scheme: SecretId/SecretKey, not bearer).
- **Client:** `HunyuanApi`.
- **Auth:** Custom signature (SecretId/SecretKey).

### Moonshot (Kimi) — `src/app/api/moonshot.ts` + `client/platforms/moonshot.ts`

- **Server route:** Same pattern. Uses `moonshotApiKey`.
- **Client:** `MoonshotApi`. Bearer token.
- **Auth:** Bearer.

### SiliconFlow — `src/app/api/siliconflow.ts` + `client/platforms/siliconflow.ts`

- **Server route:** Same pattern. Uses `siliconFlowApiKey`.
- **Client:** `SiliconflowApi`. Bearer token.
- **Auth:** Bearer.

### xAI (Grok) — `src/app/api/xai.ts` + `client/platforms/xai.ts`

- **Server route:** Same pattern. Uses `xaiApiKey`.
- **Client:** `XAIApi`. Bearer token.
- **Auth:** Bearer.

### ChatGLM / Zhipu — `src/app/api/glm.ts` + `client/platforms/glm.ts`

- **Server route:** Same pattern. Uses `chatglmApiKey`.
- **Client:** `ChatGLMApi`. Bearer token.
- **Auth:** Bearer.

### DeepSeek — `src/app/api/deepseek.ts` + `client/platforms/deepseek.ts`

- **Server route:** Same pattern. Uses `deepseekApiKey`.
- **Client:** `DeepSeekApi`. Bearer token.
- **Auth:** Bearer.

### iFlytek (Spark) — `src/app/api/iflytek.ts` + `client/platforms/iflytek.ts`

- **Server route:** Same pattern. Uses `iflytekApiKey + ":" + iflytekApiSecret`.
- **Client:** `SparkApi`. Auth header value is `iflytekApiKey:iflytekApiSecret`.
- **Auth:** Custom (apiKey:apiSecret).

### Stability AI — `src/app/api/stability.ts` + (image generation, `sd/` components)

- **Server route:** Same pattern; uses `stabilityApiKey`. `isStability = !!process.env.STABILITY_API_KEY` in server config. `ModelProvider.Stability` case in `auth.ts`.
- **Client:** No dedicated `client/platforms/stability.ts` was found in the platforms list (14 platforms: openai, anthropic, google, baidu, bytedance, alibaba, tencent, moonshot, iflytek, deepseek, xai, glm, siliconflow, ai302). Image generation is handled via `src/app/components/sd/` (SD panel/store) calling the Stability API route directly (`src/app/store/sd.ts` calls `ApiPath.Stability` / `Stability.GeneratePath` with form data). So Stability is **server-route only** on the client side (no `LLMApi` adapter; `speech`/`models` not applicable — it is image-only).
- **Capabilities:** Image generation only (no chat/streaming/audio/embeddings via client adapter).
- **Auth:** Bearer (`stabilityApiKey`).

### 302.AI — `src/app/api/302ai.ts` + `client/platforms/ai302.ts`

- **Server route:** Same pattern. Uses `ai302ApiKey` / `AI302_BASE_URL`. Model-availability filtering via `isModelNotavailableInServer`.
- **Client:** `Ai302Api`. Bearer token.
- **Auth:** Bearer.

### Proxy — `src/app/api/proxy.ts` (server only)

- **Server route:** Generic forward proxy. Reads `x-base-url` header, forwards method/body/headers to an arbitrary upstream. Special-cases `api.openai.com` to inject `serverConfig.apiKey`. No dedicated client platform (consumed by `FunctionToolService` in `store/plugin.ts` as `/api/proxy` for OpenAPI plugin base URLs).
- **Auth:** Pass-through (`x-base-url`); injects OpenAI system key for openai.com targets.

---

## 3. Auth method summary

| Provider | Server auth header | Client auth header | Key source |
|----------|-------------------|--------------------|------------|
| OpenAI | `Authorization: Bearer` | `Authorization: Bearer` | `apiKey` / system key |
| Azure | `api-key` | `api-key` | `azureApiKey` |
| Google | `x-goog-api-key` | `x-goog-api-key` | `googleApiKey` |
| Anthropic | `x-api-key` | `x-api-key` | `anthropicApiKey` |
| Baidu | custom (key+secret) | custom (suppressed in app mode) | `baiduApiKey`/`baiduSecretKey` |
| ByteDance | `Authorization: Bearer` | `Authorization: Bearer` | `bytedanceApiKey` |
| Alibaba | `Authorization: Bearer` | `Authorization: Bearer` | `alibabaApiKey` |
| Tencent | custom (SecretId/SecretKey) | — | `tencentSecretKey`/`tencentSecretId` |
| Moonshot | `Authorization: Bearer` | `Authorization: Bearer` | `moonshotApiKey` |
| SiliconFlow | `Authorization: Bearer` | `Authorization: Bearer` | `siliconFlowApiKey` |
| xAI | `Authorization: Bearer` | `Authorization: Bearer` | `xaiApiKey` |
| ChatGLM | `Authorization: Bearer` | `Authorization: Bearer` | `chatglmApiKey` |
| DeepSeek | `Authorization: Bearer` | `Authorization: Bearer` | `deepseekApiKey` |
| iFlytek | custom (`key:secret`) | custom (`key:secret`) | `iflytekApiKey`+`iflytekApiSecret` |
| Stability | `Authorization: Bearer` | (server route only) | `stabilityApiKey` |
| 302.AI | `Authorization: Bearer` | `Authorization: Bearer` | `ai302ApiKey` |
| Proxy | pass-through + system key for openai.com | (tool proxy) | `serverConfig.apiKey` |

`src/app/api/auth.ts` centralizes access control: parses `Authorization` header (`Bearer ` or `ACCESS_CODE_PREFIX`), checks `serverConfig.needCode` / hashed `CODE`, enforces `hideUserApiKey`, and injects the system API key per `ModelProvider` when the user supplies none.

---

## 4. Capability matrix

| Provider | Chat | Streaming | Image | Audio/TTS | Embeddings | Notes |
|----------|------|-----------|-------|-----------|------------|-------|
| OpenAI | yes | yes | yes (DALL-E 3) | yes (TTS) | no | Full `LLMApi`; O1/O3/GPT-5 quirks |
| Azure | yes | yes | yes (DALL-E 3) | yes | yes | Shares `ChatGPTApi` class |
| Google | yes | yes | no | yes | no | `x-goog-api-key` |
| Anthropic | yes | yes | no | yes | no | `x-api-key` |
| Baidu | yes | yes | no | yes | no | key+secret; header suppressed in app |
| ByteDance | yes | yes | no | yes | no | |
| Alibaba | yes | yes | no | yes | no | distinct multimodal shape |
| Tencent | yes | yes | no | yes | no | SecretId/SecretKey |
| Moonshot | yes | yes | no | yes | no | |
| SiliconFlow | yes | yes | no | yes | no | |
| xAI | yes | yes | no | yes | no | |
| ChatGLM | yes | yes | no | yes | no | |
| DeepSeek | yes | yes | no | yes | no | |
| iFlytek | yes | yes | no | yes | no | key:secret |
| Stability | no | no | yes | no | no | Server route + `sd/` components; no client `LLMApi` |
| 302.AI | yes | yes | no | yes | no | |
| Proxy | pass-through | pass-through | pass-through | pass-through | pass-through | Generic forward proxy |

All 14 client platform adapters implement `chat` and `speech`; only OpenAI/Azure meaningfully implement image (DALL-E 3) in `extractMessage`; `usage` and `models` vary (OpenAI `disableListModels = true` by default).

---

## 5. route.ts (HTTP endpoint) vs internal module

- **Actual `route.ts` files (Next.js route endpoints):** `src/app/api/config/route.ts`, `src/app/api/[provider]/[...path]/route.ts` (catch-all dispatcher), `src/app/api/tencent/route.ts`, `src/app/api/artifacts/route.ts`, `src/app/api/webdav/[...path]/route.ts`, `src/app/api/upstash/[action]/[...key]/route.ts`.
- **Internal modules (export `handle`, invoked by the catch-all dispatcher):** `openai.ts`, `anthropic.ts`, `google.ts`, `azure.ts`, `deepseek.ts`, `moonshot.ts`, `siliconflow.ts`, `xai.ts`, `baidu.ts`, `bytedance.ts`, `glm.ts`, `iflytek.ts`, `stability.ts`, `alibaba.ts`, `proxy.ts`, `302ai.ts`, plus shared `common.ts` and `auth.ts`.

The catch-all `[provider]/[...path]/route.ts` maps `ApiPath.*` values to provider `handle` functions. Tencent has both a dedicated `tencent/route.ts` AND is referenced in the dispatcher comment (`// case ApiPath.Tencent: using "/api/tencent"`), meaning Tencent is served by its own route file rather than the catch-all. Note: `stable Diffusion` image generation is not a separate API route; it goes through the Stability provider route.
