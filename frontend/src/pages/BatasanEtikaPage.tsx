import React from 'react';
import { ShieldAlert, AlertTriangle, Cpu, Lock } from 'lucide-react';

export const BatasanEtikaPage: React.FC = () => {
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
          Batasan Sistem, Kalibrasi & Etika Penggunaan
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Panduan transparansi akademik, batasan distribusi data, variasi perangkat keras, serta kebijakan privasi.
        </p>
      </div>

      {/* Academic Disclaimer Box */}
      <div style={{
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid var(--accent-warning-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px'
      }}>
        <AlertTriangle size={24} color="var(--accent-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-warning)', marginBottom: '4px' }}>
            Bukan Alat Sertifikasi Legal K3 / Regulasi Resmi
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Sound Lab dikembangkan sebagai purwarupa penelitian sistem cerdas klasifikasi audio lingkungan kerja.
            Aplikasi ini <strong>tidak menggantikan Sound Level Meter (SLM) terkalibrasi Kelas 1/2 standar IEC 61672</strong> untuk
            kebutuhan sertifikasi hukum K3, inspeksi resmi ketenagakerjaan, atau uji kepatuhan ambang batas dB(A).
          </p>
        </div>
      </div>

      {/* Key Limitation Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="var(--accent-quiet)" />
            Sensitivitas Perangkat Keras Mikrofon
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Mikrofon laptop, webcam, dan ponsel memiliki Automatic Gain Control (AGC) bawaan dan respons frekuensi berbeda.
            Perbedaan sensitivitas ini dapat mempengaruhi nilai RMS (amplitudo). Model dilengkapi normalisasi spektral MFCC
            untuk mengurangi ketergantungan pada kekerasan mutlak sinyal.
          </p>
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
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="var(--accent-noisy)" />
            Distribusi Suara (Out-of-Distribution)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Model dilatih spesifik pada suara kebisingan pabrik, mesin industri, kantor, dan ruangan sepi.
            Suara di luar domain ini (seperti musik instrumental, vokal menyanyi, suara hewan, atau hembusan angin langsung ke mikrofon)
            dapat menghasilkan prediksi dengan tingkat keyakinan rendah (&lt; 65%).
          </p>
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
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="var(--accent-neutral)" />
            Privasi & Pemrosesan Data
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Rekaman audio yang diunggah diproses secara temporer dalam memori server untuk ekstraksi fitur dan segera dihapus
            setelah respons dikembalikan ke peramban. Sistem <strong>tidak menyimpan rekaman audio pengguna di basis data atau media penyimpanan permanen</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
