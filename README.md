# Sound Lab — Sistem Klasifikasi Audio Kebisingan Lingkungan Kerja

Aplikasi web cerdas untuk analisis dan klasifikasi tingkat kebisingan audio lingkungan kerja (*Berisik* vs *Non-Berisik*) menggunakan ekstraksi fitur spektral audio digital dan algoritma pembelajaran mesin **Random Forest**.

---

## Informasi Akademik Proyek
- **Mata Kuliah:** Pengolahan Sinyal Digital (PSD)
- **Program Studi:** Sains Data / Teknik Informatika
- **Tim Pengembang:**
  - Muhammad Zaidan Nabil Rafi (240411100068)
  - Okan Syailendra Wahyudi (240411100179)
  - Alifah Sayyidaturrhohma (240411100145)
- **Dataset:** 198 sampel audio lingkungan kerja (158 data latih, 40 data uji)
- **Akurasi Model Terpilih (Random Forest):** 85,0% (F1-Score: 85,0%, ROC-AUC: 0.8688)
- **Tanggal:** Oktober 2026

---

## Fitur Utama Aplikasi

1. **Deteksi Real-Time Mikrofon Laptop (Fitur Utama):**
   - **Streaming Langsung Tanpa Rekam Manual:** Mikrofon laptop menangkap suara ruangan secara terus-menerus.
   - **Oskiloskop 60 FPS:** Visualisasi gelombang suara langsung (*live oscilloscope*) dengan modulasi warna dinamis (oranye saat berisik, toska saat tenang).
   - **Evaluasi Bergulir per Detik:** Jendela geser (*sliding window*) 3 detik dianalisis setiap 1 detik dengan latensi pemrosesan sangat cepat (~20 ms).
   - **Linimasa Riwayat Real-Time:** Grafik rekaman kebisingan 30 detik terakhir untuk melihat tren intensitas suara.
   - **Statistik Kumulatif:** Menghitung total durasi aktif, persentase dominasi waktu berisik vs tenang, dan puncak volume (Peak RMS).
   - **Alarm Audio Opsional:** Notifikasi bunyi lembut jika ruangan terdeteksi bising.

2. **Mode Analisis Berkas & Sampel Uji:**
   - **Unggah Berkas:** Mendukung MP3, WAV, OGG, FLAC, M4A hingga 15 MB.
   - **1-Click Sampel Pengujian:** 3 berkas audio contoh (*Pabrik Bising*, *Kantor Tenang*, dan *Transisi*).
2. **Visualisasi Sinyal & Spektrogram Interaktif:**
   - **Waveform Canvas:** Downsampling 2000 titik sampel sinkron dengan *audio player* dan penanda interval hening.
   - **Spektrogram Mel (64 Bins):** Pemetaan warna *Inferno* dengan inspeksi frekuensi (Hz) dan waktu (*hover tooltip*).
   - **Linimasa Prediksi per Chunk (3 Detik):** Analisis temporal dinamis untuk melacak letupan suara berisik.
3. **Transparansi Hasil & Model Explainability:**
   - **Penjelasan Bahasa Awam:** Heuristik komparasi jarak fitur terhadap rata-rata kelas data latih (3 faktor penguat + 1 faktor kontra).
   - **Tabel 10 Fitur Wajib:** Nilai audio terhadap distribusi kelas latih beserta urutan bobot *Mean Decrease in Impurity* (MDI).
   - **Peringatan Ambang Batas:** Indikator visual bila keyakinan model < 65% atau audio mengalami *clipping*.
4. **Riwayat Sesi & Ekspor:**
   - Penyimpanan riwayat lokal (`sessionStorage`) hingga 50 pengujian.
   - Fitur **Ekspor CSV** untuk dokumentasi data pengujian.
5. **Komparasi Berdampingan (*Side-by-Side*):**
   - Membandingkan 2 rekaman audio secara langsung (nilai fitur akustik dan selisihnya).
6. **Tentang Model & Batasan Etika:**
   - Matriks konfusi 2x2, perbandingan 6 model evaluasi (*Random Forest, Gradient Boosting, SVM, LogReg, KNN*), serta panduan batasan perangkat keras dan kebijakan privasi.

---

## 10 Fitur Spektral yang Diekstraksi

Pipeline audio membuang bagian hening (*silence removal*) menggunakan `librosa.effects.split(top_db=25)` dan menggabungkan segmen aktif (`np.concatenate`) pada frekuensi sampling 22.050 Hz:

| # | Nama Fitur | Parameter Fisik | Bobot (MDI) |
|---|---|---|:---:|
| 1 | `rms_mean` | Volume rata-rata (Root Mean Square) | 0.169 |
| 2 | `mfcc1_mean` | Bentuk spektrum energi keseluruhan | 0.094 |
| 3 | `rms_std` | Dinamika / naik-turun volume antar frame | 0.092 |
| 4 | `mfcc3_mean` | Warna suara / timbre komponen ke-3 | 0.087 |
| 5 | `zcr_mean` | Kerapatan perpotongan nol (desis frekuensi tinggi) | 0.056 |
| 6 | `mfcc6_mean` | Detail warna suara ke-6 | 0.053 |
| 7 | `mfcc7_mean` | Detail warna suara ke-7 | 0.053 |
| 8 | `mfcc13_mean` | Detail halus timbre ke-13 | 0.045 |
| 9 | `mfcc5_mean` | Detail warna suara ke-5 | 0.045 |
| 10 | `centroid_mean` | Pusat massa spektrum (kecerahan suara dalam Hz) | 0.044 |

---

## Cara Menjalankan Aplikasi

### 1. Menjalankan Server Produksi Lengkap (Single Command)
Frontend telah dibuild ke dalam bundle `frontend/dist/`. FastAPI secara otomatis menyajikan antarmuka frontend SPA beserta API backend:

```bash
# Dari root proyek (C:\laragon\www\Bismillah_A)
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```
Buka peramban di: **`http://localhost:8080/`**

---

### 2. Mode Pengembangan Terpisah (Development Mode)

#### A. Backend (FastAPI):
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```
- API Health: `http://localhost:8080/api/health`
- API Model Info: `http://localhost:8080/api/model-info`
- Swagger Docs: `http://localhost:8080/docs`

#### B. Frontend (Vite + React + TypeScript):
```bash
cd frontend
npm run dev
```
Buka peramban di: **`http://localhost:5173/`** (Vite secara otomatis melakukan *reverse-proxy* panggilan `/api` dan `/samples` ke port 8080).

---

### 3. Menjalankan dengan Docker / Docker Compose (Kontainerisasi)

Aplikasi telah dilengkapi multi-stage `Dockerfile` dan `docker-compose.yml` siap pakai:

```bash
# Bangun dan jalankan kontainer aplikasi (port 8080)
docker compose up --build
```
Buka peramban di: **`http://localhost:8080/`**

---

## Menjalankan Pengujian (Testing)

Sistem dilengkapi rangkaian pengujian otomatis:
```bash
# 1. Uji pemuatan model & spesifikasi 10 fitur:
python backend/tests/test_model_load.py

# 2. Uji paritas fitur vs data latih (P1):
python backend/tests/test_parity.py
```
