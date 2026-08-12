# CLAUDE.md

Panduan kerja untuk agent di repo BagiBill. Baca ini sebelum menyentuh kode apapun.

## Produk

BagiBill adalah PWA split bill tanpa login. Dipakai di browser, bisa di-install, jalan offline. Dua bahasa (Indonesia dan Inggris), seluruh mata uang ISO 4217. Akses dibuka lewat key Gumroad berlaku 1 tahun sejak diaktifkan. Yang bikin grup bayar, yang diundang gratis selamanya.

Target eksperiensial yang jadi tolok ukur setiap keputusan: tambah satu pengeluaran yang dibagi rata selesai dalam 3 tap dan 1 ketikan. Bagi struk 14 item untuk 8 orang selesai di bawah 2 menit tanpa satupun dari mereka install apapun.

## Dokumen di repo ini

- `spec.md`: sumber kebenaran fitur. Kalau kode beda dari sini, kode yang salah, kecuali ada catatan di bagian Keputusan.
- `plan.md`: urutan tugas sampai layar gelombang 1 jalan. Satu tugas satu PR.
- `progress.md`: status pengerjaan, keputusan, blocker, hal yang ditunda.
- `packages/tokens/`: token visual, generated dari Claude Design. Nol edit tangan.
- `docs/mockups/`: mockup HTML standalone, acuan tata letak dan hierarki visual. Sebelas file, seluruh layar gelombang 1 sudah ada. Status dan catatan desainnya di `docs/mockups/README.md`.
- `docs/mockup-inventory.md`: hasil bongkaran mockup jadi daftar komponen, keadaan, dan nilai visual yang belum punya token. Dipakai sebagai input F0-03 dan F0-05, bukan dokumen yang dirawat terus.
- `.claude/skills/bagibill-qa/SKILL.md`: prosedur QA. Jalankan sebelum bilang sesuatu selesai.

Urutan baca sebelum mulai kerja: `progress.md` untuk tahu posisi sekarang, lalu tugasnya di `plan.md`, lalu bagian `spec.md` yang relevan, lalu mockup layar yang disentuh kalau ada. Jangan baca seluruh spec kalau cuma mau benerin satu tombol.

## Tumpukan dan perintah

Sudah diputuskan, tidak usah ditawar ulang kecuali anggaran bundle terlampaui.

- React 19 + TypeScript strict + Vite. Kalau anggaran bundle terlampaui di PR manapun, tukar ke Preact lewat alias Vite, bukan dengan menurunkan target.
- Styling: CSS Modules plus custom property dari `packages/tokens`. Tidak ada Tailwind. Jangan dua sistem styling sekaligus.
- Data lokal: Dexie di atas IndexedDB. State di memori pakai store ringan, jangan tarik Redux.
- Test: Vitest plus Testing Library. File test sejajar dengan file yang diuji.
- i18n ditulis sendiri, tipis, di atas `Intl.PluralRules` dan `Intl.NumberFormat`. Jangan tarik i18next demi anggaran bundle.
- Router ditulis sendiri, tipis, di `src/routes/router.tsx` (K-21). Jangan tarik react-router/wouter demi anggaran bundle, kecuali kebutuhan nested layout, data loader, atau route guard beneran muncul — itu syarat cabut keputusannya.
- Package manager pnpm.
- Script build-time (`scripts/*.ts`) jalan langsung lewat `node scripts/nama.ts`, bukan lewat `tsx`/`ts-node`. Node di environment ini sudah bisa eksekusi `.ts` tanpa flag tambahan.

Perintah yang wajib hijau sebelum sesuatu disebut selesai:

```
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm size
```

## Infra

- Statis di Cloudflare Pages. Domain `bagibill.pika-xu.com`, DNS sudah di Cloudflare.
- Backend menyusul di PR 7: Cloudflare Workers dengan router Hono, Neon Postgres region `ap-southeast-1` lewat driver serverless di atas HTTP, query lewat Drizzle. Realtime nanti lewat Durable Object, bukan lewat Postgres. Konsekuensinya tidak ada koneksi yang dipegang lama, jadi jangan menulis transaksi panjang atau `LISTEN`/`NOTIFY`.
- Secret cuma di environment variable server. Nama env prefix `BAGIBILL_`. Yang boleh terbaca client wajib prefix `VITE_PUBLIC_` dan isinya tidak pernah rahasia.
- `.env.example` selalu ikut ter-update di PR yang menambah env baru.

## Aturan keras

Ini yang kalau dilanggar langsung ditolak, tanpa diskusi.

- Tidak ada float di jalur uang. Semua nominal integer minor unit. IDR sebagai integer polos, USD sebagai sen.
- Jumlah bagian semua orang selalu sama persis dengan total tagihan. Sama persis, bukan mendekati.
- Jumlah seluruh saldo bersih dalam satu grup selalu nol.
- Tidak ada penyebutan harga, key, atau tombol beli di sepanjang alur bergabung dan alur klaim.
- Kunci API tidak pernah menyentuh client. OCR dan kurs dipanggil dari backend.
- Slug grup tidak pernah masuk ke log, analytics, atau pesan error.
- App tidak pernah mati karena masalah jaringan atau urusan lisensi. Kedaluwarsa berarti berhenti membuat, bukan berhenti mengakses.
- Orang yang ditraktir tetap muncul di rincian dengan nominal nol. Menghilangkannya dari daftar adalah bug transparansi, bukan penyederhanaan tampilan.
- Perubahan di split engine, settlement, atau modul kurs wajib disertai test baru dalam PR yang sama.
- Data pengguna tidak pernah disandera. Export selalu jalan, dalam kondisi apapun.

## Prinsip kode

Kode di repo ini dibaca manusia dan akan dibongkar lagi. Optimasi utamanya keterbacaan dan kemudahan diubah, bukan keringkasan.

- KISS dan pragmatis. Jangan bikin abstraksi untuk sesuatu yang baru punya satu pemakai.
- Struktur berbasis fitur, bukan berbasis tipe file. `features/expense/` bukan `components/` yang isinya semua.
- Logika waktu lewat injeksi Clock, jangan panggil `Date.now()` langsung di dalam logika. Tanggal boundary, ganti bulan, dan timezone adalah sumber bug yang sudah terbukti.
- Error handling wajib. Tidak ada catch kosong, tidak ada error yang ditelan diam-diam. Pesan error menyebutkan konteks yang cukup untuk melacak, bukan cuma "gagal".
- Tidak ada magic number. Angka yang punya arti diberi nama.
- Tidak ada ternary bersarang. Nesting maksimum 3 level, selebihnya pakai early return.
- Nama variabel uang selalu menyebut satuannya. `amountMinor`, bukan `amount`.
- Fungsi yang menghitung uang harus murni dan bisa diuji tanpa DOM, tanpa jaringan, tanpa jam.
- Identifier dan komentar di kode berbahasa Inggris. Teks yang dilihat pengguna tidak pernah ditulis di komponen, semuanya lewat file string.

### Batas ukuran

Batas ini indikator, bukan aturan keras. Kelewat sedikit boleh, kelewat jauh berarti ada tanggung jawab yang salah tempat.

- Komponen di bawah 150 baris. Modul logika di bawah 250 baris.
- Fungsi di bawah 40 baris dan satu level abstraksi.
- Parameter lebih dari 3 diganti satu objek bernama.
- Satu file punya satu alasan untuk berubah. Kalau sebuah file disentuh oleh dua jenis tugas yang tidak berhubungan, pecah.

### Yang tidak boleh ada

- Dead code, kode yang dikomentari, export yang tidak dipakai, cabang yang tidak pernah tercapai.
- Flag atau opsi konfigurasi yang belum ada pemakainya.
- `any`, `as unknown as`, dan tanda seru non-null. Kalau tipenya susah, benerin tipenya.
- Komentar yang mengulang isi kode. Komentar menjelaskan kenapa. Setiap rumus uang wajib punya satu baris kenapa.
- Utilitas serba bisa bernama `helpers.ts` atau `utils.ts` tanpa cakupan jelas.

## Layer

- Split engine dan settlement adalah modul murni tanpa dependensi apapun. Semua fitur memanggilnya lewat satu pintu, jangan pernah memanggil fungsi internalnya langsung dari komponen.
- Perhitungan tidak boleh terjadi di komponen. Komponen menampilkan hasil.
- Dua layar yang menampilkan angka sama wajib merender dari struktur yang sama.
- Adapter untuk hal yang bisa berganti: OCR, penyedia kurs, storage, analytics. Ganti provider harus cuma menyentuh satu file.
- IndexedDB adalah sumber kebenaran di device. Server adalah tempat sinkronisasi, bukan tempat bertanya.

## Visual

- Semua nilai visual dari `packages/tokens`. Nol hex literal, nol spacing hardcoded di komponen.
- Mockup adalah acuan tata letak dan hierarki. Untuk nilai visual, `packages/tokens` yang dipakai komponen, tapi isinya digenerate dari mockup. Jadi kalau mockup memakai nama atau nilai yang belum ada, tokennya yang menyusul, bukan mockupnya yang disesuaikan.
- Yang tetap tidak boleh: menulis nilai mentah di komponen, dan menyalin blok `:root` lokal milik satu mockup ke komponen. Tambahkan tokennya lalu regenerate.
- Tidak ada tata letak desktop. Satu kolom, `max-width` 480px, ditengahkan, latar di luar kolom satu tingkat lebih gelap. Ini keputusan, bukan penundaan. Yang boleh melebar nanti cuma halaman publik dan `/j/`.
- Warna kategori tidak boleh muncul di layar yang menampilkan orang. Di daftar transaksi, saldo, dan klaim, ikon kategori monokrom dan yang membedakan adalah bentuknya. Token `--cat-*` cuma boleh dipakai di Ringkasan, filter, dan bagan.
- Palet member 12 warna, diberikan berurutan `--m-1` sampai `--m-12`, ditetapkan sekali dan tidak pernah berubah. Orang ke-13 mengulang dari `--m-1` dengan cincin luar putus-putus. Jangan menambah rona baru.
- Satu warna per orang, konsisten di list, chip, avatar, dan hasil share.
- Inisial avatar diambil dari kata, bukan huruf. "Dimas Prasetyo" jadi DP. Tabrakan huruf awal diselesaikan dengan warna berbeda plus nama ikut ditampilkan, bukan dengan memanjangkan inisial.
- Di layar klaim dan settle, nama wajib mendampingi avatar. Avatar telanjang hanya boleh di tumpukan avatar header.
- Warna piutang dan utang tidak boleh cuma mengandalkan merah versus hijau. Harus tetap terbaca untuk buta warna dan di bawah matahari.
- Angka uang selalu tabular figures supaya kolom lurus.
- Satu keluarga ikon, stroke seragam. Ikon campuran adalah temuan QA, bukan selera.

## Aksesibilitas

- Target sentuh minimum 44px, termasuk tombol plus minus di kontrol bobot.
- Setiap kontrol punya label yang terbaca screen reader. Nominal dibacakan lengkap dengan mata uangnya.
- Warna tidak pernah jadi satu-satunya pembawa informasi. Status klaim punya ikon dan teks.
- Fokus keyboard terlihat dan urutannya logis.
- `prefers-reduced-motion` dan `prefers-color-scheme` dihormati.
- Font sistem sampai 200% tanpa layout rusak.

## Test

Setiap fungsi uang diuji dengan tiga kelas kasus: normal, batas, dan yang seharusnya ditolak.

Batas yang wajib ada:

- Nol peserta, satu peserta, semua bobot nol
- Pembagi nol, total nol, nominal negatif
- Mata uang tanpa desimal dan tiga desimal
- Sisa pembulatan yang tidak habis dibagi
- Bobot pecahan pada item dengan qty lebih dari satu
- Kombinasi traktir plus multi pembayar plus biaya tambahan dalam satu pengeluaran

Invarian yang diuji sebagai test, bukan diasumsikan: jumlah bagian sama dengan total, saldo grup nol, dan pembulatan per item yang dijumlah sama dengan pembulatan di level total.

File test sejajar dengan file yang diuji. Test menguji perilaku lewat pintu publik modul, bukan fungsi internalnya, supaya refactor tidak memecahkan test yang seharusnya tidak peduli.

## i18n

- Tidak ada teks yang ditulis langsung di komponen. Semua lewat file string dengan kunci bermakna.
- Setiap kunci ada di id dan en. Kurang satu berarti build gagal.
- Tanggal, angka, dan mata uang lewat Intl.
- Pluralisasi pakai aturan per bahasa, bukan menambah "(s)".
- Nada bahasa Indonesia santai tapi tidak alay, tanpa lo dan gue, tanpa tanda seru. Inggris sepadan, bukan lebih ramah: kalimat pendek, kata kerja di depan, tanpa "Oops", tanpa "Let's", tanpa emoji, tanpa "we" untuk app. Tabel padanan ada di `spec.md` bagian 22.
- Mode kelima bernama **Selisih** di UI, `adjustment` di kode, kunci `expense.mode.adjustment`. Kata "Penyesuaian" tidak dipakai lagi.
- Cek panjang teks di layar 360px untuk dua bahasa. Indonesia biasanya lebih panjang, dan tombol yang pecah cuma di satu bahasa sering kelewat.

## Performa

Anggaran, bukan aspirasi. Kalau terlampaui, fitur ditunda sampai ada cara lain.

- Bundle awal di bawah 120 KB brotli
- LCP di bawah 1,5 detik di 4G lambat
- INP di bawah 200 milidetik
- Halaman `/j/` dan `/c/` terbuka di bawah 1 detik dengan bundle terpisah yang tidak memuat seluruh app

Anggaran dijaga otomatis lewat `pnpm size` di CI, bukan lewat ingatan. Setiap PR yang menambah dependensi wajib menyebutkan dampaknya ke ukuran bundle.

## Git

- Satu concern per PR. Formula, styling, dan copy tidak dicampur.
- Commit type: feat, fix, refactor, chore, test, docs, perf, ci, build, style.
- Setiap penyimpangan dari `spec.md` dicatat di bagian Keputusan di `progress.md` dalam PR yang sama.
- Perubahan schema IndexedDB wajib migrasi plus uji data versi lama.
- Centang di `progress.md` cuma setelah diuji di device sungguhan, bukan setelah kodenya ditulis.

## Update dokumen di akhir tugas

Ini bagian dari tugas, bukan pekerjaan tambahan. Tugas belum selesai kalau dokumennya belum ikut. Semuanya masuk PR yang sama dengan kodenya, jangan ditumpuk jadi PR docs terpisah.

Setiap kali selesai satu tugas `plan.md`, lewati enam pertanyaan ini berurutan:

1. **Tugasnya jalan di device?** Centang barisnya di papan Gelombang 1 di `progress.md`. Kalau cuma kodenya yang ditulis dan belum dites di device, jangan dicentang. Perbarui juga baris Fase aktif dan tanggal di header.
2. **Ada fitur yang jadi utuh dari sisi pengguna?** Centang barisnya di daftar Fase 1 di `progress.md`. Satu tugas sering cuma menyentuh sebagian baris, jadi jangan mencentang yang belum utuh.
3. **Ada yang berbeda dari `spec.md`?** Tambahkan entri baru di bagian Keputusan di `progress.md` dengan kode K berikutnya, tanggal, keputusannya, dan alasannya. Kalau perbedaannya menang atas spec, ubah juga bagian `spec.md` yang bersangkutan di PR yang sama. Spec yang dibiarkan salah lebih berbahaya daripada spec yang belum ditulis.
4. **Ada yang mandek atau ternyata butuh keputusan?** Kalau memblokir, masuk Blocker di `progress.md`. Kalau tidak memblokir tapi harus diputuskan nanti, jadi entri K bertanda TERBUKA. Kalau cuma ide bagus, masuk Catatan lepas, jangan langsung dikerjakan.
5. **Ada nilai visual baru?** Tambahkan tokennya di `packages/tokens` lalu regenerate, dan catat di `docs/mockup-inventory.md` bagian 2. Jangan menulis nilai mentah di komponen.
6. **Ada mockup yang bertambah, berubah, atau ternyata sudah tidak dipakai?** Perbarui tabel dan daftar keadaan di `docs/mockups/README.md`.

Tiga yang lebih jarang, tapi kalau kena wajib:

- **Aturan baru yang berlaku untuk semua tugas berikutnya** masuk `CLAUDE.md` sebagai satu baris, alasannya di Keputusan di `progress.md`. Kalau baris di sini mulai berisi penjelasan panjang, penjelasannya salah tempat.
- **Cara baru untuk salah menghitung uang atau merusak layar** masuk `.claude/skills/bagibill-qa/SKILL.md` sebagai butir yang bisa dicek. Setiap bug yang lolos sekali harusnya meninggalkan satu baris di sana supaya tidak lolos dua kali.
- **Tugas yang ternyata perlu dipecah, digabung, atau urutannya ditukar** diperbaiki di `plan.md`, bukan dikerjakan diam-diam dengan urutan berbeda.

Yang tidak perlu diperbarui: `docs/mockup-inventory.md` untuk hal di luar token, karena dia arsip sekali pakai, dan mockup HTML itu sendiri, yang tidak pernah diedit tangan.

Di laporan akhir sesi, sebutkan file dokumen apa saja yang ikut berubah. Kalau tidak ada satupun, katakan begitu, jangan diam.

## Cara kerja dengan agent

- Satu tugas dari `plan.md` per sesi. Jangan menggabung dua tugas biar kelihatan cepat.
- Kalau tugasnya ambigu, tanya satu pertanyaan singkat. Jangan menebak lalu menulis 300 baris.
- Jangan menambah fitur yang tidak diminta. Kalau kepikiran sesuatu yang bagus, tulis di Catatan lepas di `progress.md`, jangan langsung dikerjakan.
- Jangan menyentuh file di luar cakupan tugas.
- Kalau instruksi bertabrakan dengan aturan keras, charter di bawah, atau daftar di luar lingkup: berhenti dan bilang, jangan diselaraskan sendiri.
- Sebelum bilang selesai: jalankan lima perintah di bagian Tumpukan, lewati checklist yang relevan di skill QA, lalu lewati enam pertanyaan di bagian Update dokumen di akhir tugas.
- Laporkan yang gagal apa adanya. Jangan bilang beres kalau ada test yang di-skip.
- Bahasa laporan Indonesia casual, padat, tanpa basa-basi.

## Janji ke pengguna

Perubahan yang melanggar salah satu poin ini ditolak dan dijelaskan.

- Yang diundang ke grup gratis selamanya. Cukup satu orang punya key.
- Nol iklan, nol limit harian, nol tembok tunggu.
- Yang boleh dibatasi hanya yang biayanya per pemakaian, yaitu kuota scan struk. Angkanya dibuka.
- Key habis bukan berarti data disandera. Baca, saldo, tandai lunas, dan export tetap jalan.
- Uang pengguna tidak pernah lewat kita.
- Jangan pernah mengklaim hasil scan sempurna. Selalu tampilkan untuk dikoreksi.
- Nol dark pattern, nol urgensi palsu, nol ajakan beli di tengah pekerjaan orang.

## Yang di luar lingkup

Ditulis eksplisit supaya tidak masuk diam-diam.

- Pemrosesan pembayaran atau integrasi dompet, termasuk deep link
- Akun, login, sinkronisasi berbasis identitas
- Feed sosial, reaksi, follow, gamifikasi, streak, badge
- Budgeting personal dan pelacakan pemasukan
- Integrasi bank atau impor mutasi
- Kripto
- Aplikasi native terpisah, widget, watch app
- SDK analytics pihak ketiga
- Lisensi seumur hidup

## Yang belum diputuskan

Kalau tugas menyentuh salah satu ini, berhenti dan tanya.

- Bentuk protokol sync dan resolusi konflik per field. Runtime dan database sudah diputuskan, protokolnya belum.
- Storage foto struk, penyedia OCR, dan angka kuota harian. Menunggu scan struk dijadwalkan.
- Preset biaya untuk locale di luar Indonesia, Amerika Serikat, dan Eropa.

Mode Claim sudah diputuskan ikut gelombang 1 dalam versi satu device tanpa realtime. Yang tetap fase 2: realtime, presence, link `/c/` yang hidup, dan kedaluwarsa 72 jam.

## Merawat file ini

File ini dibaca tiap sesi, jadi harus pendek dan benar. Keputusan baru cukup satu baris di sini, alasannya di bagian Keputusan di `progress.md`. Kalau file ini mulai berisi penjelasan panjang, penjelasannya salah tempat.
