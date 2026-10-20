import React, { useState } from 'react';
import { getHistory } from '../services/history';

import { GitCompare, Volume2, VolumeX } from 'lucide-react';

export const BandingkanPage: React.FC = () => {
  const historyItems = getHistory();
  const [selectedIdA, setSelectedIdA] = useState<string>(historyItems[0]?.id || '');
  const [selectedIdB, setSelectedIdB] = useState<string>(historyItems[1]?.id || '');

  const itemA = historyItems.find(h => h.id === selectedIdA);
  const itemB = historyItems.find(h => h.id === selectedIdB);

  const featuresA = itemA?.full_response?.features || [];
  const featuresB = itemB?.full_response?.features || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          marginBottom: '4px'
        }}>
          Bandingkan Dua Rekaman Audio
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Komparasi fitur akustik dan hasil klasifikasi secara berdampingan untuk melihat perbedaan profil suara.
        </p>
      </div>

      {historyItems.length < 2 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          <GitCompare size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>
            Dibutuhkan minimal 2 rekaman audio dalam riwayat
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Silakan lakukan analisis minimal 2 berkas audio terlebih dahulu pada halaman Analisis.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Selectors */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            {/* Audio A selector */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Audio A:
              </label>
              <select
                value={selectedIdA}
                onChange={(e) => setSelectedIdA(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  color: 'var(--text-primary)'
                }}
              >
                {historyItems.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.filename} ({h.label.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Audio B selector */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Audio B:
              </label>
              <select
                value={selectedIdB}
                onChange={(e) => setSelectedIdB(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  color: 'var(--text-primary)'
                }}
              >
                {historyItems.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.filename} ({h.label.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards Overview */}
          {itemA && itemB && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{
                backgroundColor: 'var(--bg-surface)',
                border: `1px solid ${itemA.label === 'berisik' ? 'var(--accent-noisy-border)' : 'var(--accent-quiet-border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {itemA.label === 'berisik' ? <Volume2 color="var(--accent-noisy)" /> : <VolumeX color="var(--accent-quiet)" />}
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: itemA.label === 'berisik' ? 'var(--accent-noisy)' : 'var(--accent-quiet)'
                  }}>
                    {itemA.label.toUpperCase()} ({(itemA.confidence * 100).toFixed(1)}%)
                  </h3>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{itemA.filename}</div>
              </div>

              <div style={{
                backgroundColor: 'var(--bg-surface)',
                border: `1px solid ${itemB.label === 'berisik' ? 'var(--accent-noisy-border)' : 'var(--accent-quiet-border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {itemB.label === 'berisik' ? <Volume2 color="var(--accent-noisy)" /> : <VolumeX color="var(--accent-quiet)" />}
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: itemB.label === 'berisik' ? 'var(--accent-noisy)' : 'var(--accent-quiet)'
                  }}>
                    {itemB.label.toUpperCase()} ({(itemB.confidence * 100).toFixed(1)}%)
                  </h3>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{itemB.filename}</div>
              </div>
            </div>
          )}

          {/* Side-by-side Features Table */}
          {featuresA.length > 0 && featuresB.length > 0 && (
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '20px',
              overflowX: 'auto'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
                Perbandingan Nilai 10 Fitur Audio
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Fitur</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Nilai Audio A</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Nilai Audio B</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Selisih (A - B)</th>
                  </tr>
                </thead>
                <tbody>
                  {featuresA.map((fa, idx) => {
                    const fb = featuresB[idx];
                    const diff = fa.value - (fb ? fb.value : 0);
                    return (
                      <tr key={fa.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>
                          {fa.display_name} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({fa.name})</span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {fa.value}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {fb ? fb.value : '-'}
                        </td>
                        <td style={{
                          padding: '10px 8px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          color: diff > 0 ? 'var(--accent-noisy)' : 'var(--accent-quiet)'
                        }}>
                          {diff > 0 ? `+${diff.toFixed(4)}` : diff.toFixed(4)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
