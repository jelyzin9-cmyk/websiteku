// api/index.js — Entry point khusus VERCEL. Semua request (/, /api/*, /dashboard/*, dst)
// diarahkan ke sini lewat vercel.json, lalu diteruskan ke Express app yang sama.
module.exports = require("../app");
