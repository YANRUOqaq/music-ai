import React, { useState, useCallback } from 'react';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<Props> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }, [text, disabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--hairline)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--surface)', border: '1px solid var(--hairline)',
        borderRadius: 8, padding: 2,
      }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="说点什么..."
          disabled={disabled}
          style={{
            flex: 1, background: 'transparent', border: 'none',
            padding: '8px 10px', fontSize: 12,
            color: 'var(--ink)', outline: 'none',
          }}
        />
        <span style={{ fontSize: 10, color: 'var(--ash)', padding: '0 2px' }}>⌘↵</span>
        <button
          className="btn-primary"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          style={{ opacity: disabled || !text.trim() ? 0.4 : 1 }}
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
