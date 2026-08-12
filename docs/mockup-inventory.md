# Inventaris mockup

Bongkaran sebelas mockup di `docs/mockups/` jadi tiga daftar: komponen dengan keadaannya, nilai visual yang belum punya token, dan hal-hal yang harus diputuskan sebelum komponennya ditulis.

Dokumen ini input untuk F0-02, F0-03, dan F0-05. Sekali dipakai lalu jadi arsip. Peta layar dan keputusan desain ada di `docs/mockups/README.md`, bukan di sini.

Delapan mockup gelombang 1 dibongkar penuh. Tiga mockup gelombang 2 (`Join_Grup`, `Bagi_Cepat`, `Scan_Struk___Editor_Item`) tidak masuk daftar komponen, tapi nilai visualnya ikut disisir karena token yang kurang lebih murah ditemukan sekarang daripada nanti.

Singkatan layar: **BR** Beranda, **BG** Buat Grup dan Kelola Member, **TP** Tambah Pengeluaran, **DT** Detail Grup Transaksi, **DS** Detail Grup Saldo, **KI** Klaim Item, **LS** Lapisan Sistem, **SU** Saldo Settle Up (arsip), **JG** Join Grup, **BC** Bagi Cepat, **SS** Scan Struk.

---

## 1. Komponen

### 1.1 Kerangka

| Komponen | Keadaan | Muncul di |
|---|---|---|
| Header grup | normal, dengan kartu posisi kamu, tanpa kartu (grup baru) | DT, DS |
| Baris tab | Transaksi aktif, Saldo aktif, Ringkasan (mati) | DT, DS |
| Topbar layar penuh | dengan tombol kembali, dengan aksi kanan, judul bisa diedit | TP, BG, KI |
| Bilah tombol bawah | satu tombol primer, primer plus sekunder, disabled | TP, BG, KI |
| Sheet dari bawah | biasa, berat (aksi permanen), penuh layar | DS, LS |
| Panel keadaan dev | — | semua |

Kartu posisi kamu di header grup adalah satu-satunya ringkasan posisi pribadi di seluruh app. Tab Saldo tidak boleh mengulangnya. Ini invarian, bukan preferensi tata letak.

### 1.2 Identitas

| Komponen | Keadaan | Muncul di |
|---|---|---|
| Avatar | normal, kecil, nonaktif (cincin putus-putus), pengulangan warna ke-13 | BG, DT, DS, KI, BR |
| Tumpukan avatar | 3 orang, banyak orang dengan sisa berangka | DT, DS, BR |
| Baris member | aktif, nonaktif, sedang diubah, terkunci (punya transaksi) | BG |
| Pill status member | bergabung lewat link, cuma nama, nonaktif | BG |
| Chip nama plus warna | biasa, terpilih, bobot nol | TP, KI |

Avatar tanpa nama hanya boleh di tumpukan avatar header. Di semua daftar, nama wajib ikut.

### 1.3 Uang dan angka

| Komponen | Keadaan | Muncul di |
|---|---|---|
| Nominal tabular | positif, negatif, nol, mata uang lain | semua |
| Baris transaksi | bagianmu, buat kamu, nggak ikut, pelunasan, beda mata uang, gagal | DT, LS |
| Baris saldo | nerima, bayar, lunas, kamu | DS |
| Baris transfer | langsung, lewat perantara | DS |
| Panel hasil | rata, porsi, sisa, pas, lebih | TP |
| Bar alokasi | bertumpuk warna orang, sisa terarsir, meluber lewat garis target | TP |
| Jalur persen | di bawah 100, pas, di atas | TP |
| Batang selisih | netral, menyimpang kanan, menyimpang kiri, minus ekstrem | TP |
| Diagram jaringan | mode Ringkas, mode Langsung, satu garis tersorot | DS |
| Baris item | belum diklaim, sebagian, penuh | KI |

Baris transaksi dan panel hasil wajib dirender dari struktur yang sama. Kalau strukturnya beda, itu bug, bukan optimasi.

### 1.4 Input

| Komponen | Keadaan | Muncul di |
|---|---|---|
| Field nominal besar | kosong, terisi, error | TP, BC |
| Field teks | kosong, terisi, peringatan di bawahnya | BG, TP |
| Pemilih mode | enam pill, satu aktif | TP |
| Kontrol bobot | minus, plus, preset pecahan, input manual | TP |
| Pemilih template | belum dipilih, terpilih dengan konsekuensi terlihat | BG |
| Pemilih mata uang | ringkas, daftar penuh | BG |
| Peringatan nama mirip | muncul, diabaikan, diperbaiki | BG |
| Numpad | — | BC |

### 1.5 Lapisan sistem

| Komponen | Keadaan | Muncul di |
|---|---|---|
| Toast undo | aktif, hampir habis, bertumpuk dua | LS |
| Cincin hitung mundur | penuh, menipis, menghangat | LS |
| Sheet aksi permanen | siap, sedang ditahan, selesai | LS |
| Panel aksi terkunci | — | LS, BG |
| Pita jaringan | offline, mengirim, tersinkron | LS |
| Blok gagal inline | simpan gagal, baris gagal | LS |
| Layar gagal muat | — | LS |
| Skeleton | baris daftar, kartu | LS |

Toast tidak boleh menutupi tombol simpan maupun angka total. Ini yang paling sering rusak waktu komponennya dipisah dari layarnya.

### 1.6 Keadaan kosong

| Layar | Bentuk |
|---|---|
| BR | belum punya grup sama sekali |
| DT | grup baru, belum ada transaksi |
| DS | belum ada transaksi, dan semua sudah lunas (dua-duanya beda) |
| BG | grup kosong sebelum member ditambah |

Semua lunas bukan keadaan kosong yang sama dengan belum ada transaksi. Yang pertama pencapaian, yang kedua awal.

---

## 2. Token

`tokens.css` sudah mencakup risk, state, offline, sync, fail, warn, dan durasi lapisan sistem.

Aturan arahnya: token digenerate dari mockup. Kalau mockup memakai nama atau nilai yang belum ada di token, tokennya yang menyusul, bukan mockupnya yang disesuaikan. Yang tetap tidak boleh adalah komponen menulis nilai mentah atau menyalin blok `:root` lokal milik satu mockup.

### 2.1 Sudah ditambahkan ke `tokens.css`

| Nama | Nilai | Dipakai untuk | Layar |
|---|---|---|---|
| `--graph-bg` | `#F6F7F9` terang, `#12161C` gelap | latar kanvas diagram jaringan transfer | DS |
| `--ease` | `var(--ease-standard)` | alias pendek, nilainya identik. Dipakai di DT, DS, LS |

### 2.2 Belum ditambahkan, menunggu layarnya

| Nama | Dipakai untuk | Catatan |
|---|---|---|
| `--cat-food` sampai `--cat-other` | warna kategori di Ringkasan, filter, dan bagan | Delapan token. Boleh menyusul waktu tab Ringkasan dikerjakan, tapi lebih baik dibuat sekarang supaya `--cat` per elemen tidak terlanjur menyebar ke komponen. Ingat aturan K-08: token ini haram di layar yang menampilkan orang. |

### 2.3 Milik layar gelombang 2, jangan ditambahkan sekarang

| Nama | Layar | Catatan |
|---|---|---|
| `--keycap-bg`, `--keycap-bg-active`, `--keycap-fg` | BC | Semuanya sudah diturunkan dari `--n-1` sampai `--n-4`, jadi mungkin tidak perlu token sendiri. |
| `--hero-glow` | BC | Radial gradient dari `--brand-tint`. |
| `--mono`, `--paper`, `--paper-faint`, `--paper-ink`, `--paper-line` | SS | Estetika kertas struk, cuma dipakai di editor item. |

### 2.4 Bukan token, jangan dipindahkan

`--c`, `--av`, dan `--stage` adalah variabel per elemen yang di-set inline sebagai perancah, bukan nilai desain. `--stage` khusus latar panel dev dan tidak pernah muncul di app.

---

## 3. Temuan yang menyentuh kode

**Tidak ada sistem penamaan class bersama.** Tiap mockup memakai prefix sendiri: `s-` di DS, `k-` di KI, `j-` di JG. Yang sama secara visual tidak punya nama yang sama di dua file. Ekstraksi komponen harus dilakukan dengan membaca, bukan dengan mencocokkan nama class.

**Tiap mockup punya blok `:root` lokal** yang menimpa sebagian nilai `tokens.css`. Nilai lokal itu tersangka, bukan referensi. Kalau ada beda antara mockup dan token, token yang benar.

**Nilai durasi lapisan sistem sudah dipisah** jadi `--dur-undo` 6000ms, `--dur-toast` 3200ms, `--dur-move` 260ms, dan `--dur-hold` 1100ms. Empat-empatnya tidak boleh saling menumpang. Komponen yang memakai `--dur-base` untuk toast adalah temuan.

**Ikon Lucide di-inline sebagai SVG**, tidak lewat paket. Delapan ikon kategori plus ikon UI. Satu keluarga, stroke seragam 1.75.

**Enam mode di TP berbagi satu kerangka layar.** Header, field nominal, judul, pemilih mode, daftar peserta, panel hasil. Yang berbeda cuma isi daftar peserta dan bentuk visualisasi di panel. Menulisnya sebagai enam layar terpisah adalah kesalahan yang akan mahal.

**Tiga isi DS adalah sheet, bukan tab.** Telusuri satu angka, catatan bayar, dan susun pesan tagih. Jangan mencoba memuatnya di dalam tab.

---

## 4. Cara memverifikasi dokumen ini

Waktu F0-02 dikerjakan, yang dicek: setiap komponen di bagian 1 benar-benar ada di mockup yang disebut, setiap nama di bagian 2.1 memang belum ada di `packages/tokens` yang sekarang, dan tidak ada komponen di mockup yang belum masuk daftar. Yang berubah dicatat di sini, bukan dibuat dokumen baru.
