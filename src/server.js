require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const absensiRoutes = require("./routes/absensiRoutes");
const adminRoutes = require("./routes/adminRoutes");
const izinRoutes = require("./routes/izinRoutes");

const app = express();

app.use((req, res, next) => {
  console.log(`➡️  ${req.method} ${req.url}`);
  next();
});

// Daftar alamat frontend yang boleh akses API ini.
// Saat development, browser dari HP (misal http://192.168.x.x:5173) juga
// perlu diizinkan, jadi kita terima pola IP lokal secara otomatis.
// Untuk production, WAJIB isi FRONTEND_URL di .env dengan domain asli
// (misal https://absensi.ptzamanteknindo.com), supaya API tidak bisa
// dipanggil sembarangan dari website lain di internet.
const originYangDiizinkan = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Pakai "https?" (bukan cuma "http") -- sekarang kita jalanin HTTPS lokal
// (lewat plugin basicSsl di Vite) supaya kamera & lokasi HP bisa diakses,
// jadi origin dari HP juga akan berupa https://192.168.x.x:5173.
const polaIpLokal = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d+$/;

// ngrok (dipakai buat testing dari HP lewat internet, bukan cuma WiFi yang
// sama) selalu kasih subdomain acak yang BEDA setiap kali di-restart --
// jadi tidak bisa dimasukkan satu-satu ke FRONTEND_URL. Izinkan seluruh
// pola *.ngrok-free.dev secara otomatis. Ini aman karena cuma dipakai
// buat testing development, bukan untuk production (nanti pas deploy
// sungguhan, akses lewat ngrok sudah tidak dipakai lagi).
const polaNgrok = /^https:\/\/[a-z0-9-]+\.ngrok-free\.dev$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Request tanpa header origin (misal dari Postman/curl) tetap diizinkan,
      // supaya tidak mengganggu testing manual
      if (!origin) return callback(null, true);
      if (polaIpLokal.test(origin)) return callback(null, true);
      if (polaNgrok.test(origin)) return callback(null, true);
      if (originYangDiizinkan.includes(origin)) return callback(null, true);
      return callback(new Error("Domain ini tidak diizinkan mengakses API."));
    },
  })
);
app.use(express.json());

// Supaya folder "uploads" (foto absen) bisa diakses lewat browser
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Rute-rute utama
app.use("/api/auth", authRoutes);
app.use("/api/absensi", absensiRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/izin", izinRoutes);

// Rute cek server hidup
app.get("/", (req, res) => {
  res.json({ pesan: "Server Sistem Absensi berjalan dengan baik 🚀" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
