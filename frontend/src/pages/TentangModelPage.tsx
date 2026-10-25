import React, { useEffect, useState } from 'react';
import { fetchModelInfo } from '../services/api';
import type { ModelInfoResponse } from '../types/api';
import { BookOpen, BarChart3, Layers, AlertCircle, RefreshCw } from 'lucide-react';

export const TentangModelPage: React.FC = () => {
  const [info, setInfo] = useState<ModelInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadModelData = () => {
    setIsLoading(true);
    setErrorMsg(null);
    fetchModelInfo()
      .then(data => setInfo(data))
      .catch(err => {
        console.error(err);
        setErrorMsg('Gagal memuat spesifikasi model dari backend. Pastikan server backend berjalan.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadModelData();
  }, []);

  if (isLoading) {
    return (
      <div className="glass-card" style={{ padding: '60px', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Memuat spesifikasi teknis dan metrik evaluasi model...
      </div>
    );
  }

  if (errorMsg || !info) {
    return (
      <div className="glass-card" style={{
        padding: '48px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
        maxWidth: '560px',
        margin: '40px auto'
      }}>
        <AlertCircle size={36} color="var(--accent-warning)" />
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Gagal Memuat Informasi Model
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {errorMsg || 'Terjadi kesalahan saat menghubungi server backend FastAPI.'}
        </p>
        <button
          onClick={loadModelData}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--accent-quiet)',
            color: '#0B0F14',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            marginTop: '8px'
          }}
        >
          <RefreshCw size={15} />
          <span>Coba Lagi</span>
        </button>
      </div>
    );
  }

  const { model, metrics, model_comparison, dataset } = info;
  const cm = metrics.confusion_matrix.matrix;

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
          Tentang Model & Spesifikasi Teknis
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '800px' }}>
          Dokumentasi arsitektur algoritma pembelajaran mesin Random Forest, metrik evaluasi pengujian hold-out, serta komparasi model klasifikasi audio.
        </p>
      </div>

      {/* Metrics Row: Clean, Tabular Figures */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {[
          { label: 'Akurasi Pengujian', val: `${(metrics.accuracy * 100).toFixed(1)}%`, sub: 'Hold-out test 20% data uji' },
          { label: 'F1-Score Makro', val: `${(metrics.f1 * 100).toFixed(1)}%`, sub: 'Harmonic mean precision & recall' },
          { label: 'ROC-AUC Pembeda', val: metrics.roc_auc.toFixed(4), sub: 'Tingkat separabilitas kelas' },
          { label: 'Validasi Silang (5-Fold)', val: `${(metrics.cv_mean * 100).toFixed(1)}%`, sub: `± ${(metrics.cv_std * 100).toFixed(1)}% stabilitas cross-val` },
        ].map(m => (
          <div
            key={m.label}
            className="glass-card"
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              {m.label}
            </div>
            <div className="tabular-nums" style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '4px 0'
            }}>
              {m.val}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Model Spec & Dataset info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--accent-quiet)" />
            Spesifikasi Arsitektur Model
          </h2>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Algoritma:</strong> {model.name} ({model.algorithm})</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Jumlah Pohon (Trees):</strong> {model.hyperparameters.n_estimators} Estimator</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Jumlah Fitur Masukan:</strong> {model.n_features || 14} fitur terpilih (MDI Importance)</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Target Sample Rate:</strong> 22.050 Hz (Mono)</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Pembuangan Hening:</strong> librosa.effects.split (top_db=25) + concatenate</div>
          </div>
        </div>

        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="var(--accent-quiet)" />
            Dataset & Karakteristik Data
          </h2>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Total Berkas Audio:</strong> {dataset.total_files} sampel audio (Proyek Sains Data)</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Data Latih (Train):</strong> {dataset.train} sampel (80%)</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Data Uji (Test):</strong> {dataset.test} sampel (20%)</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Skema Pembagian:</strong> {dataset.split}</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Sumber Audio:</strong> Dataset audio rekaman suara tugas PSD (kategori Berisik & Non-Berisik)</div>
          </div>
        </div>
      </div>

      {/* Confusion Matrix 2x2: Clean Analytical Heatmap */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '18px' }}>
          Matriks Konfusi (Confusion Matrix) — Data Uji
        </h2>
        <div style={{
          maxWidth: '440px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600, textTransform: 'uppercase' }}>True Berisik</div>
            <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 700, color: '#EF4444', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              {cm[0][0]}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Prediksi Benar (TP)</div>
          </div>

          <div style={{
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>False Non-Berisik</div>
            <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              {cm[0][1]}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Meleset (FN)</div>
          </div>

          <div style={{
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>False Berisik</div>
            <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              {cm[1][0]}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Meleset (FP)</div>
          </div>

          <div style={{
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)'
          }}>
            <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, textTransform: 'uppercase' }}>True Non-Berisik</div>
            <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              {cm[1][1]}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Prediksi Benar (TN)</div>
          </div>
        </div>
      </div>

      {/* Model Comparison Bar Chart: Clean Analytical Bars */}
      <div className="glass-card" style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} color="var(--accent-quiet)" />
          Komparasi 6 Model Klasifikasi
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {model_comparison.map(mc => {
            const isWinner = mc.name.toLowerCase().startsWith('random forest');
            return (
              <div key={mc.name} style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px' }}>
                <span style={{ width: '180px', fontWeight: isWinner ? 600 : 500, color: isWinner ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {mc.name} {isWinner ? '(Terpilih)' : ''}
                </span>
                <div style={{ flex: 1, height: '14px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <div style={{
                    width: `${mc.accuracy * 100}%`,
                    height: '100%',
                    backgroundColor: isWinner ? 'var(--accent-quiet)' : 'rgba(148, 163, 184, 0.25)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <span className="tabular-nums" style={{ width: '60px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: isWinner ? 'var(--accent-quiet)' : 'var(--text-primary)' }}>
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
