export interface FileInfo {
  name: string;
  size_bytes: number;
  extension: string;
}

export interface AudioSummary {
  duration_s: number;
  processed_duration_s: number;
  sample_rate: number;
  n_chunks: number;
  silence_removed_s: number;
  active_intervals: [number, number][];
}

export interface PredictionResult {
  label: 'berisik' | 'non-berisik';
  label_display: 'BERISIK' | 'NON-BERISIK';
  confidence: number;
  probabilities: {
    berisik: number;
    'non-berisik': number;
  };
  low_confidence: boolean;
  warn_threshold: number;
}

export interface FeatureItem {
  rank: number;
  name: string;
  display_name: string;
  unit: string;
  value: number;
  class_mean: {
    berisik: number;
    'non-berisik': number;
  };
  nearer_class: 'berisik' | 'non-berisik';
  importance: number;
}

export interface MFCCProfile {
  values: number[];
}

export interface ExplanationReason {
  feature: string;
  direction: 'lebih_tinggi' | 'lebih_rendah';
  strength: 'kuat' | 'sedang' | 'lemah';
  text: string;
}

export interface ExplanationResult {
  summary: string;
  reasons: ExplanationReason[];
  counter_reasons: ExplanationReason[];
}

export interface ChunkResult {
  index: number;
  start_s: number;
  end_s: number;
  label: 'berisik' | 'non-berisik';
  confidence: number;
  probabilities: {
    berisik: number;
    'non-berisik': number;
  };
}

export interface WaveformVisual {
  points: number;
  min: number[];
  max: number[];
}

export interface SpectrogramVisual {
  n_mels: number;
  n_frames: number;
  hop_s: number;
  freqs_hz: number[];
  db_range: [number, number];
  data: number[][];
}

export interface VisualResult {
  waveform: WaveformVisual;
  spectrogram: SpectrogramVisual;
}

export interface TimingResult {
  total_ms: number;
  load_ms: number;
  features_ms: number;
  predict_ms: number;
}

export interface PredictResponse {
  request_id: string;
  file: FileInfo;
  audio: AudioSummary;
  prediction: PredictionResult;
  features: FeatureItem[];
  mfcc_profile: MFCCProfile;
  explanation: ExplanationResult;
  chunks: ChunkResult[];
  visual: VisualResult;
  timing: TimingResult;
  warnings: string[];
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  sklearn_version: string;
  uptime_s: number;
}

export interface ModelComparisonItem {
  name: string;
  accuracy: number;
}

export interface ModelInfoResponse {
  model: {
    name: string;
    algorithm: string;
    hyperparameters: Record<string, any>;
    sklearn_version: string;
    n_features: number;
    classes: string[];
  };
  pipeline: {
    target_sr: number;
    top_db: number;
    chunk_duration_s: number;
    silence_removal: string;
    n_mfcc: number;
  };
  features: Array<{
    rank: number;
    name: string;
    display_name: string;
    description: string;
    unit: string;
    importance: number;
  }>;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    roc_auc: number;
    cv_mean: number;
    cv_std: number;
    confusion_matrix: {
      labels: string[];
      matrix: number[][];
    };
  };
  model_comparison: ModelComparisonItem[];
  dataset: {
    total_files: number;
    train: number;
    test: number;
    split: string;
    source_sr_hz: number;
  };
  class_means: any;
  limits: {
    max_file_mb: number;
    max_duration_s: number;
    min_duration_s: number;
    accepted_extensions: string[];
    warn_threshold: number;
  };
  samples: Array<{
    id: string;
    title: string;
    expected_label: string;
    duration_s: number;
    url: string;
  }>;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  filename: string;
  duration_s: number;
  label: 'berisik' | 'non-berisik';
  confidence: number;
  rms_mean: number;
  centroid_mean: number;
  zcr_mean: number;
  full_response?: PredictResponse;
}


export interface LivePredictResponse {
  timestamp: string;
  label: 'berisik' | 'non-berisik';
  label_display: 'BERISIK' | 'NON-BERISIK';
  confidence: number;
  probabilities: {
    berisik: number;
    'non-berisik': number;
  };
  rms: number;
  centroid_hz: number;
  zcr: number;
  low_confidence: boolean;
  status_text: string;
  mfcc1?: number;
  mfcc3?: number;
  rms_std?: number;
}

export interface LiveHistoryPoint {
  time: string;
  label: 'berisik' | 'non-berisik';
  confidence: number;
  rms: number;
}
