import React from 'react';
import { ShieldAlert, AlertTriangle, Cpu, Lock, FileCheck } from 'lucide-react';

export const BatasanEtikaPage: React.FC = () => {
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
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            fontSize: '11px',
            fontWeight: 700,
            color: '#F59E0B',
            fontFamily: 'var(--font-mono)'
          }}>
            <FileCheck size={13} />
            TRANSPARANSI AKADEMIK & ETIKA
          </span>
        </div>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: '4px'
        }}>
          Batasan Sistem, <span className="text-gradient-teal">Kalibrasi & Etika Penggunaan</span>
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>
          Panduan transparansi akademik, batasan distribusi data suara, variasi perangkat keras mikrofon, serta perlindungan privasi pengguna.
        </p>
      </div>

      {/* Academic Disclaimer Box */}
      <div className="glass-card" style={{
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        padding: '24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px'
      }}>
        <AlertTriangle size={26} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#F59E0B', marginBottom: '6px' }}>
            Bukan Alat Sertifikasi Legal K3 / Regulasi Resmi
          </h2>
          <p style={{ fontSize: '14px', color: '#F0FDFA', lineHeight: 1.6 }}>
            Sound Lab dikembangkan sebagai purwarupa penelitian sistem cerdas klasifikasi audio lingkungan kerja.
            Aplikasi ini <strong>tidak menggantikan Sound Level Meter (SLM) terkalibrasi Kelas 1/2 standar IEC 61672</strong> untuk
            kebutuhan sertifikasi hukum K3, inspeksi resmi ketenagakerjaan, atau uji kepatuhan ambang batas dB(A).
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
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#F0FDFA', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={20} color="#14B8A6" />
            Sensitivitas Perangkat Keras Mikrofon
          </h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6 }}>
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
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#F0FDFA', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={20} color="#F97316" />
            Distribusi Suara (Out-of-Distribution)
          </h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6 }}>
            Model dilatih spesifik pada suara kebisingan pabrik, mesin industri, kantor, dan ruangan sepi.
            Suara di luar domain ini (seperti musik instrumental, vokal menyanyi, suara hewan, atau hembusan angin langsung ke mikrofon)
            dapat menghasilkan prediksi dengan tingkat keyakinan rendah (&lt; 65%).
          </p>
        </div>

        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#F0FDFA', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={20} color="#06B6D4" />
            Privasi & Pemrosesan Data
          </h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6 }}>
            Rekaman audio yang diunggah diproses secara temporer dalam memori server untuk ekstraksi fitur dan segera dihapus
            setelah respons dikembalikan ke peramban. Sistem <strong>tidak menyimpan rekaman audio pengguna di basis data atau media penyimpanan permanen</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
