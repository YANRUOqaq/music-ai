import React, { useState, useCallback } from 'react';
import MusicPanel from './components/MusicPanel';
import ChatPanel from './components/ChatPanel';
import DraggableDivider from './components/DraggableDivider';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
  const [splitRatio, setSplitRatio] = useState(0.45);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<string>('import');

  const openSidebar = useCallback((view: string) => {
    setSidebarView(view);
    setSidebarOpen(true);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--canvas)' }}>
      <TitleBar onOpenSidebar={openSidebar} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: `${splitRatio * 100}%`, minHeight: 120, overflow: 'hidden' }}>
          <MusicPanel />
        </div>
        <DraggableDivider onResize={setSplitRatio} />
        <div style={{ flex: 1, minHeight: 100, overflow: 'hidden' }}>
          <ChatPanel />
        </div>
      </div>
      {sidebarOpen && (
        <Sidebar view={sidebarView} onClose={() => setSidebarOpen(false)} />
      )}
    </div>
  );
};

export default App;
