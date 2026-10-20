import os
import sys

sys.path.insert(0, r"c:\laragon\www\Bismillah_A\backend")

import numpy as np
import pandas as pd
from app.services.audio_loader import load_and_preprocess_audio
from app.services.features import extract_features, FEATURE_NAMES

def test_feature_parity():
    csv_path = r"c:\laragon\www\Bismillah_A\data\train_data.csv"
    df = pd.read_csv(csv_path)

    audio_dirs = [
        r"C:\Users\OKAN\OneDrive\Dokumen\PSD\materi\audio\berisik",
        r"C:\Users\OKAN\OneDrive\Dokumen\PSD\materi\audio\non-berisik"
    ]

    tested_count = 0
    passed_count = 0

    for idx, row in df.iterrows():
        fname = row['filename']
        found_path = None
        for ad in audio_dirs:
            candidate = os.path.join(ad, fname)
            if os.path.exists(candidate):
                found_path = candidate
                break

        if not found_path:
            continue

        try:
            audio_data = load_and_preprocess_audio(found_path)
            feat_dict, _, _ = extract_features(audio_data['y_clean'], sr=audio_data['sr'])
        except Exception as e:
            continue

        all_ok = True
        diffs = {}
        for f in FEATURE_NAMES:
            actual = feat_dict[f]
            expected = row[f]
            rel_diff = abs(actual - expected) / (abs(expected) + 1e-6)
            abs_diff = abs(actual - expected)
            if rel_diff > 0.05 and abs_diff > 1e-4:
                all_ok = False
                diffs[f] = (actual, expected, rel_diff)

        tested_count += 1
        if all_ok:
            passed_count += 1
            print(f"[PASS] {fname}")
        else:
            print(f"[DIFF] {fname} diffs: {list(diffs.keys())[:3]}")

        if tested_count >= 5:
            break

    print(f"\nPARITY TEST SUMMARY: {passed_count}/{tested_count} files passed parity check!")

if __name__ == '__main__':
    test_feature_parity()
