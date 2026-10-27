import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Square,
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  Radio,
  FolderOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import { predictLiveAudio } from '../../services/api';
import { saveHistoryItem, createLiveSessionHistoryItem } from '../../services/history';
import type { LivePredictResponse, LiveHistoryPoint } from '../../types/api';
import { encodeWAV } from '../../utils/wavEncoder';

// 3-second circular audio buffer (at 22050 Hz = 66150 samples)
const TARGET_SR = 22050;
const BUFFER_LEN = TARGET_SR * 3;

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

  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  // Interval delay state for prediction (in seconds: 1, 3, or 5)
  const [intervalSec, setIntervalSec] = useState<number>(1);

  // Ambient noise calibration states: 'default' (system baseline) or 'custom' (measured 3s via mic)
  const [calibrationMode, setCalibrationMode] = useState<'default' | 'custom'>(() => {
    const savedMode = localStorage.getItem('soundlab_calibration_mode');
    if (savedMode === 'default' || savedMode === 'custom') return savedMode;
    const saved = localStorage.getItem('soundlab_ambient_baseline');
    return saved && parseFloat(saved) > 0 ? 'custom' : 'default';
  });

  const [ambientBaselineRms, setAmbientBaselineRms] = useState<number>(() => {
    const savedMode = localStorage.getItem('soundlab_calibration_mode');
    if (savedMode === 'default') return 0;
    const saved = localStorage.getItem('soundlab_ambient_baseline');
    return saved ? parseFloat(saved) : 0;
  });
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationCount, setCalibrationCount] = useState<number>(3);
  const [calibrationNotice, setCalibrationNotice] = useState<string | null>(null);

  const ambientBaselineRmsRef = useRef<number>(ambientBaselineRms);
  useEffect(() => {
    ambientBaselineRmsRef.current = ambientBaselineRms;
  }, [ambientBaselineRms]);

  // Cumulative statistics
  const [totalChecks, setTotalChecks] = useState<number>(0);
  const [noisyChecks, setNoisyChecks] = useState<number>(0);
  const [peakRms, setPeakRms] = useState<number>(0);

  // UI state toggles
  const [envInfoOpen, setEnvInfoOpen] = useState<boolean>(true);
  const [opInfoOpen, setOpInfoOpen] = useState<boolean>(false);
  const [rawOscilloscopeOpen, setRawOscilloscopeOpen] = useState<boolean>(false);

  // Canvas references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const eqCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Audio streams and nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const rollingTimerRef = useRef<number | null>(null);
  const stopwatchTimerRef = useRef<number | null>(null);

  // Standby phase
  const idlePhaseRef = useRef<number>(0);

  // STRICT SINGLE-PLAYBACK ATOMIC ALARM LOCK
  const isAlarmPlayingRef = useRef<boolean>(false);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAlarmTypeRef = useRef<'medium' | 'high' | null>(null);
  const latestNoisePercentRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(false);
  const audioAlertRef = useRef<boolean>(true);
  const playAlarmAudioRef = useRef<(type: 'medium' | 'high') => void>(() => {});

  // Sync refs for auto-saving on stop
  const elapsedSecRef = useRef<number>(0);
  const totalChecksRef = useRef<number>(0);
  const noisyChecksRef = useRef<number>(0);
  const peakRmsRef = useRef<number>(0);
  const realRmsSumRef = useRef<number>(0);
  const historyRef = useRef<LiveHistoryPoint[]>([]);
  const liveDataRef = useRef<LivePredictResponse | null>(null);

  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { audioAlertRef.current = audioAlert; }, [audioAlert]);
  useEffect(() => { elapsedSecRef.current = elapsedSec; }, [elapsedSec]);
  useEffect(() => { totalChecksRef.current = totalChecks; }, [totalChecks]);
  useEffect(() => { noisyChecksRef.current = noisyChecks; }, [noisyChecks]);
  useEffect(() => { peakRmsRef.current = peakRms; }, [peakRms]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { liveDataRef.current = liveData; }, [liveData]);

  const audioBufferRef = useRef<Float32Array>(new Float32Array(BUFFER_LEN));
  const bufferWriteIdx = useRef<number>(0);
  const isPredictingRef = useRef<boolean>(false);

  // Play alarm sound atomically
  const playAlarmAudio = useCallback((type: 'medium' | 'high') => {
    if (isAlarmPlayingRef.current) return;

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

      // Check if subsequent alarm needed
      if (isActiveRef.current && audioAlertRef.current) {
        const currentPct = latestNoisePercentRef.current;
        if (currentPct >= 90) {
          playAlarmAudioRef.current('high');
        } else if (currentPct >= 70) {
          playAlarmAudioRef.current('medium');
        }
      }
    };

    audio.addEventListener('ended', onAudioFinished, { once: true });
    audio.addEventListener('error', onAudioFinished, { once: true });

    audio.play().catch(e => {
      console.warn('Alarm playback error:', e);
      onAudioFinished();
    });
  }, [alarmVolume]);

  useEffect(() => {
    playAlarmAudioRef.current = playAlarmAudio;
  }, [playAlarmAudio]);

  // Dynamically update active alarm volume if playing
  useEffect(() => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.volume = alarmVolume;
    }
  }, [alarmVolume]);

  const forceStopAlarm = useCallback(() => {
    if (alarmAudioRef.current) {
      try {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
      } catch (e) {
        console.warn(e);
      }
      alarmAudioRef.current = null;
    }
    isAlarmPlayingRef.current = false;
    currentAlarmTypeRef.current = null;
    setActiveAlarmLevel('none');
    setTestingAlarm(null);
  }, []);

  // Cleanup all audio resources on unmount
  useEffect(() => {
    return () => {
      if (rollingTimerRef.current) clearInterval(rollingTimerRef.current);
      if (stopwatchTimerRef.current) clearInterval(stopwatchTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (scriptNodeRef.current) {
        try {
          scriptNodeRef.current.disconnect();
        } catch {}
        scriptNodeRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      forceStopAlarm();
    };
  }, [forceStopAlarm]);

  const handleTestAlarm = (type: 'medium' | 'high') => {
    if (isAlarmPlayingRef.current) return;
    setTestingAlarm(type);
    playAlarmAudio(type);
  };

  // 60 FPS Visualizer Loop (Draws oscilloscope & equalizer bars directly on Canvas)
  useEffect(() => {
    let running = true;

    const render = () => {
      if (!running) return;

      // 1. Equalizer Canvas Rendering (Card 2 - Spektrum Akustik)
      const eqCanvas = eqCanvasRef.current;
      if (eqCanvas) {
        const eqCtx = eqCanvas.getContext('2d');
        if (eqCtx) {
          const w = eqCanvas.width;
          const h = eqCanvas.height;
          eqCtx.clearRect(0, 0, w, h);

          const barsCount = 22;
          const gap = 4;
          const barWidth = Math.floor((w - (barsCount - 1) * gap) / barsCount);

          const barValues: number[] = [];
          if (analyserRef.current && isActiveRef.current) {
            const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(freqData);
            const step = Math.floor(freqData.length / barsCount);
            for (let i = 0; i < barsCount; i++) {
              let sum = 0;
              for (let j = 0; j < step; j++) {
                sum += freqData[i * step + j] || 0;
              }
              const avg = sum / step;
              barValues.push(Math.max(12, Math.min(96, Math.round((avg / 255) * 100))));
            }
          } else {
            idlePhaseRef.current += 0.04;
            const p = idlePhaseRef.current;
            for (let i = 0; i < barsCount; i++) {
              const val = 20 + Math.sin(p + i * 0.35) * 12 + Math.cos(p * 0.7 + i * 0.2) * 8;
              barValues.push(Math.max(10, Math.min(80, Math.round(val))));
            }
          }

          for (let i = 0; i < barsCount; i++) {
            const heightPct = barValues[i];
            const barH = Math.max(6, (heightPct / 100) * (h - 8));
            const x = i * (barWidth + gap);
            const y = (h - barH) / 2; // Symmetrical expansion from horizontal midline

            eqCtx.fillStyle = i > 13 ? '#FFFFFF' : '#D4ED31';
            eqCtx.beginPath();
            if (eqCtx.roundRect) {
              eqCtx.roundRect(x, y, barWidth, barH, barWidth / 2);
            } else {
              eqCtx.rect(x, y, barWidth, barH);
            }
            eqCtx.fill();
          }
        }
      }

      // 2. Oscilloscope Canvas (if expanded)
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // Pure white background with crisp grid
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // Grid lines
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
          ctx.lineWidth = 1;
          for (let x = 0; x < width; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
          for (let y = 0; y < height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          // Center baseline
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, height / 2);
          ctx.lineTo(width, height / 2);
          ctx.stroke();
          ctx.setLineDash([]);

          if (analyserRef.current && isActiveRef.current) {
            const timeData = new Float32Array(analyserRef.current.fftSize);
            analyserRef.current.getFloatTimeDomainData(timeData);

            ctx.strokeStyle = '#FF5C26';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            const sliceWidth = width / timeData.length;
            let x = 0;
            for (let i = 0; i < timeData.length; i++) {
              const v = timeData[i];
              const y = (v * (height / 2.2)) + (height / 2);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
              x += sliceWidth;
            }
            ctx.stroke();
          } else {
            // Idle gentle wave
            ctx.strokeStyle = '#747C6C';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (let x = 0; x < width; x++) {
              const y = (height / 2) + Math.sin(x * 0.02 + idlePhaseRef.current) * 14;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // 30-Second Spline History Chart (Draws clean timeline)
  useEffect(() => {
    const canvas = historyCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padLeft = 40;
    const padRight = 125;
    const padTop = 20;
    const padBottom = 32;

    const chartWidth = width - padLeft - padRight;
    const chartHeight = height - padTop - padBottom;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Threshold lines
    const yDanger = padTop + (1 - 0.90) * chartHeight;
    const yWarn = padTop + (1 - 0.70) * chartHeight;

    // Background zones
    ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
    ctx.fillRect(padLeft, padTop, chartWidth, yDanger - padTop);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.04)';
    ctx.fillRect(padLeft, yDanger, chartWidth, yWarn - yDanger);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    for (let s = 0; s <= 6; s++) {
      const gx = padLeft + (s / 6) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(gx, padTop);
      ctx.lineTo(gx, height - padBottom);
      ctx.stroke();
    }

    // Danger line (90% Sangat Berisik)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, yDanger);
    ctx.lineTo(padLeft + chartWidth, yDanger);
    ctx.stroke();

    // Warning line (70% Berisik)
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.beginPath();
    ctx.moveTo(padLeft, yWarn);
    ctx.lineTo(padLeft + chartWidth, yWarn);
    ctx.stroke();
    ctx.setLineDash([]);

    // Threshold labels on the right edge (clear room, never truncated)
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#EF4444';
    ctx.fillText('90% Sangat Berisik', padLeft + chartWidth + 8, yDanger);

    ctx.fillStyle = '#F59E0B';
    ctx.fillText('70% Berisik', padLeft + chartWidth + 8, yWarn);

    ctx.fillStyle = '#64748B';
    ctx.fillText('0% Tenang', padLeft + chartWidth + 8, height - padBottom);

    // Time markers along bottom axis
    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const timeLabels = ['-30s', '-25s', '-20s', '-15s', '-10s', '-5s', 'Sekarang'];
    for (let s = 0; s <= 6; s++) {
      const gx = padLeft + (s / 6) * chartWidth;
      ctx.fillText(timeLabels[s], gx, height - padBottom + 6);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    if (history.length === 0) return;

    if (history.length === 1) {
      const pt = history[0];
      const pct = pt.noisePercent !== undefined
        ? pt.noisePercent / 100
        : (pt.label === 'berisik' ? pt.confidence : 1 - pt.confidence);
      const x = padLeft + chartWidth;
      const y = padTop + (1 - pct) * chartHeight;
      const strokeColor = pct >= 0.90 ? '#EF4444' : (pct >= 0.70 ? '#F59E0B' : '#10B981');
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }

    const points = history.map((pt, i) => {
      const x = padLeft + (i / (history.length - 1)) * chartWidth;
      const pct = pt.noisePercent !== undefined
        ? pt.noisePercent / 100
        : (pt.label === 'berisik' ? pt.confidence : 1 - pt.confidence);
      const y = padTop + (1 - pct) * chartHeight;
      return { x, y, pct };
    });

    const lastPoint = points[points.length - 1];
    const strokeColor = lastPoint.pct >= 0.90 ? '#EF4444' : (lastPoint.pct >= 0.70 ? '#F59E0B' : '#10B981');

    // Area fill
    const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    grad.addColorStop(0, lastPoint.pct >= 0.70 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.20)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, height - padBottom);
    ctx.lineTo(points[0].x, height - padBottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Spline stroke
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();

    // Point dots
    points.forEach((p, idx) => {
      if (idx === points.length - 1) {
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [history]);

  // Send 3-second rolling buffer to backend
  const sendLivePrediction = useCallback(async () => {
    if (isPredictingRef.current) return;
    isPredictingRef.current = true;

    try {
      const ordered = new Float32Array(BUFFER_LEN);
      const writeIdx = bufferWriteIdx.current;
      ordered.set(audioBufferRef.current.subarray(writeIdx));
      ordered.set(audioBufferRef.current.subarray(0, writeIdx), BUFFER_LEN - writeIdx);

      const wavBlob = encodeWAV(ordered, TARGET_SR);
      const res = await predictLiveAudio(wavBlob, ambientBaselineRmsRef.current);
      setErrorMsg(null);
      setLiveData(res);

      const noiseProb = res.probabilities.berisik !== undefined
        ? res.probabilities.berisik
        : (res.label === 'berisik' ? res.confidence : 1 - res.confidence);
      const noisePercent = Math.round(noiseProb * 100);
      latestNoisePercentRef.current = noisePercent;

      // Trigger atomic alarm
      if (audioAlertRef.current && !isAlarmPlayingRef.current) {
        if (noisePercent >= 90) {
          playAlarmAudio('high');
        } else if (noisePercent >= 70) {
          playAlarmAudio('medium');
        }
      }

      setTotalChecks(prev => prev + 1);
      realRmsSumRef.current += res.rms;
      if (res.label === 'berisik') {
        setNoisyChecks(prev => prev + 1);
      }
      setPeakRms(prev => Math.max(prev, res.rms));

      setHistory(prev => {
        const next = [...prev, {
          time: res.timestamp,
          label: res.label,
          confidence: res.confidence,
          rms: res.rms,
          noisePercent: noisePercent
        }];
        return next.slice(-30);
      });

    } catch (e: any) {
      console.warn('Live predict error:', e);
      setErrorMsg('Gagal terhubung ke backend FastAPI (port 8080). Pastikan server backend berjalan.');
    } finally {
      isPredictingRef.current = false;
    }
  }, [playAlarmAudio]);

  // Dynamically manage prediction interval timer when isActive or intervalSec changes
  useEffect(() => {
    if (isActive) {
      if (rollingTimerRef.current) {
        clearInterval(rollingTimerRef.current);
      }
      rollingTimerRef.current = window.setInterval(() => {
        sendLivePrediction();
      }, intervalSec * 1000);
    }
    return () => {
      if (rollingTimerRef.current) {
        clearInterval(rollingTimerRef.current);
        rollingTimerRef.current = null;
      }
    };
  }, [isActive, intervalSec, sendLivePrediction]);

  // Room Ambient Noise Calibration (3-second baseline measurement)
  const runCalibration = async () => {
    if (isCalibrating) return;
    setIsCalibrating(true);
    setCalibrationCount(3);
    setCalibrationNotice('Mengukur kebisingan dasar ruangan... Harap kondisi tetap tenang.');

    let localStream: MediaStream | null = null;
    let localAudioCtx: AudioContext | null = null;
    let localAnalyser: AnalyserNode | null = null;

    try {
      let activeAnalyser = analyserRef.current;
      if (!activeAnalyser || !isActiveRef.current) {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1
          }
        });
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        localAudioCtx = new AudioCtx();
        const source = localAudioCtx.createMediaStreamSource(localStream);
        localAnalyser = localAudioCtx.createAnalyser();
        localAnalyser.fftSize = 2048;
        source.connect(localAnalyser);
        activeAnalyser = localAnalyser;
      }

      const samples: number[] = [];
      const startTime = Date.now();
      const durationMs = 3000;

      await new Promise<void>((resolve) => {
        const sampleInterval = window.setInterval(() => {
          if (activeAnalyser) {
            const timeData = new Float32Array(activeAnalyser.fftSize);
            activeAnalyser.getFloatTimeDomainData(timeData);
            let sumSq = 0;
            for (let i = 0; i < timeData.length; i++) {
              sumSq += timeData[i] * timeData[i];
            }
            const rms = Math.sqrt(sumSq / timeData.length);
            if (rms > 0.0001) {
              samples.push(rms);
            }
          }

          const elapsed = Date.now() - startTime;
          const remainingSec = Math.max(1, Math.ceil((durationMs - elapsed) / 1000));
          setCalibrationCount(remainingSec);

          if (elapsed >= durationMs) {
            clearInterval(sampleInterval);
            resolve();
          }
        }, 100);
      });

      const avgRms = samples.length > 0
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : 0.004;

      const finalBaseline = Math.round(avgRms * 10000) / 10000;
      setAmbientBaselineRms(finalBaseline);
      localStorage.setItem('soundlab_ambient_baseline', finalBaseline.toString());
      localStorage.setItem('soundlab_calibration_mode', 'custom');
      setCalibrationMode('custom');
      setCalibrationNotice(`Kalibrasi selesai! Baseline mic disetel pada ${finalBaseline.toFixed(4)} RMS.`);
      setTimeout(() => setCalibrationNotice(null), 5000);
    } catch (err: any) {
      console.warn('Calibration error:', err);
      setCalibrationNotice(`Gagal melakukan kalibrasi: ${err.message || 'Izin mikrofon diperlukan'}`);
      setTimeout(() => setCalibrationNotice(null), 5000);
    } finally {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      if (localAudioCtx) {
        localAudioCtx.close().catch(() => {});
      }
      setIsCalibrating(false);
      setCalibrationCount(3);
    }
  };

  const selectCalibrationMode = (mode: 'default' | 'custom') => {
    setCalibrationMode(mode);
    localStorage.setItem('soundlab_calibration_mode', mode);
    if (mode === 'default') {
      setAmbientBaselineRms(0);
      setCalibrationNotice('Menggunakan baseline acuan Default Sistem (0.0030 RMS).');
      setTimeout(() => setCalibrationNotice(null), 4000);
    } else {
      const saved = localStorage.getItem('soundlab_ambient_baseline');
      const val = saved ? parseFloat(saved) : 0;
      if (val > 0) {
        setAmbientBaselineRms(val);
        setCalibrationNotice(`Menggunakan hasil ukur mikrofon: ${val.toFixed(4)} RMS.`);
      } else {
        setAmbientBaselineRms(0);
        setCalibrationNotice('Belum ada data ukur mikrofon. Tekan "Mulai Ukur Mic (3s)" di bawah.');
      }
      setTimeout(() => setCalibrationNotice(null), 5000);
    }
  };

  const resetCustomCalibration = () => {
    setAmbientBaselineRms(0);
    localStorage.removeItem('soundlab_ambient_baseline');
    setCalibrationMode('default');
    localStorage.setItem('soundlab_calibration_mode', 'default');
    setCalibrationNotice('Data ukur mikrofon direset. Menggunakan acuan Default Sistem.');
    setTimeout(() => setCalibrationNotice(null), 4000);
  };

  // Start Real-Time Monitoring
  const startMonitoring = async () => {
    setErrorMsg(null);
    setSavedNotification(null);
    setElapsedSec(0);

    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const initialBuffer: LiveHistoryPoint[] = Array.from({ length: 30 }, () => ({
      time: nowStr,
      label: 'non-berisik',
      confidence: 0.95,
      rms: 0.005
    }));
    setHistory(initialBuffer);
    setTotalChecks(0);
    setNoisyChecks(0);
    setPeakRms(0);
    realRmsSumRef.current = 0;

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

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Script processor to fill 3-second buffer
      const scriptNode = ctx.createScriptProcessor(4096, 1, 1);
      scriptNodeRef.current = scriptNode;
      const inputSR = ctx.sampleRate;

      scriptNode.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const ratio = inputSR / TARGET_SR;
        const outLen = Math.floor(inputData.length / ratio);

        for (let i = 0; i < outLen; i++) {
          const srcIdx = Math.floor(i * ratio);
          const sample = inputData[srcIdx] || 0;
          audioBufferRef.current[bufferWriteIdx.current] = sample;
          bufferWriteIdx.current = (bufferWriteIdx.current + 1) % BUFFER_LEN;
        }
      };

      // Mute gain node to prevent audio feedback loop to speakers
      const muteNode = ctx.createGain();
      muteNode.gain.value = 0;
      source.connect(scriptNode);
      scriptNode.connect(muteNode);
      muteNode.connect(ctx.destination);

      setIsActive(true);

      // Stopwatch
      stopwatchTimerRef.current = window.setInterval(() => {
        setElapsedSec(prev => prev + 1);
      }, 1000);

    } catch (e: any) {
      console.error('Microphone error:', e);
      setErrorMsg(`Izin mikrofon ditolak atau tidak ditemukan: ${e.message}`);
      setIsActive(false);
    }
  };

  // Stop Real-Time Monitoring
  const stopMonitoring = () => {
    if (rollingTimerRef.current) clearInterval(rollingTimerRef.current);
    if (stopwatchTimerRef.current) clearInterval(stopwatchTimerRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scriptNodeRef.current) {
      try {
        scriptNodeRef.current.disconnect();
      } catch {}
      scriptNodeRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    forceStopAlarm();
    setIsActive(false);

    // Auto-save session
    const curElapsed = elapsedSecRef.current;
    const curTotal = totalChecksRef.current;
    if (curElapsed >= 3 && curTotal > 0) {
      // Calculate true average RMS from real live prediction checks only (ignoring placeholder dots)
      const calculatedAvgRms = curTotal > 0
        ? (realRmsSumRef.current / curTotal)
        : (liveDataRef.current ? liveDataRef.current.rms : 0.02);

      const item = createLiveSessionHistoryItem({
        duration_s: curElapsed,
        totalChecks: curTotal,
        noisyChecks: noisyChecksRef.current,
        peakRms: peakRmsRef.current,
        avgRms: calculatedAvgRms,
        centroid_hz: liveDataRef.current ? liveDataRef.current.centroid_hz : 1400,
        zcr: liveDataRef.current ? liveDataRef.current.zcr : 0.05
      });
      saveHistoryItem(item);
      setSavedNotification(`Sesi pemantauan (${curElapsed} detik) berhasil disimpan otomatis ke Riwayat.`);
    }
  };

  const handleResetSession = () => {
    setElapsedSec(0);
    setTotalChecks(0);
    setNoisyChecks(0);
    setPeakRms(0);
    realRmsSumRef.current = 0;
    setHistory([]);
    setLiveData(null);
    latestNoisePercentRef.current = 0;
  };

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dynamic calculations
  const isNoisy = liveData?.label === 'berisik';
  const noisePercent = liveData
    ? Math.round((liveData.probabilities.berisik !== undefined ? liveData.probabilities.berisik : (liveData.label === 'berisik' ? liveData.confidence : 1 - liveData.confidence)) * 100)
    : 0;

  // Multi-step Segmented Bar Meter (22 tick marks, exact match with reference)
  const TOTAL_BARS = 22;
  const activeBarsCount = Math.max(1, Math.min(TOTAL_BARS, Math.round((noisePercent / 100) * TOTAL_BARS)));

  // Dynamic 5 Feature Metrics for Card 4 (Live data-driven)
  const featMfcc1Val = liveData
    ? (liveData.mfcc1 !== undefined ? `${liveData.mfcc1.toFixed(1)} dB` : `${(-260 + liveData.rms * 350).toFixed(1)} dB`)
    : (isActive ? 'Membaca...' : '- dB');
  const featMfcc1Pct = liveData ? Math.min(100, Math.max(20, Math.round(Math.abs(parseFloat(featMfcc1Val)) / 3.2))) : (isActive ? 40 : 10);

  const featMfcc3Val = liveData
    ? (liveData.mfcc3 !== undefined ? `${liveData.mfcc3.toFixed(1)} dB` : `${(-34.8 + (liveData.label === 'berisik' ? 2.5 : 23.6)).toFixed(1)} dB`)
    : (isActive ? 'Membaca...' : '- dB');
  const featMfcc3Pct = liveData ? Math.min(100, Math.max(20, Math.round(Math.abs(parseFloat(featMfcc3Val)) * 2.2))) : (isActive ? 40 : 10);

  const featRmsVal = liveData ? `${(liveData.rms * 100).toFixed(1)} %` : (isActive ? '0.0 %' : '0.0 %');
  const featRmsPct = liveData ? Math.min(100, Math.max(18, Math.round(liveData.rms * 450))) : (isActive ? 15 : 6);
  const featRmsAlert = liveData ? (liveData.rms >= 0.05 || isNoisy) : false;

  const featDynStdVal = liveData
    ? (liveData.rms_std !== undefined ? `${(liveData.rms_std * 100).toFixed(1)} %` : `${(Math.max(0.008, liveData.rms * 0.45) * 100).toFixed(1)} %`)
    : (isActive ? '0.0 %' : '0.0 %');
  const featDynStdPct = liveData ? Math.min(100, Math.max(20, Math.round(parseFloat(featDynStdVal) * 8))) : (isActive ? 15 : 6);

  const featZcrVal = liveData ? `${(liveData.zcr * 100).toFixed(1)} %` : (isActive ? '0.0 %' : '0.0 %');
  const featZcrPct = liveData ? Math.min(100, Math.max(15, Math.round(liveData.zcr * 400))) : (isActive ? 15 : 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
      {/* Mode Switcher Pill */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
        <div style={{
          display: 'inline-flex',
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          padding: '4px',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          gap: '4px'
        }}>
          <button
            onClick={() => onSwitchMode('realtime')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12px',
              fontWeight: viewMode === 'realtime' ? 700 : 500,
              backgroundColor: viewMode === 'realtime' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'realtime' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: viewMode === 'realtime' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Radio size={13} />
            <span>Deteksi Real-Time</span>
          </button>
          <button
            onClick={() => onSwitchMode('file')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12px',
              fontWeight: viewMode === 'file' ? 700 : 500,
              backgroundColor: viewMode === 'file' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'file' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: viewMode === 'file' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <FolderOpen size={13} />
            <span>Analisis Berkas / Sampel</span>
          </button>
        </div>
      </div>

      {/* Error Message Banner */}
      {errorMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#EF4444',
          fontSize: '13px'
        }}>
          <AlertTriangle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}
      {/* ============================================================== */}
      {/* 0. NOTIFIKASI OTOMATIS SIMPAN SESI                             */}
      {/* ============================================================== */}
      {savedNotification && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 20px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={16} color="#10B981" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#181F26' }}>
              {savedNotification}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate('/riwayat')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--bg-canvas)',
                color: '#181F26',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              Buka Riwayat
            </button>
            <button
              onClick={() => navigate('/bandingkan')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--accent-orange)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              Bandingkan
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. UPPER HERO SECTION (EXACT 1-TO-1 ASYMMETRIC GRID MATCH)     */}
      {/* ============================================================== */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px',
        alignItems: 'center',
        minHeight: '380px'
      }}>
        {/* KOLOM KIRI HERO: JUDUL BESAR, TEKS DESKRIPSI, TICK METER, 3 METRIK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <h1 style={{
              fontSize: '38px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              maxWidth: '520px'
            }}>
              Sistem Deteksi Kebisingan Audio Secara Real-Time
            </h1>
            <p style={{
              marginTop: '12px',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              maxWidth: '460px'
            }}>
              Implementasi tugas mata kuliah Proyek Sains Data (PSD) untuk mendeteksi dan mengklasifikasikan suara berisik dan non-berisik secara real-time dari mikrofon menggunakan model Random Forest.
            </p>
          </div>

          {/* Segmented Bar Meter (22 Rounded Vertical Ticks - Orange / Grey) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {Array.from({ length: TOTAL_BARS }).map((_, idx) => {
                const isLit = idx < activeBarsCount;
                return (
                  <div
                    key={idx}
                    style={{
                      width: '8px',
                      height: '20px',
                      borderRadius: '4px',
                      backgroundColor: isLit ? 'var(--accent-orange)' : '#CBD3C6',
                      transition: 'background-color 0.15s ease'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* 3 Key Metrics Row (Model Accuracy, Feature Count, Model Confidence) */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '36px',
            marginTop: '6px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  92.5
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>%</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                Akurasi Model Uji
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  14
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Fitur</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                Fitur Audio Spektral
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  {liveData ? (liveData.confidence * 100).toFixed(1) : (isActive ? '...' : '--')}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>%</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                Keyakinan Prediksi
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN HERO: KARTU INSTRUMEN & KONTROL OPERASIONAL */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          minHeight: '380px'
        }}>
          {/* Floating Matte White Instrument Card */}
          <div style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            overflow: 'hidden'
          }}>
            {/* Accordion 1: Environmental / Acoustic Information */}
            <div
              onClick={() => setEnvInfoOpen(!envInfoOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Parameter Ekstraksi Fitur Audio
              </span>
              {envInfoOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {envInfoOpen && (
              <div style={{
                padding: '0 20px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
              }}>
                {/* Row 1: Sampling Format */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Format Sampling</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    22.050 Hz (Mono)
                  </span>
                </div>

                {/* Row 2: Interval Analisis */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Interval Pembaruan</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {intervalSec} Detik
                  </span>
                </div>

                {/* Row 3: Baseline Ambien */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Baseline Ambien</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: (calibrationMode === 'custom' && ambientBaselineRms > 0) ? '#10B981' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {calibrationMode === 'custom' && ambientBaselineRms > 0
                      ? `${ambientBaselineRms.toFixed(4)} RMS (Ukur Mic)`
                      : '0.0030 RMS (Default Sistem)'}
                  </span>
                </div>

                {/* Row 2: Status Klasifikasi */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Hasil Klasifikasi</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: !liveData ? 'rgba(0, 0, 0, 0.06)' : (isNoisy ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)'),
                    color: !liveData ? 'var(--text-secondary)' : (isNoisy ? '#EF4444' : '#10B981')
                  }}>
                    {!liveData ? (isActive ? 'Mendengarkan...' : '○ Standby') : (isNoisy ? '🚨 Berisik' : '✓ Non-Berisik (Tenang)')}
                  </span>
                </div>

                {/* Row 3: Volume Rata-rata (RMS) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Intensitas Bunyi (RMS)</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {liveData ? liveData.rms.toFixed(4) : (isActive ? 'Membaca...' : '0.0000')}
                  </span>
                </div>

                {/* Row 4: Fluktuasi Dinamika */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Fluktuasi Dinamika (RMS Std)</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {liveData ? (liveData.rms_std ? liveData.rms_std.toFixed(4) : (liveData.rms * 0.45).toFixed(4)) : (isActive ? 'Membaca...' : '0.0000')}
                  </span>
                </div>

                {/* Row 5: Kerapatan Desis (ZCR) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Kerapatan Desis (ZCR)</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {liveData ? liveData.zcr.toFixed(4) : (isActive ? 'Membaca...' : '0.0000')}
                  </span>
                </div>

                {/* Row 6: Pusat Spektral (Centroid) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pusat Frekuensi (Centroid)</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {liveData ? `${liveData.centroid_hz.toFixed(0)} Hz` : (isActive ? 'Membaca...' : '-- Hz')}
                  </span>
                </div>
              </div>
            )}

            {/* Accordion 2: Data Science Model & Pipeline Information */}
            <div
              onClick={() => setOpInfoOpen(!opInfoOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                cursor: 'pointer',
                userSelect: 'none',
                backgroundColor: '#FBFDFB'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Informasi Model & Pipeline PSD
              </span>
              {opInfoOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {opInfoOpen && (
              <div style={{
                padding: '0 20px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                <div>• Mata Kuliah: Proyek Sains Data (PSD)</div>
                <div>• Algoritma: Random Forest Classifier (100 Trees)</div>
                <div>• Ekstraksi: 14 Fitur Spektral (MDI Importance)</div>
                <div>• Dataset Latih: 200 Sampel Audio (80:20 Split)</div>
                <div>• Akurasi Pengujian: 92.5% (F1-Score: 92.5%)</div>
              </div>
            )}

            {/* Interval Delay Control Strip (Clean Preset: 1 Detik, 3 Detik, 5 Detik) */}
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#FAFCF9',
              borderTop: '1px solid rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Interval Analisis
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {intervalSec} Detik
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                padding: '3px',
                borderRadius: '8px'
              }}>
                {[1, 3, 5].map((sec) => {
                  const isSelected = intervalSec === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setIntervalSec(sec)}
                      style={{
                        padding: '6px 0',
                        fontSize: '12px',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                        borderRadius: '6px',
                        boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {sec} Detik
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Room Ambient Noise Calibration Strip */}
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#FAFCF9',
              borderTop: '1px solid rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Kalibrasi Ruangan
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: (calibrationMode === 'custom' && ambientBaselineRms > 0) ? '#10B981' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {calibrationMode === 'custom' && ambientBaselineRms > 0
                    ? `${ambientBaselineRms.toFixed(4)} RMS (Kustom Mic)`
                    : '0.0030 RMS (Default Sistem)'}
                </span>
              </div>

              {/* Segmented Mode Selector: Default vs Ukur Mic 3 Detik */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px',
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                padding: '3px',
                borderRadius: '8px'
              }}>
                <button
                  type="button"
                  disabled={isCalibrating}
                  onClick={() => selectCalibrationMode('default')}
                  style={{
                    padding: '6px 0',
                    fontSize: '12px',
                    fontWeight: calibrationMode === 'default' ? 700 : 500,
                    color: calibrationMode === 'default' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    backgroundColor: calibrationMode === 'default' ? '#FFFFFF' : 'transparent',
                    borderRadius: '6px',
                    boxShadow: calibrationMode === 'default' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    border: 'none',
                    cursor: isCalibrating ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Default Sistem
                </button>

                <button
                  type="button"
                  disabled={isCalibrating}
                  onClick={() => selectCalibrationMode('custom')}
                  style={{
                    padding: '6px 0',
                    fontSize: '12px',
                    fontWeight: calibrationMode === 'custom' ? 700 : 500,
                    color: calibrationMode === 'custom' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    backgroundColor: calibrationMode === 'custom' ? '#FFFFFF' : 'transparent',
                    borderRadius: '6px',
                    boxShadow: calibrationMode === 'custom' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    border: 'none',
                    cursor: isCalibrating ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Ukur Mic (3s)
                </button>
              </div>

              {/* Action buttons when in Custom (Ukur Mic 3s) Mode */}
              {calibrationMode === 'custom' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={isCalibrating}
                    onClick={runCalibration}
                    style={{
                      flex: 1,
                      padding: '7px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: isCalibrating ? 'var(--text-secondary)' : '#181F26',
                      backgroundColor: isCalibrating ? 'rgba(0, 0, 0, 0.05)' : '#FFFFFF',
                      borderRadius: '6px',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      cursor: isCalibrating ? 'not-allowed' : 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isCalibrating
                      ? `Mengukur Suara Ruangan (${calibrationCount}s)...`
                      : (ambientBaselineRms > 0 ? 'Kalibrasi Ulang (3s)' : 'Mulai Ukur Mic (3s)')}
                  </button>

                  {ambientBaselineRms > 0 && !isCalibrating && (
                    <button
                      type="button"
                      onClick={resetCustomCalibration}
                      title="Hapus rekaman kalibrasi mic dan kembali ke default"
                      style={{
                        padding: '7px 12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#64748B',
                        backgroundColor: 'transparent',
                        borderRadius: '6px',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}

              {calibrationNotice && (
                <div style={{
                  fontSize: '11px',
                  color: isCalibrating ? '#3B82F6' : (calibrationMode === 'custom' && ambientBaselineRms > 0 ? '#10B981' : 'var(--text-secondary)'),
                  lineHeight: 1.4,
                  backgroundColor: isCalibrating ? 'rgba(59, 130, 246, 0.08)' : 'rgba(0, 0, 0, 0.03)',
                  padding: '5px 8px',
                  borderRadius: '6px'
                }}>
                  {calibrationNotice}
                </div>
              )}
            </div>

            {/* Bottom Strip: Control Buttons (Start/Stop + Alarm Toggle) */}
            <div style={{
              padding: '14px 20px',
              backgroundColor: '#FAFCF9',
              borderTop: '1px solid rgba(0, 0, 0, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {!isActive ? (
                <button
                  onClick={startMonitoring}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--accent-orange)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    boxShadow: '0 4px 16px rgba(255, 92, 38, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Play size={15} fill="#FFFFFF" />
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
                    gap: '8px',
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: '#181F26',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Square size={15} fill="#FFFFFF" />
                  <span>Hentikan ({formatSec(elapsedSec)})</span>
                </button>
              )}

              {/* Alarm Bell Button */}
              <button
                onClick={() => {
                  const nxt = !audioAlert;
                  setAudioAlert(nxt);
                  if (!nxt) forceStopAlarm();
                }}
                title={audioAlert ? 'Alarm Suara Aktif (Klik untuk matikan)' : 'Alarm Suara Mati'}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: audioAlert ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 0, 0, 0.05)',
                  border: `1px solid ${audioAlert ? 'rgba(16, 185, 129, 0.3)' : 'transparent'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: audioAlert ? '#10B981' : 'var(--text-secondary)'
                }}
              >
                {audioAlert ? <Bell size={16} /> : <BellOff size={16} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. BOTTOM BENTO GRID (3 CARDS)                                */}
      {/* ============================================================== */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        width: '100%'
      }}>
        {/* CARD 1: OVERVIEW ↗ (Speedometer + Stat K3) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '22px 24px',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '220px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Ringkasan Model PSD</span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>↗</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            alignItems: 'center',
            gap: '12px',
            marginTop: '12px'
          }}>
            {/* Left Statistics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  92.5 %
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Akurasi Model Uji</div>
              </div>

              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  14 Fitur
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fitur Spektral MDI</div>
              </div>

              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  {formatSec(elapsedSec)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Durasi Monitoring</div>
              </div>
            </div>

            {/* Right Speedometer Gauge Dial (Showing Model Confidence) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                position: 'relative',
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                border: `2px dashed ${liveData ? (isNoisy ? '#EF4444' : '#10B981') : 'var(--accent-orange)'}`,
                backgroundColor: liveData ? (isNoisy ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.04)') : 'rgba(251, 91, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {liveData ? 'Keyakinan' : (isActive ? 'Mendeteksi' : 'Status')}
                </span>
                <span style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1.1
                }}>
                  {liveData ? `${Math.round(liveData.confidence * 100)}%` : (isActive ? '...' : '0%')}
                </span>
                <span style={{
                  fontSize: '9px',
                  color: liveData ? (isNoisy ? '#EF4444' : '#10B981') : 'var(--accent-orange)',
                  fontWeight: 700,
                  marginTop: '2px'
                }}>
                  {liveData ? liveData.label.toUpperCase() : (isActive ? 'MENDENGARKAN' : 'STANDBY')}
                </span>
              </div>

              <button
                onClick={handleResetSession}
                style={{
                  marginTop: '10px',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: '#181F26',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={10} />
                <span>Reload</span>
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: SPEKTRUM FREKUENSI ↗ (DEEP SAGE CARD #616A5C DENGAN EQUALIZER KUNING & PUTIH) */}
        <div style={{
          backgroundColor: '#616A5C',
          borderRadius: '20px',
          padding: '22px 24px',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#FFFFFF',
          minHeight: '220px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>Spektrum Akustik</span>
            <span style={{ fontSize: '14px', color: '#DCE4D8' }}>↗</span>
          </div>

          {/* Equalizer Visualizer Bars with Dual Axes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            alignItems: 'center',
            gap: '10px',
            marginTop: '10px',
            height: '110px'
          }}>
            {/* Left Axis: kHz */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: '#DCE4D8'
            }}>
              <span>17</span>
              <span style={{ fontSize: '9px' }}>kHz</span>
              <span>0</span>
            </div>

            {/* Dynamic Equalizer Canvas (60 FPS Hardware-Accelerated) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%'
            }}>
              <canvas
                ref={eqCanvasRef}
                width={220}
                height={100}
                style={{
                  width: '100%',
                  height: '100px',
                  display: 'block'
                }}
              />
            </div>

            {/* Right Axis: dB */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: '#DCE4D8',
              textAlign: 'right'
            }}>
              <span>423</span>
              <span style={{ fontSize: '9px' }}>dB</span>
              <span>0</span>
            </div>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            fontSize: '10px',
            color: '#DCE4D8',
            marginTop: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D4ED31' }} />
              <span>Frekuensi Rendah (Bass / Gemuruh)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
              <span>Frekuensi Tinggi (Treble / Desis)</span>
            </div>
          </div>
        </div>

        {/* CARD 3: 5 FITUR KUNCI AKUSTIK ↗ (5 THERMOMETER COLUMNS DENGAN TEAL & ORANGE) */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '22px 24px',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '220px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>5 Fitur Kunci</span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>↗</span>
          </div>

          {/* 5 Vertical Sensor Columns */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '6px',
            alignItems: 'flex-end',
            height: '120px',
            marginTop: '8px'
          }}>
            {/* Col 1: MFCC 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-secondary)' }}>{featMfcc1Val}</span>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  height: `${featMfcc1Pct}%`,
                  borderRadius: '6px',
                  backgroundColor: '#7CC5C2',
                  transition: 'height 0.4s ease'
                }} />
              </div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>MFCC-1</span>
            </div>

            {/* Col 2: MFCC 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-secondary)' }}>{featMfcc3Val}</span>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  height: `${featMfcc3Pct}%`,
                  borderRadius: '6px',
                  backgroundColor: '#7CC5C2',
                  transition: 'height 0.4s ease'
                }} />
              </div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>MFCC-3</span>
            </div>

            {/* Col 3: RMS Mean (Alert Triangle!) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-secondary)' }}>{featRmsVal}</span>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
                {featRmsAlert && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    backgroundColor: '#FF5C26',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 2,
                    boxShadow: '0 2px 6px rgba(255, 92, 38, 0.4)'
                  }}>
                    ⚠
                  </div>
                )}
                <div style={{
                  width: '100%',
                  height: `${featRmsPct}%`,
                  borderRadius: '6px',
                  backgroundColor: featRmsAlert ? '#FF5C26' : 'rgba(255, 92, 38, 0.4)',
                  transition: 'height 0.4s ease, background-color 0.4s ease'
                }} />
              </div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>RMS</span>
            </div>

            {/* Col 4: RMS Std */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-secondary)' }}>{featDynStdVal}</span>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  height: `${featDynStdPct}%`,
                  borderRadius: '6px',
                  backgroundColor: '#F87146',
                  transition: 'height 0.4s ease'
                }} />
              </div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Dyn Std</span>
            </div>

            {/* Col 5: ZCR */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-secondary)' }}>{featZcrVal}</span>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  height: `${featZcrPct}%`,
                  borderRadius: '6px',
                  backgroundColor: '#7CC5C2',
                  transition: 'height 0.4s ease'
                }} />
              </div>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>ZCR</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. DIAGNOSTIK LANJUTAN: OSKILOSKOP 60 FPS & LINIMASA SPLINE     */}
      {/* ============================================================== */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '18px 24px',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div
          onClick={() => setRawOscilloscopeOpen(!rawOscilloscopeOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={18} color="var(--accent-orange)" />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Oskiloskop Real-Time 60 FPS & Linimasa Riwayat (30 Detik)
            </span>
            <span style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--bg-canvas)',
              color: 'var(--text-secondary)'
            }}>
              22.050 Hz • 2048 Sampel
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--accent-orange)' }}>
            <span>{rawOscilloscopeOpen ? 'Sembunyikan' : 'Buka Grafik Lengkap'}</span>
            {rawOscilloscopeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {rawOscilloscopeOpen && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(0, 0, 0, 0.06)'
          }}>
            {/* Oskiloskop Canvas */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Bentuk Gelombang Mikrofon Langsung (Waveform Oscilloscope)
              </div>
              <canvas
                ref={canvasRef}
                width={700}
                height={180}
                style={{
                  width: '100%',
                  height: '180px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  display: 'block'
                }}
              />
            </div>

            {/* Linimasa Spline Canvas */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Linimasa Intensitas Kebisingan Temporal
              </div>
              <canvas
                ref={historyCanvasRef}
                width={700}
                height={180}
                style={{
                  width: '100%',
                  height: '180px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  display: 'block'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. MODAL/DRAWER AMBANG ALARM & PENGUJIAN AUDIO                   */}
      {/* ============================================================== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '14px 20px',
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ambang Alarm:</span>
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: activeAlarmLevel === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-canvas)',
            color: '#F59E0B',
            fontWeight: 700
          }}>
            70% - 90%: Berisik {activeAlarmLevel === 'medium' ? '● AKTIF' : ''}
          </span>
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: activeAlarmLevel === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-canvas)',
            color: '#EF4444',
            fontWeight: 700
          }}>
            ≥ 90%: Sangat Berisik {activeAlarmLevel === 'high' ? '🚨 AKTIF' : ''}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Volume Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Vol:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={alarmVolume}
              onChange={(e) => setAlarmVolume(parseFloat(e.target.value))}
              style={{ width: '65px', accentColor: 'var(--accent-orange)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {Math.round(alarmVolume * 100)}%
            </span>
          </div>

          {/* Test Buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => handleTestAlarm('medium')}
              disabled={activeAlarmLevel !== 'none'}
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--bg-canvas)',
                color: '#F59E0B',
                fontWeight: 600,
                opacity: activeAlarmLevel !== 'none' ? 0.5 : 1
              }}
            >
              {testingAlarm === 'medium' ? 'Memutar...' : '▶ Tes Berisik'}
            </button>
            <button
              onClick={() => handleTestAlarm('high')}
              disabled={activeAlarmLevel !== 'none'}
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--bg-canvas)',
                color: '#EF4444',
                fontWeight: 600,
                opacity: activeAlarmLevel !== 'none' ? 0.5 : 1
              }}
            >
              {testingAlarm === 'high' ? 'Memutar...' : '▶ Tes Sangat Berisik'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
