# Model Spec — Sound Lab

**Ringkasan.** Dokumen ini adalah sumber kebenaran teknis untuk model dan pipeline fitur: isi artefak `.pkl`, validasi saat dimuat, pipeline langkah demi langkah (pseudocode), 10 fitur beserta arti fisiknya, keputusan paritas training-vs-inferensi (split + concatenate, bukan trim), pembuatan `class_means.json`, metode penjelasan "mengapa hasilnya begini", prediksi per chunk, kalibrasi ambang peringatan, uji paritas, dan keterbatasan model.

## Daftar Isi
1. Artefak Model
2. Validasi Saat Dimuat
3. Pipeline Fitur (Pseudocode)
4. Daftar 10 Fitur
5. Keputusan Paritas: split + concatenate vs trim
6. `class_means.json`
7. Penjelasan "Mengapa Hasilnya Begini"
8. Prediksi Per Chunk
9. Kalibrasi Ambang Peringatan
10. Data Visual (Waveform, Spektrogram, MFCC)
11. Uji Paritas dan Uji Fitur
12. Keterbatasan Model
13. Asumsi

---

## 1. Artefak Model

| Item | Nilai |
|---|---|
| File | `model_klasifikasi_audio.pkl` (dibuat dengan **joblib**, dimuat dengan `joblib.load`) |
| Tipe isi | `dict` |
| Kunci | `model`, `selected_features`, `target_sr`, `top_db`, `chunk_duration`, `model_name` |
| `model` | `RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)`, `n_features_in_ = 10` |
| `selected_features` | 10 nama fitur (urutan di §4) |
| `target_sr` | 22050 |
| `top_db` | 25 |
| `chunk_duration` | 3 (detik) |
| `model_name` | `'Random Forest'` |
| Kelas | `'berisik'`, `'non-berisik'`; urutan probabilitas **selalu** dari `model.classes_`, tanpa indeks yang ditulis tetap |
| Versi scikit-learn | **1.8.0** (dipin persis) |

Metrik (data uji 40 sampel, split 80:20 stratified, `random_state=42`; data latih 158):

| Metrik | Nilai |
|---|---|
| Akurasi test | 85% |
| Presisi / Recall / F1 | 0,85 / 0,85 / 0,85 |
| ROC-AUC | 0,8688 |
| CV 5-fold | 84,15% (± 2,94%) |
| Confusion matrix (baris = aktual, kolom = prediksi, urutan `berisik`, `non-berisik`) | `[[17, 3], [3, 17]]` |

Perbandingan 6 model (akurasi test): Random Forest 85%, Gradient Boosting 80%, SVM RBF 77,5%, SVM Linear 72,5%, Logistic Regression 70%, KNN 70%.

Seleksi fitur: dari 19 fitur awal (rms mean/std, centroid mean/std, zcr mean/std, mfcc1–13 mean) dipilih k=10 memakai importance Random Forest (MDI) dan ANOVA F-score; k optimal ditentukan lewat 5-fold CV.

Data: ± 200 rekaman `.mp3`/`.wav` (folder `berisik/` dan `non-berisik/`), durasi ± 30 detik per file, sumber 44,1 kHz.

File pendamping (disimpan di `data/`):
- `model_meta.json`: metrik, confusion matrix, perbandingan 6 model, importance, jumlah data (dari tabel di atas).
- `class_means.json`: lihat §6.
- `train_data.csv` dan `fitur_audio.csv`: sumber `class_means.json` dan uji paritas.

## 2. Validasi Saat Dimuat
Dijalankan saat startup; gagal berarti server tidak siap (503).

| # | Pemeriksaan | Jika gagal |
|---|---|---|
| 1 | Semua kunci dict ada | Hentikan startup |
| 2 | `selected_features == ['rms_mean','mfcc1_mean','rms_std','mfcc3_mean','zcr_mean','mfcc6_mean','mfcc7_mean','mfcc13_mean','mfcc5_mean','centroid_mean']` | Hentikan startup |
| 3 | `model.n_features_in_ == 10` | Hentikan startup |
| 4 | `list(model.classes_) == ['berisik','non-berisik']` | Hentikan startup |
| 5 | `target_sr == 22050`, `top_db == 25`, `chunk_duration == 3` | Hentikan startup |
| 6 | `sklearn.__version__ == '1.8.0'` | Hentikan startup |
| 7 | `class_means.json` memuat 10 fitur yang sama dan urutan sama | Hentikan startup |

## 3. Pipeline Fitur (Pseudocode)

Pipeline harus **identik dengan saat training**. Konstanta diambil dari artefak (`target_sr`, `top_db`, `chunk_duration`), bukan ditulis ulang.

```text
FUNGSI ekstrak_fitur(path_file) -> hasil
  # 1. Muat audio
  y_asli, sr = librosa.load(path_file, sr=22050, mono=True)
  durasi_asli = len(y_asli) / 22050
  JIKA durasi_asli < 0.5 ATAU durasi_asli > 120: tolak (422)
  JIKA max(abs(y_asli)) < 1e-4: tolak (422, senyap total)

  # 2. Buang hening (split + concatenate) <- BUKAN effects.trim
  interval = librosa.effects.split(y_asli, top_db=25)
  JIKA interval kosong:
      y = y_asli
  LAIN:
      y = np.concatenate([y_asli[awal:akhir] for (awal, akhir) in interval])

  # 3. Chunk 3 detik, tanpa overlap
  ukuran_chunk = 3 * 22050            # 66.150 sampel
  JIKA len(y) < ukuran_chunk:
      y = zero_pad(y, ke_panjang=ukuran_chunk)   # tepat 1 chunk
  jumlah_chunk = len(y) // ukuran_chunk          # sisa di akhir dibuang
  chunks = [y[i*ukuran_chunk : (i+1)*ukuran_chunk] untuk i dalam 0..jumlah_chunk-1]

  # 4. Fitur per chunk
  UNTUK setiap chunk c:
      rms      = librosa.feature.rms(y=c)                         # bentuk (1, T)
      centroid = librosa.feature.spectral_centroid(y=c, sr=22050) # bentuk (1, T)
      zcr      = librosa.feature.zero_crossing_rate(c)            # bentuk (1, T)
      mfcc     = librosa.feature.mfcc(y=c, sr=22050, n_mfcc=13)   # bentuk (13, T)

  # 5. Gabung semua chunk di sumbu waktu, lalu agregasi
  RMS      = hstack(rms semua chunk)       ; CENTROID = hstack(centroid semua chunk)
  ZCR      = hstack(zcr semua chunk)       ; MFCC     = hstack(mfcc semua chunk)
  rms_mean      = mean(RMS)       ; rms_std      = std(RMS)
  centroid_mean = mean(CENTROID)  ; centroid_std = std(CENTROID)
  zcr_mean      = mean(ZCR)       ; zcr_std      = std(ZCR)
  mfccK_mean    = mean(MFCC[K-1, :])  untuk K = 1..13       # hanya mean

  # 6. Susun 10 fitur sesuai urutan wajib, buat DataFrame 1 baris
  X = DataFrame([[nilai fitur sesuai urutan]], columns=selected_features)
  label_idx = model.predict(X)
  proba     = model.predict_proba(X)[0]       # urutan = model.classes_
  RETURN hasil(fitur 19, X, proba, interval, durasi_asli, durasi_diproses, chunks)
```

Catatan implementasi:
- Parameter default librosa (`frame_length=2048`, `hop_length=512` untuk rms/centroid/zcr/mfcc/split) harus sama dengan notebook training. Periksa notebook; bila training memakai parameter lain, ikuti notebook.
- `std` memakai `np.std` (populasi, `ddof=0`) kecuali notebook memakai `ddof=1`; cocokkan dengan notebook dan tulis hasilnya di README.
- 19 fitur dihitung semuanya; hanya 10 yang masuk model. MFCC1–13 penuh dipakai untuk profil MFCC di UI.
- Nama `mfccK_mean` = rata-rata baris indeks `K-1` dari matriks MFCC.
- Pemeriksaan sinyal senyap total (`max < 1e-4`) adalah **tambahan** web app (di luar pipeline training) agar rekaman kosong tidak menghasilkan prediksi palsu.

## 4. Daftar 10 Fitur

**Urutan wajib (tidak boleh diubah):**

| # | Nama | Nama tampilan (UI) | Arti fisik | Satuan | Importance (MDI) |
|---|---|---|---|---|---|
| 1 | `rms_mean` | Volume rata-rata | Energi (akar kuadrat rata-rata) sinyal; semakin besar, semakin keras | amplitudo (skala −1..1) | 0,169 |
| 2 | `mfcc1_mean` | Bentuk spektrum keseluruhan | Koefisien MFCC pertama; terkait tingkat energi dan kemiringan spektrum | tanpa satuan | 0,094 |
| 3 | `rms_std` | Naik-turun volume | Variasi volume antar frame; tinggi bila ada letupan atau perubahan keras-pelan | amplitudo | 0,092 |
| 4 | `mfcc3_mean` | Warna suara (3) | MFCC ke-3; ciri bentuk spektrum (timbre) | tanpa satuan | 0,087 |
| 5 | `zcr_mean` | Kerapatan desis | Laju perpotongan nol; tinggi untuk suara desis atau frekuensi tinggi | per sampel (0..1) | 0,056 |
| 6 | `mfcc6_mean` | Warna suara (6) | MFCC ke-6; detail timbre | tanpa satuan | 0,053 |
| 7 | `mfcc7_mean` | Warna suara (7) | MFCC ke-7; detail timbre | tanpa satuan | 0,053 |
| 8 | `mfcc13_mean` | Warna suara (13) | MFCC ke-13; detail halus timbre | tanpa satuan | 0,045 |
| 9 | `mfcc5_mean` | Warna suara (5) | MFCC ke-5; detail timbre | tanpa satuan | 0,045 |
| 10 | `centroid_mean` | Kecerahan suara | Pusat massa spektrum; tinggi = suara lebih "tajam/cerah" | Hz | 0,044 |

Fitur kandidat yang tidak terpilih (tidak dipakai model): `centroid_std`, `zcr_std`, `mfcc2_mean`, `mfcc4_mean`, `mfcc8_mean`–`mfcc12_mean`.

## 5. Keputusan Paritas: split + concatenate vs trim

**Temuan:** fungsi inferensi lama di notebook memakai `librosa.effects.trim`, yang hanya memangkas hening di awal dan akhir. Pipeline training memakai `librosa.effects.split` lalu `np.concatenate` yang membuang hening di seluruh sinyal. Keduanya tidak setara.

**Keputusan desain (D1):** web app **wajib** memakai split + concatenate agar fitur konsisten dengan data latih.

**Dampak yang diharapkan** pada contoh notebook (versi trim):

| Berkas | Hasil notebook (trim) | Yang diharapkan di web app |
|---|---|---|
| `24-003 berisik (1).mp3` | berisik 89%, rms_mean 0,04065, centroid_mean 1781,2 Hz, 9 chunk | Label sama; `rms_mean` ≥ nilai notebook (hening internal dibuang); jumlah chunk ≤ 9 |
| `24-003 berisik (2).mp3` | berisik 98%, rms_mean 0,07744, centroid_mean 2132,0 Hz, 10 chunk | Label sama; `rms_mean` ≥ 0,07744; chunk ≤ 10 |
| `24-003 sunyi 2.mp3` | non-berisik 92%, rms_mean 0,02091, centroid_mean 1729,9 Hz, 10 chunk | Label sama; `rms_mean` ≥ 0,02091; chunk ≤ 10 |

Alasan arah perubahan: membuang segmen berenergi rendah menaikkan rata-rata RMS dan mengurangi panjang sinyal, sehingga jumlah chunk tidak bertambah. Angka notebook **tidak** dipakai sebagai nilai yang harus sama persis (lihat §11).

**Risiko (R-D1):** jika training sebenarnya memakai jalur lain, fitur web menyimpang. **Verifikasi wajib:** bandingkan fitur web app dengan baris yang sama di `fitur_audio.csv`/`train_data.csv` (§11 uji P1). Bila uji P1 gagal, perbaiki pipeline sampai cocok **sebelum** mengerjakan UI.

## 6. `class_means.json`

**Tujuan:** menyimpan rata-rata dan simpangan baku tiap fitur per kelas dari data latih untuk panel perbandingan fitur, penanda VU-meter, dan penjelasan.

**Cara membuat (sekali, di luar aplikasi, mis. di notebook):**
1. Baca `train_data.csv` (158 baris). Asumsi: kolom 10 fitur bernama sesuai §4 dan kolom label bernama `label` bernilai `berisik`/`non-berisik`. Sesuaikan jika nama kolom berbeda.
2. Untuk tiap kelas dan tiap fitur hitung `mean` dan `std`.
3. Hitung `pooled_std[f] = sqrt((std_berisik[f]^2 + std_non[f]^2) / 2)`.
4. Salin `importance` dari §4.
5. Tulis ke `data/class_means.json` dengan urutan fitur sesuai §4.

**Skema** (nilai `null` diisi dari data nyata; jangan diisi dengan angka tebakan):
```json
{
  "source": "train_data.csv",
  "n_train": 158,
  "classes": ["berisik", "non-berisik"],
  "feature_order": ["rms_mean","mfcc1_mean","rms_std","mfcc3_mean","zcr_mean",
                    "mfcc6_mean","mfcc7_mean","mfcc13_mean","mfcc5_mean","centroid_mean"],
  "mean": {
    "berisik":     {"rms_mean": null, "mfcc1_mean": null, "...": null},
    "non-berisik": {"rms_mean": null, "mfcc1_mean": null, "...": null}
  },
  "std": {
    "berisik":     {"rms_mean": null, "...": null},
    "non-berisik": {"rms_mean": null, "...": null}
  },
  "pooled_std": {"rms_mean": null, "...": null},
  "importance": {
    "rms_mean": 0.169, "mfcc1_mean": 0.094, "rms_std": 0.092, "mfcc3_mean": 0.087,
    "zcr_mean": 0.056, "mfcc6_mean": 0.053, "mfcc7_mean": 0.053,
    "mfcc13_mean": 0.045, "mfcc5_mean": 0.045, "centroid_mean": 0.044
  }
}
```
(Penulisan `"..."` hanya untuk ringkas di dokumen; file asli memuat ke-10 fitur penuh.)

## 7. Penjelasan "Mengapa Hasilnya Begini"

**Prinsip:** heuristik yang transparan, bukan atribusi kausal model. Label UI: "Alasan utama (perkiraan)".

**Perhitungan** untuk setiap fitur `f` dengan nilai audio `x_f`, kelas prediksi `P` (hasil `predict`), kelas lawan `Q`:
```text
mu_P, mu_Q  = class_means.mean[P][f], class_means.mean[Q][f]
sigma       = class_means.pooled_std[f]            # jika 0 -> lewati fitur
s_f         = ( |x_f - mu_Q| - |x_f - mu_P| ) / sigma     # >0: lebih dekat ke rata-rata kelas P
kontribusi  = importance[f] * s_f
arah        = "lebih_tinggi" jika mu_P > mu_Q, lain "lebih_rendah"
              # arah menyatakan sifat fitur pada kelas P dibanding kelas Q
kekuatan    = "kuat" jika |s_f| >= 1.0; "sedang" jika 0.5 <= |s_f| < 1.0; "lemah" jika < 0.5
```
**Pemilihan:**
- `reasons`: 3 fitur dengan `kontribusi > 0` terbesar (kurang dari 3 bila yang positif lebih sedikit).
- `counter_reasons`: paling banyak 1 fitur dengan `kontribusi < 0` terkecil (bukti berlawanan), tampil sebagai "Faktor yang berlawanan".
- `nearer_class` per fitur (untuk tabel F09): kelas dengan `|x_f - mu|` terkecil.

**Template kalimat** (Bahasa awam; `{K}` = kelas prediksi tampilan "berisik"/"non-berisik"). Dipilih berdasarkan fitur dan nilai `arah`:

| Fitur | `lebih_tinggi` (kelas P cenderung tinggi) | `lebih_rendah` |
|---|---|---|
| `rms_mean` | "Volume rata-rata rekaman ini tinggi, seperti rekaman {K}." | "Volume rata-rata rekaman ini rendah, seperti rekaman {K}." |
| `rms_std` | "Volume sering berubah keras-pelan, pola khas rekaman {K}." | "Volume relatif stabil, pola khas rekaman {K}." |
| `zcr_mean` | "Banyak komponen desis atau frekuensi tinggi, mirip rekaman {K}." | "Suara cenderung halus dan sedikit desis, mirip rekaman {K}." |
| `centroid_mean` | "Suara terdengar lebih tajam dan cerah, mirip rekaman {K}." | "Suara terdengar lebih berat dan tumpul, mirip rekaman {K}." |
| `mfcc1_mean` | "Bentuk energi suara secara keseluruhan lebih mirip rekaman {K}." (sama untuk kedua arah) | (sama) |
| `mfcc3_mean`, `mfcc5_mean`, `mfcc6_mean`, `mfcc7_mean`, `mfcc13_mean` | "Warna suara (timbre) pada detail ke-{K_no} lebih mirip rekaman {K}." (sama untuk kedua arah; `{K_no}` = 3, 5, 6, 7, atau 13) | (sama) |

Aturan tambahan: kalimat tidak memuat istilah "MFCC", "RMS", atau "centroid" (istilah teknis hanya di panel detail F09); kekuatan "lemah" diberi awalan "Sedikit: ".

`summary` (satu kalimat): "Hasil {LABEL} terutama karena {alasan_1_ringkas} dan {alasan_2_ringkas}."

## 8. Prediksi Per Chunk
- Untuk setiap chunk 3 detik (dari langkah 3 pipeline), hitung 10 fitur **dari frame chunk itu saja** (agregasi mean/std hanya di dalam chunk), susun DataFrame dengan kolom berurutan, lalu `predict_proba`.
- Keluaran per chunk: `index`, `start_s`, `end_s`, `label`, `confidence`, `probabilities`.
- **Waktu chunk** (`start_s`, `end_s`) adalah waktu pada audio **setelah hening dibuang** (hasil concatenate), bukan waktu pada rekaman asli. Respons juga memuat `active_intervals` (rentang waktu asli yang dipertahankan) agar UI dapat menandai bagian hening yang dibuang di waveform.
- UI wajib memberi label "Indikatif": model dilatih pada agregat file ± 30 detik, sehingga distribusi `rms_std` dan fitur lain per chunk berbeda dari data latih.
- Bila sinyal < 1 chunk (di-zero-pad), hanya 1 chunk dan ditandai di `warnings`.

## 9. Kalibrasi Ambang Peringatan
- Default awal: **65%** (`CONFIDENCE_WARN_THRESHOLD=0.65`). Confidence = `max(predict_proba)`, yaitu proporsi suara pohon Random Forest, **bukan** probabilitas terkalibrasi.
- Prosedur kalibrasi (dikerjakan sekali di notebook, hasil dicatat di `model_meta.json` → `calibration`):
  1. Ambil probabilitas out-of-fold lewat `cross_val_predict(..., cv=StratifiedKFold(5, shuffle=True, random_state=42), method='predict_proba')` pada seluruh data berlabel (± 198 sampel).
  2. Kelompokkan confidence ke bin: [0,5–0,6), [0,6–0,65), [0,65–0,7), [0,7–0,8), [0,8–0,9), [0,9–1,0].
  3. Hitung akurasi dan jumlah sampel per bin.
  4. Pilih ambang T terkecil sehingga akurasi prediksi dengan confidence < T ≤ 70% **dan** cakupan prediksi dengan confidence ≥ T ≥ 70% dari seluruh sampel.
  5. Bila hasil berbeda dari 0,65, ubah nilai default dan perbarui PRD.md (F11) dan desain.md (§8.11).
- Catatan: dengan sampel kecil, estimasi per bin kasar. Cantumkan jumlah sampel per bin di halaman Tentang Model bila ditampilkan.

## 10. Data Visual (Waveform, Spektrogram, MFCC)

| Data | Sumber sinyal | Spesifikasi |
|---|---|---|
| Waveform | `y_asli` (22.050 Hz, sebelum buang hening) | ≤ 2000 titik; per bin simpan `min` dan `max` yang dinormalisasi ke [−1, 1]; sumbu waktu = waktu rekaman asli (sinkron dengan pemutar) |
| Spektrogram | `y_asli` | Mel-spectrogram: `n_fft=2048`, `hop_length=512`, `n_mels=64`, `fmax=11025`; `power_to_db(ref=np.max, top_db=80)` sehingga rentang −80..0 dB; dipetakan linear ke bilangan bulat 0..255; kolom waktu di-downsample (rata-rata) menjadi ≤ 300; colormap "inferno" diterapkan di klien |
| Profil MFCC | 13 nilai `mfccK_mean` dari agregat file (sinyal setelah buang hening) | Array 13 angka dibulatkan 4 desimal |
| Interval aktif | Hasil `effects.split` | Daftar `[mulai_s, akhir_s]` pada waktu asli |

Durasi sinyal setelah buang hening dikirim sebagai `processed_duration_s`.

## 11. Uji Paritas dan Uji Fitur

Seluruh uji berada di `backend/tests/` (pytest). Ini menggantikan testing.md pada jalur ringkas.

| ID | Uji | Metode | Kriteria lulus |
|---|---|---|---|
| P0 | Pemuatan model | Muat `.pkl`, jalankan §2 | Semua pemeriksaan lolos; tidak ada `InconsistentVersionWarning` |
| P1 | Paritas fitur vs training | Pilih ≥ 5 berkas yang barisnya ada di `fitur_audio.csv` atau `train_data.csv` (termasuk 3 contoh notebook). Hitung 10 fitur dengan pipeline web lalu bandingkan dengan baris CSV | Selisih relatif ≤ 1% per fitur (toleransi absolut 1e-5 untuk nilai sangat kecil) |
| P2 | Urutan kolom | Periksa `X.columns` dan `selected_features` | Sama persis dengan urutan §4 |
| P3 | Label contoh notebook | Jalankan 3 contoh di §5 | Label sama dengan notebook; selisih confidence ≤ 10 poin persentase |
| P4 | Arah perubahan | Untuk 3 contoh, `rms_mean(web) ≥ 0,99 × rms_mean(notebook)` dan `n_chunk(web) ≤ n_chunk(notebook)` | Terpenuhi |
| P5 | Probabilitas | Jumlah probabilitas 2 kelas dan indeks label sama dengan `classes_` | Jumlah = 1 ± 1e-6 |
| P6 | Per chunk | Jumlah chunk = `floor(panjang_diproses / 66150)` (min. 1) | Terpenuhi |
| P7 | Kasus tepi | File kosong, mp3 korup, durasi < 0,5 dtk, senyap total, mono vs stereo, sangat keras (clipping), durasi 120 dtk | Kode error dan `warnings` sesuai api-spec.md; tanpa crash |
| P8 | Performa | Audio 30 dtk dan 120 dtk | 30 dtk < 10 dtk (p95); 120 dtk < 30 dtk |

**Toleransi dan alasan:**
- P1 memakai batas 1% karena algoritma sama, namun dekoder (`ffmpeg`/`audioread` vs `libsndfile`), versi librosa/numpy, dan presisi floating point dapat menimbulkan selisih kecil. Selisih lebih besar menandakan pipeline berbeda (mis. masih memakai trim) dan wajib diperbaiki.
- P3 dan P4 tidak menuntut angka notebook yang sama karena notebook memakai trim (lihat §5); hanya label, arah, dan batas kasar yang diuji.
- Stereo harus menghasilkan fitur identik dengan versi mono hasil `librosa.load(mono=True)`.

## 12. Keterbatasan Model
1. **Dataset kecil:** ± 200 rekaman (latih 158, uji 40); estimasi metrik tidak stabil (CV 84,15% ± 2,94%).
2. **Satu domain perekaman:** lokasi dan perangkat terbatas; performa dapat turun pada mikrofon atau ruangan lain.
3. **Di luar distribusi:** musik, hujan deras, mesin berat, suara tidak ada di data latih; model tetap memberi label dan bisa tampak yakin.
4. **Biner:** hanya "berisik" atau "non-berisik"; bukan pengukuran dB dan tidak mengenali jenis sumber suara.
5. **Confidence ≠ akurasi:** nilainya proporsi suara pohon, bukan probabilitas terkalibrasi.
6. **Per chunk tidak setara:** model dilatih pada agregat file ± 30 detik; hasil per chunk hanya indikatif.
7. **Sensitif pra-pemrosesan:** buang hening (`top_db=25`) mengubah fitur; rekaman sangat senyap atau sangat pendek menghasilkan estimasi tidak stabil.
8. **Penjelasan heuristik:** alasan di UI berdasarkan jarak ke rata-rata kelas, bukan penjelasan kausal Random Forest.

## 13. Asumsi
1. Nama kolom dan label di `train_data.csv` seperti di §6; sesuaikan bila berbeda.
2. Parameter librosa default (frame 2048, hop 512) sama dengan notebook training; diperiksa di Tahap 1 sebelum paritas dianggap lulus.
3. Notebook training memakai `np.std` populasi (`ddof=0`); diperiksa dan dicatat di README.
4. `fitur_audio.csv` memuat nama berkas atau indeks yang dapat dipetakan ke audio sumber; bila tidak, uji P1 memakai baris `train_data.csv` yang bisa dilacak ke berkas.
5. Ambang peringatan 65% adalah nilai awal sampai kalibrasi di §9 dijalankan.
