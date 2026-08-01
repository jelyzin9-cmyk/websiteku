// db.js — Setup database SQLite untuk seluruh sistem (akun kreator, halaman, donasi, dst)
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Vercel (serverless) hanya izinkan tulis ke /tmp, dan isinya HILANG tiap cold start/redeploy.
// cPanel & lokal punya filesystem normal yang persisten — pakai folder ./data.
const isVercel = !!process.env.VERCEL;
const dbDir = isVercel ? "/tmp" : path.join(__dirname, "data");
if (!isVercel && !fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, "app.db"));
db.pragma("journal_mode = WAL");

if (isVercel) {
  console.warn("[Vercel] Database jalan di /tmp — data akan HILANG tiap cold start/redeploy. Cuma buat testing.");
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_letter TEXT DEFAULT 'B',
  min_amount INTEGER DEFAULT 5000,
  overlay_token TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS overlay_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  min_alert INTEGER DEFAULT 1000,
  min_tts INTEGER DEFAULT 3000,
  min_mediashare INTEGER DEFAULT 5000,
  alert_duration_seconds INTEGER DEFAULT 6,
  tts_enabled INTEGER DEFAULT 1,
  mediashare_enabled INTEGER DEFAULT 0,
  mediashare_platform TEXT DEFAULT 'youtube',
  coins_per_second INTEGER DEFAULT 250
);

CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  order_id TEXT UNIQUE NOT NULL,
  donor_name TEXT NOT NULL,
  donor_email TEXT DEFAULT '',
  message TEXT DEFAULT '',
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  submethod TEXT,
  status TEXT DEFAULT 'pending',
  shown_on_overlay INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS filter_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  word TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blocked_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  type TEXT NOT NULL, -- 'ip' or 'media'
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payout_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  type TEXT NOT NULL, -- 'bank' or 'ewallet'
  bank_code TEXT NOT NULL, -- mis. 'bca', 'bni', 'gopay', 'ovo', 'dana'
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  payout_account_id INTEGER REFERENCES payout_accounts(id),
  amount INTEGER NOT NULL,
  reference_no TEXT,
  status TEXT DEFAULT 'pending', -- pending -> processing -> completed / failed
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

function genToken() {
  return crypto.randomBytes(16).toString("hex");
}

module.exports = { db, genToken };
