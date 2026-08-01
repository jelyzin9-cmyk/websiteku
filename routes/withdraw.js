// routes/withdraw.js — Saldo, rekening tujuan (bank/e-wallet), dan penarikan dana
const express = require("express");
const { db } = require("../db");
const { requireAuth } = require("./auth");
const iris = require("../lib/iris");

const router = express.Router();
router.use(requireAuth);

const MIN_WITHDRAW = 50000; // minimal penarikan, sesuaikan sesuai kebijakanmu

function getAvailableBalance(userId) {
  const totalPaid = db
    .prepare("SELECT COALESCE(SUM(amount),0) as t FROM donations WHERE user_id = ? AND status = 'paid'")
    .get(userId).t;
  const totalWithdrawn = db
    .prepare("SELECT COALESCE(SUM(amount),0) as t FROM withdrawals WHERE user_id = ? AND status IN ('pending','processing','completed')")
    .get(userId).t;
  return totalPaid - totalWithdrawn;
}

// ---------- Ringkasan saldo ----------
router.get("/balance", (req, res) => {
  res.json({ available: getAvailableBalance(req.session.userId), minWithdraw: MIN_WITHDRAW });
});

// ---------- Rekening/e-wallet tujuan ----------
router.get("/payout-accounts", (req, res) => {
  res.json(db.prepare("SELECT * FROM payout_accounts WHERE user_id = ?").all(req.session.userId));
});

router.post("/payout-accounts", (req, res) => {
  const { type, bankCode, accountNumber, accountName } = req.body;
  if (!["bank", "ewallet"].includes(type) || !bankCode || !accountNumber || !accountName) {
    return res.status(400).json({ error: "Data rekening tidak lengkap" });
  }
  db.prepare(
    `INSERT INTO payout_accounts (user_id, type, bank_code, account_number, account_name) VALUES (?, ?, ?, ?, ?)`
  ).run(req.session.userId, type, bankCode, accountNumber, accountName);
  res.json({ ok: true });
});

router.delete("/payout-accounts/:id", (req, res) => {
  db.prepare("DELETE FROM payout_accounts WHERE id = ? AND user_id = ?").run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

// ---------- Riwayat penarikan ----------
router.get("/withdrawals", (req, res) => {
  const rows = db
    .prepare(
      `SELECT w.*, p.type, p.bank_code, p.account_number, p.account_name
       FROM withdrawals w JOIN payout_accounts p ON w.payout_account_id = p.id
       WHERE w.user_id = ? ORDER BY w.created_at DESC`
    )
    .all(req.session.userId);
  res.json(rows);
});

// ---------- Ajukan penarikan ----------
router.post("/withdraw", async (req, res) => {
  const uid = req.session.userId;
  const { payoutAccountId, amount } = req.body;
  const cleanAmount = parseInt(amount, 10);

  if (!cleanAmount || cleanAmount < MIN_WITHDRAW) {
    return res.status(400).json({ error: `Minimal penarikan Rp ${MIN_WITHDRAW.toLocaleString("id-ID")}` });
  }
  const available = getAvailableBalance(uid);
  if (cleanAmount > available) {
    return res.status(400).json({ error: "Saldo tidak mencukupi" });
  }
  const account = db.prepare("SELECT * FROM payout_accounts WHERE id = ? AND user_id = ?").get(payoutAccountId, uid);
  if (!account) return res.status(404).json({ error: "Rekening tujuan tidak ditemukan" });

  if (!process.env.IRIS_API_KEY) {
    return res.status(503).json({
      error: "Fitur pencairan belum aktif — IRIS_API_KEY belum diisi. Akun Iris kamu perlu disetujui Midtrans dulu (lihat README).",
    });
  }

  // Catat dulu sebagai 'pending' sebelum panggil Iris, supaya saldo langsung terkunci
  // dan tidak bisa ditarik dobel kalau request diulang.
  const info = db
    .prepare(`INSERT INTO withdrawals (user_id, payout_account_id, amount, status) VALUES (?, ?, ?, 'pending')`)
    .run(uid, payoutAccountId, cleanAmount);

  try {
    const result = await iris.createPayout({
      bank: account.bank_code,
      accountNumber: account.account_number,
      accountName: account.account_name,
      amount: cleanAmount,
      notes: `Penarikan saldo #${info.lastInsertRowid}`,
    });

    const referenceNo = result?.payouts?.[0]?.reference_no || null;
    db.prepare("UPDATE withdrawals SET status = 'processing', reference_no = ? WHERE id = ?").run(referenceNo, info.lastInsertRowid);

    res.json({ ok: true, referenceNo, note: "Penarikan diajukan. Tergantung pengaturan akun Iris-mu, mungkin masih perlu disetujui manual di dashboard Midtrans sebelum dana benar-benar terkirim." });
  } catch (err) {
    console.error("Gagal membuat payout Iris:", err.response?.data || err.message);
    db.prepare("UPDATE withdrawals SET status = 'failed', notes = ? WHERE id = ?").run(
      JSON.stringify(err.response?.data || err.message),
      info.lastInsertRowid
    );
    res.status(500).json({ error: "Gagal memproses penarikan. Cek kembali data rekening atau saldo Iris-mu." });
  }
});

module.exports = router;
