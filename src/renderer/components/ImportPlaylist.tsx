import React, { useState } from 'react';
import { IPC_CHANNELS } from '../../shared/types';

const ImportPlaylist: React.FC = () => {
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const api = window.musicAI;

  const handleImportLink = async () => {
    if (!link.trim()) return;
    setLoading(true);
    try {
      const result = await api.invoke(IPC_CHANNELS.PLAYLIST_IMPORT_LINK, { url: link.trim() });
      setMessage(`已导入: ${result.name} (${result.tracks.length} 首)`);
      setLink('');
    } catch (err: any) {
      setMessage(`导入失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async () => {
    setMessage('文件导入功能开发中，请使用链接导入');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>粘贴分享链接</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="粘贴网易云/QQ音乐歌单链接..."
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={handleImportLink} disabled={loading}>
            {loading ? '解析中...' : '导入'}
          </button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>上传文件</div>
        <button className="btn-secondary" onClick={handleImportFile} style={{ width: '100%' }}>
          选择歌单文件 (JSON)
        </button>
        <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 6 }}>
          支持 JSON 格式: {"{"}"name": "歌单名", "tracks": [{"{"}"title": "...", "artist": "...", "album": "..."{"}"}]{"}"}
        </div>
      </div>

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

export default ImportPlaylist;
