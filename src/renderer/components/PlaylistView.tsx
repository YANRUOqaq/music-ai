import React from 'react';
import type { Track } from '../../shared/types';

interface Props {
  tracks: Track[];
  currentTrackId: string | null;
  onPlayTrack: (track: Track) => void;
  onImport: () => void;
}

const GRADIENT_COLORS = ['#1a1a2e,#0f3460', '#2a1a3e,#3a2050', '#1a2e1a,#2a3e2a', '#2e1a2e,#4a1a4a', '#3e2a1a,#6e4a2a'];

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
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
                background: `linear-gradient(135deg, ${GRADIENT_COLORS[i % GRADIENT_COLORS.length]})`,
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

export default PlaylistView;
