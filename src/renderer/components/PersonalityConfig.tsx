import React, { useState, useEffect } from 'react';
import { IPC_CHANNELS } from '../../shared/types';

const PersonalityConfig: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [saved, setSaved] = useState(false);
  const api = window.musicAI;

  useEffect(() => {
    api.invoke(IPC_CHANNELS.CONFIG_GET).then((config: any) => {
      setPrompt(config.personalityPrompt || '');
    });
  }, []);

  const handleSave = async () => {
    await api.invoke(IPC_CHANNELS.CONFIG_SAVE, { personalityPrompt: prompt });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
        用自然语言描述你的 AI 伙伴的性格。这段文字会被注入到每次对话中。
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={8}
        style={{
          width: '100%', resize: 'vertical',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--hairline)',
          borderRadius: 8, padding: 10,
          fontSize: 12, color: 'var(--ink)',
          fontFamily: 'var(--font-family)',
          lineHeight: 1.6,
        }}
        placeholder="例如：你是一个叫小音的AI朋友，性格温暖但偶尔毒舌，喜欢用音乐比喻生活..."
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: saved ? '#59d499' : 'var(--stone)' }}>
          {saved ? '✓ 已保存' : ''}
        </span>
        <button className="btn-primary" onClick={handleSave}>保存</button>
      </div>
    </div>
  );
};

export default PersonalityConfig;
