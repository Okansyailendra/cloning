import React from 'react';
import type { FeatureItem } from '../../types/api';

interface FeatureTableProps {
  features: FeatureItem[];
}

export const FeatureTable: React.FC<FeatureTableProps> = ({ features }) => {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      overflowX: 'auto'
    }}>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Tabel {features.length} Fitur Audio (Data Teknis Model)
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Urutan fitur sesuai arsitektur Random Forest dengan bobot kepentingan (MDI).
        </p>
      </div>

      <div className="responsive-table-scroll">
        <table style={{
          width: '100%',
          minWidth: '640px',
          borderCollapse: 'collapse',
          fontSize: '13px',
          textAlign: 'left'
        }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            <th style={{ padding: '8px 10px', width: '40px' }}>#</th>
            <th style={{ padding: '8px 10px' }}>Nama Fitur</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Nilai Rekaman</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rata-rata Berisik</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rata-rata Sepi</th>
            <th style={{ padding: '8px 10px', textAlign: 'center' }}>Lebih Dekat Ke</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Bobot (MDI)</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feat) => {
            const isBerisik = feat.nearer_class === 'berisik';
            return (
              <tr
                key={feat.name}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  transition: 'background-color 0.1s'
                }}
              >
                <td style={{ padding: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {feat.rank}
                </td>
                <td style={{ padding: '10px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {feat.display_name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {feat.name} {feat.unit ? `(${feat.unit})` : ''}
                  </div>
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {feat.value}
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-noisy)' }}>
                  {feat.class_mean.berisik}
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-quiet)' }}>
                  {feat.class_mean['non-berisik']}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: isBerisik ? 'var(--accent-noisy-bg)' : 'var(--accent-quiet-bg)',
                    color: isBerisik ? 'var(--accent-noisy)' : 'var(--accent-quiet)',
                    border: `1px solid ${isBerisik ? 'var(--accent-noisy-border)' : 'var(--accent-quiet-border)'}`
                  }}>
                    {feat.nearer_class}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {(feat.importance * 100).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
};
