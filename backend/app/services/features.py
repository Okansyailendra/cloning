import librosa
import numpy as np
import pandas as pd

FEATURE_NAMES = [
    'rms_mean', 'mfcc1_mean', 'rms_std', 'mfcc3_mean', 'zcr_mean',
    'mfcc6_mean', 'mfcc7_mean', 'mfcc13_mean', 'mfcc5_mean', 'centroid_mean'
]

DISPLAY_NAMES = {
    'rms_mean': 'Volume Rata-rata',
    'mfcc1_mean': 'Bentuk Spektral Utama (MFCC 1)',
    'rms_std': 'Variasi Volume (Dinamika)',
    'mfcc3_mean': 'Timbre MFCC 3',
    'zcr_mean': 'Zero Crossing Rate (Desis)',
    'mfcc6_mean': 'Timbre MFCC 6',
    'mfcc7_mean': 'Timbre MFCC 7',
    'mfcc13_mean': 'Timbre MFCC 13',
    'mfcc5_mean': 'Timbre MFCC 5',
    'centroid_mean': 'Pusat Frekuensi (Kecerahan)'
}

UNITS = {
    'rms_mean': '',
    'mfcc1_mean': '',
    'rms_std': '',
    'mfcc3_mean': '',
    'zcr_mean': '',
    'mfcc6_mean': '',
    'mfcc7_mean': '',
    'mfcc13_mean': '',
    'mfcc5_mean': '',
    'centroid_mean': 'Hz'
}

def extract_features(y_clean: np.ndarray, sr: int = 22050, chunk_dur: int = 3):
    chunk_samples = sr * chunk_dur
    num_chunks = max(1, len(y_clean) // chunk_samples)
    
    chunks = []
    for i in range(num_chunks):
        chunks.append(y_clean[i * chunk_samples : (i + 1) * chunk_samples])
        
    rms_list, cent_list, zcr_list, mfcc_list = [], [], [], []
    chunk_features_list = []
    
    for idx, ch in enumerate(chunks):
        ch_rms = librosa.feature.rms(y=ch)
        ch_cent = librosa.feature.spectral_centroid(y=ch, sr=sr)
        ch_zcr = librosa.feature.zero_crossing_rate(y=ch)
        ch_mfcc = librosa.feature.mfcc(y=ch, sr=sr, n_mfcc=13)
        
        rms_list.append(ch_rms)
        cent_list.append(ch_cent)
        zcr_list.append(ch_zcr)
        mfcc_list.append(ch_mfcc)
        
        # Per chunk feature dictionary (for chunk-level prediction)
        ch_dict = {
            'rms_mean': float(np.mean(ch_rms)),
            'mfcc1_mean': float(np.mean(ch_mfcc[0, :])),
            'rms_std': float(np.std(ch_rms, ddof=0)),
            'mfcc3_mean': float(np.mean(ch_mfcc[2, :])),
            'zcr_mean': float(np.mean(ch_zcr)),
            'mfcc6_mean': float(np.mean(ch_mfcc[5, :])),
            'mfcc7_mean': float(np.mean(ch_mfcc[6, :])),
            'mfcc13_mean': float(np.mean(ch_mfcc[12, :])),
            'mfcc5_mean': float(np.mean(ch_mfcc[4, :])),
            'centroid_mean': float(np.mean(ch_cent))
        }
        chunk_features_list.append(ch_dict)

    cat_rms = np.hstack(rms_list)
    cat_cent = np.hstack(cent_list)
    cat_zcr = np.hstack(zcr_list)
    cat_mfcc = np.hstack(mfcc_list)

    # 10 Selected Features matching model training exact order
    feature_dict = {
        'rms_mean': float(np.mean(cat_rms)),
        'mfcc1_mean': float(np.mean(cat_mfcc[0, :])),
        'rms_std': float(np.std(cat_rms, ddof=0)),
        'mfcc3_mean': float(np.mean(cat_mfcc[2, :])),
        'zcr_mean': float(np.mean(cat_zcr)),
        'mfcc6_mean': float(np.mean(cat_mfcc[5, :])),
        'mfcc7_mean': float(np.mean(cat_mfcc[6, :])),
        'mfcc13_mean': float(np.mean(cat_mfcc[12, :])),
        'mfcc5_mean': float(np.mean(cat_mfcc[4, :])),
        'centroid_mean': float(np.mean(cat_cent))
    }

    # All 13 MFCC means for profile visualization
    mfcc_13_profile = [float(np.mean(cat_mfcc[k, :])) for k in range(13)]

    return feature_dict, chunk_features_list, mfcc_13_profile
