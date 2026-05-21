import React, { useCallback, useRef } from 'react';

interface Props {
  onResize: (ratio: number) => void;
}

const DraggableDivider: React.FC<Props> = ({ onResize }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const startY = e.clientY;
    const startHeight = (container.firstChild as HTMLElement)?.getBoundingClientRect().height || 0;
    const totalHeight = container.getBoundingClientRect().height;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - startY;
      const newTopHeight = startHeight + delta;
      const ratio = Math.max(0.2, Math.min(0.7, newTopHeight / totalHeight));
      onResize(ratio);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [onResize]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        height: 5,
        minHeight: 5,
        background: 'var(--canvas)',
        borderTop: '1px solid var(--hairline)',
        borderBottom: '1px solid var(--hairline)',
        cursor: 'row-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 150ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--canvas)')}
    >
      <div
        style={{
          width: 28,
          height: 3,
          background: 'rgba(255,255,255,0.16)',
          borderRadius: 9999,
        }}
      />
    </div>
  );
};

export default DraggableDivider;
