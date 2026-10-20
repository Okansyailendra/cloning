from app.services.features import FEATURE_NAMES

def get_layman_explanation(feature_dict: dict, pred_label: str, class_means: dict) -> dict:
    P = pred_label
    Q = 'non-berisik' if P == 'berisik' else 'berisik'
    
    means = class_means.get('mean', {})
    pooled_std = class_means.get('pooled_std', {})
    importances = class_means.get('importance', {})
    
    candidates = []
    
    for f in FEATURE_NAMES:
        x_f = feature_dict.get(f, 0.0)
        mu_P = means.get(P, {}).get(f, 0.0)
        mu_Q = means.get(Q, {}).get(f, 0.0)
        sigma = pooled_std.get(f, 0.0)
        
        if sigma <= 1e-9:
            continue
            
        s_f = (abs(x_f - mu_Q) - abs(x_f - mu_P)) / sigma
        imp = importances.get(f, 0.05)
        kontribusi = imp * s_f
        
        arah = 'lebih_tinggi' if mu_P > mu_Q else 'lebih_rendah'
        abs_s = abs(s_f)
        if abs_s >= 1.0:
            kekuatan = 'kuat'
        elif abs_s >= 0.5:
            kekuatan = 'sedang'
        else:
            kekuatan = 'lemah'
            
        k_label = pred_label
        if f == 'rms_mean':
            kalimat = f"Volume rata-rata rekaman ini tinggi, seperti rekaman {k_label}." if arah == 'lebih_tinggi' else f"Volume rata-rata rekaman ini rendah, seperti rekaman {k_label}."
            short_desc = "volume rata-rata tinggi" if arah == 'lebih_tinggi' else "volume rata-rata rendah"
        elif f == 'rms_std':
            kalimat = f"Volume sering berubah keras-pelan, pola khas rekaman {k_label}." if arah == 'lebih_tinggi' else f"Volume relatif stabil, pola khas rekaman {k_label}."
            short_desc = "volume sering berubah keras-pelan" if arah == 'lebih_tinggi' else "volume relatif stabil"
        elif f == 'zcr_mean':
            kalimat = f"Banyak komponen desis atau frekuensi tinggi, mirip rekaman {k_label}." if arah == 'lebih_tinggi' else f"Suara cenderung halus dan sedikit desis, mirip rekaman {k_label}."
            short_desc = "banyak desis frekuensi tinggi" if arah == 'lebih_tinggi' else "suara halus minim desis"
        elif f == 'centroid_mean':
            kalimat = f"Suara terdengar lebih tajam dan cerah, mirip rekaman {k_label}." if arah == 'lebih_tinggi' else f"Suara terdengar lebih berat dan tumpul, mirip rekaman {k_label}."
            short_desc = "suara lebih tajam dan cerah" if arah == 'lebih_tinggi' else "suara lebih berat dan tumpul"
        elif f == 'mfcc1_mean':
            kalimat = f"Bentuk energi suara secara keseluruhan lebih mirip rekaman {k_label}."
            short_desc = "bentuk energi suara keseluruhan"
        else:
            k_no = f.replace('mfcc', '').replace('_mean', '')
            kalimat = f"Warna suara (timbre) pada detail ke-{k_no} lebih mirip rekaman {k_label}."
            short_desc = f"detail warna suara ke-{k_no}"
            
        if kekuatan == 'lemah':
            kalimat = f"Sedikit: {kalimat}"
            
        candidates.append({
            'feature': f,
            'direction': arah,
            'strength': kekuatan,
            'text': kalimat,
            'kontribusi': kontribusi,
            'short_desc': short_desc
        })
        
    positives = sorted([c for c in candidates if c['kontribusi'] > 0], key=lambda x: x['kontribusi'], reverse=True)
    negatives = sorted([c for c in candidates if c['kontribusi'] < 0], key=lambda x: x['kontribusi'])
    
    top_reasons = positives[:3]
    counter_reasons = negatives[:1]
    
    reasons_out = [
        {'feature': r['feature'], 'direction': r['direction'], 'strength': r['strength'], 'text': r['text']}
        for r in top_reasons
    ]
    counter_out = [
        {'feature': r['feature'], 'direction': r['direction'], 'strength': r['strength'], 'text': r['text']}
        for r in counter_reasons
    ]
    
    label_upper = pred_label.upper()
    if len(top_reasons) >= 2:
        summary = f"Hasil {label_upper} terutama karena {top_reasons[0]['short_desc']} dan {top_reasons[1]['short_desc']}."
    elif len(top_reasons) == 1:
        summary = f"Hasil {label_upper} terutama karena {top_reasons[0]['short_desc']}."
    else:
        summary = f"Hasil {label_upper} berdasarkan kesesuaian keseluruhan pola dinamika dan warna suara."
        
    return {
        'summary': summary,
        'reasons': reasons_out,
        'counter_reasons': counter_out
    }
