import { getClientConfig } from "@/config/client";
import {
  ACCESS_CODE_PREFIX,
  ModelProvider,
  ServiceProvider,
} from "@/constants";
import {
  ChatMessageTool,
  ChatMessage,
  ModelType,
  useAccessStore,
  useChatStore,
} from "../store";
import { ChatGPTApi, DalleRequestPayload } from "./platforms/openai";
import { GeminiProApi } from "./platforms/google";
import { ClaudeApi } from "./platforms/anthropic";
import { ErnieApi } from "./platforms/baidu";
import { DoubaoApi } from "./platforms/bytedance";
import { QwenApi } from "./platforms/alibaba";
import { HunyuanApi } from "./platforms/tencent";
import { MoonshotApi } from "./platforms/moonshot";
import { SparkApi } from "./platforms/iflytek";
import { DeepSeekApi } from "./platforms/deepseek";
import { XAIApi } from "./platforms/xai";
import { ChatGLMApi } from "./platforms/glm";
import { SiliconflowApi } from "./platforms/siliconflow";
import { Ai302Api } from "./platforms/ai302";

export const ROLES = ["system", "user", "assistant"] as const;
export type MessageRole = (typeof ROLES)[number];

export const Models = ["gpt-3.5-turbo", "gpt-4"] as const;
export const TTSModels = ["tts-1", "tts-1-hd"] as const;
export type ChatModel = ModelType;

export interface MultimodalContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface MultimodalContentForAlibaba {
  text?: string;
  image?: string;
}

export interface RequestMessage {
  role: MessageRole;
  content: string | MultimodalContent[];
}

export interface LLMConfig {
  model: string;
  providerName?: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
  size?: DalleRequestPayload["size"];
  quality?: DalleRequestPayload["quality"];
  style?: DalleRequestPayload["style"];
}

export interface SpeechOptions {
  model: string;
  input: string;
  voice: string;
  response_format?: string;
  speed?: number;
  onController?: (controller: AbortController) => void;
}

export interface ChatOptions {
  messages: RequestMessage[];
  config: LLMConfig;

  onUpdate?: (message: string, chunk: string) => void;
  onFinish: (message: string, responseRes: Response) => void;
  onError?: (err: Error) => void;
  onController?: (controller: AbortController) => void;
  onBeforeTool?: (tool: ChatMessageTool) => void;
  onAfterTool?: (tool: ChatMessageTool) => void;
}

export interface LLMUsage {
  used: number;
  total: number;
}

export interface LLMModel {
  name: string;
  displayName?: string;
  available: boolean;
  provider: LLMModelProvider;
  sorted: number;
}

export interface LLMModelProvider {
  id: string;
  providerName: string;
  providerType: string;
  sorted: number;
}

export abstract class LLMApi {
  abstract chat(options: ChatOptions): Promise<void>;
  abstract speech(options: SpeechOptions): Promise<ArrayBuffer>;
  abstract usage(): Promise<LLMUsage>;
  abstract models(): Promise<LLMModel[]>;
}

type ProviderName = "openai" | "azure" | "claude" | "palm";

interface Model {
  name: string;
  provider: ProviderName;
  ctxlen: number;
}

interface ChatProvider {
  name: ProviderName;
  apiConfig: {
    baseUrl: string;
    apiKey: string;
    summaryModel: Model;
  };
  models: Model[];

  chat: () => void;
  usage: () => void;
}

const PROVIDER_FACTORIES: Partial<Record<ModelProvider, () => LLMApi>> = {
  [ModelProvider.GeminiPro]: () => new GeminiProApi(),
  [ModelProvider.Claude]: () => new ClaudeApi(),
  [ModelProvider.Ernie]: () => new ErnieApi(),
  [ModelProvider.Doubao]: () => new DoubaoApi(),
  [ModelProvider.Qwen]: () => new QwenApi(),
  [ModelProvider.Hunyuan]: () => new HunyuanApi(),
  [ModelProvider.Moonshot]: () => new MoonshotApi(),
  [ModelProvider.Iflytek]: () => new SparkApi(),
  [ModelProvider.DeepSeek]: () => new DeepSeekApi(),
  [ModelProvider.XAI]: () => new XAIApi(),
  [ModelProvider.ChatGLM]: () => new ChatGLMApi(),
  [ModelProvider.SiliconFlow]: () => new SiliconflowApi(),
  [ModelProvider.Ai302]: () => new Ai302Api(),
};

export class ClientApi {
  public llm: LLMApi;

  constructor(provider: ModelProvider = ModelProvider.GPT) {
    const factory = PROVIDER_FACTORIES[provider];
    this.llm = factory ? factory() : new ChatGPTApi();
  }

  config() {}

  prompts() {}

  masks() {}

  async share(messages: ChatMessage[], avatarUrl: string | null = null) {
    const msgs = messages
      .map((m) => ({
        from: m.role === "user" ? "human" : "gpt",
        value: m.content,
      }))
      .concat([
        {
          from: "human",
          value:
            "Share from [nextgpt]: https://github.com/KhulnaSoft/NextGPT",
        },
      ]);
    // 敬告二开开发者们，为了开源大模型的发展，请不要修改上述消息，此消息用于后续数据清洗使用
    // Please do not modify this message

    console.log("[Share]", messages, msgs);
    const clientConfig = getClientConfig();
    const proxyUrl = "/sharegpt";
    const rawUrl = "https://sharegpt.com/api/conversations";
    const shareUrl = clientConfig?.isApp ? rawUrl : proxyUrl;
    const res = await fetch(shareUrl, {
      body: JSON.stringify({
        avatarUrl,
        items: msgs,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const resJson = await res.json();
    console.log("[Share]", resJson);
    if (resJson.id) {
      return `https://shareg.pt/${resJson.id}`;
    }
  }
}

export function getBearerToken(
  apiKey: string,
  noBearer: boolean = false,
): string {
  return validString(apiKey)
    ? `${noBearer ? "" : "Bearer "}${apiKey.trim()}`
    : "";
}

export function validString(x: string): boolean {
  return x?.length > 0;
}

type AccessStoreState = ReturnType<typeof useAccessStore.getState>;

const PROVIDER_API_KEY_GETTERS: Partial<
  Record<ServiceProvider, (s: AccessStoreState) => string>
> = {
  [ServiceProvider.Google]: (s) => s.googleApiKey,
  [ServiceProvider.Azure]: (s) => s.azureApiKey,
  [ServiceProvider.Anthropic]: (s) => s.anthropicApiKey,
  [ServiceProvider.ByteDance]: (s) => s.bytedanceApiKey,
  [ServiceProvider.Alibaba]: (s) => s.alibabaApiKey,
  [ServiceProvider.Moonshot]: (s) => s.moonshotApiKey,
  [ServiceProvider.XAI]: (s) => s.xaiApiKey,
  [ServiceProvider.DeepSeek]: (s) => s.deepseekApiKey,
  [ServiceProvider.ChatGLM]: (s) => s.chatglmApiKey,
  [ServiceProvider.SiliconFlow]: (s) => s.siliconflowApiKey,
  [ServiceProvider.Iflytek]: (s) =>
    s.iflytekApiKey && s.iflytekApiSecret
      ? s.iflytekApiKey + ":" + s.iflytekApiSecret
      : "",
  [ServiceProvider.Ai302]: (s) => s.ai302ApiKey,
};

function getProviderApiKey(
  providerName: string | undefined,
  accessStore: AccessStoreState,
): string {
  const getter =
    providerName != null
      ? PROVIDER_API_KEY_GETTERS[providerName as ServiceProvider]
      : undefined;
  return getter ? getter(accessStore) : accessStore.openaiApiKey;
}

export function getHeaders(ignoreHeaders: boolean = false) {
  const accessStore = useAccessStore.getState();
  const chatStore = useChatStore.getState();
  let headers: Record<string, string> = {};
  if (!ignoreHeaders) {
    headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  const clientConfig = getClientConfig();

  function getConfig() {
    const modelConfig = chatStore.currentSession().mask.modelConfig;
    const isGoogle = modelConfig.providerName === ServiceProvider.Google;
    const isAzure = modelConfig.providerName === ServiceProvider.Azure;
    const isAnthropic = modelConfig.providerName === ServiceProvider.Anthropic;
    const isBaidu = modelConfig.providerName == ServiceProvider.Baidu;
    const isEnabledAccessControl = accessStore.enabledAccessControl();
    const apiKey = getProviderApiKey(modelConfig.providerName, accessStore);
    return {
      isGoogle,
      isAzure,
      isAnthropic,
      isBaidu,
      apiKey,
      isEnabledAccessControl,
    };
  }

  function getAuthHeader(): string {
    if (isAzure) return "api-key";
    if (isAnthropic) return "x-api-key";
    if (isGoogle) return "x-goog-api-key";
    return "Authorization";
  }

  const {
    isGoogle,
    isAzure,
    isAnthropic,
    isBaidu,
    apiKey,
    isEnabledAccessControl,
  } = getConfig();
  // when using baidu api in app, not set auth header
  if (isBaidu && clientConfig?.isApp) return headers;

  const authHeader = getAuthHeader();

  const bearerToken = getBearerToken(
    apiKey,
    isAzure || isAnthropic || isGoogle,
  );

  if (bearerToken) {
    headers[authHeader] = bearerToken;
  } else if (isEnabledAccessControl && validString(accessStore.accessCode)) {
    headers["Authorization"] = getBearerToken(
      ACCESS_CODE_PREFIX + accessStore.accessCode,
    );
  }

  return headers;
}

const SERVICE_TO_MODEL: Partial<Record<ServiceProvider, ModelProvider>> = {
  [ServiceProvider.Google]: ModelProvider.GeminiPro,
  [ServiceProvider.Anthropic]: ModelProvider.Claude,
  [ServiceProvider.Baidu]: ModelProvider.Ernie,
  [ServiceProvider.ByteDance]: ModelProvider.Doubao,
  [ServiceProvider.Alibaba]: ModelProvider.Qwen,
  [ServiceProvider.Tencent]: ModelProvider.Hunyuan,
  [ServiceProvider.Moonshot]: ModelProvider.Moonshot,
  [ServiceProvider.Iflytek]: ModelProvider.Iflytek,
  [ServiceProvider.DeepSeek]: ModelProvider.DeepSeek,
  [ServiceProvider.XAI]: ModelProvider.XAI,
  [ServiceProvider.ChatGLM]: ModelProvider.ChatGLM,
  [ServiceProvider.SiliconFlow]: ModelProvider.SiliconFlow,
  [ServiceProvider.Ai302]: ModelProvider.Ai302,
};

export function getClientApi(provider: ServiceProvider): ClientApi {
  const modelProvider = SERVICE_TO_MODEL[provider] ?? ModelProvider.GPT;
  return new ClientApi(modelProvider);
}
