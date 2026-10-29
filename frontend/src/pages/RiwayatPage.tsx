import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory, clearHistory, deleteHistoryItem, exportHistoryToCsv } from '../services/history';
import type { HistoryItem } from '../types/api';
import { Download, Trash2, Volume2, VolumeX, GitCompare, ArrowRight } from 'lucide-react';

export const RiwayatPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);

  const reloadHistory = () => {
    setItems(getHistory());
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
  }, []);

  const handleClear = () => {
    if (window.confirm('Hapus seluruh riwayat analisis dalam sesi ini?')) {
      clearHistory();
      setItems([]);
    }
  };

  const handleDeleteItem = (id: string, filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Hapus rekaman "${filename}" dari riwayat?`)) {
      deleteHistoryItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: '6px'
          }}>
            Riwayat Analisis Audio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Catatan pengujian berkas audio dan sesi monitoring real-time (maksimal 50 entri lokal).
          </p>
        </div>

        {items.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {items.length >= 2 && (
              <button
                onClick={() => navigate('/bandingkan')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--accent-orange)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <GitCompare size={15} />
                <span>Bandingkan ({items.length} Data)</span>
              </button>
            )}

            <button
              onClick={() => exportHistoryToCsv(items)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Download size={15} />
              <span>Ekspor CSV</span>
            </button>
            <button
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#EF4444'
              }}
            >
              <Trash2 size={15} />
              <span>Hapus Semua</span>
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="glass-card" style={{
          padding: '60px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '15px' }}>
            Belum ada riwayat analisis
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '480px' }}>
            Lakukan analisis audio atau aktifkan deteksi real-time untuk mencatat data pengujian di sini.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 20px',
              backgroundColor: 'var(--accent-quiet)',
              color: '#0B0F14',
              borderRadius: 'var(--radius-pill)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <span>Mulai Analisis Audio</span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="glass-card responsive-table-scroll" style={{ padding: '8px' }}>
          <table style={{
            width: '100%',
            minWidth: '720px',
            borderCollapse: 'collapse',
            fontSize: '13px',
            textAlign: 'left'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Waktu</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Nama Berkas / Sesi</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Durasi</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Prediksi</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Keyakinan</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>RMS (Vol)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Centroid (Hz)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>ZCR</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const isNoisy = it.label === 'berisik';
                return (
                  <tr key={it.id} style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background-color 0.15s ease'
                  }}>
                    <td className="tabular-nums" style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {it.timestamp}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {it.filename}
                    </td>
                    <td className="tabular-nums" style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {(it.duration_s ?? 0).toFixed(1)}s
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: isNoisy ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        color: isNoisy ? '#EF4444' : '#10B981',
                        border: `1px solid ${isNoisy ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`
                      }}>
                        {isNoisy ? <Volume2 size={12} /> : <VolumeX size={12} />}
                        {it.label.toUpperCase()}
                      </span>
                    </td>
                    <td className="tabular-nums" style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {((it.confidence ?? 0) * 100).toFixed(1)}%
                    </td>
                    <td className="tabular-nums" style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {(it.rms_mean ?? 0).toFixed(4)}
                    </td>
                    <td className="tabular-nums" style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {Math.round(it.centroid_mean ?? 0)} Hz
                    </td>
                    <td className="tabular-nums" style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {(it.zcr_mean ?? 0).toFixed(4)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => navigate(`/bandingkan?a=${it.id}`)}
                          title="Bandingkan audio ini"
                          style={{
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-surface-elevated)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 500
                          }}
                        >
                          <GitCompare size={13} style={{ color: 'var(--accent-orange)' }} />
                          <span>Bandingkan</span>
                        </button>
                        <button
                          onClick={(e) => handleDeleteItem(it.id, it.filename, e)}
                          title="Hapus rekaman ini"
                          style={{
                            padding: '6px 8px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#EF4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
