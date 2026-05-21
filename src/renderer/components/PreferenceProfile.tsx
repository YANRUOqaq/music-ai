import React, { useState, useEffect } from 'react';
import { IPC_CHANNELS } from '../../shared/types';

const PreferenceProfile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const api = window.musicAI;

  useEffect(() => {
    api.invoke(IPC_CHANNELS.PREFERENCE_GET).then(setProfile);
  }, []);

  const handleAnalyze = async () => {
    const playlists = await api.invoke(IPC_CHANNELS.PLAYLIST_GET_ALL);
    if (playlists.length === 0) {
      setMessage('请先导入歌单');
      return;
    }
    try {
      const result = await api.invoke(IPC_CHANNELS.PREFERENCE_ANALYZE, { playlistId: playlists[0].id });
      setProfile(result);
      setMessage('分析完成!');
    } catch (err: any) {
      setMessage(`分析失败: ${err.message}`);
    }
  };

  const handleSaveEdit = async () => {
    const updated = await api.invoke(IPC_CHANNELS.PREFERENCE_UPDATE, text);
    setProfile(updated);
    setEditing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!editing && profile?.text ? (
        <div>
          <div style={{ fontSize: 12, color: 'var(--body)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {profile.text}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 8 }}>
            更新于: {profile.lastUpdated}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-secondary" onClick={() => { setText(profile.text); setEditing(true); }}>
              编辑
            </button>
            <button className="btn-primary" onClick={handleAnalyze}>
              重新分析
            </button>
          </div>
        </div>
      ) : editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
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
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setEditing(false)}>取消</button>
            <button className="btn-primary" onClick={handleSaveEdit}>保存</button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
            还没有偏好画像。导入歌单后分析你的音乐品味。
          </div>
          <button className="btn-primary" onClick={handleAnalyze}>
            开始分析
          </button>
        </div>
      )}

      {message && (
        <div style={{
          fontSize: 11, color: message.includes('失败') ? '#ff6161' : '#59d499',
          padding: '8px 12px', borderRadius: 6,
          background: message.includes('失败') ? 'rgba(255,97,97,0.15)' : 'rgba(89,212,153,0.15)',
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default PreferenceProfile;
