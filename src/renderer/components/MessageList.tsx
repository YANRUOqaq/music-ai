import React, { useRef, useEffect } from 'react';
import type { ChatMessage } from '../../shared/types';

interface Props {
  messages: ChatMessage[];
}

const MessageList: React.FC<Props> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--stone)', fontSize: 12,
      }}>
        开始聊天吧 ✨
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-start',
            gap: 6,
          }}
        >
          {msg.role === 'assistant' && (
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
            }}>♪</div>
          )}
          <div style={{
            maxWidth: '75%',
            padding: '8px 12px',
            borderRadius: msg.role === 'user' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
            background: msg.role === 'user'
              ? 'var(--primary)'
              : 'var(--surface)',
            border: msg.role === 'user' ? 'none' : '1px solid var(--hairline)',
            color: msg.role === 'user' ? 'var(--on-primary)' : 'var(--body)',
            fontSize: 12,
            lineHeight: 1.6,
          }}>
            {msg.content}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
