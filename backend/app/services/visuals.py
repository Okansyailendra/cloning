import numpy as np
import librosa

def generate_visual_data(y_raw: np.ndarray, sr: int = 22050, max_waveform_points: int = 2000, max_time_bins: int = 300) -> dict:
    # 1. Waveform downsampling (min & max per bin, normalized -1..1)
    N = len(y_raw)
    if N <= max_waveform_points:
        downsampled_min = [float(round(v, 4)) for v in y_raw]
        downsampled_max = [float(round(v, 4)) for v in y_raw]
        points = N
    else:
        points = max_waveform_points
        bin_size = N / points
        downsampled_min = []
        downsampled_max = []
        for i in range(points):
            start_idx = int(i * bin_size)
            end_idx = int((i + 1) * bin_size) if i < points - 1 else N
            chunk = y_raw[start_idx:end_idx]
            if len(chunk) > 0:
                downsampled_min.append(float(round(float(np.min(chunk)), 4)))
                downsampled_max.append(float(round(float(np.max(chunk)), 4)))
            else:
                downsampled_min.append(0.0)
                downsampled_max.append(0.0)

    # 2. Spectrogram (Mel 64, hop=512, fmax=11025, power_to_db 80, mapped 0..255)
    S = librosa.feature.melspectrogram(y=y_raw, sr=sr, n_fft=2048, hop_length=512, n_mels=64, fmax=11025)
    S_db = librosa.power_to_db(S, ref=np.max, top_db=80.0)
    
    # Map linearly [-80, 0] dB to integer [0, 255]
    mapped = np.clip(np.round(((S_db + 80.0) / 80.0) * 255.0), 0, 255).astype(int)
    
    n_frames_raw = mapped.shape[1]
    target_frames = min(max_time_bins, n_frames_raw)
    
    if n_frames_raw > target_frames:
        frame_bin_size = n_frames_raw / target_frames
        downsampled_spec = np.zeros((64, target_frames), dtype=int)
        for j in range(target_frames):
            c_start = int(j * frame_bin_size)
            c_end = int((j + 1) * frame_bin_size) if j < target_frames - 1 else n_frames_raw
            sub_chunk = mapped[:, c_start:c_end]
            if sub_chunk.shape[1] > 0:
                downsampled_spec[:, j] = np.clip(np.round(np.mean(sub_chunk, axis=1)), 0, 255).astype(int)
        final_spec_data = downsampled_spec.tolist()
    else:
        target_frames = n_frames_raw
        final_spec_data = mapped.tolist()

    duration_s = float(N / sr)
    hop_s = float(round(duration_s / target_frames, 4)) if target_frames > 0 else 0.0
    
    mel_freqs = librosa.mel_frequencies(n_mels=64, fmin=0.0, fmax=11025.0)
    freqs_hz = [float(round(float(f), 1)) for f in mel_freqs]

    return {
        "waveform": {
            "points": points,
            "min": downsampled_min,
            "max": downsampled_max
        },
        "spectrogram": {
            "n_mels": 64,
            "n_frames": target_frames,
            "hop_s": hop_s,
            "freqs_hz": freqs_hz,
            "db_range": [-80.0, 0.0],
            "data": final_spec_data
        }
    }
