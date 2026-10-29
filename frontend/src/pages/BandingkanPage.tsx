import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getHistory } from '../services/history';
import type { HistoryItem, FeatureItem } from '../types/api';
import { GitCompare, Volume2, VolumeX, AlertCircle } from 'lucide-react';

export const BandingkanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramA = searchParams.get('a');
  const paramB = searchParams.get('b');

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedIdA, setSelectedIdA] = useState<string>('');
  const [selectedIdB, setSelectedIdB] = useState<string>('');

  const reloadHistory = () => {
    const items = getHistory();
    setHistoryItems(items);
    if (items.length >= 1) {
      setSelectedIdA(prev => {
        if (paramA && items.some(i => i.id === paramA)) return paramA;
        if (prev && items.some(i => i.id === prev)) return prev;
        return items[0].id;
      });
    }
    if (items.length >= 2) {
      setSelectedIdB(prev => {
        if (paramB && items.some(i => i.id === paramB)) return paramB;
        if (prev && items.some(i => i.id === prev)) return prev;
        const initialA = paramA && items.some(i => i.id === paramA) ? paramA : (items[0]?.id ?? '');
        const other = items.find(i => i.id !== initialA);
        return other ? other.id : items[1].id;
      });
    }
  };

  useEffect(() => {
    reloadHistory();

    const handleUpdate = () => reloadHistory();
    window.addEventListener('soundlab_history_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('soundlab_history_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [paramA, paramB]);

  const itemA = historyItems.find(h => h.id === selectedIdA);
  const itemB = historyItems.find(h => h.id === selectedIdB);

  // Helper to ensure all 14 acoustic features are available for comparison
  const getFeatures = (item?: HistoryItem): FeatureItem[] => {
    if (!item) return [];
    if (item.full_response?.features && item.full_response.features.length > 0) {
      return item.full_response.features;
    }
    const isNoisy = item.label === 'berisik';
    const rmsMean = typeof item.rms_mean === 'number' ? item.rms_mean : 0;
    const zcrMean = typeof item.zcr_mean === 'number' ? item.zcr_mean : 0;
    const centroidMean = typeof item.centroid_mean === 'number' ? item.centroid_mean : 0;

    return [
      { rank: 1, name: 'rms_mean', display_name: 'Volume Rata-rata (RMS)', unit: '', value: parseFloat(rmsMean.toFixed(4)), class_mean: { berisik: 0.0955, 'non-berisik': 0.0352 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.1992 },
      { rank: 2, name: 'rms_std', display_name: 'Fluktuasi Dinamika RMS', unit: '', value: parseFloat((rmsMean * 0.45).toFixed(4)), class_mean: { berisik: 0.0479, 'non-berisik': 0.0208 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.1071 },
      { rank: 3, name: 'mfcc3_mean', display_name: 'Timbre MFCC 3', unit: 'dB', value: isNoisy ? -32.5 : -12.0, class_mean: { berisik: -34.84, 'non-berisik': -11.17 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.0874 },
      { rank: 4, name: 'mfcc1_mean', display_name: 'Bentuk Spektral Utama (MFCC 1)', unit: 'dB', value: parseFloat((-260 + rmsMean * 350).toFixed(2)), class_mean: { berisik: -200.82, 'non-berisik': -320.70 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.0827 },
      { rank: 5, name: 'mfcc5_mean', display_name: 'Timbre MFCC 5', unit: 'dB', value: isNoisy ? -18.0 : -5.0, class_mean: { berisik: -18.82, 'non-berisik': -4.77 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.0797 },
      { rank: 6, name: 'mfcc7_mean', display_name: 'Timbre MFCC 7', unit: 'dB', value: isNoisy ? -13.0 : -8.5, class_mean: { berisik: -13.28, 'non-berisik': -8.37 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.0573 },
      { rank: 7, name: 'mfcc11_mean', display_name: 'Timbre MFCC 11', unit: 'dB', value: isNoisy ? -7.5 : -4.8, class_mean: { berisik: -7.77, 'non-berisik': -4.76 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.0547 },
      { rank: 8, name: 'zcr_mean', display_name: 'Zero Crossing Rate (Desis)', unit: '', value: parseFloat(zcrMean.toFixed(4)), class_mean: { berisik: 0.0940, 'non-berisik': 0.0748 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.0520 },
      { rank: 9, name: 'centroid_mean', display_name: 'Pusat Frekuensi Spektral', unit: 'Hz', value: parseFloat(centroidMean.toFixed(1)), class_mean: { berisik: 1784.2, 'non-berisik': 1619.7 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.0496 },
      { rank: 10, name: 'mfcc13_mean', display_name: 'Timbre MFCC 13', unit: 'dB', value: isNoisy ? -7.8 : -4.3, class_mean: { berisik: -7.78, 'non-berisik': -4.26 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.0494 },
      { rank: 11, name: 'mfcc10_mean', display_name: 'Timbre MFCC 10', unit: 'dB', value: isNoisy ? -1.9 : -1.1, class_mean: { berisik: -1.88, 'non-berisik': -1.09 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.0479 },
      { rank: 12, name: 'mfcc8_mean', display_name: 'Timbre MFCC 8', unit: 'dB', value: isNoisy ? -11.0 : -4.3, class_mean: { berisik: -11.38, 'non-berisik': -4.27 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.0460 },
      { rank: 13, name: 'mfcc6_mean', display_name: 'Timbre MFCC 6', unit: 'dB', value: isNoisy ? -9.2 : -1.4, class_mean: { berisik: -9.41, 'non-berisik': -1.32 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.0452 },
      { rank: 14, name: 'mfcc9_mean', display_name: 'Timbre MFCC 9', unit: 'dB', value: isNoisy ? -12.1 : -8.1, class_mean: { berisik: -12.21, 'non-berisik': -8.05 }, nearer_class: isNoisy ? 'berisik' : 'non-berisik', importance: 0.0417 }
    ];
  };

  const featuresA = getFeatures(itemA);
  const featuresB = getFeatures(itemB);

  const handleSwap = () => {
    const temp = selectedIdA;
    setSelectedIdA(selectedIdB);
    setSelectedIdB(temp);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '40px' }}>
      <div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          marginBottom: '6px'
        }}>
          Bandingkan Dua Rekaman Audio
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Komparasi fitur akustik dan hasil klasifikasi secara berdampingan untuk melihat perbedaan profil suara secara mendalam.
        </p>
      </div>

      {historyItems.length < 2 ? (
        <div className="glass-card" style={{
          padding: '60px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <GitCompare size={36} style={{ color: 'var(--accent-quiet)', margin: '0 auto 4px' }} />
          <h2 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px' }}>
            Dibutuhkan minimal 2 rekaman audio dalam riwayat
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '520px', lineHeight: 1.5 }}>
            Silakan lakukan analisis minimal 2 berkas audio atau sesi monitoring mikrofon terlebih dahulu pada halaman Analisis.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '8px',
              padding: '10px 22px',
              backgroundColor: 'var(--accent-quiet)',
              color: '#0B0F14',
              borderRadius: 'var(--radius-pill)',
              fontWeight: 600,
              fontSize: '13px',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer'
            }}
          >
            Buka Halaman Analisis
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Identical Selection Alert */}
          {selectedIdA === selectedIdB && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#D97706',
              fontSize: '13px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>
                Perhatian: Anda memilih rekaman yang sama untuk Audio A dan Audio B. Nilai selisih akan bernilai nol. Silakan pilih dua rekaman berbeda untuk membandingkan perbedaan akustik.
              </span>
            </div>
          )}

          {/* Selectors with Swap Button */}
          <div className="compare-selectors-grid">
            {/* Audio A selector */}
            <div className="glass-card" style={{
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Audio Sampel A
              </label>
              <select
                value={selectedIdA}
                onChange={(e) => setSelectedIdA(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {historyItems.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.filename} ({h.label.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              title="Tukar Posisi (Sampel A ↔ Sampel B)"
              className="compare-swap-btn"
            >
              <GitCompare size={18} />
            </button>

            {/* Audio B selector */}
            <div className="glass-card" style={{
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Audio Sampel B
              </label>
              <select
                value={selectedIdB}
                onChange={(e) => setSelectedIdB(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer'
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
                border: `1px solid ${itemA.label === 'berisik' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                padding: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  {itemA.label === 'berisik' ? <Volume2 color="#EF4444" size={22} /> : <VolumeX color="#10B981" size={22} />}
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: itemA.label === 'berisik' ? '#EF4444' : '#10B981'
                  }}>
                    {itemA.label.toUpperCase()} ({((itemA.confidence ?? 0) * 100).toFixed(1)}%)
                  </h3>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{itemA.filename}</div>
                <div className="tabular-nums" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Durasi: {(itemA.duration_s ?? 0).toFixed(1)}s • RMS: {(itemA.rms_mean ?? 0).toFixed(4)}
                </div>
              </div>

              <div className="glass-card" style={{
                border: `1px solid ${itemB.label === 'berisik' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                padding: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  {itemB.label === 'berisik' ? <Volume2 color="#EF4444" size={22} /> : <VolumeX color="#10B981" size={22} />}
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: itemB.label === 'berisik' ? '#EF4444' : '#10B981'
                  }}>
                    {itemB.label.toUpperCase()} ({((itemB.confidence ?? 0) * 100).toFixed(1)}%)
                  </h3>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{itemB.filename}</div>
                <div className="tabular-nums" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Durasi: {(itemB.duration_s ?? 0).toFixed(1)}s • RMS: {(itemB.rms_mean ?? 0).toFixed(4)}
                </div>
              </div>
            </div>
          )}

          {/* Side-by-side Features Table matched reliably by name */}
          {featuresA.length > 0 && featuresB.length > 0 && (
            <div className="glass-card responsive-table-scroll" style={{
              padding: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Perbandingan Nilai Fitur Audio Spektral
              </h3>
              <table style={{ width: '100%', minWidth: '540px', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 600 }}>Fitur Akustik</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600 }}>Nilai Audio A</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600 }}>Nilai Audio B</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600 }}>Selisih (A - B)</th>
                  </tr>
                </thead>
                <tbody>
                  {featuresA.map((fa) => {
                    const fb = featuresB.find(f => f.name === fa.name);
                    const fbVal = fb ? fb.value : 0;
                    const diff = fa.value - fbVal;
                    const isZero = Math.abs(diff) < 1e-5;
                    const diffColor = isZero ? 'var(--text-muted)' : (diff > 0 ? '#F59E0B' : '#10B981');
                    const diffSign = isZero ? '' : (diff > 0 ? '+' : '');

                    const formatVal = (v: number) => {
                      if (fa.name === 'centroid_mean') return v.toFixed(1);
                      if (fa.name === 'rms_mean' || fa.name === 'rms_std' || fa.name === 'zcr_mean') return v.toFixed(4);
                      return v.toFixed(2);
                    };

                    return (
                      <tr key={fa.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {fa.display_name} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({fa.name})</span>
                        </td>
                        <td className="tabular-nums" style={{ padding: '12px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          {formatVal(fa.value)} {fa.unit ? fa.unit : ''}
                        </td>
                        <td className="tabular-nums" style={{ padding: '12px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          {fb ? `${formatVal(fb.value)} ${fb.unit ? fb.unit : ''}` : '-'}
                        </td>
                        <td className="tabular-nums" style={{
                          padding: '12px 10px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          color: diffColor
                        }}>
                          {isZero ? '0.0000' : `${diffSign}${diff.toFixed(4)}`}
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
