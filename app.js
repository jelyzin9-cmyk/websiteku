const express = require('express');
const path = require('path');
const app = express();

// 1. Middleware Parsing Data Form
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Serve File Statis (CSS, JS, Gambar dari folder public)
app.use(express.static(path.join(__dirname, 'public')));

// 3. Routing Halaman Tampilan (GET)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'landing.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// 4. Handler POST Register (Dukungan jalur /register dan /auth/register)
const handleRegister = (req, res) => {
  const { name, username, email, password } = req.body;

  // Respon sukses sementara
  res.json({
    status: 'success',
    message: 'Pendaftaran berhasil!',
    data: { name, username, email }
  });
};

app.post('/register', handleRegister);
app.post('/auth/register', handleRegister);

// 5. Handler POST Login (Dukungan jalur /login dan /auth/login)
const handleLogin = (req, res) => {
  const { identity, password } = req.body;

  if (identity && password) {
    res.json({
      status: 'success',
      message: 'Login berhasil!',
      data: { identity }
    });
  } else {
    res.status(400).json({
      status: 'error',
      message: 'Email/Username dan Password tidak boleh kosong!'
    });
  }
};

app.post('/login', handleLogin);
app.post('/auth/login', handleLogin);

// 6. Export app untuk Vercel Serverless Function
module.exports = app;
