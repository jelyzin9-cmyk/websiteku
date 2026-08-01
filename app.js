// app.js — Konfigurasi Express (dipakai bareng oleh server.js lokal & api/index.js Vercel)
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const { router: authRouter } = require("./routes/auth");
const dashboardRouter = require("./routes/dashboard");
const donateRouter = require("./routes/donate");
const withdrawRouter = require("./routes/withdraw");

const app = express();
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "ganti-secret-ini-di-env",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 7 hari
    // CATATAN buat Vercel: ini pakai MemoryStore bawaan express-session.
    // Di serverless, memory ini TIDAK dibagi antar instance — jadi user bisa
    // ke-logout sendiri secara acak. Aman untuk testing, tapi sebelum dipakai
    // serius sebaiknya diganti session store eksternal (mis. Redis) atau JWT.
  })
);

const rootDir = __dirname;

// ---------- API ----------
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/dashboard", withdrawRouter);
app.use("/api", donateRouter); // /api/creator/:username, /api/create-transaction, dst

// ---------- Halaman statis ----------
app.use("/assets", express.static(path.join(rootDir, "public")));

// Halaman publik: landing sederhana, login, register
app.get("/", (req, res) => res.sendFile(path.join(rootDir, "views", "landing.html")));
app.get("/login", (req, res) => res.sendFile(path.join(rootDir, "views", "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(rootDir, "views", "register.html")));

// Halaman donasi publik per-kreator, mis: /d/bintang
app.get("/d/:username", (req, res) => res.sendFile(path.join(rootDir, "public", "donate.html")));

// Overlay OBS browser source (publik lewat token acak, tidak butuh login)
app.get("/overlay/:token", (req, res) => res.sendFile(path.join(rootDir, "public", "overlay.html")));

// Dashboard kreator (semua di-guard oleh auth check di sisi client + API requireAuth)
const dashboardPages = [
  "dashboard", "edit-halaman", "widget-website", "transactions",
  "stats", "filter-moderasi", "blokir", "akun-keamanan", "overlay-control",
  "toko-voucher", "replay-support", "integrasi-overlay", "balance",
];
dashboardPages.forEach((page) => {
  app.get(`/dashboard/${page === "dashboard" ? "" : page}`, (req, res) =>
    res.sendFile(path.join(rootDir, "views", `${page}.html`))
  );
});

module.exports = app;
