const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Fallback MongoDB Connection (opsional & aman dari crash)
let mongoose;
try {
  mongoose = require('mongoose');
  const MONGO_URI = process.env.MONGO_URI || "";
  if (MONGO_URI) {
    mongoose.connect(MONGO_URI).catch(err => console.log("DB Error:", err.message));
  }
} catch (e) {
  console.log("Mongoose tidak dimuat:", e.message);
}

// --- ROUTE TAMPILAN (GET) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'landing.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// --- ROUTE PROSES FORM (POST) ---
const handleRegister = (req, res) => {
  // Sementara redirect langsung ke login tanpa bikin server crash
  return res.redirect('/login');
};

const handleLogin = (req, res) => {
  // Sementara redirect langsung ke dashboard
  return res.redirect('/dashboard');
};

app.post('/register', handleRegister);
app.post('/auth/register', handleRegister);
app.post('/login', handleLogin);
app.post('/auth/login', handleLogin);

app.get('/logout', (req, res) => {
  res.redirect('/login');
});

module.exports = app;
