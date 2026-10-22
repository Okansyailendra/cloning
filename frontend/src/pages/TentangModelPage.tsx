import React, { useEffect, useState } from 'react';
import { fetchModelInfo } from '../services/api';
import type { ModelInfoResponse } from '../types/api';
import { BookOpen, BarChart3, Layers, Award } from 'lucide-react';

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
      <div className="glass-card" style={{ padding: '60px', color: '#94A3B8', textAlign: 'center' }}>
        Memuat spesifikasi teknis dan metrik evaluasi model...
      </div>
    );
  }

  const { model, metrics, model_comparison, dataset } = info;
  const cm = metrics.confusion_matrix.matrix;

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
            backgroundColor: 'rgba(74, 222, 128, 0.12)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            fontSize: '11px',
            fontWeight: 700,
            color: '#4ADE80',
            fontFamily: 'var(--font-mono)'
          }}>
            <Award size={13} />
            AKURASI 85.0% • RANDOM FOREST
          </span>
        </div>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: '4px'
        }}>
          Tentang Model <span className="text-gradient-lime">& Spesifikasi Teknis</span>
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>
          Dokumentasi arsitektur algoritma pembelajaran mesin, metrik evaluasi pengujian, dan komparasi 6 model klasifikasi audio.
        </p>
      </div>

      {/* Metrics Row */}
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
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {m.label}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '28px',
              fontWeight: 800,
              color: '#4ADE80',
              margin: '4px 0'
            }}>
              {m.val}
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>{m.sub}</div>
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
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#F0FDFA', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} color="#4ADE80" />
            Spesifikasi Arsitektur Model
          </h2>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#94A3B8', lineHeight: 1.6 }}>
            <div><strong style={{ color: '#F0FDFA' }}>Algoritma:</strong> {model.name} ({model.algorithm})</div>
            <div><strong style={{ color: '#F0FDFA' }}>Jumlah Pohon (Trees):</strong> {model.hyperparameters.n_estimators} Estimator</div>
            <div><strong style={{ color: '#F0FDFA' }}>Maksimal Kedalaman:</strong> {model.hyperparameters.max_depth || 'None (Unbounded)'}</div>
            <div><strong style={{ color: '#F0FDFA' }}>Jumlah Fitur Masukan:</strong> 10 fitur terpilih (RFE / MDI Importance)</div>
            <div><strong style={{ color: '#F0FDFA' }}>Target Sample Rate:</strong> 22.050 Hz (Mono)</div>
            <div><strong style={{ color: '#F0FDFA' }}>Pembuangan Hening:</strong> librosa.effects.split (top_db=25) + concatenate</div>
          </div>
        </div>

        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#F0FDFA', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} color="#84CC16" />
            Dataset & Karakteristik Data
          </h2>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#94A3B8', lineHeight: 1.6 }}>
            <div><strong style={{ color: '#F0FDFA' }}>Total Berkas Audio:</strong> {dataset.total_files} sampel lingkungan kerja</div>
            <div><strong style={{ color: '#F0FDFA' }}>Data Latih (Train):</strong> {dataset.train} sampel (80%)</div>
            <div><strong style={{ color: '#F0FDFA' }}>Data Uji (Test):</strong> {dataset.test} sampel (20%)</div>
            <div><strong style={{ color: '#F0FDFA' }}>Skema Pembagian:</strong> {dataset.split}</div>
            <div><strong style={{ color: '#F0FDFA' }}>Sumber Audio:</strong> Rekaman langsung lingkungan kerja nyata & simulasi bising pabrik</div>
          </div>
        </div>
      </div>

      {/* Confusion Matrix 2x2 */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#F0FDFA', marginBottom: '18px' }}>
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
            backgroundColor: 'rgba(6, 52, 40, 0.85)',
            border: '1px solid rgba(245, 158, 11, 0.45)',
            boxShadow: '0 4px 18px rgba(245, 158, 11, 0.12)'
          }}>
            <div style={{ fontSize: '11px', color: '#FCD34D', fontWeight: 700, textTransform: 'uppercase' }}>True Berisik</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#FCD34D', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              {cm[0][0]}
            </div>
            <div style={{ fontSize: '11px', color: '#BBF7D0' }}>Prediksi Benar (TP)</div>
          </div>

          <div style={{
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(74, 222, 128, 0.15)'
          }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>False Non-Berisik</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#94A3B8', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              {cm[0][1]}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>Meleset (FN)</div>
          </div>

          <div style={{
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(74, 222, 128, 0.15)'
          }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>False Berisik</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#94A3B8', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              {cm[1][0]}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>Meleset (FP)</div>
          </div>

          <div style={{
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(74, 222, 128, 0.15)',
            border: '1px solid rgba(74, 222, 128, 0.4)'
          }}>
            <div style={{ fontSize: '11px', color: '#4ADE80', fontWeight: 700, textTransform: 'uppercase' }}>True Non-Berisik</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#4ADE80', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              {cm[1][1]}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>Prediksi Benar (TN)</div>
          </div>
        </div>
      </div>

      {/* Model Comparison Bar Chart */}
      <div className="glass-card" style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#F0FDFA', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={20} color="#4ADE80" />
          Komparasi 6 Model Pembelajaran Mesin yang Dievaluasi
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {model_comparison.map(mc => {
            const isWinner = mc.name === 'Random Forest';
            return (
              <div key={mc.name} style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px' }}>
                <span style={{ width: '180px', fontWeight: isWinner ? 700 : 500, color: isWinner ? '#4ADE80' : '#94A3B8' }}>
                  {mc.name} {isWinner ? '★ (Terpilih)' : ''}
                </span>
                <div style={{ flex: 1, height: '16px', backgroundColor: 'rgba(3, 29, 22, 0.85)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(74, 222, 128, 0.15)' }}>
                  <div style={{
                    width: `${mc.accuracy * 100}%`,
                    height: '100%',
                    background: isWinner ? 'linear-gradient(90deg, #22C55E, #84CC16)' : 'rgba(148, 163, 184, 0.4)',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                <span style={{ width: '60px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isWinner ? '#4ADE80' : '#F0FDFA' }}>
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
