import dotenv from "dotenv";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defaultMessageProviderOptions } from "../../src/agent/llm";
import { LanguageModelV2, LanguageModelV2StreamPart } from "@ai-sdk/provider";

dotenv.config();

const baseURL = process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1";
const apiKey = process.env.KIMI_API_KEY;
if (!apiKey) {
  throw new Error(
    "KIMI_API_KEY environment variable is required for integration tests"
  );
}

export async function testKimiPrompt() {
  const client: LanguageModelV2 = createOpenAICompatible({
    name: "kimi",
    apiKey: apiKey,
    baseURL: baseURL,
  }).languageModel("kimi-k2-0905-preview");

  let result = await client.doGenerate({
    prompt: [{ role: "user", content: [{ type: "text", text: "你好，我叫李雷，1+1等于多少?" }] }],
    maxOutputTokens: 1024,
    temperature: 0.6,
  });

  console.log(JSON.stringify(result, null, 2));

  console.log(result.finishReason, result.content, result.usage);
}

export async function testKimiStream() {
  const client: LanguageModelV2 = createOpenAICompatible({
    name: "kimi",
    apiKey: apiKey,
    baseURL: baseURL,
  }).languageModel("kimi-k2-0905-preview");

  let result = await client.doStream({
    prompt: [{ role: "user", content: [{ type: "text", text: "你好，请介绍一下你自己" }] }],
    maxOutputTokens: 1024,
    temperature: 0.6,
    providerOptions: defaultMessageProviderOptions(),
  });

  console.log(JSON.stringify(result, null, 2));
  let stream = result.stream;
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("===> done", value);
        break;
      }
      let chunk = value as LanguageModelV2StreamPart;
      console.log("chunk: ", chunk);
    }
  } finally {
    reader.releaseLock();
  }
}

export async function testKimiToolsPrompt() {
  const client: LanguageModelV2 = createOpenAICompatible({
    name: "kimi",
    apiKey: apiKey,
    baseURL: baseURL,
  }).languageModel("kimi-k2-0905-preview");

  let result = await client.doGenerate({
    tools: [
      {
        type: "function",
        name: "get_current_country",
        description: "获取用户当前所在国家",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        type: "function",
        name: "web_search",
        description: "搜索工具",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "搜索关键词",
            },
            country: {
              type: "string",
            },
            maxResults: {
              type: "number",
              description: "最大搜索结果数量，默认5",
            },
          },
          required: ["query"],
        },
      },
    ],
    toolChoice: {
      type: "auto",
    },
    prompt: [
      { role: "system", content: "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。" },
      {
        role: "user",
        content: [{ type: "text", text: "搜索最近的国家大事" }],
      },
    ],
    maxOutputTokens: 1024,
    temperature: 0.6,
    providerOptions: defaultMessageProviderOptions(),
  });

  console.log(JSON.stringify(result, null, 2));

  console.log(result.finishReason, result.content, result.usage);
}

test.only("testKimi", async () => {
  await testKimiStream();
});
