const express = require('express');
const path = require('path');
const app = express();

// Middleware Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Data Sederhana (In-Memory Storage)
let donations = [
  { sender: 'Budi Kurnia', amount: 25000, message: 'Mantap bang, gass terus!', date: '2026-08-01' },
  { sender: 'Sultan Anonim', amount: 100000, message: 'Buat beli kopi biar gak ngantuk.', date: '2026-08-01' }
];

// --- ROUTING TAMPILAN (GET) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'landing.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));

// API Ambil Data Donasi untuk Dashboard
app.get('/api/donations', (req, res) => {
  const total = donations.reduce((acc, curr) => acc + curr.amount, 0);
  res.json({
    totalSaldo: total,
    totalDonasi: donations.length,
    list: donations
  });
});

// ROUTE FORM LOGIN & REGISTER
app.post('/register', (req, res) => res.redirect('/login'));
app.post('/auth/register', (req, res) => res.redirect('/login'));
app.post('/login', (req, res) => res.redirect('/dashboard'));
app.post('/auth/login', (req, res) => res.redirect('/dashboard'));
app.get('/logout', (req, res) => res.redirect('/login'));

// ROUTE PROSES DONASI DARI PENDUKUNG
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
    <body style="background:#0d0f12;color:#fff;font-family:sans-serif;text-align:center;padding-top:50px;">
      <h2>🎉 Terima Kasih atas Dukungannya!</h2>
      <p>Dukungan sebesar Rp ${parseInt(amount).toLocaleString('id-ID')} telah terkirim.</p>
      <br><a href="/" style="color:#f59e0b;">Kembali ke Utama</a>
    </body>
  `);
});

// ROUTE HALAMAN DONATUR (Menangani URL Username Publik seperti /jelyzx)
app.get('/:username', (req, res, next) => {
  const reserved = ['login', 'register', 'dashboard', 'logout', 'api'];
  if (reserved.includes(req.params.username.toLowerCase())) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'views', 'donate.html'));
});

module.exports = app;
