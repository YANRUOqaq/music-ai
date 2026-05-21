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
