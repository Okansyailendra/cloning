import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { PredictionResult } from '../../types/api';

interface PredictionCardProps {
  prediction: PredictionResult;
  filename: string;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({ prediction, filename }) => {
  const isNoisy = prediction.label === 'berisik';
  const confidencePct = Math.round(prediction.confidence * 100);
  const probNoisy = Math.round((prediction.probabilities.berisik || 0) * 100);
  const probQuiet = Math.round((prediction.probabilities['non-berisik'] || 0) * 100);

  // SVG circular gauge calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidencePct / 100) * circumference;

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: `1px solid ${isNoisy ? 'var(--accent-noisy-border)' : 'var(--accent-quiet-border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            fontWeight: 600
          }}>
            Hasil Klasifikasi Model
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isNoisy ? 'var(--accent-noisy-bg)' : 'var(--accent-quiet-bg)',
              color: isNoisy ? 'var(--accent-noisy)' : 'var(--accent-quiet)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isNoisy ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </div>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '28px',
                fontWeight: 700,
                color: isNoisy ? 'var(--accent-noisy)' : 'var(--accent-quiet)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1
              }}>
                {prediction.label_display}
              </h2>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {filename}
              </span>
            </div>
          </div>
        </div>

        {/* Circular Confidence Gauge */}
        <div style={{ position: 'relative', width: '120px', height: '120px' }}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="var(--border-subtle)"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke={isNoisy ? 'var(--accent-noisy)' : 'var(--accent-quiet)'}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary)'
            }}>
              {confidencePct}%
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Keyakinan
            </span>
          </div>
        </div>
      </div>

      {/* Probabilities Dual Bar */}
      <div style={{
        backgroundColor: 'var(--bg-canvas)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span style={{ color: 'var(--accent-noisy)', fontWeight: 600 }}>
            Peluang Berisik: {probNoisy}%
          </span>
          <span style={{ color: 'var(--accent-quiet)', fontWeight: 600 }}>
            Peluang Non-Berisik: {probQuiet}%
          </span>
        </div>
        <div style={{
          height: '8px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '4px',
          overflow: 'hidden',
          display: 'flex'
        }}>
          <div style={{ width: `${probNoisy}%`, backgroundColor: 'var(--accent-noisy)', transition: 'width 0.4s ease' }} />
          <div style={{ width: `${probQuiet}%`, backgroundColor: 'var(--accent-quiet)', transition: 'width 0.4s ease' }} />
        </div>
      </div>
    </div>
  );
};
