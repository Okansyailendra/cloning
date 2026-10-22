import React, { useRef, useEffect, useState } from 'react';
import type { SpectrogramVisual } from '../../types/api';

interface SpectrogramCanvasProps {
  spectrogram: SpectrogramVisual;
  duration_s: number;
}

// Lush Emerald to Luminous Lime Aurora Colormap LUT (256 colors)
const getAcousticEmeraldLimeColor = (val: number): [number, number, number] => {
  const norm = Math.max(0, Math.min(255, val)) / 255;
  let r = 0, g = 0, b = 0;

  if (norm < 0.25) {
    const t = norm / 0.25;
    r = Math.round(2 + t * 2);
    g = Math.round(23 + t * 44);
    b = Math.round(17 + t * 33);
  } else if (norm < 0.5) {
    const t = (norm - 0.25) / 0.25;
    r = Math.round(4 + t * 12);
    g = Math.round(67 + t * 118);
    b = Math.round(50 + t * 79);
  } else if (norm < 0.75) {
    const t = (norm - 0.5) / 0.25;
    r = Math.round(16 + t * 147);
    g = Math.round(185 + t * 45);
    b = Math.round(129 - t * 76);
  } else {
    const t = (norm - 0.75) / 0.25;
    r = Math.round(163 + t * 91);
    g = Math.round(230 + t * 10);
    b = Math.round(53 + t * 85);
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
      const dataRow = n_mels - 1 - mel;
      const row = data[dataRow] || [];
      for (let frame = 0; frame < n_frames; frame++) {
        const val = row[frame] ?? 0;
        const [r, g, b] = getAcousticEmeraldLimeColor(val);
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
    <div className="glass-card" style={{
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F0FDFA' }}>
          Spektrogram Mel (Energi Frekuensi terhadap Waktu)
        </h3>
        <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          {hoverInfo ? (
            <span style={{ color: '#4ADE80', fontWeight: 600 }}>
              {hoverInfo.time_s} • {hoverInfo.freq_hz}
            </span>
          ) : (
            <span style={{ color: '#94A3B8' }}>64 Mel Bins • Spektrum Akustik Emerald-Lime</span>
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
            border: '1px solid rgba(74, 222, 128, 0.25)',
            display: 'block'
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#94A3B8',
          fontFamily: 'var(--font-mono)',
          marginTop: '6px'
        }}>
          <span>0.0 dtk</span>
          <span>Rentang Frekuensi: 0 Hz — 11.025 Hz</span>
          <span>{duration_s.toFixed(1)} dtk</span>
        </div>
      </div>
    </div>
  );
};
