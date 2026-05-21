// ---- Data Models ----

export interface UserConfig {
  apiKey: string;
  modelProvider: 'claude' | 'openai';
  modelName: string;
  personalityPrompt: string;
}

export interface PreferenceProfile {
  text: string;
  lastUpdated: string; // ISO datetime
  sourcePlaylists: string[];
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  netEaseId: number | null;
}

export interface Playlist {
  id: string;
  name: string;
  source: 'netEase' | 'qqMusic' | 'file' | 'manual';
  tracks: Track[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTrack: Track | null;
  progress: number;   // seconds elapsed
  duration: number;   // total seconds
  volume: number;     // 0-100
}

// ---- IPC Channel Names ----

export const IPC_CHANNELS = {
  // Music
  MUSIC_SEARCH: 'music:search',
  MUSIC_PLAY: 'music:play',
  MUSIC_PAUSE: 'music:pause',
  MUSIC_NEXT: 'music:next',
  MUSIC_PREV: 'music:prev',
  MUSIC_SET_VOLUME: 'music:setVolume',
  MUSIC_GET_STATE: 'music:getState',
  MUSIC_ON_STATE_CHANGE: 'music:onStateChange',

  // Playlist
  PLAYLIST_IMPORT_LINK: 'playlist:importLink',
  PLAYLIST_IMPORT_FILE: 'playlist:importFile',
  PLAYLIST_GET_ALL: 'playlist:getAll',
  PLAYLIST_DELETE: 'playlist:delete',

  // Preference
  PREFERENCE_ANALYZE: 'preference:analyze',
  PREFERENCE_GET: 'preference:get',
  PREFERENCE_UPDATE: 'preference:update',

  // Chat
  CHAT_SEND: 'chat:send',
  CHAT_GET_HISTORY: 'chat:getHistory',

  // Config
  CONFIG_GET: 'config:get',
  CONFIG_SAVE: 'config:save',
} as const;

// ---- IPC Payload Types ----

export interface MusicSearchRequest {
  keywords: string;
  limit?: number;
}

export interface MusicSearchResult {
  tracks: Track[];
}

export interface ImportLinkRequest {
  url: string;
  playlistName?: string;
}

export interface ImportFileRequest {
  filePath: string;
  playlistName?: string;
}

export interface AnalyzePlaylistRequest {
  playlistId: string;
}

export interface ChatSendRequest {
  message: string;
  sessionId?: string;
}

export interface ChatSendResponse {
  reply: string;
  sessionId: string;
}
