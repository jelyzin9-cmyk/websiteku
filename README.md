# Traktir — Platform Donasi untuk Kreator

Full-stack: halaman donasi publik, dashboard kreator (dengan login), dan overlay real-time untuk OBS. Pembayaran asli lewat [Midtrans](https://midtrans.com) (QRIS, GoPay/ShopeePay, VA bank).

## Struktur folder
```
app.js                 — konfigurasi Express (dipakai bareng oleh server.js & api/index.js)
server.js              — entry point untuk jalan LOKAL / cPanel (proses Node yang hidup terus)
api/index.js           — entry point khusus VERCEL (serverless, tiap request instance baru)
vercel.json            — routing config: semua request diarahkan ke api/index.js
db.js                  — schema SQLite; otomatis pilih lokasi file tergantung environment
routes/
  auth.js              — register/login/logout/session
  dashboard.js          — semua API dashboard kreator
  donate.js             — profil publik, buat transaksi, webhook, SSE overlay
  withdraw.js            — saldo, rekening tujuan, penarikan (Midtrans Iris)
lib/iris.js             — wrapper Midtrans Iris API (payout)
views/                  — halaman dashboard (butuh login) + landing/login/register
public/
  donate.html            — halaman donasi publik, diakses via /d/:username
  overlay.html            — overlay untuk OBS Browser Source, diakses via /overlay/:token
  dashboard.css/js        — style & sidebar nav bersama
data/app.db              — database SQLite (otomatis dibuat, hanya dipakai di luar Vercel)
```

## Bisa deploy ke Vercel ATAU cPanel — pakai kode yang sama

Project ini sengaja dipisah jadi `app.js` (logika Express) + dua entry point berbeda, supaya satu codebase bisa jalan di dua model hosting yang berbeda:

| | **Vercel** | **cPanel (Node.js Selector)** / lokal |
|---|---|---|
| Model | Serverless — tiap request bisa kena instance baru | Proses Node yang hidup terus |
| Entry point dipakai | `api/index.js` (lewat `vercel.json`) | `server.js` |
| Database SQLite | Nulis ke `/tmp` — **hilang tiap cold start/redeploy** | Nulis ke `./data/app.db` — **persisten** |
| Session login | Bisa logout sendiri random (memory tidak dibagi antar instance) | Stabil normal |
| Overlay OBS (SSE real-time) | Koneksi panjang bisa keputus (limit durasi function) | Jalan normal |
| Cocok untuk | **Testing cepat / demo** | **Pemakaian beneran** |

### Deploy ke Vercel (testing)
1. Push folder ini ke GitHub, lalu import repo-nya di [vercel.com/new](https://vercel.com/new) — Vercel otomatis kebaca `vercel.json`, tidak perlu setting tambahan.
2. Di Vercel dashboard → Settings → Environment Variables, isi semua variabel dari `.env.example` (`MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `SESSION_SECRET`, dst).
3. Deploy. Inget: akun yang kamu daftarkan bakal hilang tiap kali redeploy/cold start, jadi jangan dipakai buat data beneran dulu.

### Deploy ke cPanel (pemakaian beneran)
1. Di cPanel, cari menu **"Setup Node.js App"**.
2. Buat aplikasi baru: Application root = folder project ini, **Application startup file = `server.js`**, Node version = 18 ke atas.
3. Masuk ke terminal/SSH di cPanel (atau lewat tombol "Run NPM Install" di panel Node.js App), jalankan `npm install`.
4. Salin `.env.example` jadi `.env` di Application root, isi semua variabelnya.
5. Restart aplikasi lewat panel cPanel. Database `data/app.db` akan otomatis kebuat dan **tetap ada** selama-lamanya (tidak seperti di Vercel).


## Cara menjalankan

1. Install dependency:
   ```bash
   npm install
   ```
2. Salin `.env.example` jadi `.env`, isi `MIDTRANS_SERVER_KEY` & `MIDTRANS_CLIENT_KEY` dari akun sandbox Midtrans (gratis, daftar di https://dashboard.sandbox.midtrans.com/register), dan `SESSION_SECRET` bebas string acak.
3. Di `public/donate.html`, cari `data-client-key="MIDTRANS_CLIENT_KEY_DISINI"` dan ganti dengan Client Key kamu.
4. Jalankan:
   ```bash
   npm start
   ```
5. Buka `http://localhost:3000` → daftar akun kreator → otomatis masuk ke `/dashboard`.

## Alur pemakaian

1. **Daftar/Login** di `/register` atau `/login`.
2. **Edit Halaman** — atur nama, bio, dan jumlah minimal donasi.
3. **Widget Website** — salin link halaman donasimu (`/d/username`) untuk dibagikan, dan link overlay (`/overlay/token`) untuk ditambahkan sebagai **Browser Source** di OBS/Streamlabs.
4. **Overlay Control** — atur batas minimum alert, TTS, dan pengaturan mediashare (durasi video dibayar per koin/detik).
5. Saat ada yang donasi lewat `/d/username`, uang diproses Midtrans → webhook `/api/midtrans-notification` update status → alert otomatis dikirim ke overlay via **Server-Sent Events**, muncul real-time di layar streaming.
6. **Riwayat Transaksi** & **Statistik** menampilkan data dari database.
7. **Filter Kata** & **Blokir Media & IP** — kata di pesan donasi otomatis disensor kalau cocok dengan daftar filter.
8. **Akun & Keamanan** — ganti password.

## Yang sudah berfungsi penuh
Auth (register/login/session), edit profil halaman, link widget, overlay control (threshold alert/TTS/mediashare), riwayat transaksi, statistik dasar, filter kata, blokir IP & media (disimpan, belum ada middleware yang otomatis menolak IP tersebut — lihat bagian bawah), ganti password, overlay OBS real-time dengan TTS browser bawaan.

## Yang masih kerangka dasar (perlu dikembangkan lebih lanjut)
- **Toko Voucher, Replay Support, Integrasi Overlay** — halamannya sudah ada & terhubung ke sidebar/login, tapi isinya masih placeholder. Ini butuh keputusan bisnis (mis. voucher dari penyedia mana) yang di luar scope teknis murni.
- **Pemblokiran IP otomatis** — data IP yang diblokir sudah tersimpan, tapi endpoint `/api/create-transaction` belum mengecek `req.ip` terhadap daftar itu. Tinggal tambahkan middleware pengecekan sebelum membuat transaksi.
- **Mediashare pemutaran video sungguhan** — pengaturan (platform, koin/detik, minimal jumlah) sudah bisa disimpan lewat Overlay Control, tapi form input URL video di halaman donasi publik dan pemutaran otomatis di `overlay.html` (embed YouTube/TikTok terjadwal sesuai durasi) belum dihubungkan — perlu ditambahkan mengikuti pola field/endpoint yang sudah ada.
- **Session store** pakai memory bawaan Express — cukup untuk pengembangan, tapi untuk produksi dengan banyak pengguna sebaiknya ganti ke store seperti Redis, karena data sesi akan hilang tiap restart server.

## Pencairan Saldo (Tarik Dana ke Bank/E-Wallet)

Fitur di menu **Balance** ini pakai produk Midtrans yang **terpisah** dari Snap (yang dipakai buat terima donasi), namanya **Iris**.

### Kenapa perlu aktivasi terpisah
Akun Midtrans biasa (yang kamu pakai untuk `MIDTRANS_SERVER_KEY`/`MIDTRANS_CLIENT_KEY`) **tidak otomatis** punya akses payout. Iris punya proses approval sendiri dari tim Midtrans karena menyangkut pengiriman uang keluar, bukan cuma menerima.

### Cara aktivasi
1. Hubungi tim sales/support Midtrans (lewat dashboard atau https://midtrans.com) dan minta akses **Iris (Disbursement/Payout API)**.
2. Setelah disetujui, kamu akan dapat **Iris API Key** terpisah dari Snap key.
3. Isi `IRIS_API_KEY` di `.env`. Untuk testing, `IRIS_BASE_URL` sandbox sudah di-set default di `.env.example`; untuk uang beneran ganti ke `https://app.midtrans.com/iris/api/v1`.

### Sampai key itu diisi
Kode di `routes/withdraw.js` akan menolak permintaan penarikan dengan pesan jelas (bukan error diam-diam) — jadi kamu bisa tetap deploy & pakai fitur lain sambil menunggu approval Iris.

### Yang perlu kamu tahu soal alurnya
- Setelah `createPayout` dipanggil, status transaksi biasanya masih **"processing"**, bukan langsung selesai. Tergantung setting keamanan akun Iris-mu, transaksi mungkin butuh **approval manual** (lewat dashboard Iris, kadang perlu OTP) sebelum dana benar-benar terkirim ke rekening tujuan.
- Kode ini belum menangani pengecekan status otomatis setelah payout dibuat — `lib/iris.js` sudah punya fungsi `getPayoutStatus()`, tinggal dipanggil secara berkala (mis. lewat cron job) untuk update status `processing` → `completed`/`failed` di database.
- Saldo yang dihitung di `/api/dashboard/balance` murni dari catatan donasi `paid` dikurangi total penarikan — **belum** memperhitungkan biaya admin Midtrans (baik biaya terima donasi maupun biaya payout), jadi sebaiknya kamu sesuaikan perhitungannya sesuai skema biaya yang berlaku di kontrakmu dengan Midtrans.


1. Ajukan akun **production** Midtrans (perlu verifikasi identitas/bisnis).
2. Ganti key di `.env` & `donate.html` dengan key production, ubah `isProduction: false` → `true` di `routes/donate.js`, dan ganti domain script Snap dari `app.sandbox.midtrans.com` ke `app.midtrans.com`.
3. Deploy ke hosting Node.js (Railway, Render, VPS, dst). Set **Payment Notification URL** di dashboard Midtrans ke `https://domainmu.com/api/midtrans-notification`.
4. Backup file `data/app.db` secara berkala, atau migrasi ke Postgres/MySQL kalau skala pengguna sudah besar.
