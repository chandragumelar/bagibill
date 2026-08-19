# BagiBill — Progress

Sumber kebenaran fitur ada di `spec.md`. Urutan kerja ada di `plan.md`. File ini cuma melacak status, keputusan, dan hal yang masih menggantung.

Status terakhir diperbarui: 19 Agustus 2026
Fase aktif: F2 (storage). F1 (split engine) tutup seluruhnya (F1-01 sampai F1-10). F2-01 dan F2-02 selesai. F0-01 sampai F0-04 dan F0-08 selesai; F0-05 sampai F0-07 kodenya selesai, menunggu uji HP fisik. Seluruh mockup gelombang 1 selesai.
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
- [x] F0-04 Infrastruktur i18n
- [ ] F0-05 Komponen dasar dan halaman `/dev/ui`
- [ ] F0-06 Kerangka rute dan layout (kode selesai, belum dites di HP)
- [ ] F0-07 Lapisan sistem (undo, offline, gagal) (kode selesai, belum dites di HP)
- [x] F0-08 Gerbang kualitas di CI

### F1. Split engine
- [x] F1-01 Tipe uang dan minor unit
- [x] F1-02 Pembagi sisa largest remainder
- [x] F1-03 Mode Rata, Nominal, Persentase
- [x] F1-04 Mode Porsi dan Selisih
- [x] F1-05 Mode Per Item
- [x] F1-06 Biaya tambahan
- [x] F1-07 Traktir
- [x] F1-08 Pembayar dan saldo
- [x] F1-09 Settlement
- [x] F1-10 Fasad dan tabel kasus

### F2. Storage
Bisa paralel dengan F1.
- [x] F2-01 Schema dan Clock
- [x] F2-02 Repository grup dan member
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
- [x] File string i18n id dan en, helper Intl
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
- K-19 SELESAI 12 Ags 2026 — Script build-time di `scripts/*.ts` (`check-raw-css-values.ts`, `check-locale-keys.ts`) dieksekusi langsung lewat `node scripts/nama.ts`, tanpa `tsx`/`ts-node`/transpile step. Alasan: Node 22.23.1 di environment ini udah bisa strip tipe TypeScript langsung tanpa flag (dicoba manual, `node file.ts` jalan tanpa `--experimental-strip-types`), jadi nambah dependency buat itu cuma nambah bundel dev tanpa guna. Kalau nanti pindah environment dan `node scripts/*.ts` berhenti jalan, itu tandanya Node-nya lebih tua dari yang diasumsikan di sini — bukan berarti pola ini yang salah.
- K-20 TERBUKA — Cara komponen ikut reaktif waktu bahasa diganti. `t()` dari F0-04 tidak reaktif sendiri — cuma komponen yang panggil `useLocale()` (lewat `useSyncExternalStore`) yang di-render ulang. Ketauan di F0-05 waktu section `/dev/ui` yang cuma panggil `t()` polos gak update teksnya pas locale diganti, sampai halamannya sendiri subscribe `useLocale()` dan `key={locale}` buat maksa remount seluruh isinya. F0-06 (kerangka rute dan layout) perlu mutusin pola yang sama di root layout supaya ganti bahasa di layar manapun kebaca, bukan cuma di halaman yang kebetulan ikut panggil `useLocale()` sendiri. Tidak memblokir gelombang 1 karena belum ada layar produk yang butuh ganti bahasa real-time, tapi harus diputuskan sebelum F0-06 selesai.
- K-21 SELESAI 12 Ags 2026 — Router ditulis sendiri (`src/routes/router.tsx`), bukan react-router atau wouter. Alasan: budget bundle ketat (55KB/120KB kepake sebelum F0-06, react-vendor sendirian 59KB gzip), rute gelombang 1 cuma 6 path statis plus `:param`, nol nested layout/data-loader yang butuh fitur router gede — presedennya K sama F0-04 (i18n ditulis sendiri demi bundle, bukan narik i18next). **Syarat cabut**: ganti ke library beneran begitu salah satu dari ini jadi kebutuhan nyata, bukan sebelum itu — (1) nested layout/route beranak yang hand-roll-nya mulai berat dijaga, (2) data loader per rute (fetch-before-render, bukan fetch-in-effect), (3) route guard beneran (redirect berdasarkan state async, bukan sekadar cek path). Lazy-load per rute wajib jalan sejak F0-06, dibuktikan lewat `dist/` chunk graph — bukan ditunda ke tugas nanti, karena itu satu-satunya yang bikin budget 120KB masih mungkin dijaga sampai gelombang 1 kelar.
- K-22 SELESAI 12 Ags 2026 — Stroke ikon UI 2, bukan 1,75. `spec.md` 18.1 dan catatan F0-02 di `docs/mockup-inventory.md` bagian 3 sama-sama nulis "1,75", tapi dicek ulang ke `stroke-width` beneran lintas 4 mockup (Beranda, Detail_Grup_Saldo, Klaim_Item, Lapisan_Sistem) pas F0-07 butuh ikon SVG pertama kalinya — nol kemunculan "1.75", `ic()` di `Lapisan_Sistem.html` konsisten pakai "2". Kode ikut kode (mockup), bukan catatan lama. `spec.md` 18.1 dibetulkan di PR yang sama.
- K-23 SELESAI 12 Ags 2026 — F0-07 lapisan sistem: `src/shared/system/` cuma cangkang+kait (DangerSheet, HoldToDeleteButton, useFocusTrap, LockedActionExplain, NetBand+useNetworkPhase, InlineFailure, LoadFailure, Skeleton, useUndoQueue), nyambung ke aksi nyata tetap kerjaan F3 masing-masing. Tiga catatan yang berlaku buat F3 nanti:
  - **Posisi Toast belum dikunci.** `useUndoQueue` cuma nyediain state (items, remainingSeconds, dst) buat dipasang ke `Toast` (F0-05) manapun pemanggil taruh — F0-07 sengaja gak bikin host/wrapper posisi baku (`position:fixed` dsb) karena tiap layar beda konteks (ada yang punya FAB, ada yang BottomBar, ada yang dua-duanya). Kriteria "Selesai kalau" F0-07 soal toast gak nutupin tombol simpan/angka total baru bisa diuji beneran pas F3-01/F3-05 masang Toast di layar sungguhan — dicatat di sini supaya gak kelewat pas itu.
  - **`useNetworkPhase.markSynced()` nunggu K-11.** Fase "sync" sengaja gak auto-pindah ke "done" lewat timer — nunggu mutasi beneran kelar ngirim, yang berarti nunggu bentuk antrean mutasi dari K-11 (protokol sync, masih TERBUKA). Jangan tergoda nambahin timer pas F3 nyambungin ini sebelum K-11 kelar.
  - **Sheet judul ikut ukuran DS (fs-title3/20px), bukan LS (fs-title2/22px).** DangerSheet numpang `Sheet` F0-05 apa adanya biar satu ukuran judul konsisten di semua sheet — mockup LS sendiri pakai ukuran lebih besar khusus buat sheet hapus grup, gak direplikasi supaya gak nambah cabang ukuran di komponen bersama.
- K-24 SELESAI 12 Ags 2026 — F1-02 `allocateByWeights`: seri pecahan sisa (largest remainder) diputus dengan indeks array lebih kecil menang, bukan lewat id atau nama member. Alasan: hasil harus reproducible dari data yang sama di device manapun tanpa perlu tahu identitas peserta, dan urutan array sudah deterministik duluan (urutan input yang dipanggil pemanggilnya) jadi ga perlu sumber keacakan tambahan.
- K-25 SELESAI 12 Ags 2026 — F1-02 `allocateByWeights`: total negatif (diskon, koreksi) dialokasikan dengan cara hitung di nilai absolut dulu baru tiap elemen hasil dinegasikan, bukan floor langsung di angka negatif. Alasan: arah pembulatan floor di bilangan negatif kebalik dari yang diinginkan (membulatkan menjauhi nol, bukan ke bawah menuju nol), jadi kalau dipaksa floor langsung largest-remainder-nya salah arah. Hitung di absolut lalu negasi menjaga invarian jumlah = total tetap persis dan pembulatannya konsisten sama kasus positif.
- K-26 SELESAI 19 Ags 2026 — F1-03 `splitByPercentage`: toleransi jumlah persen terhadap 100 adalah 1 basis point inklusif, bukan eksklusif seperti bacaan harfiah `spec.md` 6.3. Alasan: kasus paling umum yang wajib jalan menurut checklist QA adalah 33,33 tiga kali yang totalnya 99,99, meleset persis 0,01 dari 100 — batas eksklusif menolak kasus pertama yang orang coba pakai. Koreksinya gratis lewat `allocateByWeights` yang menormalisasi terhadap jumlah bobot, jadi persen di luar toleransi tetap dilempar tapi yang di dalam toleransi tidak diutak-atik angkanya.
- K-27 SELESAI 19 Ags 2026 — F1-03 `splitByAmounts` menolak nominal per orang yang negatif, beda dari `splitEvenly`/`splitByPercentage` yang menerima `totalMinor` negatif. Alasan: potongan personal punya modenya sendiri (Selisih, `spec.md` 6.5, dikerjakan di F1-04), dan angka minus yang diketik langsung di mode Nominal hampir selalu salah ketik, bukan diskon yang disengaja.
- K-28 SELESAI 19 Ags 2026 — F1-03 ketiga mode (`splitEvenly`, `splitByAmounts`, `splitByPercentage`) menolak daftar peserta kosong, termasuk saat `totalMinor` nol — beda dari `allocateByWeights` yang mengembalikan array kosong untuk total nol dengan nol bobot. Alasan: di level mode, peserta kosong berarti pengeluaran tanpa siapapun yang menanggung, dan itu selalu salah input, bukan kasus valid yang perlu direpresentasikan sebagai hasil kosong. F1-04 (`splitByWeights`, `splitByAdjustment`) ikut aturan yang sama.
- K-29 SELESAI 19 Ags 2026 — F1-04 varian warning `negative_share` di `SplitResult` membawa `indices` (posisi array), bukan identitas member. Alasan: split engine tidak tahu identitas peserta, cuma urutan array yang dikirim pemanggil — pemanggil yang punya daftar member tinggal memetakan indeks ke orangnya. Konsisten dengan K-24 yang juga memakai indeks array, bukan id, sebagai satu-satunya sumber urutan yang deterministik.
- K-30 SELESAI 19 Ags 2026 — F1-04 `splitByWeights` menolak input bobot yang tidak lengkap (panjang array beda dari jumlah peserta) alih-alih mengisi bobot kosong dengan default 1. Alasan: bobot default 1 di mode Porsi adalah keadaan awal kontrol UI (spec.md 6.4), bukan perilaku mesin — kalau mesin diam-diam mengisi bobot yang hilang, input yang salah kirim dari layar jadi kebaca sebagai default yang sah, dan bug kehilangan data lolos tanpa jejak.
- K-31 SELESAI 19 Ags 2026 — F1-05 `splitByItems` menurunkan `totalMinor` dari `unitPriceMinor * quantity` tiap item, bukan menerima `totalMinor` sebagai input terpisah seperti lima mode lain. Alasan: di mode ini itemnya yang jadi sumber kebenaran (struk hasil scan atau input manual), dan total yang dikirim terpisah cuma nambah satu angka yang bisa bertentangan dengan jumlah itemnya sendiri tanpa cara mesin tahu mana yang benar.
- K-32 SELESAI 19 Ags 2026 — F1-05 `quantity` item dibatasi integer positif di gelombang 1, qty pecahan (barang timbangan seperti daging per 100 gram) ditolak. Alasan: belum ada layar yang butuh input qty pecahan, dan menerimanya sekarang berarti menebak bentuk validasi dan UI sebelum ada pemakai nyata. Ditunda sampai ada kebutuhan konkret.
- K-33 SELESAI 19 Ags 2026 — F1-05 `splitByItems` menolak klaim ganda dari `participantIndex` yang sama di satu item, bukan menggabungkan bobotnya secara diam-diam. Alasan: dua entri klaim dari orang yang sama di item yang sama itu ambigu — bisa jadi maksudnya menambah bobot, bisa jadi bug pengiriman data dobel dari layar — dan menggabungkannya otomatis menyembunyikan kasus yang kedua.
- K-34 SELESAI 19 Ags 2026 — F1-06 `ChargeAmount` mode `percent` wajib menyebut `basis` eksplisit (`subtotal` atau `running_total`), nol nilai default. Alasan: urutan Indonesia butuh service charge dari subtotal lalu PB1 dari subtotal ditambah service (`running_total`), sementara tip Amerika dihitung dari subtotal walaupun posisinya setelah pajak (`subtotal`) — satu default apapun bakal salah di salah satu dari dua kasus itu, dan spec.md 7.2 sendiri bilang urutan ini yang paling sering salah.
- K-35 SELESAI 19 Ags 2026 — F1-06 pembulatan hasil komponen persen ke minor unit pakai aturan setengah dibulatkan menjauhi nol (2,5 jadi 3, minus 2,5 jadi minus 3), bukan pembulatan bankir. Alasan: struk fisik dan kalkulator kasir memakai aturan yang sama, jadi pembulatan bankir bikin angka app beda dari kertas yang dipegang orang di meja. Simetris terhadap nol supaya diskon persen dan pajak persen membulat dengan cara yang konsisten.
- K-36 SELESAI 19 Ags 2026 — F1-06 `allocateExtraCharges` nol tahu nama jenis biaya (pajak, service, tip, ongkir) — engine cuma tahu angka dan cara alokasinya, nama dan preset per locale urusan layar dan file string. Konsekuensinya urutan array `charges` jadi kontrak, karena basis `running_total` didefinisikan relatif terhadap komponen sebelumnya di array yang sama.
- K-37 SELESAI 19 Ags 2026 — F1-06 mode alokasi `items` cuma sah untuk nominal komponen negatif, nominal nol atau positif ditolak. Alasan: spec.md 7.3 mode ini khusus buat voucher menu tertentu (diskon), dan biaya positif yang ditarget ke item tertentu bukan kasus yang didukung sekarang — belum jelas apa artinya (misal ongkir yang cuma berlaku ke sebagian item) dan lebih aman ditolak daripada ditebak.
- K-38 SELESAI 19 Ags 2026 — F1-07 traktir level komponen tidak dibangun sebagai varian `Treat` (union cuma punya `person`, `partial`, `item`). Alasan: "pajaknya dari saya" sudah persis sama dengan mode alokasi `single_payer` yang dibangun di F1-06 — nambah varian di sini berarti dua jalan kode buat satu perilaku yang sama, dan itu cara paling cepat bikin dua layar menampilkan angka berbeda.
- K-39 SELESAI 19 Ags 2026 — F1-07 `applyTreats` memproses `treats` berurutan di atas hasil traktir sebelumnya, bukan diselesaikan transitif. Alasan: tiap traktir adalah janji pada satu momen, bukan sistem yang diselesaikan serentak. Konsekuensinya buat traktir bertingkat (A menraktir B lalu B menraktir C): bagian B jadi nol dulu baru naik lagi sebesar bagian C, dan A tetap cuma menanggung bagian B yang lama, bukan bagian B setelah C ikut masuk.
- K-40 SELESAI 19 Ags 2026 — F1-07 traktir item cuma memindahkan nominal item, tidak termasuk biaya tambahan proporsional yang menempel di atasnya. Alasan: `itemSharesMinor` berasal dari `splitByItems` yang jalan sebelum lapisan biaya tambahan F1-06, jadi engine belum pernah tahu berapa pajak yang menempel di item itu di titik ini. Bacaan lain ("ditraktir berarti termasuk pajaknya") sama masuk akalnya, dicatat di Catatan lepas.
- K-41 SELESAI 19 Ags 2026 — F1-07 traktir `partial` yang melebihi bagian penerima diterima dan dibiarkan negatif, bukan diklamp ke nol atau ditolak. Alasan: konsisten dengan K-29 (mode Selisih) dan diskon di F1-06 — mengklamp berarti uang hilang dari rincian, dan niat traktir sebagian yang lebih besar dari bagian penerima itu sah (contoh: nominal traktir dibulatkan ke angka bulat tanpa mengecek sisa dulu).
- K-42 SELESAI 19 Ags 2026 — F1-08 `computeGroupBalances` mewajibkan `sharesMinor` dan `paymentsMinor` tiap `ExpenseLedger` persis sepanjang `participantCount`, nol array pendek per subset peserta yang ikut di pengeluaran itu. Alasan: indeks peserta harus berarti orang yang sama di seluruh grup, dan array yang panjangnya beda-beda per pengeluaran memaksa pemanggil memetakan ulang indeks tiap kali — persis tempat bug indeks bergeser muncul.
- K-43 SELESAI 19 Ags 2026 — F1-08 ketidakcocokan total bayar dan total tagihan di `computeExpenseBalance`/`computeGroupBalances` dilempar sebagai error, bukan warning seperti `over_allocated` di F1-03. Alasan: mode Nominal F1-03 masih dalam proses ketikan pengguna, angkanya belum final. Di sini pengeluarannya sudah tersimpan dan siap dihitung jadi saldo — pengeluaran tersimpan dengan pembayaran yang tidak imbang itu data rusak, bukan keadaan sementara yang layar masih proses.
- K-44 SELESAI 19 Ags 2026 — F1-09 `computeSettlement` menghitung pairwise per pengeluaran (lewat `computeExpenseBalance` tiap `ExpenseLedger`), bukan dari net grup yang sudah dijumlahkan. Alasan: "siapa berutang ke siapa" cuma punya arti di dalam satu pengeluaran, karena di situlah diketahui siapa yang menalangi — net grup sudah kehilangan informasi pasangannya, yang tersisa cuma angka bersih per orang.
- K-45 SELESAI 19 Ags 2026 — F1-09 mode Langsung menetokan pasangan arah berlawanan jadi satu transfer (A→B 5000 dan B→A 3000 jadi A→B 2000; sama besar keduanya hilang). Alasan: dua orang yang saling berutang lalu diminta transfer bolak-balik itu tidak masuk akal buat siapapun yang membaca layarnya, dan mode Langsung ada supaya orang cuma berurusan dengan orang yang benar-benar dia utangi, bukan supaya daftarnya panjang.
- K-46 SELESAI 19 Ags 2026 — F1-09 `pairwiseTransfers` selalu diisi apapun mode-nya (spec.md 11.1, layar penelusuran butuh rincian per pasangan meski Simplify aktif), dan `transfers` menduplikasinya persis saat mode Langsung. Alasan: pemanggil (layar) jadi tidak perlu tahu mode apa yang dipakai untuk merender daftar utamanya — satu bentuk balik yang konsisten di kedua mode.
- K-47 SELESAI 19 Ags 2026 — F1-10 `calculateExpense` menolak `totalMinor` nol atau negatif (spec.md 24), bukan mesin dalam mode split. Alasan: K-25 bikin `allocateByWeights` menerima total negatif karena diskon dan koreksi butuh itu di level primitif alokasi — itu bukan kontradiksi sama spec.md 24, cuma soal di lapisan mana aturan produk berlaku. Fasad adalah tempat aturan "pengeluaran tersimpan harus bernilai positif" dipasang; diskon tetap masuk lewat `charges` sebagai nominal negatif, bukan lewat `totalMinor`.
- K-48 SELESAI 19 Ags 2026 — F1-10 export split engine dibatasi ke satu titik (`packages/split-engine/index.ts`) lewat `"exports": {".": "./index.ts"}` di `package.json`-nya plus rule `import/no-internal-modules` di `eslint.config.js` (`@bagibill/split-engine/*` sejajar `@/features/*/**`). Dibuktikan lewat file probe sementara (pola sama K-16): import path dalam via specifier package (`@bagibill/split-engine/allocation/...`) ditolak resolver (TypeScript, lewat medan `exports`), bukan cuma didokumentasikan. Temuan: pesan errornya `@typescript-eslint/no-unsafe-assignment` ("unsafe assignment of an error typed value"), bukan pesan `import/no-internal-modules` sendiri — resolver gagal duluan sebelum rule itu sempat mengklasifikasi importnya, jadi blokirnya nyata tapi atribusi pesannya beda dari dugaan awal. Temuan kedua: reach lewat *relative path* langsung ke dalam `packages/split-engine/` (bukan lewat specifier package) tetap lolos nol error — batasan yang sama juga berlaku di `@/features/*/**` yang sudah ada, bukan regresi baru dari perubahan ini.
- K-49 SELESAI 19 Ags 2026 — F1-10 `calculateExpense` memanggil lapisan berurutan tetap: mode split, lalu `allocateExtraCharges`, lalu `applyTreats`, lalu `computeExpenseBalance`. Alasan: itu urutan yang sudah diasumsikan tiap lapisan sejak dibangun (charges beroperasi di atas bagian mode split, treats beroperasi di atas bagian setelah biaya, saldo dihitung dari bagian akhir) — membalik urutannya bikin angka meleset tanpa melempar error apapun, karena tiap lapisan valid dipanggil sendirian.
- K-50 SELESAI 19 Ags 2026 — F1-10 `warnings` di `ExpenseCalculation`/`GroupCalculation` digabung apa adanya dari seluruh lapisan (split, charges, treats), nol dedup. Alasan: tiap lapisan punya alasan sendiri buat memunculkan warning yang sama (`negative_share` dari mode Selisih beda konteks dengan `negative_share` dari diskon di charges), dan men-dedup berarti menyembunyikan dari lapisan mana warning itu sebenarnya berasal.
- K-51 SELESAI 19 Ags 2026 — F2-01 tipe rekaman (`src/lib/storage/records.ts`) diturunkan dari tipe split engine lewat `Omit`/`&`, dengan `memberId` menggantikan indeks peserta di titik-titik yang relevan (`ItemClaimRecord`, `ChargeAllocationRecord` varian `single_payer`/`items`, `TreatRecord`). Alasan: engine bekerja dengan indeks peserta supaya bisa dites tanpa tahu identitas siapapun, storage bekerja dengan `memberId` supaya data tetap berarti setelah urutan member berubah — dua-duanya benar di tempatnya masing-masing, jadi bentuknya nggak bisa sama persis, tapi diturunkan lewat `Omit` bukan diketik ulang: field baru di engine otomatis ikut ke rekaman, field yang dihapus di engine bikin typecheck merah di sini, bukan diam-diam nyimpang.
- K-52 SELESAI 19 Ags 2026 — F2-01 nama field rekaman ikut engine (`unitPriceMinor`, `quantity`), bukan sketsa `spec.md` 5.1 (`unitPrice`, `qty`). Alasan: sketsa `spec.md` 5.1 bukan kontrak nama field, dan tipe yang diturunkan dari engine itu yang menang karena dialah yang dijaga tetap sinkron secara otomatis lewat `Omit`.
- K-53 SELESAI 19 Ags 2026 — F2-01 sumber waktu diinjeksi lewat `Clock` (`src/lib/storage/clock.ts`), dikunci rule eslint `no-restricted-syntax` yang melarang `Date.now()` dan `new Date()` tanpa argumen di `src/lib/storage/**` kecuali `clock.ts` sendiri. Alasan: `spec.md` 24 — perangkat dengan jam salah tetap harus benar urutannya, timestamp server yang jadi acuan, jadi sumber waktu wajib bisa ditukar bukan tertanam di logika. Dibuktikan lewat file probe sementara (pola sama K-16/K-48): `Date.now()` dan `new Date()` di `src/lib/storage/__eslint-probe-clock.ts` dua-duanya kena `no-restricted-syntax`, `clock.ts` sendiri lolos.
- K-54 SELESAI 19 Ags 2026 — F2-01 `dexie` masuk sebagai dependency runtime pertama sejak awal proyek (konsumen pertamanya `src/lib/storage/schema.ts`). Dampak bundle: **64,55 KB brotli sebelum dan sesudah, sama persis** — Dexie belum diimpor di jalur manapun yang benar-benar dibundel ke app (cuma dipakai test lewat `fake-indexeddb`), jadi Rollup nge-drop seluruhnya. Angka ini bakal bergerak begitu F2-02/F2-03 nyambungin repository ke layar sungguhan, dicek ulang di situ.
- K-55 SELESAI 19 Ags 2026 — F2-01 tabel `Item` di Dexie TIDAK dibuat terpisah, item tetap nested di dalam `ExpenseRecord.items` sesuai bentuk `spec.md` 5.1 (`items: [Item]` di dalam `Expense`, `Item` sendiri nol punya field balik ke `expenseId`). Lima tabel: Group, Member, Expense, Settlement, ActivityLog. Alasan: layar klaim selalu memuat satu `Expense` utuh, jadi nol query yang butuh item lepas dari induknya — tabel terpisah cuma berarti nambah field balik yang nggak ada di spec plus dua penulisan yang harus konsisten tiap simpan. Instruksi tugas awalnya menyebut `Item` sebagai salah satu tabel, dikonfirmasi ulang ke pengguna sebelum diputuskan, bukan dipilih sepihak.
- K-56 SELESAI 19 Ags 2026 — F2-01 `ExpenseItemRecord` (diturunkan dari `ExpenseItem` engine) nol punya field `sponsorId` walau sketsa Item di `spec.md` 5.1 menyebutnya. Alasan: traktir level item sudah diwakili lewat `ExpenseRecord.treats` (`TreatRecord` kind `"item"`, berisi daftar `itemId`), konsisten sama cara engine (`treats/treat.types.ts`) merepresentasikannya — satu tempat buat "siapa mentraktir apa" buat ketiga jenis traktir (person, partial, item), bukan dua jalan (field di Item plus array treats) yang bisa saling nggak sinkron.
- K-57 SELESAI 19 Ags 2026 — F2-02 `findSimilarMembers` (`member-name.ts`) menganggap mirip kalau bentuk ternormalisasi sama persis, atau jarak Levenshtein-nya 1. Alasan: spec.md 12.2 cuma bilang "cukup mirip" tanpa angka. Jarak 1 menangkap salah ketik satu huruf ("Dimas" vs "Dimass") tanpa menyeret nama yang memang beda ("Dimas" vs "Dinar", jarak 3). Fungsi ini murni dan nol wewenang menolak — `addMember` di `member-repository.ts` sengaja tidak memanggilnya, keputusan warning-atau-tidak ada di layar (F3-09).
- K-58 SELESAI 19 Ags 2026 — F2-02 slug grup dibuat 22 karakter base62 dari CSPRNG (`crypto.getRandomValues`), bukan 12 karakter dari alfabet yang membuang karakter mirip seperti disebut instruksi tugas. Alasan: spec.md 4.1 sudah eksplisit menetapkan format ini ("22 karakter base62 acak dari CSPRNG, setara 128 bit entropi") untuk `Group.slug` yang sama dipakai di link `/j/<slug>`, jadi spec yang menang atas sketsa instruksi, sesuai arahan tugas sendiri. Dicek juga bahwa nol turunan dari nama grup, sesuai alasan keamanan spec.md 4.6 (dua grup boleh senama, slug yang bisa ditebak berarti grup lain bisa dijelajah).
- K-59 SELESAI 19 Ags 2026 — F2-02 warna member disimpan di field `color: string` yang sudah ada sejak F2-01 (bukan field baru `colorIndex: number` seperti disebut instruksi tugas), isinya nama custom property CSS `"--m-1"` sampai `"--m-12"` — bukan hex, bukan angka polos. Alasan: `records.ts` sudah punya field `color: string` sejak F2-01 dan dipakai `schema.test.ts` dengan nilai contoh `"--m-1"`; menambah `colorIndex` di sampingnya berarti dua field untuk satu tujuan yang sama, salah satunya jadi mati. Nilai hex sungguhan tetap nol disentuh di sini (tetap milik `packages/tokens`), yang disimpan cuma nama var-nya — jadi maksud instruksi ("bukan nilai warna hex") tetap terpenuhi lewat cara yang tidak menduplikasi field. Nomornya sendiri (untuk hitung urut dan wrap ke 1 setelah member ke-12) dihitung dari jumlah seluruh member yang pernah ada di grup itu termasuk yang nonaktif dan yang `deletedAt`-nya terisi, bukan dari jumlah member aktif — sesuai spec.md 18.5 yang menetapkan warna sekali seumur hidup member. **Ini penyimpangan dari instruksi tugas yang eksplisit, dicatat di sini supaya bisa dikoreksi kalau salah baca maksudnya.**
- K-60 SELESAI 19 Ags 2026 — F2-02 `group-repository.ts` dan `member-repository.ts` dibuat sebagai factory yang menerima instance database (`BagiBillDatabase` dari `schema.ts`), `Clock`, dan `IdGenerator` sebagai argumen, bukan mengimpor singleton `db` dari `schema.ts`. Alasan sama K-53 (Clock injeksi): test bisa jalan tanpa saling bocor state. Adapter storage generik yang disebut `plan.md` F2-03 belum dibuat di sini — injeksi instance database sudah cukup membuat lapisan ini bisa ditukar, dan bikin abstraksi generik sebelum ada dua pemakai nyata (cuma repository pengeluaran F2-03 yang akan jadi pemakai kedua) biasanya menghasilkan abstraksi yang salah bentuk.
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
- `src/locales/id.ts` dan `en.ts` (F0-04) baru diisi lima kunci demo buat buktiin infrastrukturnya jalan (parity checker, `t()`, pluralisasi, kunci K-04 `expense.mode.adjustment`), sumbernya tabel padanan spec.md 22. Bukan copy deck final — kunci per layar nyusul di tugas F3 masing-masing, jangan dianggap sudah lengkap.
- F0-03 dan F0-04 dicentang di papan Gelombang 1 tanpa literal "diuji di device sungguhan" — dua-duanya infra tanpa layar (App.tsx masih `<div />` kosong sampai F0-06/F3), jadi nggak ada apapun buat ditap di HP. F0-03 diverifikasi di Chrome desktop beneran (bukan cuma jsdom): reload dengan override tersimpan langsung dapet `data-theme` dan `background-color` yang benar. F0-04 diverifikasi lewat 43 test otomatis (termasuk assert byte-level ke output `Intl` asli) plus bukti manual `pnpm build` gagal pas satu kunci `en.ts` dihapus, lalu dibalikin. Kalau nanti device fisik jadi mungkin diuji (misal lewat `/dev/ui` F0-05), pertimbangkan ulang standar ini.
- F0-05: `/dev/ui` sekarang beneran ada dan bisa ditap, tapi baru diverifikasi interaktif di Chrome desktop (klik semua state, ganti tema, ganti bahasa, tab-navigation, screenshot terang+gelap+ID+EN) plus 72 test otomatis — bukan di HP fisik. Papan Gelombang 1 F0-05 sengaja TIDAK dicentang karena CLAUDE.md eksplisit "centang cuma setelah diuji di device sungguhan". Kalau sudah dicoba di HP beneran, centang barisnya.
- F0-05 nemu bug infra yang gak masuk cakupan file resminya tapi dibetulin karena bikin test palsu-gagal: `src/test/setup.ts` gak pernah manggil `cleanup()` dari Testing Library. `vitest.config.ts` pakai `globals:false`, jadi auto-cleanup bawaan RTL (yang deteksi `afterEach` global) gak pernah nyala — render dari test sebelumnya numpuk di `document.body` dan bikin query "Found multiple elements" palsu di file test manapun yang punya lebih dari satu `it()` yang nge-render. Ketauan pas 14 dari 16 file test komponen baru gagal serentak. Ditambah `afterEach(cleanup)` eksplisit di setup file.
- F0-05: Button ghost variant sumbernya `.k-btn--ghost` KI (`color:var(--text-secondary)`, satu keluarga sama primary/secondary lewat `.k-btn` base), bukan `.btn-ghost` DT (`color:var(--brand)`, class ad hoc terpisah beda ukuran). Dua mockup punya treatment ghost yang beda; dipilih yang satu keluarga base karena Button ini komponen bersama, bukan tiruan satu mockup. Konsekuensinya: waktu F3-05 bangun layar Detail Grup Transaksi, tombol "📷 Scan struk" hasil dari Button ghost gak bakal pixel-match sama mockup DT (beda warna teks, beda tinggi 50px vs 44px) — kalau itu masalah nanti, longgarkan lewat prop, jangan diam-diam disesuaikan balik.
- F0-05: MoneyInput cuma nanganin mata uang nol-desimal (IDR) — apa yang diketik jadi minor unit apa adanya, gak ada titik desimal. Satu-satunya mata uang yang muncul di mockup gelombang 1 memang IDR, jadi belum ada rujukan desain buat input mata uang berdesimal (USD dkk). Nyusul kalau ada layar yang butuh.
- F0-05: `docs/mockup-inventory.md` 1.1 kena koreksi — baris Sheet sebelumnya nulis "penuh layar" sebagai salah satu keadaannya, padahal itu overlay gagal-muat/skeleton yang komponennya beda total (lihat catatan "Koreksi F0-05" di file itu langsung, dan bagian 1.5 yang emang udah punya baris sendiri buat itu).
- F0-06: kode selesai (router, GroupHeader, TabBar, Topbar, BottomBar, Screen, 7 rute placeholder, cabang bundle terpisah buat `/c/` dan `/j/`), diverifikasi interaktif di Chrome desktop (navigasi antar rute, tab switching, back/menu/tombol, redirect path nyasar ke `/app`, chunk `/c/xxx` dicek langsung isinya di `dist/` gak narik `AppRoutes`/`ui` chunk) plus 35 test baru — bukan di HP fisik. Papan Gelombang 1 F0-06 sengaja TIDAK dicentang, sama alasannya kayak F0-05.
- F0-06: `docs/mockup-inventory.md` 1.1 kena koreksi lagi, dua baris — Topbar layar penuh ternyata cuma punya sumber utuh di `Lapisan_Sistem.html` (bukan "TP, BG, KI" kayak tercatat; `.topbar` yang reusable cuma di situ, 3 instance identik). Keadaan "judul bisa diedit" gak ketemu di manapun, itu sebenarnya field judul pengeluaran TP yang beda komponen. Bilah tombol bawah juga dikoreksi — "primer plus sekunder" ternyata pola `.sheet-actions`/`.k-sheet-actions` (dua tombol ditumpuk DALAM sheet), bukan bottom bar layar; bottom bar layar yang konsisten cuma BG+KI (single primary, plus disabled).
- F0-06: tombol ikon di GroupHeader (30px DT/DS) dan Topbar (34px LS) disatuin ke `--size-touch-min` (44px) — dua nilai beda tipis, kalah sama aturan keras target sentuh 44px. Konsekuensinya box ikon lebih gede dari mockup, glyph-nya (26px/20px) tetap ukuran asli di dalam box yang lebih lega.
- F0-06: AvatarStack (tumpukan avatar berlapis dengan badge "+N") sengaja BELUM dibangun. GroupHeader nerima slot `avatars?: ReactNode` kosong buat sekarang karena Beranda juga butuh pola yang sama nanti (F3-10) dan bangun sekarang di F0-06 berarti nebak API-nya duluan tanpa dua pemakai nyata di tangan. Nyusul jadi komponen `shared/ui` waktu salah satu dari F3-05/F3-07/F3-10 beneran butuh.
- F0-07 nemu bug nyata pas dites manual di `/dev/ui` (bukan cuma test lolos): `useUndoQueue` manggil `onCommit`/`onRestore` (side effect dari pemanggil) DI DALAM argumen updater fungsional `setPending((current) => { current.forEach(e => e.onCommit()); return []; })`. React StrictMode (dev, aktif lewat `<StrictMode>` di `main.tsx`) memanggil updater fungsional itu **dua kali** buat cek purity — jadi side effect-nya ikut nembak dua kali per item. Ketauan visual: hapus satu item, log nunjukin "komit: a" muncul dua kali buat satu delete. Diperbaiki dengan pola ref-mirror (`pendingRef` disinkronkan manual di samping state, side effect dibaca dari situ di badan fungsi biasa — bukan dari argumen updater). Percobaan pertama benerin ini (baca `pending` polos dari closure, drop functional updater) balik nimbulin bug lain: dua panggilan `remove()` berturutan dalam batch render yang sama saling menimpa (closure basi). Tiga test regresi baru sengaja bungkus `renderHook` dengan `wrapper: StrictMode` biar bug kelas ini ketauan dari test, bukan cuma nemu manual lagi. **Pelajaran buat F1-F3**: side effect dari pemanggil (callback apapun yang dioper ke hook) tidak boleh dijalankan di dalam badan updater fungsional `setState` — React boleh memanggilnya lebih dari sekali kapan saja di StrictMode/Concurrent Mode.
- F0-07: `useFocusTrap` sengaja BUKAN nyaring elemen fokusabel lewat `el.offsetParent !== null` (beda dari `trapFocus()` di mockup). Di jsdom, `offsetParent` selalu `null` (nol layout engine) jadi filter itu bikin trap mati total di test. Pemakaian nyata (`DangerSheet`) juga gak pernah nyembunyiin salah satu tombolnya secara kondisional, jadi filter itu gak kepake buat kasus ini — kalau nanti ada sheet lain yang butuh sembunyiin elemen fokusabel secara kondisional, filter visibility perlu ditambah lagi pakai cara yang gak bergantung `offsetParent`.
- F0-08: papan Gelombang 1 dicentang tanpa "diuji di HP sungguhan" — F0-08 infra CI, nol UI buat ditap. Buktinya setara: push komit ke branch beneran, `gh run watch` 3x — ijo (baseline), merah (komit sengaja nulis hex literal di `Button.module.css`, ketangkep di step Test sebelum sempat nyampe Build), ijo lagi (setelah `git revert`). Ketiga run id-nya kecatet di PR #9. `check-raw-css-values.ts` sekarang punya `runCheck()`+`isMain` (pola sama `check-locale-keys.ts`) disambung ke `build` — nutup celah yang dicatat F0-05 ("belum disambungkan ke CI"). Kunci i18n dan anggaran bundle udah otomatis ke-cover masing-masing lewat `build` dan `size`, gak butuh kabel baru.
- F0-08: `packageManager: "pnpm@11.18.0"` ditambah ke `package.json` biar `pnpm/action-setup@v4` di CI pin versi yang sama dengan lokal, bukan nebak dari `pnpm-lock.yaml`. Satu annotation non-blocking dari Actions: tiga action (`checkout`, `setup-node`, `pnpm/action-setup`) masih target runtime Node 20 yang dipaksa jalan di Node 24 sama GitHub — bukan error, cuma info, biarin sampai action-nya sendiri update.
- F1-01: dicentang di papan Gelombang 1 tanpa "diuji di HP sungguhan" — murni modul logic (`packages/split-engine/money/`), nol UI, nol apapun buat ditap di HP. Preseden sama kayak F0-03/F0-04. Dibuktikan lewat 25 test baru (normal, batas, ditolak) plus round-trip `parseMoney`↔`formatMoney` lima currency.
- F1-01: tabel presisi mata uang sekarang ada dua tempat, `packages/split-engine/money/money.ts` dan `src/lib/i18n/format-money.ts` — isinya identik (persis sama exception-list) tapi belum di-dedup. Alasan: dedup berarti `i18n` harus import dari `split-engine`, padahal pintu publiknya (`index.ts`) baru dibangun di F1-10, dan import ke path internal `money/money.ts` melanggar aturan satu pintu di CLAUDE.md. Ditunda ke F1-10: `getCurrencyDecimals` di `i18n` jadi re-export dari facade, nama dipertahankan biar call-site nol berubah.
- F1-01: `packages/split-engine` didaftarkan ke `include` di `tsconfig.json` (pola sama kayak `scripts`) supaya `typecheck`/`build` nyapu tanpa tsconfig terpisah. Belum jadi dependency di root `package.json` karena belum ada consumer — nunggu F1-10 atau tugas F3 yang beneran impor lewat `index.ts`.
- F1-03: `scaleWeightToInteger` (allocate-by-weights.ts) dan `scalePercentToBasisPoints` (split-by-percentage.ts) sekarang dua implementasi terpisah dengan pola identik (pad-concatenate-BigInt lewat manipulasi string). Duplikasi disengaja, alasan sama K-27 F1-01 punya i18n/split-engine: pintu publik `index.ts` baru ada di F1-10, dan import ke helper internal folder lain melanggar aturan satu pintu. Kandidat dedup di F1-10, satu paket sama dedup tabel presisi mata uang yang sudah tercatat di F1-01.
- F1-03: tombol "bagi sisanya rata" (`spec.md` 6.2) sengaja belum ditulis sebagai fungsi terpisah — itu tinggal panggil `splitEvenly` pada sisa yang dihitung di layar (total dikurangi yang sudah dialokasikan), jadi bukan logika baru di split engine. Fungsi yang belum ada pemakainya tidak ditulis duluan; nyusul di tugas layar F3-04 yang beneran butuh.
- F1-04: `spec.md` 6.6 bilang "bobot klaim [Per Item] bekerja persis seperti mode Porsi tapi di level item" — kemungkinan besar F1-05 bisa panggil `splitByWeights` langsung per item alih-alih menulis ulang alokasi bobot. Belum dipastikan karena F1-05 belum dikerjakan, cuma dicatat biar ga kepikiran nulis versi kedua pas itu waktunya.
- F1-04: `packages/split-engine/modes/split-by-adjustment.ts` punya guard `undefined` di `applyAdjustments` (lempar internal error) yang secara matematis tidak pernah tercapai — `evenSharesMinor` dan `adjustmentsMinor` selalu sepanjang sama karena bobotnya dibangun dari `adjustmentsMinor.map()`. Guard-nya cuma buat memuaskan `noUncheckedIndexedAccess` di `tsconfig.json`, bukan validasi input.
- F1-05: dugaan di catatan F1-04 di atas ternyata gak dipakai — `splitByItems` manggil `allocateByWeights` langsung per item, bukan `splitByWeights`. Alasan: `splitByWeights` cuma pembungkus `SplitResult` (warnings selalu kosong) yang gunanya buat keseragaman bentuk balik di level pengeluaran, sementara di level item yang dibutuhkan cuma array angka mentah buat disebar ke posisi `participantIndex` masing-masing klaim — bungkus tambahannya gak kepake terus dibuang lagi.
- F1-05: mesin mode Per Item selesai (`splitByItems`), tapi barisnya di "Fase 1 menurut spec" ada di daftar Fase 2 ("Mode Per Item dan layar assign", bukan di section Pembagian Fase 1), jadi nol dicentang di situ. K-02/K-03 sudah mutusin cuma mesinnya yang maju ke gelombang 1 (dipakai layar Klaim Item F3-08 versi satu device), layar assign versi pembuat tetap Fase 2 — baris itu baru dicentang kalau layar assign-nya jadi.
- F1-05: tombol "bagi item ini ke semua" dan "bagi rata semua sisa" (`spec.md` 6.6) sengaja belum ditulis. Keduanya aksi layar yang tinggal menyusun ulang `claims` (isi semua peserta dengan bobot 1, atau distribusikan sisa item tak diklaim) lalu manggil `splitByItems` yang sudah ada — bukan logika baru di split engine, dan fungsi tanpa pemakai gak ditulis duluan.
- F1-06: kombinasi bagian dasar minus (hasil mode Selisih yang ekstrem) dengan komponen biaya bermode `proportional` ditolak untuk sekarang (`assertProportionalIsPossible` di `allocate-extra-charges.ts` menolak `baseSharesMinor` yang punya elemen negatif kalau ada komponen proporsional). Alasan: bobot negatif ga punya arti di alokasi proporsional dan `allocateByWeights` juga menolaknya. Ditunda sampai ada layar yang beneran memunculkan kombinasi Selisih-ekstrem-lalu-biaya-proporsional — belum jelas perilaku yang benar (proporsional terhadap nilai absolut? terhadap bagian sebelum penyesuaian?) tanpa kasus nyata di tangan.
- F1-06: `scalePercentToBasisPoints` di `charges/charge-amount.ts` sekarang implementasi ketiga dari pola pad-concatenate-BigInt yang sama (setelah `allocate-by-weights.ts` dan `split-by-percentage.ts`), masuk paket dedup F1-10 bareng dua yang sudah tercatat di F1-01 dan F1-03.
- F1-06: `allocate-extra-charges.ts` dipecah jadi tiga file di `charges/` (`allocate-extra-charges.ts` orkestrator, `charge-amount.ts` perhitungan nominal per komponen termasuk pembulatan, `charge-allocation.ts` penyebaran ke peserta per mode) karena satu file gabungan bakal jauh lewat 250 baris dengan sembilan kategori validasi plus empat mode alokasi. Sesuai opsi yang sudah disepakati di instruksi tugas.
- F1-07: bacaan alternatif traktir item yang ikut memindahkan bagian biaya tambahan proporsional yang menempel di item itu (bukan cuma nominal itemnya) ditunda sampai ada layar yang menuntutnya. Alasan lengkap di K-40 — belum ada kasus nyata yang mastiin bacaan mana yang benar, dan dua-duanya sama masuk akal secara spec.
- F1-07: `apply-treats.ts` dipecah jadi tiga file di `treats/` (`apply-treats.ts` orkestrator, `treat-validation.ts` seluruh validasi, `treat-transfer.ts` pemrosesan traktir dan mutasi bagian) karena gabungan tiga file itu 310 baris kalau digabung satu — jauh lewat 250. Sesuai opsi yang sudah disepakati di instruksi tugas, preseden sama F1-06.
- F1-08: konversi mata uang nol ditangani di lapisan saldo (`packages/split-engine/balance/`), meski `spec.md` 11.1 menyebut "mata uang dasar grup". Seluruh fungsi di modul ini bekerja dalam satu mata uang, pemanggil yang bertanggung jawab mengonversi sebelum masuk. Nol parameter `currency` ditambahkan karena belum ada pemakainya — nyusul kalau ada layar multi mata uang yang beneran butuh.
- F1-08: `compute-balances.ts` (158 baris) nol perlu dipecah, di bawah anggaran 250 walaupun ada dua pintu publik dan delapan kategori validasi — lebih sederhana dari F1-06/F1-07 karena nol pembulatan dan nol BigInt di jalur ini, cuma pengurangan integer.
- F1-09: "penanganan sisa pembulatan" yang disebut spec.md 11.2 buat mode Simplify sebenarnya sudah diselesaikan lebih hulu — di pembagian bagian (F1-01 sampai F1-07) dan di alokasi pairwise lewat `allocateByWeights` (di dalam `compute-settlement.ts`). Greedy simplify sendiri nol pembulatan sama sekali, cuma `Math.min` dua integer tiap langkah, karena semua input yang masuk ke situ sudah bulat. Dicatat biar orang berikutnya nggak nyari kode pembulatan yang nggak ada di sana.
- F1-09: pelunasan sebagian dan penuh (spec.md 11.3) belum ditangani di lapisan manapun di split engine — `computeSettlement` cuma menghasilkan daftar transfer yang disarankan, bukan mencatat transfer mana yang sudah benar-benar dieksekusi/dilunasi. Itu state tersendiri (kemungkinan di F2 storage atau F3 layar), di luar cakupan F1.
- F1-09: `compute-settlement.ts` (193 baris) tetap satu file — sempat dipecah jadi `pairwise-transfers.ts` dan `simplify-transfers.ts` mengikuti pola F1-06/F1-07, lalu digabung balik pas ketauan gabungannya cuma 199 baris, jauh di bawah 250. Syarat pemecahan di instruksi tugas eksplisit "kalau mepet 250 baris", bukan preferensi umum — dicatat di sini biar jelas kenapa modul ini beda dari precedent F1-06/F1-07.
- F1-10: tiga utang berikut sekarang LUNAS, catatan lamanya di bawah ini sengaja TIDAK dihapus (jejak keputusan): (1) dedup helper skala desimal — utang F1-01 "tabel presisi mata uang ada dua tempat" dan F1-03 "scalePercentToBasisPoints implementasi kedua" dan F1-06 "implementasi ketiga" semuanya sekarang satu `packages/split-engine/shared/decimal-scale.ts`. (2) dedup tabel presisi mata uang — `src/lib/i18n/format-money.ts`'s `getCurrencyDecimals` sekarang cuma re-export dari `getCurrencyDecimalDigits` fasad, `money/money.ts` satu-satunya tempat tabelnya ditulis. (3) `packages/split-engine` jadi dependency root — ditunda sejak F1-01 karena belum ada konsumen, sekarang ada (`format-money.ts`) lewat `"@bagibill/split-engine": "workspace:*"`.
- F1-10: bundle size nol berubah meski root sekarang punya dependency baru ke split engine (64,55 KB brotli sebelum dan sesudah, sama persis) — tree-shaking Rollup motong seluruh fasad ke cuma logic `getCurrencyDecimalDigits` yang benar-benar dipakai `format-money.ts`, sisa fasad (mode split, charges, treats, balance, settlement, orkestrator) belum ada consumer di `src/` jadi ke-drop total dari bundle. Chunk `i18n-*.js` bahkan keluar dengan hash identik ke build sebelumnya.
- F2-01: pemetaan `memberId` ke indeks peserta (dan sebaliknya) belum jadi fungsi sungguhan di manapun, masih inline di `schema.test.ts` buat buktiin `ExpenseItemRecord` dan `ExpenseItem` engine satu sumber. Tempatnya nanti di repository F2-03 — bakal butuh urutan member yang konsisten (kemungkinan urutan `joinedAt` per grup) supaya indeks yang sama selalu merujuk orang yang sama across pemanggilan.
- F2-01: `ExpenseRecord.splitData` sengaja ditinggal `unknown`, `splitMode` dipakai dari `SplitInput["mode"]` milik engine tapi bentuk data per mode (array `amountsMinor` per posisi butuh urutan member yang sama kayak soal di atas) belum dirancang. Nyusul bareng F2-03 pas mapping member↔indeks buat mode-mode lain (bukan cuma `byItems`) beneran dibutuhkan.
- F2-02: `deleteMember` di `member-repository.ts` mengecek kemunculan member langsung ke tabel `expenses` dan `settlements` lewat instance database yang diinjeksi, karena repository pengeluaran (F2-03) belum ada. Karena `ExpenseRecord.splitData` masih `unknown` (lihat catatan F2-01 di atas), pengecekan splitData-nya bukan cek field per mode, tapi pemindaian generik (`splitDataReferencesMember`) yang menelusuri objek/array apapun bentuknya mencari memberId sebagai string di manapun bersarang. Ini fallback yang aman selama id-nya acak dan opaque, tapi kasar dibanding cek bertipe. Begitu F2-03 punya bentuk splitData per mode dan tempatnya sendiri buat query pengeluaran, pindahkan pengecekan transaksi ini ke sana dan ganti pemindaian generik dengan cek field yang presisi.
- F2-02: pemetaan `memberId`↔indeks peserta yang sudah dicatat sejak F2-01 (baris di atas) masih menunggu F2-03, tidak tersentuh di sini.
- F2-02: pemetaan kategori default per template di `templates.ts` (`GROUP_TEMPLATES`) adalah tebakan penulis tugas ini, bukan dari spec.md — spec.md 12.3 cuma mendaftar delapan kategori globalnya, tanpa pemetaan per template (Trip, Roommate, Pasangan/`couple`, Acara sekali jalan/`one_off_event`, Kosong/`blank`). Begitu juga `simplifyDebtsDefault` (semua diset `true`) dan `recurringEnabled` (cuma `roommate` yang `true`, sisanya `false`) — dua-duanya bukan dari spec, cuma dugaan yang masuk akal. Perlu dikoreksi begitu ada rujukan desain (mockup `Buat_Grup___Kelola_Member.html` state pemilihan template, atau keputusan eksplisit) yang bilang beda.
