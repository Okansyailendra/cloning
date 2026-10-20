import React, { useState, useEffect } from 'react';
import { getHistory, clearHistory, exportHistoryToCsv } from '../services/history';
import type { HistoryItem } from '../types/api';
import { Download, Trash2, Volume2, VolumeX } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: '4px'
          }}>
            Riwayat Analisis
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
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
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)'
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
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-danger-bg)',
                border: '1px solid rgba(239,68,68,0.2)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--accent-danger)'
              }}
            >
              <Trash2 size={15} />
              <span>Hapus Semua</span>
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{
          padding: '48px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>
            Belum ada riwayat analisis
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Lakukan analisis audio pada halaman utama untuk mencatat hasil pengujian di sini.
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflowX: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
            textAlign: 'left'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 14px' }}>Waktu</th>
                <th style={{ padding: '12px 14px' }}>Nama Berkas</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Durasi</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Prediksi</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Keyakinan</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>RMS (Vol)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Centroid (Hz)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>ZCR</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const isNoisy = it.label === 'berisik';
                return (
                  <tr key={it.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {it.timestamp}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {it.filename}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {it.duration_s.toFixed(1)}s
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: isNoisy ? 'var(--accent-noisy-bg)' : 'var(--accent-quiet-bg)',
                        color: isNoisy ? 'var(--accent-noisy)' : 'var(--accent-quiet)',
                        border: `1px solid ${isNoisy ? 'var(--accent-noisy-border)' : 'var(--accent-quiet-border)'}`
                      }}>
                        {isNoisy ? <Volume2 size={12} /> : <VolumeX size={12} />}
                        {it.label.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {(it.confidence * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {it.rms_mean.toFixed(4)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {Math.round(it.centroid_mean)} Hz
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
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
