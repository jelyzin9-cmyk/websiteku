// lib/iris.js — Wrapper untuk Midtrans Iris API (pencairan dana ke bank/e-wallet)
// Dokumentasi resmi: https://iris-docs.midtrans.com
//
// PENTING: Iris adalah produk TERPISAH dari Snap (yang dipakai untuk terima donasi).
// Akun Midtrans biasa TIDAK otomatis punya akses Iris — harus diajukan & disetujui
// oleh tim Midtrans terlebih dulu (ada proses verifikasi bisnis tambahan).

const axios = require("axios");

const IRIS_BASE_URL = process.env.IRIS_BASE_URL || "https://app.sandbox.midtrans.com/iris/api/v1";
const IRIS_API_KEY = process.env.IRIS_API_KEY || "";

function client() {
  return axios.create({
    baseURL: IRIS_BASE_URL,
    auth: { username: IRIS_API_KEY, password: "" }, // Basic Auth: API key sbg username, password kosong
    headers: { "Content-Type": "application/json" },
  });
}

// Ambil daftar bank yang didukung Iris (dipakai untuk dropdown di form penarikan)
async function getBeneficiaryBanks() {
  const res = await client().get("/beneficiary_banks");
  return res.data.beneficiary_banks;
}

// Validasi nomor rekening tujuan sebelum membuat payout (opsional tapi disarankan)
async function validateAccount(bank, accountNumber) {
  const res = await client().get("/account_validation", {
    params: { bank, account: accountNumber },
  });
  return res.data;
}

// Buat satu payout (pencairan dana). Statusnya biasanya "created", lalu butuh
// approval (bisa manual lewat dashboard Iris, atau otomatis kalau akunmu di-setting demikian).
async function createPayout({ bank, accountNumber, accountName, amount, notes, referenceNo }) {
  const res = await client().post("/payouts", {
    payouts: [
      {
        beneficiary_name: accountName,
        beneficiary_account: accountNumber,
        beneficiary_bank: bank,
        beneficiary_email: undefined,
        amount: String(amount),
        notes: notes || "Pencairan saldo dukungan",
      },
    ],
  });
  return res.data;
}

// Cek status payout berdasarkan reference_no
async function getPayoutStatus(referenceNo) {
  const res = await client().get(`/payouts/${referenceNo}`);
  return res.data;
}

module.exports = { getBeneficiaryBanks, validateAccount, createPayout, getPayoutStatus };
