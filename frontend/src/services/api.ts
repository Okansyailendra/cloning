import type { PredictResponse, ModelInfoResponse, HealthResponse, LivePredictResponse } from '../types/api';

const API_BASE = '/api';

export class ApiError extends Error {
  code: string;
  detail: any;
  status: number;

  constructor(status: number, code: string, message: string, detail: any = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error('Gagal memeriksa status server');
  }
  return res.json();
}

export async function fetchModelInfo(): Promise<ModelInfoResponse> {
  const res = await fetch(`${API_BASE}/model-info`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error('Gagal memuat informasi model');
  }
  return res.json();
}

export async function predictAudioFile(
  fileOrBlob: File | Blob,
  filename: string,
  _onProgress?: (progress: number) => void
): Promise<PredictResponse> {
  const formData = new FormData();
  formData.append('file', fileOrBlob, filename);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await res.json();

    if (!res.ok) {
      const err = data.error || {};
      throw new ApiError(
        res.status,
        err.code || 'UNKNOWN_ERROR',
        err.message || 'Terjadi kesalahan saat memproses audio.',
        err.detail || {}
      );
    }

    return data as PredictResponse;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError(504, 'PROSES_TIMEOUT', 'Pemrosesan terlalu lama (>60 detik). Coba gunakan audio yang lebih pendek.');
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(500, 'KONEKSI_GAGAL', 'Tidak dapat terhubung ke server backend Sonalyze. Pastikan server aktif di port 8080.');
  }
}


export async function predictLiveAudio(blob: Blob, baselineRms: number = 0): Promise<LivePredictResponse> {
  const formData = new FormData();
  formData.append('file', blob, 'live.wav');
  if (baselineRms > 0) {
    formData.append('baseline_rms', baselineRms.toString());
  }

  const res = await fetch(`${API_BASE}/predict-live`, {
    method: 'POST',
    body: formData,
    cache: 'no-store'
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Gagal memproses audio real-time');
  }

  return res.json();
}
