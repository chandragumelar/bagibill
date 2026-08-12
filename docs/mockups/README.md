# Mockup

Mockup HTML standalone, acuan tata letak dan hierarki visual untuk BagiBill. Sebelas file, 49 keadaan layar. Seluruh layar gelombang 1 sudah ada.

Mockup adalah acuan **tata letak, hierarki, dan copy**. Bukan sumber warna dan bukan sumber kebenaran fitur. Kalau mockup beda dari `packages/tokens`, token yang benar. Kalau mockup beda dari `spec.md`, spec yang benar, kecuali ada catatan di bagian Keputusan di `progress.md`.

Bongkaran per komponen, per keadaan, dan daftar nilai yang belum punya token ada di `docs/mockup-inventory.md`. File ini cuma peta.

## Cara buka

Tiap file self-contained, tinggal buka di browser. Tidak ada build step, tidak ada dependensi jaringan. Semua punya toggle terang dan gelap plus panel keadaan di sampingnya.

Semua mockup dikunci di lebar 360px. Tidak ada tata letak desktop, dan itu keputusan tetap (K-05), bukan pekerjaan yang belum dilakukan.

## Daftar layar

| File | Layar | Keadaan | Gelombang | Tugas plan |
|---|---|---|---|---|
| `Beranda.html` | Daftar grup | 2 | 1 | F3-10 |
| `Buat_Grup___Kelola_Member.html` | Buat grup dan kelola member | 10 | 1 | F3-09 |
| `Tambah_Pengeluaran.html` | Tambah pengeluaran, enam mode | 13 | 1 | F3-01 sampai F3-04 |
| `Detail_Grup_Transaksi.html` | Detail grup, tab Transaksi | 2 | 1 | F3-05, F3-06 |
| `Detail_Grup_Saldo.html` | Detail grup, tab Saldo | 9 | 1 | F3-07 |
| `Klaim_Item.html` | Klaim item sisi member | 4 | 1 | F3-08 |
| `Lapisan_Sistem.html` | Undo, offline, gagal, memuat | 10 | 1 | F0-07 |
| `Saldo___Settle_Up.html` | Settle up sebagai layar berdiri sendiri | 5 | arsip | — |
| `Join_Grup.html` | Halaman join `/j/` | 4 | 2 | belum ada |
| `Bagi_Cepat.html` | Quick Split | 5 | 2 | belum ada |
| `Scan_Struk___Editor_Item.html` | Scan struk dan editor item | 6 | 2 | belum ada |

`Saldo___Settle_Up.html` adalah desain awal yang berdiri sendiri dengan headernya sendiri. Sudah digantikan oleh `Detail_Grup_Saldo.html` yang duduk sebagai tab. Disimpan karena isi sheet telusuri, catatan bayar, dan pesan tagih di dalamnya masih dipakai sebagai rujukan detail. Jangan mengerjakan F3-07 dari file ini.

## Keadaan per layar

**Beranda** — beranda terisi, pengguna baru.

**Buat Grup dan Kelola Member** — dua permukaan, lima keadaan masing-masing. Buat: kosong, template dipilih, menambah member, nama mirip, siap simpan. Kelola: grup kecil, grup besar, ada nonaktif, mengubah member, konfirmasi hapus.

**Tambah Pengeluaran** — enam mode di baris pemilih: Rata, Nominal, Persen, Porsi, Selisih, Per item. Rata dan Porsi punya keadaan ringkas dan penuh. Nominal punya empat: kosong, terisi sebagian, pas, lebih. Persen punya tiga: di bawah 100, pas, di atas. Selisih punya tiga: tanpa penyesuaian, plus dan minus bercampur, potongan ekstrem.

**Detail Grup Transaksi** — grup terisi (Trip Bali 2026) dengan seluruh variasi baris, dan grup kosong (Kopdar Bandung). Tiga tab terlihat, cuma Transaksi yang punya isi.

**Detail Grup Saldo** — mode Ringkas, mode Langsung, telusuri satu angka, catatan bayar, susun pesan tagih, pelunasan sebagian, riwayat, semua lunas, belum ada transaksi. Tiga di antaranya (telusuri, catatan bayar, tagih) adalah sheet, bukan isi tab.

**Klaim Item** — pilih identitas, klaim berjalan, konfirmasi bagi berdua, ringkasan finalisasi.

**Lapisan Sistem** — undo aktif, undo hampir habis, dua penghapusan beruntun, konfirmasi hapus grup, member tak bisa dihapus, offline, kembali online, simpan gagal, satu baris gagal, sedang memuat. Semuanya ditampilkan di atas layar nyata, bukan di atas kanvas kosong.

**Join Grup** — pilih identitas, nama baru, sudah masuk, ajakan install.

**Bagi Cepat** — kosong, rata, tip aktif, ga rata, riwayat. Punya numpad sendiri.

**Scan Struk dan Editor Item** — ambil struk, menunggu hasil, hasil bagus, perlu dicek, selisih total, gagal total. Satu-satunya mockup yang mendesain jalur gagal OCR secara utuh.

## Keputusan desain yang mengikat kode

Yang di bawah ini bukan selera, sudah masuk `spec.md` atau bagian Keputusan di `progress.md`, dan dipakai sebagai kriteria QA.

**Warna kategori tidak muncul di layar yang ada orangnya.** Di daftar transaksi, saldo, dan klaim, ikon kategori monokrom dan yang membedakan adalah bentuknya. Token `--cat-*` cuma untuk Ringkasan, filter, dan bagan. Alasannya warna sudah punya pemilik, yaitu orang, dan dua sistem warna di layar yang sama merusak keduanya.

**Posisi kamu cuma ada di satu tempat.** Kartu di header grup adalah satu-satunya ringkasan posisi pribadi. Tab Saldo tidak mengulanginya. Mengetuk kartu itu menyorot baris kamu di daftar, bukan memunculkan versi kedua.

**Simplify digambar, bukan dijelaskan.** Bedanya mode Ringkas dan Langsung ditampilkan sebagai perubahan bentuk diagram jaringan. Tebal garis sebanding besar transfer, garis putus-putus berarti lewat perantara. Kasus Dewi di data contoh sengaja dibuat berbalik antara dua mode, karena kasus itulah yang bikin orang curiga.

**Tangga bahaya punya tiga anak.** Bisa ditarik kembali berarti langsung dibuang tanpa konfirmasi lalu undo menyusul. Permanen berarti gestur tahan-untuk-hapus. Terkunci bukan konfirmasi sama sekali, melainkan penjelasan, dan warnanya netral bukan merah.

**Offline bukan kondisi rusak.** Pita netral, cuma menyebut ada perubahan yang belum sampai, dan cuma di grup yang punya member lain. Di grup pribadi tidak ditampilkan sama sekali. Mengetik tetap jalan.

**Nama mirip dicegat saat diketik.** Normalisasi trim, huruf kecil, spasi tunggal, kemiripan pakai jarak edit maksimal 1. Bisa diabaikan satu tap, bisa diperbaiki satu tap. Nama persis sama tetap boleh kalau dipilih.

**Aktif versus nonaktif dibedakan bentuk.** Avatar terisi versus cincin putus-putus, plus pill berlabel. Bukan warna, bukan opacity saja.

**Baris transaksi satu pola grid.** Ikon, isi, efek ke kamu di kolom kanan dengan tiga bentuk: bagianmu, buat kamu, atau nggak ikut. Pelunasan dibedakan total dari pengeluaran lewat latar hijau tipis, ikon panah putus-putus, dan arah yang ditulis eksplisit.

## Yang belum ada mockupnya

- Tab Ringkasan di detail grup, selain kerangkanya
- Layar bahasa, layar sambutan, onboarding, coach mark
- Layar lisensi, aktivasi key, dan kedaluwarsa
- Layar assign per item versi pembuat

## Merawat folder ini

Mockup baru masuk ke tabel di atas dalam PR yang sama dengan filenya. Keadaan yang bertambah ikut diperbarui. Kalau sebuah mockup sudah tidak dipakai karena layarnya berubah arah, hapus filenya, jangan simpan dua versi. `Saldo___Settle_Up.html` adalah pengecualian yang alasannya sudah ditulis di atas, dan pengecualian berikutnya harus punya alasan tertulis juga.
