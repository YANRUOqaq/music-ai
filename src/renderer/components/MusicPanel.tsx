import React, { useState, useEffect, useCallback } from 'react';
import AlbumArt from './AlbumArt';
import PlaylistView from './PlaylistView';
import type { Track, PlaybackState } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/types';

interface MusicPanelProps {
  onImport: () => void;
}

const MusicPanel: React.FC<MusicPanelProps> = ({ onImport }) => {
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
        onImport={onImport}
      />
    </div>
  );
};

export default MusicPanel;
