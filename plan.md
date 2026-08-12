# plan.md

Rencana kerja dari repo kosong sampai tujuh layar gelombang 1 jalan beneran di device. Satu tugas satu PR. Urutan mengikat kecuali disebut bisa paralel.

Cakupan plan ini berhenti di: beranda, buat grup dan kelola member, tambah pengeluaran, detail grup tab Transaksi dan tab Saldo, klaim item. Semuanya lokal di satu device. Backend, lisensi, onboarding, dan halaman publik tidak masuk sini.

Seluruh mockup gelombang 1 sudah ada, sebelas file, daftarnya di `docs/mockups/README.md`. Tiga di antaranya (join grup, bagi cepat, scan struk) memang layar gelombang 2 yang mockupnya kebetulan jadi duluan, dan sengaja tidak dijadwalkan di sini.

## Yang sudah diputuskan dan tidak dibuka lagi

Ditulis di sini supaya tidak ditawar ulang di tengah tugas. Alasannya ada di bagian Keputusan di `progress.md`.

- Cakupan gelombang 1 adalah tujuh layar sesuai daftar di atas, bukan empat.
- Klaim item ikut sekarang dalam versi satu device tanpa realtime. Realtime, presence, link `/c/` yang hidup, dan kedaluwarsa 72 jam tetap fase 2.
- Engine per item dibangun di F1-05 karena layar klaim membutuhkannya. UI assign versi pembuat tetap fase 2.
- Mode kelima bernama Selisih di UI, `adjustment` di kode.
- Tidak ada tata letak desktop. Satu kolom, maksimal 480px, ditengahkan.
- Backend nanti Cloudflare Workers plus Neon. Belum disentuh di plan ini, tapi jangan menulis apapun yang mengasumsikan koneksi Postgres yang dipegang lama.

## Yang masih menggantung

Tidak ada yang memblokir tugas di plan ini. Yang tersisa: bentuk protokol sync, storage dan penyedia OCR, dan preset biaya untuk locale di luar tiga yang sudah ada. Ketiganya baru relevan setelah gelombang 1 tutup.

## Aturan main tiap tugas

- Baca `progress.md`, lalu tugasnya di sini, lalu bagian `spec.md` yang disebut. Jangan baca seluruh spec.
- Cuma sentuh file di daftar cakupan. Butuh menyentuh yang lain berarti cakupannya salah, bilang.
- Lima perintah wajib hijau sebelum lapor: typecheck, lint, test, build, size.
- Update `progress.md` di PR yang sama. Centang cuma setelah dicoba di HP beneran.
- Fungsi yang belum kepakai tidak ditulis. Kalau kepikiran, catat di Catatan lepas.

---

## Fase 0. Fondasi

### F0-01 Scaffold repo dan toolchain

Tergantung: tidak ada.

Cakupan: root repo, `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `vitest.config.ts`, `.size-limit.json`, `src/main.tsx`, `src/App.tsx`, `.env.example`.

Isi: pnpm workspace, React 19 plus TypeScript strict, Vite, Vitest plus Testing Library, ESLint flat config plus Prettier, size-limit dengan ambang 120 KB brotli. Path alias `@/` ke `src`. Struktur folder kosong berbasis fitur: `src/features/`, `src/shared/`, `src/lib/`, `packages/`.

Aturan lint yang wajib nyala karena sudah jadi janji di CLAUDE.md: larang `any`, larang non-null assertion, larang ternary bersarang, larang import lintas fitur yang bukan lewat `index.ts`, larang variabel dan import yang tidak dipakai.

Selesai kalau: `pnpm dev` menampilkan halaman kosong, lima perintah hijau, dan satu test contoh lewat.

### F0-02 Inventaris mockup

Tergantung: tidak ada. Bisa duluan sebelum F0-01 kalau mau.

Cakupan: `docs/mockup-inventory.md` saja. Nol kode aplikasi.

Dokumennya sudah ditulis sebagai hasil bongkaran awal. Tugas ini memverifikasinya terhadap file mockup, bukan memulai dari nol. Yang dicek ulang: daftar komponen dan keadaannya masih cocok, nilai yang disebut belum punya token memang belum ada di `packages/tokens`, dan tidak ada komponen yang kelewat.

Delapan mockup gelombang 1 dibongkar penuh. Tiga mockup gelombang 2 tidak masuk daftar komponen, tapi nilai visualnya tetap disisir, karena token yang kurang lebih murah ditemukan sekarang.

Tiap mockup punya blok `:root` lokal yang menimpa `tokens.css`. Nilai lokal itu tersangka, bukan referensi.

Selesai kalau: tiap komponen di dokumen menyebut di mockup mana dia muncul dan dalam keadaan apa saja, dan setiap baris di daftar token yang kurang sudah diverifikasi ulang terhadap `packages/tokens` yang sekarang.

### F0-03 Token masuk aplikasi

Tergantung: F0-01, F0-02.

Cakupan: `packages/tokens/`, `src/styles/tokens.css`, `src/styles/global.css`, `src/shared/theme/`.

Isi: tambahkan token yang kurang dari hasil F0-02 di sumbernya lalu regenerate. Jangan tulis nilai mentah. Ekspor token jadi custom property, dua tema terang dan gelap, ikut `prefers-color-scheme` dengan override manual yang disimpan lokal. Angka uang pakai tabular figures dari sini, bukan diatur per komponen.

Selesai kalau: ganti tema tidak menyebabkan kedipan, tidak ada satupun hex di luar `packages/tokens`, dan ada test yang gagal kalau ada hex literal di `src/`.

### F0-04 Infrastruktur i18n

Tergantung: F0-01.

Cakupan: `src/lib/i18n/`, `src/locales/id.ts`, `src/locales/en.ts`, `scripts/check-locale-keys.ts`.

Isi: i18n tipis sendiri. Fungsi `t(key, params)`, pluralisasi lewat `Intl.PluralRules`, format uang dan tanggal lewat `Intl` dengan presisi per mata uang. Bahasa disimpan per device dan bisa diganti tanpa reload. Script pengecek kunci dipasang ke build supaya kunci yang cuma ada di satu bahasa bikin build gagal.

Selesai kalau: hapus satu kunci di `en.ts` bikin build merah. Format IDR keluar tanpa desimal, USD dua desimal, dari fungsi yang sama.

### F0-05 Komponen dasar

Tergantung: F0-03, F0-04.

Cakupan: `src/shared/ui/` (Button, TextInput, MoneyInput, Sheet, Toast, Avatar, ListRow), plus `src/routes/dev/ui.tsx`.

Isi: cuma komponen yang benar-benar muncul di ketujuh mockup gelombang 1 aktif (bukan arsip Saldo___Settle_Up, bukan mockup gelombang 2). Tiap komponen satu folder, satu file komponen, satu file CSS Module, satu file test. MoneyInput bekerja di minor unit dan tidak pernah menyimpan string ke state uang. Avatar mengambil inisial dari kata dan menerima warna member dari luar, jangan menghitung warna di dalam dirinya.

Halaman `/dev/ui` menampilkan seluruh komponen dalam semua keadaannya, dua tema, dua bahasa. Ini alat debug utama sepanjang proyek, bukan pajangan.

Selesai kalau: seluruh keadaan yang dicatat di F0-02 kelihatan di `/dev/ui`, target sentuh minimal 44px, dan navigasi keyboard jalan di semua komponen.

### F0-06 Kerangka rute dan layout

Tergantung: F0-05.

Cakupan: `src/routes/`, `src/app/layout/`.

Isi: router dengan pemecahan kode per rute. Rute yang dibuat sekarang cuma yang dipakai gelombang 1: beranda alias daftar grup, buat grup, detail grup dengan tab Transaksi dan Saldo, kelola member, tambah pengeluaran, klaim. Halaman `/j/` dan `/c/` disiapkan sebagai entry terpisah yang tidak menarik bundle app, isinya masih kosong. Layout kunci di 360px dulu, jangan mengarang breakpoint desktop.

Selesai kalau: tiap rute punya chunk sendiri di output build, dan buka `/c/xxx` tidak menarik chunk app utama.

### F0-07 Lapisan sistem

Tergantung: F0-05, F0-06. Mockup `Lapisan_Sistem.html`, sepuluh keadaan.

Cakupan: `src/shared/system/`.

Isi: tangga bahaya dengan tiga anak, undo, pita jaringan, dan tiga bentuk kegagalan. Yang dibangun di sini cuma cangkang dan kaitnya. Menyambungkannya ke aksi nyata terjadi di tugas F3 masing-masing.

Tangga bahayanya: aksi yang bisa ditarik kembali (hapus pengeluaran, hapus pelunasan) langsung dibuang lalu undo menyusul, tanpa konfirmasi. Aksi permanen (hapus grup) pakai sheet berat dengan tahan-untuk-hapus, gestur yang sengaja dipilih karena tidak mungkin kepencet. Aksi terkunci (hapus member yang sudah punya transaksi) bukan konfirmasi sama sekali, melainkan penjelasan kenapa tombolnya tidak melakukan yang dikira, lalu diarahkan ke Nonaktifkan, dan warnanya netral bukan merah karena ini bukan bahaya.

Jendela undo 6 detik, sisa waktunya berbentuk cincin plus angka. Dua penghapusan beruntun menumpuk jadi satu toast dengan hitungan dan timer di-reset. Pindah layar berarti komit.

Pita offline hanya muncul di grup yang punya member lain, warnanya netral bukan merah, dan tidak pernah menghentikan pengetikan. Di grup satu orang tidak ditampilkan sama sekali. Saat online kembali, pita berubah jadi sedang mengirim lalu tersinkron.

Tiga kegagalan, tiga jalan keluar berbeda: simpan gagal dapat tombol ulangi inline di atas tombol simpan tanpa menimpanya dan data form tetap utuh, muat gagal dapat layar penuh dengan muat ulang dan itu cuma untuk yang benar-benar menunggu jaringan, dan kegagalan satu baris tinggal di baris itu tanpa membuat seluruh layar jadi halaman error.

Selesai kalau: toast tidak pernah menutupi tombol simpan maupun angka total di layar tambah pengeluaran, hitung mundur undo tetap terbaca saat `prefers-reduced-motion` aktif, dan sheet konfirmasi menjebak fokus keyboard selama terbuka.

### F0-08 Gerbang kualitas di CI

Tergantung: F0-01 sampai F0-07.

Cakupan: `.github/workflows/ci.yml`, `scripts/`.

Isi: jalankan lima perintah wajib di tiap PR. Tambah pengecekan hex literal, pengecekan kunci i18n, dan laporan ukuran bundle yang gagal kalau lewat anggaran.

Selesai kalau: PR yang sengaja dibikin melanggar salah satu gerbang benar-benar merah.

---

## Fase 1. Split engine

Modul murni tanpa UI, tanpa jaringan, tanpa jam. Ini bagian paling penting di seluruh proyek. Tidak ada satupun layar yang menampilkan angka sebelum fase ini selesai.

Semua ada di `packages/split-engine/`. Pintu keluarnya satu file `index.ts`. Komponen tidak pernah memanggil isi dalamnya.

Rujukan: `spec.md` bagian 6, 7, 11, dan 24.

### F1-01 Tipe uang dan minor unit

Cakupan: `money/`.

Isi: tipe `Money { amountMinor, currency }`, tabel presisi per mata uang termasuk yang nol desimal dan tiga desimal, konversi teks pengguna ke minor unit dan sebaliknya. Nol float di seluruh jalur.

Selesai kalau: test menutup nol desimal, dua desimal, tiga desimal, input kotor dari pengguna, dan nominal negatif.

### F1-02 Pembagi sisa largest remainder

Cakupan: `allocation/`.

Isi: satu fungsi yang menerima total minor unit plus daftar bobot, mengembalikan daftar nominal yang jumlahnya sama persis dengan total. Sisa dibagikan satu per satu urut dari pecahan terbesar, seri diputus dengan aturan yang stabil dan ditulis alasannya.

Selesai kalau: property test dengan ribuan kombinasi acak selalu menghasilkan jumlah sama persis. Kasus semua bobot nol, satu peserta, dan nol peserta punya perilaku yang ditulis di test.

### F1-03 Mode Rata, Nominal, Persentase

Tergantung: F1-02. Rujukan `spec.md` 6.1 sampai 6.3.

Isi: tiga mode plus perhitungan sisa yang belum teralokasi untuk mode Nominal, dan validasi 100 persen untuk mode Persentase termasuk pembulatan selisih di bawah 0,01 persen.

Selesai kalau: kelebihan alokasi menghasilkan peringatan sebagai nilai balik, bukan lemparan error, karena spec bilang tidak memblokir.

### F1-04 Mode Porsi dan Selisih

Tergantung: F1-02. Rujukan `spec.md` 6.4 dan 6.5.

Isi: bobot relatif dengan default 1, bobot nol berarti ikut tercatat tanpa bayar. Selisih (`adjustment` di kode) adalah rata plus tambahan tetap per orang, tambahan boleh negatif.

Bagian ratanya dihitung ulang setelah penyesuaian diambil, yaitu total dikurangi jumlah seluruh penyesuaian lalu dibagi jumlah orang. Bukan total dibagi orang lalu ditambahi. Kalau salah, jumlah bagian tidak akan sama dengan total.

Potongan yang lebih besar dari bagian rata menghasilkan nilai minus dan dibiarkan minus. Tidak diklamp ke nol karena itu menyembunyikan uang, tidak ditolak karena niatnya sah.

Selesai kalau: kasus bertiga bobot 1 menghasilkan sepertiga yang jumlahnya pas, dan kasus potongan ekstrem punya test sendiri yang memastikan hasilnya minus dan totalnya tetap pas.

### F1-05 Mode Per Item

Tergantung: F1-02. Rujukan `spec.md` 6.6.

Isi: item dengan qty dan harga satuan, klaim banyak orang dengan bobot masing-masing. Total bobot yang tidak sama dengan qty tetap dibagi proporsional plus penanda catatan, bukan error. Item tanpa pengklaim ditandai, tidak dipaksa masuk ke siapapun.

Selesai kalau: pembulatan per item yang dijumlah sama dengan pembulatan di level total. Ini invarian, ditulis sebagai test.

### F1-06 Biaya tambahan

Tergantung: F1-03 sampai F1-05. Rujukan `spec.md` 7.1 sampai 7.3.

Isi: komponen persen atau nominal, tiga mode alokasi (proporsional, rata, ditanggung satu orang), diskon sebagai nilai negatif termasuk diskon yang cuma berlaku ke item tertentu.

Selesai kalau: diskon yang lebih besar dari subtotal punya perilaku yang ditulis. Kombinasi tiga komponen dengan tiga mode alokasi berbeda dalam satu pengeluaran tetap menjumlah pas.

### F1-07 Traktir

Tergantung: F1-06. Rujukan `spec.md` 7.4.

Isi: tiga level yaitu komponen, item, dan seluruh bagian orang, plus traktir sebagian berupa nominal tetap. Yang ditraktir tetap ada di hasil dengan nominal nol dan penanda siapa yang menanggung.

Selesai kalau: ada test yang gagal kalau orang yang ditraktir hilang dari daftar hasil. Traktir bertingkat, misalnya orang yang ditraktir juga menraktir orang lain, punya perilaku yang ditulis.

### F1-08 Pembayar dan saldo

Tergantung: F1-07. Rujukan `spec.md` 6.7 dan 11.1.

Isi: banyak pembayar dengan nominal masing-masing, validasi total bayar sama dengan total tagihan, saldo bersih per member yaitu yang dibayar dikurangi bagiannya.

Selesai kalau: jumlah seluruh saldo dalam grup selalu nol, diuji dengan data acak.

### F1-09 Settlement

Tergantung: F1-08. Rujukan `spec.md` 11.2.

Isi: mode Langsung yang menyimpan utang per pasangan, dan mode Simplify yang meminimalkan jumlah transfer. Rincian per pasangan tetap disimpan meskipun Simplify aktif, karena layar penelusuran butuh itu.

Selesai kalau: hasil kedua mode menghasilkan saldo akhir nol untuk semua orang, dan kasus lima orang dua puluh transaksi selesai dengan jumlah transfer yang masuk akal.

### F1-10 Fasad dan tabel kasus

Tergantung: F1-01 sampai F1-09.

Isi: satu pintu masuk `calculateExpense` dan `calculateGroupBalances`. Plus satu berkas test berisi kasus dari `spec.md` bagian 24, ditulis sebagai tabel supaya nambah kasus cuma nambah baris.

Selesai kalau: seluruh kasus tepi di spec bagian 24 yang relevan ke perhitungan punya baris di tabel itu, dan tidak ada satupun komponen yang bisa mengimpor isi dalam engine.

---

## Fase 2. Storage

Bisa jalan paralel dengan Fase 1, orang yang berbeda atau sesi yang berbeda. Tidak saling menunggu.

Semua di `src/lib/storage/`. Rujukan `spec.md` bagian 5.

### F2-01 Schema dan Clock

Isi: Dexie versi 1 dengan entitas Group, Member, Expense, Item, Settlement. Uang disimpan integer minor unit. Soft delete lewat `deletedAt`. `seq` disiapkan meski server belum ada. Clock diinjeksi, tidak ada `Date.now()` di dalam logika.

Selesai kalau: tipe rekaman satu sumber dengan tipe yang dipakai split engine, tidak ada dua definisi yang harus dijaga sinkron manual.

### F2-02 Repository grup dan member

Tergantung: F2-01.

Isi: buat grup dari template, tambah member, nonaktifkan member yang sudah punya transaksi, deteksi nama mirip dengan normalisasi (`spec.md` 12.2). Warna member ditetapkan sekali saat masuk dan tidak pernah berubah.

Selesai kalau: hapus member yang punya transaksi ditolak dengan alasan jelas, bukan diam-diam gagal.

### F2-03 Repository pengeluaran

Tergantung: F2-01.

Isi: simpan, ubah, soft delete, ambil per grup dengan urutan tanggal. Semua operasi lewat satu adapter storage supaya nanti bisa ditukar.

Selesai kalau: test jalan di fake IndexedDB tanpa browser, dan tidak ada query yang tersebar di luar repository.

### F2-04 Migrasi

Tergantung: F2-03.

Isi: jalur migrasi versi 1 ke versi berikutnya dan test yang membuka database berisi data versi lama.

Selesai kalau: buka data lama tidak menghilangkan satupun baris.

### F2-05 Export jaring pengaman

Tergantung: F2-03. Butuh persetujuan, karena export CSV resminya baru di PR 11.

Isi: satu tombol tersembunyi di `/dev` yang menumpahkan seluruh data lokal ke JSON. Bukan fitur pengguna, cuma penjaga janji bahwa data tidak pernah disandera sejak hari pertama.

---

## Fase 3. Layar gelombang 1

Baru boleh mulai setelah F1-10 dan F2-03 selesai.

### F3-01 Tambah pengeluaran mode Rata

Tergantung: F0-06, F1-10, F2-03. Mockup `Tambah_Pengeluaran.html` mode Rata.

Cakupan: `src/features/expense/`.

Isi: layar penuh, mode Rata, semua member tercentang default, panel hasil selalu terlihat di bawah form dan ikut berubah tanpa tombol hitung. Perhitungan dipanggil dari engine, nol aritmatika di komponen.

Selesai kalau: tambah satu pengeluaran rata benar-benar selesai dalam 3 tap dan 1 ketikan, dihitung di HP beneran, dan angkanya tersimpan lalu masih benar setelah reload.

### F3-02 Mode Porsi

Tergantung: F3-01. Mockup `Tambah_Pengeluaran.html` mode Porsi.

Isi: kontrol bobot dengan minus, plus, preset 1/2 1/3 1/4, dan input manual. Bobot nol tampil beda dari orang yang dihapus dari daftar.

Selesai kalau: ubah bobot memperbarui panel hasil dalam satu frame, dan target sentuh minus plus tetap 44px.

### F3-03 Biaya tambahan dan traktir

Tergantung: F3-02. Mockup `Tambah_Pengeluaran.html` mode Penuh.

Isi: komponen biaya dengan toggle persen dan nominal, preset locale, pemilihan mode alokasi per komponen, dan traktir di tiga level. Setiap traktiran muncul eksplisit di ringkasan dengan kalimat yang menyebut penanggung dan nominalnya.

Selesai kalau: orang yang ditraktir tetap muncul dengan nominal nol di panel hasil, dan bagian ini punya screenshot test atau catatan QA yang membuktikannya.

### F3-04 Mode Nominal, Persen, Selisih

Tergantung: F3-03. Mockup `Tambah_Pengeluaran.html`, sepuluh keadaan di tiga mode.

Isi: tiga mode sisanya. Nominal pakai bar alokasi bertumpuk warna orang dengan garis vertikal penanda total, sisa yang belum dibagi diarsir netral dan angkanya hidup di panel. Kelebihan tidak diblokir, batangnya melewati garis total. Persen pakai satu jalur nol sampai seratus dengan garis target, dan tombol ratakan sisa yang membagikan kekurangan ke yang masih nol. Selisih memakai titik tengah sebagai bagian rata, batang menyimpang ke kanan untuk tambahan dan ke kiri untuk potongan.

Selesai kalau: sepuluh keadaan di mockup semuanya bisa dicapai lewat interaksi nyata, dan kasus potongan ekstrem menampilkan nilai minus sesuai F1-04, bukan nol.

### F3-05 Detail grup tab Transaksi

Tergantung: F3-01. Mockup `Detail_Grup_Transaksi.html`, dua keadaan.

Cakupan: `src/features/group/`.

Isi: header grup, tiga tab, tab Transaksi jalan penuh dengan seluruh variasi baris yang ada di mockup, plus keadaan kosong. Dua tab lain boleh kosong dulu tapi tidak boleh terlihat rusak.

Selesai kalau: baris transaksi merender dari struktur yang sama dengan panel hasil di layar tambah pengeluaran. Kalau strukturnya beda, itu bug, bukan optimasi.

### F3-06 Pencarian dan filter dasar

Tergantung: F3-05. Rujukan `spec.md` 12.5, ambil yang dasar saja.

Isi: pencarian teks pada judul dan catatan, filter orang dan rentang tanggal. Filter tersimpan belum masuk sekarang.

### F3-07 Detail grup tab Saldo

Tergantung: F1-09, F3-05. Mockup `Detail_Grup_Saldo.html`, sembilan keadaan.

Cakupan: `src/features/settle/`.

Isi: saldo per orang dan diagram jaringan transfer sebagai isi tab, di bawah header grup yang sudah ada. Mode Ringkas dan Langsung ditukar di tempat, dan bedanya digambar sebagai perubahan bentuk jaringan, bukan dijelaskan.

Tiga hal didorong ke sheet dari bawah karena butuh ruang penuh: penelusuran satu angka, catatan bayar dengan tombol salin, dan penyusunan pesan tagih. Sisanya tinggal di tab: jaringan, daftar saldo, transfer yang disarankan, riwayat pelunasan.

Kartu posisi kamu di header grup tidak diulang di tab ini. Mengetuk kartu itu menyorot baris kamu di daftar saldo, tidak memunculkan ringkasan kedua. Satu angka, dua penempatan yang saling menunjuk.

Pelunasan penuh dan sebagian, masing-masing entri tersendiri yang bisa di-undo lewat lapisan sistem dari F0-07.

Selesai kalau: penelusuran dari satu angka sampai ke transaksi asal jalan di mode Ringkas, termasuk untuk transfer yang bukan pasangan utang aslinya, lengkap dengan penjelasan kenapa lewat perantara. Piutang dan utang terbaca tanpa mengandalkan merah hijau.

### F3-08 Klaim item sisi member

Tergantung: F1-05, F3-05. Mockup `Klaim_Item.html`, empat keadaan.

Isi: pilih identitas, klaim berjalan, konfirmasi bagi berdua saat item penuh ditap, ringkasan setelah finalisasi. Versi satu device dulu, tanpa realtime dan tanpa presence. Nama wajib mendampingi avatar di layar ini.

Selesai kalau: layar ini tidak menarik bundle app utama, dan tidak ada satupun penyebutan harga, key, atau tombol beli di sepanjang alurnya.

### F3-09 Buat grup dan kelola member

Tergantung: F0-06, F0-07, F2-02. Mockup `Buat_Grup___Kelola_Member.html`, sepuluh keadaan.

Cakupan: `src/features/group/`.

Isi: pembuatan grup dengan lima template, pemilihan mata uang dasar, dan penambahan member cuma dengan mengetik nama. Template menentukan kategori default dan mode simplify, jadi konsekuensinya harus terlihat saat dipilih.

Deteksi nama mirip dicegat saat diketik, bukan diselesaikan belakangan. Normalisasi adalah trim, huruf kecil, spasi tunggal, lalu kemiripan diukur dengan jarak edit maksimal 1. Nama persis sama tetap boleh dibuat kalau orangnya memilih lanjut, karena dua orang bernama sama memang ada. Yang tidak boleh adalah membuatnya tanpa sadar.

Kelola member: tambah orang di tengah jalan, ubah nama, nonaktifkan. Member yang sudah punya transaksi tidak bisa dihapus, dan yang muncul di situ adalah penjelasan dari tangga bahaya di F0-07, bukan konfirmasi. Aktif versus nonaktif dibedakan lewat bentuk, yaitu avatar terisi versus cincin putus-putus, bukan lewat warna.

Warna member diberikan berurutan dari palet dua belas dan tidak pernah berubah setelah itu.

Selesai kalau: member yang bergabung belakangan tidak ikut kena pengeluaran sebelum tanggal bergabungnya, dan itu punya test. Nonaktifkan tidak menghilangkan orangnya dari riwayat manapun.

### F3-10 Beranda dan daftar grup

Tergantung: F3-07, F3-09. Mockup `Beranda.html`, dua keadaan.

Cakupan: `src/features/home/`.

Isi: daftar grup dengan ringkasan posisi pribadi per grup, plus keadaan pengguna baru yang belum punya grup. Angka posisi diambil dari fasad engine, bukan dihitung ulang di sini.

Tidak masuk sekarang: onboarding, coach mark, grup contoh, dan corong akuisisi. Keadaan kosong dipakai apa adanya sebagai empty state, bukan sebagai layar sambutan.

Selesai kalau: angka di kartu grup sama persis dengan angka di tab Saldo untuk grup yang sama, dirender dari struktur yang sama. Beda satu rupiah berarti ada perhitungan yang bocor ke komponen.

### F3-11 Data contoh untuk dev

Tergantung: F2-03.

Isi: satu perintah yang mengisi database lokal dengan grup berisi kasus yang menyusahkan: multi pembayar, traktir, bobot nol, sisa pembulatan yang tidak habis dibagi, dan grup yang semuanya sudah lunas. Dipakai untuk QA manual dan screenshot.

---

## Fase 4. Tutup gelombang 1

### F4-01 Lewati skill QA

Tergantung: seluruh Fase 3.

Isi: jalankan `.claude/skills/bagibill-qa/SKILL.md` untuk tujuh layar. Cek panjang teks di 360px untuk dua bahasa, tema terang dan gelap, dan pembacaan screen reader untuk angka uang.

Selesai kalau: temuan ditulis apa adanya di `progress.md`, termasuk yang belum diperbaiki.

### F4-02 Cek anggaran performa

Tergantung: F4-01.

Isi: ukur bundle awal, LCP di 4G lambat, dan INP saat mengetik di layar tambah pengeluaran. Kalau lewat anggaran, opsi pertama adalah tukar ke Preact lewat alias, bukan menurunkan target.

### F4-03 Deploy pratinjau

Tergantung: F4-02.

Isi: Cloudflare Pages, domain `bagibill.pika-xu.com`, header keamanan, dan pastikan slug grup tidak pernah masuk ke log manapun. Belum ada service worker dan belum ada manifest, itu PR 12.

Selesai kalau: dibuka dari HP di jaringan seluler, tujuh layar jalan, dan angkanya masih benar setelah app ditutup lalu dibuka lagi.

---

## Setelah ini

Yang tersisa dari rencana PR asli dan tidak dibahas di sini: mata uang, backend dan sync, akses dan link, lisensi, onboarding, Quick Split dan export CSV, PWA dan halaman publik.

Tiga di antaranya sudah punya mockup, jadi yang menahan bukan lagi desain:

- Bagi cepat (`Bagi_Cepat.html`, lima keadaan) sebenarnya bisa dikerjakan lokal karena tidak butuh grup. Link hasilnya yang butuh backend. Kandidat paling kuat untuk tugas pertama setelah gelombang 1 tutup.
- Join grup (`Join_Grup.html`, empat keadaan) menunggu device token dan pemetaan member.
- Scan struk (`Scan_Struk___Editor_Item.html`, enam keadaan) menunggu backend OCR, storage, dan kebijakan kuota. Mockupnya sudah mendesain jalur gagal secara utuh, jadi jangan mulai dari jalur bahagia lalu menambal.

Sisanya menunggu keputusan backend atau memang belum punya desain sama sekali: layar lisensi dan aktivasi key, layar bahasa dan sambutan, onboarding dan coach mark, dan tab Ringkasan di detail grup.
