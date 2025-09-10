import { Eko, LLMs, StreamCallbackMessage } from "@eko-ai/eko";
import { BrowserAgent } from "@eko-ai/eko-extension";
import TwitterInsightAgent from "../agent/twitter_insight_agent";

type LLMConfig = {
  llm: string;
  modelName: string;
  apiKey: string;
  options?: { baseURL?: string };
};

export async function getLLMConfig(name: string = "llmConfig"): Promise<LLMConfig | undefined> {
  let result = await chrome.storage.sync.get([name]);
  return result[name] as LLMConfig | undefined;
}

export async function main(prompt: string): Promise<Eko | undefined> {
  const tabId = await ensureTwitterActiveTab();
  if (!tabId) {
    printLog('Cannot activate an X/Twitter tab. Please open x.com and try again.', 'error');
    chrome.storage.local.set({ running: false });
    chrome.runtime.sendMessage({ type: 'stop' });
    return;
  }
  const config = await getLLMConfig();
  if (!config || !config.apiKey) {
    printLog(
      "Please configure API Key in the side panel (or options).",
      "error"
    );
    try { chrome.runtime.openOptionsPage(); } catch {}
    chrome.storage.local.set({ running: false });
    chrome.runtime.sendMessage({ type: "stop" });
    return;
  }

  const llms: LLMs = {
    default: {
      provider: config.llm as any,
      model: config.modelName,
      apiKey: config.apiKey,
      config: { baseURL: config.options?.baseURL },
    },
  };

  const callback = {
    onMessage: async (message: StreamCallbackMessage) => {
      if (message.type === "workflow" && message.workflow?.xml) {
        printLog("Plan\n" + message.workflow.xml, "info", !message.streamDone);
      } else if (message.type === "text") {
        printLog(message.text || "", "info", !message.streamDone);
      } else if (message.type === "tool_streaming") {
        printLog(
          `${message.agentName} > ${message.toolName}\n${message.paramsText || ""}`,
          "info",
          true
        );
      } else if (message.type === "tool_use") {
        printLog(
          `${message.agentName} > ${message.toolName}\n${JSON.stringify(
            message.params
          )}`
        );
      }
    },
  };

  const agents = [new TwitterInsightAgent(), new BrowserAgent()];
  const eko = new Eko({ llms, agents, callback });

  eko
    .run(
      prompt ||
        "Analyze my followings' tweets in the last 7 days, list keywords with freq >= 5, then imitate my tweeting style to draft 1-3 posts about the top-3 keywords using your tools."
    )
    .then((res) => {
      printLog(res.result, res.success ? "success" : "error");
    })
    .catch((error) => {
      printLog(error + "", "error");
    })
    .finally(() => {
      chrome.storage.local.set({ running: false });
      chrome.runtime.sendMessage({ type: "stop" });
    });

  return eko;
}

async function ensureTwitterActiveTab(): Promise<number | undefined> {
  const isTwitter = (url?: string) => !!url && /https?:\/\/(x\.com|twitter\.com)\//.test(url);
  const homeUrl = 'https://x.com/home';
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  let tab = tabs[0];
  if (!tab) {
    const created = await chrome.tabs.create({ url: homeUrl, active: true });
    tab = created as any;
  } else if (!isTwitter(tab.url)) {
    await chrome.tabs.update(tab.id!, { url: homeUrl, active: true });
    // allow navigation
    await sleep(1200);
  }
  // probe content script readiness with ping
  const maxTries = 8;
  for (let i = 0; i < maxTries; i++) {
    try {
      const resp = await sendMessage(tab.id!, { type: 'ping' }, 1200);
      if (resp && resp.ok) return tab.id!;
    } catch {}
    await sleep(800);
  }
  // attempt to programmatically inject content script as a fallback
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id! }, files: ['content.js'] });
    const resp = await sendMessage(tab.id!, { type: 'ping' }, 1500);
    if (resp && resp.ok) return tab.id!;
  } catch {}
  return tab?.id!;
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function sendMessage<T = any>(tabId: number, msg: any, timeoutMs = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        reject(new Error('timeout'));
      }
    }, timeoutMs);
    try {
      chrome.tabs.sendMessage(tabId, msg, (resp) => {
        if (done) return;
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          done = true;
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        done = true;
        resolve(resp as T);
      });
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

function printLog(
  message: string,
  level?: "info" | "success" | "error",
  stream?: boolean
) {
  chrome.runtime.sendMessage({
    type: "log",
    log: message + "",
    level: level || "info",
    stream,
  });
}
