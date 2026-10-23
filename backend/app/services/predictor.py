import os
import joblib
import pandas as pd
import numpy as np
from app.services.features import FEATURE_NAMES

class AudioPredictor:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = None
        self.selected_features = FEATURE_NAMES
        self.classes = ['berisik', 'non-berisik']
        self.load_model()

    def load_model(self):
        if not os.path.exists(self.model_path):
            return
        bundle = joblib.load(self.model_path)
        if isinstance(bundle, dict):
            self.model = bundle['model']
            self.selected_features = bundle.get('selected_features', FEATURE_NAMES)
            self.classes = list(self.model.classes_)
        else:
            self.model = bundle
            self.classes = list(self.model.classes_)

    def predict(self, feature_dict: dict):
        if self.model is None:
            self.load_model()
        df = pd.DataFrame([feature_dict])[self.selected_features]
        pred_label = self.model.predict(df)[0]
        probas = self.model.predict_proba(df)[0]
        
        prob_dict = {cls: float(round(probas[idx], 4)) for idx, cls in enumerate(self.classes)}
        
        # Acoustic energy calibration:
        # If physical volume is high (RMS >= 0.080), prevent false-negative quiet classification
        rms = float(feature_dict.get('rms_mean', 0.0))
        if rms >= 0.080 and pred_label == 'non-berisik':
            p_berisik = max(prob_dict.get('berisik', 0.0), min(0.92, 0.55 + (rms - 0.08) * 3.5))
            prob_dict['berisik'] = round(p_berisik, 4)
            prob_dict['non-berisik'] = round(1.0 - p_berisik, 4)
            pred_label = 'berisik'
            
        confidence = float(round(prob_dict[pred_label], 4))
        
        return pred_label, confidence, prob_dict

    def predict_chunks(self, chunk_features_list: list, chunk_duration_s: float = 3.0):
        if self.model is None:
            self.load_model()
        results = []
        for i, ch_dict in enumerate(chunk_features_list):
            start_s = ch_dict.get('start_s', round(i * chunk_duration_s, 2))
            end_s = ch_dict.get('end_s', round((i + 1) * chunk_duration_s, 2))
            
            # Silent / senyap segment handling
            if ch_dict.get('is_silent', False) or ch_dict.get('rms_mean', 0.0) < 0.003:
                results.append({
                    "index": i,
                    "start_s": start_s,
                    "end_s": end_s,
                    "label": "non-berisik",
                    "confidence": 0.99,
                    "probabilities": {"berisik": 0.01, "non-berisik": 0.99}
                })
                continue
                
            df_ch = pd.DataFrame([ch_dict])[self.selected_features]
            ch_pred = self.model.predict(df_ch)[0]
            ch_proba = self.model.predict_proba(df_ch)[0]
            
            p_dict = {cls: float(round(ch_proba[idx], 4)) for idx, cls in enumerate(self.classes)}
            
            # Acoustic calibration for individual chunk
            rms = float(ch_dict.get('rms_mean', 0.0))
            if rms >= 0.075 and ch_pred == 'non-berisik':
                p_berisik = max(p_dict.get('berisik', 0.0), min(0.92, 0.55 + (rms - 0.075) * 3.5))
                p_dict['berisik'] = round(p_berisik, 4)
                p_dict['non-berisik'] = round(1.0 - p_berisik, 4)
                ch_pred = 'berisik'
                
            confidence = float(round(p_dict[ch_pred], 4))
            results.append({
                "index": i,
                "start_s": start_s,
                "end_s": end_s,
                "label": ch_pred,
                "confidence": confidence,
                "probabilities": p_dict
            })
        return results
