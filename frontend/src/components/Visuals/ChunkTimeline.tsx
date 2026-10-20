import React from 'react';
import type { ChunkResult } from '../../types/api';

interface ChunkTimelineProps {
  chunks: ChunkResult[];
  onSelectChunk?: (start_s: number) => void;
}

export const ChunkTimeline: React.FC<ChunkTimelineProps> = ({ chunks, onSelectChunk }) => {
  if (!chunks || chunks.length === 0) return null;

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Linimasa Prediksi per Chunk (3 Detik)
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Model menganalisis audio dalam segmen 3 detik. Klik segmen untuk memutar bagian tersebut.
          </p>
        </div>
        <span style={{
          fontSize: '11px',
          padding: '2px 8px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--bg-surface-elevated)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)'
        }}>
          Indikatif
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(130px, 1fr))`,
        gap: '8px'
      }}>
        {chunks.map((ch) => {
          const isNoisy = ch.label === 'berisik';
          return (
            <button
              key={ch.index}
              onClick={() => onSelectChunk && onSelectChunk(ch.start_s)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isNoisy ? 'var(--accent-noisy-bg)' : 'var(--accent-quiet-bg)',
                border: `1px solid ${isNoisy ? 'var(--accent-noisy-border)' : 'var(--accent-quiet-border)'}`,
                textAlign: 'left',
                transition: 'transform 0.1s ease, border-color 0.15s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  #{ch.index + 1}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: isNoisy ? 'var(--accent-noisy)' : 'var(--accent-quiet)'
                }}>
                  {ch.label.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {(ch.confidence * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {ch.start_s}s - {ch.end_s}s
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
