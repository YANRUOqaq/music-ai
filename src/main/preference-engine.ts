import type { Playlist, PreferenceProfile } from '../shared/types';
import { getPreferenceProfile, savePreferenceProfile } from './storage';

interface LLMConfig {
  apiKey: string;
  provider: 'claude' | 'openai' | 'deepseek';
  model: string;
}

export async function analyzePlaylist(
  playlist: Playlist,
  llmConfig: LLMConfig
): Promise<PreferenceProfile> {
  const trackListText = playlist.tracks
    .slice(0, 100)
    .map((t, i) => `${i + 1}. ${t.title} — ${t.artist} (${t.album})`)
    .join('\n');

  const prompt = `你是一位音乐品味分析师。分析以下歌单中的歌曲列表，推断用户的音乐偏好。

歌单名称：${playlist.name}
歌曲列表：
${trackListText}

请输出用户的音乐偏好画像，用自然语言描述，包含：
1. 主要偏好风格（预估百分比）
2. 喜欢的歌手类型和特征
3. 可能反感的风格
4. 情绪和场景倾向（工作时听什么、放松时听什么）

用自然段落描述，不要用JSON格式。总字数控制在200-400字。`;

  const analysis = await callLLM(prompt, llmConfig);

  const profile: PreferenceProfile = {
    text: analysis,
    lastUpdated: new Date().toISOString(),
    sourcePlaylists: [playlist.name],
  };

  const existing = getPreferenceProfile();
  if (existing) {
    profile.sourcePlaylists = [
      ...new Set([...existing.sourcePlaylists, playlist.name]),
    ];
  }

  savePreferenceProfile(profile);
  return profile;
}

export async function updateProfileWithFeedback(
  likedTracks: string[],
  skippedTracks: string[],
  llmConfig: LLMConfig
): Promise<PreferenceProfile> {
  const existing = getPreferenceProfile();
  const currentProfile = existing?.text || '暂无偏好数据';

  const prompt = `用户当前的音乐偏好画像：
${currentProfile}

用户最近的行为反馈：
- 喜欢的歌曲：${likedTracks.join(', ') || '无'}
- 跳过的歌曲：${skippedTracks.join(', ') || '无'}

请根据这些反馈更新用户的偏好画像。维持原有格式和长度。`;

  const updatedText = await callLLM(prompt, llmConfig);

  const profile: PreferenceProfile = {
    text: updatedText,
    lastUpdated: new Date().toISOString(),
    sourcePlaylists: existing?.sourcePlaylists || [],
  };

  savePreferenceProfile(profile);
  return profile;
}

export function generateRecommendationKeywords(profile: PreferenceProfile): string[] {
  const text = profile.text;
  const genrePatterns = [
    '华语流行', '后摇', '氛围电子', 'R&B', '说唱', '摇滚',
    '流行', '爵士', '古典', '民谣', '电子', '嘻哈', '金属',
    '独立', '另类', '朋克', '布鲁斯', '乡村', '雷鬼',
  ];

  return genrePatterns.filter(g => text.includes(g));
}

async function callLLM(prompt: string, config: LLMConfig): Promise<string> {
  if (config.provider === 'claude') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} ${err}`);
    }

    const data = await response.json() as any;
    return data.content[0].text;
  }

  const baseUrl = config.provider === 'deepseek'
    ? 'https://api.deepseek.com/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${config.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI'} API error: ${response.status} ${err}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
}
