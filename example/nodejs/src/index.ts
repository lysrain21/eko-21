import dotenv from "dotenv";
import { BrowserAgent, FileAgent } from "@eko-ai/eko-nodejs";
import { Eko, Agent, Log, LLMs, StreamCallbackMessage } from "@eko-ai/eko";

dotenv.config();

const openaiBaseURL = process.env.OPENAI_BASE_URL;
const openaiApiKey = process.env.OPENAI_API_KEY;
const claudeBaseURL = process.env.ANTHROPIC_BASE_URL;
const claudeApiKey = process.env.ANTHROPIC_API_KEY;
const kimiBaseURL = process.env.KIMI_BASE_URL;
const kimiApiKey = process.env.KIMI_API_KEY;

const llms: LLMs = {
  default: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    apiKey: claudeApiKey || "",
    config: {
      baseURL: claudeBaseURL,
    },
  },
  openai: {
    provider: "openai",
    model: "gpt-5-mini",
    apiKey: openaiApiKey || "",
    config: {
      baseURL: openaiBaseURL,
    },
  },
  kimi: {
    provider: "kimi",
    model: "kimi-k2-0905-preview",
    apiKey: kimiApiKey || "",
    config: {
      baseURL: kimiBaseURL,
      temperature: 0.6,
    },
  },
};

const callback = {
  onMessage: async (message: StreamCallbackMessage) => {
    if (message.type == "workflow" && !message.streamDone) {
      return;
    }
    if (message.type == "text" && !message.streamDone) {
      return;
    }
    if (message.type == "tool_streaming") {
      return;
    }
    console.log("message: ", JSON.stringify(message, null, 2));
  },
};

async function run() {
  Log.setLevel(1);
  const agents: Agent[] = [new BrowserAgent(), new FileAgent()];
  const eko = new Eko({ llms, agents, callback });
  const result = await eko.run(
    "Search for the latest news about Musk, summarize and save to the desktop as Musk.md"
  );
  console.log("result: ", result.result);
}

run().catch((e) => {
  console.log(e);
});
