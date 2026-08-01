// routes/donate.js — Endpoint publik: profil kreator, buat transaksi, webhook Midtrans, SSE overlay
const express = require("express");
const midtransClient = require("midtrans-client");
const { db } = require("../db");

const router = express.Router();

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Simpan koneksi SSE aktif per overlay_token, supaya donasi baru bisa langsung di-push ke OBS
const overlayClients = new Map(); // token -> Set of res

function pushToOverlay(token, payload) {
  const clients = overlayClients.get(token);
  if (!clients) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((res) => res.write(data));
}

// ---------- Profil kreator publik (dipakai halaman donasi /d/:username) ----------
router.get("/creator/:username", (req, res) => {
  const user = db
    .prepare("SELECT username, display_name, bio, avatar_letter, min_amount FROM users WHERE username = ?")
    .get(req.params.username);
  if (!user) return res.status(404).json({ error: "Halaman tidak ditemukan" });
  res.json(user);
});

// ---------- Buat transaksi Midtrans ----------
router.post("/create-transaction", async (req, res) => {
  try {
    const { username, name, email, message, amount, method, submethod } = req.body;

    const creator = db.prepare("SELECT id, min_amount FROM users WHERE username = ?").get(username);
    if (!creator) return res.status(404).json({ error: "Halaman tidak ditemukan" });

    const cleanAmount = parseInt(amount, 10);
    if (!cleanAmount || cleanAmount < 1000) return res.status(400).json({ error: "Jumlah donasi tidak valid" });
    if (!name || !name.trim()) return res.status(400).json({ error: "Nama wajib diisi" });
    if (method === "bank" && cleanAmount < 250000) return res.status(400).json({ error: "Minimal transfer bank Rp 250.000" });

    // Cek filter kata sederhana di pesan
    const bannedWords = db.prepare("SELECT word FROM filter_words WHERE user_id = ?").all(creator.id).map((w) => w.word.toLowerCase());
    let cleanMessage = message || "";
    bannedWords.forEach((w) => {
      if (w) cleanMessage = cleanMessage.replace(new RegExp(w, "ig"), "***");
    });

    const orderId = `donasi-${creator.id}-${Date.now()}`;

    const paymentMap = {
      qris: ["qris"],
      ewallet: submethod ? [submethod] : ["gopay", "shopeepay"],
      bank: submethod ? [submethod] : ["bca_va", "bni_va", "bri_va", "mandiri_va", "permata_va", "cimb_va"],
    };

    const parameter = {
      transaction_details: { order_id: orderId, gross_amount: cleanAmount },
      enabled_payments: paymentMap[method] || undefined,
      customer_details: { first_name: name, email: email || undefined },
      item_details: [{ id: "donasi", price: cleanAmount, quantity: 1, name: "Dukungan untuk kreator" }],
    };

    const transaction = await snap.createTransaction(parameter);

    db.prepare(
      `INSERT INTO donations (user_id, order_id, donor_name, donor_email, message, amount, method, submethod, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).run(creator.id, orderId, name, email || "", cleanMessage, cleanAmount, method, submethod || null);

    res.json({ token: transaction.token, redirect_url: transaction.redirect_url });
  } catch (err) {
    console.error("Gagal membuat transaksi Midtrans:", err.message);
    res.status(500).json({ error: "Gagal membuat transaksi" });
  }
});

// ---------- Webhook notifikasi Midtrans ----------
router.post("/midtrans-notification", async (req, res) => {
  try {
    const statusResponse = await snap.transaction.notification(req.body);
    const { order_id, transaction_status, fraud_status } = statusResponse;

    const donation = db.prepare("SELECT * FROM donations WHERE order_id = ?").get(order_id);
    if (!donation) return res.status(200).send("OK");

    let newStatus = donation.status;
    if ((transaction_status === "capture" || transaction_status === "settlement") && (fraud_status === "accept" || !fraud_status)) {
      newStatus = "paid";
    } else if (["deny", "cancel", "expire"].includes(transaction_status)) {
      newStatus = "failed";
    } else if (transaction_status === "pending") {
      newStatus = "pending";
    }
    db.prepare("UPDATE donations SET status = ? WHERE order_id = ?").run(newStatus, order_id);

    if (newStatus === "paid") {
      const user = db.prepare("SELECT overlay_token FROM users WHERE id = ?").get(donation.user_id);
      const settings = db.prepare("SELECT * FROM overlay_settings WHERE user_id = ?").get(donation.user_id);
      if (user && donation.amount >= settings.min_alert) {
        pushToOverlay(user.overlay_token, {
          name: donation.donor_name,
          amount: donation.amount,
          message: donation.amount >= settings.min_alert ? donation.message : "",
          tts: settings.tts_enabled && donation.amount >= settings.min_tts,
          duration: settings.alert_duration_seconds,
        });
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Gagal proses notifikasi Midtrans:", err.message);
    res.status(500).send("Error");
  }
});

// ---------- SSE stream untuk overlay OBS ----------
router.get("/overlay-stream/:token", (req, res) => {
  const token = req.params.token;
  const user = db.prepare("SELECT id FROM users WHERE overlay_token = ?").get(token);
  if (!user) return res.status(404).end();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("retry: 3000\n\n");

  if (!overlayClients.has(token)) overlayClients.set(token, new Set());
  overlayClients.get(token).add(res);

  req.on("close", () => {
    overlayClients.get(token)?.delete(res);
  });
});

module.exports = router;
