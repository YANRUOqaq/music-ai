import React from 'react';
import ImportPlaylist from './ImportPlaylist';
import PersonalityConfig from './PersonalityConfig';
import PreferenceProfile from './PreferenceProfile';
import Settings from './Settings';

interface Props {
  view: string;
  onClose: () => void;
}

const Sidebar: React.FC<Props> = ({ view, onClose }) => {
  const renderView = () => {
    switch (view) {
      case 'import': return <ImportPlaylist />;
      case 'personality': return <PersonalityConfig />;
      case 'preference': return <PreferenceProfile />;
      case 'settings': return <Settings />;
      default: return <div style={{ color: 'var(--muted)', fontSize: 12 }}>未知视图</div>;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 40,
        right: 0,
        width: 380,
        height: 'calc(100vh - 40px)',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--hairline)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 40px rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--hairline)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>
          {view === 'import' && '导入歌单'}
          {view === 'personality' && '性格配置'}
          {view === 'preference' && '偏好画像'}
          {view === 'settings' && '设置'}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--muted)',
            fontSize: 16,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {renderView()}
      </div>
    </div>
  );
};

export default Sidebar;
