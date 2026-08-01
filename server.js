// server.js — Entry point untuk jalan LOKAL (npm start / npm run dev).
// Untuk Vercel, entry point-nya beda: lihat api/index.js
const app = require("./app");

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));
