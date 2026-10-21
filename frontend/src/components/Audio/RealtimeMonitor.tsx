import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Square,
  Activity,
  Volume2,
  VolumeX,
  AlertTriangle,
  Bell,
  BellOff,
  Radio,
  FolderOpen,
  BookOpen,
  Zap,
  Sliders,
  CheckCircle2,
  Clock
} from 'lucide-react';
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

interface RealtimeMonitorProps {
  viewMode: 'realtime' | 'file';
  onSwitchMode: (mode: 'realtime' | 'file') => void;
}

export const RealtimeMonitor: React.FC<RealtimeMonitorProps> = ({ viewMode, onSwitchMode }) => {
  const navigate = useNavigate();

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

  // Standby arrhythmia phase
  const idlePhaseRef = useRef<number>(0);

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

      // Check noise condition after finish
      if (isActiveRef.current && audioAlertRef.current) {
        const curPct = latestNoisePercentRef.current;
        if (curPct >= 90) {
          playAlarmAudio('high');
        } else if (curPct >= 70) {
          playAlarmAudio('medium');
        }
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

  // 60 FPS Oscilloscope Drawing: Layered Waveform + Standby Arrhythmia
  const drawOscilloscope = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    // 1. Dark Scientific Background
    ctx.fillStyle = '#040D12';
    ctx.fillRect(0, 0, width, height);

    // 2. Technical Lab Grid Lines
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.08)';
    ctx.lineWidth = 1;
    const gridCols = 16;
    const gridRows = 8;
    for (let c = 1; c < gridCols; c++) {
      const gx = (c / gridCols) * width;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let r = 1; r < gridRows; r++) {
      const gy = (r / gridRows) * height;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }

    // Prominent Centerline & Division Crosshairs
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.22)';
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    const analyser = analyserRef.current;

    if (isActive && analyser) {
      // ===== ACTIVE MIC MODE =====
      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);
      analyser.getFloatTimeDomainData(dataArray);

      // Determine Dynamic Stroke Color
      let strokeColor = '#14B8A6'; // Calm Cyan/Teal
      if (activeAlarmLevel === 'high') {
        strokeColor = '#EF4444'; // Red for >=90%
      } else if (activeAlarmLevel === 'medium') {
        strokeColor = '#F97316'; // Amber for 70-90%
      } else if (liveData?.label === 'berisik') {
        strokeColor = '#F97316';
      }

      // Layer 1: Faint Secondary Shadow/Wave
      ctx.strokeStyle = strokeColor === '#EF4444' ? 'rgba(239, 68, 68, 0.25)' : strokeColor === '#F97316' ? 'rgba(249, 115, 22, 0.25)' : 'rgba(20, 184, 166, 0.25)';
      ctx.lineWidth = 1.0;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      const sliceWidthSec = width / bufferLength;
      let xSec = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i];
        const y = centerY + v * (height * 0.48);
        if (i === 0) ctx.moveTo(xSec, y);
        else ctx.lineTo(xSec, y);
        xSec += sliceWidthSec;
      }
      ctx.stroke();

      // Layer 2: Main Vibrant Glowing Oscilloscope Line
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.4;
      ctx.shadowBlur = 10;
      ctx.shadowColor = strokeColor;
      ctx.beginPath();
      const sliceWidth = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i];
        const y = centerY + v * (height * 0.42);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

    } else {
      // ===== STANDBY IDLE MODE: Smooth Arrhythmia / Sine Ripple =====
      idlePhaseRef.current += 0.035;
      const phase = idlePhaseRef.current;

      // Layer 1: Ambient Faint Echo Wave
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      for (let x = 0; x < width; x += 4) {
        const normX = x / width;
        // Periodic heartbeat ripple packet
        const packet = Math.sin((normX * 8 - phase * 0.5) % Math.PI);
        const y = centerY + Math.sin(x * 0.015 + phase) * 8 + (packet > 0.7 ? Math.sin(normX * 60) * 16 : 0);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Layer 2: Primary Standby Oscilloscope Wave
      ctx.strokeStyle = '#14B8A6';
      ctx.lineWidth = 2.0;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#14B8A6';
      ctx.beginPath();
      for (let x = 0; x < width; x += 3) {
        const normX = x / width;
        // Arrhythmia pulse modulated across time
        const pulse = Math.exp(-Math.pow(((normX * 5 - (phase % 5)) * 4), 2)) * 32;
        const wave = Math.sin(x * 0.02 + phase) * 6;
        const y = centerY + wave + pulse;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    animFrameRef.current = requestAnimationFrame(drawOscilloscope);
  }, [isActive, liveData, activeAlarmLevel]);

  // Always keep oscilloscope animation loop running (for standby arrhythmia and active mic)
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(drawOscilloscope);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawOscilloscope]);

  // Draw Rolling History Chart: Multi-stop Threshold Spline Area Chart (30 Sec)
  useEffect(() => {
    const canvas = historyCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padTop = 16;
    const padBottom = 22;
    const chartHeight = height - padTop - padBottom;

    // 1. Dark Canvas Background
    ctx.fillStyle = '#040D12';
    ctx.fillRect(0, 0, width, height);

    // 2. Technical Grid & Time Threshold Lines
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.08)';
    ctx.lineWidth = 1;
    // 5-second vertical subdivision grids
    for (let s = 0; s <= 6; s++) {
      const gx = (s / 6) * (width - 40) + 20;
      ctx.beginPath();
      ctx.moveTo(gx, padTop);
      ctx.lineTo(gx, height - padBottom);
      ctx.stroke();
    }

    // Danger Threshold Line (>=90%)
    const yDanger = padTop + (1 - 0.90) * chartHeight;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, yDanger);
    ctx.lineTo(width - 20, yDanger);
    ctx.stroke();

    // Warning Threshold Line (70%)
    const yWarn = padTop + (1 - 0.70) * chartHeight;
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
    ctx.beginPath();
    ctx.moveTo(20, yWarn);
    ctx.lineTo(width - 20, yWarn);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Threshold labels on right
    ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('90% BAHAYA', width - 24, yDanger - 3);

    ctx.fillStyle = 'rgba(249, 115, 22, 0.7)';
    ctx.fillText('70% WASPADA', width - 24, yWarn - 3);

    if (history.length === 0) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Menunggu aliran evaluasi suara per detik...', width / 2, height / 2 + 2);
      return;
    }

    // 3. Compute Coordinates for 30 Data Points
    const maxPoints = 30;
    const startX = 20;
    const endX = width - 20;
    const stepX = (endX - startX) / (maxPoints - 1);

    const points = history.map((pt, idx) => {
      // Offset so the latest point aligns to the right edge of currently recorded items
      const x = startX + idx * stepX;
      const isNoisy = pt.label === 'berisik';
      const pct = isNoisy ? pt.confidence : 1 - pt.confidence;
      const y = padTop + (1 - Math.max(0, Math.min(1, pct))) * chartHeight;
      return { x, y, pct, isNoisy, pt };
    });

    if (points.length === 1) {
      // Single point indicator
      const p = points[0];
      ctx.fillStyle = p.pct >= 0.9 ? '#EF4444' : p.pct >= 0.7 ? '#F97316' : '#14B8A6';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // 4. Draw Smooth Spline Area Fill (Multi-stop Vertical Gradient)
    const areaGrad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    areaGrad.addColorStop(0.0, 'rgba(239, 68, 68, 0.40)');    // Danger peak
    areaGrad.addColorStop(0.3, 'rgba(249, 115, 22, 0.28)');    // Warning zone
    areaGrad.addColorStop(0.7, 'rgba(20, 184, 166, 0.18)');    // Normal zone
    areaGrad.addColorStop(1.0, 'rgba(20, 184, 166, 0.02)');    // Base

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    // Close area downward
    ctx.lineTo(points[points.length - 1].x, height - padBottom);
    ctx.lineTo(points[0].x, height - padBottom);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // 5. Draw Smooth Stroke Curve (Layered Gradient Stroke)
    const lineGrad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    lineGrad.addColorStop(0.0, '#EF4444');
    lineGrad.addColorStop(0.3, '#F97316');
    lineGrad.addColorStop(0.7, '#14B8A6');
    lineGrad.addColorStop(1.0, '#10B981');

    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2.6;
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(20, 184, 166, 0.5)';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 6. Data Dots & Pulse on Latest Point
    points.forEach((p, idx) => {
      const isLatest = idx === points.length - 1;
      const dotColor = p.pct >= 0.9 ? '#EF4444' : p.pct >= 0.7 ? '#F97316' : '#14B8A6';

      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isLatest ? 4.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (isLatest) {
        ctx.strokeStyle = dotColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

  }, [history]);

  // Send 3-second rolling buffer to backend
  const sendLivePrediction = useCallback(async () => {
    if (isPredictingRef.current) return;
    isPredictingRef.current = true;

    try {
      // Circular buffer unpack
      const ordered = new Float32Array(BUFFER_LEN);
      const writeIdx = bufferWriteIdx.current;
      ordered.set(audioBufferRef.current.subarray(writeIdx));
      ordered.set(audioBufferRef.current.subarray(0, writeIdx), BUFFER_LEN - writeIdx);

      const wavBlob = encodeWAV(ordered, TARGET_SR);
      const res = await predictLiveAudio(wavBlob);
      setErrorMsg(null);
      setLiveData(res);

      const noiseProb = res.probabilities.berisik !== undefined
        ? res.probabilities.berisik
        : (res.label === 'berisik' ? res.confidence : 1 - res.confidence);
      const noisePercent = Math.round(noiseProb * 100);
      latestNoisePercentRef.current = noisePercent;

      // Trigger alarm with strict atomic lock
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

      // Append to history
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
      setErrorMsg('Gagal terhubung ke backend (port 8080). Pastikan server backend uvicorn sedang berjalan.');
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

      stopwatchTimerRef.current = window.setInterval(() => {
        setElapsedSec(prev => prev + 1);
      }, 1000);

      rollingTimerRef.current = window.setInterval(() => {
        sendLivePrediction();
      }, 1000);

    } catch (err: any) {
      console.error('Failed to start live mic:', err);
      setErrorMsg('Gagal mengakses mikrofon. Pastikan izin akses mikrofon diizinkan di peramban.');
    }
  };

  const stopMonitoring = () => {
    setIsActive(false);
    forceStopAlarm();

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* ============================================================== */}
      {/* 1. SPLIT HERO LAYOUT: HERO INTRO (LEFT) + CONTROL CARD (RIGHT) */}
      {/* ============================================================== */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 1.15fr) minmax(340px, 1fr)',
        gap: '28px',
        alignItems: 'stretch'
      }}>
        {/* SISI KIRI: HERO INTRO */}
        <div className="glass-card" style={{
          padding: '36px 32px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: '1px solid rgba(45, 212, 191, 0.22)'
        }}>
          {/* Subtle Ambient Soundwave Background Ripple */}
          <div style={{
            position: 'absolute',
            right: '-10%',
            bottom: '-15%',
            width: '320px',
            height: '320px',
            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Academic Tag */}
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
                PENGOLAHAN SINYAL DIGITAL • RANDOM FOREST
              </span>
            </div>

            {/* Main Bold Headline with Teal to Cyan Gradient */}
            <h1 style={{
              fontSize: '40px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15
            }}>
              Analisis Kebisingan <br />
              <span className="text-gradient-teal">Lingkungan Kerja</span>
            </h1>

            {/* Concise Description */}
            <p style={{
              color: '#94A3B8',
              fontSize: '15px',
              lineHeight: 1.6,
              maxWidth: '540px'
            }}>
              Sistem inspeksi audio cerdas berbasis ekstraksi 10 fitur spektral digital dan klasifikasi model Machine Learning untuk deteksi tingkat kenyamanan akustik kerja secara instan dan tanpa jeda.
            </p>

            {/* 2 CTA Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '12px' }}>
              <button
                onClick={() => {
                  if (!isActive) {
                    startMonitoring();
                  }
                  const el = document.getElementById('control-card-panel');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
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
                  boxShadow: '0 4px 20px rgba(20, 184, 166, 0.35)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <Radio size={18} />
                <span>Mulai Deteksi Sekarang</span>
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
                  fontWeight: 600,
                  transition: 'background-color 0.15s ease'
                }}
              >
                <BookOpen size={16} color="#2DD4BF" />
                <span>Pelajari Fitur</span>
              </button>
            </div>
          </div>

          {/* Feature Badge Highlights */}
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
              <span>Oskiloskop 60 FPS</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} color="#14B8A6" />
              <span>Alarm Ganda (70% & 90%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} color="#14B8A6" />
              <span>10 Bobot Spektral MDI</span>
            </div>
          </div>
        </div>

        {/* SISI KANAN: CONTROL CARD */}
        <div id="control-card-panel" className="glass-card" style={{
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '20px',
          border: `1px solid ${
            activeAlarmLevel === 'high' ? 'rgba(239, 68, 68, 0.8)' :
            activeAlarmLevel === 'medium' ? 'rgba(249, 115, 22, 0.7)' :
            isActive ? 'rgba(45, 212, 191, 0.5)' : 'rgba(45, 212, 191, 0.2)'
          }`,
          boxShadow: activeAlarmLevel === 'high' ? '0 0 30px rgba(239, 68, 68, 0.3)' : 'var(--glass-shadow)',
          transition: 'all 0.3s ease'
        }}>
          {/* Top Bar: View Mode Switcher + Status Badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            {/* Mode Switcher */}
            <div style={{
              display: 'flex',
              backgroundColor: 'rgba(7, 22, 31, 0.85)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(45, 212, 191, 0.2)',
              gap: '4px'
            }}>
              <button
                onClick={() => onSwitchMode('realtime')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: viewMode === 'realtime' ? '#14B8A6' : 'transparent',
                  color: viewMode === 'realtime' ? '#040D12' : '#94A3B8',
                  transition: 'all 0.15s ease'
                }}
              >
                <Radio size={14} />
                <span>Deteksi Real-Time</span>
              </button>

              <button
                onClick={() => onSwitchMode('file')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: viewMode === 'file' ? '#14B8A6' : 'transparent',
                  color: viewMode === 'file' ? '#040D12' : '#94A3B8',
                  transition: 'all 0.15s ease'
                }}
              >
                <FolderOpen size={14} />
                <span>Analisis Berkas / Sampel</span>
              </button>
            </div>

            {/* Standby / Monitoring Badge + Elapsed Duration */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: isActive ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                color: isActive ? '#EF4444' : '#94A3B8',
                border: `1px solid ${isActive ? 'rgba(239, 68, 68, 0.45)' : 'rgba(255, 255, 255, 0.1)'}`,
                fontFamily: 'var(--font-mono)'
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isActive ? '#EF4444' : '#94A3B8',
                  display: 'inline-block'
                }} />
                {isActive ? 'MONITORING' : 'STANDBY'}
              </span>

              <span style={{
                fontSize: '12px',
                color: '#94A3B8',
                fontFamily: 'var(--font-mono)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Clock size={13} />
                {formatSec(elapsedSec)}
              </span>
            </div>
          </div>

          {/* Main Action Strip: Toggle Alarm + Primary Start/Stop Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                const nextState = !audioAlert;
                setAudioAlert(nextState);
                if (!nextState) forceStopAlarm();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: audioAlert ? 'rgba(239, 68, 68, 0.15)' : 'rgba(15, 46, 65, 0.65)',
                border: `1px solid ${audioAlert ? 'rgba(239, 68, 68, 0.45)' : 'rgba(45, 212, 191, 0.2)'}`,
                color: audioAlert ? '#EF4444' : '#94A3B8',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
            >
              {audioAlert ? <Bell size={16} /> : <BellOff size={16} />}
              <span>{audioAlert ? 'Alarm Suara: AKTIF' : 'Alarm: MATI'}</span>
            </button>

            {!isActive ? (
              <button
                onClick={startMonitoring}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #14B8A6 0%, #06B6D4 100%)',
                  color: '#040D12',
                  fontWeight: 700,
                  fontSize: '15px',
                  boxShadow: '0 4px 18px rgba(20, 184, 166, 0.35)',
                  minWidth: '200px'
                }}
              >
                <Play size={18} fill="#040D12" />
                <span>Mulai Monitoring</span>
              </button>
            ) : (
              <button
                onClick={stopMonitoring}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '15px',
                  boxShadow: '0 4px 18px rgba(239, 68, 68, 0.35)',
                  minWidth: '200px'
                }}
              >
                <Square size={18} fill="#FFFFFF" />
                <span>Hentikan Monitoring</span>
              </button>
            )}
          </div>

          {/* Alarm Status & Testing Strip */}
          <div style={{
            backgroundColor: 'rgba(7, 22, 31, 0.75)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            border: '1px solid rgba(45, 212, 191, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Threshold Chips */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#F0FDFA' }}>
                Status Ambang Alarm:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeAlarmLevel === 'medium' ? 'rgba(249, 115, 22, 0.25)' : 'rgba(249, 115, 22, 0.10)',
                  border: `1px solid ${activeAlarmLevel === 'medium' ? 'rgba(249, 115, 22, 0.7)' : 'rgba(249, 115, 22, 0.3)'}`,
                  color: '#F97316',
                  fontWeight: activeAlarmLevel === 'medium' ? 700 : 500
                }}>
                  70% - 90%: alarm_70-90%.mp3 {activeAlarmLevel === 'medium' ? '● AKTIF' : ''}
                </span>

                <span style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeAlarmLevel === 'high' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.10)',
                  border: `1px solid ${activeAlarmLevel === 'high' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: '#EF4444',
                  fontWeight: activeAlarmLevel === 'high' ? 700 : 500
                }}>
                  ≥ 90%: alarm_90-100%.mp3 {activeAlarmLevel === 'high' ? '🚨 AKTIF' : ''}
                </span>
              </div>
            </div>

            {/* Slider & Test Audio Buttons */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(45, 212, 191, 0.1)'
            }}>
              {/* Volume Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={13} color="#94A3B8" />
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>Vol Alarm:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={alarmVolume}
                  onChange={(e) => setAlarmVolume(parseFloat(e.target.value))}
                  style={{ width: '70px', accentColor: '#14B8A6', cursor: 'pointer' }}
                  title={`Volume: ${Math.round(alarmVolume * 100)}%`}
                />
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#2DD4BF', width: '28px' }}>
                  {Math.round(alarmVolume * 100)}%
                </span>
              </div>

              {/* Test Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>Uji:</span>
                <button
                  onClick={() => handleTestAlarm('medium')}
                  disabled={activeAlarmLevel !== 'none'}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(249, 115, 22, 0.12)',
                    border: '1px solid rgba(249, 115, 22, 0.35)',
                    color: '#F97316',
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
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
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

          {/* Error Message */}
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#EF4444',
              fontSize: '13px'
            }}>
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Active Live Result Mini Status */}
          {isActive && liveData && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '14px',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(7, 22, 31, 0.90)',
              border: `1px solid ${noisePercent >= 90 ? 'rgba(239, 68, 68, 0.6)' : isNoisy ? 'rgba(249, 115, 22, 0.5)' : 'rgba(20, 184, 166, 0.4)'}`
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: noisePercent >= 90 ? 'rgba(239, 68, 68, 0.2)' : isNoisy ? 'rgba(249, 115, 22, 0.2)' : 'rgba(20, 184, 166, 0.2)',
                color: noisePercent >= 90 ? '#EF4444' : isNoisy ? '#F97316' : '#14B8A6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${noisePercent >= 90 ? 'rgba(239, 68, 68, 0.6)' : isNoisy ? 'rgba(249, 115, 22, 0.6)' : 'rgba(20, 184, 166, 0.6)'}`
              }}>
                {isNoisy ? <Volume2 size={22} /> : <VolumeX size={22} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-display)',
                    color: noisePercent >= 90 ? '#EF4444' : isNoisy ? '#F97316' : '#14B8A6'
                  }}>
                    {liveData.label_display} ({noisePercent}%)
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>
                    RMS: {liveData.rms.toFixed(4)} • {Math.round(liveData.centroid_hz)} Hz
                  </span>
                </div>
                <div style={{
                  height: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  display: 'flex',
                  marginTop: '6px'
                }}>
                  <div style={{ width: `${liveData.probabilities.berisik * 100}%`, backgroundColor: '#F97316' }} />
                  <div style={{ width: `${liveData.probabilities['non-berisik'] * 100}%`, backgroundColor: '#14B8A6' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. BAGIAN BAWAH: 2 KOLOM SEJAJAR PADA DESKTOP                  */}
      {/* ============================================================== */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '24px'
      }}>
        {/* KOLOM KIRI: OSKILOSKOP SINYAL SUARA LANGSUNG (60 FPS) */}
        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(20, 184, 166, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2DD4BF'
              }}>
                <Activity size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F0FDFA' }}>
                  Oskiloskop Sinyal Suara Langsung (60 FPS)
                </h3>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                  {isActive ? 'Visualisasi mikrofon aktif real-time' : 'Animasi ritme standby laboratorium'}
                </span>
              </div>
            </div>

            <span style={{
              fontSize: '11px',
              color: '#5EEAD4',
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'rgba(7, 22, 31, 0.7)',
              padding: '4px 10px',
              borderRadius: '9999px',
              border: '1px solid rgba(45, 212, 191, 0.2)'
            }}>
              Resolusi: 22.050 Hz • 2048 Sampel Jendela
            </span>
          </div>

          <canvas
            ref={canvasRef}
            width={900}
            height={220}
            style={{
              width: '100%',
              height: '220px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(45, 212, 191, 0.2)',
              display: 'block'
            }}
          />
        </div>

        {/* KOLOM KANAN: LINIMASA RIWAYAT KEBISINGAN (30 DETIK TERAKHIR) */}
        <div className="glass-card" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F0FDFA' }}>
                Linimasa Riwayat Kebisingan (30 Detik Terakhir)
              </h3>
              <p style={{ fontSize: '11px', color: '#94A3B8' }}>
                Grafik area mulus kurva spline intensitas suara temporal.
              </p>
            </div>

            {/* Color Legend */}
            <div style={{
              display: 'flex',
              gap: '12px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'rgba(7, 22, 31, 0.7)',
              padding: '4px 10px',
              borderRadius: '9999px',
              border: '1px solid rgba(45, 212, 191, 0.2)'
            }}>
              <span style={{ color: '#EF4444', fontWeight: 600 }}>● Bahaya (≥90%)</span>
              <span style={{ color: '#F97316', fontWeight: 600 }}>● Waspada (70-90%)</span>
              <span style={{ color: '#14B8A6', fontWeight: 600 }}>● Tenang (&lt;70%)</span>
            </div>
          </div>

          <canvas
            ref={historyCanvasRef}
            width={900}
            height={220}
            style={{
              width: '100%',
              height: '220px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(45, 212, 191, 0.2)',
              display: 'block'
            }}
          />
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. SESSION CUMULATIVE SUMMARY STATS                            */}
      {/* ============================================================== */}
      {isActive && totalChecks > 0 && (
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Durasi Evaluasi
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F0FDFA', marginTop: '4px' }}>
              {totalChecks} detik
            </div>
          </div>

          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Dominasi Suara Berisik
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F97316', marginTop: '4px' }}>
              {noisyChecks} dtk ({noisyPct}%)
            </div>
          </div>

          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Dominasi Suara Tenang
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#14B8A6', marginTop: '4px' }}>
              {totalChecks - noisyChecks} dtk ({quietPct}%)
            </div>
          </div>

          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Puncak Volume (Peak RMS)
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#2DD4BF', marginTop: '4px' }}>
              {peakRms.toFixed(4)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
