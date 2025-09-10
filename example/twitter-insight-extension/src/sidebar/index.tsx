import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Input, Button, Select } from "antd";

type LogMsg = { time: string; log: string; level?: "info" | "error" | "success"; stream?: boolean };

const App = () => {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogMsg[]>([]);
  const [streamLog, setStreamLog] = useState<LogMsg | null>(null);
  const [llm, setLlm] = useState("anthropic");
  const [modelName, setModelName] = useState("claude-sonnet-4-20250514");
  const [apiKey, setApiKey] = useState("");
  const [baseURL, setBaseURL] = useState("");

  useEffect(() => {
    chrome.storage.sync.get(["llmConfig"], (r) => {
      const cfg = r["llmConfig"];
      if (cfg) {
        setLlm(cfg.llm || "anthropic");
        setModelName(cfg.modelName || "claude-sonnet-4-20250514");
        setApiKey(cfg.apiKey || "");
        setBaseURL((cfg.options && cfg.options.baseURL) || "");
      }
    });
    chrome.storage.local.get(["running"], (r) => {
      setRunning(!!r.running);
    });
    const onMsg = (msg: any) => {
      if (!msg) return;
      if (msg.type === "log") {
        const time = new Date().toLocaleTimeString();
        const m = { time, log: msg.log, level: msg.level || "info", stream: !!msg.stream } as LogMsg;
        if (m.stream) setStreamLog(m); else { setStreamLog(null); setLogs((prev) => [...prev, m]); }
      } else if (msg.type === "stop") {
        setRunning(false);
      }
    };
    chrome.runtime.onMessage.addListener(onMsg);
    return () => chrome.runtime.onMessage.removeListener(onMsg);
  }, []);

  const persistConfig = () => {
    chrome.storage.sync.set({ llmConfig: { llm, modelName, apiKey, options: { baseURL } } });
  };

  const handleRun = () => {
    persistConfig();
    setLogs([]);
    setRunning(true);
    chrome.storage.local.set({ running: true });
    chrome.runtime.sendMessage({ type: "run" });
  };

  const handleStop = () => {
    setRunning(false);
    chrome.storage.local.set({ running: false });
    chrome.runtime.sendMessage({ type: "stop" });
  };

  const color = (level?: string) => (level === "error" ? "#ff4d4f" : level === "success" ? "#52c41a" : "#1890ff");

  return (
    <div style={{ padding: 12, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Eko Twitter Insight</div>
      <div style={{ display: "grid", gap: 6 }}>
        <label>Provider</label>
        <Select value={llm} onChange={setLlm} options={[
          { value: "anthropic", label: "Claude (default)" },
          { value: "openai", label: "OpenAI" },
          { value: "openrouter", label: "OpenRouter" },
          { value: "openai-compatible", label: "OpenAI Compatible" },
        ]} />
        <label>Model</label>
        <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="model name" />
        <label>API Key</label>
        <Input.Password value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
        <label>Base URL (optional)</label>
        <Input value={baseURL} onChange={(e) => setBaseURL(e.target.value)} placeholder="https://your-proxy/v1" />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Button type="primary" onClick={handleRun} disabled={running || !apiKey}>Run</Button>
          <Button danger onClick={handleStop} disabled={!running}>Stop</Button>
        </div>
      </div>
      <div style={{ height: 8 }} />
      <div style={{ fontWeight: 600 }}>Logs</div>
      <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco", fontSize: 12, whiteSpace: "pre-wrap" }}>
        {logs.map((l, i) => (
          <div key={i} style={{ color: color(l.level) }}>{`[${l.time}] ${l.log}`}</div>
        ))}
        {streamLog && <div style={{ color: color(streamLog.level) }}>{`[${streamLog.time}] ${streamLog.log}`}</div>}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
