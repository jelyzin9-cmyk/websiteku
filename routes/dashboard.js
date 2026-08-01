// routes/dashboard.js — Semua endpoint API untuk isi panel dashboard kreator
const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../db");
const { requireAuth } = require("./auth");

const router = express.Router();
router.use(requireAuth);

// ---------- Ringkasan Dashboard ----------
router.get("/summary", (req, res) => {
  const uid = req.session.userId;
  const balance = db
    .prepare("SELECT COALESCE(SUM(amount),0) as total FROM donations WHERE user_id = ? AND status = 'paid'")
    .get(uid).total;
  const supporterCount = db
    .prepare("SELECT COUNT(DISTINCT donor_name) as c FROM donations WHERE user_id = ? AND status = 'paid'")
    .get(uid).c;
  const recent = db
    .prepare("SELECT donor_name, amount, message, created_at FROM donations WHERE user_id = ? AND status = 'paid' ORDER BY created_at DESC LIMIT 8")
    .all(uid);
  res.json({ balance, supporterCount, recent });
});

// ---------- Edit Halaman ----------
router.put("/profile", (req, res) => {
  const { displayName, bio, avatarLetter, minAmount } = req.body;
  db.prepare(
    `UPDATE users SET display_name = ?, bio = ?, avatar_letter = ?, min_amount = ? WHERE id = ?`
  ).run(displayName, bio || "", (avatarLetter || "B").slice(0, 1).toUpperCase(), parseInt(minAmount, 10) || 5000, req.session.userId);
  res.json({ ok: true });
});

// ---------- Widget Website (link overlay untuk OBS) ----------
router.get("/widget-info", (req, res) => {
  const user = db.prepare("SELECT username, overlay_token FROM users WHERE id = ?").get(req.session.userId);
  res.json({
    overlayUrl: `/overlay/${user.overlay_token}`,
    donationPageUrl: `/d/${user.username}`,
  });
});

// ---------- Overlay Control ----------
router.get("/overlay-settings", (req, res) => {
  const settings = db.prepare("SELECT * FROM overlay_settings WHERE user_id = ?").get(req.session.userId);
  res.json(settings);
});

router.put("/overlay-settings", (req, res) => {
  const { minAlert, minTts, minMediashare, alertDuration, ttsEnabled, mediashareEnabled, mediasharePlatform, coinsPerSecond } = req.body;
  db.prepare(
    `UPDATE overlay_settings SET min_alert=?, min_tts=?, min_mediashare=?, alert_duration_seconds=?,
     tts_enabled=?, mediashare_enabled=?, mediashare_platform=?, coins_per_second=? WHERE user_id = ?`
  ).run(
    parseInt(minAlert, 10) || 1000,
    parseInt(minTts, 10) || 3000,
    parseInt(minMediashare, 10) || 5000,
    parseInt(alertDuration, 10) || 6,
    ttsEnabled ? 1 : 0,
    mediashareEnabled ? 1 : 0,
    mediasharePlatform || "youtube",
    parseInt(coinsPerSecond, 10) || 250,
    req.session.userId
  );
  res.json({ ok: true });
});

// ---------- Riwayat Transaksi ----------
router.get("/transactions", (req, res) => {
  const uid = req.session.userId;
  const status = req.query.status; // optional filter: paid/pending/failed
  let rows;
  if (status) {
    rows = db
      .prepare("SELECT * FROM donations WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 200")
      .all(uid, status);
  } else {
    rows = db
      .prepare("SELECT * FROM donations WHERE user_id = ? ORDER BY created_at DESC LIMIT 200")
      .all(uid);
  }
  res.json(rows);
});

// ---------- Statistik ----------
router.get("/stats", (req, res) => {
  const uid = req.session.userId;
  const byDay = db
    .prepare(
      `SELECT date(created_at) as day, SUM(amount) as total, COUNT(*) as count
       FROM donations WHERE user_id = ? AND status = 'paid'
       GROUP BY day ORDER BY day DESC LIMIT 30`
    )
    .all(uid);
  const topDonors = db
    .prepare(
      `SELECT donor_name, SUM(amount) as total FROM donations
       WHERE user_id = ? AND status = 'paid' GROUP BY donor_name ORDER BY total DESC LIMIT 10`
    )
    .all(uid);
  res.json({ byDay, topDonors });
});

// ---------- Filter Kata ----------
router.get("/filter-words", (req, res) => {
  res.json(db.prepare("SELECT * FROM filter_words WHERE user_id = ?").all(req.session.userId));
});
router.post("/filter-words", (req, res) => {
  const { word } = req.body;
  if (!word || !word.trim()) return res.status(400).json({ error: "Kata wajib diisi" });
  db.prepare("INSERT INTO filter_words (user_id, word) VALUES (?, ?)").run(req.session.userId, word.trim());
  res.json({ ok: true });
});
router.delete("/filter-words/:id", (req, res) => {
  db.prepare("DELETE FROM filter_words WHERE id = ? AND user_id = ?").run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

// ---------- Blokir Media & IP ----------
router.get("/blocked", (req, res) => {
  res.json(db.prepare("SELECT * FROM blocked_entries WHERE user_id = ?").all(req.session.userId));
});
router.post("/blocked", (req, res) => {
  const { type, value } = req.body;
  if (!["ip", "media"].includes(type) || !value) return res.status(400).json({ error: "Data tidak valid" });
  db.prepare("INSERT INTO blocked_entries (user_id, type, value) VALUES (?, ?, ?)").run(req.session.userId, type, value.trim());
  res.json({ ok: true });
});
router.delete("/blocked/:id", (req, res) => {
  db.prepare("DELETE FROM blocked_entries WHERE id = ? AND user_id = ?").run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

// ---------- Akun & Keamanan ----------
router.put("/password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Password saat ini salah" });
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: "Password baru minimal 8 karakter" });
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, req.session.userId);
  res.json({ ok: true });
});

module.exports = router;
