import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type {
  MusicSearchRequest, ImportLinkRequest, ImportFileRequest,
  AnalyzePlaylistRequest, ChatSendRequest,
} from '../shared/types';
import { searchMusic, play, pause, resume, setVolume, getState, initMusicEngine, onStateChange } from './music-engine';
import { analyzePlaylist, updateProfileWithFeedback } from './preference-engine';
import { sendMessage, getChatHistory } from './chat-service';
import { getConfig, saveConfig, savePlaylist, getAllPlaylists, deletePlaylist, getPreferenceProfile, savePreferenceProfile, logError } from './storage';
import { getAPIBase } from './netease-api-manager';
import fs from 'fs';

export function registerAllHandlers(): void {
  // ---- Music ----

  ipcMain.handle(IPC_CHANNELS.MUSIC_SEARCH, async (_event, req: MusicSearchRequest) => {
    try {
      return await searchMusic(req.keywords, req.limit);
    } catch (err: any) {
      logError('音乐搜索失败', err);
      throw err;
    }
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
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send(IPC_CHANNELS.MUSIC_ON_STATE_CHANGE, state);
    });
  });

  // ---- Playlist ----

  ipcMain.handle(IPC_CHANNELS.PLAYLIST_IMPORT_LINK, async (_event, req: ImportLinkRequest) => {
    try {
      const match = req.url.match(/playlist\?id=(\d+)/) || req.url.match(/playlist\/(\d+)/);
      if (!match) throw new Error('无法识别的歌单链接格式');

      const playlistId = match[1];
      const base = getAPIBase();
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
    } catch (err: any) {
      logError('歌单导入失败', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.PLAYLIST_IMPORT_FILE, async (_event, req: ImportFileRequest) => {
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
    try {
      const config = getConfig();
      const playlists = getAllPlaylists();
      const playlist = playlists.find(p => p.id === req.playlistId);
      if (!playlist) throw new Error('歌单不存在');

      return analyzePlaylist(playlist, {
        apiKey: config.apiKey,
        provider: config.modelProvider,
        model: config.modelName,
      });
    } catch (err: any) {
      logError('偏好分析失败', err);
      throw err;
    }
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
    try {
      return await sendMessage(req.message, req.sessionId);
    } catch (err: any) {
      logError('聊天请求失败', err);
      throw err;
    }
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
