# Deploy — Cloudflare Pages

Panduan buat orang yang belum pernah pakai Cloudflare Pages. Ini langkah manual, dijalankan sendiri di dashboard Cloudflare — bukan sesuatu yang agent kerjakan, karena agent nol punya kredensial akun Cloudflare.

Yang sudah siap di repo sebelum kamu mulai:

- `public/_redirects` — fallback SPA (semua path balik ke `index.html`, status 200).
- `public/_headers` — CSP, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `X-Frame-Options`, plus aturan cache buat `index.html` dan `/assets/*`.
- `pnpm build` sudah termasuk `scripts/check-csp-hash.ts` — build gagal duluan kalau hash CSP di `_headers` basi terhadap script inline di `index.html`, jadi kalau langkah build di Cloudflare hijau, hash-nya sudah pasti cocok.

Belum ada di repo, dan memang belum waktunya (PR 12): service worker, `manifest.json`, ikon PWA. Jangan kaget kalau Lighthouse bilang "not installable" — itu belum dikerjakan, bukan bug.

---

## 1. Buat proyek Pages dan sambungkan repo

1. Masuk ke dashboard Cloudflare → **Workers & Pages** di sidebar kiri.
2. **Create application** → tab **Pages** → **Connect to Git**.
3. Pilih akun GitHub kamu, authorize kalau diminta, lalu pilih repo `bagibill`.
4. Cloudflare bakal nanya pengaturan build (lanjut ke bagian 2 di bawah sebelum klik **Save and Deploy**).

## 2. Pengaturan build

Isi persis seperti ini:

| Field | Nilai |
|---|---|
| Production branch | `main` |
| Framework preset | **None** (jangan pilih preset Vite — build command kita bukan cuma `vite build`, ada tiga pengecekan sebelum itu) |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | `/` (kosongkan / default — ini bukan monorepo bertingkat, `packages/tokens` dan `packages/split-engine` dikonsumsi langsung dari source lewat pnpm workspace, nol perlu build terpisah) |

Buka **Environment variables** (masih di layar setup yang sama, atau di **Settings → Environment variables** kalau proyeknya sudah kebuat), tambahkan dua ini untuk **Production** dan **Preview** sama-sama:

| Variable | Nilai | Kenapa |
|---|---|---|
| `NODE_VERSION` | `22` | Samain sama CI (`.github/workflows/ci.yml` pakai `node-version: 22`) dan Node lokal (v22.23.1 saat dokumen ini ditulis). |
| `PNPM_VERSION` | `11.18.0` | **Wajib diisi manual.** Build image Cloudflare (v3) nol baca field `packageManager` di `package.json` buat nentuin versi pnpm — kalau dibiarkan kosong dia pakai default sendiri (pnpm 10.11.1 per dokumentasi Cloudflare), yang beda dari `pnpm-lock.yaml` repo ini (dibuat pnpm 11.18.0) dan bisa bikin install gagal atau lockfile ke-tulis ulang diam-diam. |

Belum ada env var lain yang perlu diisi — backend (`BAGIBILL_*`) belum ada, dan yang boleh kebaca client (`VITE_PUBLIC_*`) juga belum ada isinya (`.env.example` masih kosong keduanya).

Klik **Save and Deploy**. Deploy pertama bakal jalan dari branch `main` — ini yang nanti jadi Production.

## 3. Domain `bagibill.pika-xu.com`

DNS domain ini sudah ada di zone Cloudflare yang sama (`CLAUDE.md` bagian Infra), jadi ini langkah dalam-akun, bukan pindah nameserver.

1. Buka proyek Pages yang barusan dibuat → tab **Custom domains**.
2. **Set up a domain** → ketik `bagibill.pika-xu.com` → **Continue**.
3. Karena domainnya sudah di zone Cloudflare yang sama, Cloudflare otomatis bikinkan record CNAME yang arahnya ke `<nama-proyek>.pages.dev` — kamu tinggal konfirmasi, nol perlu tambah DNS record manual di tab **DNS** zone.
4. Tunggu status berubah jadi **Active**. Kalau nyangkut lama di **Pending** atau muncul galat soal sertifikat, cek dulu apakah ada CAA record di zone yang secara nol sengaja mblokir Cloudflare nerbitin sertifikat (jarang kejadian kalau DNS-nya emang sudah di Cloudflare dari awal).

## 4. Verifikasi header setelah live

Dari terminal (HP atau laptop, asal ada `curl`):

```bash
curl -sI https://bagibill.pika-xu.com/
```

Yang wajib kelihatan di respons (nama header, boleh beda urutan):

```
content-security-policy: default-src 'self'; script-src 'self' 'sha256-p3vDcHbGu47tzrFdMdbm+2g4vFZkItz8ktmMI39NbzE='; ...
x-content-type-options: nosniff
referrer-policy: no-referrer
permissions-policy: camera=(), microphone=(), ...
cross-origin-opener-policy: same-origin
x-frame-options: DENY
cache-control: no-cache
```

Cek juga aset ber-hash dapat cache panjang:

```bash
curl -sI https://bagibill.pika-xu.com/assets/$(curl -s https://bagibill.pika-xu.com/ | grep -o 'assets/[^"]*\.js' | head -1)
```

harus muncul `cache-control: public, max-age=31536000, immutable`.

**Kalau header CSP/security nol muncul sama sekali** (bukan cuma beda isi, tapi header-nya hilang total): kemungkinan besar baris komentar (`#...`) di `public/_headers` nol ke-parse seperti dugaan. Perbaikannya: buka `public/_headers`, hapus semua baris yang diawali `#`, commit, redeploy, curl ulang. Kalau setelah itu header muncul, berarti dugaan soal dukungan komentar salah — laporkan biar dicatat, karena artinya penjelasan "kenapa" tiap header perlu dipindah keluar dari file ini.

**Kalau CSP bikin halaman putih / kedip tema / konsol penuh error `Refused to execute inline script`**: hash di `script-src` basi. Ini seharusnya nol pernah kejadian kalau langkah build di Cloudflare hijau (karena `check-csp-hash.ts` bagian dari `pnpm build`), tapi kalau kejadian juga, berarti ada beda antara apa yang di-build Cloudflare dan apa yang lolos di lokal — laporkan, jangan diotak-atik manual di dashboard.

## 5. Cek setelah live — dari HP, jaringan seluler

Urutan ini yang bikin F4-03 boleh dicentang di `progress.md`. Semuanya harus dicoba beneran, bukan dibayangkan.

1. **Tujuh layar gelombang 1 kebuka**: beranda (`/app`), buat grup, tambah pengeluaran, detail grup tab Transaksi, detail grup tab Saldo, kelola member, klaim item (`/c/:slug/:expenseId` — buat satu link uji dulu dari grup contoh).
2. **Refresh di rute dalam, nol 404**: buka grup manapun (`/g/:slug`), lalu refresh browser (bukan navigasi dari dalam app). Ulangi di `/g/:slug/members` dan `/g/:slug/add`. Kalau salah satu 404, `_redirects` nol jalan sesuai rencana.
3. **Tema gelap nol kedip**: set tema gelap di app, tutup tab, buka lagi `bagibill.pika-xu.com` langsung (bukan lewat riwayat/tab yang masih hidup). Perhatikan pas loading pertama — nol boleh ada kilat putih sebelum tema gelap kepasang. Ini yang dijaga hash CSP di langkah build.
4. **Data masih ada setelah app ditutup lalu dibuka lagi**: buat satu pengeluaran percobaan, tutup app/tab sepenuhnya (bukan cuma minimize), buka lagi, cek pengeluaran itu masih ada dan angkanya sama. Ini ngetes IndexedDB, bukan Cloudflare, tapi baru bisa dicek kalau app-nya sudah diakses lewat domain beneran.

Kalau salah satu dari empat ini gagal, tulis apa adanya di `progress.md` — jangan dicentang sebelum semuanya lolos.
