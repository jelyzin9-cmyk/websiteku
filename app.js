const express = require('express');
const path = require('path');
const app = express();

// 1. Middleware Parsing Body Data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Serve Public Folder untuk Asset Statis (CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// Database Sementara (In-Memory Data Store)
let donations = [
  { sender: 'Budi Kurnia', amount: 25000, message: 'Mantap bang, gass terus!', date: '2026-08-01' },
  { sender: 'Sultan Anonim', amount: 100000, message: 'Buat beli kopi biar gak ngantuk.', date: '2026-08-01' }
];

// 3. ROUTE TAMPILAN HALAMAN UTAMA & AUTH (GET)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'landing.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));

// 4. ROUTE API UNTUK DASHBOARD DATA
app.get('/api/donations', (req, res) => {
  const total = donations.reduce((acc, curr) => acc + curr.amount, 0);
  res.json({
    status: 'success',
    totalSaldo: total,
    totalDonasi: donations.length,
    list: donations
  });
});

// 5. HANDLER PROSES AUTH
app.post('/register', (req, res) => res.redirect('/login'));
app.post('/auth/register', (req, res) => res.redirect('/login'));
app.post('/login', (req, res) => res.redirect('/dashboard'));
app.post('/auth/login', (req, res) => res.redirect('/dashboard'));
app.get('/logout', (req, res) => res.redirect('/login'));

// 6. HANDLER PROSES DONASI
app.post('/api/donate', (req, res) => {
  const { sender, amount, message } = req.body;
  if (amount) {
    donations.unshift({
      sender: sender || 'Anonim',
      amount: parseInt(amount) || 0,
      message: message || '-',
      date: new Date().toISOString().split('T')[0]
    });
  }
  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Terima Kasih</title>
      <style>
        body { background:#0d0f12; color:#fff; font-family:sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; text-align:center; }
        .card { background:#161b22; border:1px solid #30363d; padding:32px; border-radius:12px; max-width:400px; }
        a { color:#f59e0b; text-decoration:none; font-weight:bold; display:inline-block; margin-top:16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🎉 Terima Kasih!</h2>
        <p>Dukungan sebesar <strong>Rp ${parseInt(amount || 0).toLocaleString('id-ID')}</strong> berhasil dikirim.</p>
        <a href="/dashboard">Lihat Dashboard</a>
      </div>
    </body>
    </html>
  `);
});

// 7. ROUTE DINAMIS UNTUK HALAMAN DONATUR (Wajib Ditaruh Paling Bawah)
app.get('/:username', (req, res, next) => {
  const reservedPaths = ['login', 'register', 'dashboard', 'logout', 'api', 'favicon.ico'];
  if (reservedPaths.includes(req.params.username.toLowerCase())) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'views', 'donate.html'));
});

module.exports = app;
