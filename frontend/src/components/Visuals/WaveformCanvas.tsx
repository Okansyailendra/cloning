import React, { useRef, useEffect } from 'react';
import type { WaveformVisual } from '../../types/api';

interface WaveformCanvasProps {
  waveform: WaveformVisual;
  duration_s: number;
  activeIntervals: [number, number][];
  currentTime?: number;
  onSeek?: (time_s: number) => void;
  accentColor?: string;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  waveform,
  duration_s,
  activeIntervals,
  currentTime = 0,
  onSeek,
  accentColor = '#22D3C5'
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

    // Clear
    ctx.fillStyle = '#0F151E';
    ctx.fillRect(0, 0, width, height);

    // Grid center line
    ctx.strokeStyle = '#1E293B';
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
        ctx.fillStyle = 'rgba(34, 211, 197, 0.05)';
        ctx.fillRect(x1, 0, x2 - x1, height);
      });
    }

    // Draw waveform bars
    const barWidth = Math.max(1, width / points);
    for (let i = 0; i < points; i++) {
      const x = (i / points) * width;
      const minVal = minArr[i] ?? 0;
      const maxVal = maxArr[i] ?? 0;

      const yTop = centerY - maxVal * (height * 0.45);
      const yBottom = centerY - minVal * (height * 0.45);

      // Check if this time point is in active intervals
      const timeAtPoint = (i / points) * duration_s;
      const isActive = activeIntervals.some(([s, e]) => timeAtPoint >= s && timeAtPoint <= e);

      ctx.fillStyle = isActive ? accentColor : '#475569';
      ctx.fillRect(x, yTop, Math.max(1, barWidth - 0.5), Math.max(1, yBottom - yTop));
    }

    // Draw playhead vertical line
    if (duration_s > 0 && currentTime >= 0) {
      const playheadX = Math.min(width, (currentTime / duration_s) * width);
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [waveform, duration_s, activeIntervals, currentTime, accentColor]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || duration_s <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration_s);
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Bentuk Gelombang Sinyal (Waveform)
        </h3>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {waveform.points} titik sampel • Klik untuk navigasi pemutar
        </span>
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
          border: '1px solid var(--border-subtle)'
        }}
      />
    </div>
  );
};
