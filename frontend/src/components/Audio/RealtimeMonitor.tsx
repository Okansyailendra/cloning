import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Square, Activity, Volume2, VolumeX, AlertTriangle, Bell, BellOff } from 'lucide-react';
import { predictLiveAudio } from '../../services/api';
import type { LivePredictResponse, LiveHistoryPoint } from '../../types/api';

// Helper to encode Float32Array to 16-bit PCM WAV Blob
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // 16-bit
  // data chunk identifier
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const RealtimeMonitor: React.FC = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [liveData, setLiveData] = useState<LivePredictResponse | null>(null);
  const [history, setHistory] = useState<LiveHistoryPoint[]>([]);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Alarm state: ACTIVE by default
  const [audioAlert, setAudioAlert] = useState<boolean>(true);
  const [alarmVolume, setAlarmVolume] = useState<number>(1.0);
  const [activeAlarmLevel, setActiveAlarmLevel] = useState<'none' | 'medium' | 'high'>('none');
  const [testingAlarm, setTestingAlarm] = useState<string | null>(null);

  // Cumulative statistics
  const [totalChecks, setTotalChecks] = useState<number>(0);
  const [noisyChecks, setNoisyChecks] = useState<number>(0);
  const [peakRms, setPeakRms] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Audio streams and nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const rollingTimerRef = useRef<number | null>(null);
  const stopwatchTimerRef = useRef<number | null>(null);

  // STRICT SINGLE-PLAYBACK ATOMIC ALARM LOCK (No overlapping & finish-before-switch)
  const isAlarmPlayingRef = useRef<boolean>(false);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAlarmTypeRef = useRef<'medium' | 'high' | null>(null);
  const latestNoisePercentRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(false);
  const audioAlertRef = useRef<boolean>(true);

  // Synchronize state to refs
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    audioAlertRef.current = audioAlert;
  }, [audioAlert]);

  // 3-second circular audio buffer (at 22050 Hz = 66150 samples)
  const TARGET_SR = 22050;
  const BUFFER_LEN = TARGET_SR * 3;
  const audioBufferRef = useRef<Float32Array>(new Float32Array(BUFFER_LEN));
  const bufferWriteIdx = useRef<number>(0);
  const isPredictingRef = useRef<boolean>(false);

  // Play alarm sound atomically: MUST FINISH TO THE END before anything else can play
  const playAlarmAudio = useCallback((type: 'medium' | 'high') => {
    // If any sound is currently playing, DO NOT interrupt, DO NOT cut off, DO NOT overlap!
    if (isAlarmPlayingRef.current) {
      return;
    }

    const audioSrc = type === 'high' ? '/audio_alarm/alarm_90-100.mp3' : '/audio_alarm/alarm_70-90.mp3';
    const audio = new Audio(audioSrc);
    audio.volume = alarmVolume;

    isAlarmPlayingRef.current = true;
    currentAlarmTypeRef.current = type;
    alarmAudioRef.current = audio;
    setActiveAlarmLevel(type);

    const onAudioFinished = () => {
      isAlarmPlayingRef.current = false;
      currentAlarmTypeRef.current = null;
      alarmAudioRef.current = null;
      setActiveAlarmLevel('none');
      setTestingAlarm(null);

      // Only after previous sound completes 100%: check what the current noise condition is now
      if (isActiveRef.current && audioAlertRef.current) {
        const curPct = latestNoisePercentRef.current;
        if (curPct >= 90) {
          playAlarmAudio('high');
        } else if (curPct >= 70) {
          playAlarmAudio('medium');
        }
        // If curPct < 70, no new sound will start!
      }
    };

    audio.onended = onAudioFinished;
    audio.onerror = onAudioFinished;

    audio.play().catch(err => {
      console.warn('Playback error or prevented by browser autoplay:', err);
      onAudioFinished();
    });
  }, [alarmVolume]);

  // Force stop only when user stops monitoring or disables alarm toggle
  const forceStopAlarm = useCallback(() => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
      alarmAudioRef.current = null;
    }
    isAlarmPlayingRef.current = false;
    currentAlarmTypeRef.current = null;
    setActiveAlarmLevel('none');
    setTestingAlarm(null);
  }, []);

  // Preview test alarm sounds (respects lock)
  const handleTestAlarm = (type: 'medium' | 'high') => {
    if (isAlarmPlayingRef.current) return;
    setTestingAlarm(type);
    playAlarmAudio(type);
  };

  // 60 FPS Oscilloscope Drawing
  const drawOscilloscope = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);

    // Background
    ctx.fillStyle = '#0F151E';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.moveTo(0, centerY - height * 0.35);
    ctx.lineTo(width, centerY - height * 0.35);
    ctx.moveTo(0, centerY + height * 0.35);
    ctx.lineTo(width, centerY + height * 0.35);
    ctx.stroke();

    // Line color based on current status and alarm level
    let strokeColor = '#22D3C5';
    if (activeAlarmLevel === 'high') {
      strokeColor = '#EF4444'; // Red for 90%+
    } else if (activeAlarmLevel === 'medium') {
      strokeColor = '#FF6B35'; // Amber for 70-90%
    } else if (liveData?.label === 'berisik') {
      strokeColor = '#FF6B35';
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i];
      const y = centerY + v * (height * 0.45);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();

    animFrameRef.current = requestAnimationFrame(drawOscilloscope);
  }, [liveData, activeAlarmLevel]);

  // Draw Rolling History Chart (Last 30 data points)
  useEffect(() => {
    const canvas = historyCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0F151E';
    ctx.fillRect(0, 0, width, height);

    if (history.length === 0) {
      ctx.fillStyle = '#64748B';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Grafik riwayat kebisingan akan tampil secara dinamis...', width / 2, height / 2);
      return;
    }

    const barWidth = width / 30;
    history.forEach((pt, idx) => {
      const x = idx * barWidth;
      const isNoisy = pt.label === 'berisik';
      const normRms = Math.min(1, pt.rms / 0.15);
      const barH = Math.max(6, normRms * (height - 24));

      // Bar color: Red if >=90%, Amber if >=70%, Cyan if quiet
      let fillCol = 'rgba(34, 211, 197, 0.75)';
      let dotCol = '#22D3C5';
      if (isNoisy) {
        if (pt.confidence >= 0.90) {
          fillCol = 'rgba(239, 68, 68, 0.85)';
          dotCol = '#EF4444';
        } else {
          fillCol = 'rgba(255, 107, 53, 0.8)';
          dotCol = '#FF6B35';
        }
      }

      ctx.fillStyle = fillCol;
      ctx.fillRect(x + 2, height - barH - 4, barWidth - 4, barH);

      ctx.fillStyle = dotCol;
      ctx.beginPath();
      ctx.arc(x + barWidth / 2, height - barH - 8, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Baseline
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 2);
    ctx.lineTo(width, height - 2);
    ctx.stroke();
  }, [history]);

  // Send 3-second rolling buffer to backend
  const sendLivePrediction = useCallback(async () => {
    if (isPredictingRef.current) return;
    isPredictingRef.current = true;

    try {
      // Create ordered 3-second array from circular buffer
      const ordered = new Float32Array(BUFFER_LEN);
      const writeIdx = bufferWriteIdx.current;
      ordered.set(audioBufferRef.current.subarray(writeIdx));
      ordered.set(audioBufferRef.current.subarray(0, writeIdx), BUFFER_LEN - writeIdx);

      // Encode into WAV blob
      const wavBlob = encodeWAV(ordered, TARGET_SR);

      // Send to /api/predict-live
      const res = await predictLiveAudio(wavBlob);
      setLiveData(res);

      // Calculate noise percentage
      const noiseProb = res.probabilities.berisik !== undefined
        ? res.probabilities.berisik
        : (res.label === 'berisik' ? res.confidence : 1 - res.confidence);
      const noisePercent = Math.round(noiseProb * 100);
      latestNoisePercentRef.current = noisePercent;

      // Trigger alarm: ONLY if no sound is currently playing (atomic non-overlapping rule)
      if (audioAlertRef.current && !isAlarmPlayingRef.current) {
        if (noisePercent >= 90) {
          playAlarmAudio('high');
        } else if (noisePercent >= 70) {
          playAlarmAudio('medium');
        }
      }

      // Update statistics
      setTotalChecks(prev => prev + 1);
      if (res.label === 'berisik') {
        setNoisyChecks(prev => prev + 1);
      }
      setPeakRms(prev => Math.max(prev, res.rms));

      // Append to history (keep max 30)
      setHistory(prev => {
        const next = [...prev, {
          time: res.timestamp,
          label: res.label,
          confidence: res.confidence,
          rms: res.rms
        }];
        return next.slice(-30);
      });

    } catch (e: any) {
      console.warn('Live predict error:', e);
    } finally {
      isPredictingRef.current = false;
    }
  }, [playAlarmAudio]);

  // Start Real-Time Monitoring
  const startMonitoring = async () => {
    setErrorMsg(null);
    setElapsedSec(0);
    setHistory([]);
    setTotalChecks(0);
    setNoisyChecks(0);
    setPeakRms(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1
        }
      });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: TARGET_SR
      });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const buf = audioBufferRef.current;
        let wIdx = bufferWriteIdx.current;

        for (let i = 0; i < inputData.length; i++) {
          buf[wIdx] = inputData[i];
          wIdx = (wIdx + 1) % BUFFER_LEN;
        }
        bufferWriteIdx.current = wIdx;
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);

      setIsActive(true);

      animFrameRef.current = requestAnimationFrame(drawOscilloscope);

      stopwatchTimerRef.current = window.setInterval(() => {
        setElapsedSec(prev => prev + 1);
      }, 1000);

      rollingTimerRef.current = window.setInterval(() => {
        sendLivePrediction();
      }, 1000);

    } catch (err: any) {
      console.error('Failed to start live mic:', err);
      setErrorMsg('Gagal mengakses mikrofon. Pastikan Anda memberikan izin akses mikrofon pada peramban.');
    }
  };

  const stopMonitoring = () => {
    setIsActive(false);
    forceStopAlarm();

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (rollingTimerRef.current) clearInterval(rollingTimerRef.current);
    if (stopwatchTimerRef.current) clearInterval(stopwatchTimerRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
    }
  };

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const isNoisy = liveData?.label === 'berisik';
  const noisePercent = liveData
    ? Math.round((liveData.probabilities.berisik !== undefined ? liveData.probabilities.berisik : (liveData.label === 'berisik' ? liveData.confidence : 1 - liveData.confidence)) * 100)
    : 0;

  const noisyPct = totalChecks > 0 ? Math.round((noisyChecks / totalChecks) * 100) : 0;
  const quietPct = totalChecks > 0 ? 100 - noisyPct : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Control Card Header */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: `1px solid ${
          activeAlarmLevel === 'high' ? 'rgba(239, 68, 68, 0.8)' :
          activeAlarmLevel === 'medium' ? 'var(--accent-noisy-border)' :
          isActive ? 'var(--accent-quiet-border)' : 'var(--border-subtle)'
        }`,
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative',
        boxShadow: activeAlarmLevel === 'high' ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'none',
        transition: 'border-color 0.3s, box-shadow 0.3s'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: isActive ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-surface-elevated)',
                color: isActive ? '#EF4444' : 'var(--text-muted)',
                border: `1px solid ${isActive ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)'}`,
                fontFamily: 'var(--font-mono)'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isActive ? '#EF4444' : 'var(--text-muted)',
                  display: 'inline-block'
                }} />
                {isActive ? 'MONITORING AKTIF' : 'STANDBY'}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Durasi: {formatSec(elapsedSec)}
              </span>
            </div>

            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginTop: '6px'
            }}>
              Deteksi Kebisingan Real-Time (Mikrofon Laptop)
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '640px' }}>
              Mikrofon laptop mendeteksi suara ruangan secara terus-menerus. Suara alarm diputar utuh tanpa tumpang tindih (*non-overlapping*) sesuai persentase kebisingan.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => {
                const nextState = !audioAlert;
                setAudioAlert(nextState);
                if (!nextState) forceStopAlarm();
              }}
              title={audioAlert ? 'Matikan Notifikasi Alarm' : 'Aktifkan Notifikasi Alarm'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: audioAlert ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-surface-elevated)',
                border: `1px solid ${audioAlert ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)'}`,
                color: audioAlert ? '#EF4444' : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              {audioAlert ? <Bell size={16} /> : <BellOff size={16} />}
              <span>{audioAlert ? 'Alarm Suara: AKTIF' : 'Alarm: NON-AKTIF'}</span>
            </button>

            {!isActive ? (
              <button
                onClick={startMonitoring}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--accent-quiet)',
                  color: '#0B0F14',
                  fontWeight: 700,
                  fontSize: '15px',
                  boxShadow: '0 4px 14px rgba(34, 211, 197, 0.25)'
                }}
              >
                <Play size={18} fill="#0B0F14" />
                <span>Mulai Monitoring</span>
              </button>
            ) : (
              <button
                onClick={stopMonitoring}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--accent-noisy)',
                  color: '#0B0F14',
                  fontWeight: 700,
                  fontSize: '15px',
                  boxShadow: '0 4px 14px rgba(255, 107, 53, 0.25)'
                }}
              >
                <Square size={18} fill="#0B0F14" />
                <span>Hentikan Monitoring</span>
              </button>
            )}
          </div>
        </div>

        {/* ALARM SYSTEM CONTROL & PREVIEW STRIP */}
        <div style={{
          backgroundColor: 'var(--bg-canvas)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Status Ambang Alarm:
            </span>

            {/* Threshold Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              <span style={{
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: activeAlarmLevel === 'medium' ? 'var(--accent-noisy-bg)' : 'rgba(255,255,255,0.04)',
                color: activeAlarmLevel === 'medium' ? 'var(--accent-noisy)' : 'var(--text-secondary)',
                border: `1px solid ${activeAlarmLevel === 'medium' ? 'var(--accent-noisy-border)' : 'var(--border-subtle)'}`,
                fontWeight: activeAlarmLevel === 'medium' ? 700 : 500
              }}>
                70% - 90%: alarm_70-90%.mp3 {activeAlarmLevel === 'medium' ? '● MEMBUNYI' : ''}
              </span>

              <span style={{
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: activeAlarmLevel === 'high' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.04)',
                color: activeAlarmLevel === 'high' ? '#EF4444' : 'var(--text-secondary)',
                border: `1px solid ${activeAlarmLevel === 'high' ? 'rgba(239, 68, 68, 0.5)' : 'var(--border-subtle)'}`,
                fontWeight: activeAlarmLevel === 'high' ? 700 : 500
              }}>
                ≥ 90%: alarm_90-100%.mp3 {activeAlarmLevel === 'high' ? '🚨 MEMBUNYI' : ''}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Alarm Volume Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Vol Alarm:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={alarmVolume}
                onChange={(e) => setAlarmVolume(parseFloat(e.target.value))}
                style={{ width: '60px', accentColor: '#EF4444', cursor: 'pointer' }}
                title={`Volume Alarm: ${Math.round(alarmVolume * 100)}%`}
              />
            </div>

            {/* Test Sound Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Uji Suara:</span>
              <button
                onClick={() => handleTestAlarm('medium')}
                disabled={activeAlarmLevel !== 'none'}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--accent-noisy)',
                  fontWeight: 600,
                  opacity: activeAlarmLevel !== 'none' ? 0.5 : 1,
                  cursor: activeAlarmLevel !== 'none' ? 'not-allowed' : 'pointer'
                }}
              >
                {testingAlarm === 'medium' ? 'Memutar...' : '▶ Uji 70-90%'}
              </button>
              <button
                onClick={() => handleTestAlarm('high')}
                disabled={activeAlarmLevel !== 'none'}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: '#EF4444',
                  fontWeight: 600,
                  opacity: activeAlarmLevel !== 'none' ? 0.5 : 1,
                  cursor: activeAlarmLevel !== 'none' ? 'not-allowed' : 'pointer'
                }}
              >
                {testingAlarm === 'high' ? 'Memutar...' : '▶ Uji ≥90%'}
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-danger-bg)',
            color: 'var(--accent-danger)',
            fontSize: '13px'
          }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Live Large Status Display */}
        {isActive && liveData && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            backgroundColor: 'var(--bg-canvas)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            border: `1px solid ${activeAlarmLevel === 'high' ? 'rgba(239, 68, 68, 0.6)' : activeAlarmLevel === 'medium' ? 'var(--accent-noisy-border)' : 'var(--border-subtle)'}`
          }}>
            {/* Status Class */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: noisePercent >= 90 ? 'rgba(239, 68, 68, 0.2)' : isNoisy ? 'var(--accent-noisy-bg)' : 'var(--accent-quiet-bg)',
                color: noisePercent >= 90 ? '#EF4444' : isNoisy ? 'var(--accent-noisy)' : 'var(--accent-quiet)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${noisePercent >= 90 ? 'rgba(239, 68, 68, 0.6)' : isNoisy ? 'var(--accent-noisy-border)' : 'var(--accent-quiet-border)'}`,
                flexShrink: 0
              }}>
                {isNoisy ? <Volume2 size={30} /> : <VolumeX size={30} />}
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Klasifikasi Saat Ini
                </span>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '28px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: noisePercent >= 90 ? '#EF4444' : isNoisy ? 'var(--accent-noisy)' : 'var(--accent-quiet)',
                  lineHeight: 1.1
                }}>
                  {liveData.label_display} ({noisePercent}%)
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {liveData.status_text}
                </span>
              </div>
            </div>

            {/* Keyakinan & RMS */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Peluang Kebisingan:</span>
                <strong style={{
                  fontFamily: 'var(--font-mono)',
                  color: noisePercent >= 90 ? '#EF4444' : noisePercent >= 70 ? 'var(--accent-noisy)' : 'var(--text-primary)'
                }}>
                  {noisePercent}% {activeAlarmLevel === 'high' ? '(Alarm 90-100% Membunyi)' : activeAlarmLevel === 'medium' ? '(Alarm 70-90% Membunyi)' : ''}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Volume Sinyal (RMS):</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {liveData.rms.toFixed(4)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pusat Frekuensi:</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {Math.round(liveData.centroid_hz)} Hz
                </strong>
              </div>
            </div>

            {/* Probabilities Mini Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--accent-noisy)', fontWeight: 600 }}>
                  Berisik: {Math.round(liveData.probabilities.berisik * 100)}%
                </span>
                <span style={{ color: 'var(--accent-quiet)', fontWeight: 600 }}>
                  Sepi: {Math.round(liveData.probabilities['non-berisik'] * 100)}%
                </span>
              </div>
              <div style={{
                height: '8px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex'
              }}>
                <div style={{ width: `${liveData.probabilities.berisik * 100}%`, backgroundColor: 'var(--accent-noisy)' }} />
                <div style={{ width: `${liveData.probabilities['non-berisik'] * 100}%`, backgroundColor: 'var(--accent-quiet)' }} />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                Diperbarui: {liveData.timestamp}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Oscilloscope Canvas */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--accent-quiet)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Oskiloskop Sinyal Suara Langsung (60 FPS)
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Resolusi: 22.050 Hz • 2048 Sampel Jendela
          </span>
        </div>

        <canvas
          ref={canvasRef}
          width={1000}
          height={160}
          style={{
            width: '100%',
            height: '160px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'block'
          }}
        />
      </div>

      {/* Real-Time Rolling History Chart (30-second seismograph) */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Linimasa Riwayat Kebisingan (30 Detik Terakhir)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Merah = Bahaya (≥90%), Oranye = Peringatan (70-90%), Toska = Tenang (&lt;70%).
            </p>
          </div>
          {isActive && (
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--accent-noisy)' }}>● Berisik: {noisyPct}%</span>
              <span style={{ color: 'var(--accent-quiet)' }}>● Tenang: {quietPct}%</span>
            </div>
          )}
        </div>

        <canvas
          ref={historyCanvasRef}
          width={900}
          height={110}
          style={{
            width: '100%',
            height: '110px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'block'
          }}
        />
      </div>

      {/* Session Cumulative Summary Stats */}
      {isActive && totalChecks > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Pengecekan
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px' }}>
              {totalChecks} detik
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Dominasi Berisik
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-noisy)', marginTop: '2px' }}>
              {noisyChecks} dtk ({noisyPct}%)
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Dominasi Tenang
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-quiet)', marginTop: '2px' }}>
              {totalChecks - noisyChecks} dtk ({quietPct}%)
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Puncak Volume (Peak RMS)
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px' }}>
              {peakRms.toFixed(4)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
