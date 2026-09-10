const prisma = require("../utils/prismaClient");

async function editLokasiAbsensi(req, res) {
  try {
    const id = Number(req.params.id);
    const alamatMasuk = String(req.body?.alamatMasuk || "").trim();

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ pesan: "ID absensi tidak valid." });
    }

    if (!alamatMasuk) {
      return res.status(400).json({ pesan: "Alamat lokasi wajib diisi." });
    }

    if (alamatMasuk.length > 500) {
      return res.status(400).json({ pesan: "Alamat lokasi maksimal 500 karakter." });
    }

    const absensi = await prisma.absensi.findUnique({ where: { id } });

    if (!absensi) {
      return res.status(404).json({ pesan: "Data absensi tidak ditemukan." });
    }

    // Admin hanya mengubah alamat yang tampil ke pengguna.
    // Latitude/longitude hasil GPS karyawan tetap dipertahankan apa adanya.
    const data = await prisma.absensi.update({
      where: { id },
      data: { alamatMasuk },
    });

    return res.json({
      pesan: "Alamat lokasi absensi berhasil diperbarui.",
      data,
    });
  } catch (error) {
    console.error("Gagal mengubah alamat lokasi absensi:", error);
    return res.status(500).json({ pesan: "Terjadi kesalahan pada server." });
  }
}

module.exports = { editLokasiAbsensi };
