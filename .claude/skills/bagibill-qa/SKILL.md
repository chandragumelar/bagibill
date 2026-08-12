---
name: bagibill-qa
description: QA agent untuk BagiBill (split bill PWA, no-login, lisensi Gumroad). Pakai skill ini setiap kali diminta QA, review PR, audit konsistensi angka, verifikasi formula split/settlement, cek copy dan i18n, audit keamanan link, audit pemakaian design token, atau regression check sebelum merge. Juga trigger saat ada perubahan di file split engine, settlement, kurs, lisensi, sync, manifest PWA, atau packages/tokens.
---

# BagiBill QA

Lo QA engineer untuk BagiBill. Produk ini punya dua hal yang kalau rusak langsung fatal: angka pembagian uang, dan link undangan. Salah angka bikin orang berantem sama temennya. Link bocor bikin orang asing bisa ngedit grup. Sisanya penting tapi ga fatal.

Urutan prioritas: angka, akses dan link, sync, alur bergabung, performa, copy, visual.

Bahasa laporan: Indonesia casual, padat, tanpa basa-basi. Setiap temuan wajib punya file:line dan bukti dari repo aktual. Kalau ga yakin sesuatu bug atau desain sengaja, tandai sebagai pertanyaan, jangan vonis.

Sumber kebenaran fitur: `spec.md`. Aturan kerja dan aturan keras: `CLAUDE.md`. Kalau implementasi beda dari salah satunya, itu temuan, kecuali ada catatan di bagian Keputusan di `progress.md`.

Kalau temuan menyentuh hal yang belum diputuskan (tata letak desktop/tablet, layar gelombang 2, runtime backend, penyedia Postgres, bentuk protokol sync, status fase mode Claim): jangan divonis bug. Tulis di PERTANYAAN.

## 0. Setup wajib

```bash
git fetch origin && git status
pnpm install --frozen-lockfile
```

Selalu QA terhadap state repo yang fresh. Jangan menilai dari ingatan, baca file aktual dengan line number.

Urutan baca sebelum mulai: `progress.md` (posisi sekarang dan Keputusan yang berlaku), lalu tugas terkait di `plan.md`, lalu bagian `spec.md` yang relevan, lalu `docs/mockups/` untuk layar yang disentuh. Jangan baca seluruh spec buat nge-review satu tombol.

## 1. Gate otomatis

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm size
```

Kelimanya wajib hijau. Build atau typecheck gagal berarti stop, jangan QA manual di atas fondasi rusak. `pnpm size` merah artinya anggaran bundle terlampaui, dan itu blocker, bukan catatan kecil.

Test yang di-skip dihitung sebagai gagal. Laporkan apa adanya.

## 2. QA Angka (prioritas tertinggi)

### 2.1 Invarian yang ga boleh dilanggar

Cek ini untuk setiap perubahan di split engine, berapapun kecilnya.

- Konservasi: jumlah bagian semua orang selalu sama persis dengan total tagihan. Bukan mendekati, sama persis dalam minor unit. Ini invarian nomor satu.
- Konservasi pembayar: jumlah yang dibayar semua pembayar sama dengan total tagihan.
- Konservasi saldo: jumlah seluruh saldo bersih member dalam satu grup selalu nol.
- Settlement: total transfer yang disarankan sama dengan total utang, dan setiap orang berakhir di nol.
- Tidak ada float di jalur uang. Semua integer minor unit. IDR integer polos, USD sen.

Invarian di atas harus ada sebagai test, bukan diasumsikan dari membaca kode. Kalau PR nyentuh split engine, settlement, atau modul kurs tanpa test baru di PR yang sama, itu blocker tanpa diskusi.

Gate:

```bash
grep -rnE "parseFloat|Number\(.*amount|\* 1\.1|/ 100\b" src/ --include=*.ts | grep -v test
grep -rn "toFixed" src/ --include=*.ts | grep -v format
grep -rnE "\bamount\b|\btotal\b|\bprice\b" src/ --include=*.ts | grep -vE "Minor|test"
```

`toFixed` di luar layer formatting adalah bug, bukan gaya penulisan. Variabel uang tanpa satuan di namanya (`amount`, bukan `amountMinor`) adalah temuan, karena di sinilah minor unit dan major unit ketuker diam-diam.

### 2.2 Pembulatan

Aturan: sisa dalam minor unit dibagikan satu per satu ke member, urut dari pecahan terbesar (largest remainder).

Kasus uji yang wajib ada di test suite:

- 100 dibagi 3 orang di mata uang tanpa desimal. Hasil harus 34, 33, 33. Bukan 33.33 tiga kali, bukan 34, 34, 33 tanpa aturan urutan.
- 10 dibagi 3 dengan bobot 1, 1, 1 di IDR.
- 0,01 dibagi 3 di USD. Satu orang dapat 1 sen, dua orang nol.
- Total ganjil dengan 7 orang.
- Persentase 33,33 tiga kali yang totalnya 99,99.
- Bobot pecahan 0,5 + 0,5 + 1 pada item qty 2.
- Nol peserta, satu peserta, semua bobot nol, pembagi nol, total nol, nominal negatif.

Cek juga: pembulatan per item lalu dijumlah harus sama dengan pembulatan di level total. Kalau beda satu unit, itu bug.

### 2.3 Mode split

Untuk setiap mode, uji tiga kelas kasus: normal, batas, dan yang seharusnya ditolak.

- Rata: nol peserta harus ditolak. Satu peserta dapat semuanya.
- Nominal: total kurang dari tagihan menyisakan sisa yang terlihat. Total lebih dari tagihan memberi peringatan tapi tetap bisa disimpan.
- Persentase: harus 100. Selisih di bawah 0,01 dibulatkan diam-diam. Selisih lebih besar ditolak.
- Porsi: semua bobot nol harus ditolak. Bobot nol untuk sebagian orang berarti dia ikut tercatat tapi bayar nol. Bobot pecahan harus jalan.
- Penyesuaian: penyesuaian negatif jalan. Penyesuaian yang bikin bagian seseorang jadi negatif harus diperingatkan.
- Per Item: total bobot klaim beda dari qty tetap dibagi proporsional dengan catatan, bukan error. Item tanpa klaim memblokir finalisasi.

### 2.4 Biaya tambahan dan traktir

- Proporsional: alokasi pajak mengikuti porsi masing-masing atas subtotal, dan totalnya tetap sama dengan nilai pajak.
- Rata: pembulatan sisa tetap berlaku.
- Ditanggung satu orang: komponen itu benar-benar keluar dari perhitungan orang lain, bukan cuma disembunyikan di tampilan.
- Traktir orang: yang ditraktir tetap muncul di rincian dengan nominal nol. Kalau dia hilang dari daftar, itu bug transparansi, dan ini termasuk blocker karena bikin orang mikir dia ga dihitung.
- Traktir sebagian: sisa bagian orang itu tetap benar.
- Kombinasi: traktir item plus traktir komponen plus multi pembayar plus biaya tambahan dalam satu pengeluaran. Kombinasi ini yang paling sering bocor, jadi wajib ada test-nya.

### 2.5 Mata uang

- Presisi per mata uang: IDR, JPY, KRW, VND nol desimal. KWD, BHD, OMR tiga desimal. Sisanya dua.
- Kurs dikunci saat pengeluaran dibuat. Uji: ubah kurs di server, buka lagi pengeluaran lama, angkanya harus persis sama.
- Override manual kurs bertahan setelah sync.
- Format angka mengikuti locale tampilan, bukan mata uang. Pemisah ribuan dan desimal ga boleh ketuker.
- Grup dengan tiga mata uang berbeda: saldo tetap benar dalam mata uang dasar.

### 2.6 Konsistensi antar permukaan

Angka yang sama harus sama di semua tempat, dan dua layar yang menampilkan angka sama wajib merender dari struktur yang sama. Kalau dua layar menghitung sendiri-sendiri dari sumber berbeda, itu temuan walaupun hasilnya kebetulan cocok hari ini.

- Bagian seseorang di layar pengeluaran sama dengan yang muncul di layar saldo.
- Total grup di tab Transaksi sama dengan di tab Ringkasan sama dengan di export CSV sama dengan di PDF.
- Nominal di layar klaim member sama dengan yang dilihat pembuat.
- Kalau QA visual, jumlahkan manual dari DOM dan cocokkan.

### 2.7 Arsitektur jalur uang

- Split engine dan settlement adalah modul murni tanpa dependensi. Gate: cek import di modul itu, tidak boleh ada React, Dexie, jaringan, atau jam.
- Tidak ada perhitungan di komponen. Komponen menampilkan hasil. Aritmatika uang di dalam file `.tsx` adalah temuan.
- Semua pemanggilan lewat satu pintu publik modul. Komponen yang manggil fungsi internal split engine langsung adalah temuan.
- Logika waktu lewat injeksi Clock. Gate: `grep -rn "Date.now()\|new Date()" src/ --include=*.ts | grep -v test | grep -v adapters/`. Tanggal boundary, ganti bulan, dan timezone sudah kebukti jadi sumber bug.
- Adapter untuk OCR, penyedia kurs, storage, dan analytics. Ganti provider harus cuma nyentuh satu file. Kalau nama provider muncul di lebih dari satu file, itu temuan.

## 3. QA Akses dan Link

### 3.1 Lisensi

- Masa aktif dihitung sejak aktivasi, bukan sejak pembelian. Uji dengan key yang tanggal belinya jauh di belakang.
- Key belum aktif tidak punya tanggal kedaluwarsa.
- Tidak ada pengecekan lisensi terjadwal. Gate: tidak boleh ada timer atau interval yang manggil endpoint lisensi.
- Offline setahun penuh tetap jalan sampai tanggal kedaluwarsa.
- Refund menurunkan ke mode Free, bukan mematikan. Data tetap utuh dan tetap bisa diekspor.
- Kedaluwarsa berarti berhenti membuat, bukan berhenti mengakses. Setelah grace period, uji satu per satu apa yang harus tetap jalan: baca grup, lihat saldo, tandai lunas, export CSV dan PDF, Quick Split.
- Batas 3 device benar-benar ditegakkan di server, bukan cuma di client.

### 3.2 Kuota

- Free: 3 scan per hari, reset tengah malam waktu device. Uji dengan mengubah jam device.
- Kuota dicatat per device token di server. Hapus localStorage tidak mereset kuota.
- Batas 1 grup Free hanya berlaku untuk grup yang dibuat sendiri. Bergabung ke lima grup orang lain tidak memakan kuota itu. Ini sering salah diimplementasi, cek eksplisit.
- Kuota scan tidak menular lewat grup. Member Free di grup pemegang lisensi tetap dapat 3.
- Angka kuota dibuka ke pengguna, bukan disembunyikan sampai mentok.

### 3.3 Link

- Slug dari CSPRNG, 128 bit. Gate: `grep -rn "Math.random" src/` harus nol di jalur pembuatan slug.
- Slug tidak pernah muncul di log, analytics, atau pesan error. Cek payload analytics aktual di network tab.
- Header: `noindex` dan `Referrer-Policy: no-referrer` pada semua rute bergrup.
- Tutup pendaftaran: device baru yang buka link cuma dapat hanya baca. Device lama tidak terpengaruh sama sekali.
- Ganti link: link lama mati seketika. Device yang sudah bergabung tidak perlu diundang ulang. Uji dua-duanya.
- Link hanya baca memakai slug berbeda dari link edit. Slug baca tidak boleh bisa diturunkan dari slug edit.
- Link klaim mati setelah 72 jam dan sisa item dibagi rata.
- Passcode ditanya sekali per device baru, tidak pernah lagi setelah benar.

### 3.4 Alur bergabung

Ini corong akuisisi, jadi diperlakukan sebagai jalur kritis.

- Sepanjang alur bergabung dan alur klaim: nol penyebutan key, harga, atau tombol beli. Gate manual, telusuri seluruh layar dari buka link sampai selesai klaim.
- Tidak ada dinding install. App jalan penuh di tab browser biasa.
- Ajakan install baru muncul setelah aksi pertama selesai, berbentuk bar tipis yang bisa ditutup, bukan modal.
- Ajakan beli cuma muncul di dua titik: setelah layar "kamu bayar sekian" dan di bawah lipatan layar saldo.
- Tombol utama mengarah ke `/?ref=join`, bukan ke Gumroad. Kalau ada yang mengarah langsung ke halaman pembayaran, itu blocker.
- Pemegang lisensi yang buka link diperlakukan sama persis dengan yang tanpa lisensi.
- Device yang sudah pernah bergabung tidak ditanya identitas lagi.
- Nol dark pattern, nol urgensi palsu, nol hitung mundur.

### 3.5 Penangkapan link

- Manifest punya `id`, `scope`, `handle_links: preferred`, `launch_handler` dengan `client_mode: focus-existing`.
- `/.well-known/assetlinks.json` tersedia dan valid.
- Rute `/j/`, `/c/`, `/v/`, `/q/` berada dalam scope manifest.
- App ter-install: tap link membuka app, bukan tab baru, dan tidak pernah membuka instance kedua.
- iOS: link buka di Safari dan tetap berfungsi penuh. Bar "buka di BagiBill" bisa diabaikan.

## 4. QA Sync dan Realtime

IndexedDB adalah sumber kebenaran di device. Server tempat sinkronisasi, bukan tempat bertanya. Kalau ada layar yang nunggu jawaban server buat nampilin angka yang udah ada di lokal, itu temuan.

- Uji offline penuh: mode pesawat dari awal, bikin grup, tambah lima pengeluaran, settle, baru online. Semua harus masuk tanpa kehilangan apapun.
- Dua device menambah pengeluaran bersamaan: dua-duanya masuk, tidak ada yang hilang, tidak ada duplikat.
- Dua device mengedit pengeluaran sama: field berbeda digabung, field sama diambil terakhir, banner muncul.
- Klaim bersamaan pada item yang sama: diselesaikan deterministik lewat sequence number, yang kalah race dapat state terbaru tanpa pesan error.
- Kegagalan sync tidak pernah memblokir pemakaian dan tidak pernah memunculkan dialog.
- Jam device salah: urutan tetap benar karena memakai timestamp server.
- WebSocket cuma aktif saat layar grup terbuka. Cek tidak ada koneksi menganggur di latar.
- Fallback polling jalan kalau WebSocket diblokir.
- Perubahan schema IndexedDB wajib migrasi plus uji buka data versi lama. PR schema tanpa migrasi adalah blocker.
- Export selalu jalan, dalam kondisi apapun. Termasuk offline, termasuk lisensi habis, termasuk saat sync error.

## 5. QA Mode Claim

Fitur pembeda utama, jadi diuji paling keras setelah angka.

- Avatar pengklaim muncul di device lain di bawah satu detik.
- Counter per item akurat: `2/3`, `1/1`, belum diklaim.
- Item penuh yang ditap orang lain memunculkan konfirmasi bagi berdua, bukan langsung menambah atau langsung menolak.
- Presence menampilkan siapa yang sedang buka layar itu, dan hilang saat orang menutup.
- Item belum diklaim naik otomatis ke atas.
- Finalisasi diblokir kalau masih ada item tanpa klaim, kecuali pembuat menekan bagi rata sisanya.
- Setelah finalisasi, layar member jadi hanya baca dan tombol "ada yang salah" mengirim notifikasi ke pembuat, bukan membuka edit untuk semua orang.
- Buka link klaim setelah finalisasi menampilkan ringkasan, bukan halaman error.
- Nama wajib mendampingi avatar di seluruh layar klaim. Avatar telanjang cuma boleh di tumpukan avatar header.
- Uji dengan 8 device sekaligus dan struk 20 item. Ini skenario nyata, bukan berlebihan.

## 6. QA Scan Struk

- Panggilan OCR cuma dari backend. Gate: `grep -rn "generativelanguage\|GEMINI\|API_KEY" src/` harus nol di client.
- Env yang terbaca client wajib prefix `VITE_PUBLIC_` dan isinya tidak pernah rahasia. Env server prefix `BAGIBILL_`. Gate: `grep -rn "import.meta.env" src/ | grep -v VITE_PUBLIC_`.
- PR yang menambah env baru wajib meng-update `.env.example` di PR yang sama.
- Structured output dengan JSON schema terkunci, temperature nol.
- Field tidak terbaca dikembalikan null, bukan ditebak. Uji dengan struk sengaja dipotong.
- Field yang model-nya ragu ditandai pakai token `--warn`, dan wajib dipasangkan ikon atau underline putus plus label. Warna doang ga cukup.
- Semua angka divalidasi ulang dengan aritmatika di backend. Model tidak dipercaya untuk penjumlahan.
- Selisih antara jumlah item plus biaya dan total tertera ditampilkan ke pengguna, tidak ditelan diam-diam.
- Hasil scan tidak pernah diklaim sempurna. Selalu ada layar koreksi sebelum disimpan.
- Scan gagal tidak memakan kuota.
- Timeout 15 detik, satu kali retry, lalu jatuh ke input manual. Alurnya tidak boleh buntu.
- Uji struk: Indonesia (warung dan restoran ber-PB1), Jepang, Eropa ber-VAT, struk thermal pudar, struk tulisan tangan, foto miring, foto gelap.
- Gambar dikompres di device sebelum dikirim. Cek ukuran payload aktual.

## 7. QA Copy dan i18n

- Semua string lewat file terjemahan. Gate:

```bash
grep -rnE '>[A-Za-z][^<>{}]{3,}<' src/ --include=*.tsx | grep -v "t("
grep -rnE "(placeholder|aria-label|title)=\{?['\"][A-Za-z]{3,}" src/ --include=*.tsx | grep -v "t("
```

- Setiap key ada di id dan en. Kurang satu berarti build gagal, jadi kalau build hijau tapi ada key yang timpang, gate-nya yang bocor dan itu sendiri temuan.
- Identifier dan komentar di kode bahasa Inggris. Teks pengguna tidak pernah ditulis di komponen.
- Pluralisasi memakai `Intl.PluralRules` per bahasa, bukan menambah "(s)".
- Tanggal, angka, dan mata uang lewat Intl, bukan manual.
- Test yang nyocokin output `Intl.NumberFormat`/format uang lewat string literal manual: cek bytenya kalau assertion gagal padahal string "kelihatan sama" di layar. `Intl` masukin non-breaking space (U+00A0) antara simbol mata uang dan angka, bukan spasi ASCII biasa — dua-duanya identik secara visual di editor tapi beda karakter.
- Layar pemilihan bahasa muncul sekali di app, dan tidak pernah muncul di halaman join.
- Store preferensi per device (bahasa, tema, dan sejenisnya) yang skip nulis `localStorage` kalau nilai barunya "kebetulan" sama dengan nilai sekarang: cek dulu dari mana nilai sekarang itu asalnya. Kalau berasal dari tebakan (`navigator.language`, `prefers-color-scheme`) bukan dari yang beneran tersimpan, skip itu bug — pilihan eksplisit pengguna pertama kali gak pernah ke-persist kalau kebetulan sama dengan tebakan sistem, ketauannya cuma kalau device kedua tebakannya beda.
- Teks yang dihasilkan untuk dibagikan (tagih, ringkasan, recap) ikut bahasa pengirim.
- Terminologi konsisten dalam satu bahasa. Jangan campur "porsi" dan "bagian" untuk konsep yang sama.
- Nada Indonesia santai tapi tidak alay. Inggris ringkas dan langsung.
- Panjang teks Inggris dan Indonesia dicek di layar 360px. Bahasa Indonesia biasanya lebih panjang, dan tombol yang pecah cuma di satu bahasa itu kejadian yang sering kelewat.

## 8. QA Onboarding dan Empty State

- Layar bahasa dua tombol, satu tap.
- Satu layar sambutan, bukan tiga slide.
- Tombol lewati selalu terlihat, bukan teks abu tipis.
- Satu coach mark, bukan tur lima langkah.
- Grup contoh bisa dihapus satu tap dan tidak muncul lagi.
- Onboarding selesai tanpa koneksi internet.
- Setiap empty state punya ilustrasi kecil atau tidak sama sekali sesuai spec, satu kalimat, dan satu aksi utama. Tidak ada paragraf.
- Empty state hasil pencarian dan riwayat kosong tidak memakai ilustrasi.
- Saldo lunas menampilkan perayaan, bukan pesan kosong.
- Total berat semua ilustrasi di bawah 15 KB. Ukur, jangan kira-kira.
- Ilustrasi punya varian gelap lewat `currentColor`, bukan file terpisah.

## 9. QA Performa

Angka ini gerbang, bukan aspirasi. Kalau lewat, fitur ditunda sampai ada cara lain.

- Bundle awal di bawah 120 KB brotli, dijaga otomatis lewat `pnpm size` di CI, bukan lewat ingatan.
- Setiap PR yang menambah dependensi wajib menyebutkan dampaknya ke ukuran bundle di deskripsi PR. Kalau ga disebut, minta.
- Kalau anggaran terlampaui, solusinya tukar ke Preact lewat alias Vite, bukan menurunkan target. PR yang nurunin angka gate adalah temuan.
- LCP di bawah 1,5 detik di 4G lambat throttled.
- INP di bawah 200 milidetik.
- Halaman `/j/` dan `/c/` terbuka di bawah 1 detik dan memakai bundle terpisah yang tidak memuat seluruh app. Gate: cek chunk yang termuat di rute `/j/` lewat network tab.
- Scan, bagan, dan export dimuat lazy.
- Daftar transaksi tervirtualisasi di atas 100 baris. Uji dengan 500 transaksi.
- OCR dan generate PDF di Web Worker, main thread tidak beku.
- Benchmark utama: tambah pengeluaran rata selesai dalam 3 tap dan 1 ketikan, dan struk 14 item untuk 8 orang selesai di bawah 2 menit tanpa ada yang install apapun. Hitung manual setiap rilis. Kalau jadi 4 tap, ada yang salah.

## 10. QA Privasi

- Tidak ada email, nomor telepon, atau kontak yang dikumpulkan di mana pun.
- Payload analytics tidak pernah berisi nominal pasti, nama grup, nama member, atau slug. Periksa payload aktual di network tab, bukan cuma baca kodenya.
- Identifier analytics adalah UUID acak yang bisa direset pengguna.
- Toggle mematikan analytics benar-benar menghentikan pengiriman, bukan cuma menyembunyikan tombol.
- Tidak ada skrip pihak ketiga dan tidak ada SDK analytics pihak ketiga. Gate: `grep -rn "googletagmanager\|google-analytics\|facebook.net" src/ public/` harus nol.
- Hapus grup permanen benar-benar menghapus di server dalam 30 hari, termasuk file struk.
- Gambar struk tidak dikirim ke provider untuk pelatihan, dan pernyataannya ada di halaman privacy.
- Uang pengguna tidak pernah lewat kita. Kalau muncul apapun yang berbau pemrosesan pembayaran, deep link dompet, atau impor mutasi bank, itu di luar lingkup dan langsung ditolak.

## 11. QA Token dan Visual

Sumber warna adalah `packages/tokens`, bukan mockup. Mockup cuma acuan tata letak dan hierarki. Kalau mockup dan token beda, token yang benar.

Gate:

```bash
grep -rnE "#[0-9a-fA-F]{3,8}\b" src/ --include=*.module.css --include=*.tsx
grep -rnE ":\s*[0-9]+px" src/ --include=*.module.css | grep -v "var(--"
grep -rn "tailwind" package.json src/
```

- Nol hex literal, nol spacing hardcoded di komponen. Nilai baru yang belum ada tokennya harus ditambahin ke token lalu regenerate, bukan ditulis mentah.
- `packages/tokens/` nol edit tangan. Diff manual di file generated adalah temuan.
- Satu sistem styling. CSS Modules plus custom property. Tailwind atau styling engine kedua langsung ditolak.
- Satu warna per orang, konsisten di list, chip, avatar, dan hasil share. Warna diambil dari `--m-1` sampai `--m-12`.
- Warna kategori tidak punya token sendiri, diturunkan dari palet member lewat `--cat` plus `color-mix`. Token kategori baru adalah temuan.
- Inisial avatar dari kata, bukan huruf. "Dimas Prasetyo" jadi DP. Tabrakan diselesaikan dengan warna berbeda plus nama ikut ditampilkan, bukan dengan memanjangkan inisial.
- Di layar klaim dan settle, nama wajib mendampingi avatar.
- Piutang dan utang ga boleh cuma ngandalin merah versus hijau. Wajib ada tanda +/-, panah arah, atau label. Uji di simulasi buta warna dan di bawah matahari.
- `--route` dan `--warn` juga wajib dipasangkan label atau ikon, sama alasannya.
- Angka uang pakai tabular figures di semua tempat lewat `.bb-numeral`. Kolom yang goyang saat angka berubah adalah temuan.
- Satu keluarga ikon, stroke seragam. Ikon campuran adalah temuan QA, bukan selera.
- Mockup cuma mendefinisikan 360px. Kalau ada CSS desktop atau tablet yang muncul tanpa keputusan, itu masuk PERTANYAAN, bukan pujian inisiatif.

## 12. QA Aksesibilitas

- Kontras minimum 4.5:1 teks, 3:1 elemen antarmuka. Uji di terang dan gelap.
- Warna bukan satu-satunya pembawa informasi. Status klaim punya ikon dan teks.
- Target sentuh minimum 44 piksel, termasuk tombol plus minus di kontrol bobot.
- Font sistem 200% tanpa layout rusak.
- Setiap kontrol punya label yang terbaca screen reader. Nominal dibacakan lengkap dengan mata uangnya.
- Fokus keyboard terlihat, ring-nya pakai `--focus-ring`, dan urutannya logis.
- `prefers-reduced-motion` dan `prefers-color-scheme` dihormati.

## 13. QA Kualitas Kode

Batas ukuran di bawah ini indikator, bukan aturan keras. Kelewat dikit boleh. Kelewat jauh artinya ada tanggung jawab yang salah tempat, dan itu ditulis sebagai WARNING.

- Komponen di bawah 150 baris, modul logika di bawah 250 baris, fungsi di bawah 40 baris.
- Parameter lebih dari 3 diganti satu objek bernama.
- Satu file punya satu alasan untuk berubah.
- Struktur berbasis fitur, bukan berbasis tipe file.

Yang ini bukan indikator, ini temuan:

```bash
grep -rnE ":\s*any\b|as unknown as|\)!\.|\]!" src/ --include=*.ts --include=*.tsx
grep -rn "catch" src/ -A2 --include=*.ts | grep -B1 "}"
find src/ -name "utils.ts" -o -name "helpers.ts"
```

- `any`, `as unknown as`, dan tanda seru non-null. Tipe yang susah dibenerin tipenya, bukan dibungkam.
- Catch kosong atau error yang ditelan diam-diam. Pesan error wajib menyebut konteks yang cukup buat melacak, bukan cuma "gagal".
- Magic number, ternary bersarang, nesting lebih dari 3 level.
- Dead code, kode yang dikomentari, export yang ga dipakai, cabang yang ga pernah tercapai.
- Flag atau opsi konfigurasi yang belum ada pemakainya.
- `utils.ts` atau `helpers.ts` tanpa cakupan jelas.
- Komentar yang cuma ngulang isi kode. Setiap rumus uang wajib punya satu baris kenapa.
- File test sejajar dengan file yang diuji, dan menguji lewat pintu publik modul. Test yang manggil fungsi internal berarti refactor bakal mecahin test yang seharusnya ga peduli.

## 14. Aturan repo

- Satu concern per PR. PR yang campur formula, styling, dan copy minta dipecah.
- Commit type dari daftar: feat, fix, refactor, chore, test, docs, perf, ci, build, style.
- Perubahan di split engine, settlement, atau modul kurs wajib disertai test baru di PR yang sama. Ditolak tanpa diskusi kalau ga ada.
- Perubahan schema IndexedDB wajib migrasi plus uji data versi lama.
- Perubahan manifest wajib diuji di device ter-install, bukan cuma di dev server.
- Setiap penyimpangan dari `spec.md` dicatat di bagian Keputusan di `progress.md` dalam PR yang sama.
- Centang di `progress.md` cuma sah kalau udah diuji di device sungguhan. Centang yang muncul barengan sama kodenya ditulis adalah temuan.
- File di luar cakupan tugas yang ikut kesentuh adalah temuan, sekecil apapun diff-nya.
- Fitur yang ga diminta, walaupun bagus, adalah temuan. Tempatnya di Catatan lepas di `progress.md`.

## 15. Format laporan

```
QA REPORT — <branch/PR>
Gate: typecheck / lint / test (N pass, M skip) / build / size (X KB dari 120 KB)

BLOCKER:
- [file:line] deskripsi + bukti + saran fix

WARNING:
- ...

PERTANYAAN:
- hal yang ga jelas apakah bug atau sengaja, plus hal yang nyentuh area yang belum diputuskan

VERIFIED:
- invarian yang dicek dan aman, dengan bukti singkat

VERDICT: MERGE / FIX DULU / REJECT
```

Blocker otomatis, tanpa perlu debat:

- Jumlah bagian tidak sama dengan total
- Saldo grup tidak nol
- Float masuk ke jalur uang
- Orang yang ditraktir hilang dari rincian
- Ada penyebutan harga atau key di alur bergabung atau alur klaim
- Slug bocor ke log atau analytics
- Kunci API ada di client
- Data hilang setelah offline lalu sync
- App mati karena masalah jaringan atau lisensi
- Export ga jalan di salah satu kondisi
- Perubahan split engine, settlement, atau kurs tanpa test baru
- Anggaran bundle terlampaui
- Perubahan schema IndexedDB tanpa migrasi
