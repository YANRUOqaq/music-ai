import React from 'react';

interface Props {
  onOpenSidebar: (view: string) => void;
}

const TitleBar: React.FC<Props> = ({ onOpenSidebar }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        height: 40,
        minHeight: 40,
        background: 'var(--canvas)',
        borderBottom: '1px solid var(--hairline)',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--ink)',
            letterSpacing: '0.2px',
          }}
        >
          音乐伙伴
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => onOpenSidebar('import')}>
          导入
        </button>
        <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => onOpenSidebar('personality')}>
          性格
        </button>
        <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => onOpenSidebar('preference')}>
          偏好
        </button>
        <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => onOpenSidebar('settings')}>
          设置
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
