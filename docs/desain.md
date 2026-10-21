# Desain — Sound Lab Design System

**Ringkasan.** Sound Lab adalah antarmuka dark mode bergaya dashboard ilmiah ala instrumen audio/oscilloscope: serius, presisi, dan mengutamakan data. Dokumen ini berisi design system (warna, tipografi, spacing, motion, komponen), spesifikasi lima halaman (Analisis, Riwayat, Bandingkan, Tentang Model, Batasan & Etika), aksesibilitas, dan panduan visualisasi data. Ditulis konkret agar dapat langsung dipakai sebagai input tool desain/UI generator dan tool coding.

## Daftar Isi
1. Filosofi dan Mood
2. Warna
3. Tipografi
4. Spacing, Radius, Bayangan
5. Grid, Breakpoint, dan Navigasi
6. Ikonografi
7. Motion
8. Komponen
9. Spesifikasi Halaman
10. Aksesibilitas
11. Panduan Visualisasi Data
12. Asumsi

Rujukan ID fitur (F01–F15) mengikuti PRD.md.

---

## 1. Filosofi dan Mood
- **Instrumen, bukan dekorasi.** Setiap elemen visual (gauge, VU-meter, grid garis tipis) menyampaikan data. Tidak ada ornamen tanpa fungsi.
- **Data dahulu.** Hasil (label + confidence) selalu menjadi elemen paling menonjol; visualisasi pendukung berada di bawahnya.
- **Tenang dan presisi.** Latar gelap pekat, garis tipis 1 px, glow lembut hanya pada elemen aktif.
- **Jujur terhadap ketidakpastian.** Confidence rendah dan prediksi per chunk selalu diberi penanda "Indikatif" atau peringatan.
- **Kata kunci mood:** laboratorium, oscilloscope, studio rekaman malam hari, tenang, presisi.

## 2. Warna

### 2.1 Palet Deep Space Teal & Dark Navy (Bebas Warna Ungu / Violet / Magenta)

| Token | Nilai / Hex | Kegunaan |
|---|---|---|
| `--bg-canvas` | `#040D12` | Latar belakang dasar aplikasi |
| `--bg-navy-deep` | `#07161F` | Gradasi kedalaman navy gelap |
| `--radial-glow-teal` | `rgba(20, 184, 166, 0.15)` | Efek pencahayaan radial sudut kiri atas |
| `--radial-glow-amber` | `rgba(249, 115, 22, 0.10)` | Efek pencahayaan radial sudut kanan bawah |
| `--bg-surface` | `rgba(11, 34, 48, 0.65)` | Permukaan kartu (*Dark Glassmorphism*, blur 16 px) |
| `--border-subtle` | `rgba(45, 212, 191, 0.18)` | Garis batas tipis cyan/teal transparan |
| `--border-active` | `rgba(45, 212, 191, 0.40)` | Border fokus dan hover kartu |
| `--text-primary` | `#F0FDFA` | Teks utama putih bersih |
| `--text-secondary` | `#99F6E4` | Teks sekunder toska muda |
| `--text-muted` | `#94A3B8` | Label teknis, sumbu, keterangan sekunder |

### 2.2 Warna Aksen & Semantik

| Kategori | Token | Hex | Kegunaan |
|---|---|---|---|
| **Tenang / Normal (<70%)** | `--accent-quiet` | `#14B8A6` / `#10B981` | Aksen kelas NON-BERISIK, oskiloskop standby, grafik normal |
| **Peringatan (70% - 90%)** | `--accent-warning` | `#F59E0B` / `#F97316` | Aksen kelas BERISIK moderat, alarm 70-90% |
| **Bahaya (≥ 90%)** | `--accent-danger` | `#EF4444` / `#F43F5E` | Aksen bahaya kebisingan tinggi, alarm 90-100% |

**Aturan Penggunaan Warna:**
1. DILARANG menggunakan warna ungu, violet, atau magenta di seluruh elemen antarmuka.
2. Gaya visual mengutamakan perpaduan *Deep Space Teal, Cyan, Amber*, dan *Coral*.
3. Setiap status penting selalu didampingi teks penjelasan dan ikon (bukan hanya warna).

## 3. Tipografi

| Peran | Font | Bobot | Fallback |
|---|---|---|---|
| Judul | Space Grotesk | 600, 700, 800 | `system-ui, sans-serif` |
| Isi | Inter | 400, 500, 600 | `system-ui, sans-serif` |
| Angka dan label teknis | JetBrains Mono | 400, 500, 600 | `ui-monospace, monospace` |

Skala ukuran: **11 / 12 / 13 / 15 / 17 / 24 / 32 / 40 px**.

## 4. Spacing, Radius, Glassmorphism

- **Permukaan Kartu:** `background: rgba(11, 34, 48, 0.65)`, `backdrop-filter: blur(16px)`, `border: 1px solid rgba(45, 212, 191, 0.20)`.
- **Radius:** `radius-sm` = 6 px, `radius-md` = 10 px, `radius-lg` = 16 px, `pill` = 9999 px.
- **Bayangan:** `box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.45)`.

## 5. Tata Letak (Layout): Landing Page + Integrated Live Workspace

Aplikasi mengadopsi tata letak modern satu atap (*integrated workspace*) tanpa bilah sisi (sidebar) kiri dan tanpa mekanisme login/autentikasi:

1. **Top Navbar Melayang (*Sticky Glassmorphism Header*):**
   - Menempel di bagian atas layar (`position: sticky; top: 0; z-index: 100`).
   - Sisi Kiri: Logo brand Sound Lab dengan animasi ikon gelombang suara.
   - Tengah: Tautan navigasi utama kapsul (`Analisis Audio`, `Riwayat`, `Bandingkan`, `Tentang Model`, `Batasan & Etika`).
   - Sisi Kanan: Badge spesifikasi model (`v1.0 • Random Forest`) dan indikator status backend real-time (`● Engine Siap` / `● Engine Offline` dari `/api/health`).
   - Tanpa tombol login, registrasi, atau coba gratis.

2. **Hero Section + Panel Kontrol Berdampingan (Split Hero Layout):**
   - **Sisi Kiri (Hero Intro):** Headline besar *"Analisis Kebisingan Lingkungan Kerja"* dengan gradasi teks Teal ke Cyan, deskripsi aplikasi, dekorasi gelombang frekuensi suara, dan 2 tombol CTA: **"Mulai Deteksi Sekarang"** dan **"Pelajari Fitur"**.
   - **Sisi Kanan (Control Card):** Tab switch (`Deteksi Real-Time` vs `Analisis Berkas / Sampel`), badge status (`STANDBY` / `MONITORING`), durasi timer, toggle `Alarm Suara: AKTIF/MATI`, tombol utama `▶ Mulai Monitoring`, status ambang alarm (`70% - 90%: alarm_70-90%.mp3` & `≥ 90%: alarm_90-100%.mp3`), slider volume alarm, dan tombol uji suara (`▶ Uji 70-90%`, `▶ Uji ≥90%`).

3. **Bagian Bawah (2 Kolom Sejajar pada Desktop):**
   - **Kolom Kiri:** Kartu **Oskiloskop Sinyal Suara Langsung (60 FPS)** dengan grid teknis lab, gelombang berlapis (*primary glow* + *faint secondary wave*), dan animasi ritme aritmia standby saat idle.
   - **Kolom Kanan:** Kartu **Linimasa Riwayat Kebisingan (30 Detik Terakhir)** dengan kurva mulus *Bezier spline area chart*, gradasi bertingkat (hijau-toska <70%, oranye 70-90%, merah ≥90%), dan indikator titik pulsa temporal.
   - **Ringkasan Kumulatif Sesi:** Kartu statistik total durasi evaluasi, persentase dominasi berisik vs tenang, dan puncak volume (Peak RMS).

## 6. Ikonografi
- Set ikon: Lucide (stroke 1,75 px, ukuran 20/24 px), warna mengikuti teks atau warna kelas.
- Ikon wajib: `audio-waveform` (Analisis), `history` (Riwayat), `git-compare` atau `columns-2` (Bandingkan), `cpu` (Tentang Model), `shield-alert` (Batasan & Etika), `volume-2` (berisik), `volume-x` (non-berisik), `mic`, `upload`, `play`, `pause`, `download`, `trash-2`, `info`, `triangle-alert`, `circle-check`, `circle-x`.
- Ikon dekoratif memakai `aria-hidden="true"`; ikon tanpa teks wajib punya `aria-label`.

## 7. Motion

| Token | Durasi | Easing | Penggunaan |
|---|---|---|---|
| `motion-fast` | 120 ms | ease-out | Hover, perubahan warna |
| `motion-base` | 200 ms | `cubic-bezier(0.16,1,0.3,1)` | Transisi komponen, toast, modal |
| `motion-slow` | 300 ms | `cubic-bezier(0.16,1,0.3,1)` | Munculnya kartu hasil, ganti halaman |
| `motion-count` | 800 ms | ease-out | Angka confidence menghitung naik dari 0 |
| `motion-gauge` | 800 ms | ease-out | Arc gauge terisi, sinkron dengan angka |

Perilaku khas:
- **Hero waveform:** gelombang sinus acak halus bergerak pelan (siklus 12 dtk) di belakang judul, opasitas 0,18, warna `--neutral`.
- **Kursor sapu (signature):** garis vertikal 2 px `--text` dengan glow `--neutral-glow` menyapu waveform sesuai `currentTime` audio.
- **Tombol record:** denyut halus (skala 1 → 1,06 → 1, siklus 2 dtk, glow `--noisy-glow`) saat idle; denyut lebih cepat (1 dtk) saat merekam.
- **Hasil muncul:** kartu hasil fade-in + naik 8 px (300 ms), elemen visualisasi muncul bertahap dengan jeda 60 ms.
- **Glow lembut** hanya pada elemen aktif (tombol fokus, kartu hasil, sel timeline terpilih).

**`prefers-reduced-motion: reduce`:**
- Hero waveform statis (satu bingkai).
- Angka confidence dan gauge langsung ke nilai akhir (tanpa animasi hitung).
- Denyut tombol record dan glow animasi dimatikan; diganti border 2 px statis.
- Transisi menjadi ≤ 1 ms (opacity saja).
- Kursor waveform tetap bergerak karena mengikuti audio (informasi fungsional), tanpa glow berdenyut.

## 8. Komponen

### 8.1 Tombol
| Varian | Tampilan | Penggunaan |
|---|---|---|
| **Record (utama)** | Pill 56 px tinggi, latar `--noisy`, ikon mic bulat putih/`--bg`, teks "Mulai Rekam", denyut halus | Aksi rekam |
| **Primer** | Radius 6, tinggi 44, latar `--neutral`, teks `--bg` | "Analisis" dan aksi utama lain |
| **Sekunder** | Latar transparan, border 1 px `--border-strong`, teks `--text` | Aksi pendukung |
| **Ghost** | Tanpa border, teks `--neutral-text` | Tautan aksi ("Lihat detail teknis") |
| **Bahaya** | Border dan teks `--error` | "Hapus riwayat" |

State: *default*, *hover* (`--neutral-hover` / border `--text-muted`, 120 ms), *active* (skala 0,98), *focus-visible* (outline 2 px `--focus-ring`, offset 2 px), *disabled* (`--disabled-bg`, `--disabled-text`, `cursor: not-allowed`, `aria-disabled`), *loading* (spinner 16 px menggantikan ikon, teks "Memproses…", tombol nonaktif). Target sentuh minimal 44 × 44 px.

### 8.2 Kartu hasil (F05)
- Latar `--surface`, border 1 px, radius 12, padding 24. Border atas 3 px berwarna kelas hasil.
- Isi (desktop, dua kolom): kiri = badge label, nama file, durasi, waktu proses; kanan = gauge confidence. Di bawah: dua baris probabilitas (bar horizontal tipis 6 px) untuk berisik dan non-berisik.
- Varian: `hasil-berisik`, `hasil-non-berisik`, `hasil-ragu` (confidence < 65%: banner peringatan menempel di atas kartu).
- State: *loading* (skeleton: gauge outline abu, bar abu berdenyut), *error* (ikon `circle-x`, pesan, tombol "Coba lagi").

### 8.3 Badge hasil
- Pill, tinggi 32, padding horizontal 12, ikon 16 px + teks `small` 500 huruf kapital.
- **BERISIK:** ikon `volume-2`, latar `--noisy-soft`, border 1 px `--noisy`, teks `--noisy`.
- **NON-BERISIK:** ikon `volume-x`, latar `--quiet-soft`, border 1 px `--quiet`, teks `--quiet`.
- Varian *indikatif* (untuk timeline per chunk): border putus-putus, tooltip "Indikatif".

### 8.4 Gauge confidence (instrument)
- Setengah lingkaran SVG (180°), jari-jari 90 px, tebal arc 14 px, ujung bulat. Track `--border`, arc terisi berwarna kelas hasil.
- Tick di 0, 25, 50, 75, 100% (label `mono-label`, `--text-muted`). **Penanda ambang 65%:** garis pendek `--neutral` dengan label "65%".
- Angka di tengah: `mono-hero` (44 px) dengan satuan "%" 20 px; 1 desimal dengan koma (contoh "89,0%"). Di bawahnya label "CONFIDENCE" `mono-label`.
- Animasi: arc dan angka naik dari 0 dalam 800 ms. Teks alternatif: `role="img"` + `aria-label="Confidence 89,0 persen untuk kelas berisik"`.
- Lebar: 240 px (desktop), 200 px (mobile).

### 8.5 VU-meter RMS
- Vertikal, tinggi 160 px, lebar 28 px, 20 segmen (tinggi 6 px, jarak 2 px). Segmen terisi berwarna kelas hasil; segmen tidak terisi `--border`.
- Skala default 0–0,10 RMS; otomatis 0–0,20 bila nilai `rms_mean` > 0,10. Dua tick horizontal menunjukkan rata-rata kelas berisik (`--noisy`) dan non-berisik (`--quiet`) dengan label mono 12 px.
- Nilai `rms_mean` ditampilkan di bawah meter (`mono-value`). Tinggi isi meter menganimasikan 400 ms (instan bila reduced motion).
- Pada fitur rekam, VU-meter versi live (horizontal, 32 segmen) memakai warna `--neutral` karena kelas belum diketahui.

### 8.6 Upload zone (F01)
- Kotak 100% lebar, tinggi 220 px (mobile 180), radius 12, border 1,5 px putus-putus `--border-strong`, latar `--surface`. Latar grid titik halus (jarak 16 px, `--border`).
- Isi tengah: ikon `upload` 32 px, teks "Seret file audio ke sini", teks kecil "atau", tombol sekunder "Pilih file", catatan `caption`: "MP3, WAV, OGG, FLAC, M4A · maks 15 MB · maks 120 detik".
- State: *default*, *hover/drag-over* (border solid `--neutral`, latar `--neutral-soft`, glow), *file-dipilih* (ikon file, nama, ukuran mono, tombol "Ganti" dan "Analisis"), *error* (border `--error`, pesan di bawah), *disabled/uploading* (progress bar 4 px `--neutral`, tombol nonaktif).
- Seluruh zona dapat difokuskan (`role="button"`, `tabindex="0"`, Enter/Spasi membuka dialog file).

### 8.7 Pemutar audio (F04)
- Panel `--surface`: tombol play/pause bulat 44 px, waveform lebar penuh (tinggi 96 px, mobile 72 px), waktu `mm:ss / mm:ss` (`mono-value`), tombol bisu/kecepatan opsional tidak ada.
- Waveform: garis puncak simetris; bagian sudah diputar berwarna kelas hasil penuh, belum diputar kelas hasil dengan opasitas 0,4. Kursor sapu sesuai §7. Klik atau sentuh pada waveform memindahkan posisi.
- State: *idle*, *playing* (ikon pause, kursor bergerak), *loading* (spinner kecil), *error* ("Audio tidak dapat diputar di browser ini").
- Aksesibilitas: wadah `role="group" aria-label="Pemutar audio"`; slider posisi `role="slider"` dengan `aria-valuetext` "00:12 dari 00:30".

### 8.8 Tabel
- Header sticky, latar `--surface`, teks `mono-label` `--text-muted`. Baris tinggi 48, pemisah 1 px `--border`, hover `--surface-raised`. Angka rata kanan dalam `mono-value`.
- Mobile: tabel menjadi daftar kartu per baris (label kiri, nilai kanan) atau scroll horizontal dalam wadah `overflow-x: auto` (dipilih sesuai halaman, lihat §9).
- State: *empty* (ikon + teks + aksi), *loading* (5 baris skeleton), *selected* (latar `--neutral-soft`, border kiri 3 px `--neutral`).

### 8.9 Toast
- Muncul kanan atas (desktop) atau atas tengah (mobile), lebar maks 360 px, radius 12, `elev-1`, border 1 px sesuai jenis.
- Varian: *info* (`--neutral`), *sukses* (`--success` + `circle-check`), *peringatan* (`--neutral` + `triangle-alert`), *error* (`--error` + `circle-x`). Hilang otomatis 5 dtk (error 8 dtk); dapat ditutup; `role="status"` (info/sukses) atau `role="alert"` (error); berhenti menghitung mundur saat hover/fokus.

### 8.10 Modal
- Overlay `rgba(11,15,20,0.72)`, panel `--surface-raised`, radius 12, lebar maks 440, padding 24, judul `h3`, isi `body`, aksi di kanan bawah (sekunder "Batal", primer/bahaya).
- Perilaku: fokus berpindah ke judul/tombol pertama; fokus terkurung (focus trap); Esc menutup; fokus kembali ke pemicu; `role="dialog" aria-modal="true" aria-labelledby`.

### 8.11 Banner peringatan confidence (F11)
- Latar `--neutral-soft`, border 1 px `--neutral`, ikon `triangle-alert`, `role="status"`.
- Teks contoh: "Keyakinan model rendah (58,3%). Hasil ini sebaiknya tidak dipakai sebagai keputusan. Coba rekam ulang minimal 15 detik di lokasi yang sama." + ghost button "Baca batasan model".

### 8.12 Komponen pendukung
| Komponen | Spesifikasi |
|---|---|
| Input/Select | Tinggi 44, radius 6, border `--border-strong`, fokus outline `--focus-ring`, error border `--error` + pesan di bawah |
| Tab | Garis bawah 2 px `--neutral` pada tab aktif; panah kiri/kanan berpindah tab |
| Tooltip | Latar `--surface-raised`, `caption`, muncul saat hover atau fokus, tunda 200 ms |
| Spinner | Cincin 16/24 px, stroke `--neutral`, putar 800 ms (statis + teks "Memproses" bila reduced motion) |
| Skeleton | Blok `--border` dengan kilau lambat 1,6 dtk (nonaktif saat reduced motion) |
| Stepper loading | 4 tahap: "Mengunggah", "Membersihkan hening", "Mengekstrak fitur", "Memprediksi"; tahap aktif `--neutral`, selesai `--text-muted` + centang |

## 9. Spesifikasi Halaman

### 9.1 Halaman Analisis (`/`)

**Urutan section**
1. Hero (judul + tagline, waveform animasi di belakang)
2. Panel input (tab: Unggah | Rekam | Contoh)
3. Hasil (muncul setelah analisis): banner peringatan (kondisional), kartu hasil + gauge + VU-meter, pemutar + waveform, timeline per chunk, spektrogram, profil MFCC, perbandingan 10 fitur, penjelasan
4. Footer (tautan Batasan & Etika, catatan privasi)

**Wireframe desktop (≥ 1280)**
```
+------+--------------------------------------------------------------+
| LOGO |  ~~~~ waveform animasi pelan (latar) ~~~~                     |
|      |  Sound Lab                                                    |
| [~]  |  Dengarkan lingkungan Anda: berisik atau tidak?               |
| Anal |                                                               |
| [↺]  |  +--------------------------------------------------------+  |
| Riwa |  | [ Unggah ] [ Rekam ] [ Contoh ]                         |  |
| [⇄]  |  |  +--------------------------------------------------+  |  |
| Band |  |  |          ⬆  Seret file audio ke sini              |  |  |
| [⚙]  |  |  |     atau  [ Pilih file ]                          |  |  |
| Tent |  |  |  MP3 WAV OGG FLAC M4A · maks 15 MB · maks 120 dtk |  |  |
| [!]  |  |  +--------------------------------------------------+  |  |
| Bats |  +--------------------------------------------------------+  |
|      |                                                               |
|      |  [!] Banner peringatan (jika confidence < 65%)                |
|      |  +--------------------------+  +---------------------------+  |
|      |  | (BERISIK) kantor.mp3     |  |  GAUGE 89,0%  | VU RMS    |  |
|      |  | 30 dtk · 1,8 dtk proses  |  |               |           |  |
|      |  | Berisik   89,0% ====     |  |               |           |  |
|      |  | Non-berisik 11,0% =      |  |               |           |  |
|      |  +--------------------------+  +---------------------------+  |
|      |  +--------------------------------------------------------+  |
|      |  | ▶ 00:12/00:30  [ waveform + kursor sapu ]               |  |
|      |  +--------------------------------------------------------+  |
|      |  Timeline per chunk (Indikatif): [■][■][□][■][■][■]...        |
|      |  +---------------------------+ +--------------------------+  |
|      |  | Spektrogram (inferno)     | | Profil 13 MFCC           |  |
|      |  +---------------------------+ +--------------------------+  |
|      |  +--------------------------------------------------------+  |
|      |  | Mengapa hasilnya begini? (3 alasan) | Lihat detail ▸    |  |
|      |  +--------------------------------------------------------+  |
|      |  | Tabel 10 fitur vs rata-rata kelas                      |  |
+------+--------------------------------------------------------------+
```

**Wireframe mobile (360)**
```
+------------------------------+
| Sound Lab                    |
| Berisik atau tidak?          |
| [Unggah][Rekam][Contoh]      |
| +--------------------------+ |
| |  ⬆ Seret / ketuk file    | |
| |  [ Pilih file ]          | |
| +--------------------------+ |
| [!] Peringatan (jika ada)    |
| (BERISIK)  kantor.mp3        |
| [   GAUGE 89,0%   ]          |
| Berisik 89,0% ====           |
| Non-berisik 11,0% =          |
| [VU RMS horizontal ====]     |
| ▶ 00:12/00:30                |
| [ waveform ]                 |
| Timeline per chunk (geser →) |
| Spektrogram (geser →)        |
| MFCC                         |
| Mengapa hasilnya begini?     |
| Fitur vs rata-rata (daftar)  |
| [Analisis][Riwayat]... (tab) |
+------------------------------+
```

**Perilaku responsif:** desktop menempatkan kartu hasil dan gauge berdampingan (kolom 6/6) serta spektrogram dan MFCC berdampingan; tablet menumpuk kartu hasil, gauge di bawahnya; mobile semua satu kolom, VU-meter menjadi horizontal, spektrogram dan timeline dapat digeser horizontal (`overflow-x: auto`).

**Tab Rekam (F02):** tombol Record besar di tengah; label "Mulai Rekam". Saat merekam: timer `mono-hero` 28 px "00:07 / 00:30", level meter live horizontal, tombol "Selesai" (aktif setelah 5 dtk) dan "Batal". Setelah selesai: pemutar kecil, tombol "Analisis" dan "Rekam ulang".

**Tab Contoh (F03):** tiga kartu klik (ikon speaker/mute sesuai label sumber, judul, durasi). Kartu contoh ambigu diberi label "Contoh tidak jelas".

**State**
| State | Tampilan |
|---|---|
| Kosong | Hanya hero + panel input; teks bantuan "Mulai dengan mengunggah rekaman atau pilih contoh." |
| Loading | Stepper 4 tahap di bawah panel input; tombol "Analisis" loading; area hasil berisi skeleton |
| Error | Banner `--error-soft` di atas panel input dengan ikon, pesan, dan tombol "Coba lagi" (pesan dari api-spec.md) |
| Sukses | Hasil muncul dengan animasi; fokus berpindah ke judul hasil (`tabindex="-1"`) dan pembaca layar membacakan ringkasan lewat `aria-live="polite"` |

**Copywriting contoh**
- Judul: "Sound Lab"; tagline: "Periksa apakah suara di sekitar Anda tergolong berisik atau tidak."
- Tab: "Unggah", "Rekam", "Contoh".
- Hasil: "Terklasifikasi BERISIK dengan keyakinan 89,0%."
- Penjelasan: "Volume rata-rata rekaman ini lebih tinggi dari kebanyakan rekaman non-berisik."
- Privasi: "Audio Anda dihapus dari server segera setelah analisis selesai."
- Mikrofon ditolak: "Izin mikrofon belum diberikan. Aktifkan lewat pengaturan browser, atau unggah file sebagai gantinya."
- Timeline: "Prediksi per bagian 3 detik (Indikatif). Model dilatih pada rekaman ± 30 detik, bukan potongan pendek."

### 9.2 Halaman Riwayat (`/riwayat`)

**Urutan:** judul + keterangan → toolbar (jumlah entri, "Ekspor CSV", "Hapus riwayat") → tabel/daftar riwayat → catatan privasi.

**Wireframe desktop**
```
+------+--------------------------------------------------------------+
| SB   | Riwayat Sesi                         [Ekspor CSV][Hapus]      |
|      | 7 analisis · tersimpan hanya di tab ini                       |
|      | +------+------------------+--------+------------+---------+  |
|      | | Waktu| Sumber/File      | Label  | Confidence | Aksi    |  |
|      | | 10:42| kantor.mp3       |(BERISIK)| 89,0%     | ⇄  🗑   |  |
|      | | 10:40| perpus.wav       |(NON-B)  | 92,0%     | ⇄  🗑   |  |
|      | +------+------------------+--------+------------+---------+  |
+------+--------------------------------------------------------------+
```

**Kolom tabel:** Waktu, Sumber (Unggah/Rekam/Contoh) + nama file, Label (badge), Confidence, Durasi, Aksi (pilih untuk dibandingkan, hapus). Baris dapat diklik untuk membuka ringkasan hasil (modal atau panel samping tablet/desktop; halaman penuh di mobile).

**Mobile:** setiap entri menjadi kartu: baris 1 badge + confidence, baris 2 nama file, baris 3 waktu dan durasi, aksi di kanan.

**State:** *kosong* ("Belum ada analisis. Mulai dari halaman Analisis." + tombol primer "Ke halaman Analisis"); *loading* (skeleton 5 baris); *error* ("Riwayat tidak dapat dimuat dari penyimpanan browser." + "Muat ulang"); modal konfirmasi hapus: "Hapus seluruh riwayat? Tindakan ini tidak dapat dibatalkan."

### 9.3 Halaman Bandingkan (`/bandingkan`)

**Urutan:** judul + keterangan → dua slot (A dan B) → hasil berdampingan → tabel selisih fitur → ringkasan perbandingan.

**Wireframe desktop**
```
+------+--------------------------------------------------------------+
| SB   | Bandingkan Dua Audio                                          |
|      | +---------------------------+ +---------------------------+  |
|      | | A  [Pilih dari riwayat ▾] | | B  [Pilih dari riwayat ▾] |  |
|      | |    atau [Unggah file]     | |    atau [Unggah file]     |  |
|      | +---------------------------+ +---------------------------+  |
|      |                [ Bandingkan ]                                 |
|      | +---------------------------+ +---------------------------+  |
|      | | (BERISIK) 89,0%  gauge    | | (NON-B) 92,0%  gauge      |  |
|      | | waveform A                | | waveform B                |  |
|      | +---------------------------+ +---------------------------+  |
|      | Tabel: fitur | A | B | selisih (B − A) | lebih tinggi        |
|      | Ringkasan: "A lebih berisik: volume rata-rata 2,1× B..."      |
+------+--------------------------------------------------------------+
```

**Mobile:** slot A dan B ditumpuk; hasil ditampilkan dengan tab "A | B | Selisih" agar tidak terlalu panjang.

**Aturan visual:** audio A diberi label lingkaran "A" dan B diberi label "B" (bentuk dan huruf berbeda, bukan hanya warna). Waveform diwarnai sesuai kelas masing-masing; jika kelas sama, pembeda adalah label A/B dan garis pola (A solid, B putus-putus).

**State:** *kosong* ("Pilih dua audio untuk dibandingkan."); tombol "Bandingkan" nonaktif sampai kedua slot terisi; *loading* (stepper per slot); *error sebagian* (slot gagal menampilkan pesan error dan tombol "Coba lagi", slot berhasil tetap tampil); *selisih fitur* diberi indikator panah naik/turun (ikon + teks, bukan hanya warna).

**Copywriting:** "Pilih audio dari riwayat atau unggah file baru." · "Audio A lebih berisik: nilai volume rata-rata (rms_mean) 2,1 kali lebih tinggi."

### 9.4 Halaman Tentang Model (`/tentang-model`)

**Urutan:** judul → ringkasan model (kartu info) → metrik utama (kartu angka) → confusion matrix → perbandingan 6 model → 10 fitur dan importance → pipeline fitur (diagram langkah) → data dan pelatihan → versi/artefak.

**Wireframe desktop**
```
+------+--------------------------------------------------------------+
| SB   | Tentang Model                                                 |
|      | Random Forest · 10 fitur · scikit-learn 1.8.0                 |
|      | [Akurasi 85%][Presisi 0,85][Recall 0,85][F1 0,85][AUC 0,8688] |
|      | +--------------------------+ +-----------------------------+  |
|      | | Confusion matrix 2×2     | | Perbandingan 6 model (bar)  |  |
|      | | 17 | 3                   | | RF 85 · GB 80 · SVM RBF 77,5|  |
|      | |  3 | 17                  | | SVM Lin 72,5 · LR 70 · KNN 70| |
|      | +--------------------------+ +-----------------------------+  |
|      | Importance 10 fitur (bar horizontal, urut menurun)            |
|      | Pipeline: Load → Hapus hening → Chunk 3 dtk → Fitur → Agregasi|
|      | Data: ± 200 file · latih 158 · uji 40 · CV 84,15% ± 2,94%     |
+------+--------------------------------------------------------------+
```

**Detail visual:**
- Kartu metrik: angka `mono-hero` 28 px, label `mono-label`.
- Confusion matrix: 4 sel; diagonal diberi warna kelas masing-masing (`--noisy-soft` untuk berisik, `--quiet-soft` untuk non-berisik), sel salah `--border`; angka dan label teks wajib terlihat.
- Perbandingan model: bar horizontal; Random Forest berwarna `--neutral`, model lain `--border-strong`.
- Importance: bar horizontal warna `--neutral`, nilai di ujung bar.

**Mobile:** kartu metrik 2 kolom (baris terakhir 1 kolom); grafik satu kolom penuh; confusion matrix tetap 2×2.

**State:** *loading* (skeleton kartu dan grafik); *error* ("Informasi model tidak dapat dimuat" + "Coba lagi"); data berasal dari `/api/model-info`.

### 9.5 Halaman Batasan & Etika (`/batasan-etika`)

**Urutan:** judul → pernyataan kunci (kartu sorot) → Batasan model → Kapan hasil tidak dapat diandalkan → Privasi data → Penggunaan yang disarankan dan tidak disarankan → Kontak/sumber.

**Wireframe desktop**
```
+------+--------------------------------------------------------------+
| SB   | Batasan & Etika                                               |
|      | [!] Model ini alat demonstrasi akademik, bukan alat ukur resmi|
|      | 1. Batasan model     (dataset kecil, satu domain, ± 200 file) |
|      | 2. Di luar distribusi (musik, hujan, mesin berat)              |
|      | 3. Privasi           (audio dihapus setelah diproses)          |
|      | 4. Dianjurkan  ✓ ...      Tidak dianjurkan ✗ ...               |
+------+--------------------------------------------------------------+
```

**Detail visual:** kartu sorot berborder `--neutral` dengan ikon `shield-alert`; daftar penggunaan dua kolom (dianjurkan dengan ikon `circle-check`, tidak dianjurkan dengan ikon `circle-x`, selalu disertai teks); mobile satu kolom. Halaman statis tanpa state loading/error; bila diakses dari banner F11 ia membuka di bagian "Kapan hasil tidak dapat diandalkan" (anchor).

**Copywriting contoh:**
- "Model dilatih dengan sekitar 200 rekaman dari satu domain perekaman, sehingga performanya bisa turun pada lokasi atau perangkat lain."
- "Musik, hujan deras, dan mesin berat berada di luar data latih; hasilnya dapat tampak yakin namun keliru."
- "Hasil klasifikasi bukan pengukuran tingkat kebisingan dalam desibel."
- "Audio dihapus dari server segera setelah diproses dan tidak disimpan permanen."
- Tidak dianjurkan: dasar keputusan hukum, penilaian kepatuhan standar kebisingan, pemantauan seseorang tanpa persetujuan.

## 10. Aksesibilitas (WCAG 2.1 AA)
- **Kontras:** sesuai §2.3. Teks kecil tidak memakai `--neutral`; gunakan `--neutral-text`.
- **Keyboard:** semua kontrol dapat dijangkau dengan Tab; urutan fokus mengikuti urutan visual; outline fokus 2 px `--focus-ring` offset 2 px selalu terlihat; tidak ada perangkap fokus kecuali modal (dengan Esc untuk keluar).
- **Pintasan pemutar:** Spasi = putar/jeda, ←/→ = ±5 detik saat pemutar fokus.
- **Target sentuh:** minimal 44 × 44 px.
- **Label:** setiap ikon tanpa teks punya `aria-label` Indonesia (contoh: "Putar audio", "Hapus entri riwayat", "Mulai rekam").
- **Grafik:** setiap grafik diberi `role="img"` + `aria-label` ringkas, dan data setara tersedia sebagai tabel (tabel fitur, daftar chunk) untuk pembaca layar.
- **Live region:** hasil analisis diumumkan lewat `aria-live="polite"`: "Hasil: berisik, keyakinan 89,0 persen." Error memakai `role="alert"`.
- **Bukan warna saja:** kelas dibedakan teks + ikon; selisih memakai panah + angka; timeline chunk memakai label teks saat fokus/hover.
- **Gerak:** mengikuti §7 untuk `prefers-reduced-motion`.
- **Bahasa:** `<html lang="id">`; judul halaman unik per rute; landmark `header`, `nav`, `main`, `footer`.
- **Form dan error:** pesan error terhubung dengan `aria-describedby`; tidak ada batas waktu pada interaksi.
- **Zoom:** tata letak tetap berfungsi pada zoom 200% dan teks dapat membesar tanpa overflow horizontal pada halaman.

## 11. Panduan Visualisasi Data

| Elemen | Aturan |
|---|---|
| Warna kelas | Berisik selalu `--noisy`, non-berisik selalu `--quiet`, di semua halaman dan grafik |
| Nilai audio pengguna | Selalu `--neutral` (penanda titik/belah ketupat) |
| Grid plot | Garis 1 px `--border`, sumbu utama `--border-strong`; latar plot `--surface` |
| Label sumbu | `mono-label`, `--text-muted`, satuan dicantumkan (detik, Hz) |
| Waveform | ≤ 2000 titik, warna kelas hasil; bagian belum diputar opasitas 0,4 |
| Spektrogram | Colormap "inferno"; sumbu waktu (detik) dan frekuensi (Hz); legenda warna dengan label rendah-tinggi; tidak dipakai warna kelas |
| Profil MFCC | Bar vertikal 13 koefisien (MFCC1–MFCC13) berwarna `--neutral`; label sumbu "Koefisien" |
| Timeline per chunk | Satu sel per 3 detik, warna kelas, opasitas = 0,35 + 0,65 × confidence; label "Indikatif" selalu terlihat |
| Perbandingan fitur | Bar horizontal per fitur; penanda segitiga `--noisy` (rata-rata berisik), segitiga `--quiet` (rata-rata non-berisik), belah ketupat `--neutral` (audio ini) |
| Probabilitas | Bar tipis 6 px per kelas dengan angka persen di sisi kanan |
| Legenda | Selalu ada di dekat grafik; kelas ditulis lengkap + ikon |
| Angka | JetBrains Mono, koma sebagai desimal di UI; titik sebagai desimal di CSV dan JSON |
| Format nilai | confidence 1 desimal (89,0%); `rms_*` dan `zcr_mean` 5 desimal; `mfcc*_mean` 2 desimal; `centroid_mean` 1 desimal + "Hz" |
| Hindari | Efek 3D, pie chart, warna pelangi, glow berlebihan pada data |

## 12. Asumsi
1. Font dimuat dari Google Fonts (Space Grotesk, Inter, JetBrains Mono) dengan fallback sistem.
2. Set ikon Lucide dipakai untuk semua ikon.
3. Hanya tema gelap pada versi ini (tema terang masuk out-of-scope di PRD.md).
4. Nilai rata-rata kelas untuk penanda VU-meter dan tabel fitur berasal dari `class_means.json` (lihat model-spec.md).
5. Contoh audio bawaan menyertakan label sumber sehingga tampilan "Contoh" konsisten dengan data riwayat.
6. Spektrogram dan waveform dirender di klien dari data yang dikirim API (format di api-spec.md).
7. Ambang peringatan 65% diambil dari konfigurasi server dan ditampilkan sebagai penanda di gauge.
