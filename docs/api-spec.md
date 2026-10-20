# API Spec — Sound Lab

**Ringkasan.** Kontrak API antara backend FastAPI dan frontend: `POST /api/predict`, `GET /api/model-info`, `GET /api/health`. Dokumen ini memuat request, validasi, skema response, contoh nyata (sukses dan error), kode error berpesan Indonesia, serta batas dan timeout. Nama fitur, urutan, dan angka mengikuti model-spec.md.

## Daftar Isi
1. Ketentuan Umum
2. `POST /api/predict`
3. `GET /api/model-info`
4. `GET /api/health`
5. Kode Error
6. Batas, Timeout, dan Header
7. Presisi Angka
8. Asumsi

---

## 1. Ketentuan Umum

| Item | Nilai |
|---|---|
| Base URL | Produksi: origin yang sama (`/api/...`). Dev: `http://localhost:8000` (frontend memakai proxy Vite) |
| Format | JSON UTF-8 (kecuali upload multipart) |
| Autentikasi | Tidak ada |
| Ekstensi diterima | `.mp3 .wav .ogg .flac .m4a` |
| Ukuran maks | 15 MB |
| Durasi | min 0,5 detik, maks 120 detik |
| Bahasa pesan | Indonesia |
| Kelas | `berisik`, `non-berisik` (urutan dari `model.classes_`) |
| Rekaman mikrofon | Dikirim sebagai `.wav` (di-encode di browser) |
| Header respons | `X-Request-ID`, `Cache-Control: no-store` |

Format error seragam untuk semua endpoint:
```json
{
  "error": {
    "code": "KODE_ERROR",
    "message": "Pesan berbahasa Indonesia untuk pengguna.",
    "detail": {}
  },
  "request_id": "b6f1c0e2-8a7d-4a0f-9d6e-3c1f5d7a2b10"
}
```

## 2. `POST /api/predict`

### 2.1 Request
- `Content-Type: multipart/form-data`
- Satu bagian bernama **`file`** (wajib).

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `file` | berkas | Ya | Audio `.mp3 .wav .ogg .flac .m4a`, ≤ 15 MB |

### 2.2 Validasi (urut)

| # | Pemeriksaan | Status | Kode |
|---|---|---|---|
| 1 | Header `Content-Length` > 15 MB | 413 | `FILE_TERLALU_BESAR` |
| 2 | Field `file` tidak ada / berkas kosong (0 byte) | 400 | `FILE_TIDAK_ADA` / `FILE_KOSONG` |
| 3 | Ekstensi tidak termasuk daftar | 415 | `FORMAT_TIDAK_DIDUKUNG` |
| 4 | Magic bytes tidak cocok dengan ekstensi | 415 | `FORMAT_TIDAK_DIDUKUNG` |
| 5 | Ukuran terbaca saat streaming > 15 MB | 413 | `FILE_TERLALU_BESAR` |
| 6 | Dekode gagal (berkas korup) | 422 | `AUDIO_RUSAK` |
| 7 | Durasi < 0,5 detik | 422 | `AUDIO_TERLALU_PENDEK` |
| 8 | Durasi > 120 detik | 422 | `AUDIO_TERLALU_PANJANG` |
| 9 | Sinyal senyap total (puncak < 1e-4) | 422 | `AUDIO_SENYAP` |
| 10 | Model belum siap | 503 | `MODEL_BELUM_SIAP` |
| 11 | Antrean penuh > 15 detik | 503 | `SERVER_SIBUK` |
| 12 | Proses > 30 detik | 504 | `PROSES_TIMEOUT` |
| 13 | Melebihi rate limit | 429 | `TERLALU_BANYAK_PERMINTAAN` |
| 14 | Kesalahan tak terduga | 500 | `KESALAHAN_SERVER` |

Catatan: respons validasi bawaan FastAPI (422 untuk field hilang) harus dipetakan ulang ke 400 `FILE_TIDAK_ADA`.

### 2.3 Response sukses `200 OK`

**Skema tingkat atas**

| Field | Tipe | Keterangan |
|---|---|---|
| `request_id` | string (UUID) | Sama dengan header `X-Request-ID` |
| `file` | objek | Info berkas |
| `audio` | objek | Info audio |
| `prediction` | objek | Hasil agregat file |
| `features` | array[10] | 10 fitur, **urutan wajib sesuai model-spec.md §4** |
| `mfcc_profile` | objek | 13 nilai MFCC mean |
| `explanation` | objek | Penjelasan awam |
| `chunks` | array | Prediksi per chunk (indikatif) |
| `visual` | objek | Waveform dan spektrogram |
| `timing` | objek | Waktu proses (ms) |
| `warnings` | array[string] | Kode peringatan |

**`file`**

| Field | Tipe | Keterangan |
|---|---|---|
| `name` | string | Nama berkas dari klien (hanya dikembalikan, tidak disimpan) |
| `size_bytes` | integer | Ukuran |
| `extension` | string | mis. `.mp3` |

**`audio`**

| Field | Tipe | Keterangan |
|---|---|---|
| `duration_s` | number | Durasi asli (detik) |
| `processed_duration_s` | number | Durasi setelah hening dibuang |
| `sample_rate` | integer | 22050 |
| `n_chunks` | integer | Jumlah chunk 3 detik |
| `silence_removed_s` | number | `duration_s − processed_duration_s` |
| `active_intervals` | array[[number, number]] | Rentang waktu **asli** (detik) yang dipertahankan |

**`prediction`**

| Field | Tipe | Keterangan |
|---|---|---|
| `label` | string | `berisik` atau `non-berisik` |
| `label_display` | string | `BERISIK` atau `NON-BERISIK` |
| `confidence` | number 0..1 | `max(predict_proba)` |
| `probabilities` | objek | `{ "berisik": p1, "non-berisik": p2 }`, diurutkan dari `model.classes_`; jumlah = 1 ± 1e-6 |
| `low_confidence` | boolean | `confidence < warn_threshold` |
| `warn_threshold` | number | Default 0,65 |

**`features[i]`**

| Field | Tipe | Keterangan |
|---|---|---|
| `rank` | integer 1..10 | Posisi sesuai urutan wajib |
| `name` | string | mis. `rms_mean` |
| `display_name` | string | mis. "Volume rata-rata" |
| `unit` | string | mis. "Hz", "" |
| `value` | number | Nilai fitur audio |
| `class_mean` | objek | `{ "berisik": number, "non-berisik": number }` |
| `nearer_class` | string | Kelas dengan rata-rata terdekat ke `value` |
| `importance` | number | Importance MDI |

**`mfcc_profile`**: `{ "values": [13 angka: mfcc1_mean … mfcc13_mean] }`

**`explanation`**

| Field | Tipe | Keterangan |
|---|---|---|
| `summary` | string | Satu kalimat ringkas |
| `reasons` | array (≤ 3) | `{ feature, direction ("lebih_tinggi" \| "lebih_rendah"), strength ("kuat" \| "sedang" \| "lemah"), text }` |
| `counter_reasons` | array (≤ 1) | Struktur sama; faktor yang berlawanan |

**`chunks[i]`**: `{ index, start_s, end_s, label, confidence, probabilities }`. `start_s` dan `end_s` adalah waktu pada audio **setelah hening dibuang**.

**`visual`**

| Field | Tipe | Keterangan |
|---|---|---|
| `waveform.points` | integer | ≤ 2000 |
| `waveform.min` / `waveform.max` | array[number] | Panjang = `points`, rentang −1..1; waktu = waktu rekaman asli |
| `spectrogram.n_mels` | integer | 64 |
| `spectrogram.n_frames` | integer | ≤ 300 |
| `spectrogram.freqs_hz` | array[number] | 64 frekuensi tengah mel (Hz), rendah ke tinggi |
| `spectrogram.hop_s` | number | Durasi tiap kolom setelah downsample |
| `spectrogram.db_range` | [number, number] | `[-80, 0]` |
| `spectrogram.data` | array[array[int]] | `n_mels` baris × `n_frames` kolom, nilai 0..255 (baris 0 = frekuensi terendah) |

**`timing`**: `{ total_ms, load_ms, features_ms, predict_ms }`

**`warnings`** (kode):

| Kode | Kondisi |
|---|---|
| `AUDIO_PENDEK_DIPAD` | Sinyal setelah buang hening < 3 detik (zero-pad ke 1 chunk) |
| `HENING_DOMINAN` | > 70% durasi asli dibuang |
| `AUDIO_CLIPPING` | > 1% sampel berada di ±0,99 (audio sangat keras / terpotong) |
| `CONFIDENCE_RENDAH` | `low_confidence = true` |

**Contoh response sukses** (diringkas agar mudah dibaca; angka fitur dan `class_mean` adalah **ilustrasi format**, bukan nilai uji; array panjang dipotong dengan `…`, file asli memuat semua elemen):
```json
{
  "request_id": "b6f1c0e2-8a7d-4a0f-9d6e-3c1f5d7a2b10",
  "file": { "name": "kantor-siang.mp3", "size_bytes": 482113, "extension": ".mp3" },
  "audio": {
    "duration_s": 30.04,
    "processed_duration_s": 27.31,
    "sample_rate": 22050,
    "n_chunks": 9,
    "silence_removed_s": 2.73,
    "active_intervals": [[0.0, 12.48], [14.02, 30.04]]
  },
  "prediction": {
    "label": "berisik",
    "label_display": "BERISIK",
    "confidence": 0.89,
    "probabilities": { "berisik": 0.89, "non-berisik": 0.11 },
    "low_confidence": false,
    "warn_threshold": 0.65
  },
  "features": [
    { "rank": 1, "name": "rms_mean", "display_name": "Volume rata-rata", "unit": "",
      "value": 0.045213,
      "class_mean": { "berisik": 0.0512, "non-berisik": 0.0231 },
      "nearer_class": "berisik", "importance": 0.169 },
    { "rank": 2, "name": "mfcc1_mean", "display_name": "Bentuk spektrum keseluruhan", "unit": "",
      "value": -312.4501,
      "class_mean": { "berisik": -305.12, "non-berisik": -341.80 },
      "nearer_class": "berisik", "importance": 0.094 },
    "… (rank 3 sampai 9: rms_std, mfcc3_mean, zcr_mean, mfcc6_mean, mfcc7_mean, mfcc13_mean, mfcc5_mean) …",
    { "rank": 10, "name": "centroid_mean", "display_name": "Kecerahan suara", "unit": "Hz",
      "value": 1795.43,
      "class_mean": { "berisik": 1950.2, "non-berisik": 1610.7 },
      "nearer_class": "berisik", "importance": 0.044 }
  ],
  "mfcc_profile": { "values": [-312.4501, 41.2203, -9.8814, 7.3012, -3.1120, 5.0043, -2.2210,
                               1.9034, -0.8812, 2.1103, -1.0540, 0.4421, -0.6032] },
  "explanation": {
    "summary": "Hasil BERISIK terutama karena volume rata-rata tinggi dan volume sering berubah keras-pelan.",
    "reasons": [
      { "feature": "rms_mean", "direction": "lebih_tinggi", "strength": "kuat",
        "text": "Volume rata-rata rekaman ini tinggi, seperti rekaman berisik." },
      { "feature": "rms_std", "direction": "lebih_tinggi", "strength": "sedang",
        "text": "Volume sering berubah keras-pelan, pola khas rekaman berisik." },
      { "feature": "centroid_mean", "direction": "lebih_tinggi", "strength": "lemah",
        "text": "Sedikit: Suara terdengar lebih tajam dan cerah, mirip rekaman berisik." }
    ],
    "counter_reasons": [
      { "feature": "zcr_mean", "direction": "lebih_tinggi", "strength": "lemah",
        "text": "Sedikit: Suara cenderung halus dan sedikit desis, mirip rekaman non-berisik." }
    ]
  },
  "chunks": [
    { "index": 0, "start_s": 0.0, "end_s": 3.0, "label": "berisik", "confidence": 0.93,
      "probabilities": { "berisik": 0.93, "non-berisik": 0.07 } },
    "… (chunk 1 sampai 8) …"
  ],
  "visual": {
    "waveform": { "points": 2000, "min": [-0.12, -0.31, "…"], "max": [0.14, 0.29, "…"] },
    "spectrogram": {
      "n_mels": 64, "n_frames": 300, "hop_s": 0.1,
      "freqs_hz": [0.0, 62.3, "…", 11025.0],
      "db_range": [-80, 0],
      "data": [[12, 15, "…"], "… (64 baris) …"]
    }
  },
  "timing": { "total_ms": 3120, "load_ms": 880, "features_ms": 1890, "predict_ms": 35 },
  "warnings": []
}
```

### 2.4 Contoh response error

**413 — file terlalu besar**
```json
{
  "error": {
    "code": "FILE_TERLALU_BESAR",
    "message": "Ukuran file 18,4 MB melebihi batas 15 MB. Kompres atau potong audio, lalu coba lagi.",
    "detail": { "max_mb": 15, "size_mb": 18.4 }
  },
  "request_id": "5d0b8e41-1c7a-4f0e-8a52-7c9a1d3f6e22"
}
```

**415 — format tidak didukung**
```json
{
  "error": {
    "code": "FORMAT_TIDAK_DIDUKUNG",
    "message": "Format file tidak didukung. Gunakan MP3, WAV, OGG, FLAC, atau M4A.",
    "detail": { "extension": ".aac", "allowed": [".mp3", ".wav", ".ogg", ".flac", ".m4a"] }
  },
  "request_id": "c2a97f10-6b3d-4e55-b1a8-0f4d2e9c7a31"
}
```

**422 — audio senyap**
```json
{
  "error": {
    "code": "AUDIO_SENYAP",
    "message": "Rekaman tidak memuat suara yang dapat dianalisis. Periksa mikrofon atau pilih file lain.",
    "detail": {}
  },
  "request_id": "9e4f2a60-3d18-4b7c-a5e1-8c0b6d7f1a44"
}
```

## 3. `GET /api/model-info`

Dipakai halaman Tentang Model dan untuk batas di klien.

### 3.1 Request
Tanpa parameter.

### 3.2 Response `200 OK`

| Field | Tipe | Keterangan |
|---|---|---|
| `model` | objek | `name`, `algorithm`, `hyperparameters`, `sklearn_version`, `n_features`, `classes` |
| `pipeline` | objek | `target_sr`, `top_db`, `chunk_duration_s`, `silence_removal` (`"split+concatenate"`), `n_mfcc` |
| `features` | array[10] | `rank`, `name`, `display_name`, `description`, `unit`, `importance` |
| `metrics` | objek | `accuracy`, `precision`, `recall`, `f1`, `roc_auc`, `cv_mean`, `cv_std`, `confusion_matrix` |
| `model_comparison` | array[6] | `{ name, accuracy }` |
| `dataset` | objek | `total_files`, `train`, `test`, `split`, `source_sr_hz` |
| `class_means` | objek | Isi `class_means.json` (mean, std) |
| `limits` | objek | `max_file_mb`, `max_duration_s`, `min_duration_s`, `accepted_extensions`, `warn_threshold` |
| `samples` | array | Audio contoh: `{ id, title, expected_label, duration_s, url }` |

**Contoh response** (angka metrik adalah nilai proyek; `class_means` dipotong):
```json
{
  "model": {
    "name": "Random Forest",
    "algorithm": "RandomForestClassifier",
    "hyperparameters": { "n_estimators": 100, "max_depth": 10, "random_state": 42 },
    "sklearn_version": "1.8.0",
    "n_features": 10,
    "classes": ["berisik", "non-berisik"]
  },
  "pipeline": {
    "target_sr": 22050, "top_db": 25, "chunk_duration_s": 3,
    "silence_removal": "split+concatenate", "n_mfcc": 13
  },
  "features": [
    { "rank": 1, "name": "rms_mean", "display_name": "Volume rata-rata",
      "description": "Energi rata-rata sinyal; semakin besar, semakin keras.",
      "unit": "", "importance": 0.169 },
    "… (rank 2 sampai 10 sesuai urutan wajib) …"
  ],
  "metrics": {
    "accuracy": 0.85, "precision": 0.85, "recall": 0.85, "f1": 0.85, "roc_auc": 0.8688,
    "cv_mean": 0.8415, "cv_std": 0.0294,
    "confusion_matrix": { "labels": ["berisik", "non-berisik"], "matrix": [[17, 3], [3, 17]] }
  },
  "model_comparison": [
    { "name": "Random Forest", "accuracy": 0.85 },
    { "name": "Gradient Boosting", "accuracy": 0.80 },
    { "name": "SVM RBF", "accuracy": 0.775 },
    { "name": "SVM Linear", "accuracy": 0.725 },
    { "name": "Logistic Regression", "accuracy": 0.70 },
    { "name": "KNN", "accuracy": 0.70 }
  ],
  "dataset": { "total_files": 198, "train": 158, "test": 40, "split": "80:20 stratified, random_state=42", "source_sr_hz": 44100 },
  "class_means": { "classes": ["berisik", "non-berisik"], "mean": { "…": "…" }, "std": { "…": "…" } },
  "limits": {
    "max_file_mb": 15, "max_duration_s": 120, "min_duration_s": 0.5,
    "accepted_extensions": [".mp3", ".wav", ".ogg", ".flac", ".m4a"], "warn_threshold": 0.65
  },
  "samples": [
    { "id": "contoh-berisik", "title": "Contoh berisik", "expected_label": "berisik",
      "duration_s": 30.0, "url": "/samples/contoh-berisik.mp3" },
    { "id": "contoh-non-berisik", "title": "Contoh non-berisik", "expected_label": "non-berisik",
      "duration_s": 30.0, "url": "/samples/contoh-non-berisik.mp3" },
    { "id": "contoh-tidak-jelas", "title": "Contoh tidak jelas", "expected_label": "ambigu",
      "duration_s": 30.0, "url": "/samples/contoh-tidak-jelas.mp3" }
  ]
}
```
`dataset.total_files = 198` adalah jumlah latih + uji (158 + 40); ketersediaan "± 200 file" di PRD.md merujuk hal yang sama.

Error: `503 MODEL_BELUM_SIAP` bila model belum dimuat; `429` bila rate limit terlampaui.

## 4. `GET /api/health`

### 4.1 Response `200 OK`
```json
{
  "status": "ok",
  "model_loaded": true,
  "sklearn_version": "1.8.0",
  "uptime_s": 1284
}
```

### 4.2 Response `503 Service Unavailable`
```json
{
  "status": "loading",
  "model_loaded": false,
  "sklearn_version": "1.8.0",
  "uptime_s": 3
}
```
Dipakai oleh platform hosting sebagai health check. Endpoint ini tidak dikenai rate limit ketat.

## 5. Kode Error

| Status | Kode | Pesan (Indonesia) |
|---|---|---|
| 400 | `FILE_TIDAK_ADA` | "Tidak ada file yang dikirim. Pilih file audio terlebih dahulu." |
| 400 | `FILE_KOSONG` | "File kosong (0 byte). Pilih file audio yang berisi rekaman." |
| 413 | `FILE_TERLALU_BESAR` | "Ukuran file {x} MB melebihi batas 15 MB. Kompres atau potong audio, lalu coba lagi." |
| 415 | `FORMAT_TIDAK_DIDUKUNG` | "Format file tidak didukung. Gunakan MP3, WAV, OGG, FLAC, atau M4A." |
| 422 | `AUDIO_RUSAK` | "File audio tidak dapat dibaca atau rusak. Coba file lain." |
| 422 | `AUDIO_TERLALU_PENDEK` | "Audio terlalu pendek ({x} detik). Minimal 0,5 detik; disarankan 15 detik atau lebih." |
| 422 | `AUDIO_TERLALU_PANJANG` | "Audio terlalu panjang ({x} detik). Maksimal 120 detik." |
| 422 | `AUDIO_SENYAP` | "Rekaman tidak memuat suara yang dapat dianalisis. Periksa mikrofon atau pilih file lain." |
| 429 | `TERLALU_BANYAK_PERMINTAAN` | "Terlalu banyak permintaan. Coba lagi dalam {n} detik." |
| 500 | `KESALAHAN_SERVER` | "Terjadi kesalahan pada server. Coba lagi; jika berulang, hubungi pengelola." |
| 503 | `MODEL_BELUM_SIAP` | "Model sedang dimuat. Coba lagi dalam beberapa detik." |
| 503 | `SERVER_SIBUK` | "Server sedang sibuk. Coba lagi sebentar lagi." |
| 504 | `PROSES_TIMEOUT` | "Pemrosesan terlalu lama. Coba audio yang lebih pendek." |

Aturan: pesan tidak membocorkan jejak stack, path server, atau nama library; detail teknis hanya di log server.

## 6. Batas, Timeout, dan Header

| Parameter | Nilai |
|---|---|
| Ukuran file | ≤ 15 MB |
| Durasi audio | 0,5–120 detik |
| Rate limit `/api/predict` | 10 per menit per IP |
| Rate limit endpoint lain | 60 per menit per IP |
| Timeout proses server | 30 detik |
| Timeout klien | 60 detik (mengakomodasi cold start); tampilkan "Server sedang bangun" bila > 5 detik |
| Pekerja bersamaan | 2 (antrean maks 15 detik) |
| Ukuran respons `/api/predict` | ± 100–150 KB (terutama spektrogram) |
| Header respons | `X-Request-ID`, `Cache-Control: no-store`, `Retry-After` (pada 429/503) |

## 7. Presisi Angka

| Data | Pembulatan di API |
|---|---|
| `confidence`, `probabilities` | 4 desimal |
| `rms_mean`, `rms_std`, `zcr_mean` | 6 desimal |
| `mfccK_mean` | 4 desimal |
| `centroid_mean` | 2 desimal |
| Waktu (detik) | 2 desimal |

Tampilan di UI mengikuti desain.md §11 (mis. confidence 1 desimal dengan koma; `rms_*` dan `zcr_mean` 5 desimal; `mfcc*_mean` 2 desimal; `centroid_mean` 1 desimal). Ekspor CSV memakai titik desimal dan nilai 6 desimal untuk `rms_*` dan `zcr_mean`.

## 8. Asumsi
1. Klien memeriksa ekstensi dan ukuran sebelum upload, tetapi server tetap memvalidasi ulang.
2. `class_mean` pada `features[i]` berasal dari `class_means.json`.
3. `samples[].url` melayani berkas statis dari folder `samples/`; klien mengunduhnya lalu mengirim ke `/api/predict` seperti upload biasa.
4. `expected_label` `"ambigu"` hanya dipakai untuk tampilan contoh dan tidak dibandingkan dengan hasil.
5. Nama berkas dari klien hanya dikembalikan di respons; server tidak menyimpannya dan tidak mencatatnya di log.
