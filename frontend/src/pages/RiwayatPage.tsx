import React, { useState, useEffect } from 'react';
import { getHistory, clearHistory, exportHistoryToCsv } from '../services/history';
import type { HistoryItem } from '../types/api';
import { Download, Trash2, Volume2, VolumeX, History } from 'lucide-react';

export const RiwayatPage: React.FC = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setItems(getHistory());
  }, []);

  const handleClear = () => {
    if (window.confirm('Hapus seluruh riwayat analisis dalam sesi ini?')) {
      clearHistory();
      setItems([]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
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
              <History size={13} />
              SESI LOKAL
            </span>
          </div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '4px'
          }}>
            Riwayat <span className="text-gradient-teal">Analisis Audio</span>
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>
            Catatan berkas audio yang telah dianalisis selama sesi penelusuran (maksimal 50 item).
          </p>
        </div>

        {items.length > 0 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => exportHistoryToCsv(items)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(15, 46, 65, 0.75)',
                border: '1px solid rgba(45, 212, 191, 0.3)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#2DD4BF',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
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
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
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
          textAlign: 'center'
        }}>
          <p style={{ color: '#F0FDFA', fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>
            Belum ada riwayat analisis
          </p>
          <p style={{ fontSize: '13px', color: '#94A3B8' }}>
            Lakukan analisis audio atau aktifkan deteksi real-time untuk mencatat data pengujian di sini.
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflowX: 'auto', padding: '8px' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
            textAlign: 'left'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(45, 212, 191, 0.18)', color: '#94A3B8' }}>
                <th style={{ padding: '14px 16px' }}>Waktu</th>
                <th style={{ padding: '14px 16px' }}>Nama Berkas</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Durasi</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Prediksi</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Keyakinan</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>RMS (Vol)</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Centroid (Hz)</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>ZCR</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const isNoisy = it.label === 'berisik';
                return (
                  <tr key={it.id} style={{
                    borderBottom: '1px solid rgba(45, 212, 191, 0.08)',
                    transition: 'background-color 0.15s ease'
                  }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>
                      {it.timestamp}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#F0FDFA' }}>
                      {it.filename}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#99F6E4' }}>
                      {it.duration_s.toFixed(1)}s
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: isNoisy ? 'rgba(249, 115, 22, 0.15)' : 'rgba(20, 184, 166, 0.15)',
                        color: isNoisy ? '#F97316' : '#14B8A6',
                        border: `1px solid ${isNoisy ? 'rgba(249, 115, 22, 0.4)' : 'rgba(45, 212, 191, 0.4)'}`
                      }}>
                        {isNoisy ? <Volume2 size={13} /> : <VolumeX size={13} />}
                        {it.label.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F0FDFA' }}>
                      {(it.confidence * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#99F6E4' }}>
                      {it.rms_mean.toFixed(4)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#99F6E4' }}>
                      {Math.round(it.centroid_mean)} Hz
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#99F6E4' }}>
                      {it.zcr_mean.toFixed(4)}
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
