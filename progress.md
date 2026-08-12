# BagiBill — Progress

Sumber kebenaran fitur ada di `spec.md`. Urutan kerja ada di `plan.md`. File ini cuma melacak status, keputusan, dan hal yang masih menggantung.

Status terakhir diperbarui: 12 Agustus 2026
Fase aktif: F0 (fondasi), F0-01 selesai. Seluruh mockup gelombang 1 selesai.
Gelombang aktif: 1 — beranda, buat grup dan kelola member, tambah pengeluaran, detail grup tab Transaksi dan tab Saldo, klaim item
Target rilis fase 1: (isi tanggal)

---

## Cara pakai file ini

- Centang kalau sudah jalan di device sungguhan, bukan kalau kodenya sudah ditulis.
- Papan Gelombang 1 dicentang per tugas `plan.md`, di PR yang sama dengan tugasnya.
- Daftar fitur per fase dicentang belakangan, waktu fiturnya beneran utuh dari sisi pengguna. Satu tugas plan bisa cuma nyentuh sebagian baris fitur.
- Kalau ada yang berubah dari spec, catat di bagian Keputusan, jangan diam-diam.
- Kalau ada yang bikin mandek lebih dari sehari, naikkan ke Blocker.

---

## Papan Gelombang 1

Ini yang dipakai harian. Kode tugas mengikuti `plan.md`.

### F0. Fondasi
- [x] F0-01 Scaffold repo dan toolchain
- [x] F0-02 Inventaris mockup
- [x] F0-03 Token masuk aplikasi
- [ ] F0-04 Infrastruktur i18n
- [ ] F0-05 Komponen dasar dan halaman `/dev/ui`
- [ ] F0-06 Kerangka rute dan layout
- [ ] F0-07 Lapisan sistem (undo, offline, gagal)
- [ ] F0-08 Gerbang kualitas di CI

### F1. Split engine
- [ ] F1-01 Tipe uang dan minor unit
- [ ] F1-02 Pembagi sisa largest remainder
- [ ] F1-03 Mode Rata, Nominal, Persentase
- [ ] F1-04 Mode Porsi dan Selisih
- [ ] F1-05 Mode Per Item
- [ ] F1-06 Biaya tambahan
- [ ] F1-07 Traktir
- [ ] F1-08 Pembayar dan saldo
- [ ] F1-09 Settlement
- [ ] F1-10 Fasad dan tabel kasus

### F2. Storage
Bisa paralel dengan F1.
- [ ] F2-01 Schema dan Clock
- [ ] F2-02 Repository grup dan member
- [ ] F2-03 Repository pengeluaran
- [ ] F2-04 Migrasi
- [ ] F2-05 Export jaring pengaman (butuh persetujuan dulu)

### F3. Layar
Mulai setelah F1-10 dan F2-03.
- [ ] F3-01 Tambah pengeluaran mode Rata
- [ ] F3-02 Mode Porsi
- [ ] F3-03 Biaya tambahan dan traktir
- [ ] F3-04 Mode Nominal, Persen, Selisih
- [ ] F3-05 Detail grup tab Transaksi
- [ ] F3-06 Pencarian dan filter dasar
- [ ] F3-07 Detail grup tab Saldo
- [ ] F3-08 Klaim item sisi member
- [ ] F3-09 Buat grup dan kelola member
- [ ] F3-10 Beranda dan daftar grup
- [ ] F3-11 Data contoh untuk dev

### F4. Tutup gelombang 1
- [ ] F4-01 Lewati skill QA
- [ ] F4-02 Cek anggaran performa
- [ ] F4-03 Deploy pratinjau

---

## Fase 1 menurut spec

Cakupannya lebih luas dari gelombang 1. Yang di luar papan di atas belum punya tugas di `plan.md`.

### Fondasi
- [ ] Setup Vite, routing, struktur folder
- [ ] Design token: warna, tipografi, spacing, radius
- [ ] Komponen dasar: button, input, sheet, toast, list row
- [ ] Set ikon UI dan ikon kategori
- [ ] Dark mode
- [ ] File string i18n id dan en, helper Intl
- [ ] IndexedDB schema lewat Dexie
- [ ] Service worker dan manifest
- [ ] Backend skeleton di Cloudflare Workers, schema Neon Postgres, endpoint sync
- [ ] Deploy pipeline dan domain

### Inti
- [ ] Buat grup, template, pilih mata uang
- [ ] Tambah, edit, hapus member
- [ ] Tambah, edit, hapus pengeluaran
- [ ] Undo untuk semua aksi destruktif

### Pembagian
- [ ] Mode Rata
- [ ] Mode Nominal dengan sisa realtime
- [ ] Mode Persentase
- [ ] Mode Porsi dengan bobot dan preset pecahan
- [ ] Mode Selisih
- [ ] Multi pembayar
- [ ] Pembulatan largest remainder
- [ ] Pola split tersimpan
- [ ] Panel preview realtime

### Biaya tambahan
- [ ] Pajak, service, tip, ongkir, diskon, custom
- [ ] Tiga mode alokasi
- [ ] Preset per locale
- [ ] Traktir level komponen, item, orang, dan sebagian

### Mata uang
- [ ] Picker seluruh ISO 4217
- [ ] Kurs terkunci per tanggal transaksi
- [ ] Override manual
- [ ] Dua provider dengan fallback dan cache harian
- [ ] Presisi desimal per mata uang

### Saldo
- [ ] Perhitungan saldo bersih
- [ ] Mode Simplify
- [ ] Mode Langsung
- [ ] Pelunasan penuh dan sebagian
- [ ] Catatan pembayaran per member
- [ ] Generate teks tagih ke share sheet

### Akses
- [ ] Device token dan pemetaan ke member
- [ ] Link undangan dan halaman join
- [ ] Ganti identitas
- [ ] Passcode grup
- [ ] Link hanya baca
- [ ] Tutup pendaftaran
- [ ] Ganti link
- [ ] Kunci dan arsip grup
- [ ] Aktivasi Gumroad, masa aktif dihitung sejak aktivasi
- [ ] Batas 3 device dan recovery code
- [ ] Mode Free dan batasannya
- [ ] Grace period dan mode read-only setelah expired

### Sync
- [ ] Antrian mutasi offline
- [ ] Sync dengan sequence number
- [ ] Resolusi konflik per field dan banner
- [ ] Indikator sync tiga state

### Lain
- [ ] Quick Split dan link hasilnya
- [ ] Export CSV
- [ ] Layar bahasa dan layar sambutan
- [ ] Onboarding grup pertama dan coach mark tunggal
- [ ] Grup contoh
- [ ] Semua empty state
- [ ] Penangkapan link untuk app ter-install, assetlinks.json
- [ ] Corong akuisisi di halaman join
- [ ] Landing, pricing, privacy, terms
- [ ] Analytics self-host dan daftar event

---

## Fase 2

- [ ] Scan struk lewat Gemini Flash, structured output
- [ ] Validasi aritmatika di backend
- [ ] Editor item hasil scan
- [ ] Kuota scan harian per device
- [ ] Mode Per Item dan layar assign
- [ ] Mode Claim, link klaim, kedaluwarsa 72 jam
- [ ] WebSocket realtime dan presence
- [ ] Anti klaim ganda: avatar, counter, konfirmasi bagi berdua
- [ ] Layar review pembuat dan finalisasi
- [ ] Kategori, pencarian, filter
- [ ] Ringkasan grup dan bagan
- [ ] Export PDF
- [ ] Web Share Target dan App Shortcuts

---

## Fase 3

- [ ] Dashboard pribadi lintas grup
- [ ] Recap bulanan dan tahunan, kartu gambar
- [ ] Recurring
- [ ] Budget trip
- [ ] Push notification dan pengingat
- [ ] Komentar dan riwayat aktivitas
- [ ] Badging API

---

## Gerbang kualitas sebelum rilis

- [ ] Bundle awal di bawah 120 KB brotli
- [ ] LCP di bawah 1,5 detik di 4G lambat
- [ ] INP di bawah 200 milidetik saat mengetik di layar tambah pengeluaran
- [ ] Halaman `/j/` terbuka di bawah 1 detik tanpa menarik bundle app
- [ ] Halaman `/c/` terbuka di bawah 1 detik tanpa menarik bundle app
- [ ] Tambah pengeluaran rata selesai dalam 3 tap dan 1 ketikan
- [ ] Bagi struk 14 item untuk 8 orang selesai di bawah 2 menit
- [ ] Uji offline penuh: pesawat mode dari awal sampai settle
- [ ] Uji dua device barengan di satu grup
- [ ] Uji struk Indonesia, Jepang, dan Eropa
- [ ] Uji font sistem 200% tanpa layout rusak
- [ ] Audit kontras dan screen reader, termasuk pembacaan nominal plus mata uangnya
- [ ] Piutang dan utang terbaca tanpa mengandalkan merah versus hijau
- [ ] Nol hex literal di luar `packages/tokens`
- [ ] Nol kunci i18n yang cuma ada di satu bahasa
- [ ] Nol penyebutan harga, key, atau tombol beli di alur join dan alur klaim
- [ ] Nol warna kategori di layar yang menampilkan orang
- [ ] Nol CSS breakpoint desktop di luar halaman publik dan `/j/`
- [ ] PB1 dihitung dari subtotal plus service, bukan dari subtotal saja
- [ ] Slug grup tidak muncul di log, analytics, atau pesan error
- [ ] Uji iOS Safari, Android Chrome, desktop
- [ ] Uji alur kedaluwarsa key dengan tanggal palsu

---

## Keputusan

Format: kode, tanggal, keputusan, alasan. Yang masih terbuka ditandai TERBUKA dan memblokir tugas yang disebut.

- K-01 SELESAI 10 Ags 2026 — Gelombang 1 adalah tujuh layar: beranda, buat grup dan kelola member, tambah pengeluaran, detail grup tab Transaksi, detail grup tab Saldo, klaim item. Bukan empat. Alasan: mockup untuk semuanya sudah ada dan rute daftar grup memang sudah dibutuhkan sejak F0-06. Join grup, bagi cepat, dan scan struk mockupnya jadi duluan tapi tetap gelombang 2.
- K-02 SELESAI 10 Ags 2026 — Klaim item ikut gelombang 1 dalam versi satu device. Realtime, presence, link `/c/` yang hidup, dan kedaluwarsa 72 jam tetap fase 2. Alasan: layarnya sudah didesain penuh dan mesinnya toh dibangun untuk F1-05.
- K-03 SELESAI 10 Ags 2026 — Engine per item tetap dibangun sekarang di F1-05 karena layar klaim membutuhkannya. UI assign versi pembuat tetap fase 2.
- K-04 SELESAI 10 Ags 2026 — Mode kelima bernama **Selisih** di UI, `adjustment` di kode, kunci `expense.mode.adjustment`. Alasan: Selisih muat di 360px dan itu yang sudah didesain. Kata "Penyesuaian" dicabut dari `spec.md` 6.5. Tata letak Nominal, Persen, dan Selisih sudah ada di `Tambah_Pengeluaran.html`, jadi F3-04 tidak lagi terblokir.
- K-05 SELESAI 10 Ags 2026 — Tidak ada tata letak desktop. Satu kolom, `max-width` 480px, ditengahkan, latar di luar kolom satu tingkat lebih gelap. Alasan: app-nya dipakai sambil berdiri di kasir, dan mendesain ulang tiap layar untuk situasi yang hampir tidak pernah terjadi tidak sepadan. Yang boleh melebar nanti cuma halaman publik dan `/j/`.
- K-06 SELESAI 10 Ags 2026 — Backend di Cloudflare Workers dengan router Hono, database Neon Postgres region `ap-southeast-1` lewat driver serverless di atas HTTP, query lewat Drizzle. Alasan: permintaan tersering adalah membuka `/j/` dari WhatsApp, satu request dingin di jaringan seluler, dan Workers punya titik di Jakarta tanpa cold start yang terasa. Neon dipilih ketimbang Supabase karena yang dibutuhkan cuma Postgres dan sisa perkakas Supabase bertabrakan dengan produk yang sengaja tidak punya akun. Konsekuensi: tidak ada koneksi yang dipegang lama, jadi tidak ada transaksi panjang dan tidak ada `LISTEN`/`NOTIFY`. Realtime nanti lewat Durable Object. Bentuk protokol sync belum diputuskan, lihat K-11.
- K-07 SELESAI 10 Ags 2026 — Palet member dua belas warna, `--m-1` sampai `--m-12`, diberikan berurutan supaya grup yang sama selalu menghasilkan warna yang sama. Ditetapkan sekali dan tidak pernah berubah, termasuk saat member dinonaktifkan. Orang ketiga belas mengulang dari `--m-1` dengan cincin luar putus-putus. Alasan: menambah rona berarti menambah warna yang kontrasnya belum pernah diuji, dan yang penting bukan tiap orang unik tapi tidak ada dua orang serupa bersebelahan.
- K-08 SELESAI 10 Ags 2026 — Warna kategori tidak boleh muncul di layar yang menampilkan orang. Di daftar transaksi, saldo, dan klaim, ikon kategori monokrom memakai warna teks sekunder dan yang membedakan adalah bentuknya. Token `--cat-*` cuma boleh dipakai di Ringkasan, filter, dan bagan. Alasan: warna di app ini sudah punya pemilik, dan dua sistem warna di layar yang sama membuat orang berhenti mempercayai keduanya. Mencabut `spec.md` 18.1 yang sebelumnya meminta duotone berwarna per kategori.
- K-09 SELESAI 10 Ags 2026 — Kategori default delapan dengan kunci bahasa Inggris dan ikon Lucide di-inline sebagai SVG, tabelnya di `spec.md` 12.3. Alasan: delapan ikon tidak sepadan dengan menarik satu dependensi.
- K-10 SELESAI 10 Ags 2026 — Preset biaya Indonesia adalah service charge 5% dari subtotal, lalu PB1 10% dari subtotal ditambah service charge. Bukan dua-duanya dari subtotal. Nama PPN dicabut dari preset Indonesia karena restoran dikenai PB1, bukan PPN, dan salah nama di sini langsung menghilangkan kepercayaan orang yang paham pajak. PB1 adalah pajak daerah, jadi angkanya wajib bisa diubah dan diingat per grup. Mengoreksi `spec.md` 7.2 yang sebelumnya menulis PPN 11%.
- K-14 SELESAI 11 Ags 2026 — `--ease` ditambahkan ke `packages/tokens` sebagai alias `var(--ease-standard)`, mengikuti pemakaian di `Detail_Grup_Transaksi.html`, `Detail_Grup_Saldo.html`, dan `Lapisan_Sistem.html`. Nilainya identik, jadi ini penamaan, bukan nilai baru. Komponen boleh memakai nama pendek. Aturan umumnya: token digenerate dari mockup, jadi kalau mockup memakai nama yang belum ada, tokennya yang menyusul, bukan mockupnya yang disesuaikan.
- K-15 SELESAI 12 Ags 2026 — TypeScript dipin ke `^6.0.3`, ESLint ke `^9.39.5`, bukan versi mayor terbaru (TypeScript 7 dan ESLint 10 sudah rilis). Alasan: `typescript-eslint@8.67` mensyaratkan `typescript <6.1.0`, dan `eslint-plugin-import@2.32` belum menyatakan dukungan ESLint 10 di peer dependency-nya. Naikkan lagi kalau kedua plugin itu sudah update peer range-nya, jangan dipaksa duluan.
- K-16 SELESAI 12 Ags 2026 — `eslint-import-resolver-typescript` ditambah sebagai dev dependency, di luar daftar awal. Alasan: rule `import/no-internal-modules` (larangan cross-feature import selain lewat `index.ts`) diam-diam tidak pernah nyala tanpa resolver ini, karena eslint-plugin-import mengklasifikasikan import alias `@/...` sebagai "unknown" tanpa resolver yang paham `tsconfig.json`, dan rule cuma cek tipe `parent/index/sibling/external/internal`. Sudah diverifikasi manual dengan file cross-feature sungguhan sebelum dihapus lagi — rule kena, bukan cuma keaktifin config doang.
- K-17 SELESAI 12 Ags 2026 — Sebelas file mockup di-rename dari nama dengan spasi dan `&` (mis. `Buat Grup & Kelola Member.html`) ke nama underscore tanpa ampersand (`Buat_Grup___Kelola_Member.html`), pakai `git mv` supaya histori ikut. Alasan: nama di disk sudah sejak awal beda dari nama yang dirujuk `docs/mockups/README.md`, `plan.md`, `progress.md`, dan `CLAUDE.md` — dokumen-dokumen itu tidak salah, filenya yang belum disamakan. `docs/mockups/README.md` sudah lama pakai nama target ini di tabelnya jadi isinya tidak berubah, cuma filenya yang sekarang benar-benar cocok.
- K-18 SELESAI 12 Ags 2026 — `packages/tokens` dijadiin workspace package sungguhan (`package.json` + `exports`), dikonsumsi lewat `@bagibill/tokens` di `src/styles/tokens.css` (`@import "@bagibill/tokens/tokens.css";`), bukan lewat path relatif nembus ke luar `src/`. Alasan: `pnpm-workspace.yaml` udah declare `packages/*` sejak F0-01 tapi `packages/tokens` belum punya `package.json` sampai sekarang, jadi belum ke-link beneran. Pola ini yang dipakai split-engine dkk di F1 nanti.
- K-11 TERBUKA — Bentuk protokol sync, sequence number, dan resolusi konflik per field. Tidak memblokir gelombang 1.
- K-12 TERBUKA — Storage foto struk, penyedia OCR, dan angka kuota harian. Menunggu scan struk dijadwalkan. Tidak memblokir gelombang 1.
- K-13 TERBUKA — Preset biaya untuk locale di luar Indonesia, Amerika Serikat, dan Eropa. Defaultnya nol sampai ada.

---

## Blocker

- (kosong)

---

## Ditunda

Hal yang sengaja tidak dikerjakan sekarang, supaya tidak dibahas berulang.

- Mata uang, backend dan sync, akses dan lisensi, onboarding, Quick Split dan export CSV, PWA, halaman publik. Semuanya di luar cakupan `plan.md` sekarang.
- Bagi cepat, join grup, dan scan struk. Mockupnya sudah ada tapi sengaja tidak dijadwalkan. Bagi cepat yang paling siap karena tidak butuh grup, cuma link hasilnya yang butuh backend.
- Tab Ringkasan di detail grup. Kerangkanya ada di mockup, isinya dibiarkan kosong sampai gelombang 2.
- Filter tersimpan di F3-06. Yang masuk cuma pencarian dan filter dasar.
- Layar lisensi, aktivasi key, dan kedaluwarsa. Belum punya mockup sama sekali.

---

## Catatan lepas

- Baseline `pnpm size` dari F0-01 (scaffold React kosong, belum ada router/fitur): **51,2 KB brotli** dari anggaran 120 KB. Sisa ~69 KB buat router, IndexedDB, split engine, dan sebelas layar. React sudah dipisah ke chunk `react-vendor` sendiri lewat `manualChunks` di `vite.config.ts`, jadi kelihatan kalau vendor membengkak vs kode app sendiri. Lazy-load per rute belum ada, itu kerjaan F0-06 — angka di atas belum kepotong oleh code splitting rute.
- Beberapa mockup memakai variabel lokal per elemen bernama `--c`, `--av`, dan `--stage`. Itu perancah, bukan token. Jangan ikut dipindahkan ke `packages/tokens`.
- F3-09 (buat grup) berada setelah F3-01 di penomoran, padahal secara alur pengguna dia lebih dulu. Urutannya sengaja begitu supaya layar tambah pengeluaran bisa dikerjakan di atas data contoh dan tidak menunggu layar pembuatan grup selesai. Kalau terasa janggal waktu dikerjakan, tukar saja urutannya, dependensinya sudah ditulis eksplisit di `plan.md`.
- `pnpm size` (`.size-limit.json`) cuma ngukur `dist/assets/*.js`, nol CSS. Sejak F0-03, `tokens.css` + `global.css` ke-build jadi `dist/assets/*.css` 7,33 KB (gzip 1,92 KB) yang nol ke-track di manapun. Bukan masalah sekarang (jauh dari anggaran LCP), tapi F4-02 (cek anggaran performa) perlu tahu ini gap kalau CSS-nya nanti membengkak — anggaran yang dijaga otomatis cuma separuh cerita.
- Guard nilai CSS mentah (`scripts/check-raw-css-values.ts`, dites di `scripts/check-raw-css-values.test.ts`) sengaja ditaruh di luar `src/` biar nggak nyisir file dirinya sendiri. Nangkep hex, `rgb()/rgba()/hsl()/hsla()`, px, durasi (ms/s), dan persen mentah di `src/**/*.css`; yang lolos cuma `0` (segala satuan), `1px` khusus baris yang nyebut border, `1ms` (idiom teknis reduced-motion, bukan pilihan desain), dan `100%`. Belum disambungkan ke CI — itu F0-08.
