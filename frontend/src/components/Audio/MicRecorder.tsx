import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, AlertCircle } from 'lucide-react';
import { convertBlobToWav } from '../../utils/wavEncoder';

interface MicRecorderProps {
  onAudioRecorded: (blob: Blob, filename: string) => void;
  isLoading: boolean;
}

export const MicRecorder: React.FC<MicRecorderProps> = ({ onAudioRecorded, isLoading }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [meterVolume, setMeterVolume] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    setRecordSeconds(0);
    startTimeRef.current = Date.now();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Audio analysis for real-time VU meter
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const norm = Math.min(100, Math.round((avg / 128) * 100));
        setMeterVolume(norm);
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const rawBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Stop audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
        }
        setMeterVolume(0);

        const durationS = (Date.now() - startTimeRef.current) / 1000;
        if (durationS < 0.8) {
          setMicError('Rekaman terlalu pendek (< 0,8 detik). Rekam minimal 3 detik untuk akurasi optimal.');
          return;
        }

        try {
          // Convert WebM to standard 16-bit PCM WAV for guaranteed backend decoding without server-side ffmpeg
          const wavBlob = await convertBlobToWav(rawBlob);
          const filename = `rekaman-mikrofon-${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
          onAudioRecorded(wavBlob, filename);
        } catch (e: any) {
          console.warn('Gagal mengonversi rekaman ke WAV, menggunakan blob asli:', e);
          const ext = mimeType.includes('wav') ? 'wav' : 'webm';
          const filename = `rekaman-mikrofon-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
          onAudioRecorded(rawBlob, filename);
        }
      };

      mediaRecorder.start(200); // 200ms slice
      setIsRecording(true);
      updateMeter();

      timerRef.current = window.setInterval(() => {
        setRecordSeconds(prev => {
          if (prev >= 120) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Mic error:', err);
      setMicError('Izin mikrofon tidak diberikan atau perangkat audio tidak ditemukan.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Rekam dari Mikrofon
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Gunakan mikrofon ruangan untuk mengukur tingkat kebisingan langsung
          </p>
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '18px',
          fontWeight: 600,
          color: isRecording ? 'var(--accent-noisy)' : 'var(--text-secondary)'
        }}>
          {formatTime(recordSeconds)}
        </div>
      </div>

      {/* Real-time VU bar */}
      <div style={{
        height: '8px',
        backgroundColor: 'var(--bg-canvas)',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{
          height: '100%',
          width: `${isRecording ? meterVolume : 0}%`,
          backgroundColor: meterVolume > 70 ? 'var(--accent-noisy)' : 'var(--accent-quiet)',
          transition: 'width 0.1s linear'
        }} />
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-quiet)',
              color: '#0B0F14',
              fontWeight: 600,
              fontSize: '14px',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            <Mic size={18} />
            <span>Mulai Merekam</span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-noisy)',
              color: '#0B0F14',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            <Square size={18} />
            <span>Hentikan & Analisis</span>
          </button>
        )}
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {isRecording ? 'Sedang merekam sinyal suara... Rekam 15-30 detik untuk akurasi terbaik.' : 'Maksimal 120 detik'}
        </span>
      </div>

      {micError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--accent-danger-bg)',
          color: 'var(--accent-danger)',
          fontSize: '13px'
        }}>
          <AlertCircle size={16} />
          <span>{micError}</span>
        </div>
      )}
    </div>
  );
};
