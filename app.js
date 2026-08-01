const express = require('express');
const path = require('path');
const app = express();

// Middleware Parsing Data Form
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Files (CSS, JS, Gambar)
app.use(express.static(path.join(__dirname, 'public')));

// Routing Tampilan HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'landing.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Import Router jika ada
try {
  const authRoutes = require('./routes/auth');
  app.use('/auth', authRoutes);
} catch (e) {
  console.log('Routes auth tidak ditemukan, menggunakan fallback');
}

// Handling POST Register jika pengguna mengirim ke /register langsung
app.post('/register', (req, res) => {
  const { name, username, email, password } = req.body;
  // Proses simpan data / register di sini
  res.json({
    status: 'success',
    message: 'Pendaftaran berhasil!',
    data: { name, username, email }
  });
});

// Fallback POST /auth/register
app.post('/auth/register', (req, res) => {
  const { name, username, email, password } = req.body;
  res.json({
    status: 'success',
    message: 'Pendaftaran berhasil!',
    data: { name, username, email }
  });
});

// Export wajib untuk Serverless Vercel
module.exports = app;
