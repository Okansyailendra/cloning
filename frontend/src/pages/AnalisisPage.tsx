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
import { Radio, FolderOpen, Loader2, RefreshCw } from 'lucide-react';

export const AnalisisPage: React.FC = () => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* Top Header Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: '4px'
          }}>
            Analisis Kebisingan Lingkungan Kerja
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '640px' }}>
            Pendeteksian kondisi ruangan kerja secara langsung (*real-time*) melalui mikrofon perangkat atau analisis mendalam berkas audio rekaman.
          </p>
        </div>

        {/* Primary View Mode Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-surface)',
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
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: viewMode === 'realtime' ? 'var(--accent-quiet)' : 'transparent',
              color: viewMode === 'realtime' ? '#0B0F14' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            <Radio size={16} />
            <span>Deteksi Real-Time</span>
          </button>

          <button
            onClick={() => setViewMode('file')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: viewMode === 'file' ? 'var(--accent-quiet)' : 'transparent',
              color: viewMode === 'file' ? '#0B0F14' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            <FolderOpen size={16} />
            <span>Analisis Berkas / Sampel</span>
          </button>
        </div>
      </div>

      {/* MODE 1: REAL-TIME MONITORING */}
      {viewMode === 'realtime' && (
        <RealtimeMonitor />
      )}

      {/* MODE 2: FILE UPLOAD & SAMPLES ANALYSIS */}
      {viewMode === 'file' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setFileTab('upload')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
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
                onClick={() => setFileTab('sample')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
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

            {result && (
              <button
                onClick={handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)'
                }}
              >
                <RefreshCw size={15} />
                <span>Analisis Baru</span>
              </button>
            )}
          </div>

          <div>
            {fileTab === 'upload' && (
              <Uploader onFileSelected={(f) => processAudio(f, f.name)} isLoading={isLoading} />
            )}
            {fileTab === 'sample' && (
              <SampleAudios onSelectSample={handleSampleSelected} isLoading={isLoading} />
            )}
          </div>

          {isLoading && (
            <div style={{
              padding: '36px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'center'
            }}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-quiet)' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Mengekstraksi 10 Fitur Audio & Menjalankan Model...
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{
              padding: '16px',
              backgroundColor: 'var(--accent-danger-bg)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent-danger)',
              fontSize: '14px'
            }}>
              {errorMsg}
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                accentColor={result.prediction.label === 'berisik' ? '#FF6B35' : '#22D3C5'}
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
