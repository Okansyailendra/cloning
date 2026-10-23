import React, { useRef, useEffect } from 'react';
import type { WaveformVisual, ChunkResult } from '../../types/api';

interface WaveformCanvasProps {
  waveform: WaveformVisual;
  duration_s: number;
  activeIntervals: [number, number][];
  currentTime?: number;
  onSeek?: (time_s: number) => void;
  accentColor?: string;
  chunks?: ChunkResult[];
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  waveform,
  duration_s,
  activeIntervals,
  currentTime = 0,
  onSeek,
  accentColor = '#10B981',
  chunks
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    // Dark Scientific Canvas Background
    ctx.fillStyle = '#0B0F17';
    ctx.fillRect(0, 0, width, height);

    // Grid center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    const points = waveform.points;
    const minArr = waveform.min;
    const maxArr = waveform.max;

    // Draw active intervals background shading
    if (duration_s > 0) {
      activeIntervals.forEach(([start, end]) => {
        const x1 = (start / duration_s) * width;
        const x2 = (end / duration_s) * width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(x1, 0, x2 - x1, height);
      });
    }

    // Draw waveform bars with chunk-aware classification colors
    const barWidth = Math.max(1, width / points);
    for (let i = 0; i < points; i++) {
      const x = (i / points) * width;
      const minVal = minArr[i] ?? 0;
      const maxVal = maxArr[i] ?? 0;

      // Anchor bars properly around centerY
      const yTop = Math.min(centerY - 1, centerY - maxVal * (height * 0.45));
      const yBottom = Math.max(centerY + 1, centerY - minVal * (height * 0.45));

      const timeAtPoint = (i / points) * duration_s;
      const isActive = activeIntervals.some(([s, e]) => timeAtPoint >= s && timeAtPoint <= e);

      let barColor = '#334155'; // default muted for inactive/silence
      if (isActive) {
        if (chunks && chunks.length > 0) {
          const matchingChunk = chunks.find(ch => timeAtPoint >= ch.start_s && timeAtPoint <= ch.end_s);
          if (matchingChunk) {
            barColor = matchingChunk.label === 'berisik' ? '#FF5C26' : '#10B981';
          } else {
            barColor = accentColor;
          }
        } else {
          barColor = accentColor;
        }
      }

      ctx.fillStyle = barColor;
      ctx.fillRect(x, yTop, Math.max(1, barWidth - 0.5), Math.max(1, yBottom - yTop));
    }

    // Draw playhead vertical line
    if (duration_s > 0 && currentTime >= 0) {
      const playheadX = Math.min(width, (currentTime / duration_s) * width);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [waveform, duration_s, activeIntervals, currentTime, accentColor, chunks]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || duration_s <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration_s);
  };

  return (
    <div className="glass-card" style={{
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Bentuk Gelombang Sinyal (Waveform)
        </h3>
        
        {/* Dynamic Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF5C26' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Berisik</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Non-Berisik</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#334155' }} />
            <span style={{ color: 'var(--text-muted)' }}>Hening</span>
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={1000}
        height={140}
        onClick={handleClick}
        style={{
          width: '100%',
          height: '140px',
          borderRadius: 'var(--radius-md)',
          cursor: onSeek ? 'pointer' : 'default',
          border: '1px solid var(--border-subtle)',
          display: 'block'
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        <span>0.0s</span>
        <span>Klik canvas pada posisi gelombang untuk melompat ke detik tersebut</span>
        <span>{duration_s.toFixed(1)}s</span>
      </div>
    </div>
  );
};
