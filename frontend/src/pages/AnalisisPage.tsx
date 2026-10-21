import React, { useState } from 'react';
import { RealtimeMonitor } from '../components/Audio/RealtimeMonitor';
import { Uploader } from '../components/Audio/Uploader';
import { SampleAudios } from '../components/Audio/SampleAudios';
import { AudioPlayer } from '../components/Audio/AudioPlayer';
import { PredictionCard } from '../components/Results/PredictionCard';
import { ExplanationCard } from '../components/Results/ExplanationCard';
import { FeatureTable } from '../components/Results/FeatureTable';
import { WarningBanner } from '../components/Results/WarningBanner';
import { WaveformCanvas } from '../components/Visuals/WaveformCanvas';
import { SpectrogramCanvas } from '../components/Visuals/SpectrogramCanvas';
import { ChunkTimeline } from '../components/Visuals/ChunkTimeline';
import { predictAudioFile } from '../services/api';
import { saveHistoryItem } from '../services/history';
import type { PredictResponse } from '../types/api';
import { Radio, FolderOpen, Loader2, RefreshCw, Zap, CheckCircle2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AnalisisPage: React.FC = () => {
  const navigate = useNavigate();

  // Main view mode: 'realtime' (default) vs 'file'
  const [viewMode, setViewMode] = useState<'realtime' | 'file'>('realtime');
  const [fileTab, setFileTab] = useState<'upload' | 'sample'>('upload');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResponse | null>(null);
  
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);

  const processAudio = async (fileOrBlob: File | Blob, filename: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    const url = URL.createObjectURL(fileOrBlob);
    setAudioBlobUrl(url);

    try {
      const resp = await predictAudioFile(fileOrBlob, filename);
      setResult(resp);

      // Save to history
      saveHistoryItem({
        id: resp.request_id,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        filename: resp.file.name,
        duration_s: resp.audio.duration_s,
        label: resp.prediction.label,
        confidence: resp.prediction.confidence,
        rms_mean: resp.features.find(f => f.name === 'rms_mean')?.value || 0,
        centroid_mean: resp.features.find(f => f.name === 'centroid_mean')?.value || 0,
        zcr_mean: resp.features.find(f => f.name === 'zcr_mean')?.value || 0,
        full_response: resp
      });

    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kegagalan saat menganalisis audio.');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleSelected = async (url: string, filename: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengunduh audio contoh');
      const blob = await res.blob();
      processAudio(blob, filename);
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal memuat contoh audio');
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setAudioBlobUrl(null);
    setErrorMsg(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* ============================================================== */}
      {/* MODE 1: DETEKSI REAL-TIME (Default Integrated Split Hero Workspace) */}
      {/* ============================================================== */}
      {viewMode === 'realtime' && (
        <RealtimeMonitor viewMode={viewMode} onSwitchMode={setViewMode} />
      )}

      {/* ============================================================== */}
      {/* MODE 2: ANALISIS BERKAS / SAMPEL (Split Hero + Results)       */}
      {/* ============================================================== */}
      {viewMode === 'file' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Split Hero for File / Sample Analysis */}
          <section style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 1.15fr) minmax(340px, 1fr)',
            gap: '28px',
            alignItems: 'stretch'
          }}>
            {/* Left Hero Intro */}
            <div className="glass-card" style={{
              padding: '36px 32px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: '1px solid rgba(45, 212, 191, 0.22)'
            }}>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(20, 184, 166, 0.12)',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#2DD4BF',
                    letterSpacing: '0.04em',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    <Zap size={13} />
                    MODE BERKAS & SAMPEL AUDIO
                  </span>
                </div>

                <h1 style={{
                  fontSize: '40px',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15
                }}>
                  Analisis Berkas <br />
                  <span className="text-gradient-teal">& Sampel Pengujian</span>
                </h1>

                <p style={{
                  color: '#94A3B8',
                  fontSize: '15px',
                  lineHeight: 1.6,
                  maxWidth: '540px'
                }}>
                  Unggah berkas rekaman suara (MP3, WAV, OGG, FLAC hingga 15 MB) atau gunakan sampel pengujian siap pakai untuk analisis visual sinyal, spektrogram mel, dan dekomposisi 10 fitur akustik.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '12px' }}>
                  <button
                    onClick={() => setViewMode('realtime')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '14px 26px',
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, #14B8A6 0%, #06B6D4 100%)',
                      color: '#040D12',
                      fontSize: '15px',
                      fontWeight: 700,
                      boxShadow: '0 4px 20px rgba(20, 184, 166, 0.35)'
                    }}
                  >
                    <Radio size={18} />
                    <span>Kembali ke Real-Time</span>
                  </button>

                  <button
                    onClick={() => navigate('/tentang-model')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '14px 22px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(15, 46, 65, 0.65)',
                      border: '1px solid rgba(45, 212, 191, 0.25)',
                      color: '#F0FDFA',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    <BookOpen size={16} color="#2DD4BF" />
                    <span>Pelajari Fitur</span>
                  </button>
                </div>
              </div>

              <div style={{
                position: 'relative',
                zIndex: 1,
                marginTop: '28px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(45, 212, 191, 0.12)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                fontSize: '12px',
                color: '#94A3B8'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} color="#14B8A6" />
                  <span>Silence Removal 25 dB</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} color="#14B8A6" />
                  <span>64 Mel Bins Spectrogram</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} color="#14B8A6" />
                  <span>Penjelasan Bahasa Awam</span>
                </div>
              </div>
            </div>

            {/* Right Card: File Selection & Options */}
            <div className="glass-card" style={{
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '20px',
              border: '1px solid rgba(45, 212, 191, 0.25)'
            }}>
              {/* Mode Switcher */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{
                  display: 'flex',
                  backgroundColor: 'rgba(7, 22, 31, 0.85)',
                  padding: '4px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(45, 212, 191, 0.2)',
                  gap: '4px'
                }}>
                  <button
                    onClick={() => setViewMode('realtime')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: 'transparent',
                      color: '#94A3B8'
                    }}
                  >
                    <Radio size={14} />
                    <span>Deteksi Real-Time</span>
                  </button>

                  <button
                    onClick={() => setViewMode('file')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: '#14B8A6',
                      color: '#040D12'
                    }}
                  >
                    <FolderOpen size={14} />
                    <span>Analisis Berkas / Sampel</span>
                  </button>
                </div>

                {result && (
                  <button
                    onClick={handleReset}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(15, 46, 65, 0.75)',
                      border: '1px solid rgba(45, 212, 191, 0.25)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#2DD4BF'
                    }}
                  >
                    <RefreshCw size={14} />
                    <span>Analisis Ulang</span>
                  </button>
                )}
              </div>

              {/* Sub-tabs: Unggah Berkas vs Coba Contoh */}
              <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid rgba(45, 212, 191, 0.15)',
                paddingBottom: '10px'
              }}>
                <button
                  onClick={() => setFileTab('upload')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: fileTab === 'upload' ? 700 : 500,
                    backgroundColor: fileTab === 'upload' ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
                    color: fileTab === 'upload' ? '#F0FDFA' : '#94A3B8',
                    border: `1px solid ${fileTab === 'upload' ? 'rgba(45, 212, 191, 0.4)' : 'transparent'}`
                  }}
                >
                  Unggah Berkas Audio
                </button>
                <button
                  onClick={() => setFileTab('sample')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: fileTab === 'sample' ? 700 : 500,
                    backgroundColor: fileTab === 'sample' ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
                    color: fileTab === 'sample' ? '#F0FDFA' : '#94A3B8',
                    border: `1px solid ${fileTab === 'sample' ? 'rgba(45, 212, 191, 0.4)' : 'transparent'}`
                  }}
                >
                  Coba Contoh Sampel
                </button>
              </div>

              {/* Upload Dropzone or Samples Picker */}
              <div>
                {fileTab === 'upload' && (
                  <Uploader onFileSelected={(f) => processAudio(f, f.name)} isLoading={isLoading} />
                )}
                {fileTab === 'sample' && (
                  <SampleAudios onSelectSample={handleSampleSelected} isLoading={isLoading} />
                )}
              </div>
            </div>
          </section>

          {/* Loading State */}
          {isLoading && (
            <div className="glass-card" style={{
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              textAlign: 'center'
            }}>
              <Loader2 size={36} className="animate-spin" style={{ color: '#14B8A6' }} />
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#F0FDFA' }}>
                Mengekstraksi 10 Fitur Audio Spektral & Menjalankan Model...
              </div>
              <p style={{ fontSize: '13px', color: '#94A3B8' }}>
                Memotong bagian hening (top_db=25), menghitung RMS, MFCC 1-13, dan Spectral Centroid.
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div style={{
              padding: '16px 20px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-md)',
              color: '#EF4444',
              fontSize: '14px'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Complete Analysis Results */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {audioBlobUrl && (
                <AudioPlayer
                  src={audioBlobUrl}
                  onTimeUpdate={(cur) => setCurrentTime(cur)}
                  seekTime={seekTarget}
                />
              )}

              <WarningBanner
                warnings={result.warnings}
                lowConfidence={result.prediction.low_confidence}
                warnThreshold={result.prediction.warn_threshold}
              />

              <PredictionCard prediction={result.prediction} filename={result.file.name} />

              <WaveformCanvas
                waveform={result.visual.waveform}
                duration_s={result.audio.duration_s}
                activeIntervals={result.audio.active_intervals}
                currentTime={currentTime}
                onSeek={(t) => setSeekTarget(t)}
                accentColor={result.prediction.label === 'berisik' ? '#F97316' : '#14B8A6'}
              />

              <SpectrogramCanvas
                spectrogram={result.visual.spectrogram}
                duration_s={result.audio.duration_s}
              />

              <ChunkTimeline
                chunks={result.chunks}
                onSelectChunk={(start_s) => setSeekTarget(start_s)}
              />

              <ExplanationCard explanation={result.explanation} />
              <FeatureTable features={result.features} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
