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
| Header grup | normal dengan kartu posisi kamu, kartu bernilai nol (grup baru, bukan hilang) | DT, DS |
| Baris tab | Transaksi aktif, Saldo aktif, Ringkasan (mati) | DT, DS |
| Topbar layar penuh | dengan tombol kembali (ikon), dengan aksi teks kiri, dengan aksi kanan | LS |
| Bilah tombol bawah | satu tombol primer, disabled | BG, KI |
| Sheet dari bawah | biasa, berat (aksi permanen) | DS, LS |
| Panel keadaan dev | — | semua |

Kartu posisi kamu di header grup adalah satu-satunya ringkasan posisi pribadi di seluruh app. Tab Saldo tidak boleh mengulangnya. Ini invarian, bukan preferensi tata letak.

**Koreksi F0-05 12 Ags 2026** — baris Sheet dari bawah sebelumnya menulis tiga keadaan termasuk "penuh layar". Dicek ulang langsung ke `Lapisan_Sistem.html` dan `Detail_Grup_Saldo.html`: "penuh layar" itu bukan varian Sheet, melainkan overlay gagal-muat/skeleton (`.overlay`/`.loadfail`) yang render penuh `#screenBody` tanpa scrim dan tanpa rounded-top — mekanisme beda total dari `.sheet`. Sudah punya baris sendiri di 1.5 ("Layar gagal muat", "Skeleton"). Salah kelompok di F0-02, bukan salah baca mockup di F0-05 — dibetulkan di sini, bukan diam-diam.

**Koreksi F0-06 12 Ags 2026** — dua baris kena perbaikan lagi setelah dicek ulang ke markup mentah TP/BG/KI/LS:

- *Topbar layar penuh*: tercatat "muncul di TP, BG, KI". Kenyataannya class `.topbar` yang beneran reusable (CSS-nya komennya sendiri: "untuk layar non-grup: tambah, member, join") cuma ada di `Lapisan_Sistem.html`, dipakai identik di 3 fungsi (`screenTambah`, `screenMember`, `screenJoin`). TP dan BG punya row atas sendiri tapi inline-style ad hoc format `x-dc`, bukan class yang dishare. KI malah gak punya topbar sama sekali — itu halaman publik tanpa back nav, headernya sendiri (`.k-header`) untuk konteks undangan, bukan Topbar. Keadaan "judul bisa diedit" gak ketemu di manapun; title di ketiga instance LS selalu `<h1>` statis. Yang bisa diedit itu field judul pengeluaran di badan TP (komponen beda, bukan chrome Topbar) — kemungkinan tercampur waktu F0-02.
- *Bilah tombol bawah*: tercatat "satu tombol primer, primer plus sekunder, disabled — TP, BG, KI". Pola `flex:0 0 auto` sibling-dari-scroll yang konsisten cuma ada di BG (`Buat grup`, disabled lewat `canCreate`) dan KI (footer ringkasan, tanpa tombol sama sekali). TP-nya tombol nempel di dalam area scroll, gak pinned. "Primer plus sekunder" ternyata pola `.sheet-actions`/`.k-sheet-actions` — dua tombol ditumpuk di DALAM sheet (mis. "Bagi berdua" + "Batal, bukan punyaku" di KI), bukan bilah di layar.

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

Disisir ulang 12 Agustus 2026 dengan cara jalan setiap custom property (`--xxx`), definisi maupun pemakaian `var()`, di sebelas file mockup hasil ekstraksi (lihat bagian 4), lalu dibandingkan satu-satu terhadap `packages/tokens/tokens.css` yang berlaku sekarang. Hasilnya jauh lebih panjang dari catatan lama: banyak token yang catatan desain tiap mockup minta "menyusul ke tokens.css" ternyata sudah masuk, cuma belum pernah dicatat di sini.

Aturan arahnya tetap: token digenerate dari mockup. Kalau mockup memakai nama atau nilai yang belum ada di token, tokennya yang menyusul, bukan mockupnya yang disesuaikan. Yang tetap tidak boleh adalah komponen menulis nilai mentah atau menyalin blok `:root` lokal milik satu mockup.

### 2.1 Sudah ditambahkan ke `tokens.css`

Dikelompokkan per catatan desain mockup yang memintanya. Nilai dicek sama persis terang dan gelap kecuali disebut beda.

| Nama | Diminta di catatan desain | Layar |
|---|---|---|
| `--graph-bg` | latar kanvas diagram jaringan transfer | DS |
| `--ease` | alias pendek `var(--ease-standard)`, nilai identik | DT, DS, LS |
| `--scrim` | dim di belakang sheet/dialog | DS ("Token: ... --scrim"), KI ("TOKEN yang perlu DITAMBAH: --scrim") |
| `--num-xl` | ukuran nominal hero 48px, muat 9 digit di 360px | DS |
| `--route`, `--route-text`, `--route-tint` | aksen "lewat perantara", chip rute | DS |
| `--route-line` | warna garis rute di diagram jaringan | DS |
| `--warn`, `--warn-text`, `--warn-tint` | kondisi ragu/kurang di mode Nominal & Persen | TP |
| `--state-under`, `-text`, `-tint` | alokasi kurang (kuning) | TP |
| `--state-exact`, `-text`, `-tint` | alokasi pas (hijau) | TP |
| `--state-over`, `-text`, `-tint` | alokasi lebih (merah) | TP |
| `--risk-low`, `-tint` | tangga bahaya: aksi reversible | LS |
| `--risk-high`, `-strong`, `-tint`, `-text` | tangga bahaya: aksi permanen | LS |
| `--risk-locked`, `-tint` | tangga bahaya: aksi terkunci | LS |
| `--offline-fg`, `-bg`, `-dot` | pita offline, netral | LS |
| `--sync-fg`, `-bg` | pita "lagi mengirim" | LS |
| `--syncdone-fg`, `-bg` | pita "tersinkron" | LS |
| `--fail-fg`, `-bg`, `-border` | blok gagal butuh-tindakan | LS |
| `--focus-ring`, `--focus-ring-width` | cincin fokus keyboard konsisten | LS |
| `--dur-undo`, `--dur-toast`, `--dur-move`, `--dur-hold` | empat durasi lapisan sistem, sengaja terpisah dari `--dur-base` | LS |

Yang berubah dari catatan lama: sebelumnya cuma `--graph-bg` dan `--ease` yang tercatat di sini. Sisanya (17 baris di atas) sudah lama masuk `tokens.css` tapi tidak pernah dipindah dari status "diminta" ke "selesai" di dokumen ini — verifikasi F0-02 ini yang pertama kali mencocokkannya balik ke catatan desain aslinya.

### 2.1b Ditambahkan F0-05

Beda sumber dari 2.1: bukan dari audit `var(--x)` F0-02, tapi dari nilai literal (px/%/hex) di CSS mockup waktu 7 komponen dasar dibangun — nilai yang sama persis dipakai berulang di 2+ mockup (bukan kebetulan), atau langsung dari aturan aksesibilitas eksplisit CLAUDE.md.

| Nama | Nilai | Sumber |
|---|---|---|
| `--size-avatar` | 38px | `avatar()` BG — diameter avatar standalone |
| `--size-avatar-sm` | 22px | `.k-avatar--sm` KI |
| `--size-control` | 50px | `.btn`/`.k-btn` min-height, identik DS + LS + KI |
| `--size-touch-min` | 44px | Target sentuh minimum, CLAUDE.md Aksesibilitas (bukan dari mockup) |
| `--r-sheet` | 20px | `.sheet` border-radius atas, identik DS + LS |
| `--size-grab-w`, `--size-grab-h` | 36px, 5px | `.grab` handle sheet, identik DS + LS |
| `--size-sheet-max-h` | 90% | `.sheet` max-height, identik DS + LS |
| `--on-member` | #FFFFFF | Teks avatar terisi, `color:#fff` identik di `avatar()` BG, `.avstack .av` DT + DS. Tetap putih di light & dark (beda dari `--on-brand` yang ganti gelap di dark), sesuai K-07. |
| `--brand-on-dark` | #8FB0FF | `[data-theme="light"] .toast .tundo` LS — link di atas chip toast yang selalu gelap terlepas tema app. Disederhanakan jadi satu nilai dipakai di kedua tema (mockup aslinya beda nilai per tema untuk kebutuhan yang sama), bukan direplikasi tiga tingkat. |
| `--border-width-thick` | 2px | Cincin avatar nonaktif (`avatar()` BG: `border:2px dashed`) dan cincin pengulangan warna ke-13 (K-07, tidak ada contoh render di mockup manapun — 13 member tidak pernah didemokan — jadi visualnya interpretasi dari teks keputusan, bukan piksel yang diverifikasi). |
| `--size-visually-hidden` | 1px | Teknik CSS visually-hidden buat label TextInput/MoneyInput (kontrol wajib punya nama yang terbaca screen reader, tapi mockup BG tidak menampilkan label terlihat) |
| `--toast-chip-mix` | 22% (light) / 18% (dark) | `.cd .track` + `.cnt` LS — opasitas overlay netral di atas toast, beda per tema karena kontras dasarnya beda |

Catatan tambahan yang bukan token tapi keputusan implementasi F0-05: field TextInput/MoneyInput dinormalisasi ke `--r-field` (10px) dan `--size-touch-min` (44px) walau BG/TP menulis literal inline 12px/46px/40px — nilai-nilai itu satu-off inline style di format `x-dc` (bukan `var(--x)` berulang lintas file), jadi diselaraskan ke token yang sudah ada ketimbang menambah token baru untuk satu kejadian.

### 2.1c Ditambahkan F0-06

| Nama | Nilai | Sumber |
|---|---|---|
| `--elev-bar` | `0 -4px 14px rgba(16,22,30,.05)` (light) / `rgba(0,0,0,.4)` (dark) | `.k-footer` KI — shadow ke ATAS buat elemen nempel di bawah layar (BottomBar), satu-satunya pola lengkap terang+gelap. Arah kebalik dari `--elev-1/2/3`. |
| `--position-here-mix` | 6% | `.position.here` DS — highlight kartu posisi kamu waktu di tab yang sama diwakili kartu itu |
| `--size-icon-glyph` | 26px | Ukuran glyph tombol ikon utama (back/close), identik DT + DS |
| `--size-icon-glyph-sm` | 20px | Ukuran glyph tombol ikon sekunder (menu ⋯), identik DT + DS |

Catatan implementasi F0-06: tombol ikon GroupHeader (30px DT/DS) dan Topbar (34px LS) disatuin ke `--size-touch-min` (44px) buat kotak tombolnya, bukan token baru per komponen — dua nilai itu beda tipis dan kalah sama aturan keras target sentuh 44px. Glyph di dalamnya tetap pakai `--size-icon-glyph`/`--size-icon-glyph-sm` di atas.

### 2.2 Belum ditambahkan, menunggu layarnya

| Nama | Dipakai untuk | Catatan |
|---|---|---|
| `--cat-food` sampai `--cat-other` | warna kategori di Ringkasan, filter, dan bagan | Delapan nama dan delapan kunci ini datang dari `spec.md` 12.3 (K-09), **bukan** dari mockup manapun — tidak ada satu mockup pun yang menulis literal `--cat-food` dkk. Yang benar-benar dipakai mockup (DT, BG, LS, BC) adalah `--cat` generik per elemen yang diisi `var(--m-N)` dari palet member, sama sifatnya dengan `--c`/`--av`/`--stage` di 2.4 — lihat catatan di DT: "Kalau kategori mau jadi elemen tetap, sebaiknya tambah set token khusus, mis. `--cat-makan`, `--cat-transport`, dst." (usulan, bukan pemakaian). Delapan token baru boleh menyusul waktu tab Ringkasan dikerjakan. Ingat aturan K-08: token kategori berwarna haram di layar yang menampilkan orang — DT, BG, KI wajib tetap pakai fallback monokrom/`var(--m-N)`, bukan `--cat-*`. |

### 2.3 Milik layar gelombang 2, jangan ditambahkan sekarang

| Nama | Layar | Catatan |
|---|---|---|
| `--keycap-bg`, `--keycap-bg-active`, `--keycap-fg` | BC | Semuanya sudah diturunkan dari `--n-1` sampai `--n-4`, jadi mungkin tidak perlu token sendiri. |
| `--hero-glow` | BC | Radial gradient dari `--brand-tint`. |
| `--mono`, `--paper`, `--paper-faint`, `--paper-ink`, `--paper-line` | SS | Estetika kertas struk, cuma dipakai di editor item. |

### 2.4 Bukan token, jangan dipindahkan

`--c`, `--av`, dan `--stage` adalah variabel per elemen yang di-set inline sebagai perancah, bukan nilai desain. `--stage` khusus latar panel dev dan tidak pernah muncul di app.

`--graph-grid` didefinisikan di blok `:root` lokal `Detail_Grup_Saldo.html` (terang `#E1E5EA`, gelap `#242A34`, sepasang dengan `--graph-bg`) tapi tidak pernah dipakai lewat `var()` maupun dibaca lewat JS di file itu sendiri — mati di mockup-nya sendiri. Bukan kandidat token sampai ada garis grid yang benar-benar dirender di diagram jaringan.

`--cat` generik (lihat 2.2) juga scaffold sejenis `--c`, bukan token — dicatat di 2.2 karena berkaitan langsung dengan keputusan `--cat-*` yang tertunda, bukan diulang di sini.

---

## 3. Temuan yang menyentuh kode

**Tidak ada sistem penamaan class bersama.** Tiap mockup memakai prefix sendiri: `s-` di DS, `k-` di KI, `j-` di JG. Yang sama secara visual tidak punya nama yang sama di dua file. Ekstraksi komponen harus dilakukan dengan membaca, bukan dengan mencocokkan nama class.

**Tiap mockup punya blok `:root` lokal** yang menimpa sebagian nilai `tokens.css`. Nilai lokal itu tersangka, bukan referensi. Kalau ada beda antara mockup dan token, token yang benar.

**Nilai durasi lapisan sistem sudah dipisah** jadi `--dur-undo` 6000ms, `--dur-toast` 3200ms, `--dur-move` 260ms, dan `--dur-hold` 1100ms. Empat-empatnya tidak boleh saling menumpang. Komponen yang memakai `--dur-base` untuk toast adalah temuan.

**Ikon Lucide di-inline sebagai SVG**, tidak lewat paket. Delapan ikon kategori plus ikon UI. Satu keluarga, stroke seragam 1.75.

**Dua mockup dibangun dengan format beda dari sisanya.** `Buat_Grup___Kelola_Member.html` dan `Tambah_Pengeluaran.html` pakai pola komponen `x-dc` / `sc-if` / `sc-for` dengan logic state di `class Component extends DCLogic` — bukan HTML statis + `document.querySelector` seperti sembilan file lain. Isinya sama-sama valid untuk dibaca (semua state ada di `buatPreset`/`kelolaPreset` dan `renderVals()`), tapi jangan coba grep nama kelas CSS langsung dari markup `sc-for`/`sc-if` karena isinya template binding (`{{ x }}`), bukan HTML final. Baca lewat definisi preset dan style function di `<script type="text/x-dc">`.

**Enam mode di TP berbagi satu kerangka layar.** Header, field nominal, judul, pemilih mode, daftar peserta, panel hasil. Yang berbeda cuma isi daftar peserta dan bentuk visualisasi di panel. Menulisnya sebagai enam layar terpisah adalah kesalahan yang akan mahal.

**Tiga isi DS adalah sheet, bukan tab.** Telusuri satu angka, catatan bayar, dan susun pesan tagih. Jangan mencoba memuatnya di dalam tab.

---

## 4. Cara memverifikasi dokumen ini

File mockup bukan HTML polos — isi aslinya dibungkus sebagai string JSON di dalam `<script type="__bundler/template">`. Grep langsung ke file mentahnya meleset atau kena string yang sudah di-escape. Verifikasi F0-02 (12 Agustus 2026) jalan lewat langkah ini:

1. Ekstrak `__bundler/template` tiap sebelas file lewat `JSON.parse`, tulis HTML mentahnya ke folder sementara di luar repo. Hasil ekstraksi tidak di-commit.
2. Baca (bukan grep nama kelas) kedelapan mockup gelombang 1 — tujuh layar aktif plus `Saldo___Settle_Up.html` sebagai arsip rujukan F3-07 — dan cocokkan tiap baris komponen/keadaan di bagian 1 terhadap isinya. Prefix kelas beda tiap file (`h-`, `k-`, `s-`, `j-`, dst) jadi yang sama secara visual tidak selalu sama nama classnya; kecocokan diputuskan dengan membaca markup dan `renderVals()`/state preset-nya, bukan mencocokkan string.
3. Untuk token: jalan setiap `--nama` (definisi lewat regex `--x(?=:)` dan pemakaian lewat `var(--x`) di sebelas file hasil ekstraksi, dedup, lalu diff terhadap daftar `--nama` yang benar-benar terdefinisi di `packages/tokens/tokens.css`. Hasil mentah disaring manual dari false positive: modifier kelas BEM seperti `.btn--ghost`/`.btn--primary`/`.btn--secondary` ikut kena regex `--x(?=:)` karena diikuti `:hover` tapi bukan custom property, begitu juga literal di template string JS (`` `--m-${i}` ``) dan teks prosa di catatan desain (`--m-N` sebagai contoh nama, bukan deklarasi).
4. Tiap nama yang lolos dicek dua arah: kalau sudah ada di `tokens.css`, masuk 2.1 dengan catatan desain mockup mana yang memintanya; kalau belum, masuk 2.2/2.3/2.4 sesuai statusnya (menunggu layar, milik gelombang 2, atau scaffold bukan token).

Kalau F0-02 diulang lagi nanti (mis. sesudah mockup baru masuk), ulangi keempat langkah ini, jangan cuma grep file mentah atau percaya catatan desain di dalam mockup sebagai kebenaran akhir — catatan desain kadang sudah basi (`--scrim` di Klaim_Item masih bilang "perlu ditambah" padahal sudah lama ada di token).
