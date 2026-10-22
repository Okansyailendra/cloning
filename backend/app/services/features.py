import librosa
import numpy as np
import pandas as pd

FEATURE_NAMES = [
    'rms_mean', 'rms_std', 'mfcc1_mean', 'mfcc3_mean', 'mfcc5_mean',
    'mfcc13_mean', 'mfcc6_mean', 'centroid_mean', 'mfcc7_mean', 'zcr_mean',
    'mfcc8_mean', 'mfcc11_mean', 'mfcc10_mean', 'mfcc9_mean'
]

DISPLAY_NAMES = {
    'rms_mean': 'Volume Rata-rata',
    'rms_std': 'Variasi Volume (Dinamika)',
    'mfcc1_mean': 'Bentuk Spektral Utama (MFCC 1)',
    'mfcc2_mean': 'Timbre MFCC 2',
    'mfcc3_mean': 'Timbre MFCC 3',
    'mfcc4_mean': 'Timbre MFCC 4',
    'mfcc5_mean': 'Timbre MFCC 5',
    'mfcc6_mean': 'Timbre MFCC 6',
    'mfcc7_mean': 'Timbre MFCC 7',
    'mfcc8_mean': 'Timbre MFCC 8',
    'mfcc9_mean': 'Timbre MFCC 9',
    'mfcc10_mean': 'Timbre MFCC 10',
    'mfcc11_mean': 'Timbre MFCC 11',
    'mfcc12_mean': 'Timbre MFCC 12',
    'mfcc13_mean': 'Timbre MFCC 13',
    'zcr_mean': 'Zero Crossing Rate (Desis)',
    'centroid_mean': 'Pusat Frekuensi (Kecerahan)'
}

UNITS = {
    'rms_mean': '',
    'rms_std': '',
    'mfcc1_mean': '',
    'mfcc2_mean': '',
    'mfcc3_mean': '',
    'mfcc4_mean': '',
    'mfcc5_mean': '',
    'mfcc6_mean': '',
    'mfcc7_mean': '',
    'mfcc8_mean': '',
    'mfcc9_mean': '',
    'mfcc10_mean': '',
    'mfcc11_mean': '',
    'mfcc12_mean': '',
    'mfcc13_mean': '',
    'zcr_mean': '',
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
            'rms_std': float(np.std(ch_rms, ddof=0)),
            'centroid_mean': float(np.mean(ch_cent)),
            'zcr_mean': float(np.mean(ch_zcr))
        }
        for k in range(13):
            ch_dict[f'mfcc{k+1}_mean'] = float(np.mean(ch_mfcc[k, :]))
        chunk_features_list.append(ch_dict)

    cat_rms = np.hstack(rms_list)
    cat_cent = np.hstack(cent_list)
    cat_zcr = np.hstack(zcr_list)
    cat_mfcc = np.hstack(mfcc_list)

    # All features matching retrained model
    feature_dict = {
        'rms_mean': float(np.mean(cat_rms)),
        'rms_std': float(np.std(cat_rms, ddof=0)),
        'centroid_mean': float(np.mean(cat_cent)),
        'zcr_mean': float(np.mean(cat_zcr))
    }
    for k in range(13):
        feature_dict[f'mfcc{k+1}_mean'] = float(np.mean(cat_mfcc[k, :]))

    # All 13 MFCC means for profile visualization
    mfcc_13_profile = [float(np.mean(cat_mfcc[k, :])) for k in range(13)]

    return feature_dict, chunk_features_list, mfcc_13_profile
