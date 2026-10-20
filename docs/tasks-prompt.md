# Tasks dan Prompt — Sound Lab

**Ringkasan.** Dokumen gabungan (menggantikan tasks.md dan prompt.md pada jalur ringkas). Bagian A berisi breakdown tugas bertahap yang bisa dicentang (Tahap 0–6) lengkap dengan estimasi, dependensi, definisi selesai, dan jalur kritis. Bagian B berisi prompt siap pakai untuk tool coding AI (satu per tahap, plus prompt awal, prompt akhir, dan prompt untuk tool desain/UI generator). Uji paritas fitur dan uji kasus tepi ada di model-spec.md §11 (menggantikan testing.md).

## Daftar Isi
- Bagian A — Tasks
- Bagian B — Prompt
  - B0 Setup proyek
  - B1 Backend + tes paritas fitur
  - B2 UI inti
  - B3 Visualisasi
  - B4 Riwayat + Bandingkan
  - B5 Halaman informasi
  - B6 Polish + deploy + README
  - B7 Review dan perbaikan bug
  - B8 Prompt untuk tool desain/UI generator
- Cek Kesiapan Sebelum Memakai Prompt

Legenda: ⭐ = jalur kritis. Estimasi dalam jam. Dokumen rujukan: PRD.md, desain.md, arsitektur.md, model-spec.md, api-spec.md (semua di folder `docs/`).

---

# Bagian A — Tasks

## Tahap 0 — Persiapan (7 jam)
- [ ] **T0.1 ⭐ Repo dan struktur folder.** Buat struktur sesuai arsitektur.md §4, salin 6 dokumen ke `docs/`, buat `.gitignore`, `.dockerignore`, `.env.example`. *Estimasi 1 · Dependensi: — · Selesai bila:* struktur sama dengan arsitektur.md §4 dan Git commit awal ada.
- [ ] **T0.2 ⭐ Environment Python + muat model.** Python 3.12, virtualenv, `pip install -r backend/requirements-dev.txt`, muat `.pkl`, jalankan pemeriksaan model-spec.md §2. *Estimasi 1,5 · Dep: T0.1 · Selesai bila:* semua pemeriksaan lolos dan tidak ada `InconsistentVersionWarning`; konflik versi (bila ada) dicatat di README, `scikit-learn` tidak diubah.
- [ ] **T0.3 ⭐ `class_means.json` dan `model_meta.json`.** Buat dari `train_data.csv` sesuai model-spec.md §6; isi `model_meta.json` dengan metrik dari model-spec.md §1. *Estimasi 2 · Dep: T0.1 · Selesai bila:* 10 fitur urut sesuai §4, tidak ada nilai `null`, `pooled_std` > 0.
- [ ] **T0.4 Audio contoh.** Siapkan 3 berkas (berisik, non-berisik, ambigu) di `samples/` dari data yang boleh dibagikan. *Estimasi 1 · Dep: T0.1 · Selesai bila:* 3 berkas ≤ 15 MB dan tercatat judul serta `expected_label`.
- [ ] **T0.5 Inisialisasi frontend.** Vite + React 18 + TypeScript, React Router, lucide-react, token CSS dari desain.md §2–§4, font. *Estimasi 1,5 · Dep: T0.1 · Selesai bila:* `npm run dev` menampilkan halaman kosong bertema Sound Lab dan token tersedia sebagai CSS variables.

## Tahap 1 — Backend + tes paritas fitur (18 jam)
- [ ] **T1.1 Config, error, skema.** `config.py` (variabel `.env`), `errors.py` (kode dan pesan dari api-spec.md §5), `schemas.py`. *Estimasi 2 · Dep: T0.2 · Selesai bila:* semua kode error terdaftar dengan pesan Indonesia.
- [ ] **T1.2 ⭐ Validasi dan file temporer.** Cek ukuran, ekstensi, magic bytes, streaming dengan batas 15 MB, nama acak, penghapusan di `finally`. *Estimasi 2 · Dep: T1.1 · Selesai bila:* urutan validasi sesuai api-spec.md §2.2 dan tidak ada file tersisa di `TMP_DIR` setelah sukses maupun error.
- [ ] **T1.3 ⭐ Pipeline fitur.** Implementasi model-spec.md §3 (split + concatenate). *Estimasi 3 · Dep: T1.1 · Selesai bila:* 19 fitur terhitung; 10 fitur disusun sesuai urutan wajib.
- [ ] **T1.4 ⭐ Predictor.** Muat model sekali saat startup (lifespan) beserta pemanasan, `predict`/`predict_proba`, prediksi per chunk. *Estimasi 2 · Dep: T1.3 · Selesai bila:* probabilitas berurutan sesuai `model.classes_`.
- [ ] **T1.5 Penjelasan dan data visual.** `explain.py` (model-spec.md §7), `visuals.py` (waveform, spektrogram, MFCC, interval aktif; §10). *Estimasi 3 · Dep: T0.3, T1.3 · Selesai bila:* keluaran sesuai skema api-spec.md §2.3.
- [ ] **T1.6 ⭐ Router API.** `/api/predict`, `/api/model-info`, `/api/health`; ThreadPool, semaphore, timeout, rate limit, log JSON, header. *Estimasi 3 · Dep: T1.2, T1.4, T1.5 · Selesai bila:* contoh response sesuai api-spec.md dan semua kode error terpetakan.
- [ ] **T1.7 ⭐ Tes paritas dan kasus tepi.** Tes P0–P8 di model-spec.md §11. *Estimasi 3 · Dep: T1.6 · Selesai bila:* P1 (paritas ≤ 1%) lulus. **Jangan mulai Tahap 2 sebelum P1 lulus.**

## Tahap 2 — UI inti (18 jam)
- [ ] **T2.1 Layout dan navigasi.** Sidebar (tablet/desktop), tab bar (mobile), routing 5 halaman, skip link. *Estimasi 2 · Dep: T0.5 · Selesai bila:* sesuai desain.md §5 pada 360/768/1280.
- [ ] **T2.2 Komponen dasar.** Tombol (5 varian + state), badge, toast, modal, input, spinner, skeleton. *Estimasi 3 · Dep: T0.5 · Selesai bila:* semua state di desain.md §8 tersedia dan fokus keyboard terlihat.
- [ ] **T2.3 ⭐ Upload zone (F01).** Drag-and-drop, validasi klien, state lengkap. *Estimasi 2 · Dep: T2.2 · Selesai bila:* acceptance criteria F01 terpenuhi.
- [ ] **T2.4 Rekam mikrofon (F02).** Rekam 5–30 dtk, level meter live, encode WAV mono di browser, penanganan izin ditolak. *Estimasi 4 · Dep: T2.2 · Selesai bila:* acceptance criteria F02 terpenuhi dan WAV hasil rekam diterima `/api/predict`.
- [ ] **T2.5 Contoh audio (F03).** Ambil daftar dari `/api/model-info`, unduh lalu kirim ke `/api/predict`. *Estimasi 1 · Dep: T2.6 · Selesai bila:* 1 klik menjalankan analisis.
- [ ] **T2.6 ⭐ Klien API dan alur status.** Kirim multipart, stepper 4 tahap, timeout 60 dtk, pesan "Server sedang bangun", error dari kode API. *Estimasi 2 · Dep: T1.6, T2.2 · Selesai bila:* semua kode error menampilkan pesan Indonesia yang benar.
- [ ] **T2.7 ⭐ Kartu hasil (F05, F11).** Badge, gauge, VU-meter RMS, probabilitas 2 kelas, banner peringatan < 65%. *Estimasi 4 · Dep: T2.6 · Selesai bila:* acceptance criteria F05 dan F11 terpenuhi.

## Tahap 3 — Visualisasi (13,5 jam)
- [ ] **T3.1 ⭐ Pemutar + waveform + kursor sapu (F04, F06).** Sinkron ≤ 100 ms, seek, pintasan keyboard, tandai interval hening dibuang. *Estimasi 4 · Dep: T2.7 · Selesai bila:* acceptance criteria F04 dan F06 terpenuhi.
- [ ] **T3.2 Spektrogram (F07).** Colormap inferno, sumbu waktu dan frekuensi, legenda. *Estimasi 2 · Dep: T2.7 · Selesai bila:* F07 terpenuhi.
- [ ] **T3.3 Profil MFCC.** Bar 13 koefisien. *Estimasi 1 · Dep: T2.7 · Selesai bila:* sesuai desain.md §11.
- [ ] **T3.4 Timeline per chunk (F08).** Sel per chunk, opasitas = confidence, label "Indikatif", tooltip. *Estimasi 2 · Dep: T2.7 · Selesai bila:* F08 terpenuhi.
- [ ] **T3.5 Perbandingan 10 fitur (F09).** Bar dan tabel dengan penanda rata-rata kelas. *Estimasi 3 · Dep: T2.7 · Selesai bila:* F09 terpenuhi, urutan fitur benar.
- [ ] **T3.6 Panel penjelasan (F10).** 3 alasan + faktor berlawanan + tautan detail. *Estimasi 1,5 · Dep: T3.5 · Selesai bila:* F10 terpenuhi.

## Tahap 4 — Riwayat + Bandingkan (12 jam)
- [ ] **T4.1 Penyimpanan riwayat.** sessionStorage, maks 50 entri. Simpan ringkasan ≤ 10 KB per entri: prediksi, 10 fitur, durasi, nama/sumber, waveform 200 titik (tanpa spektrogram dan chunk). Audio tidak disimpan. *Estimasi 2 · Dep: T2.7 · Selesai bila:* entri terlama terhapus pada entri ke-51 dan tidak melebihi kuota browser.
- [ ] **T4.2 Halaman Riwayat.** Tabel/kartu, hapus entri, hapus semua dengan modal. *Estimasi 3 · Dep: T4.1 · Selesai bila:* sesuai desain.md §9.2.
- [ ] **T4.3 Ekspor CSV (F12).** Kolom sesuai F12 (termasuk 10 fitur berurutan), UTF-8, titik desimal. *Estimasi 2 · Dep: T4.1 · Selesai bila:* CSV terbuka benar di Excel/Sheets.
- [ ] **T4.4 Halaman Bandingkan (F13).** Dua slot (riwayat atau unggah), hasil berdampingan, tabel selisih, kegagalan sebagian. *Estimasi 5 · Dep: T4.1 · Selesai bila:* sesuai desain.md §9.3. Entri dari riwayat tampil tanpa pemutar audio.

## Tahap 5 — Halaman informasi (6 jam)
- [ ] **T5.1 Tentang Model (F14).** Metrik, confusion matrix, perbandingan 6 model, importance, pipeline, data; sumber `/api/model-info`. *Estimasi 4 · Dep: T1.6, T2.2 · Selesai bila:* angka sama dengan model-spec.md §1.
- [ ] **T5.2 Batasan & Etika (F15).** Konten sesuai PRD F15 dan model-spec.md §12; anchor dari banner peringatan. *Estimasi 2 · Dep: T2.2 · Selesai bila:* F15 terpenuhi.

## Tahap 6 — Polish + deploy + README (18 jam)
- [ ] **T6.1 Aksesibilitas.** Lighthouse Accessibility ≥ 90, axe tanpa pelanggaran serius, navigasi keyboard penuh, label ARIA. *Estimasi 3 · Dep: Tahap 3–5 · Selesai bila:* sesuai desain.md §10.
- [ ] **T6.2 Responsif dan motion.** Cek 360/768/1280, `prefers-reduced-motion`, zoom 200%. *Estimasi 3 · Dep: Tahap 3–5.*
- [ ] **T6.3 ⭐ Uji performa dan RAM.** Audio 30 dtk < 10 dtk (p95), 120 dtk < 30 dtk, ukur puncak RAM. *Estimasi 2 · Dep: T1.7 · Selesai bila:* angka tercatat di README.
- [ ] **T6.4 ⭐ Dockerfile dan uji lokal.** Build image sesuai arsitektur.md §3, jalankan, uji 3 contoh. *Estimasi 2 · Dep: T6.3.*
- [ ] **T6.5 ⭐ Deploy.** Deploy ke Google Cloud Run (atau cadangan lokal), set `.env`, health check, uji pasca-deploy, atur anggaran dan alert. *Estimasi 3 · Dep: T6.4 · Selesai bila:* tautan publik berfungsi dan 3 contoh memberi hasil yang diharapkan.
- [ ] **T6.6 README.** Cara menjalankan, versi dipin, hasil paritas, performa, deploy, batasan. *Estimasi 2 · Dep: T6.5.*
- [ ] **T6.7 Review dan perbaikan bug.** Telusuri PRD acceptance criteria satu per satu. *Estimasi 3 · Dep: semua.*

**Total ≈ 92,5 jam.**

**Jalur kritis:** T0.1 → T0.2 → T1.2/T1.3 → T1.4 → T1.6 → **T1.7 (paritas)** → T2.6 → T2.7 → T3.1 → T6.3 → T6.4 → T6.5.

---

# Bagian B — Prompt

Catatan pemakaian: tempel satu prompt per tahap pada tool coding AI. Pastikan folder `docs/` berisi PRD.md, desain.md, arsitektur.md, model-spec.md, api-spec.md sebelum memulai. Jangan lanjut ke prompt berikutnya sebelum "Cara memverifikasi" pada prompt sebelumnya lolos.

## B0 — Setup proyek

```text
PERAN: Kamu engineer full-stack. Kita membangun website "Sound Lab" yang mengklasifikasikan suara menjadi BERISIK atau NON-BERISIK memakai model Random Forest (model_klasifikasi_audio.pkl).

BACA DULU (folder docs/): arsitektur.md (terutama bagian 3, 4, 11), model-spec.md (bagian 1, 2, 4), api-spec.md (bagian 1).

KONTEKS: Backend Python 3.12 + FastAPI, frontend React 18 + TypeScript + Vite. Satu container pada produksi. Model dilatih dengan scikit-learn 1.8.0.

TUGAS:
1. Buat struktur folder persis seperti arsitektur.md bagian 4 (file boleh kosong/placeholder yang minimal).
2. Buat backend/requirements.txt dan backend/requirements-dev.txt persis seperti di arsitektur.md bagian 3 (semua versi dipin).
3. Buat .env.example berisi semua variabel pada arsitektur.md bagian 11 dengan nilai default.
4. Buat .gitignore dan .dockerignore (abaikan venv, node_modules, dist, __pycache__, .env, file audio sementara).
5. Buat virtualenv Python 3.12, install requirements-dev, lalu tulis skrip pemeriksaan sekali jalan di backend/tests/test_model_load.py yang memuat data/model_klasifikasi_audio.pkl dengan joblib dan menjalankan 7 pemeriksaan pada model-spec.md bagian 2. Tes harus gagal jika ada warning versi scikit-learn.
6. Inisialisasi frontend: Vite + React + TypeScript, React Router, lucide-react. Buat file token CSS (CSS variables) dari desain.md bagian 2, 3, 4 (warna, tipografi, spacing, radius). Belum ada halaman.

BATASAN:
- Bahasa UI dan pesan: Indonesia.
- Urutan 10 fitur wajib: rms_mean, mfcc1_mean, rms_std, mfcc3_mean, zcr_mean, mfcc6_mean, mfcc7_mean, mfcc13_mean, mfcc5_mean, centroid_mean. Jangan diubah.
- Versi library dipin; scikit-learn==1.8.0 tidak boleh diubah. Bila ada konflik versi lain, ubah versi pendukung seminimal mungkin dan catat di README.
- Belum menulis logika bisnis di tahap ini.
- Jika ada ambiguitas, tulis asumsi di docs/ASUMSI.md lalu lanjut.

KRITERIA SELESAI: struktur folder sesuai, dependensi terpasang, tes pemuatan model lulus, npm run dev tampil halaman kosong yang memakai token warna dan font.

CARA MEMVERIFIKASI: jalankan pytest backend/tests/test_model_load.py; jalankan npm run dev lalu cek bahwa latar #0B0F14 dan font Inter termuat.
```

## B1 — Backend + tes paritas fitur

```text
PERAN: Kamu engineer backend Python (FastAPI) dan data science.

BACA DULU (folder docs/): model-spec.md (seluruhnya), api-spec.md (seluruhnya), arsitektur.md (bagian 5-11).

KONTEKS: Setup proyek sudah selesai (struktur folder, requirements, model termuat). Sekarang bangun backend.

TUGAS:
1. config.py: baca semua variabel .env (arsitektur.md bagian 11) dengan pydantic-settings.
2. errors.py dan schemas.py: semua kode error dan pesan Indonesia sesuai api-spec.md bagian 5; ubah galat validasi bawaan FastAPI (field hilang) menjadi 400 FILE_TIDAK_ADA; format error seragam dengan request_id.
3. services/audio_loader.py: validasi berurutan sesuai api-spec.md bagian 2.2 (Content-Length, field/berkas kosong, ekstensi, magic bytes, ukuran saat streaming, dekode, durasi, senyap total). Tulis ke TMP_DIR dengan nama uuid, hapus di blok finally, bersihkan TMP_DIR saat startup.
4. services/features.py: implementasi pipeline model-spec.md bagian 3 PERSIS. Buang hening dengan librosa.effects.split(top_db=25) lalu np.concatenate (BUKAN effects.trim). Chunk 3 detik tanpa overlap, sisa dibuang, zero-pad bila < 1 chunk. Hitung 19 fitur; susun 10 fitur sesuai urutan wajib dalam DataFrame 1 baris.
5. services/predictor.py: muat model sekali di lifespan, jalankan validasi model-spec.md bagian 2, pemanasan dengan sinyal sintetis, predict/predict_proba (urutan dari model.classes_), prediksi per chunk (bagian 8).
6. services/explain.py: penjelasan sesuai model-spec.md bagian 7 (class_means.json, importance, template kalimat awam).
7. services/visuals.py: waveform min/max <= 2000 titik, spektrogram mel 64 x <= 300 (0-255), profil MFCC 13 nilai, interval aktif (model-spec.md bagian 10).
8. api/: POST /api/predict, GET /api/model-info, GET /api/health sesuai api-spec.md. Ekstraksi di ThreadPoolExecutor(MAX_WORKERS) + asyncio.Semaphore, timeout proses 30 dtk, rate limit slowapi, log JSON tanpa nama file dan tanpa isi audio, header X-Request-ID dan Cache-Control: no-store. Sajikan folder samples/ di /samples dan frontend/dist (bila ada) sebagai file statis.
9. Tes pytest P0 sampai P8 pada model-spec.md bagian 11 (paritas fitur terhadap fitur_audio.csv/train_data.csv, urutan kolom, validasi file, integrasi API, kasus tepi, performa).

BATASAN:
- Jangan ubah urutan 10 fitur; versi library dipin (scikit-learn==1.8.0); bahasa pesan Indonesia.
- Audio tidak boleh disimpan permanen; nama file asli tidak boleh masuk log.
- Periksa parameter librosa di notebook training (frame_length, hop_length) dan std ddof; bila berbeda dari default, ikuti notebook dan catat di docs/ASUMSI.md.
- Jangan membuat frontend di tahap ini.

KRITERIA SELESAI: semua endpoint mengembalikan skema api-spec.md; tes P0-P8 lulus; P1 (selisih fitur <= 1% terhadap CSV) WAJIB lulus.

CARA MEMVERIFIKASI: jalankan pytest backend/tests; jalankan uvicorn, lalu curl -F "file=@samples/contoh-berisik.mp3" http://localhost:8000/api/predict dan periksa struktur JSON, urutan features, serta jumlah probabilitas = 1. Uji file .txt (harus 415), file 0 byte (400), dan mp3 korup (422). Pastikan TMP_DIR kosong setelah tiap uji.
```

## B2 — UI inti

```text
PERAN: Kamu engineer frontend React + TypeScript dan UI engineer.

BACA DULU (folder docs/): PRD.md (fitur F01, F02, F03, F05, F11 beserta acceptance criteria), desain.md (bagian 2-8 dan 9.1), api-spec.md (bagian 2 dan 5).

KONTEKS: Backend sudah berjalan sesuai api-spec.md. Tema "Sound Lab": dark, dashboard ilmiah ala oscilloscope.

TUGAS:
1. Layout: sidebar tipis (tablet >= 768 / desktop >= 1280) dan tab bar bawah (mobile), routing untuk 5 halaman (Analisis, Riwayat, Bandingkan, Tentang Model, Batasan & Etika; halaman selain Analisis boleh placeholder), skip link.
2. Komponen dasar sesuai desain.md bagian 8: tombol (record, primer, sekunder, ghost, bahaya) dengan state hover/active/focus/disabled/loading, badge hasil, toast, modal (focus trap), input, spinner, skeleton.
3. Halaman Analisis: hero dengan waveform animasi pelan; panel input dengan tab Unggah | Rekam | Contoh.
4. Upload zone (F01): drag-and-drop, validasi klien (ekstensi .mp3 .wav .ogg .flac .m4a, maks 15 MB), semua state di desain.md 8.6.
5. Rekam mikrofon (F02): 5-30 dtk, level meter live, berhenti otomatis di 30 dtk, penanganan izin ditolak, encode hasil rekaman menjadi WAV mono di browser sebelum upload.
6. Contoh audio (F03): daftar dari GET /api/model-info (samples), unduh berkas lalu kirim ke /api/predict seperti upload biasa.
7. Klien API: kirim multipart (field "file"), stepper 4 tahap, timeout 60 dtk, pesan "Server sedang bangun" bila > 5 dtk, tampilkan pesan error sesuai kode API.
8. Kartu hasil (F05): badge BERISIK/NON-BERISIK, gauge setengah lingkaran dengan penanda 65%, VU-meter RMS, probabilitas 2 kelas, banner peringatan confidence < 65% (F11). Angka confidence menghitung naik (hormati prefers-reduced-motion).

BATASAN:
- UI dan pesan dalam Bahasa Indonesia; ikuti token warna dan tipografi desain.md persis (berisik #FF6B35, non-berisik #22D3C5, netral #8B5CF6).
- Kelas harus dibedakan teks + ikon, bukan warna saja.
- Jangan memakai library chart; gauge dan VU-meter dibuat dengan SVG/CSS.
- Format angka: confidence 1 desimal dengan koma (desain.md bagian 11).
- Jangan mengubah backend; bila kontrak API tidak cukup, catat di docs/ASUMSI.md.

KRITERIA SELESAI: acceptance criteria F01, F02, F03, F05, F11 terpenuhi; navigasi keyboard berfungsi; tampilan benar pada 360, 768, 1280 px.

CARA MEMVERIFIKASI: unggah contoh berisik dan non-berisik lalu cek hasil; coba file 20 MB (ditolak di klien), file .txt (ditolak), tolak izin mikrofon (pesan panduan muncul); tekan Tab dan pastikan fokus terlihat; aktifkan reduced motion di OS dan pastikan angka tidak beranimasi.
```

## B3 — Visualisasi

```text
PERAN: Kamu engineer frontend yang ahli visualisasi data (SVG/Canvas).

BACA DULU (folder docs/): PRD.md (F04, F06, F07, F08, F09, F10), desain.md (bagian 7, 8.7, 9.1, 11), api-spec.md (bagian 2.3, terutama visual, chunks, features, explanation, active_intervals).

KONTEKS: Halaman Analisis sudah menampilkan kartu hasil. Tambahkan visualisasi dan pemutar dari data JSON /api/predict.

TUGAS:
1. Pemutar audio (F04) memakai Object URL dari berkas lokal; waveform (F06) dari visual.waveform.min/max, tinggi 96 px (mobile 72); bagian sudah diputar berwarna kelas hasil penuh, sisanya opasitas 0,4; kursor garis vertikal bercahaya menyapu sesuai currentTime (selisih <= 100 ms); seek lewat klik; Spasi = putar/jeda, panah kiri/kanan = +-5 dtk. Tandai interval hening yang dibuang (dari active_intervals) dengan area redup.
2. Spektrogram (F07): render data 0-255 dengan colormap inferno, sumbu waktu (detik) dan frekuensi (Hz dari freqs_hz), legenda warna.
3. Profil MFCC: bar 13 koefisien (mfcc1_mean sampai mfcc13_mean), warna netral #8B5CF6.
4. Timeline per chunk (F08): satu sel per chunk, warna kelas, opasitas = 0,35 + 0,65 x confidence, label "Indikatif" + tooltip penjelasan. Tooltip menampilkan rentang waktu yang diberi keterangan "pada audio setelah hening dibuang".
5. Perbandingan 10 fitur (F09): bar horizontal + tabel; urutan fitur sesuai urutan wajib; segitiga warna berisik/non-berisik untuk rata-rata kelas, belah ketupat netral untuk nilai audio; format angka sesuai desain.md bagian 11.
6. Panel penjelasan (F10): tampilkan reasons (maks 3) dan counter_reasons (maks 1) dari API, tautan "Lihat detail teknis" menggulir ke panel F09.

BATASAN:
- Tanpa library chart; gunakan SVG/Canvas.
- Warna kelas konsisten di semua grafik; nilai audio pengguna selalu #8B5CF6.
- Setiap grafik punya role="img" + aria-label dan data setaranya tersedia sebagai tabel/daftar.
- Hormati prefers-reduced-motion (kursor tetap bergerak mengikuti audio, tanpa glow berdenyut).
- Jangan mengubah urutan fitur atau kontrak API.

KRITERIA SELESAI: acceptance criteria F04, F06, F07, F08, F09, F10 terpenuhi pada 360, 768, 1280 px.

CARA MEMVERIFIKASI: putar contoh 30 dtk dan cek kursor sinkron saat seek; bandingkan urutan baris F09 dengan urutan wajib; periksa tooltip chunk; tab keyboard ke pemutar lalu uji Spasi dan panah; cek dengan pembaca layar atau inspeksi atribut ARIA.
```

## B4 — Riwayat + Bandingkan

```text
PERAN: Kamu engineer frontend React + TypeScript.

BACA DULU (folder docs/): PRD.md (F12, F13), desain.md (bagian 8.8, 8.10, 9.2, 9.3), api-spec.md (bagian 2.3, features dan prediction).

KONTEKS: Analisis dan visualisasi sudah selesai. Tambahkan riwayat sesi, ekspor CSV, dan perbandingan dua audio. Tidak ada backend baru.

TUGAS:
1. Penyimpanan riwayat di sessionStorage (hilang saat tab ditutup), maksimal 50 entri (terlama dihapus). Simpan RINGKASAN <= 10 KB per entri: id, waktu, sumber (Unggah/Rekam/Contoh), nama file, durasi, prediksi (label, confidence, probabilitas), 10 fitur berurutan beserta rata-rata kelas, waveform yang di-downsample ke 200 titik. JANGAN simpan audio, spektrogram, atau chunk. Tangani kuota penuh dengan aman (try/catch + toast).
2. Halaman Riwayat (desain.md 9.2): tabel desktop, kartu mobile, buka ringkasan, hapus entri, "Hapus riwayat" dengan modal konfirmasi, state kosong/loading/error.
3. Ekspor CSV (F12): kolom waktu, nama_file, sumber, label, confidence, prob_berisik, prob_non_berisik, durasi_detik, lalu 10 fitur sesuai urutan wajib; UTF-8, pemisah koma, titik desimal.
4. Halaman Bandingkan (F13): dua slot A dan B (pilih dari riwayat atau unggah file baru), tombol Bandingkan, hasil berdampingan (kartu hasil, waveform, selisih 10 fitur dengan panah naik/turun + angka), ringkasan kalimat, kegagalan sebagian (slot gagal menampilkan error, slot lain tetap tampil). Entri dari riwayat tampil tanpa pemutar audio. Label A/B memakai huruf dan pola garis (A solid, B putus-putus), bukan warna saja.

BATASAN:
- UI Bahasa Indonesia; ikuti token dan komponen desain.md.
- Jangan mengubah urutan 10 fitur; jangan menyimpan audio.
- Jangan mengubah kontrak API; bila data kurang, catat di docs/ASUMSI.md.

KRITERIA SELESAI: acceptance criteria F12 dan F13 terpenuhi; riwayat bertahan saat berpindah halaman dan hilang saat tab ditutup.

CARA MEMVERIFIKASI: lakukan 55 analisis (atau simulasi) dan pastikan hanya 50 entri tersimpan; ekspor CSV dan buka di spreadsheet (10 kolom fitur berurutan benar); bandingkan dua entri riwayat dan satu entri + satu unggahan baru; uji kegagalan salah satu slot.
```

## B5 — Halaman informasi

```text
PERAN: Kamu engineer frontend dan penulis teknis (Bahasa Indonesia).

BACA DULU (folder docs/): PRD.md (F14, F15), desain.md (bagian 9.4 dan 9.5), model-spec.md (bagian 1, 4, 12), api-spec.md (bagian 3).

KONTEKS: Fitur inti sudah selesai. Buat dua halaman informasi.

TUGAS:
1. Tentang Model (F14): ambil data dari GET /api/model-info. Tampilkan ringkasan model (Random Forest, 10 fitur, scikit-learn 1.8.0), 5 kartu metrik (akurasi 85%, presisi 0,85, recall 0,85, F1 0,85, ROC-AUC 0,8688), confusion matrix 2x2 (17/3 dan 3/17), perbandingan 6 model (Random Forest 85%, Gradient Boosting 80%, SVM RBF 77,5%, SVM Linear 72,5%, Logistic Regression 70%, KNN 70%), grafik importance 10 fitur berurutan menurun, diagram langkah pipeline (muat -> buang hening split+concatenate -> chunk 3 dtk -> fitur -> agregasi), data (latih 158, uji 40, CV 5-fold 84,15% +- 2,94%). State loading (skeleton) dan error (tombol Coba lagi).
2. Batasan & Etika (F15): isi sesuai PRD F15 dan model-spec.md bagian 12 dengan bahasa awam; kartu sorot "alat demonstrasi akademik"; daftar dianjurkan/tidak dianjurkan (ikon + teks); anchor ke bagian "Kapan hasil tidak dapat diandalkan" yang dipakai oleh banner peringatan confidence rendah dan footer.

BATASAN:
- Angka harus identik dengan model-spec.md bagian 1; jangan menambah atau membulatkan lain.
- Ikuti desain.md; kelas dibedakan teks + ikon.
- UI Bahasa Indonesia; aksesibel (judul bertingkat, landmark, data grafik tersedia sebagai tabel).

KRITERIA SELESAI: acceptance criteria F14 dan F15 terpenuhi di 360/768/1280 px.

CARA MEMVERIFIKASI: bandingkan setiap angka di halaman dengan model-spec.md bagian 1; matikan backend untuk melihat state error; klik banner peringatan dan pastikan anchor ke bagian yang benar.
```

## B6 — Polish + deploy + README

```text
PERAN: Kamu engineer full-stack dan DevOps.

BACA DULU (folder docs/): arsitektur.md (bagian 3, 7, 8, 12), desain.md (bagian 7 dan 10), PRD.md (bagian 9 kebutuhan non-fungsional), api-spec.md (bagian 6).

KONTEKS: Semua fitur selesai. Rapikan, ukur performa, kemas, dan deploy.

TUGAS:
1. Aksesibilitas: jalankan Lighthouse dan axe, perbaiki hingga Accessibility >= 90 tanpa pelanggaran serius; pastikan navigasi keyboard penuh dan label ARIA Indonesia.
2. Responsif dan motion: cek 360/768/1280 px, zoom 200%, prefers-reduced-motion.
3. Performa dan RAM: ukur waktu proses audio 30 dtk (target < 10 dtk p95) dan 120 dtk (target < 30 dtk), ukur puncak RAM; catat hasil. Bila target terlewati, kurangi resolusi spektrogram atau jelaskan penyebabnya.
4. Dockerfile sesuai arsitektur.md bagian 3 (multi-stage; ffmpeg dan libsndfile1 terpasang; build frontend ke dist; uvicorn memakai $PORT). Build, jalankan lokal, uji 3 contoh.
5. Deploy ke Google Cloud Run (2 vCPU, 2 GiB, concurrency 4, timeout 60 dtk, max-instances 2) memakai variabel .env; bila tidak memungkinkan, siapkan panduan menjalankan lokal. Uji /api/health, /api/model-info, dan /api/predict dengan 3 contoh; ukur cold start. Panduan atur anggaran dan alert tagihan.
6. README.md: deskripsi, cara menjalankan (dev dan Docker), versi yang dipin, hasil uji paritas (P1) dan performa, panduan deploy, catatan cold start, batasan model, dan keputusan split + concatenate.

BATASAN:
- Versi library dipin; scikit-learn==1.8.0.
- Jangan menyimpan audio; log tanpa nama file.
- Jangan mengubah kontrak API atau urutan fitur.
- Jangan memasukkan kredensial ke repositori.

KRITERIA SELESAI: Lighthouse Accessibility >= 90; image Docker berjalan; tautan publik (atau panduan lokal) berfungsi; README lengkap.

CARA MEMVERIFIKASI: docker build lalu docker run -p 8080:8080; buka http://localhost:8080; jalankan 3 contoh; periksa docker stats saat memproses audio 120 dtk; setelah deploy, panggil /api/health dan ukur waktu respons pertama setelah idle.
```

## B7 — Review dan perbaikan bug

```text
PERAN: Kamu reviewer senior dan QA engineer.

BACA DULU (folder docs/): PRD.md (bagian 6 daftar fitur dan acceptance criteria), model-spec.md (bagian 3, 5, 11), api-spec.md, desain.md (bagian 10).

KONTEKS: Aplikasi sudah lengkap dan ter-deploy. Lakukan review menyeluruh dan perbaiki bug.

TUGAS:
1. Telusuri setiap fitur F01-F15 pada PRD.md dan uji acceptance criteria satu per satu; buat tabel hasil (lulus/gagal/catatan) di docs/HASIL-REVIEW.md.
2. Audit kode backend terhadap model-spec.md: pastikan effects.split + np.concatenate (bukan trim), urutan 10 fitur, urutan probabilitas dari model.classes_, model dimuat sekali, file temp selalu dihapus, tidak ada nama file di log.
3. Audit kontrak: bandingkan respons nyata /api/predict dan /api/model-info dengan api-spec.md (nama field, tipe, urutan features, kode error).
4. Uji kasus tepi: file kosong, mp3 korup, durasi < 0,5 dtk, senyap total, stereo vs mono, audio sangat keras (clipping), 120 dtk, 121 dtk, 15 MB, 15,1 MB, banyak permintaan beruntun (429).
5. Uji UI: 360/768/1280 px, keyboard, reduced motion, state kosong/loading/error di tiap halaman.
6. Perbaiki bug yang ditemukan dengan perubahan sekecil mungkin; tulis tes regresi untuk bug backend.

BATASAN:
- Jangan mengubah urutan fitur, versi library, atau kontrak API tanpa alasan yang ditulis di docs/HASIL-REVIEW.md.
- Jangan menambah fitur baru.
- Bahasa UI tetap Indonesia.

KRITERIA SELESAI: semua acceptance criteria Must lulus; tes pytest hijau; docs/HASIL-REVIEW.md memuat daftar bug, perbaikan, dan sisa risiko.

CARA MEMVERIFIKASI: jalankan pytest; ulangi alur utama (unggah, rekam, contoh, riwayat, bandingkan, ekspor CSV) pada versi yang ter-deploy; pastikan tidak ada galat di konsol browser dan log server.
```

## B8 — Prompt untuk tool desain/UI generator

```text
Rancang UI web app "Sound Lab": dashboard ilmiah mode gelap bergaya instrumen audio/oscilloscope untuk mengklasifikasikan suara menjadi BERISIK atau NON-BERISIK. Gaya serius, presisi, mengutamakan data. Semua teks dalam Bahasa Indonesia.

WARNA: latar #0B0F14, permukaan kartu #121922, garis #1F2A37, teks #E6EDF3, teks sekunder #8B98A9. Aksen BERISIK amber-merah #FF6B35, aksen NON-BERISIK cyan-teal #22D3C5, aksen netral ungu #8B5CF6 (tombol sekunder, penanda nilai pengguna, peringatan). Spektrogram memakai colormap inferno. Warna kelas harus konsisten di semua grafik.
TIPOGRAFI: judul Space Grotesk 600; isi Inter 400/500; angka dan label teknis JetBrains Mono. Skala 12/14/16/20/28/44 px.
BENTUK: kartu radius 12 px, border 1 px #1F2A37, tanpa bayangan tebal; badge hasil berbentuk pill dengan ikon speaker (berisik) atau speaker-mute (non-berisik); glow lembut hanya pada elemen aktif.
LAYOUT: sidebar tipis kiri (ikon di atas, label kecil di bawah; item: Analisis, Riwayat, Bandingkan, Tentang Model, Batasan & Etika), konten grid 12 kolom lebar maks 1200 px; di mobile (360 px) sidebar menjadi tab bar bawah.

HALAMAN 1 - ANALISIS (desktop 1280 dan mobile 360):
- Hero: waveform animasi pelan sebagai latar judul "Sound Lab" dan tagline "Periksa apakah suara di sekitar Anda tergolong berisik atau tidak."
- Panel input dengan tab Unggah | Rekam | Contoh. Tab Unggah: zona drag-and-drop berborder putus-putus, ikon upload, teks "Seret file audio ke sini", tombol "Pilih file", catatan "MP3, WAV, OGG, FLAC, M4A - maks 15 MB - maks 120 detik". Tab Rekam: tombol besar berbentuk record (pill, #FF6B35, berdenyut halus), timer 00:07 / 00:30, level meter horizontal. Tab Contoh: tiga kartu klik.
- Setelah analisis: banner peringatan ungu bila keyakinan di bawah 65%; kartu hasil dengan badge BERISIK, nama file, gauge setengah lingkaran untuk confidence (angka besar mono "89,0%", penanda ambang 65%), dua bar probabilitas, VU-meter vertikal untuk RMS; pemutar audio dengan waveform dan kursor garis vertikal bercahaya; timeline prediksi per bagian 3 detik berlabel "Indikatif"; spektrogram inferno; profil 13 koefisien; kartu "Mengapa hasilnya begini?" berisi 3 alasan bahasa awam; tabel 10 fitur dibanding rata-rata kelas dengan penanda segitiga (rata-rata kelas) dan belah ketupat ungu (nilai audio ini).
HALAMAN 2 - RIWAYAT: tabel (waktu, sumber, label badge, confidence, aksi), tombol "Ekspor CSV" dan "Hapus riwayat", state kosong dengan ajakan ke halaman Analisis.
HALAMAN 3 - BANDINGKAN: dua slot A dan B, tombol "Bandingkan", hasil berdampingan, tabel selisih fitur dengan panah naik/turun.
HALAMAN 4 - TENTANG MODEL: 5 kartu metrik (Akurasi 85%, Presisi 0,85, Recall 0,85, F1 0,85, ROC-AUC 0,8688), confusion matrix 2x2 (17/3 dan 3/17), bar perbandingan 6 model, bar importance 10 fitur, diagram langkah pipeline.
HALAMAN 5 - BATASAN & ETIKA: kartu sorot berborder ungu, daftar batasan, daftar "dianjurkan" dan "tidak dianjurkan" (ikon + teks).

KOMPONEN & STATE: tombol (record, primer, sekunder, ghost, bahaya) dengan hover/fokus/nonaktif/loading; toast; modal konfirmasi; state kosong, loading (skeleton), error di setiap halaman.
AKSESIBILITAS: kontras WCAG AA, outline fokus 2 px ungu terang #A78BFA, target sentuh minimal 44 px, kelas dibedakan teks dan ikon (bukan warna saja).
Hasilkan desktop dan mobile untuk halaman Analisis dalam dua kondisi: sebelum dan sesudah analisis (hasil BERISIK 89,0%).
```

---

## Cek Kesiapan Sebelum Memakai Prompt
- [ ] `docs/` berisi PRD.md, desain.md, arsitektur.md, model-spec.md, api-spec.md.
- [ ] `data/` berisi `model_klasifikasi_audio.pkl`, `train_data.csv`, `fitur_audio.csv`.
- [ ] 3 audio contoh tersedia di `samples/`.
- [ ] Python 3.12 dan Node 20 terpasang; ffmpeg terpasang di komputer lokal.
- [ ] Parameter librosa dan `ddof` notebook training sudah diperiksa (model-spec.md §13).
