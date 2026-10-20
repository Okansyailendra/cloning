import type { HistoryItem } from '../types/api';

const STORAGE_KEY = 'soundlab_analysis_history';
const MAX_HISTORY = 50;

export function getHistory(): HistoryItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Gagal menyimpan ke sessionStorage:', e);
  }
}

export function clearHistory(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Gagal menghapus riwayat:', e);
  }
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
  link.setAttribute('download', `soundlab-riwayat-${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
