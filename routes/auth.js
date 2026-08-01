// routes/auth.js — Register, login, logout untuk akun kreator
const express = require("express");
const bcrypt = require("bcryptjs");
const { db, genToken } = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: "Semua field wajib diisi" });
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: "Username 3-20 karakter, huruf kecil/angka/underscore saja" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password minimal 8 karakter" });
    }

    const existing = db.prepare("SELECT id FROM users WHERE username = ? OR email = ?").get(username, email);
    if (existing) {
      return res.status(409).json({ error: "Username atau email sudah dipakai" });
    }

    const hash = await bcrypt.hash(password, 10);
    const overlayToken = genToken();

    const info = db
      .prepare(
        `INSERT INTO users (username, email, password_hash, display_name, overlay_token)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(username, email, hash, displayName, overlayToken);

    db.prepare("INSERT INTO overlay_settings (user_id) VALUES (?)").run(info.lastInsertRowid);

    req.session.userId = info.lastInsertRowid;
    res.json({ ok: true, username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mendaftar" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    const user = db
      .prepare("SELECT * FROM users WHERE email = ? OR username = ?")
      .get(emailOrUsername, emailOrUsername);

    if (!user) return res.status(401).json({ error: "Akun tidak ditemukan" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Password salah" });

    req.session.userId = user.id;
    res.json({ ok: true, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal login" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/me", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Belum login" });
  const user = db
    .prepare("SELECT id, username, email, display_name, bio, avatar_letter, min_amount, overlay_token FROM users WHERE id = ?")
    .get(req.session.userId);
  res.json(user);
});

// Middleware untuk melindungi endpoint dashboard
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Belum login" });
  next();
}

module.exports = { router, requireAuth };
