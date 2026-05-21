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
  const trimmed = messages.slice(-40);
  db.prepare('UPDATE chat_sessions SET messages_json = ? WHERE id = ?').run(JSON.stringify(trimmed), sessionId);
}

export function closeStorage(): void {
  db.close();
}
