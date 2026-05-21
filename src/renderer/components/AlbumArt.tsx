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

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4 }}>
          {track?.title || '未在播放'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
          {track ? `${track.artist} · ${track.album}` : '导入歌单开始播放'}
        </div>
      </div>

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
