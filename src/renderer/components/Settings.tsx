import React, { useState, useEffect } from 'react';
import { IPC_CHANNELS } from '../../shared/types';

const Settings: React.FC = () => {
  const [config, setConfig] = useState({ apiKey: '', modelProvider: 'claude', modelName: 'claude-sonnet-4-6' });
  const [saved, setSaved] = useState(false);
  const api = window.musicAI;

  useEffect(() => {
    api.invoke(IPC_CHANNELS.CONFIG_GET).then((c: any) => {
      setConfig({ apiKey: c.apiKey || '', modelProvider: c.modelProvider, modelName: c.modelName });
    });
  }, []);

  const handleSave = async () => {
    await api.invoke(IPC_CHANNELS.CONFIG_SAVE, config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>API 提供商</div>
        <select
          value={config.modelProvider}
          onChange={(e) => {
            const provider = e.target.value;
            const defaultModel = provider === 'claude' ? 'claude-sonnet-4-6'
              : provider === 'deepseek' ? 'deepseek-v4-pro'
              : 'gpt-4o';
            setConfig({ ...config, modelProvider: provider, modelName: defaultModel });
          }}
          style={{
            width: '100%', background: 'var(--surface-elevated)', color: 'var(--ink)',
            border: '1px solid var(--hairline)', borderRadius: 8, padding: '8px 10px',
            fontSize: 12, fontFamily: 'var(--font-family)',
          }}
        >
          <option value="claude">Claude (Anthropic)</option>
          <option value="openai">OpenAI</option>
          <option value="deepseek">DeepSeek</option>
        </select>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>模型</div>
        <select
          value={config.modelName}
          onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
          style={{
            width: '100%', background: 'var(--surface-elevated)', color: 'var(--ink)',
            border: '1px solid var(--hairline)', borderRadius: 8, padding: '8px 10px',
            fontSize: 12, fontFamily: 'var(--font-family)',
          }}
        >
          {config.modelProvider === 'claude' ? (
            <>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
              <option value="claude-opus-4-7">Claude Opus 4.7</option>
              <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
            </>
          ) : config.modelProvider === 'deepseek' ? (
            <>
              <option value="deepseek-v4-pro">DeepSeek V4 Pro</option>
              <option value="deepseek-v4-flash">DeepSeek V4 Flash</option>
            </>
          ) : (
            <>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
            </>
          )}
        </select>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>API Key</div>
        <input
          type="password"
          value={config.apiKey}
          onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
          placeholder="sk-..."
          style={{ width: '100%' }}
        />
        <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 4 }}>
          API Key 仅存储在你本地，不会上传到任何服务器
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: saved ? '#59d499' : 'var(--stone)' }}>
          {saved ? '✓ 已保存' : ''}
        </span>
        <button className="btn-primary" onClick={handleSave}>保存设置</button>
      </div>
    </div>
  );
};

export default Settings;
