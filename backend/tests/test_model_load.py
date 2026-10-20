import os
import warnings
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

try:
    import pytest
except ImportError:
    pytest = None

EXPECTED_FEATURES = [
    'rms_mean', 'mfcc1_mean', 'rms_std', 'mfcc3_mean', 'zcr_mean',
    'mfcc6_mean', 'mfcc7_mean', 'mfcc13_mean', 'mfcc5_mean', 'centroid_mean'
]

def test_model_loading_and_spec():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    model_path = os.path.join(base_dir, 'data', 'model_klasifikasi_audio.pkl')
    
    assert os.path.exists(model_path), f"Model file not found: {model_path}"
    
    with warnings.catch_warnings(record=True) as recorded_warnings:
        warnings.simplefilter("always")
        bundle = joblib.load(model_path)
        
        # 1. Cek warning versi scikit-learn
        version_warnings = [w for w in recorded_warnings if 'InconsistentVersionWarning' in str(w.message)]
        assert len(version_warnings) == 0, f"Found version warnings: {version_warnings}"
        
    model = bundle['model'] if isinstance(bundle, dict) else bundle
    selected_features = bundle.get('selected_features', EXPECTED_FEATURES) if isinstance(bundle, dict) else EXPECTED_FEATURES
    
    # 2. Cek tipe model
    assert isinstance(model, RandomForestClassifier), "Model must be a RandomForestClassifier"
    
    # 3. Cek jumlah fitur
    assert getattr(model, 'n_features_in_', len(selected_features)) == 10, "Model must expect exactly 10 features"
    
    # 4. Cek urutan 10 fitur
    assert list(selected_features) == EXPECTED_FEATURES, "Feature order mismatch"
    
    # 5. Cek kelas prediksi
    assert list(model.classes_) == ['berisik', 'non-berisik'], "Classes must be ['berisik', 'non-berisik']"
    assert len(model.classes_) == 2, "Must have exactly 2 classes"
    
    # 6. Cek hyperparameter dasar
    assert model.n_estimators == 100, "n_estimators must be 100"
    
    # 7. Tes inferensi dummy
    dummy_input = pd.DataFrame([np.zeros(10)], columns=EXPECTED_FEATURES)
    pred = model.predict(dummy_input)
    proba = model.predict_proba(dummy_input)
    
    assert pred[0] in ['berisik', 'non-berisik'], "Prediction must be in valid classes"
    assert proba.shape == (1, 2), "Probabilities shape must be (1, 2)"
    assert np.isclose(np.sum(proba), 1.0), "Probabilities must sum to 1"

if __name__ == '__main__':
    test_model_loading_and_spec()
    print("ALL 7 MODEL SPEC CHECKS PASSED SUCCESSFULLY!")
