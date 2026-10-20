import React, { useRef, useEffect, useState } from 'react';
import type { SpectrogramVisual } from '../../types/api';

interface SpectrogramCanvasProps {
  spectrogram: SpectrogramVisual;
  duration_s: number;
}

// Precomputed Inferno Colormap LUT (256 colors)
const getInfernoColor = (val: number): [number, number, number] => {
  // Approximate standard inferno: black -> purple -> red-orange -> yellow-white
  const norm = Math.max(0, Math.min(255, val)) / 255;
  let r = 0, g = 0, b = 0;

  if (norm < 0.25) {
    const t = norm / 0.25;
    r = Math.round(15 + t * 45);
    g = Math.round(5 + t * 15);
    b = Math.round(25 + t * 85);
  } else if (norm < 0.5) {
    const t = (norm - 0.25) / 0.25;
    r = Math.round(60 + t * 135);
    g = Math.round(20 + t * 45);
    b = Math.round(110 - t * 30);
  } else if (norm < 0.75) {
    const t = (norm - 0.5) / 0.25;
    r = Math.round(195 + t * 50);
    g = Math.round(65 + t * 105);
    b = Math.round(80 - t * 65);
  } else {
    const t = (norm - 0.75) / 0.25;
    r = Math.round(245 + t * 10);
    g = Math.round(170 + t * 85);
    b = Math.round(15 + t * 200);
  }
  return [r, g, b];
};

export const SpectrogramCanvas: React.FC<SpectrogramCanvasProps> = ({ spectrogram, duration_s }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ time_s: string; freq_hz: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { n_mels, n_frames, data } = spectrogram;
    if (!data || data.length === 0 || !data[0]) return;

    canvas.width = n_frames;
    canvas.height = n_mels;

    const imgData = ctx.createImageData(n_frames, n_mels);
    const pixels = imgData.data;

    // Draw from top (highest mel freq) to bottom (lowest mel freq)
    for (let mel = 0; mel < n_mels; mel++) {
      // In data array, row 0 is lowest frequency, so invert for canvas top-to-bottom
      const dataRow = n_mels - 1 - mel;
      const row = data[dataRow] || [];
      for (let frame = 0; frame < n_frames; frame++) {
        const val = row[frame] ?? 0;
        const [r, g, b] = getInfernoColor(val);
        const idx = (mel * n_frames + frame) * 4;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [spectrogram]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const timeRatio = Math.max(0, Math.min(1, x / rect.width));
    const freqRatio = Math.max(0, Math.min(1, 1 - y / rect.height));

    const time_s = (timeRatio * duration_s).toFixed(2);
    const melIdx = Math.floor(freqRatio * (spectrogram.n_mels - 1));
    const freq_hz = spectrogram.freqs_hz[melIdx] ? Math.round(spectrogram.freqs_hz[melIdx]) : 0;

    setHoverInfo({ time_s: `${time_s} dtk`, freq_hz: `${freq_hz} Hz` });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
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
          Spektrogram Mel (Energi Frekuensi terhadap Waktu)
        </h3>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {hoverInfo ? (
            <span style={{ color: 'var(--accent-quiet)' }}>
              {hoverInfo.time_s} • {hoverInfo.freq_hz}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>64 Mel Bins • Colormap Inferno</span>
          )}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            width: '100%',
            height: '160px',
            borderRadius: 'var(--radius-md)',
            imageRendering: 'pixelated',
            border: '1px solid var(--border-subtle)',
            display: 'block'
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          marginTop: '4px'
        }}>
          <span>0.0 dtk</span>
          <span>Sumbu Frekuensi: 0 Hz — 11.025 Hz</span>
          <span>{duration_s.toFixed(1)} dtk</span>
        </div>
      </div>
    </div>
  );
};
