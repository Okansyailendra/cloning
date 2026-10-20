from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class FileInfo(BaseModel):
    name: str
    size_bytes: int
    extension: str

class AudioSummary(BaseModel):
    duration_s: float
    processed_duration_s: float
    sample_rate: int
    n_chunks: int
    silence_removed_s: float
    active_intervals: List[List[float]]

class PredictionResult(BaseModel):
    label: str
    label_display: str
    confidence: float
    probabilities: Dict[str, float]
    low_confidence: bool
    warn_threshold: float

class FeatureItem(BaseModel):
    rank: int
    name: str
    display_name: str
    unit: str
    value: float
    class_mean: Dict[str, float]
    nearer_class: str
    importance: float

class MFCCProfile(BaseModel):
    values: List[float]

class ExplanationReason(BaseModel):
    feature: str
    direction: str
    strength: str
    text: str

class ExplanationResult(BaseModel):
    summary: str
    reasons: List[ExplanationReason]
    counter_reasons: List[ExplanationReason]

class ChunkResult(BaseModel):
    index: int
    start_s: float
    end_s: float
    label: str
    confidence: float
    probabilities: Dict[str, float]

class WaveformVisual(BaseModel):
    points: int
    min: List[float]
    max: List[float]

class SpectrogramVisual(BaseModel):
    n_mels: int
    n_frames: int
    hop_s: float
    freqs_hz: List[float]
    db_range: List[float]
    data: List[List[int]]

class VisualResult(BaseModel):
    waveform: WaveformVisual
    spectrogram: SpectrogramVisual

class TimingResult(BaseModel):
    total_ms: int
    load_ms: int
    features_ms: int
    predict_ms: int

class PredictResponse(BaseModel):
    request_id: str
    file: FileInfo
    audio: AudioSummary
    prediction: PredictionResult
    features: List[FeatureItem]
    mfcc_profile: MFCCProfile
    explanation: ExplanationResult
    chunks: List[ChunkResult]
    visual: VisualResult
    timing: TimingResult
    warnings: List[str]

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    sklearn_version: str
    uptime_s: int

class ModelInfoResponse(BaseModel):
    model: Dict[str, Any]
    pipeline: Dict[str, Any]
    features: List[Dict[str, Any]]
    metrics: Dict[str, Any]
    model_comparison: List[Dict[str, Any]]
    dataset: Dict[str, Any]
    class_means: Dict[str, Any]
    limits: Dict[str, Any]
    samples: List[Dict[str, Any]]


class LivePredictResponse(BaseModel):
    timestamp: str
    label: str
    label_display: str
    confidence: float
    probabilities: Dict[str, float]
    rms: float
    centroid_hz: float
    zcr: float
    low_confidence: bool
    status_text: str
