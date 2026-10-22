# Sonalyze — Sistem Deteksi & Klasifikasi Kebisingan Audio Real-Time

Aplikasi web cerdas untuk analisis dan klasifikasi tingkat kebisingan audio (*Berisik* vs *Non-Berisik*) secara real-time menggunakan ekstraksi fitur spektral audio digital dan algoritma pembelajaran mesin **Random Forest** untuk tugas mata kuliah **Proyek Sains Data** (PSD).

---

## Informasi Akademik Proyek
- **Mata Kuliah:** Proyek Sains Data (PSD)
- **Program Studi:** Sains Data / Teknik Informatika
- **Tim Pengembang:**
  - Muhammad Zaidan Nabil Rafi (240411100068)
  - Okan Syailendra Wahyudi (240411100179)
  - Alifah Sayyidaturrhohma (240411100145)
- **Dataset:** 200 sampel audio rekaman suara PSD (160 data latih, 40 data uji)
- **Akurasi Model Terpilih (Random Forest):** 92,5% (F1-Score: 92,5%, ROC-AUC: 0.9250)
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
3. **Visualisasi Sinyal & Spektrogram Interaktif:**
   - **Waveform Canvas:** Downsampling 2000 titik sampel sinkron dengan *audio player* dan penanda interval hening.
   - **Spektrogram Mel (64 Bins):** Pemetaan warna *Inferno* dengan inspeksi frekuensi (Hz) dan waktu (*hover tooltip*).
   - **Linimasa Prediksi per Chunk (3 Detik):** Analisis temporal dinamis untuk melacak letupan suara berisik.
4. **Transparansi Hasil & Model Explainability:**
   - **Penjelasan Bahasa Awam:** Heuristik komparasi jarak fitur terhadap rata-rata kelas data latih (faktor penguat dan faktor penyeimbang).
   - **Tabel 14 Fitur Spektral:** Nilai audio terhadap distribusi kelas latih beserta urutan bobot *Mean Decrease in Impurity* (MDI).
   - **Peringatan Ambang Batas:** Indikator visual bila keyakinan model < 65% atau audio mengalami *clipping*.
5. **Riwayat Sesi & Ekspor:**
   - Penyimpanan riwayat lokal (`sessionStorage`) hingga 50 pengujian.
   - Fitur **Ekspor CSV** untuk dokumentasi data pengujian.
6. **Komparasi Berdampingan (*Side-by-Side*):**
   - Membandingkan 2 rekaman audio secara langsung (nilai fitur akustik dan selisihnya).
7. **Tentang Model:**
   - Matriks konfusi 2x2, perbandingan 6 model evaluasi (*Random Forest, Gradient Boosting, SVM, LogReg, KNN*), serta spesifikasi teknis parameter model.

---

## 14 Fitur Spektral yang Diekstraksi

Pipeline audio membuang bagian hening (*silence removal*) menggunakan `librosa.effects.split(top_db=25)` dan menggabungkan segmen aktif (`np.concatenate`) pada frekuensi sampling 22.050 Hz:

| # | Nama Fitur | Parameter Fisik | Bobot (MDI) |
|---|---|---|:---:|
| 1 | `rms_mean` | Volume rata-rata (Root Mean Square) | 0.199 |
| 2 | `rms_std` | Dinamika / naik-turun volume antar frame | 0.107 |
| 3 | `mfcc3_mean` | Warna suara / timbre komponen ke-3 | 0.087 |
| 4 | `mfcc1_mean` | Bentuk spektrum energi keseluruhan | 0.083 |
| 5 | `mfcc5_mean` | Keseimbangan spektral frekuensi vokal/lingkungan | 0.080 |
| 6 | `mfcc7_mean` | Detail harmonik frekuensi menengah ke-7 | 0.057 |
| 7 | `mfcc11_mean` | Spektrum mikro resolusi atas ke-11 | 0.055 |
| 8 | `zcr_mean` | Kerapatan perpotongan nol (desis frekuensi tinggi) | 0.052 |
| 9 | `centroid_mean` | Pusat massa spektrum (kecerahan suara dalam Hz) | 0.050 |
| 10 | `mfcc13_mean` | Karakteristik tekstur mikro frekuensi tinggi ke-13 | 0.049 |
| 11 | `mfcc10_mean` | Detail harmonik desis tingkat tinggi ke-10 | 0.048 |
| 12 | `mfcc8_mean` | Resonansi menengah-tinggi frekuensi bising ke-8 | 0.046 |
| 13 | `mfcc6_mean` | Distribusi artikulasi resonansi tengah ke-6 | 0.045 |
| 14 | `mfcc9_mean` | Transisi timbre mikro frekuensi atas ke-9 | 0.042 |

-----

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
# 1. Uji pemuatan model & spesifikasi 14 fitur:
python backend/tests/test_model_load.py

# 2. Uji paritas fitur vs data latih (P1):
python backend/tests/test_parity.py
```
