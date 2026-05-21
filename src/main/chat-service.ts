import { getConfig, getPreferenceProfile, createChatSession, getChatSession, appendMessage } from './storage';
import { getState } from './music-engine';
import type { ChatMessage, ChatSession, ChatSendResponse } from '../shared/types';

const MAX_CONTEXT_MESSAGES = 20;

function buildSystemPrompt(): string {
  const config = getConfig();
  const profile = getPreferenceProfile();
  const state = getState();

  let systemPrompt = config.personalityPrompt;

  if (profile?.text) {
    systemPrompt += `\n\n用户的音乐偏好画像：\n${profile.text}`;
  }

  if (state.currentTrack) {
    systemPrompt += `\n\n当前正在播放：${state.currentTrack.title} — ${state.currentTrack.artist}`;
  }

  systemPrompt += '\n\n你是用户的音乐AI伙伴，陪伴用户工作时闲聊。你可以讨论音乐、推荐歌曲、聊聊日常。保持轻松自然。';

  return systemPrompt;
}

export async function sendMessage(
  message: string,
  sessionId?: string
): Promise<ChatSendResponse> {
  const config = getConfig();
  let session: ChatSession;

  if (sessionId) {
    const existing = getChatSession(sessionId);
    if (!existing) {
      session = createChatSession();
    } else {
      session = existing;
    }
  } else {
    session = createChatSession();
  }

  const userMsg: ChatMessage = {
    id: `msg_${Date.now()}_user`,
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  };
  appendMessage(session.id, userMsg);

  const systemPrompt = buildSystemPrompt();
  const contextMessages = session.messages.slice(-MAX_CONTEXT_MESSAGES);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...contextMessages.map(m => ({ role: m.role, content: m.content })),
  ];

  const reply = await callChatLLM(messages, {
    apiKey: config.apiKey,
    provider: config.modelProvider,
    model: config.modelName,
  });

  const assistantMsg: ChatMessage = {
    id: `msg_${Date.now()}_assistant`,
    role: 'assistant',
    content: reply,
    timestamp: new Date().toISOString(),
  };
  appendMessage(session.id, assistantMsg);

  return { reply, sessionId: session.id };
}

async function callChatLLM(
  messages: { role: string; content: string }[],
  config: { apiKey: string; provider: string; model: string }
): Promise<string> {
  if (config.provider === 'claude') {
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 600,
        system: systemMsg?.content,
        messages: chatMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} ${err}`);
    }

    const data = await response.json() as any;
    return data.content[0].text;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 600,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
}

export function getChatHistory(sessionId: string): ChatMessage[] {
  const session = getChatSession(sessionId);
  return session?.messages || [];
}
