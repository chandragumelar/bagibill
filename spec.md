# BagiBill — Product Spec

Versi 1.0
Agustus 2026

---

## 1. Ringkasan

BagiBill adalah PWA split bill tanpa login. Dipakai di browser, bisa di-install ke home screen, jalan offline. Market global dengan dua bahasa (Indonesia, Inggris) dan dukungan seluruh mata uang ISO 4217.

Akses dibuka lewat key yang dibeli di Gumroad, berlaku 1 tahun, satu key untuk satu pembuat grup. Member yang diundang tidak perlu key, tidak perlu install, tidak perlu akun.

Target eksperiensial: menambah satu pengeluaran yang dibagi rata selesai dalam 3 tap dan 1 ketikan. Membagi struk 14 item untuk 8 orang selesai di bawah 2 menit tanpa satupun dari mereka install apapun.

### 1.1 Posisi produk

- Kompetitor utama: Splitwise (berbayar, ada limit transaksi, onboarding berat), Tricount, Splid, dan gelombang indie app.
- Diferensiasi: satu orang bayar untuk seluruh grup, member gratis selamanya, mode Claim kolaboratif via link, scan struk, dan tidak ada akun sama sekali.
- Janji yang tidak boleh dilanggar: data user tidak pernah disandera. Key habis berarti berhenti membuat, bukan berhenti mengakses.

---

## 2. Prinsip Desain

- Kecepatan di atas kelengkapan. Jalur yang paling sering dipakai harus paling pendek.
- Kompleksitas disembunyikan satu lapis, bukan dihapus. Pengguna yang butuh split per persentase bisa dapat, pengguna yang cuma bagi rata tidak pernah melihatnya.
- Semua aksi destruktif punya undo. Tidak ada dialog "yakin?".
- Tidak ada state yang tidak bisa dilihat. Kalau ada yang mengklaim item, semua orang lihat siapa dan kapan.
- Angka tidak pernah bohong. Sisa pembulatan, biaya yang belum teralokasi, dan item yang belum diklaim selalu terlihat.
- App ini kalkulator dan catatan yang bisa dibagikan. Bukan dompet, bukan payment processor, bukan budgeting app.

---

## 3. Model Akses dan Lisensi

### 3.1 Tier

- Free (tanpa key)
  - 1 grup aktif
  - 20 transaksi per grup
  - 3 scan struk per hari
  - Mode Claim aktif penuh (ini pintu masuk viral, jangan dibatasi)
  - Quick Split tanpa batas
  - Export CSV aktif
- Berlisensi (key aktif)
  - Grup tanpa batas
  - Transaksi tanpa batas
  - Member tanpa batas
  - 30 scan struk per hari
  - Recurring, budget trip, recap tahunan, PDF export
  - Prioritas antrian OCR

### 3.2 Aktivasi key

- Key dibeli di Gumroad, diverifikasi lewat Gumroad License API saat aktivasi.
- Masa aktif 1 tahun dihitung sejak key diaktifkan di app, bukan sejak tanggal pembelian. Key yang dibeli lalu didiamkan tiga bulan tetap dapat 12 bulan penuh.
- Key yang belum pernah diaktifkan tidak punya tanggal kedaluwarsa. Ini juga membuat key layak dijadikan hadiah.
- Server menyimpan hash key, tanggal aktivasi, tanggal kedaluwarsa, dan daftar device token.
- Maksimum 3 device aktif per key. Device bisa dilepas manual dari halaman Settings.
- Recovery code 12 karakter dibuat saat aktivasi, ditampilkan sekali, bisa dilihat ulang di Settings selama key aktif. Dipakai untuk memindahkan lisensi ke device baru saat device lama hilang.

### 3.2.1 Validasi setelah aktivasi

- Tanggal kedaluwarsa sudah diketahui sejak aktivasi dan disimpan lokal bertanda tangan. App menghitung status lisensi sepenuhnya di device.
- Tidak ada pengecekan berkala terjadwal dan tidak ada hitungan mundur offline. App yang tidak pernah online setahun penuh tetap berfungsi normal sampai tanggal kedaluwarsanya.
- Pemeriksaan ke server hanya menumpang pada permintaan sync yang memang sedang terjadi. Tidak ada permintaan jaringan khusus untuk urusan lisensi.
- Pemeriksaan itu hanya mencari dua hal: key yang direfund atau di-chargeback, dan key yang dipakai jauh melewati batas 3 device. Selain itu server tidak pernah menjawab apapun yang bisa mematikan app.
- Kalau key direfund, app turun ke mode Free, bukan mati. Data tetap utuh dan tetap bisa diekspor.

### 3.3 Kedaluwarsa

- Notifikasi di dalam app pada H-30, H-7, dan H-1. Bukan modal, cukup banner yang bisa ditutup.
- Grace period 30 hari setelah expired: semua fungsi tetap jalan, banner perpanjangan muncul di home.
- Setelah grace period: grup masuk mode read-only. Yang tetap jalan selamanya tanpa key:
  - Membuka dan membaca seluruh grup lama
  - Melihat saldo dan settlement
  - Menandai lunas
  - Export CSV dan PDF
  - Quick Split
  - Mode Free (1 grup baru)
- Yang berhenti: membuat grup baru di luar kuota Free, menambah transaksi di grup lama, scan di atas kuota Free.
- Tidak ada auto-renew, tidak ada penagihan otomatis. Perpanjangan adalah pembelian baru di Gumroad, key lama diganti key baru.

---

## 4. Identitas dan Sesi

### 4.1 Model identitas

- Tidak ada email, password, nomor telepon, atau OAuth.
- Setiap device menghasilkan `deviceToken` (UUIDv4) saat pertama kali app dibuka, disimpan di localStorage dan IndexedDB.
- Grup diidentifikasi oleh `slug`: 22 karakter base62 acak dari CSPRNG (setara 128 bit entropi). Tidak bisa ditebak, tidak berurutan, tidak mengandung informasi.
- Member adalah objek dalam grup dengan `memberId`, nama, warna, dan avatar inisial. Member tidak punya akun.
- `deviceToken` dipetakan ke `memberId` per grup. Satu device bisa jadi orang berbeda di grup berbeda.

### 4.2 Alur bergabung

1. Member menerima link `bagibill.app/j/<slug>`.
2. Halaman join terbuka langsung tanpa loading berat. Menampilkan nama grup, daftar member, dan jumlah transaksi.
3. Member memilih namanya dari daftar, atau menambah nama baru kalau belum ada.
4. Pilihan disimpan ke device. Kunjungan berikutnya langsung masuk sebagai orang itu.
5. Setelah masuk, member langsung berada di dalam grup dan bisa melakukan semuanya: melihat transaksi, menambah pengeluaran, mengklaim item, melihat saldo.

Aturan keras untuk halaman ini:

- Tidak ada permintaan key, tidak ada harga, tidak ada tombol beli, tidak ada penyebutan lisensi di mana pun sepanjang alur bergabung. Member yang diundang memang gratis selamanya dan halaman ini tidak boleh membuatnya ragu barang sedetik.
- Tidak ada dinding install. App berjalan penuh di tab browser biasa tanpa di-install.
- Ajakan install baru muncul setelah member menyelesaikan aksi pertamanya, dalam bentuk bar tipis yang bisa ditutup, bukan modal. Alasannya sederhana: orang yang belum melihat isinya belum punya alasan untuk install, dan prompt di detik pertama justru bikin link terasa mencurigakan.

### 4.3 Ganti identitas

- Tombol "Saya bukan [nama]" di halaman member. Satu tap untuk memilih ulang.
- Tidak ada verifikasi identitas. Ini trade-off yang disengaja dan ditulis jelas di halaman privacy.

### 4.4 Member yang juga punya lisensi

Lisensi menentukan siapa yang boleh membuat grup, bukan siapa yang boleh masuk grup. Dua hal ini tidak pernah bersinggungan.

- Pemegang lisensi yang membuka link undangan diperlakukan sama persis dengan orang tanpa lisensi. Dia bergabung sebagai member biasa.
- Bergabung ke grup orang lain tidak memakan kuota apapun dari lisensinya, tidak menghitung sebagai grup miliknya, dan tidak mempengaruhi masa aktifnya.
- Grup yang diikuti muncul di beranda dia bersama grup miliknya sendiri, dengan penanda kecil bahwa dia bukan pembuatnya.
- Kalau pengguna Free bergabung ke lima grup orang lain, batas "1 grup aktif" tidak ikut terpakai. Batas itu hanya berlaku untuk grup yang dia buat sendiri.
- Kuota scan struk tetap milik masing-masing device. Member Free yang ada di grup milik pemegang lisensi tetap dapat 3 scan per hari, bukan 30. Kuota tidak menular lewat grup.
- Fitur yang butuh lisensi di dalam grup orang lain (recurring, budget trip, export PDF) mengikuti lisensi pembuat grup, karena itu properti grup, bukan properti orang.

### 4.5 Membuka link saat app sudah ter-install

- Manifest memakai `id`, `scope`, `handle_links: preferred`, dan `launch_handler` dengan `client_mode: focus-existing`.
- Di Android dan desktop Chromium, link `bagibill.app` yang ditap akan membuka app yang sudah ter-install, bukan tab browser baru. Ini perlu Digital Asset Links (`/.well-known/assetlinks.json`) supaya penangkapan link disetujui sistem tanpa dialog.
- Kalau app sudah terbuka, link masuk ke jendela yang sama dan langsung menavigasi ke grupnya. Tidak pernah membuka instance kedua.
- Di iOS tidak ada penangkapan link untuk PWA. Link terbuka di Safari, dan itu tetap berfungsi penuh. Halaman mendeteksi kondisi ini lewat `getInstalledRelatedApps` dan menampilkan bar tipis "buka di BagiBill" yang bisa diabaikan.
- Semua rute publik (`/j/`, `/c/`, `/v/`, `/q/`) berada dalam scope manifest supaya ikut tertangkap.
- Kalau device sudah pernah bergabung ke grup itu, membuka link tidak menanyakan identitas lagi. Langsung masuk sebagai orang yang sama.

### 4.6 Keamanan link

Slug 128 bit tidak bisa ditebak. Risikonya bukan tebakan, tapi link yang bocor karena diteruskan di grup chat atau kena screenshot. Kontrolnya berlapis dan semuanya opsional kecuali yang dua terakhir.

- Tutup pendaftaran. Setelah semua orang bergabung, pembuat menekan satu tombol. Link tetap bekerja untuk device yang sudah terdaftar, tapi device baru yang membukanya cuma dapat tampilan hanya baca. Ini kontrol paling kuat sekaligus paling gampang dipahami, dan sengaja ditaruh sebagai saran otomatis begitu jumlah member berhenti bertambah selama 24 jam.
- Ganti link. Membuat slug baru dan mematikan yang lama seketika. Device yang sudah bergabung tidak terpengaruh sama sekali, jadi tidak ada yang perlu diundang ulang. Dipakai kalau link telanjur bocor.
- Passcode 4 digit per grup. Diminta sekali per device baru, tidak pernah ditanya lagi setelah benar. Bukan enkripsi, cuma penghalang untuk orang yang tidak sengaja menemukan link.
- Kunci grup. Setelah semua lunas, pembuat mengunci. Semua device jadi hanya baca sampai dibuka lagi.
- Kedaluwarsa link opsional: 7 hari, 30 hari, atau tanpa batas. Default tanpa batas, karena grup roommate dan pasangan hidup bertahun-tahun dan link yang mati diam-diam adalah pengalaman terburuk yang bisa diberikan.
- Link klaim item selalu kedaluwarsa 72 jam, terpisah dari link grup.
- Link hanya baca `bagibill.app/v/<slug>` memakai slug berbeda dari link edit, supaya orang yang cuma perlu melihat tidak pernah memegang kunci untuk mengubah.
- Semua halaman bergrup dikirim dengan `noindex` dan `Referrer-Policy: no-referrer`, supaya slug tidak pernah bocor ke mesin pencari atau ke situs lain lewat header referer.
- Slug tidak pernah muncul di log server, di analytics, atau di pesan error.

### 4.7 Corong akuisisi dari link undangan

Orang yang membuka link undangan adalah calon pembeli paling berkualitas yang akan pernah dimiliki produk ini. Mereka sudah melihat app-nya bekerja, di konteks nyata, dibawa oleh teman mereka sendiri. Tapi mereka juga sedang di tengah urusan lain, jadi ajakannya harus muncul di waktu yang benar dan tidak boleh pernah terbaca sebagai syarat.

- Selama proses bergabung, mengklaim, dan menambah pengeluaran: nol ajakan. Tidak ada banner, tidak ada harga, tidak ada tombol beli.
- Titik munculnya ajakan hanya dua, keduanya setelah pekerjaan selesai:
  - Setelah member melihat layar "kamu bayar sekian" di akhir sesi klaim
  - Di bawah layar saldo grup, di luar area lipatan
- Bentuknya satu baris tenang, bukan kartu besar dan bukan modal. Isinya menyebut apa yang barusan dia rasakan, bukan menjual fitur. Contoh: "Bisa juga bikin grup sendiri, gratis untuk satu grup."
- Tombol utama mengarah ke `/?ref=join`, bukan langsung ke Gumroad. Halaman itu menawarkan mencoba gratis dulu. Menjatuhkan orang ke halaman pembayaran sebelum dia pernah membuat grup sendiri adalah cara tercepat kehilangan dia, dan lebih parah lagi, membuatnya mengira link tadi memang berbayar.
- Tombol sekunder kecil ke `/pricing` untuk yang sudah siap membeli.
- Halaman `/?ref=join` menyapa dengan konteks: menyebut bahwa dia baru saja memakai BagiBill di sebuah grup, dan menawarkan membuat grup pertamanya tanpa key.
- Setelah dia membuat grup pertama dan menyentuh batas Free, barulah tombol beli muncul dengan wajar. Di titik itu dia sudah tahu persis apa yang dibelinya.
- Footer kecil "Dibuat dengan BagiBill" di halaman hanya baca dan di PDF hasil export. Halus, dan cukup.
- Event yang dilacak: `join_cta_seen`, `join_cta_clicked`, `join_to_group_created`, `join_to_purchase`. Rasio dari yang terakhir adalah metrik pertumbuhan paling penting di produk ini.

---

## 5. Model Data

### 5.1 Entitas

```
Group
  slug, name, baseCurrency, template, createdAt,
  settings { simplifyDebts, passcodeHash, locked, archived }

Member
  memberId, groupSlug, name, color, joinedAt, paymentNote

Expense
  expenseId, groupSlug, title, category, date, notes,
  currency, fxRate, amountTotal,
  payers: [{ memberId, amount }],
  splitMode, splitData,
  charges: [{ type, mode, value, allocation, sponsorId }],
  items: [Item],
  attachments: [fileId],
  createdBy (deviceToken), createdAt, updatedAt, seq

Item
  itemId, name, qty, unitPrice,
  claims: [{ memberId, weight }],
  sponsorId

Settlement
  settlementId, groupSlug, fromMemberId, toMemberId,
  amount, currency, date, note, createdAt

ActivityLog
  logId, groupSlug, actorMemberId, action, targetId, before, after, at
```

### 5.2 Aturan penyimpanan

- Angka uang disimpan sebagai integer minor unit (rupiah sebagai integer polos, dolar sebagai sen). Tidak pernah float.
- Setiap perubahan menaikkan `seq` yang diberikan server. Client menggunakan ini untuk deteksi konflik.
- Penghapusan adalah soft delete dengan `deletedAt`, dibersihkan permanen setelah 30 hari.
- Attachment disimpan sebagai object storage dengan URL bertanda tangan, kedaluwarsa 1 jam, di-cache lokal.

---

## 6. Cara Pembagian

Setiap pengeluaran punya satu mode split. Mode dipilih dari tab horizontal di layar tambah pengeluaran. Default selalu Rata.

### 6.1 Rata

- Total dibagi sama rata ke semua member yang dicentang.
- Semua member tercentang secara default. Menghilangkan orang adalah uncheck, bukan check.
- Contoh penggunaan: parkir, bensin, sewa villa.

### 6.2 Nominal

- Ketik angka per orang.
- Baris status di bawah menampilkan sisa yang belum teralokasi secara realtime, dengan tombol "bagi sisanya rata".
- Boleh melebihi total. Kalau lebih, app memberi peringatan tapi tidak memblokir.

### 6.3 Persentase

- Input persen per orang, dua desimal.
- Tombol "ratakan sisanya" membagi persentase yang tersisa ke orang yang belum diisi.
- Harus 100% untuk disimpan. Selisih di bawah 0,01% dibulatkan otomatis.

### 6.4 Porsi

Porsi adalah bobot relatif, bukan jumlah absolut. Ini yang membuat satu porsi bisa dibagi berapapun orang tanpa user menghitung pecahan.

- Setiap member punya bobot, default 1.
- Kontrol input: tombol minus dan plus, ditambah preset cepat 1/2, 1/3, 1/4, dan input manual.
- Bagian setiap orang = bobotnya dibagi total bobot, dikali total tagihan.
- Contoh: nasi goreng jumbo dimakan bertiga. Ketiganya bobot 1. Masing-masing bayar sepertiga.
- Contoh: A makan dobel dari B dan C. Bobot 2, 1, 1. A bayar setengah.
- Bobot 0 berarti ikut tercatat tapi tidak bayar. Berguna untuk anak kecil atau tamu.

### 6.5 Selisih

Nama mode ini di UI adalah **Selisih**. Identifier di kode adalah `adjustment`, kunci i18n `expense.mode.adjustment`. Nama lama "Penyesuaian" tidak dipakai lagi di layar manapun.

- Semua bagi rata, lalu tambahan tetap per orang.
- Contoh: makan bersama 200 ribu, si B pesan tambahan es teh 8 ribu. B kena rata plus 8 ribu, sisanya dibagi rata.
- Bagian rata dihitung ulang setelah penyesuaian diambil, yaitu (total dikurangi jumlah seluruh penyesuaian) dibagi jumlah orang. Bukan total dibagi orang lalu ditambahi.
- Tambahan boleh negatif untuk potongan personal.
- Potongan boleh lebih besar dari bagian rata. Orang itu berakhir minus, artinya dia menerima uang kembali, dan angkanya ditampilkan apa adanya. Tidak diklamp ke nol karena itu menyembunyikan uang, dan tidak ditolak karena niatnya sah.

### 6.6 Per Item

- Item dari struk, hasil scan atau input manual.
- Setiap item punya qty dan harga satuan.
- Setiap item diklaim oleh satu atau lebih member, masing-masing dengan bobot.
- Bobot klaim bekerja persis seperti mode Porsi tapi di level item.
- Indikator per item: `2/3 diklaim`, `1/1 diklaim`, `belum diklaim`.
- Kalau total bobot klaim tidak sama dengan qty, pembagian tetap proporsional dan app menampilkan catatan kecil, bukan error. Orang sering hanya mencicip.
- Tombol "bagi item ini ke semua" untuk item bersama seperti nasi putih atau air mineral.
- Tombol "bagi rata semua sisa" di layar review untuk item yang tidak diklaim siapapun.

### 6.7 Pembayar

- Pembayar bisa lebih dari satu orang. Input daftar `member: nominal`.
- Pembayar tidak wajib termasuk yang menikmati. Orang bisa membayarkan tanpa ikut makan.
- Kalau pembayar tunggal, UI hanya menampilkan satu chip nama, tidak ada form tambahan.
- Validasi: total yang dibayar harus sama dengan total tagihan.

### 6.8 Pola tersimpan

- Kombinasi mode split dan bobot bisa disimpan sebagai pola bernama per grup.
- Contoh: pasangan yang selalu 60/40 menyimpannya sekali, lalu satu tap untuk pemakaian berikutnya.
- Maksimum 5 pola per grup agar tidak jadi menu panjang.

### 6.9 Pembulatan

- Sisa pembulatan tidak pernah hilang dan tidak pernah muncul dari udara.
- Aturan: sisa dalam minor unit dibagikan satu per satu ke member, urut dari yang bagian pecahannya terbesar (metode largest remainder).
- Untuk mata uang tanpa desimal seperti IDR dan JPY, minor unit adalah 1.
- User tidak pernah diminta memutuskan soal ini.

---

## 7. Biaya Tambahan

Berlaku di atas subtotal item atau di atas total, tergantung mode split.

### 7.1 Jenis

- Pajak (PPN, PB1, VAT, sales tax)
- Service charge
- Tip
- Ongkos kirim
- Biaya aplikasi atau biaya layanan
- Diskon (nilai negatif)
- Biaya custom bernama bebas, maksimum 3

### 7.2 Input

- Setiap komponen bisa persen atau nominal, toggle satu tap.
- Preset kontekstual berdasarkan locale grup:
  - Indonesia: service charge 5%, PB1 10%
  - Amerika Serikat: tip 15%, 18%, 20%, 25%
  - Eropa: VAT sesuai negara, tip 5% dan 10%
- Preset bisa diubah dan disimpan sebagai default grup.

Urutan hitung untuk Indonesia, dan ini yang paling sering salah: service charge dihitung dari subtotal, lalu PB1 dihitung dari subtotal ditambah service charge. Bukan dua-duanya dari subtotal. Kalau urutannya dibalik hasilnya meleset sekitar setengah persen, cukup untuk membuat orang mengira app-nya salah hitung.

PB1 adalah pajak daerah dan tarifnya ditetapkan masing-masing kabupaten atau kota, dengan 10% sebagai batas atas yang dipakai hampir semua daerah. Jadi angkanya wajib bisa diubah dan perubahannya diingat per grup. Jangan menamainya PPN di kode maupun di layar, karena itu pajak yang berbeda dan salah nama di sini langsung menghilangkan kepercayaan orang yang paham pajak. Restoran di Indonesia dikenai PB1, bukan PPN.

Locale di luar tiga di atas defaultnya nol dan diisi sendiri.

### 7.3 Alokasi

Setiap komponen punya mode alokasi sendiri:

- Proporsional: sesuai porsi masing-masing orang atas subtotal. Ini default untuk pajak dan service.
- Rata: dibagi sama rata ke semua peserta. Default untuk biaya aplikasi.
- Ditanggung satu orang: pilih member, komponen itu keluar dari perhitungan orang lain. Default untuk ongkir kalau dipilih.
- Diskon punya mode tambahan: berlaku ke item tertentu saja, untuk voucher menu spesifik.

### 7.4 Traktir

Pola sosial yang sering terjadi dan hampir selalu tidak tertangani di app lain. Ditangani di tiga level.

- Level komponen: "pajaknya dari saya". Pilih penanggung di komponen itu.
- Level item: tap item lalu "ditraktir oleh". Item keluar dari tagihan orang lain, masuk ke penanggung.
- Level orang: "saya traktir Rina". Seluruh bagian Rina pindah ke penanggung. Rina tetap muncul di rincian dengan nominal nol, bukan hilang dari struk.
- Traktir sebagian: nominal tetap dari bagian seseorang. Contoh "saya tanggung 50 ribu dari bagian Rina".
- Semua traktiran muncul eksplisit di ringkasan: "Andi menanggung pajak Rp 45.000". Transparansi mencegah salah paham belakangan.

### 7.5 Preview

- Panel hasil selalu terlihat di bawah form, tidak perlu tombol hitung dan tidak perlu pindah halaman.
- Setiap perubahan input memperbarui panel dalam satu frame.
- Panel menampilkan: nama, nominal akhir, dan baris kecil rinciannya (subtotal + pajak + service).
- Tap pada baris membuka rincian penuh per orang.

---

## 8. Scan Struk

### 8.1 Alur

1. Kamera atau pilih dari galeri atau terima dari share sheet sistem.
2. Auto-crop dan koreksi perspektif di device sebelum diunggah, untuk menekan ukuran dan mempercepat OCR.
3. Unggah, proses, hasil kembali sebagai daftar item yang bisa diedit.
4. Layar edit item: nama, qty, harga satuan. Semua field bisa dikoreksi.
5. Lanjut ke layar assign atau langsung share link Claim.

### 8.2 Provider

Memakai model multimodal Gemini Flash, bukan OCR klasik. Alasannya bukan soal tren.

- OCR klasik mengembalikan teks mentah, lalu masih butuh parser buatan sendiri untuk menebak mana nama item, mana qty, mana harga. Parser itu rapuh dan harus ditulis ulang tiap kali ketemu format struk baru. Model multimodal mengembalikan struktur jadi dalam satu panggilan.
- Struk Indonesia, Jepang, Thailand, dan Eropa punya tata letak yang jauh berbeda. Model multimodal menangani semuanya tanpa aturan per negara.
- Struk kusut, buram, miring, dan struk thermal yang mulai pudar tetap terbaca jauh lebih baik.
- Struk tulisan tangan, yang sering terjadi di warung, tetap bisa dicoba.
- Biaya per gambar sangat rendah pada tier Flash, dan masih masuk akal untuk kuota 30 scan per hari per pemegang lisensi.

Aturan implementasi:

- Panggilan hanya dari backend. Kunci API tidak pernah menyentuh client.
- Memakai structured output dengan JSON schema yang dikunci. Model tidak diminta menulis prosa lalu diurai belakangan.
- Suhu diset nol. Ini tugas ekstraksi, bukan tugas kreatif.
- Prompt menyertakan mata uang yang diharapkan dan bahasa grup sebagai petunjuk, bukan sebagai paksaan.
- Model diminta mengembalikan `confidence` per field dan menandai `null` untuk yang tidak terbaca, bukan menebak. Field bernilai null muncul di UI sebagai kolom kosong yang menunggu diisi, dan itu jauh lebih baik daripada angka salah yang terlihat meyakinkan.
- Semua angka divalidasi ulang di backend dengan aritmatika biasa. Model tidak pernah dipercaya untuk penjumlahan. Kalau jumlah item plus biaya tidak cocok dengan total, selisihnya ditampilkan ke pengguna.
- Gambar dikirim setelah dikompres di device, tidak pernah dalam resolusi penuh.
- Gambar tidak dikirim ke provider untuk keperluan pelatihan, dan ini dinyatakan di halaman privacy.
- Provider dibungkus satu adapter dengan antarmuka `(image) => ReceiptDraft`. Mengganti model atau menambah provider cadangan tidak boleh menyentuh kode lain.
- Timeout 15 detik dengan satu kali percobaan ulang. Gagal berarti kembali ke input manual, bukan jalan buntu.
- Latensi tipikal 2 sampai 5 detik. Selama menunggu, layar menampilkan gambar struk yang sudah dipotong dengan skeleton baris item, bukan spinner kosong.

### 8.3 Ekstraksi

- Yang diambil: nama merchant, tanggal, daftar item dengan qty dan harga, subtotal, pajak, service charge, diskon, total.
- Mata uang dideteksi dari simbol dan format angka pada struk.
- Validasi silang: kalau jumlah item plus biaya tidak sama dengan total tertera, tampilkan peringatan dengan selisihnya dan tawarkan "tambahkan sebagai item lain-lain".
- Struk yang tidak terbaca sama sekali tidak menghabiskan kuota harian.

### 8.4 Kuota

- Free: 3 scan per hari, reset pukul 00:00 waktu device.
- Berlisensi: 30 scan per hari.
- Kuota dicatat di server per `deviceToken`, dengan bucket rate limit sekunder per IP untuk mencegah penyalahgunaan massal.
- Sisa kuota ditampilkan kecil di layar scan. Ajakan membeli hanya muncul saat kuota habis, satu kali, dengan tombol tutup yang jelas.

### 8.5 Penyimpanan

- Foto struk melekat ke pengeluaran dan bisa dibuka kapanpun.
- Kompresi ke maksimum 1600px sisi panjang, WebP kualitas 80.
- Foto ikut terhapus saat pengeluaran atau grup dihapus.

---

## 9. Mode Claim

Fitur pembeda utama. Pembuat menyiapkan struk, semua orang mengklaim bagiannya dari browser masing-masing tanpa install apapun.

### 9.1 Alur

1. Pembuat scan atau input item, lalu tekan "Minta semua klaim".
2. App membuat link `bagibill.app/c/<slug>/<expenseId>` dan membuka share sheet.
3. Setiap orang membuka link, memilih namanya, lalu menandai item yang dia makan.
4. Pembuat melihat progres masuk secara realtime.
5. Pembuat menekan Finalisasi. Semua layar member berubah jadi ringkasan "kamu bayar sekian".

### 9.2 Mencegah klaim ganda tidak sengaja

- Avatar orang yang sudah mengklaim tampil menempel di item, terkirim ke semua device di bawah satu detik.
- Counter per item: `1/1`, `2/3`, `belum diklaim`. Item yang sudah penuh diredupkan tapi tetap bisa ditap.
- Kalau item yang sudah penuh ditap orang lain, muncul konfirmasi kecil: "Rina sudah klaim ini. Bagi berdua?" dengan dua tombol. Klaim ganda yang disengaja tetap bisa, yang tidak sengaja tertahan.
- Presence: titik berwarna di header menampilkan siapa yang sedang membuka layar ini. Membuat orang sadar ini kolaboratif.
- Progress bar: "9 dari 14 item terklaim". Item yang belum diklaim naik otomatis ke atas daftar.
- Optimistic update di client, dikonfirmasi server dengan sequence number per item. Dua tap bersamaan tidak saling menimpa, yang kalah race menerima state terbaru tanpa pesan error.

### 9.3 Layar review pembuat

Sebelum finalisasi, pembuat melihat tiga hal:

- Item tanpa klaim, disorot merah, dengan tombol "bagi rata sisanya"
- Item yang diklaim melebihi qty, disorot kuning, informatif saja
- Total yang belum teralokasi dalam rupiah atau mata uang grup

Finalisasi diblokir kalau masih ada item tanpa klaim, kecuali pembuat menekan "bagi rata sisanya".

### 9.4 Setelah finalisasi

- Layar member jadi read-only, menampilkan nominal akhir dan rincian item mereka.
- Ada tombol "ada yang salah" yang mengirim notifikasi ke pembuat, bukan membuka kembali edit untuk semua orang.
- Pembuat bisa membuka kembali sesi klaim kapan saja.

### 9.5 Kedaluwarsa

- Link klaim aktif 72 jam, lalu otomatis ditutup dan sisa item dibagi rata.
- Angka ini bisa diubah pembuat.

---

## 10. Multi Mata Uang

- Mendukung seluruh mata uang ISO 4217 yang aktif, sekitar 160.
- Setiap grup punya mata uang dasar. Setiap pengeluaran boleh memakai mata uang lain.
- Kurs diambil saat pengeluaran dibuat lalu dikunci sebagai snapshot pada tanggal transaksi. Settlement tidak berubah-ubah tiap hari.
- Kurs bisa ditimpa manual untuk yang menukar uang di money changer dengan rate berbeda.
- Sumber kurs: dua provider dengan fallback otomatis. Provider utama untuk mata uang mayor, provider sekunder untuk cakupan luas termasuk IDR, VND, PKR, NGN, EGP.
- Kurs di-cache di server dan disegarkan sekali sehari. Client tidak pernah memanggil provider langsung.
- Kurs historis dipakai untuk transaksi bertanggal mundur.
- Picker mata uang: daftar terakhir dipakai di atas, pencarian berdasarkan kode, nama mata uang, atau nama negara, dan saran otomatis dari timezone device.
- Tampilan bisa di-toggle antara mata uang asli dan mata uang grup di setiap baris.
- Presisi desimal mengikuti standar per mata uang: 0 untuk IDR, JPY, KRW, VND; 2 untuk mayoritas; 3 untuk KWD, BHD, OMR.
- Format angka mengikuti locale tampilan, bukan mata uang. Pemisah ribuan dan desimal tidak boleh tertukar.
- Kripto tidak didukung.

---

## 11. Settle Up

### 11.1 Perhitungan saldo

- Saldo bersih per member = total yang dia bayar dikurangi total bagiannya, dalam mata uang dasar grup.
- Multi pembayar ditangani penuh di perhitungan ini.
- Rincian per pasangan tetap disimpan meskipun mode Simplify aktif, supaya bisa ditelusuri.

### 11.2 Dua mode

- Simplify: minimasi jumlah transfer. Algoritma greedy pada daftar debitur dan kreditur terurut, dengan penanganan sisa pembulatan. Lima orang dengan 20 transaksi bisa selesai dengan 3 transfer.
- Langsung: utang tetap per pasangan, tidak digabung. Sebagian orang tidak nyaman diminta transfer ke orang yang tidak pernah mereka utangi.
- Toggle ada di pengaturan grup, default Simplify.

### 11.3 Pelunasan

- Pembayaran sebagian diperbolehkan. Sisanya tetap tercatat.
- Pelunasan dicatat sebagai entri tersendiri dengan tanggal dan catatan, bisa di-undo.
- Riwayat pelunasan punya tab sendiri, terpisah dari daftar pengeluaran.
- Tombol "sudah lunas semua" untuk menutup grup sekaligus.

### 11.4 Catatan pembayaran

- Satu field teks bebas per member, isinya terserah: nomor rekening, IBAN, tag e-wallet, apapun.
- App tidak memproses pembayaran, tidak menyimpan struktur per negara, tidak punya logika perbankan.
- Teks ini muncul di layar settle dengan tombol salin.

### 11.5 Tagih

- Menghasilkan teks siap kirim berisi nama grup, nominal, dan catatan pembayaran penerima kalau ada.
- Dibuka lewat share sheet sistem, tujuan terserah pengguna.
- Bahasa teks mengikuti bahasa app.

---

## 12. Fitur Grup

### 12.1 Pembuatan

- Template: Trip, Roommate, Pasangan, Acara sekali jalan, Kosong.
- Template menentukan kategori default, mode simplify, dan apakah recurring diaktifkan.
- Member ditambah dengan mengetik nama. Mereka tidak perlu melakukan apapun.

### 12.2 Anggota

- Member bisa ditambah kapan saja tanpa mempengaruhi transaksi sebelumnya.
- Member yang bergabung di tengah tidak otomatis kena pengeluaran sebelum tanggal bergabungnya.
- Member yang sudah punya transaksi tidak bisa dihapus, hanya dinonaktifkan. Dia hilang dari pilihan default tapi tetap ada di riwayat.
- Nama mirip dicegat saat diketik, bukan diselesaikan belakangan lewat sistem alias otomatis. Begitu nama baru cukup mirip dengan yang sudah ada, muncul peringatan halus di tempat: "Sudah ada Dimas, ini orang yang beda?" Satu tap untuk lanjut, satu tap untuk mengubah jadi Dimas P.
- Kemiripan diukur dari nama yang dinormalisasi, jadi "dimas", "Dimas ", dan "DIMAS" dianggap sama.
- Nama yang persis sama tetap boleh dibuat kalau pengguna memilih lanjut, karena dua orang bernama sama memang ada. Yang tidak boleh adalah membuatnya tanpa disadari.

### 12.3 Kategori

Delapan kategori default. Kunci memakai bahasa Inggris supaya seragam dengan sisa kode.

| Kunci | id | en | Ikon |
|---|---|---|---|
| `food` | Makan | Food | `utensils-crossed` |
| `transport` | Transport | Transport | `car-front` |
| `stay` | Akomodasi | Stay | `bed-double` |
| `shopping` | Belanja | Shopping | `shopping-bag` |
| `fun` | Hiburan | Fun | `ticket` |
| `bills` | Tagihan | Bills | `receipt` |
| `health` | Kesehatan | Health | `heart-pulse` |
| `other` | Lain-lain | Other | `circle-ellipsis` |

Nama ikon mengikuti Lucide, di-inline sebagai SVG. Delapan ikon tidak sepadan dengan menarik satu dependensi.

- Kategori kustom dengan pemilihan ikon dan warna, mengikuti aturan warna yang sama di bagian 18.1.
- Kategori disarankan otomatis dari kata kunci judul dan nama merchant hasil scan.

### 12.4 Recurring

- Interval: harian, mingguan, bulanan, tanggal tertentu tiap bulan, custom.
- Muncul sebagai draft yang perlu dikonfirmasi, tidak pernah masuk diam-diam.
- Draft yang tidak dikonfirmasi dalam 7 hari kedaluwarsa dan diberitahukan.
- Nominal bisa tetap atau diminta setiap kali (untuk listrik yang berubah).

### 12.5 Pencarian dan filter

- Filter: orang, kategori, rentang tanggal, rentang nominal, mata uang, punya lampiran.
- Pencarian teks pada judul, catatan, dan nama item.
- Filter bisa disimpan sebagai tampilan cepat.

### 12.6 Ringkasan grup

- Total pengeluaran, rata-rata per orang, rata-rata per hari.
- Pecahan per kategori dengan bagan donat.
- Pecahan per orang dengan bagan batang.
- Garis waktu pengeluaran harian.
- Fakta ringan: hari paling boros, kategori terbesar, pengeluaran terbesar.

### 12.7 Budget trip

- Set target budget grup. Bar progres menampilkan terpakai dan sisa.
- Laju harian dan proyeksi: "dengan laju ini, budget habis di hari ke-4 dari 6".
- Peringatan di 80% dan 100%.

### 12.8 Kolaborasi

- Komentar per pengeluaran, dengan nama pengomentar.
- Riwayat aktivitas: siapa mengubah apa, kapan, dari nilai berapa ke berapa.
- Lampiran tambahan selain struk, maksimum 5 per pengeluaran.

### 12.9 Siklus hidup

- Arsip untuk grup yang selesai. Hilang dari daftar utama, tetap bisa dibuka.
- Duplikat grup dengan member yang sama untuk trip berikutnya.
- Hapus permanen yang benar-benar menghapus di server dalam 30 hari.

### 12.10 Export

- CSV: satu baris per pengeluaran, plus file kedua satu baris per bagian orang.
- PDF: ringkasan rapi dengan saldo, daftar transaksi, dan bagan. Untuk dikirim ke grup chat.
- Salin sebagai teks: ringkasan singkat untuk ditempel di chat.

---

## 13. Quick Split

Kalkulator instan tanpa grup. Pintu masuk paling ringan dan alasan paling sering membuka app.

- Input: total, jumlah orang, tip atau pajak opsional.
- Hasil langsung, besar, mudah dibaca sambil berdiri di kasir.
- Mode pembagian tidak rata: geser nilai per orang, sisanya menyesuaikan otomatis.
- Bisa dibagikan sebagai link hasil tanpa membuat grup dan tanpa key.
- Tombol "jadikan grup" kalau ternyata perlu lanjut.
- Riwayat 10 perhitungan terakhir, lokal saja.

---

## 14. Dashboard dan Recap

### 14.1 Dashboard pribadi

- Lintas semua grup di device ini.
- Total keluar bulan ini, per kategori, tren tiga bulan.
- Total yang orang lain utangi ke saya, dan sebaliknya.
- Grup dengan saldo belum selesai, diurutkan dari yang paling tua.

### 14.2 Recap

- Recap bulanan otomatis, muncul di tanggal 1.
- Recap tahunan di akhir Desember.
- Isi: total patungan, jumlah acara, orang yang paling sering bareng, kategori favorit, bulan paling boros.
- Bisa dibagikan sebagai kartu gambar 1080x1350 yang dihasilkan di device dengan Canvas. Tidak ada data mentah di dalamnya kecuali yang dipilih pengguna.
- Bisa dimatikan.

### 14.3 Pengingat

- Utang yang lewat 7 hari memunculkan pengingat halus, sekali per minggu, maksimum 3 kali.
- Notifikasi push opsional, izin diminta hanya setelah pengguna membuat pengeluaran pertama.

---

## 15. Sync dan Offline

### 15.1 Arsitektur

- Local-first. IndexedDB sebagai sumber kebenaran di device.
- Semua aksi berjalan tanpa jaringan, masuk antrian mutasi, dikirim saat online.
- Model mutasi bersifat append-only per pengeluaran. Dua orang menambah transaksi bersamaan tidak pernah bentrok.
- Konflik hanya mungkin pada pengeluaran yang sama. Resolusi per field dengan last-write-wins berdasarkan timestamp server, plus banner "ada perubahan dari device lain" dengan tombol lihat.
- Klaim item punya sequence number per item di server, jadi klaim bersamaan diselesaikan deterministik.

### 15.2 Realtime

- WebSocket per grup untuk mode Claim dan presence.
- Fallback ke polling 3 detik kalau WebSocket gagal.
- Realtime hanya aktif saat layar grup terbuka. Tidak ada koneksi menganggur di latar.

### 15.3 Indikator

- Ikon sync kecil di header, tiga state: tersinkron, mengirim, offline.
- Tidak ada dialog error yang memblokir. Kegagalan sync tidak pernah menghentikan pemakaian.
- Antrian mutasi bisa dilihat di Settings untuk debugging.

---

## 16. Privacy dan Analytics

### 16.1 Yang tidak pernah dikumpulkan

- Email, nomor telepon, nama asli, kontak.
- Isi transaksi, nominal spesifik, nama grup, nama member, foto struk.
- IP mentah yang disimpan permanen. Hanya dipakai sesaat untuk rate limit, tidak dicatat.

### 16.2 Analytics anonim

- Self-host, bukan Google Analytics. Endpoint sendiri atau Umami/Plausible yang di-host sendiri.
- Identifier: UUID acak per device, tidak terhubung ke apapun, bisa direset pengguna.
- Event yang dicatat:
  - `app_open`, `pwa_installed`
  - `group_created` dengan properti template
  - `expense_added` dengan properti split_mode, punya_item, jumlah_member (bucket)
  - `scan_started`, `scan_success`, `scan_failed` dengan properti alasan gagal
  - `claim_link_shared`, `claim_link_opened`, `claim_finalized` dengan properti jumlah item dan jumlah pengklaim
  - `settle_completed` dengan properti mode
  - `quick_split_used`
  - `key_activated`, `key_expired_seen`, `renewal_clicked`
  - `currency_selected` dengan kode mata uang
  - `language_changed`
- Nominal, kalau perlu, dikirim sebagai bucket kasar tanpa angka pasti.
- Ditulis apa adanya di halaman privacy dengan bahasa manusia, bukan legalese.

### 16.3 Kontrol pengguna

- Toggle mematikan analytics di Settings, dihormati sepenuhnya.
- Tombol hapus semua data lokal.
- Tombol hapus grup permanen di server.

---

## 17. Halaman

### 17.1 Publik

- `/` Landing. Satu kalimat proposisi nilai, demo interaktif yang bisa langsung dicoba di halaman tanpa install, perbandingan singkat dengan kompetitor, harga, FAQ, tombol beli. Bahasa mengikuti locale browser.
- `/pricing` Harga dan isi tiap tier.
- `/privacy` Kebijakan privasi.
- `/terms` Ketentuan layanan dan kebijakan refund.
- `/changelog` Catatan rilis.

### 17.2 Aplikasi

- `/app` Beranda. Daftar grup dengan nama, jumlah member, dan posisi saya di grup itu. Kartu Quick Split di atas. Grup arsip di bawah lipatan.
- `/app/new` Buat grup. Nama, mata uang, template, member. Satu layar.
- `/app/quick` Quick Split.
- `/app/dashboard` Dashboard pribadi lintas grup.
- `/app/settings` Bahasa, tema, format angka, status lisensi, kelola device, recovery code, analytics, hapus data.
- `/activate` Aktivasi key. Satu input, satu tombol.
- `/welcome` Layar pertama kali: pilih bahasa, lalu satu layar sambutan. Hanya muncul sekali, dilewati sepenuhnya oleh orang yang masuk lewat link undangan.

### 17.3 Grup

- `/g/:slug` Detail grup dengan tiga tab:
  - Transaksi: daftar kronologis, dikelompokkan per tanggal, tap untuk edit
  - Saldo: siapa utang ke siapa, plus tombol ke settle
  - Ringkasan: bagan dan statistik
- `/g/:slug/add` Tambah pengeluaran. Judul, nominal, mata uang, pembayar, peserta, mode split, biaya tambahan, preview. Satu layar dengan bagian yang bisa dilipat.
- `/g/:slug/e/:id` Detail dan edit pengeluaran, termasuk komentar dan riwayat perubahan.
- `/g/:slug/scan` Scan struk dan editor item.
- `/g/:slug/settle` Daftar transfer yang disarankan, tandai lunas, riwayat pelunasan.
- `/g/:slug/members` Kelola member dan catatan pembayaran.
- `/g/:slug/settings` Mata uang, mode simplify, passcode, budget, recurring, export, arsip, hapus.

### 17.4 Tanpa lisensi

- `/j/:slug` Halaman bergabung untuk yang diundang.
- `/c/:slug/:expenseId` Halaman klaim item.
- `/v/:slug` Tampilan hanya baca.
- `/q/:id` Hasil Quick Split yang dibagikan.

---

## 18. Sistem Visual

### 18.1 Ikon

- Satu keluarga ikon untuk UI, tanpa campuran. Stroke seragam 2 (K-22).
- Ikon kategori memakai set terpisah, tapi warnanya diatur oleh permukaan tempat dia muncul, bukan oleh kategorinya.

Warna di app ini sudah punya pemilik, yaitu orang. Kalau kategori ikut berwarna, dua sistem warna bertabrakan di layar yang sama dan orang berhenti mempercayai keduanya. Jadi:

- Di permukaan yang menampilkan orang, yaitu daftar transaksi, saldo, dan klaim, ikon kategori monokrom memakai warna teks sekunder. Yang membedakan kategori adalah bentuk ikonnya.
- Di permukaan yang murni kategori dan tidak menampilkan orang sama sekali, yaitu Ringkasan, filter, dan bagan, kategori boleh berwarna penuh.

Token `--cat-*` hanya boleh dipakai di kelompok kedua.
- Optical alignment: bentuk bulat sedikit lebih besar dari bentuk kotak agar terbaca setara.
- Animasi mikro pada perubahan state, misalnya centang yang tergambar. Durasi 150 sampai 250 milidetik, dimatikan kalau `prefers-reduced-motion`.

### 18.2 Tipografi

- Satu keluarga sans variable untuk seluruh antarmuka.
- Angka memakai tabular figures di semua tempat yang menampilkan uang, supaya kolom lurus.
- Skala: 12, 14, 16, 20, 24, 32, 44. Nominal utama di 32 atau 44.
- Tinggi baris longgar untuk teks, rapat untuk angka.

### 18.3 Warna

- Palet netral sebagai dasar, satu warna merek, dan warna semantik untuk piutang (positif) dan utang (negatif).
- Warna per member dipilih dari palet 12 warna dengan kontras terjamin, ditetapkan otomatis dan bisa diganti.
- Dark mode bukan inversi. Permukaan gelap dengan elevasi berbeda, bukan hitam pekat.
- Kontras minimum 4.5:1 untuk teks, 3:1 untuk elemen antarmuka.

### 18.4 Layout dan interaksi

- Target sentuh minimum 44 piksel. App ini dipakai sambil berdiri di kasir dengan satu tangan.
- Aksi utama di jangkauan ibu jari, di bawah layar.
- Tidak ada modal bertingkat. Tidak ada wizard multi langkah untuk hal sederhana.
- Bottom sheet untuk pilihan, halaman penuh untuk form panjang.
- Undo muncul sebagai toast selama 6 detik untuk setiap aksi destruktif.
- Empty state mengajari, bukan gambar kosong. Setiap empty state punya satu aksi jelas.
- Skeleton untuk pemuatan, bukan spinner.
- Haptic ringan pada tap penting: klaim item, finalisasi, tandai lunas.

### 18.5 Identitas visual member

Warna dan inisial adalah dua penanda yang bekerja berpasangan, bukan pengganti nama.

- Inisial diambil dari kata, bukan dari huruf. "Dimas Prasetyo" jadi DP, "Dina Kartika" jadi DK. Sebagian besar tabrakan hilang di langkah ini tanpa logika tambahan.
- Kalau namanya cuma satu kata dan inisialnya tetap bertabrakan, inisial tidak dipanjangkan. Dimas dan Dina sama-sama tetap D. Yang membedakan adalah warna, dan nama depan yang ikut ditampilkan di sebelahnya.
- Warna diambil dari palet 12 warna identitas (`--m-1` sampai `--m-12`), diberikan berurutan sesuai nomor supaya grup yang sama selalu menghasilkan warna yang sama. Ditetapkan sekali saat member masuk dan tidak pernah berubah, termasuk saat dia dinonaktifkan.
- Member ketiga belas dan seterusnya mengulang dari `--m-1`, dibedakan dengan cincin luar putus-putus pada avatarnya. Rona tidak ditambah, karena warna baru berarti warna yang kontrasnya belum pernah diuji. Warna yang sama tetap tidak boleh diberikan ke dua orang yang inisialnya sama.
- Avatar tanpa nama hanya boleh muncul di tumpukan avatar header grup, tempat yang memang sempit dan tidak dipakai untuk mengambil keputusan.
- Di layar klaim item dan di layar settle up, nama wajib mendampingi avatar. Di dua layar itu salah baca berarti salah bayar, dan penggunanya sering baru pertama kali membuka app.
- Warna member tidak pernah jadi satu-satunya pembawa informasi. Di mana pun warna dipakai untuk membedakan orang, ada teks yang menyertainya.

### 18.6 Onboarding

Prinsipnya: onboarding terbaik adalah yang membuat orang menyelesaikan sesuatu, bukan yang membacakan fitur. Tidak ada carousel tiga slide berisi ilustrasi dan janji.

Alur pertama kali membuka app:

1. Layar bahasa. Dua tombol. Selesai dalam satu tap.
2. Satu layar sambutan yang menjelaskan produk dalam satu kalimat dan satu tombol "Mulai". Tidak ada slide kedua dan ketiga.
3. Langsung ke pembuatan grup pertama, dengan form yang sudah terisi contoh masuk akal: nama grup "Makan bareng", mata uang dari timezone, dua kolom nama member kosong. Semuanya bisa diubah atau dilewati.
4. Setelah grup jadi, satu coach mark tunggal menunjuk tombol tambah pengeluaran. Satu, bukan tur lima langkah.
5. Setelah pengeluaran pertama tersimpan, muncul saran berikutnya secara kontekstual: bagikan link ke teman. Ini disajikan sebagai langkah alami, bukan tutorial.

Aturan pendukung:

- Tombol lewati selalu ada dan selalu terlihat, tidak disamarkan jadi teks abu tipis.
- Ada grup contoh berlabel "Contoh" di beranda yang bisa dibuka untuk melihat app dalam keadaan terisi. Isinya makan malam berlima dengan struk, klaim item, dan saldo yang sudah jalan. Bisa dihapus satu tap dan tidak pernah muncul lagi.
- Pengetahuan lanjutan tidak diajarkan di awal. Mode porsi, traktir, dan multi pembayar diperkenalkan lewat tip sekali muncul di tempat fiturnya berada, dipicu oleh perilaku. Contoh: setelah pengguna memakai mode Rata lima kali lalu mengedit hasilnya secara manual, baru muncul tip tentang mode Porsi.
- Onboarding untuk member yang bergabung lewat link berbeda dan jauh lebih pendek: pilih nama, selesai. Tidak ada layar bahasa, tidak ada layar sambutan, tidak ada coach mark kecuali di layar klaim yang memang perlu satu petunjuk soal cara menandai item.
- Seluruh onboarding harus bisa diselesaikan tanpa koneksi internet.

### 18.7 Empty state

Ilustrasi maskot atau gambar 3D stok tidak dipakai. Keduanya menua cepat, menambah berat bundle, dan membuat app terasa seperti template. Yang dipakai adalah ilustrasi garis buatan sendiri dalam SVG, satu warna netral plus satu aksen merek, gaya yang sama dengan set ikon, dan ukurannya kecil. Berat total seluruh ilustrasi di app dijaga di bawah 15 KB.

Setiap empty state punya tiga bagian: ilustrasi kecil, satu kalimat yang menjelaskan apa yang akan muncul di sini, dan satu tombol aksi utama. Tidak ada paragraf.

- Beranda tanpa grup: ilustrasi dua garis membentuk struk kosong. "Grup pertama kamu akan muncul di sini." Tombol: Buat grup.
- Grup tanpa transaksi: pratinjau hantu berupa satu baris transaksi contoh yang diredupkan, jadi orang langsung paham bentuk yang akan muncul. Tombol: Tambah pengeluaran, plus tombol sekunder Scan struk.
- Tab saldo saat semua sudah lunas: ini bukan kekosongan, ini pencapaian. Tampilkan tanda centang besar dengan animasi tergambar dan teks "Semua sudah lunas." Tanpa tombol.
- Tab saldo sebelum ada transaksi: teks singkat menjelaskan bahwa saldo muncul setelah ada pengeluaran. Tanpa ilustrasi, karena layar ini akan sering dilewati.
- Hasil pencarian kosong: tanpa ilustrasi. Teks satu baris plus tombol hapus filter. Ilustrasi di sini memperlambat orang yang sedang buru-buru mencari.
- Grup arsip kosong, riwayat pelunasan kosong, komentar kosong: teks satu baris saja.
- Offline tanpa data tersimpan: ilustrasi awan terputus, teks jujur tentang apa yang bisa dan tidak bisa dilakukan, plus tombol coba lagi.
- Kuota scan habis: ilustrasi tidak dipakai. Tampilkan sisa waktu sampai kuota reset, tombol input manual sebagai aksi utama, dan tautan kecil ke harga sebagai aksi sekunder.
- Semua ilustrasi punya varian gelap yang disiapkan lewat `currentColor`, bukan file terpisah.
- Ilustrasi menghormati `prefers-reduced-motion`. Kalau aktif, semuanya statis.

---

## 19. Kemampuan PWA

Semua ini opsional di web tapi wajib diimplementasi supaya terasa setara aplikasi native.

- Web Share Target: menerima foto struk yang dibagikan dari galeri, muncul di share sheet sistem seperti app biasa.
- App Shortcuts di manifest: tekan lama ikon untuk "Tambah pengeluaran", "Scan struk", "Quick Split".
- Badging API: angka pada ikon untuk jumlah utang yang belum lunas.
- Web Push: notifikasi klaim masuk, pengingat utang, konfirmasi recurring. Berjalan di iOS 16.4 ke atas untuk app yang di-install.
- File Handling: membuka file CSV.
- Clipboard: mendeteksi nominal yang disalin dari app lain dan menawarkan mengisinya.
- Vibration API untuk haptic.
- Screen Wake Lock saat mode Claim aktif, supaya layar tidak mati saat menunggu orang mengklaim.
- Prompt install kustom yang muncul setelah pengguna menyelesaikan satu pengeluaran, bukan di detik pertama.

---

## 20. Performa

Angka ini adalah anggaran, bukan aspirasi. Kalau terlampaui, fitur ditunda.

- Bundle JavaScript awal maksimum 120 KB terkompresi brotli.
- Largest Contentful Paint di bawah 1,5 detik pada koneksi 4G lambat.
- Interaction to Next Paint di bawah 200 milidetik.
- Halaman join dan klaim adalah entry point paling kritis. Harus terbuka di bawah 1 detik, dengan kode terpisah yang tidak memuat seluruh app.
- Route splitting per halaman. Scan struk, bagan, dan export dimuat lazy.
- Daftar transaksi memakai virtualisasi di atas 100 baris.
- Semua perhitungan split berjalan sinkron di main thread karena ringan. OCR dan generate PDF berjalan di Web Worker.
- App shell di-cache oleh service worker, memakai strategi stale-while-revalidate. Data grup memakai network-first dengan fallback cache.

---

## 21. Aksesibilitas

- Semua target interaktif punya label yang terbaca screen reader.
- Fokus terlihat jelas dan urutannya logis.
- Angka uang dibacakan lengkap dengan mata uangnya, bukan sebagai deretan digit.
- Warna tidak pernah jadi satu-satunya pembawa informasi. Status klaim punya ikon dan teks, bukan cuma warna.
- `prefers-reduced-motion` dan `prefers-color-scheme` dihormati.
- Ukuran font mengikuti pengaturan sistem sampai 200% tanpa layout rusak.

---

## 22. Bahasa

- Indonesia dan Inggris.
- Pengguna memilih bahasa secara eksplisit di layar pertama saat app dibuka pertama kali. Bukan deteksi diam-diam.
- Layar itu berisi dua tombol besar, Indonesia dan English, tanpa judul panjang dan tanpa logo besar. `navigator.language` hanya dipakai untuk menentukan mana yang disorot lebih dulu, bukan untuk memilihkan.
- Pilihan disimpan per device dan berlaku untuk seluruh app setelahnya, termasuk teks yang dihasilkan untuk dibagikan.
- Bisa diganti kapan saja di Settings, berlaku seketika tanpa reload.
- Halaman publik yang dibuka lewat link undangan tidak memunculkan layar pemilihan bahasa. Halaman itu harus langsung menampilkan isi, jadi bahasanya mengikuti `navigator.language` dengan pengalih kecil di pojok. Menahan orang di layar pemilihan bahasa sebelum dia melihat grupnya adalah gesekan yang tidak perlu.
- Seluruh string di file terpisah dengan kunci bermakna. Tidak ada teks yang ditulis langsung di komponen.
- Pluralisasi ditangani dengan aturan per bahasa, bukan menambahkan "(s)".
- Tanggal, angka, dan mata uang diformat lewat Intl, bukan manual.
- Nada bahasa Indonesia santai tapi tidak alay. Tidak memakai lo dan gue, tidak memakai tanda seru, tidak memanggil pengguna dengan sebutan apapun.
- Bahasa Inggris harus sepadan, bukan lebih ramah. Kalimat pendek, kata kerja di depan, tanpa mohon dan tanpa maaf. Tidak ada "Oops", tidak ada "Let's", tidak ada emoji. Sebut orang dengan namanya kalau tahu, dengan "you" kalau tidak. Jangan memakai "we" untuk app, karena tidak ada tim yang sedang bicara.
- Semua teks yang dihasilkan untuk dibagikan (tagih, ringkasan, recap) ikut bahasa app pengirim.

Padanan yang mengunci nadanya:

| id | en | Bukan |
|---|---|---|
| Bagi rata | Split evenly | Split it evenly! |
| Kamu utang Sarah 45.000 | You owe Sarah Rp45,000 | You currently owe Sarah... |
| Sisa 12.500 belum dibagi | Rp12,500 left to assign | There is still an amount remaining |
| Sudah ada Dimas, ini orang yang beda? | Dimas already exists. Different person? | It looks like you may already have a member named Dimas |
| Belum ada transaksi | No expenses yet | You haven't added any expenses yet! |
| Gagal menyimpan. Coba lagi. | Couldn't save. Try again. | Oops, something went wrong |
| Semua sudah lunas | All settled | Everyone is all settled up |
| Hapus pengeluaran ini? | Delete this expense? | Are you sure you want to delete this expense? |

Yang panjangnya paling sering berbeda jauh antara dua bahasa: label mode, tombol utama, dan header kolom. Bahasa Inggris di layar-layar itu justru sering lebih panjang.

---

## 23. Tumpukan Teknologi

Rekomendasi, bukan keharusan, dipilih untuk kecepatan bundle dan biaya operasional rendah.

- Frontend: React atau Svelte dengan Vite. Kalau prioritas utama ukuran bundle, Svelte menang jelas.
- State: store ringan plus IndexedDB lewat Dexie.
- Styling: CSS modules atau Tailwind, salah satu, jangan dua-duanya.
- Backend: Cloudflare Workers, router Hono. Endpoint: sync, realtime, OCR proxy, lisensi, kurs. Ini sudah diputuskan, bukan rekomendasi lagi.
- Database: Neon Postgres region `ap-southeast-1`, diakses lewat driver serverless di atas HTTP, query lewat Drizzle. Data grup sebagai baris relasional, bukan blob JSON, supaya query saldo dan pencarian tetap cepat. Konsekuensinya tidak ada koneksi yang dipegang lama, jadi tidak ada transaksi panjang dan tidak ada `LISTEN`/`NOTIFY`.
- Realtime: Durable Object dengan satu objek per grup, bukan lewat Postgres.
- Object storage untuk struk dengan lifecycle 1 tahun.
- OCR: Gemini Flash multimodal dengan structured output, dipanggil dari backend. Dibungkus satu adapter supaya ganti model atau tambah provider cadangan tidak menyentuh kode lain.
- Lisensi: Gumroad License API.
- Kurs: dua provider dengan fallback, di-cache di backend.
- Analytics: self-host.
- Hosting: edge untuk statis, satu region untuk API dengan cache agresif.

---

## 24. Kasus Tepi

- Total nol atau negatif ditolak dengan pesan jelas, kecuali untuk entri diskon.
- Pengeluaran tanpa peserta ditolak.
- Semua peserta bobot nol ditolak.
- Member dihapus saat ada transaksi berjalan: dinonaktifkan, tidak dihapus.
- Dua orang mengedit pengeluaran sama secara bersamaan: field yang berbeda digabung, field yang sama diambil yang terakhir, banner diberikan.
- Perangkat dengan jam salah: timestamp server jadi acuan untuk urutan, waktu device hanya untuk tampilan.
- Struk dengan mata uang berbeda dari grup: dideteksi, dikonversi, ditampilkan keduanya.
- Kuota scan habis di tengah alur: item bisa diinput manual, alur tidak buntu.
- Link klaim dibuka setelah difinalisasi: menampilkan ringkasan, bukan halaman error.
- Grup dengan lebih dari 50 member: didukung, tapi peringatan diberikan bahwa mode Simplify jadi kurang berarti.
- Pengeluaran dengan lebih dari 100 item: didukung, layar klaim otomatis mengelompokkan per kategori.
- Storage device penuh: app memberi tahu dan menawarkan menghapus cache struk lama, data transaksi tidak pernah dibuang.

---

## 25. Tahapan Rilis

### Fase 1, rilis pertama

Yang harus ada supaya produk masuk akal dipakai orang.

- Grup, member, pengeluaran
- Split rata, nominal, persentase, porsi, selisih
- Multi pembayar
- Biaya tambahan dengan tiga mode alokasi dan traktir
- Multi mata uang dengan kurs terkunci
- Saldo dan settle up dua mode
- Link bergabung dan identitas per device
- Offline dan sync
- Quick Split
- Aktivasi lisensi Gumroad
- Export CSV
- Dua bahasa dengan pemilihan di layar pertama
- Onboarding dan seluruh empty state
- Penangkapan link untuk app yang sudah ter-install
- Tutup pendaftaran dan ganti link

### Fase 2, dalam 4 sampai 8 minggu

Yang membuat produk menang.

- Scan struk dan split per item
- Mode Claim dengan realtime dan presence
- Kategori, pencarian, filter
- Ringkasan grup dengan bagan
- Export PDF
- Web Share Target dan App Shortcuts

### Fase 3

Yang membuat orang kembali.

- Dashboard pribadi lintas grup
- Recap bulanan dan tahunan yang bisa dibagikan
- Recurring
- Budget trip
- Push notification dan pengingat
- Komentar dan riwayat aktivitas

---

## 26. Metrik Sukses

- Waktu dari buka app sampai pengeluaran pertama tersimpan, target di bawah 20 detik.
- Persentase pengguna yang menyelesaikan pengeluaran pertama di sesi pertama.
- Rasio penerima link klaim yang menyelesaikan klaim, target di atas 70%.
- Rasio penerima link yang kemudian membuat grup sendiri. Ini corong akuisisi utama.
- Konversi Free ke berlisensi.
- Perpanjangan di tahun kedua.
- Jumlah grup aktif per pemegang lisensi.
- Tingkat kegagalan OCR.

---

## 27. Di Luar Lingkup

Ditulis eksplisit supaya tidak masuk diam-diam nanti.

- Pemrosesan pembayaran atau integrasi dompet digital
- Akun, login, atau sinkronisasi berbasis identitas
- Feed sosial, reaksi, atau follow
- Budgeting personal dan pelacakan pemasukan
- Integrasi bank atau impor mutasi rekening
- Kripto
- Aplikasi native terpisah
- Lisensi seumur hidup
