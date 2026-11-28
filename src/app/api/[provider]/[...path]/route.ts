import { ApiPath } from "@/constants";
import { NextRequest } from "next/server";
import { handle as openaiHandler } from "@/providers/adapters/openai";
import { handle as azureHandler } from "@/providers/adapters/azure";
import { handle as googleHandler } from "@/providers/adapters/google";
import { handle as anthropicHandler } from "@/providers/adapters/anthropic";
import { handle as baiduHandler } from "@/providers/adapters/baidu";
import { handle as bytedanceHandler } from "@/providers/adapters/bytedance";
import { handle as alibabaHandler } from "@/providers/adapters/alibaba";
import { handle as moonshotHandler } from "@/providers/adapters/moonshot";
import { handle as stabilityHandler } from "@/providers/adapters/stability";
import { handle as iflytekHandler } from "@/providers/adapters/iflytek";
import { handle as deepseekHandler } from "@/providers/adapters/deepseek";
import { handle as siliconflowHandler } from "@/providers/adapters/siliconflow";
import { handle as xaiHandler } from "@/providers/adapters/xai";
import { handle as chatglmHandler } from "@/providers/adapters/glm";
import { handle as proxyHandler } from "@/providers/adapters/proxy";
import { handle as ai302Handler } from "@/providers/adapters/302ai";

async function handle(
  req: NextRequest,
  { params }: { params: { provider: string; path: string[] } },
) {
  const apiPath = `/api/${params.provider}`;
  console.log(`[${params.provider} Route] params `, params);
  switch (apiPath) {
    case ApiPath.Azure:
      return azureHandler(req, { params });
    case ApiPath.Google:
      return googleHandler(req, { params });
    case ApiPath.Anthropic:
      return anthropicHandler(req, { params });
    case ApiPath.Baidu:
      return baiduHandler(req, { params });
    case ApiPath.ByteDance:
      return bytedanceHandler(req, { params });
    case ApiPath.Alibaba:
      return alibabaHandler(req, { params });
    // case ApiPath.Tencent: using "/api/tencent"
    case ApiPath.Moonshot:
      return moonshotHandler(req, { params });
    case ApiPath.Stability:
      return stabilityHandler(req, { params });
    case ApiPath.Iflytek:
      return iflytekHandler(req, { params });
    case ApiPath.DeepSeek:
      return deepseekHandler(req, { params });
    case ApiPath.XAI:
      return xaiHandler(req, { params });
    case ApiPath.ChatGLM:
      return chatglmHandler(req, { params });
    case ApiPath.SiliconFlow:
      return siliconflowHandler(req, { params });
    case ApiPath.OpenAI:
      return openaiHandler(req, { params });
    case ApiPath.Ai302:
      return ai302Handler(req, { params });
    default:
      return proxyHandler(req, { params });
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
export const preferredRegion = [
  "arn1",
  "bom1",
  "cdg1",
  "cle1",
  "cpt1",
  "dub1",
  "fra1",
  "gru1",
  "hnd1",
  "iad1",
  "icn1",
  "kix1",
  "lhr1",
  "pdx1",
  "sfo1",
  "sin1",
  "syd1",
];
