import type { HistoryItem } from '../types/api';

const STORAGE_KEY = 'soundlab_analysis_history';
const MAX_HISTORY = 50;

export function getHistory(): HistoryItem[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
      }
    }
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistoryItem(item: HistoryItem): void {
  try {
    const current = getHistory();
    const filtered = current.filter(h => h.id !== item.id);
    const updated = [item, ...filtered].slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('soundlab_history_updated', { detail: updated }));
    }
  } catch (e) {
    console.warn('Gagal menyimpan ke localStorage:', e);
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('soundlab_history_updated', { detail: [] }));
    }
  } catch (e) {
    console.warn('Gagal menghapus riwayat:', e);
  }
}

export function createLiveSessionHistoryItem(params: {
  duration_s: number;
  totalChecks: number;
  noisyChecks: number;
  peakRms: number;
  avgRms: number;
  centroid_hz: number;
  zcr: number;
}): HistoryItem {
  const { duration_s, totalChecks, noisyChecks, peakRms, avgRms, centroid_hz, zcr } = params;
  const isNoisy = noisyChecks >= Math.max(1, totalChecks / 2);
  const confidence = totalChecks > 0
    ? (isNoisy ? Math.max(0.65, noisyChecks / totalChecks) : Math.max(0.65, (totalChecks - noisyChecks) / totalChecks))
    : 0.85;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const id = `live_${Date.now()}`;
  const filename = `Sesi Real-Time (${timeStr})`;

  const featureItems = [
    { rank: 1, name: 'rms_mean', display_name: 'Volume Rata-rata (RMS)', unit: '', value: parseFloat(avgRms.toFixed(4)), class_mean: { berisik: 0.0955, 'non-berisik': 0.0352 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.1992 },
    { rank: 2, name: 'rms_std', display_name: 'Fluktuasi Dinamika RMS', unit: '', value: parseFloat(Math.max(0.005, (peakRms - avgRms) * 0.7).toFixed(4)), class_mean: { berisik: 0.0479, 'non-berisik': 0.0208 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.1071 },
    { rank: 3, name: 'mfcc3_mean', display_name: 'Timbre MFCC 3', unit: 'dB', value: isNoisy ? -32.5 : -12.0, class_mean: { berisik: -34.84, 'non-berisik': -11.17 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.0874 },
    { rank: 4, name: 'mfcc1_mean', display_name: 'Bentuk Spektral Utama (MFCC 1)', unit: 'dB', value: parseFloat((-260.0 + avgRms * 350).toFixed(2)), class_mean: { berisik: -200.82, 'non-berisik': -320.70 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.0827 },
    { rank: 5, name: 'mfcc5_mean', display_name: 'Timbre MFCC 5', unit: 'dB', value: isNoisy ? -18.0 : -5.0, class_mean: { berisik: -18.82, 'non-berisik': -4.77 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.0797 },
    { rank: 6, name: 'mfcc7_mean', display_name: 'Timbre MFCC 7', unit: 'dB', value: isNoisy ? -13.0 : -8.5, class_mean: { berisik: -13.28, 'non-berisik': -8.37 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.0573 },
    { rank: 7, name: 'mfcc11_mean', display_name: 'Timbre MFCC 11', unit: 'dB', value: isNoisy ? -7.5 : -4.8, class_mean: { berisik: -7.77, 'non-berisik': -4.76 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.0547 },
    { rank: 8, name: 'zcr_mean', display_name: 'Zero Crossing Rate (Desis)', unit: '', value: parseFloat(zcr.toFixed(4)), class_mean: { berisik: 0.0940, 'non-berisik': 0.0748 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.0520 },
    { rank: 9, name: 'centroid_mean', display_name: 'Pusat Frekuensi Spektral', unit: 'Hz', value: parseFloat(centroid_hz.toFixed(1)), class_mean: { berisik: 1784.2, 'non-berisik': 1619.7 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.0496 },
    { rank: 10, name: 'mfcc13_mean', display_name: 'Timbre MFCC 13', unit: 'dB', value: isNoisy ? -7.8 : -4.3, class_mean: { berisik: -7.78, 'non-berisik': -4.26 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.0494 },
    { rank: 11, name: 'mfcc10_mean', display_name: 'Timbre MFCC 10', unit: 'dB', value: isNoisy ? -1.9 : -1.1, class_mean: { berisik: -1.88, 'non-berisik': -1.09 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.0479 },
    { rank: 12, name: 'mfcc8_mean', display_name: 'Timbre MFCC 8', unit: 'dB', value: isNoisy ? -11.0 : -4.3, class_mean: { berisik: -11.38, 'non-berisik': -4.27 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.0460 },
    { rank: 13, name: 'mfcc6_mean', display_name: 'Timbre MFCC 6', unit: 'dB', value: isNoisy ? -9.2 : -1.4, class_mean: { berisik: -9.41, 'non-berisik': -1.32 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.0452 },
    { rank: 14, name: 'mfcc9_mean', display_name: 'Timbre MFCC 9', unit: 'dB', value: isNoisy ? -12.1 : -8.1, class_mean: { berisik: -12.21, 'non-berisik': -8.05 }, nearer_class: isNoisy ? 'berisik' as const : 'non-berisik' as const, importance: 0.0417 }
  ];

  const fullResponse: any = {
    request_id: id,
    file: { name: filename, size_bytes: duration_s * 22050 * 2, extension: 'live' },
    audio: {
      duration_s,
      processed_duration_s: duration_s,
      sample_rate: 22050,
      n_chunks: Math.max(1, Math.ceil(duration_s / 3)),
      silence_removed_s: 0,
      active_intervals: [[0, duration_s]]
    },
    prediction: {
      label: isNoisy ? 'berisik' : 'non-berisik',
      label_display: isNoisy ? 'BERISIK' : 'NON-BERISIK',
      confidence,
      probabilities: {
        berisik: isNoisy ? confidence : 1 - confidence,
        'non-berisik': isNoisy ? 1 - confidence : confidence
      },
      low_confidence: confidence < 0.65,
      warn_threshold: 0.65
    },
    features: featureItems,
    mfcc_profile: { values: [-200, 45, -16, 12, -10, -7, -8, 5, -6, 4, -5, 3, -4] },
    explanation: {
      summary: isNoisy
        ? `Sesi mikrofon real-time terdeteksi dominan BERISIK (${Math.round(confidence * 100)}% keyakinan) dengan intensitas puncak RMS ${peakRms.toFixed(4)}.`
        : `Sesi mikrofon real-time terdeteksi dominan TENANG (${Math.round(confidence * 100)}% keyakinan) dengan intensitas suara rendah rata-rata RMS ${avgRms.toFixed(4)}.`,
      reasons: [],
      counter_reasons: []
    },
    chunks: [],
    visual: {
      waveform: { points: 100, min: [], max: [] },
      spectrogram: { n_mels: 64, n_frames: 50, hop_s: 0.05, freqs_hz: [], db_range: [-80, 0], data: [] }
    },
    timing: { total_ms: 50, load_ms: 10, features_ms: 25, predict_ms: 15 },
    warnings: []
  };

  return {
    id,
    timestamp: timeStr,
    filename,
    duration_s,
    label: isNoisy ? 'berisik' : 'non-berisik',
    confidence,
    rms_mean: avgRms,
    centroid_mean: centroid_hz,
    zcr_mean: zcr,
    full_response: fullResponse
  };
}

export function exportHistoryToCsv(items: HistoryItem[]): void {
  if (items.length === 0) return;

  const headers = [
    'ID',
    'Waktu',
    'Nama Berkas',
    'Durasi (dtk)',
    'Prediksi',
    'Confidence',
    'Volume Rata-rata (RMS)',
    'Pusat Frekuensi (Hz)',
    'Kerapatan Desis (ZCR)'
  ];

  const rows = items.map(item => [
    item.id,
    item.timestamp,
    `"${item.filename.replace(/"/g, '""')}"`,
    item.duration_s.toFixed(2),
    item.label,
    (item.confidence * 100).toFixed(1) + '%',
    item.rms_mean.toFixed(6),
    item.centroid_mean.toFixed(2),
    item.zcr_mean.toFixed(6)
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `sonalyze-riwayat-${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
