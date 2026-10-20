import React, { useEffect, useState } from 'react';
import { fetchModelInfo } from '../services/api';
import type { ModelInfoResponse } from '../types/api';
import { BookOpen, BarChart3, Layers } from 'lucide-react';

export const TentangModelPage: React.FC = () => {
  const [info, setInfo] = useState<ModelInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchModelInfo()
      .then(data => setInfo(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !info) {
    return (
      <div style={{ padding: '40px', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Memuat spesifikasi teknis model...
      </div>
    );
  }

  const { model, metrics, model_comparison, dataset } = info;
  const cm = metrics.confusion_matrix.matrix;

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
          Tentang Model & Spesifikasi Teknis
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Dokumentasi arsitektur algoritma pembelajaran mesin, metrik evaluasi pengujian, dan komparasi model.
        </p>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        {[
          { label: 'Akurasi Pengujian', val: `${(metrics.accuracy * 100).toFixed(1)}%`, sub: 'Hold-out test 20%' },
          { label: 'F1-Score Makro', val: `${(metrics.f1 * 100).toFixed(1)}%`, sub: 'Keseimbangan precision/recall' },
          { label: 'ROC-AUC', val: metrics.roc_auc.toFixed(4), sub: 'Daya pembeda kelas' },
          { label: 'Validasi Silang (5-Fold)', val: `${(metrics.cv_mean * 100).toFixed(1)}%`, sub: `± ${(metrics.cv_std * 100).toFixed(1)}%` },
        ].map(m => (
          <div
            key={m.label}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {m.label}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--accent-quiet)',
              margin: '4px 0'
            }}>
              {m.val}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Model Spec & Dataset info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--accent-quiet)" />
            Spesifikasi Arsitektur Model
          </h2>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Algoritma:</strong> {model.name} ({model.algorithm})</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Jumlah Pohon Keputusan:</strong> {model.hyperparameters.n_estimators}</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Maksimal Kedalaman:</strong> {model.hyperparameters.max_depth}</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Jumlah Fitur Masukan:</strong> 10 fitur terpilih (RFE/Importance)</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Target Sample Rate:</strong> 22.050 Hz (Mono)</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Pembuangan Hening:</strong> librosa.effects.split (top_db=25) + concatenate</div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="var(--accent-neutral)" />
            Dataset & Karakteristik Data
          </h2>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Total Berkas Audio:</strong> {dataset.total_files} sampel</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Data Latih (Train):</strong> {dataset.train} sampel (80%)</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Data Uji (Test):</strong> {dataset.test} sampel (20%)</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Skema Pembagian:</strong> {dataset.split}</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Sumber Audio:</strong> Rekaman langsung lingkungan kerja nyata & simulasi bising</div>
          </div>
        </div>
      </div>

      {/* Confusion Matrix 2x2 */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        border: '1px solid var(--border-subtle)'
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
          Matriks Konfusi (Confusion Matrix) — Data Uji
        </h2>
        <div style={{
          maxWidth: '380px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-noisy-bg)',
            border: '1px solid var(--accent-noisy-border)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>True Berisik</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-noisy)', fontFamily: 'var(--font-mono)' }}>
              {cm[0][0]}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Prediksi Benar (TP)</div>
          </div>

          <div style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>False Non-Berisik</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {cm[0][1]}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Meleset (FN)</div>
          </div>

          <div style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>False Berisik</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {cm[1][0]}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Meleset (FP)</div>
          </div>

          <div style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-quiet-bg)',
            border: '1px solid var(--accent-quiet-border)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>True Non-Berisik</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-quiet)', fontFamily: 'var(--font-mono)' }}>
              {cm[1][1]}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Prediksi Benar (TN)</div>
          </div>
        </div>
      </div>

      {/* Model Comparison Bar Chart */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} color="var(--accent-quiet)" />
          Komparasi 6 Model Pembelajaran Mesin yang Dievaluasi
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {model_comparison.map(mc => {
            const isWinner = mc.name === 'Random Forest';
            return (
              <div key={mc.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                <span style={{ width: '160px', fontWeight: isWinner ? 700 : 500, color: isWinner ? 'var(--accent-quiet)' : 'var(--text-secondary)' }}>
                  {mc.name} {isWinner ? '★ (Terpilih)' : ''}
                </span>
                <div style={{ flex: 1, height: '14px', backgroundColor: 'var(--bg-canvas)', borderRadius: '7px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${mc.accuracy * 100}%`,
                    height: '100%',
                    backgroundColor: isWinner ? 'var(--accent-quiet)' : 'var(--border-active)',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                <span style={{ width: '50px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {(mc.accuracy * 100).toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
