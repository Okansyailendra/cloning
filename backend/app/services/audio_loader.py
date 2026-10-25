import os
import io
import time
import librosa
import soundfile as sf
import numpy as np
from app.errors import AppError

MAGIC_BYTES = {
    b'ID3': '.mp3',
    b'\xff\xfb': '.mp3',
    b'\xff\xf3': '.mp3',
    b'\xff\xf2': '.mp3',
    b'RIFF': '.wav',
    b'OggS': '.ogg',
    b'fLaC': '.flac',
    b'\x1a\x45\xdf\xa3': '.webm'
}

def validate_audio_file(file_bytes: bytes, filename: str, max_mb: int = 15):
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > max_mb:
        raise AppError(
            413, "FILE_TERLALU_BESAR",
            f"Ukuran file {size_mb:.1f} MB melebihi batas {max_mb} MB. Kompres atau potong audio, lalu coba lagi.",
            {"max_mb": max_mb, "size_mb": round(size_mb, 2)}
        )
    if len(file_bytes) == 0:
        raise AppError(400, "FILE_KOSONG", "File kosong (0 byte). Pilih file audio yang berisi rekaman.")
        
    ext = os.path.splitext(filename)[1].lower()
    allowed_exts = ['.mp3', '.wav']
    if ext not in allowed_exts:
        raise AppError(
            415, "FORMAT_TIDAK_DIDUKUNG",
            "Format file tidak didukung. Harap gunakan file audio berformat MP3 (.mp3).",
            {"extension": ext, "allowed": allowed_exts}
        )

def load_and_preprocess_audio(audio_path: str, target_sr: int = 22050, top_db: int = 25):
    try:
        y_raw, sr = librosa.load(audio_path, sr=target_sr, mono=True)
    except Exception as err_librosa:
        # Fallback to ffmpeg for formats like M4A / AAC / WEBM that soundfile cannot decode natively
        try:
            import subprocess
            cmd = ['ffmpeg', '-v', 'quiet', '-i', audio_path, '-f', 'wav', '-ar', str(target_sr), '-ac', '1', 'pipe:1']
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
            if proc.returncode != 0 or len(proc.stdout) == 0:
                raise err_librosa
            y_raw, sr = sf.read(io.BytesIO(proc.stdout), dtype='float32')
        except Exception as e:
            raise AppError(422, "AUDIO_RUSAK", f"File audio tidak dapat dibaca atau rusak. Coba file lain. Detail: {str(e)}")

    duration_s = float(len(y_raw) / sr)
    if duration_s < 0.5:
        raise AppError(422, "AUDIO_TERLALU_PENDEK", f"Audio terlalu pendek ({duration_s:.2f} detik). Minimal 0,5 detik; disarankan 15 detik atau lebih.", {"duration_s": duration_s})
    if duration_s > 120.0:
        raise AppError(422, "AUDIO_TERLALU_PANJANG", f"Audio terlalu panjang ({duration_s:.1f} detik). Maksimal 120 detik.", {"duration_s": duration_s})

    max_amp = float(np.max(np.abs(y_raw))) if len(y_raw) > 0 else 0.0
    if max_amp < 1e-4:
        raise AppError(422, "AUDIO_SENYAP", "Rekaman tidak memuat suara yang dapat dianalisis. Periksa mikrofon atau pilih file lain.")

    rms_raw = float(np.sqrt(np.mean(y_raw**2)))

    # Silence removal: split + concatenate (matching model training parity!)
    intervals = librosa.effects.split(y_raw, top_db=top_db)
    active_intervals = [[float(start / sr), float(end / sr)] for start, end in intervals]

    if len(intervals) > 0:
        parts = [y_raw[start:end] for start, end in intervals]
        y_clean = np.concatenate(parts)
    else:
        y_clean = y_raw
        active_intervals = [[0.0, float(round(duration_s, 2))]]

    processed_duration_s = float(len(y_clean) / sr)
    silence_removed_s = float(max(0.0, duration_s - processed_duration_s))

    # Zero pad if clean audio is shorter than 1 chunk (3 seconds = 66150 samples)
    min_samples = target_sr * 3
    warnings_list = []
    if len(y_clean) < min_samples:
        y_clean = np.pad(y_clean, (0, min_samples - len(y_clean)), mode='constant')
        warnings_list.append("AUDIO_PENDEK_DIPAD")

    return {
        "y_raw": y_raw,
        "y_clean": y_clean,
        "sr": sr,
        "duration_s": duration_s,
        "processed_duration_s": processed_duration_s,
        "rms_raw": rms_raw,
        "silence_removed_s": silence_removed_s,
        "active_intervals": active_intervals,
        "warnings": warnings_list
    }
