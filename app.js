const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

const app = express();

// Middleware Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session Management
app.use(session({
  secret: 'rahasia_super_aman_123',
  resave: false,
  saveUninitialized: false
}));

// Koneksi Database MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:admin123@cluster0.mongodb.net/myDatabase?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
  .then(() => console.log('Database Connected!'))
  .catch(err => console.log('DB Connection Error: ', err));

// Schema & Model User
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Middleware Proteksi Dashboard
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// --- ROUTING TAMPILAN (GET) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'landing.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/dashboard', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));

// --- ROUTING PROSES (POST) ---

// Process Register
const handleRegister = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).send('Username atau Email sudah terdaftar!');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    await newUser.save();
    return res.redirect('/login');

  } catch (error) {
    console.error(error);
    return res.status(500).send('Terjadi kesalahan server!');
  }
};

app.post('/register', handleRegister);
app.post('/auth/register', handleRegister);

// Process Login
const handleLogin = async (req, res) => {
  try {
    const { identity, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identity.toLowerCase().trim() },
        { username: identity.toLowerCase().trim() }
      ]
    });

    if (!user) {
      return res.status(400).send('User tidak ditemukan!');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send('Password salah!');
    }

    req.session.userId = user._id;
    req.session.userName = user.name;

    return res.redirect('/dashboard');

  } catch (error) {
    console.error(error);
    return res.status(500).send('Terjadi kesalahan server!');
  }
};

app.post('/login', handleLogin);
app.post('/auth/login', handleLogin);

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = app;
// Middleware Proteksi Dashboard
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// --- ROUTING TAMPILAN (GET) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'landing.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/dashboard', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));

// --- ROUTING PROSES (POST) ---

// Process Register
const handleRegister = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).send('Username atau Email sudah terdaftar!');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    await newUser.save();
    return res.redirect('/login');

  } catch (error) {
    console.error(error);
    return res.status(500).send('Terjadi kesalahan server!');
  }
};

app.post('/register', handleRegister);
app.post('/auth/register', handleRegister);

// Process Login
const handleLogin = async (req, res) => {
  try {
    const { identity, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identity.toLowerCase().trim() },
        { username: identity.toLowerCase().trim() }
      ]
    });

    if (!user) {
      return res.status(400).send('User tidak ditemukan!');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send('Password salah!');
    }

    req.session.userId = user._id;
    req.session.userName = user.name;

    return res.redirect('/dashboard');

  } catch (error) {
    console.error(error);
    return res.status(500).send('Terjadi kesalahan server!');
  }
};

app.post('/login', handleLogin);
app.post('/auth/login', handleLogin);

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = app;
