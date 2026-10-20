import React from 'react';
import type { ExplanationResult } from '../../types/api';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ExplanationCardProps {
  explanation: ExplanationResult;
}

export const ExplanationCard: React.FC<ExplanationCardProps> = ({ explanation }) => {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Mengapa Hasilnya Demikian? (Penjelasan Awam)
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {explanation.summary}
        </p>
      </div>

      {/* Main Reasons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Faktor Penentu Utama:
        </span>
        {explanation.reasons.map((r, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '10px 12px',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              color: 'var(--text-primary)'
            }}
          >
            <CheckCircle2 size={16} style={{ color: 'var(--accent-quiet)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <span>{r.text}</span>
              <span style={{
                marginLeft: '8px',
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)'
              }}>
                pengaruh {r.strength}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Counter reasons */}
      {explanation.counter_reasons && explanation.counter_reasons.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Faktor yang Berlawanan (Catatan Variasi):
          </span>
          {explanation.counter_reasons.map((cr, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                backgroundColor: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid var(--accent-warning-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                color: 'var(--text-primary)'
              }}
            >
              <AlertCircle size={16} style={{ color: 'var(--accent-warning)', flexShrink: 0, marginTop: '2px' }} />
              <span>{cr.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
