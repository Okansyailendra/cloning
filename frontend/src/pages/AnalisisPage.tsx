import React, { useState } from 'react';
import { RealtimeMonitor } from '../components/Audio/RealtimeMonitor';
import { Uploader } from '../components/Audio/Uploader';
import { SampleAudios } from '../components/Audio/SampleAudios';
import { MicRecorder } from '../components/Audio/MicRecorder';
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
import { Radio, FolderOpen, Loader2, RefreshCw, Mic } from 'lucide-react';

export const AnalisisPage: React.FC = () => {
  // Main view mode: 'realtime' (default) vs 'file'
  const [viewMode, setViewMode] = useState<'realtime' | 'file'>('realtime');
  const [fileTab, setFileTab] = useState<'upload' | 'record' | 'sample'>('upload');

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

  const handleSelectChunk = (start_s: number) => {
    setSeekTarget(start_s);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* ============================================================== */}
      {/* MODE 1: DETEKSI REAL-TIME (Default Integrated Split Workspace)  */}
      {/* ============================================================== */}
      {viewMode === 'realtime' && (
        <RealtimeMonitor viewMode={viewMode} onSwitchMode={setViewMode} />
      )}

      {/* ============================================================== */}
      {/* MODE 2: ANALISIS BERKAS / SAMPEL / REKAMAN                     */}
      {/* ============================================================== */}
      {viewMode === 'file' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Centered File / Sample Analysis Control Box */}
          <section style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }}>
            <div className="glass-card" style={{
              width: '100%',
              maxWidth: '920px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '20px'
            }}>
              {/* Mode Switcher */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{
                  display: 'flex',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  padding: '4px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
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
                      fontWeight: 500,
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)'
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
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-active)'
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
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}
                  >
                    <RefreshCw size={13} />
                    <span>Analisis Ulang</span>
                  </button>
                )}
              </div>

              {/* Sub-tabs: Unggah Berkas vs Rekam Mikrofon vs Coba Contoh */}
              <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '10px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setFileTab('upload')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: fileTab === 'upload' ? 600 : 500,
                    backgroundColor: fileTab === 'upload' ? 'var(--bg-surface-elevated)' : 'transparent',
                    color: fileTab === 'upload' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: `1px solid ${fileTab === 'upload' ? 'var(--border-active)' : 'transparent'}`
                  }}
                >
                  Unggah Berkas Audio
                </button>
                <button
                  onClick={() => setFileTab('record')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: fileTab === 'record' ? 600 : 500,
                    backgroundColor: fileTab === 'record' ? 'var(--bg-surface-elevated)' : 'transparent',
                    color: fileTab === 'record' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: `1px solid ${fileTab === 'record' ? 'var(--border-active)' : 'transparent'}`
                  }}
                >
                  <Mic size={14} />
                  <span>Rekam Mikrofon</span>
                </button>
                <button
                  onClick={() => setFileTab('sample')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: fileTab === 'sample' ? 600 : 500,
                    backgroundColor: fileTab === 'sample' ? 'var(--bg-surface-elevated)' : 'transparent',
                    color: fileTab === 'sample' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: `1px solid ${fileTab === 'sample' ? 'var(--border-active)' : 'transparent'}`
                  }}
                >
                  Coba Contoh Sampel
                </button>
              </div>

              {/* Upload Dropzone, Mic Recorder, or Samples Picker */}
              <div>
                {fileTab === 'upload' && (
                  <Uploader onFileSelected={(f) => processAudio(f, f.name)} isLoading={isLoading} />
                )}
                {fileTab === 'record' && (
                  <MicRecorder onAudioRecorded={(blob, filename) => processAudio(blob, filename)} isLoading={isLoading} />
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
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-quiet)' }} />
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
                Mengekstraksi Fitur Audio Spektral & Menjalankan Model...
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Memotong hening (top_db=25), menghitung RMS, MFCC 1-13, dan Spectral Centroid.
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div style={{
              padding: '14px 18px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-md)',
              color: '#EF4444',
              fontSize: '13px'
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
                accentColor={result.prediction.label === 'berisik' ? '#EF4444' : '#10B981'}
                chunks={result.chunks}
              />

              <SpectrogramCanvas
                spectrogram={result.visual.spectrogram}
                duration_s={result.audio.duration_s}
              />

              <ChunkTimeline
                chunks={result.chunks}
                onSelectChunk={handleSelectChunk}
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
