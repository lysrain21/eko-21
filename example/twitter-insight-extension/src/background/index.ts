import { Eko } from "@eko-ai/eko";
import { main } from "./main";

let eko: Eko | undefined;

chrome.storage.local.set({ running: false });

chrome.runtime.onMessage.addListener(async (request) => {
  if (!request) return;
  if (request.type === "run") {
    try {
      chrome.runtime.sendMessage({ type: "log", log: "Run..." });
      chrome.storage.local.set({ running: true });
      eko = await main("");
    } catch (e) {
      chrome.runtime.sendMessage({
        type: "log",
        log: (e as any) + "",
        level: "error",
      });
    }
  } else if (request.type === "stop") {
    if (eko) {
      eko.getAllTaskId().forEach((taskId) => {
        eko!.abortTask(taskId);
        chrome.runtime.sendMessage({ type: "log", log: "Abort taskId: " + taskId });
      });
    }
    chrome.storage.local.set({ running: false });
    chrome.runtime.sendMessage({ type: "log", log: "Stop" });
  }
});

(chrome as any).sidePanel && (chrome as any).sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Fallback: if side panel doesn't open on click, force open
try {
  chrome.action.onClicked.addListener(async () => {
    try {
      const win = await chrome.windows.getCurrent();
      // @ts-ignore
      if (chrome.sidePanel && chrome.sidePanel.open) {
        // @ts-ignore
        await chrome.sidePanel.open({ windowId: win.id! });
      }
    } catch {}
  });
} catch {}
