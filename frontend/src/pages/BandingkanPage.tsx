import React, { useState } from 'react';
import { getHistory } from '../services/history';
import { GitCompare, Volume2, VolumeX, Split } from 'lucide-react';

export const BandingkanPage: React.FC = () => {
  const historyItems = getHistory();
  const [selectedIdA, setSelectedIdA] = useState<string>(historyItems[0]?.id || '');
  const [selectedIdB, setSelectedIdB] = useState<string>(historyItems[1]?.id || '');

  const itemA = historyItems.find(h => h.id === selectedIdA);
  const itemB = historyItems.find(h => h.id === selectedIdB);

  const featuresA = itemA?.full_response?.features || [];
  const featuresB = itemB?.full_response?.features || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '40px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(20, 184, 166, 0.12)',
            border: '1px solid rgba(45, 212, 191, 0.3)',
            fontSize: '11px',
            fontWeight: 700,
            color: '#2DD4BF',
            fontFamily: 'var(--font-mono)'
          }}>
            <Split size={13} />
            SIDE-BY-SIDE KOMPARASI
          </span>
        </div>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: '4px'
        }}>
          Bandingkan <span className="text-gradient-teal">Dua Rekaman Audio</span>
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>
          Komparasi fitur akustik dan hasil klasifikasi secara berdampingan untuk melihat perbedaan profil suara secara mendalam.
        </p>
      </div>

      {historyItems.length < 2 ? (
        <div className="glass-card" style={{
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <GitCompare size={36} style={{ color: '#2DD4BF', margin: '0 auto 12px' }} />
          <p style={{ color: '#F0FDFA', fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>
            Dibutuhkan minimal 2 rekaman audio dalam riwayat
          </p>
          <p style={{ fontSize: '13px', color: '#94A3B8' }}>
            Silakan lakukan analisis minimal 2 berkas audio terlebih dahulu pada halaman Analisis.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Selectors */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {/* Audio A selector */}
            <div className="glass-card" style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#2DD4BF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Audio Sampel A:
              </label>
              <select
                value={selectedIdA}
                onChange={(e) => setSelectedIdA(e.target.value)}
                style={{
                  backgroundColor: 'rgba(7, 22, 31, 0.85)',
                  border: '1px solid rgba(45, 212, 191, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: '#F0FDFA',
                  fontSize: '13px'
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
            <div className="glass-card" style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#2DD4BF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Audio Sampel B:
              </label>
              <select
                value={selectedIdB}
                onChange={(e) => setSelectedIdB(e.target.value)}
                style={{
                  backgroundColor: 'rgba(7, 22, 31, 0.85)',
                  border: '1px solid rgba(45, 212, 191, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: '#F0FDFA',
                  fontSize: '13px'
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div className="glass-card" style={{
                border: `1px solid ${itemA.label === 'berisik' ? 'rgba(249, 115, 22, 0.5)' : 'rgba(20, 184, 166, 0.5)'}`,
                padding: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  {itemA.label === 'berisik' ? <Volume2 color="#F97316" size={24} /> : <VolumeX color="#14B8A6" size={24} />}
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '22px',
                    fontWeight: 800,
                    color: itemA.label === 'berisik' ? '#F97316' : '#14B8A6'
                  }}>
                    {itemA.label.toUpperCase()} ({(itemA.confidence * 100).toFixed(1)}%)
                  </h3>
                </div>
                <div style={{ fontSize: '13px', color: '#94A3B8' }}>{itemA.filename}</div>
              </div>

              <div className="glass-card" style={{
                border: `1px solid ${itemB.label === 'berisik' ? 'rgba(249, 115, 22, 0.5)' : 'rgba(20, 184, 166, 0.5)'}`,
                padding: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  {itemB.label === 'berisik' ? <Volume2 color="#F97316" size={24} /> : <VolumeX color="#14B8A6" size={24} />}
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '22px',
                    fontWeight: 800,
                    color: itemB.label === 'berisik' ? '#F97316' : '#14B8A6'
                  }}>
                    {itemB.label.toUpperCase()} ({(itemB.confidence * 100).toFixed(1)}%)
                  </h3>
                </div>
                <div style={{ fontSize: '13px', color: '#94A3B8' }}>{itemB.filename}</div>
              </div>
            </div>
          )}

          {/* Side-by-side Features Table */}
          {featuresA.length > 0 && featuresB.length > 0 && (
            <div className="glass-card" style={{
              padding: '24px',
              overflowX: 'auto'
            }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#F0FDFA', marginBottom: '16px' }}>
                Perbandingan Nilai 10 Fitur Audio
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(45, 212, 191, 0.18)', color: '#94A3B8' }}>
                    <th style={{ padding: '12px 10px', textAlign: 'left' }}>Fitur</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>Nilai Audio A</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>Nilai Audio B</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>Selisih (A - B)</th>
                  </tr>
                </thead>
                <tbody>
                  {featuresA.map((fa, idx) => {
                    const fb = featuresB[idx];
                    const diff = fa.value - (fb ? fb.value : 0);
                    return (
                      <tr key={fa.name} style={{ borderBottom: '1px solid rgba(45, 212, 191, 0.08)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 600, color: '#F0FDFA' }}>
                          {fa.display_name} <span style={{ fontSize: '11px', color: '#94A3B8' }}>({fa.name})</span>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#99F6E4' }}>
                          {fa.value}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#99F6E4' }}>
                          {fb ? fb.value : '-'}
                        </td>
                        <td style={{
                          padding: '12px 10px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: diff > 0 ? '#F97316' : '#14B8A6'
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
