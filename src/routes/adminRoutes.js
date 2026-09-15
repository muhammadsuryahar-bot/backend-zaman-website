const express = require("express");
const router = express.Router();
const { cekLogin, cekAdmin } = require("../middleware/authMiddleware");
const legacyAdmin = require("../controllers/adminController");
const adminCore = require("../controllers/adminCoreController");

const { editLokasiAbsensi } = require("../controllers/editLokasiController");
const { resetPasswordOlehAdmin } = require("../controllers/authController");

const {
  hitungDanSimpanSatu,
  hitungDanSimpanSemua,
  lihatLaporanBulanan,
} = require("../controllers/hitungGajiController");

const { exportLaporanExcel } = require("../controllers/exportGajiController");

router.use(cekLogin, cekAdmin);

// Redaksi detail error internal sebelum response meninggalkan boundary API.
router.use((req, res, next) => {
  const jsonAsli = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === "object" && !Array.isArray(body) && Object.prototype.hasOwnProperty.call(body, "detail")) {
      const { detail, ...aman } = body;
      return jsonAsli(aman);
    }
    return jsonAsli(body);
  };
  next();
});

const STATUS_AKUN_VALID = new Set(["aktif", "nonaktif"]);
function validasiStatusAkun(req, res, next) {
  const statusAkun = String(req.body?.statusAkun || "").trim();
  if (!STATUS_AKUN_VALID.has(statusAkun)) {
    return res.status(400).json({ pesan: "Status akun tidak valid. Gunakan hanya 'aktif' atau 'nonaktif'." });
  }
  next();
}

const STATUS_FINAL_VALID = new Set(["tepat_waktu", "telat", "alpha", "izin", "sakit", "cuti", "urgent"]);
function validasiEditStatusAbsensi(req, res, next) {
  const statusFinal = String(req.body?.statusFinal || "").trim();
  const catatanAdmin = String(req.body?.catatanAdmin || "").trim();
  if (!STATUS_FINAL_VALID.has(statusFinal)) {
    return res.status(400).json({ pesan: "Status absensi tidak valid." });
  }
  if (!catatanAdmin) return res.status(400).json({ pesan: "Catatan wajib diisi kalau mengubah status absensi secara manual." });
  if (catatanAdmin.length > 500) return res.status(400).json({ pesan: "Catatan Admin maksimal 500 karakter." });
  next();
}

function validasiEditLokasiAbsensi(req, res, next) {
  const alamatMasuk = String(req.body?.alamatMasuk || "").trim();
  if (!alamatMasuk) return res.status(400).json({ pesan: "Alamat lokasi wajib diisi." });
  if (alamatMasuk.length > 500) return res.status(400).json({ pesan: "Alamat lokasi maksimal 500 karakter." });
  next();
}

// ============================================================
// AKUN & KARYAWAN — memakai controller teroptimasi
// ============================================================
router.get("/akun-menunggu", adminCore.daftarMenungguKonfirmasi);
router.put("/akun/:id/aktifkan", adminCore.aktifkanAkun);
router.get("/karyawan", adminCore.daftarKaryawan);
router.put("/karyawan/:id/status", validasiStatusAkun, legacyAdmin.ubahStatusKaryawan);
router.put("/karyawan/:id/reset-password", resetPasswordOlehAdmin);

// ============================================================
// ABSENSI — query rekap dipersempit dan mendukung filter tanggal
// ============================================================
router.get("/rekap-hari-ini", adminCore.rekapHariIni);
router.get("/rekap-tanggal", adminCore.rekapTanggal);
router.get("/ringkasan", legacyAdmin.ringkasanDashboard);
router.put("/absensi/:id/edit-status", validasiEditStatusAbsensi, legacyAdmin.editStatusAbsensi);
router.put("/absensi/:id/edit-lokasi", validasiEditLokasiAbsensi, editLokasiAbsensi);

// ============================================================
// PENGATURAN POTONGAN
// ============================================================
router.get("/pengaturan-potongan", legacyAdmin.ambilPengaturanPotongan);
router.put("/pengaturan-potongan", legacyAdmin.ubahPengaturanPotongan);

// ============================================================
// GAJI
// ============================================================
router.get("/gaji", legacyAdmin.daftarGajiKaryawan);
router.put("/gaji/:id/atur", legacyAdmin.ubahGajiKaryawan);
router.post("/gaji/hitung/:penggunaId", hitungDanSimpanSatu);
router.post("/gaji/hitung-semua", hitungDanSimpanSemua);
router.get("/gaji/laporan", lihatLaporanBulanan);
router.get("/gaji/export", exportLaporanExcel);

// ============================================================
// KANTOR
// ============================================================
router.get("/kantor", legacyAdmin.daftarKantor);
router.post("/kantor", legacyAdmin.tambahKantor);
router.put("/kantor/:id", legacyAdmin.ubahKantor);

// ============================================================
// HARI LIBUR
// ============================================================
router.get("/hari-libur", legacyAdmin.daftarHariLibur);
router.post("/hari-libur", legacyAdmin.tambahHariLibur);
router.delete("/hari-libur/:id", legacyAdmin.hapusHariLibur);
router.get("/hari-libur-usulan", legacyAdmin.usulanHariLibur);

module.exports = router;
