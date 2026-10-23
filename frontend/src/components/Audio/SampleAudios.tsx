import React from 'react';
import { Volume2 } from 'lucide-react';

interface SampleAudiosProps {
  onSelectSample: (url: string, filename: string) => void;
  isLoading: boolean;
}

export const SampleAudios: React.FC<SampleAudiosProps> = ({ onSelectSample, isLoading }) => {
  const sampleList = [
    {
      id: 'berisik-1',
      title: 'Sampel Berisik (Keramaian / Jalanan)',
      filename: 'contoh-berisik.mp3',
      url: '/samples/contoh-berisik.mp3',
      expected: 'berisik'
    },
    {
      id: 'non-berisik-1',
      title: 'Sampel Non-Berisik (Ruang Tenang / Belajar)',
      filename: 'contoh-non-berisik.mp3',
      url: '/samples/contoh-non-berisik.mp3',
      expected: 'non-berisik'
    },
    {
      id: 'tidak-jelas-1',
      title: 'Sampel Uji Ambigu / Transisi',
      filename: 'contoh-tidak-jelas.mp3',
      url: '/samples/contoh-tidak-jelas.mp3',
      expected: 'berisik'
    }
  ];

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px'
    }}>
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
        Uji Cepat dengan Contoh Audio
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px'
      }}>
        {sampleList.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSample(s.url, s.filename)}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: isLoading ? 0.6 : 1
            }}
            className="glass-card"
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: s.expected === 'berisik' ? 'var(--accent-noisy-bg)' : 'var(--accent-quiet-bg)',
              color: s.expected === 'berisik' ? 'var(--accent-noisy)' : 'var(--accent-quiet)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Volume2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {s.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {s.filename}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
