import React, { useState, useCallback } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import type { ChatMessage } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/types';

const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const api = window.musicAI;

  const handleSend = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: `local_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await api.invoke(IPC_CHANNELS.CHAT_SEND, {
        message: text,
        sessionId: sessionId || undefined,
      });
      setSessionId(result.sessionId);

      const assistantMsg: ChatMessage = {
        id: `local_${Date.now()}_ai`,
        role: 'assistant',
        content: result.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `抱歉，出错了：${err.message || '未知错误'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--canvas)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 16px', borderBottom: '1px solid var(--hairline)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>闲聊</span>
        {loading && (
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>
            正在输入...
          </span>
        )}
      </div>
      <MessageList messages={messages} />
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
};

export default ChatPanel;
