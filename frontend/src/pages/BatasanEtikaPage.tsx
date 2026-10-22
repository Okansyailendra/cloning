import React from 'react';
import { ShieldAlert, AlertTriangle, Cpu, Lock } from 'lucide-react';

export const BatasanEtikaPage: React.FC = () => {
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
          Batasan Sistem, Kalibrasi & Etika Penggunaan
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '800px' }}>
          Panduan transparansi akademik, batasan distribusi data suara, variasi perangkat keras mikrofon, serta perlindungan privasi pengguna.
        </p>
      </div>

      {/* Academic Disclaimer Callout: Solid Amber Contrast */}
      <div className="glass-card" style={{
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        padding: '24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px'
      }}>
        <AlertTriangle size={24} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#B45309', marginBottom: '6px' }}>
            Purwarupa Akademik Proyek Sains Data (Bukan Alat Ukur Formal)
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            Sonalyze dikembangkan sebagai luaran tugas mata kuliah Proyek Sains Data (PSD) untuk klasifikasi dan deteksi kebisingan audio menggunakan Random Forest.
            Aplikasi ini merupakan purwarupa pembelajaran mesin dan <strong>tidak dimaksudkan sebagai pengganti instrumen Sound Level Meter (SLM) tersertifikasi standar IEC 61672</strong> untuk
            kebutuhan audit formal atau regulasi hukum.
          </p>
        </div>
      </div>

      {/* Key Limitation Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={18} color="var(--accent-quiet)" />
            Sensitivitas Perangkat Keras Mikrofon
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Mikrofon laptop, webcam, dan ponsel memiliki Automatic Gain Control (AGC) bawaan dan respons frekuensi berbeda.
            Perbedaan sensitivitas ini dapat mempengaruhi nilai RMS (amplitudo). Model dilengkapi normalisasi spektral MFCC
            untuk mengurangi ketergantungan pada kekerasan mutlak sinyal.
          </p>
        </div>

        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={18} color="var(--accent-quiet)" />
            Distribusi Suara (Out-of-Distribution)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Model dilatih spesifik pada dataset rekaman suara tugas PSD dengan kategori Berisik (keramaian, jalanan, aktivitas bising) dan Non-Berisik (ruangan hening, suasana tenang).
            Suara di luar domain ini (seperti musik instrumental murni, instrumen musik akustik tertentu, atau hembusan angin langsung ke mikrofon)
            dapat menghasilkan prediksi dengan tingkat keyakinan rendah (&lt; 65%).
          </p>
        </div>

        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={18} color="var(--accent-quiet)" />
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
