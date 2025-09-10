import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Input, Button, Select, Typography, message } from 'antd';

const { Title, Paragraph } = Typography;

const Options = () => {
  const [llm, setLlm] = useState('anthropic');
  const [modelName, setModelName] = useState('claude-sonnet-4-20250514');
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(['llmConfig'], (r) => {
      const cfg = r['llmConfig'];
      if (cfg) {
        setLlm(cfg.llm || 'anthropic');
        setModelName(cfg.modelName || 'claude-sonnet-4-20250514');
        setApiKey(cfg.apiKey || '');
        setBaseURL((cfg.options && cfg.options.baseURL) || '');
      }
    });
  }, []);

  const save = () => {
    chrome.storage.sync.set({ llmConfig: { llm, modelName, apiKey, options: { baseURL } } }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  };

  const providers = [
    { value: 'anthropic', label: 'Claude (default)' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'openai-compatible', label: 'OpenAI Compatible' },
  ];

  const modelOptions: Record<string, { value: string; label: string }[]> = {
    anthropic: [
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (default)' },
      { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
    ],
    openai: [
      { value: 'gpt-5', label: 'gpt-5 (default)' },
      { value: 'gpt-5-mini', label: 'gpt-5-mini' },
      { value: 'gpt-4.1', label: 'gpt-4.1' },
      { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
      { value: 'o4-mini', label: 'o4-mini' },
    ],
    openrouter: [
      { value: 'anthropic/claude-sonnet-4', label: 'claude-sonnet-4 (OR)' },
      { value: 'anthropic/claude-3.7-sonnet', label: 'claude-3.7-sonnet (OR)' },
      { value: 'google/gemini-2.5-pro', label: 'gemini-2.5-pro' },
      { value: 'openai/gpt-5', label: 'gpt-5' },
      { value: 'openai/gpt-5-mini', label: 'gpt-5-mini' },
      { value: 'openai/gpt-4.1', label: 'gpt-4.1' },
      { value: 'openai/o4-mini', label: 'o4-mini' },
      { value: 'openai/gpt-4.1-mini', label: 'gpt-4.1-mini' },
      { value: 'x-ai/grok-4', label: 'grok-4' },
    ],
    'openai-compatible': [
      { value: 'doubao-seed-1-6-250615', label: 'doubao-seed-1-6-250615' },
    ],
  };

  const baseURLMap: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    'openai-compatible': 'https://openrouter.ai/api/v1',
  };

  const onProviderChange = (value: string) => {
    setLlm(value);
    const list = modelOptions[value] || [];
    if (list.length) setModelName(list[0].value);
    setBaseURL(baseURLMap[value] || '');
  };

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
      <Title level={4}>Eko Twitter Insight — LLM 配置</Title>
      <Paragraph>在这里设置模型提供商、模型名称、API Key 与可选代理地址。</Paragraph>
      <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
        <label>Provider</label>
        <Select value={llm} onChange={onProviderChange} options={providers} />
        <label>Model</label>
        <Select
          showSearch
          value={modelName}
          onChange={setModelName}
          options={modelOptions[llm] || []}
          placeholder="Select a model"
          filterOption={(input, option) => (option?.label as string).toLowerCase().includes(input.toLowerCase())}
        />
        <label>API Key</label>
        <Input.Password value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
        <label>Base URL (可选代理)</label>
        <Input value={baseURL} onChange={(e) => setBaseURL(e.target.value)} placeholder="https://your-proxy/v1" />
        <div>
          <Button type="primary" onClick={save} disabled={!apiKey}>保存</Button>
          {saved && <span style={{ marginLeft: 8, color: '#52c41a' }}>已保存</span>}
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Options />);
