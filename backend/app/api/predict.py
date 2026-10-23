import os
import time
import uuid
import json
import tempfile
import asyncio
import io
import soundfile as sf
import librosa
import numpy as np
from fastapi import APIRouter, UploadFile, File, Request, Response
from app.schemas import PredictResponse
from app.errors import AppError
from app.config import settings
from app.services.audio_loader import validate_audio_file, load_and_preprocess_audio
from app.services.features import extract_features, extract_timeline_chunks, FEATURE_NAMES, DISPLAY_NAMES, UNITS
from app.services.explain import get_layman_explanation
from app.services.visuals import generate_visual_data

router = APIRouter()

IMPORTANCES = {
    "rms_mean": 0.1992, "rms_std": 0.1071, "mfcc3_mean": 0.0874, "mfcc1_mean": 0.0827,
    "mfcc5_mean": 0.0797, "mfcc7_mean": 0.0573, "mfcc11_mean": 0.0547, "zcr_mean": 0.0520,
    "centroid_mean": 0.0496, "mfcc13_mean": 0.0494, "mfcc10_mean": 0.0479, "mfcc8_mean": 0.0460,
    "mfcc6_mean": 0.0452, "mfcc9_mean": 0.0417
}


@router.post("/predict", response_model=PredictResponse)
async def predict_audio(request: Request, response: Response, file: UploadFile = File(None)):
    t0 = time.time()
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    response.headers["X-Request-ID"] = req_id
    response.headers["Cache-Control"] = "no-store"
    
    if file is None or not file.filename:
        raise AppError(400, "FILE_TIDAK_ADA", "Tidak ada file yang dikirim. Pilih file audio terlebih dahulu.")
        
    filename = file.filename
    content = await file.read()
    validate_audio_file(content, filename, max_mb=settings.MAX_FILE_MB)
    
    ext = os.path.splitext(filename)[1].lower()
    
    # Save to temp file
    tmp_dir = os.path.join(tempfile.gettempdir(), "soundlab")
    os.makedirs(tmp_dir, exist_ok=True)
    temp_path = os.path.join(tmp_dir, f"{uuid.uuid4()}{ext}")
    
    try:
        with open(temp_path, "wb") as f_out:
            f_out.write(content)
            
        t_load_start = time.time()
        # Audio loading & preprocessing
        audio_data = await asyncio.to_thread(load_and_preprocess_audio, temp_path)
        load_ms = int((time.time() - t_load_start) * 1000)
        
        y_raw = audio_data["y_raw"]
        y_clean = audio_data["y_clean"]
        sr = audio_data["sr"]
        duration_s = round(audio_data["duration_s"], 2)
        processed_duration_s = round(audio_data["processed_duration_s"], 2)
        silence_removed_s = round(audio_data["silence_removed_s"], 2)
        active_intervals = audio_data["active_intervals"]
        warnings = list(audio_data.get("warnings", []))
        
        # Audio clipping check (>1% samples at >= 0.99)
        clip_ratio = np.mean(np.abs(y_raw) >= 0.99)
        if clip_ratio > 0.01:
            warnings.append("AUDIO_CLIPPING")
            
        # Dominant silence (>70% removed)
        if duration_s > 0 and (silence_removed_s / duration_s) > 0.7:
            warnings.append("HENING_DOMINAN")
            
        # Features extraction
        t_feat_start = time.time()
        feature_dict, _, mfcc_profile = await asyncio.to_thread(extract_features, y_clean, sr=sr)
        # Sequential timeline chunks covering the full audio duration from y_raw
        timeline_chunk_features = await asyncio.to_thread(extract_timeline_chunks, y_raw, sr=sr, chunk_dur=3.0)
        features_ms = int((time.time() - t_feat_start) * 1000)
        
        # Predict
        t_pred_start = time.time()
        predictor = getattr(request.app.state, "predictor", None)
        if predictor is None or predictor.model is None:
            raise AppError(503, "MODEL_BELUM_SIAP", "Model sedang dimuat. Coba lagi dalam beberapa detik.")
            
        pred_label, confidence, prob_dict = predictor.predict(feature_dict)
        chunk_preds = predictor.predict_chunks(timeline_chunk_features, chunk_duration_s=3.0)
        predict_ms = int((time.time() - t_pred_start) * 1000)
        
        # Confidence warning check
        low_confidence = bool(confidence < settings.CONFIDENCE_WARN_THRESHOLD)
        if low_confidence:
            warnings.append("CONFIDENCE_RENDAH")
            
        # Audio pendek dipad warning check
        if audio_data["processed_duration_s"] < 3.0:
            if "AUDIO_PENDEK_DIPAD" not in warnings:
                warnings.append("AUDIO_PENDEK_DIPAD")
                
        # Class means & layman explanation
        class_means = getattr(request.app.state, "class_means", {})
        explanation = get_layman_explanation(feature_dict, pred_label, class_means)
        
        # Visual data
        visuals = await asyncio.to_thread(generate_visual_data, y_raw, sr=sr)
        
        # Features detail list
        means = class_means.get("mean", {})
        feat_items = []
        for rank, f_name in enumerate(FEATURE_NAMES, start=1):
            val = feature_dict.get(f_name, 0.0)
            mu_b = means.get("berisik", {}).get(f_name, 0.0)
            mu_nb = means.get("non-berisik", {}).get(f_name, 0.0)
            nearer = "berisik" if abs(val - mu_b) <= abs(val - mu_nb) else "non-berisik"
            
            # Decimal precision rounding per api-spec §7
            if f_name in ["rms_mean", "rms_std", "zcr_mean"]:
                val_rounded = float(round(val, 6))
            elif f_name == "centroid_mean":
                val_rounded = float(round(val, 2))
            else:
                val_rounded = float(round(val, 4))
                
            feat_items.append({
                "rank": rank,
                "name": f_name,
                "display_name": DISPLAY_NAMES.get(f_name, f_name),
                "unit": UNITS.get(f_name, ""),
                "value": val_rounded,
                "class_mean": {
                    "berisik": float(round(mu_b, 4)),
                    "non-berisik": float(round(mu_nb, 4))
                },
                "nearer_class": nearer,
                "importance": float(round(class_means.get("importance", {}).get(f_name, IMPORTANCES.get(f_name, 0.05)), 4))
            })
            
        total_ms = int((time.time() - t0) * 1000)
        
        return PredictResponse(
            request_id=req_id,
            file={
                "name": filename,
                "size_bytes": len(content),
                "extension": ext
            },
            audio={
                "duration_s": duration_s,
                "processed_duration_s": processed_duration_s,
                "sample_rate": sr,
                "n_chunks": len(chunk_preds),
                "silence_removed_s": silence_removed_s,
                "active_intervals": active_intervals
            },
            prediction={
                "label": pred_label,
                "label_display": pred_label.upper(),
                "confidence": float(round(confidence, 4)),
                "probabilities": {cls: float(round(p, 4)) for cls, p in prob_dict.items()},
                "low_confidence": low_confidence,
                "warn_threshold": settings.CONFIDENCE_WARN_THRESHOLD
            },
            features=feat_items,
            mfcc_profile={
                "values": [float(round(v, 4)) for v in mfcc_profile]
            },
            explanation=explanation,
            chunks=chunk_preds,
            visual=visuals,
            timing={
                "total_ms": total_ms,
                "load_ms": load_ms,
                "features_ms": features_ms,
                "predict_ms": predict_ms
            },
            warnings=warnings
        )
        
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@router.post("/predict-live", response_model=dict)
async def predict_live_chunk(request: Request, response: Response, file: UploadFile = File(None)):
    response.headers["Cache-Control"] = "no-store"
    
    if file is None:
        raise AppError(400, "FILE_TIDAK_ADA", "Tidak ada buffer audio yang dikirim.")
        
    content = await file.read()
    if len(content) == 0:
        raise AppError(400, "FILE_KOSONG", "Buffer audio kosong.")
        
    try:
        y, sr = sf.read(io.BytesIO(content))
        if len(y.shape) > 1:
            y = np.mean(y, axis=1) # convert stereo to mono
        y = y.astype(np.float32)
    except Exception:
        # Fallback to temp file if soundfile memory read fails
        import tempfile
        t_path = os.path.join(tempfile.gettempdir(), f"live_{uuid.uuid4()}.wav")
        with open(t_path, "wb") as f_tmp:
            f_tmp.write(content)
        y, sr = librosa.load(t_path, sr=22050, mono=True)
        try:
            os.remove(t_path)
        except Exception:
            pass
            
    if sr != 22050:
        y = librosa.resample(y, orig_sr=sr, target_sr=22050)
        
    target_samples = 22050 * 3
    if len(y) < target_samples:
        if len(y) > 0:
            n_rep = int(np.ceil(target_samples / len(y)))
            y = np.tile(y, n_rep)[:target_samples]
        else:
            y = np.zeros(target_samples, dtype=np.float32)
    elif len(y) > target_samples:
        y = y[-target_samples:] # take the most recent 3 seconds
        
    max_amp = float(np.max(np.abs(y))) if len(y) > 0 else 0.0
    rms_raw_arr = librosa.feature.rms(y=y)
    rms_raw_mean = float(np.mean(rms_raw_arr)) if len(rms_raw_arr) > 0 else 0.0
    peak_rms = float(np.max(rms_raw_arr)) if len(rms_raw_arr) > 0 else 0.0

    # True silence check
    if max_amp < 1e-4 or rms_raw_mean < 0.003:
        pred_label = 'non-berisik'
        confidence = 0.99
        prob_dict = {'berisik': 0.01, 'non-berisik': 0.99}
        rms_val = round(max(0.0005, rms_raw_mean), 4)
        centroid_val = 500.0
        zcr_val = 0.01
        feat_dict = {
            'mfcc1_mean': -500.0,
            'mfcc3_mean': 0.0,
            'rms_std': 0.0001
        }
        status_text = "Kondisi Ruangan: SANGAT TENANG (Nyaris tanpa kebisingan)"
    else:
        # Check active speech/sound vs silence (matching model training top_db parity)
        intervals = librosa.effects.split(y, top_db=25)
        if len(intervals) > 0 and len(intervals) < len(y):
            y_active = np.concatenate([y[s:e] for s, e in intervals])
            if len(y_active) >= 11025: # at least 0.5s of sound
                n_rep = int(np.ceil(target_samples / len(y_active)))
                y_eval = np.tile(y_active, n_rep)[:target_samples]
            else:
                y_eval = y
        else:
            y_eval = y

        rms_arr = librosa.feature.rms(y=y_eval)
        cent_arr = librosa.feature.spectral_centroid(y=y_eval, sr=22050)
        zcr_arr = librosa.feature.zero_crossing_rate(y=y_eval)
        mfcc_mat = librosa.feature.mfcc(y=y_eval, sr=22050, n_mfcc=13)
        
        feat_dict = {
            'rms_mean': float(np.mean(rms_arr)),
            'rms_std': float(np.std(rms_arr, ddof=0)),
            'centroid_mean': float(np.mean(cent_arr)),
            'zcr_mean': float(np.mean(zcr_arr))
        }
        for k in range(13):
            feat_dict[f'mfcc{k+1}_mean'] = float(np.mean(mfcc_mat[k, :]))
        
        predictor = getattr(request.app.state, "predictor", None)
        if predictor is None or predictor.model is None:
            raise AppError(503, "MODEL_BELUM_SIAP", "Model sedang dimuat.")
            
        pred_label, confidence, prob_dict = predictor.predict(feat_dict)
        
        rms_val = round(feat_dict['rms_mean'], 4)
        centroid_val = round(feat_dict['centroid_mean'], 1)
        zcr_val = round(feat_dict['zcr_mean'], 4)

        # High-amplitude acoustic sanity check:
        # If the sound has high energy (peak RMS >= 0.10 or mean RMS >= 0.075), it is physically loud/noisy
        if (rms_val >= 0.075 or peak_rms >= 0.10) and pred_label == 'non-berisik':
            pred_label = 'berisik'
            p_berisik = max(prob_dict.get('berisik', 0.0), min(0.95, 0.55 + max(rms_val - 0.075, peak_rms - 0.10) * 3.5))
            prob_dict['berisik'] = round(p_berisik, 4)
            prob_dict['non-berisik'] = round(1.0 - p_berisik, 4)
            confidence = p_berisik

        # Human-friendly live status
        if pred_label == 'berisik':
            if rms_val >= 0.075 or peak_rms >= 0.10:
                status_text = "Kondisi Ruangan: BERISIK TINGGI (Aktivitas keras / bising intens)"
            else:
                status_text = "Kondisi Ruangan: BERISIK (Suara latar bising terdeteksi)"
        else:
            if rms_val < 0.02:
                status_text = "Kondisi Ruangan: SANGAT TENANG (Nyaris tanpa kebisingan)"
            else:
                status_text = "Kondisi Ruangan: NON-BERISIK (Kondisi kerja kondusif)"
                
    low_confidence = bool(confidence < settings.CONFIDENCE_WARN_THRESHOLD)
    
    import datetime
    now_str = datetime.datetime.now().strftime("%H:%M:%S")
    
    return {
        "timestamp": now_str,
        "label": pred_label,
        "label_display": pred_label.upper(),
        "confidence": float(round(confidence, 4)),
        "probabilities": prob_dict,
        "rms": rms_val,
        "centroid_hz": centroid_val,
        "zcr": zcr_val,
        "low_confidence": low_confidence,
        "status_text": status_text,
        "mfcc1": float(round(feat_dict['mfcc1_mean'], 2)),
        "mfcc3": float(round(feat_dict['mfcc3_mean'], 2)),
        "rms_std": float(round(feat_dict['rms_std'], 4))
    }
