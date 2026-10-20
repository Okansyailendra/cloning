import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface WarningBannerProps {
  warnings: string[];
  lowConfidence: boolean;
  warnThreshold: number;
}

export const WarningBanner: React.FC<WarningBannerProps> = ({ warnings, lowConfidence, warnThreshold }) => {
  if (!lowConfidence && (!warnings || warnings.length === 0)) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {lowConfidence && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--accent-warning-bg)',
          border: '1px solid var(--accent-warning-border)',
          color: 'var(--accent-warning)'
        }}>
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>
              Peringatan: Tingkat Keyakinan Rendah (&lt; {Math.round(warnThreshold * 100)}%)
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Audio ini memiliki karakteristik suara yang berada di perbatasan antara kategori berisik dan non-berisik.
              Pertimbangkan untuk merekam ulang dengan durasi lebih panjang atau memverifikasi langsung kondisi lapangan.
            </p>
          </div>
        </div>
      )}

      {warnings.map((w, idx) => {
        let msg = w;
        if (w === 'AUDIO_CLIPPING') {
          msg = 'Terdeteksi clipping audio (> 1% sampel terpotong pada batas amplitudo). Mikrofon mungkin terlalu dekat dengan sumber suara keras.';
        } else if (w === 'HENING_DOMINAN') {
          msg = 'Lebih dari 70% durasi audio adalah keheningan yang dibuang oleh algoritma.';
        } else if (w === 'AUDIO_PENDEK_DIPAD') {
          msg = 'Audio bersih kurang dari 3 detik sehingga dilakukan zero-padding untuk melengkapi analisis chunk minimum.';
        } else if (w === 'CONFIDENCE_RENDAH') {
          return null; // already shown in lowConfidence box above
        }

        return (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              color: 'var(--text-secondary)'
            }}
          >
            <Info size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span>{msg}</span>
          </div>
        );
      })}
    </div>
  );
};
