# Music AI Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform Electron desktop app that learns music preferences from imported playlists, plays music via NeteaseCloudMusicApi, and provides LLM-powered chat companionship during work.

**Architecture:** Electron monorepo with React renderer (Vite) and Node.js main process (tsc). Four core modules — preference engine, music engine, chat service, storage layer — live in the main process and communicate with UI via IPC. NeteaseCloudMusicApi runs as a managed subprocess.

**Tech Stack:** Electron 33, React 19, TypeScript 5.7, Vite 6, better-sqlite3, NeteaseCloudMusicApi, Claude/OpenAI SDK, electron-builder

---

## File Structure

```
music ai/
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── tsconfig.renderer.json
├── electron-builder.yml
├── vite.config.ts
├── src/
│   ├── main/
│   │   ├── index.ts                 # App entry, window creation, lifecycle
│   │   ├── preload.ts               # Context bridge (IPC surface)
│   │   ├── ipc-handlers.ts          # All IPC handler registration
│   │   ├── music-engine.ts          # NeteaseCloudMusicApi lifecycle + controls
│   │   ├── preference-engine.ts     # LLM-powered playlist → profile pipeline
│   │   ├── chat-service.ts          # LLM chat with context injection
│   │   ├── storage.ts               # SQLite operations + JSON config
│   │   └── netease-api-manager.ts   # Subprocess spawn, health, restart
│   ├── renderer/
│   │   ├── index.html               # HTML entry
│   │   ├── index.tsx                # React root
│   │   ├── App.tsx                  # Root component with layout
│   │   ├── components/
│   │   │   ├── MusicPanel.tsx       # Top section container
│   │   │   ├── AlbumArt.tsx         # Album cover + playback controls
│   │   │   ├── PlaylistView.tsx     # Playlist track list
│   │   │   ├── ChatPanel.tsx        # Bottom section container
│   │   │   ├── MessageList.tsx      # Chat bubbles
│   │   │   ├── ChatInput.tsx        # Input + send button
│   │   │   ├── DraggableDivider.tsx # Resizable divider
│   │   │   ├── TitleBar.tsx         # Custom title bar
│   │   │   ├── Sidebar.tsx          # Side panel overlay
│   │   │   ├── ImportPlaylist.tsx   # Multi-method import panel
│   │   │   ├── PersonalityConfig.tsx# Personality text editor
│   │   │   ├── PreferenceProfile.tsx# Profile view/edit
│   │   │   └── Settings.tsx         # API keys, model, theme
│   │   ├── hooks/
│   │   │   ├── useIpc.ts            # Generic IPC invoke wrapper
│   │   │   └── useMusicState.ts     # Music playback state
│   │   └── styles/
│   │       └── global.css           # Raycast dark design tokens + base styles
│   └── shared/
│       └── types.ts                 # Types shared between main & renderer
├── tests/
│   ├── main/
│   │   ├── music-engine.test.ts
│   │   ├── preference-engine.test.ts
│   │   ├── chat-service.test.ts
│   │   └── storage.test.ts
│   └── renderer/
│       ├── MusicPanel.test.tsx
│       └── ChatPanel.test.tsx
└── wrong record/
    └── error-log.md
```

---

## Phase 1: Project Scaffolding

### Task 1: Initialize project and install dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.main.json`, `tsconfig.renderer.json`, `vite.config.ts`, `electron-builder.yml`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "music-ai-agent",
  "version": "0.1.0",
  "description": "AI music companion for work",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite",
    "dev:main": "tsc -p tsconfig.main.json && electron .",
    "build:renderer": "tsc -p tsconfig.renderer.json && vite build",
    "build:main": "tsc -p tsconfig.main.json",
    "build": "npm run build:renderer && npm run build:main",
    "pack:win": "npm run build && electron-builder --win",
    "pack:mac": "npm run build && electron-builder --mac",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "concurrently": "^9.1.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "NeteaseCloudMusicApi": "^4.20.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json (base)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Create tsconfig.main.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "outDir": "dist/main",
    "rootDir": "src/main"
  },
  "include": ["src/main/**/*", "src/shared/**/*"]
}
```

- [ ] **Step 4: Create tsconfig.renderer.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist/renderer",
    "rootDir": "src/renderer",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

- [ ] **Step 5: Create vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
```

- [ ] **Step 6: Create electron-builder.yml**

```yaml
appId: com.musicai.agent
productName: Music AI
directories:
  output: release
files:
  - dist/**/*
  - package.json
win:
  target:
    - nsis
  icon: assets/icon.ico
mac:
  target:
    - dmg
  icon: assets/icon.icns
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

- [ ] **Step 7: Install dependencies**

Run: `cd "F:/workpaltfor claudecode/music ai" && npm install`

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig*.json vite.config.ts electron-builder.yml
git commit -m "chore: scaffold Electron + React + TypeScript project"
```

---

### Task 2: Create shared types

**Files:**
- Create: `src/shared/types.ts`

- [ ] **Step 1: Write shared types file**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add shared types and IPC channel definitions"
```

---

## Phase 2: Electron Main Process Skeleton

### Task 3: Create main process entry, preload, and window

**Files:**
- Create: `src/main/index.ts`, `src/main/preload.ts`

- [ ] **Step 1: Create src/main/preload.ts**

```ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

const api = {
  invoke: (channel: string, ...args: unknown[]) =>
    ipcRenderer.invoke(channel, ...args),

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
      callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
};

contextBridge.exposeInMainWorld('musicAI', api);

export type MusicAIApi = typeof api;
```

- [ ] **Step 2: Create src/main/index.ts**

```ts
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerAllHandlers } from './ipc-handlers';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 680,
    minHeight: 480,
    frame: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#07080a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerAllHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts src/main/preload.ts
git commit -m "feat: add Electron main process entry and preload script"
```

---

### Task 4: Create storage layer

**Files:**
- Create: `src/main/storage.ts`

- [ ] **Step 1: Write storage module**

```ts
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import type { UserConfig, PreferenceProfile, Playlist, ChatSession, ChatMessage } from '../shared/types';

const DB_PATH = path.join(app.getPath('userData'), 'music-ai.db');
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

let db: Database.Database;

export function initStorage(): void {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      tracks_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      messages_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS preference_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      text TEXT NOT NULL DEFAULT '',
      last_updated TEXT NOT NULL DEFAULT (datetime('now')),
      source_playlists_json TEXT NOT NULL DEFAULT '[]'
    );
  `);
}

// ---- Config (JSON file) ----

const defaultConfig: UserConfig = {
  apiKey: '',
  modelProvider: 'claude',
  modelName: 'claude-sonnet-4-6',
  personalityPrompt: '你是一个叫小音的AI朋友，性格温暖但偶尔毒舌，喜欢用音乐比喻生活。你了解用户的音乐品味并能在聊天中自然地讨论音乐。',
};

export function getConfig(): UserConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return defaultConfig;
  }
}

export function saveConfig(config: Partial<UserConfig>): UserConfig {
  const current = getConfig();
  const updated = { ...current, ...config };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
  return updated;
}

// ---- Playlists ----

export function savePlaylist(playlist: Playlist): void {
  db.prepare(`
    INSERT OR REPLACE INTO playlists (id, name, source, tracks_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(playlist.id, playlist.name, playlist.source, JSON.stringify(playlist.tracks), playlist.createdAt);
}

export function getAllPlaylists(): Playlist[] {
  const rows = db.prepare('SELECT * FROM playlists ORDER BY created_at DESC').all() as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    source: r.source,
    tracks: JSON.parse(r.tracks_json),
    createdAt: r.created_at,
  }));
}

export function deletePlaylist(id: string): void {
  db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
}

// ---- Preference Profile ----

export function getPreferenceProfile(): PreferenceProfile | null {
  const row = db.prepare('SELECT * FROM preference_profile WHERE id = 1').get() as any;
  if (!row) return null;
  return {
    text: row.text,
    lastUpdated: row.last_updated,
    sourcePlaylists: JSON.parse(row.source_playlists_json),
  };
}

export function savePreferenceProfile(profile: PreferenceProfile): void {
  db.prepare(`
    INSERT OR REPLACE INTO preference_profile (id, text, last_updated, source_playlists_json)
    VALUES (1, ?, ?, ?)
  `).run(profile.text, profile.lastUpdated, JSON.stringify(profile.sourcePlaylists));
}

// ---- Chat Sessions ----

export function createChatSession(): ChatSession {
  const id = `chat_${Date.now()}`;
  db.prepare('INSERT INTO chat_sessions (id, messages_json) VALUES (?, ?)').run(id, '[]');
  return { id, messages: [], createdAt: new Date().toISOString() };
}

export function getChatSession(id: string): ChatSession | null {
  const row = db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get() as any;
  if (!row) return null;
  return {
    id: row.id,
    messages: JSON.parse(row.messages_json),
    createdAt: row.created_at,
  };
}

export function appendMessage(sessionId: string, message: ChatMessage): void {
  const row = db.prepare('SELECT messages_json FROM chat_sessions WHERE id = ?').get() as any;
  if (!row) return;
  const messages = JSON.parse(row.messages_json);
  messages.push(message);
  // Keep only last 40 messages (20 turns)
  const trimmed = messages.slice(-40);
  db.prepare('UPDATE chat_sessions SET messages_json = ? WHERE id = ?').run(JSON.stringify(trimmed), sessionId);
}

export function closeStorage(): void {
  db.close();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/storage.ts
git commit -m "feat: add SQLite storage layer for playlists, preferences, and chat"
```

---

## Phase 3: Music Engine

### Task 5: Create NeteaseCloudMusicApi subprocess manager

**Files:**
- Create: `src/main/netease-api-manager.ts`

- [ ] **Step 1: Write subprocess manager**

```ts
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import http from 'http';

let apiProcess: ChildProcess | null = null;
const API_PORT = 3000;
const API_BASE = `http://localhost:${API_PORT}`;

function findModuleRoot(): string {
  // Walk up from __dirname to find node_modules/NeteaseCloudMusicApi
  const parts = __dirname.split(path.sep);
  while (parts.length > 0) {
    const candidate = path.join(parts.join(path.sep), 'node_modules', 'NeteaseCloudMusicApi');
    try {
      require.resolve(candidate);
      return candidate;
    } catch {
      parts.pop();
    }
  }
  throw new Error('NeteaseCloudMusicApi not found in node_modules');
}

export async function startNeteaseAPI(): Promise<void> {
  if (apiProcess) return;

  const moduleRoot = findModuleRoot();
  const appPath = path.join(moduleRoot, 'app.js');

  apiProcess = spawn('node', [appPath], {
    env: { ...process.env, PORT: String(API_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  apiProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[NeteaseAPI] ${data.toString().trim()}`);
  });

  apiProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[NeteaseAPI:err] ${data.toString().trim()}`);
  });

  apiProcess.on('exit', (code) => {
    console.log(`[NeteaseAPI] exited with code ${code}`);
    apiProcess = null;
  });

  // Wait for server to be ready
  await waitForReady();
}

function waitForReady(maxRetries = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      http.get(`${API_BASE}/search?keywords=test&limit=1`, (res) => {
        if (res.statusCode === 200) return resolve();
        retry();
      }).on('error', () => retry());
    };
    const retry = () => {
      retries++;
      if (retries >= maxRetries) return reject(new Error('NeteaseAPI failed to start'));
      setTimeout(check, 1000);
    };
    check();
  });
}

export function stopNeteaseAPI(): void {
  if (apiProcess) {
    apiProcess.kill();
    apiProcess = null;
  }
}

export function getAPIBase(): string {
  return API_BASE;
}

export function isAPIRunning(): boolean {
  return apiProcess !== null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/netease-api-manager.ts
git commit -m "feat: add NeteaseCloudMusicApi subprocess manager"
```

---

### Task 6: Create music engine module

**Files:**
- Create: `src/main/music-engine.ts`

- [ ] **Step 1: Write music engine**

```ts
import { startNeteaseAPI, stopNeteaseAPI, getAPIBase } from './netease-api-manager';
import type { Track, PlaybackState, MusicSearchResult } from '../shared/types';

let currentState: PlaybackState = {
  isPlaying: false,
  currentTrack: null,
  progress: 0,
  duration: 0,
  volume: 70,
};

let stateChangeCallback: ((state: PlaybackState) => void) | null = null;

export function onStateChange(cb: (state: PlaybackState) => void): void {
  stateChangeCallback = cb;
}

function emitStateChange(): void {
  stateChangeCallback?.(currentState);
}

export async function initMusicEngine(): Promise<void> {
  await startNeteaseAPI();
}

export async function searchMusic(keywords: string, limit = 20): Promise<MusicSearchResult> {
  const base = getAPIBase();
  const url = `${base}/search?keywords=${encodeURIComponent(keywords)}&limit=${limit}`;

  const response = await fetch(url);
  const data = await response.json() as any;

  const tracks: Track[] = (data.result?.songs || []).map((song: any) => ({
    id: `ne_${song.id}`,
    title: song.name,
    artist: (song.ar || []).map((a: any) => a.name).join(', '),
    album: song.al?.name || '',
    duration: (song.dt || 0) / 1000,
    netEaseId: song.id,
  }));

  return { tracks };
}

export async function getTrackDetail(netEaseId: number): Promise<Track | null> {
  const base = getAPIBase();
  const url = `${base}/song/detail?ids=${netEaseId}`;

  const response = await fetch(url);
  const data = await response.json() as any;
  const song = data.songs?.[0];
  if (!song) return null;

  return {
    id: `ne_${song.id}`,
    title: song.name,
    artist: (song.ar || []).map((a: any) => a.name).join(', '),
    album: song.al?.name || '',
    duration: (song.dt || 0) / 1000,
    netEaseId: song.id,
  };
}

export function play(track: Track): void {
  currentState = {
    ...currentState,
    isPlaying: true,
    currentTrack: track,
    progress: 0,
    duration: track.duration,
  };
  emitStateChange();
}

export function pause(): void {
  currentState = { ...currentState, isPlaying: false };
  emitStateChange();
}

export function resume(): void {
  if (currentState.currentTrack) {
    currentState = { ...currentState, isPlaying: true };
    emitStateChange();
  }
}

export function setVolume(volume: number): void {
  currentState = { ...currentState, volume: Math.max(0, Math.min(100, volume)) };
  emitStateChange();
}

export function getState(): PlaybackState {
  return currentState;
}

export function shutdownMusicEngine(): void {
  stopNeteaseAPI();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/music-engine.ts
git commit -m "feat: add music engine with search, play, and state management"
```

---

## Phase 4: Preference Engine

### Task 7: Create preference learning engine

**Files:**
- Create: `src/main/preference-engine.ts`

- [ ] **Step 1: Write preference engine**

```ts
import type { Playlist, PreferenceProfile } from '../shared/types';
import { getPreferenceProfile, savePreferenceProfile } from './storage';

interface LLMConfig {
  apiKey: string;
  provider: 'claude' | 'openai';
  model: string;
}

export async function analyzePlaylist(
  playlist: Playlist,
  llmConfig: LLMConfig
): Promise<PreferenceProfile> {
  const trackListText = playlist.tracks
    .slice(0, 100) // Limit to 100 tracks for token budget
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

  // Merge with existing profile if present
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
  // Extract key genre/style terms from the profile for API search
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

  // OpenAI path
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/preference-engine.ts
git commit -m "feat: add LLM-driven preference learning engine"
```

---

### Task 8: Create chat service module

**Files:**
- Create: `src/main/chat-service.ts`

- [ ] **Step 1: Write chat service**

```ts
import { getConfig, getPreferenceProfile, createChatSession, getChatSession, appendMessage } from './storage';
import { getState } from './music-engine';
import type { ChatMessage, ChatSession, ChatSendResponse } from '../shared/types';

const MAX_CONTEXT_MESSAGES = 20; // 20 messages = 10 turns

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

  // Save user message
  const userMsg: ChatMessage = {
    id: `msg_${Date.now()}_user`,
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  };
  appendMessage(session.id, userMsg);

  // Build context
  const systemPrompt = buildSystemPrompt();
  const contextMessages = session.messages.slice(-MAX_CONTEXT_MESSAGES);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...contextMessages.map(m => ({ role: m.role, content: m.content })),
  ];

  // Call LLM
  const reply = await callChatLLM(messages, {
    apiKey: config.apiKey,
    provider: config.modelProvider,
    model: config.modelName,
  });

  // Save assistant response
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

  // OpenAI
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
```

- [ ] **Step 2: Commit**

```bash
git add src/main/chat-service.ts
git commit -m "feat: add LLM chat service with context injection"
```

---

## Phase 5: IPC Wiring

### Task 9: Register all IPC handlers

**Files:**
- Create: `src/main/ipc-handlers.ts`

- [ ] **Step 1: Write IPC handler registration**

```ts
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type {
  MusicSearchRequest, ImportLinkRequest, ImportFileRequest,
  AnalyzePlaylistRequest, ChatSendRequest,
} from '../shared/types';
import { searchMusic, play, pause, resume, setVolume, getState, initMusicEngine, onStateChange } from './music-engine';
import { analyzePlaylist, updateProfileWithFeedback } from './preference-engine';
import { sendMessage, getChatHistory } from './chat-service';
import { getConfig, saveConfig, savePlaylist, getAllPlaylists, deletePlaylist, getPreferenceProfile, savePreferenceProfile } from './storage';

export function registerAllHandlers(): void {
  // ---- Music ----

  ipcMain.handle(IPC_CHANNELS.MUSIC_SEARCH, async (_event, req: MusicSearchRequest) => {
    return searchMusic(req.keywords, req.limit);
  });

  ipcMain.handle(IPC_CHANNELS.MUSIC_PLAY, async (_event, track: any) => {
    play(track);
  });

  ipcMain.handle(IPC_CHANNELS.MUSIC_PAUSE, async () => {
    pause();
  });

  ipcMain.handle(IPC_CHANNELS.MUSIC_NEXT, async () => {
    // Placeholder: implement queue logic later
  });

  ipcMain.handle(IPC_CHANNELS.MUSIC_PREV, async () => {
    // Placeholder: implement queue logic later
  });

  ipcMain.handle(IPC_CHANNELS.MUSIC_SET_VOLUME, async (_event, volume: number) => {
    setVolume(volume);
  });

  ipcMain.handle(IPC_CHANNELS.MUSIC_GET_STATE, async () => {
    return getState();
  });

  // Push state changes to renderer
  onStateChange((state) => {
    const windows = require('electron').BrowserWindow.getAllWindows();
    windows.forEach(win => {
      win.webContents.send(IPC_CHANNELS.MUSIC_ON_STATE_CHANGE, state);
    });
  });

  // ---- Playlist ----

  ipcMain.handle(IPC_CHANNELS.PLAYLIST_IMPORT_LINK, async (_event, req: ImportLinkRequest) => {
    // Parse playlist link (Netease playlist URL)
    const match = req.url.match(/playlist\?id=(\d+)/) || req.url.match(/playlist\/(\d+)/);
    if (!match) throw new Error('无法识别的歌单链接格式');

    const playlistId = match[1];
    const base = require('./netease-api-manager').getAPIBase();
    const response = await fetch(`${base}/playlist/detail?id=${playlistId}`);
    const data = await response.json() as any;

    const playlist = {
      id: `pl_${playlistId}_${Date.now()}`,
      name: req.playlistName || data.playlist?.name || '导入的歌单',
      source: 'netEase' as const,
      tracks: (data.playlist?.tracks || []).map((t: any) => ({
        id: `ne_${t.id}`,
        title: t.name,
        artist: (t.ar || []).map((a: any) => a.name).join(', '),
        album: t.al?.name || '',
        duration: (t.dt || 0) / 1000,
        netEaseId: t.id,
      })),
      createdAt: new Date().toISOString(),
    };

    savePlaylist(playlist);
    return playlist;
  });

  ipcMain.handle(IPC_CHANNELS.PLAYLIST_IMPORT_FILE, async (_event, req: ImportFileRequest) => {
    // File import: expect JSON with { name, tracks: [{title, artist, album}] }
    const fs = require('fs');
    const content = fs.readFileSync(req.filePath, 'utf-8');
    const data = JSON.parse(content);

    const playlist = {
      id: `pl_file_${Date.now()}`,
      name: req.playlistName || data.name || '导入的歌单',
      source: 'file' as const,
      tracks: data.tracks.map((t: any, i: number) => ({
        id: `file_${Date.now()}_${i}`,
        title: t.title || t.name || '',
        artist: t.artist || '',
        album: t.album || '',
        duration: t.duration || 0,
        netEaseId: null,
      })),
      createdAt: new Date().toISOString(),
    };

    savePlaylist(playlist);
    return playlist;
  });

  ipcMain.handle(IPC_CHANNELS.PLAYLIST_GET_ALL, async () => {
    return getAllPlaylists();
  });

  ipcMain.handle(IPC_CHANNELS.PLAYLIST_DELETE, async (_event, id: string) => {
    deletePlaylist(id);
  });

  // ---- Preference ----

  ipcMain.handle(IPC_CHANNELS.PREFERENCE_ANALYZE, async (_event, req: AnalyzePlaylistRequest) => {
    const config = getConfig();
    const playlists = getAllPlaylists();
    const playlist = playlists.find(p => p.id === req.playlistId);
    if (!playlist) throw new Error('歌单不存在');

    return analyzePlaylist(playlist, {
      apiKey: config.apiKey,
      provider: config.modelProvider,
      model: config.modelName,
    });
  });

  ipcMain.handle(IPC_CHANNELS.PREFERENCE_GET, async () => {
    return getPreferenceProfile();
  });

  ipcMain.handle(IPC_CHANNELS.PREFERENCE_UPDATE, async (_event, text: string) => {
    const existing = getPreferenceProfile();
    const profile = {
      text,
      lastUpdated: new Date().toISOString(),
      sourcePlaylists: existing?.sourcePlaylists || [],
    };
    savePreferenceProfile(profile);
    return profile;
  });

  // ---- Chat ----

  ipcMain.handle(IPC_CHANNELS.CHAT_SEND, async (_event, req: ChatSendRequest) => {
    return sendMessage(req.message, req.sessionId);
  });

  ipcMain.handle(IPC_CHANNELS.CHAT_GET_HISTORY, async (_event, sessionId: string) => {
    return getChatHistory(sessionId);
  });

  // ---- Config ----

  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, async () => {
    return getConfig();
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_SAVE, async (_event, partial: any) => {
    return saveConfig(partial);
  });

  // ---- Init music engine ----
  initMusicEngine().catch(err => {
    console.error('Failed to start music engine:', err);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/ipc-handlers.ts
git commit -m "feat: register all IPC handlers for music, playlist, preference, chat, config"
```

---

## Phase 6: React Renderer

### Task 10: Create renderer entry, HTML, and CSS design tokens

**Files:**
- Create: `src/renderer/index.html`, `src/renderer/index.tsx`, `src/renderer/styles/global.css`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Music AI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./styles/global.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./index.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: Create global.css with Raycast design tokens**

```css
:root {
  /* Surface ladder */
  --canvas: #07080a;
  --surface: #0d0d0d;
  --surface-elevated: #101111;
  --surface-card: #121212;

  /* Text */
  --ink: #f4f4f6;
  --body: #cdcdcd;
  --muted: #9c9c9d;
  --ash: #6a6b6c;
  --stone: #434345;

  /* Borders */
  --hairline: #242728;
  --hairline-strong: rgba(255, 255, 255, 0.16);
  --hairline-soft: rgba(255, 255, 255, 0.08);

  /* Accent */
  --primary: #ffffff;
  --on-primary: #000000;

  /* Typography */
  --font-family: 'Inter', -apple-system, system-ui, sans-serif;

  /* Radii */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 16px;
  --radius-pill: 9999px;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-xxl: 32px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  background: var(--canvas);
  color: var(--body);
  font-size: 13px;
  line-height: 1.6;
  overflow: hidden;
  user-select: none;
  -webkit-font-smoothing: antialiased;
}

#root {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--hairline);
  border-radius: 3px;
}

input, textarea {
  font-family: var(--font-family);
  font-size: 13px;
  color: var(--ink);
  background: var(--surface-elevated);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  padding: 6px 10px;
  outline: none;
  transition: border-color 150ms;
}
input:focus, textarea:focus {
  border-color: var(--hairline-strong);
}

button {
  font-family: var(--font-family);
  cursor: pointer;
}

/* Primary CTA */
.btn-primary {
  background: var(--primary);
  color: var(--on-primary);
  border: none;
  border-radius: var(--radius-md);
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.btn-primary:hover {
  opacity: 0.9;
}

/* Secondary button */
.btn-secondary {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
}

.btn-secondary:hover {
  background: var(--surface);
}
```

- [ ] **Step 3: Create index.tsx**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/index.html src/renderer/index.tsx src/renderer/styles/global.css
git commit -m "feat: add renderer entry, HTML, and Raycast dark design tokens"
```

---

### Task 11: Create App root component and DraggableDivider

**Files:**
- Create: `src/renderer/App.tsx`, `src/renderer/components/DraggableDivider.tsx`

- [ ] **Step 1: Create DraggableDivider.tsx**

```tsx
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
```

- [ ] **Step 2: Create App.tsx**

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/App.tsx src/renderer/components/DraggableDivider.tsx
git commit -m "feat: add App root layout, draggable divider, and sidebar shell"
```

---

### Task 12: Create TitleBar and Sidebar components

**Files:**
- Create: `src/renderer/components/TitleBar.tsx`, `src/renderer/components/Sidebar.tsx`

- [ ] **Step 1: Create TitleBar.tsx**

```tsx
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
      }}
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
          Music AI
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, WebkitAppRegion: 'no-drag' }}>
        <button
          className="btn-secondary"
          style={{ fontSize: 11, padding: '3px 10px' }}
          onClick={() => onOpenSidebar('import')}
        >
          导入
        </button>
        <button
          className="btn-secondary"
          style={{ fontSize: 11, padding: '3px 10px' }}
          onClick={() => onOpenSidebar('personality')}
        >
          性格
        </button>
        <button
          className="btn-secondary"
          style={{ fontSize: 11, padding: '3px 10px' }}
          onClick={() => onOpenSidebar('preference')}
        >
          偏好
        </button>
        <button
          className="btn-secondary"
          style={{ fontSize: 11, padding: '3px 10px' }}
          onClick={() => onOpenSidebar('settings')}
        >
          设置
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
```

- [ ] **Step 2: Create Sidebar.tsx**

```tsx
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
      default: return <div>未知视图</div>;
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
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/TitleBar.tsx src/renderer/components/Sidebar.tsx
git commit -m "feat: add TitleBar and Sidebar navigation components"
```

---

### Task 13: Create MusicPanel, AlbumArt, PlaylistView components

**Files:**
- Create: `src/renderer/components/MusicPanel.tsx`, `src/renderer/components/AlbumArt.tsx`, `src/renderer/components/PlaylistView.tsx`

- [ ] **Step 1: Create AlbumArt.tsx**

```tsx
import React from 'react';
import type { Track } from '../../shared/types';

interface Props {
  track: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onVolumeChange: (v: number) => void;
}

const AlbumArt: React.FC<Props> = ({
  track, isPlaying, progress, duration, volume,
  onPlayPause, onNext, onPrev, onVolumeChange,
}) => {
  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      width: 180, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '16px 20px', gap: 10,
    }}>
      {/* Album art */}
      <div style={{
        width: 96, height: 96, borderRadius: 10,
        background: track
          ? 'linear-gradient(150deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)'
          : 'var(--surface-card)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, opacity: track ? 0.6 : 1, color: 'var(--stone)',
      }}>
        {track ? '♪' : '♫'}
      </div>

      {/* Track info */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4 }}>
          {track?.title || '未在播放'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
          {track ? `${track.artist} · ${track.album}` : '导入歌单开始播放'}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onPrev} style={ctrlBtnStyle}>⏮</button>
        <button
          onClick={onPlayPause}
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--primary)', color: 'var(--on-primary)',
            border: 'none', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 11, cursor: 'pointer',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={onNext} style={ctrlBtnStyle}>⏭</button>
      </div>

      {/* Progress */}
      <div style={{ width: '100%' }}>
        <div style={{
          width: '100%', height: 3, background: 'var(--hairline)',
          borderRadius: 9999, overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressPct}%`, height: '100%',
            background: 'var(--ink)', borderRadius: 9999,
          }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 9, color: 'var(--ash)', marginTop: 3,
        }}>
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
        <span style={{ fontSize: 10, color: 'var(--ash)' }}>🔊</span>
        <input
          type="range"
          min={0} max={100}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--ink)' }}
        />
      </div>
    </div>
  );
};

const ctrlBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none',
  color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
};

export default AlbumArt;
```

- [ ] **Step 2: Create PlaylistView.tsx**

```tsx
import React from 'react';
import type { Track } from '../../shared/types';

interface Props {
  tracks: Track[];
  currentTrackId: string | null;
  onPlayTrack: (track: Track) => void;
  onImport: () => void;
}

const PlaylistView: React.FC<Props> = ({ tracks, currentTrackId, onPlayTrack, onImport }) => {
  return (
    <div style={{ flex: 1, padding: '12px 16px', borderLeft: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>当前歌单</span>
          <span style={{
            fontSize: 10, color: 'var(--ash)', background: 'var(--surface-elevated)',
            padding: '1px 6px', borderRadius: 9999,
          }}>
            {tracks.length}
          </span>
        </div>
        <button className="btn-primary" style={{ fontSize: 10, padding: '4px 10px' }} onClick={onImport}>
          + 导入
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {tracks.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--stone)', fontSize: 11, marginTop: 40 }}>
            暂无歌曲，点击"+ 导入"添加歌单
          </div>
        ) : (
          tracks.map((track, i) => (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 6,
                background: track.id === currentTrackId ? 'var(--surface-elevated)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <span style={{
                fontSize: 10, width: 16, textAlign: 'center',
                color: track.id === currentTrackId ? 'var(--ink)' : 'var(--stone)',
              }}>
                {track.id === currentTrackId ? '▶' : i + 1}
              </span>
              <div style={{
                width: 24, height: 24, borderRadius: 4, flexShrink: 0,
                background: `linear-gradient(135deg, ${randomGradientColor(i)}, ${randomGradientColor(i + 5)})`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 500,
                  color: track.id === currentTrackId ? 'var(--ink)' : 'var(--body)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {track.title}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {track.artist}
                </div>
              </div>
              <span style={{ fontSize: 10, color: 'var(--ash)' }}>
                {formatDuration(track.duration)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const GRADIENT_COLORS = ['#1a1a2e,#0f3460', '#2a1a3e,#3a2050', '#1a2e1a,#2a3e2a', '#2e1a2e,#4a1a4a', '#3e2a1a,#6e4a2a'];
function randomGradientColor(i: number): string {
  return GRADIENT_COLORS[i % GRADIENT_COLORS.length];
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default PlaylistView;
```

- [ ] **Step 3: Create MusicPanel.tsx**

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import AlbumArt from './AlbumArt';
import PlaylistView from './PlaylistView';
import type { Track, PlaybackState } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/types';

declare global {
  interface Window {
    musicAI: { invoke: (channel: string, ...args: unknown[]) => Promise<any>; on: (channel: string, cb: (...args: unknown[]) => void) => () => void };
  }
}

const MusicPanel: React.FC = () => {
  const [state, setState] = useState<PlaybackState>({
    isPlaying: false, currentTrack: null, progress: 0, duration: 0, volume: 70,
  });
  const [tracks, setTracks] = useState<Track[]>([]);
  const api = window.musicAI;

  useEffect(() => {
    api.invoke(IPC_CHANNELS.MUSIC_GET_STATE).then(setState);
    api.invoke(IPC_CHANNELS.PLAYLIST_GET_ALL).then((playlists: any[]) => {
      const allTracks = playlists.flatMap((p: any) => p.tracks);
      setTracks(allTracks);
    });

    const unsub = api.on(IPC_CHANNELS.MUSIC_ON_STATE_CHANGE, (s: any) => setState(s as PlaybackState));
    return unsub;
  }, []);

  const handlePlayTrack = useCallback((track: Track) => {
    api.invoke(IPC_CHANNELS.MUSIC_PLAY, track);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (state.isPlaying) {
      api.invoke(IPC_CHANNELS.MUSIC_PAUSE);
    } else if (state.currentTrack) {
      api.invoke(IPC_CHANNELS.MUSIC_PLAY, state.currentTrack);
    }
  }, [state]);

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--surface)' }}>
      <AlbumArt
        track={state.currentTrack}
        isPlaying={state.isPlaying}
        progress={state.progress}
        duration={state.duration}
        volume={state.volume}
        onPlayPause={handlePlayPause}
        onNext={() => api.invoke(IPC_CHANNELS.MUSIC_NEXT)}
        onPrev={() => api.invoke(IPC_CHANNELS.MUSIC_PREV)}
        onVolumeChange={(v) => api.invoke(IPC_CHANNELS.MUSIC_SET_VOLUME, v)}
      />
      <PlaylistView
        tracks={tracks}
        currentTrackId={state.currentTrack?.id || null}
        onPlayTrack={handlePlayTrack}
        onImport={() => {}} // Will be wired to sidebar open
      />
    </div>
  );
};

export default MusicPanel;
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/MusicPanel.tsx src/renderer/components/AlbumArt.tsx src/renderer/components/PlaylistView.tsx
git commit -m "feat: add MusicPanel, AlbumArt, and PlaylistView components"
```

---

### Task 14: Create ChatPanel, MessageList, ChatInput components

**Files:**
- Create: `src/renderer/components/ChatPanel.tsx`, `src/renderer/components/MessageList.tsx`, `src/renderer/components/ChatInput.tsx`

- [ ] **Step 1: Create MessageList.tsx**

```tsx
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
          }}
        >
          {msg.role === 'assistant' && (
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, marginRight: 6,
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
```

- [ ] **Step 2: Create ChatInput.tsx**

```tsx
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
```

- [ ] **Step 3: Create ChatPanel.tsx**

```tsx
import React, { useState, useCallback } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import type { ChatMessage } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/types';

declare global {
  interface Window {
    musicAI: { invoke: (channel: string, ...args: unknown[]) => Promise<any>; on: (channel: string, cb: (...args: unknown[]) => void) => () => void };
  }
}

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
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/ChatPanel.tsx src/renderer/components/MessageList.tsx src/renderer/components/ChatInput.tsx
git commit -m "feat: add ChatPanel, MessageList, and ChatInput components"
```

---

### Task 15: Create sidebar panel components

**Files:**
- Create: `src/renderer/components/ImportPlaylist.tsx`, `src/renderer/components/PersonalityConfig.tsx`, `src/renderer/components/PreferenceProfile.tsx`, `src/renderer/components/Settings.tsx`

- [ ] **Step 1: Create ImportPlaylist.tsx**

```tsx
import React, { useState } from 'react';
import { IPC_CHANNELS } from '../../shared/types';

const ImportPlaylist: React.FC = () => {
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const api = window.musicAI;

  const handleImportLink = async () => {
    if (!link.trim()) return;
    setLoading(true);
    try {
      const result = await api.invoke(IPC_CHANNELS.PLAYLIST_IMPORT_LINK, { url: link.trim() });
      setMessage(`已导入: ${result.name} (${result.tracks.length} 首)`);
      setLink('');
    } catch (err: any) {
      setMessage(`导入失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async () => {
    // Use Electron dialog through IPC
    setMessage('文件导入功能开发中，请使用链接导入');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>粘贴分享链接</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="粘贴网易云/QQ音乐歌单链接..."
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={handleImportLink} disabled={loading}>
            {loading ? '解析中...' : '导入'}
          </button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>上传文件</div>
        <button className="btn-secondary" onClick={handleImportFile} style={{ width: '100%' }}>
          选择歌单文件 (JSON)
        </button>
        <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 6 }}>
          支持 JSON 格式: {"{"}"name": "歌单名", "tracks": [{"{"}"title": "...", "artist": "...", "album": "..."{"}"}]{"}"}
        </div>
      </div>

      {message && (
        <div style={{
          fontSize: 11, color: message.includes('失败') ? '#ff6161' : '#59d499',
          padding: '8px 12px', borderRadius: 6,
          background: message.includes('失败') ? 'rgba(255,97,97,0.15)' : 'rgba(89,212,153,0.15)',
        }}>
          {message}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Create PersonalityConfig.tsx**

```tsx
import React, { useState, useEffect } from 'react';
import { IPC_CHANNELS } from '../../shared/types';

const PersonalityConfig: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [saved, setSaved] = useState(false);
  const api = window.musicAI;

  useEffect(() => {
    api.invoke(IPC_CHANNELS.CONFIG_GET).then((config: any) => {
      setPrompt(config.personalityPrompt || '');
    });
  }, []);

  const handleSave = async () => {
    await api.invoke(IPC_CHANNELS.CONFIG_SAVE, { personalityPrompt: prompt });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
        用自然语言描述你的 AI 伙伴的性格。这段文字会被注入到每次对话中。
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={8}
        style={{
          width: '100%', resize: 'vertical',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--hairline)',
          borderRadius: 8, padding: 10,
          fontSize: 12, color: 'var(--ink)',
          fontFamily: 'var(--font-family)',
          lineHeight: 1.6,
        }}
        placeholder="例如：你是一个叫小音的AI朋友，性格温暖但偶尔毒舌，喜欢用音乐比喻生活..."
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: saved ? '#59d499' : 'var(--stone)' }}>
          {saved ? '✓ 已保存' : ''}
        </span>
        <button className="btn-primary" onClick={handleSave}>保存</button>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Create PreferenceProfile.tsx**

```tsx
import React, { useState, useEffect } from 'react';
import { IPC_CHANNELS } from '../../shared/types';

const PreferenceProfile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const api = window.musicAI;

  useEffect(() => {
    api.invoke(IPC_CHANNELS.PREFERENCE_GET).then(setProfile);
  }, []);

  const handleAnalyze = async () => {
    const playlists = await api.invoke(IPC_CHANNELS.PLAYLIST_GET_ALL);
    if (playlists.length === 0) {
      setMessage('请先导入歌单');
      return;
    }
    try {
      const result = await api.invoke(IPC_CHANNELS.PREFERENCE_ANALYZE, { playlistId: playlists[0].id });
      setProfile(result);
      setMessage('分析完成!');
    } catch (err: any) {
      setMessage(`分析失败: ${err.message}`);
    }
  };

  const handleSaveEdit = async () => {
    const updated = await api.invoke(IPC_CHANNELS.PREFERENCE_UPDATE, text);
    setProfile(updated);
    setEditing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!editing && profile?.text ? (
        <div>
          <div style={{ fontSize: 12, color: 'var(--body)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {profile.text}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 8 }}>
            更新于: {profile.lastUpdated}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-secondary" onClick={() => { setText(profile.text); setEditing(true); }}>
              编辑
            </button>
            <button className="btn-primary" onClick={handleAnalyze}>
              重新分析
            </button>
          </div>
        </div>
      ) : editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            style={{
              width: '100%', resize: 'vertical',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--hairline)',
              borderRadius: 8, padding: 10,
              fontSize: 12, color: 'var(--ink)',
              fontFamily: 'var(--font-family)',
              lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setEditing(false)}>取消</button>
            <button className="btn-primary" onClick={handleSaveEdit}>保存</button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
            还没有偏好画像。导入歌单后分析你的音乐品味。
          </div>
          <button className="btn-primary" onClick={handleAnalyze}>
            开始分析
          </button>
        </div>
      )}

      {message && (
        <div style={{
          fontSize: 11, color: message.includes('失败') ? '#ff6161' : '#59d499',
          padding: '8px 12px', borderRadius: 6,
          background: message.includes('失败') ? 'rgba(255,97,97,0.15)' : 'rgba(89,212,153,0.15)',
        }}>
          {message}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Create Settings.tsx**

```tsx
import React, { useState, useEffect } from 'react';
import { IPC_CHANNELS } from '../../shared/types';

const Settings: React.FC = () => {
  const [config, setConfig] = useState({ apiKey: '', modelProvider: 'claude', modelName: 'claude-sonnet-4-6' });
  const [saved, setSaved] = useState(false);
  const api = window.musicAI;

  useEffect(() => {
    api.invoke(IPC_CHANNELS.CONFIG_GET).then((c: any) => {
      setConfig({ apiKey: c.apiKey || '', modelProvider: c.modelProvider, modelName: c.modelName });
    });
  }, []);

  const handleSave = async () => {
    await api.invoke(IPC_CHANNELS.CONFIG_SAVE, config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>API 提供商</div>
        <select
          value={config.modelProvider}
          onChange={(e) => setConfig({ ...config, modelProvider: e.target.value, modelName: e.target.value === 'claude' ? 'claude-sonnet-4-6' : 'gpt-4o' })}
          style={{
            width: '100%', background: 'var(--surface-elevated)', color: 'var(--ink)',
            border: '1px solid var(--hairline)', borderRadius: 8, padding: '8px 10px',
            fontSize: 12, fontFamily: 'var(--font-family)',
          }}
        >
          <option value="claude">Claude (Anthropic)</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>模型</div>
        <select
          value={config.modelName}
          onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
          style={{
            width: '100%', background: 'var(--surface-elevated)', color: 'var(--ink)',
            border: '1px solid var(--hairline)', borderRadius: 8, padding: '8px 10px',
            fontSize: 12, fontFamily: 'var(--font-family)',
          }}
        >
          {config.modelProvider === 'claude' ? (
            <>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
              <option value="claude-opus-4-7">Claude Opus 4.7</option>
              <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
            </>
          ) : (
            <>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
            </>
          )}
        </select>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>API Key</div>
        <input
          type="password"
          value={config.apiKey}
          onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
          placeholder="sk-..."
          style={{ width: '100%' }}
        />
        <div style={{ fontSize: 10, color: 'var(--ash)', marginTop: 4 }}>
          API Key 仅存储在你本地，不会上传到任何服务器
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: saved ? '#59d499' : 'var(--stone)' }}>
          {saved ? '✓ 已保存' : ''}
        </span>
        <button className="btn-primary" onClick={handleSave}>保存设置</button>
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/ImportPlaylist.tsx src/renderer/components/PersonalityConfig.tsx src/renderer/components/PreferenceProfile.tsx src/renderer/components/Settings.tsx
git commit -m "feat: add ImportPlaylist, PersonalityConfig, PreferenceProfile, Settings components"
```

---

## Phase 7: Integration & Polish

### Task 16: Wire sidebar open from MusicPanel import button and finalize integration

**Files:**
- Modify: `src/renderer/components/MusicPanel.tsx`, `src/renderer/App.tsx`

- [ ] **Step 1: Update MusicPanel to accept onImport callback**

In MusicPanel.tsx, update Props to include `onImport: () => void` and pass it to PlaylistView:

```tsx
// Update the interface
interface MusicPanelProps {
  onImport: () => void;
}

// In the component:
const MusicPanel: React.FC<MusicPanelProps> = ({ onImport }) => {
  // ... rest stays the same, but pass onImport to PlaylistView:
  <PlaylistView
    tracks={tracks}
    currentTrackId={state.currentTrack?.id || null}
    onPlayTrack={handlePlayTrack}
    onImport={onImport}
  />
};
```

- [ ] **Step 2: Update App.tsx to pass onImport callback**

```tsx
// In App.tsx, update MusicPanel usage:
<MusicPanel onImport={() => openSidebar('import')} />
```

- [ ] **Step 3: Add a global type declaration file for the musicAI API**

Create `src/renderer/types/global.d.ts`:

```ts
import type { MusicAIApi } from '../../main/preload';

declare global {
  interface Window {
    musicAI: MusicAIApi;
  }
}

export {};
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/App.tsx src/renderer/components/MusicPanel.tsx src/renderer/types/global.d.ts
git commit -m "feat: wire sidebar import flow and add type declarations"
```

---

### Task 17: Start music engine on app launch

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: Update index.ts to import init modules**

In `index.ts`, add import and call after `registerAllHandlers()`:

```ts
import { initStorage } from './storage';
import { initMusicEngine } from './music-engine';

// In app.whenReady():
app.whenReady().then(() => {
  initStorage();
  registerAllHandlers();
  initMusicEngine().catch(err => {
    console.error('Music engine init failed:', err);
  });
  createWindow();
});
```

- [ ] **Step 2: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: initialize storage and music engine on app startup"
```

---

## Phase 8: Build & Package

### Task 18: Add build scripts and verify cross-platform packaging

**Files:**
- Modify: `package.json` (verify scripts)
- Create: `assets/` directory

- [ ] **Step 1: Ensure build scripts work**

Run: `cd "F:/workpaltfor claudecode/music ai" && npm run build:main`
Expected: TypeScript compiles main process to `dist/main/`

- [ ] **Step 2: Build renderer**

Run: `npm run build:renderer`
Expected: Vite builds to `dist/renderer/`

- [ ] **Step 3: Create assets directory**

```bash
mkdir -p "F:/workpaltfor claudecode/music ai/assets"
```

Add placeholder icons (can be replaced with real icons later).

- [ ] **Step 4: Test Electron launch**

Run: `npm run dev:main`
Expected: Electron window opens with the Music AI app

- [ ] **Step 5: Commit**

```bash
git add package.json assets/
git commit -m "chore: add build scripts and placeholder assets"
```

---

---

### Task 19: Add error logging to error-log.md

**Files:**
- Modify: `src/main/ipc-handlers.ts`

- [ ] **Step 1: Add error logging utility in storage.ts**

Add to `src/main/storage.ts`:

```ts
import path from 'path';
import fs from 'fs';

const ERROR_LOG_PATH = path.join(__dirname, '..', '..', 'wrong record', 'error-log.md');

export function logError(description: string, error: Error): void {
  const timestamp = new Date().toISOString();
  const entry = `\n### [${timestamp}] ${description}\n\n**现象**：${error.message}\n**堆栈**：\`\`\`\n${error.stack || '无堆栈'}\n\`\`\`\n**状态**：未解决\n\n---\n`;

  try {
    const content = fs.readFileSync(ERROR_LOG_PATH, 'utf-8');
    const updated = content.replace('> 暂无记录', '').replace('## 错误列表\n', `## 错误列表\n${entry}`);
    fs.writeFileSync(ERROR_LOG_PATH, updated);
  } catch {
    // Log path might not exist in dev; silently skip
  }
}
```

- [ ] **Step 2: Wire error logging into IPC handlers**

In `src/main/ipc-handlers.ts`, wrap handlers with try/catch and call logError:

Each handler that does API calls (music search, preference analyze, chat send, playlist import) should catch errors and log them before re-throwing:

```ts
// In the MUSIC_SEARCH handler:
ipcMain.handle(IPC_CHANNELS.MUSIC_SEARCH, async (_event, req: MusicSearchRequest) => {
  try {
    return await searchMusic(req.keywords, req.limit);
  } catch (err: any) {
    logError('音乐搜索失败', err);
    throw err;
  }
});
```

Apply the same pattern to: `MUSIC_SEARCH`, `PLAYLIST_IMPORT_LINK`, `PREFERENCE_ANALYZE`, `CHAT_SEND`.

- [ ] **Step 3: Commit**

```bash
git add src/main/storage.ts src/main/ipc-handlers.ts
git commit -m "feat: add error logging to wrong record/error-log.md"
```

---

## Spec Coverage Review

| Spec Requirement | Covered By |
|-----------------|------------|
| Electron + React + TS | Tasks 1, 3, 10 |
| NeteaseCloudMusicApi subprocess | Tasks 5, 6 |
| LLM preference analysis | Task 7 |
| Chat AI with context | Task 8 |
| SQLite + JSON storage | Task 4 |
| Top/bottom split + draggable divider | Tasks 11, 13, 14 |
| Album art + playback controls | Task 13 |
| Playlist track list | Task 13 |
| Chat bubbles + input | Task 14 |
| Import playlist (link + file) | Task 15 |
| Personality config (text box) | Task 15 |
| Preference profile (view + edit) | Task 15 |
| Settings (API key + model) | Task 15 |
| Raycast dark design tokens | Task 10 |
| IPC communication | Tasks 3, 9 |
| Cross-platform build | Tasks 1, 18 |
| Error: API retry | Tasks 7, 8 (try/catch) |
| Error: Parse failure message | Task 15 |
