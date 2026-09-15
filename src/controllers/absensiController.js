const prisma = require("../utils/prismaClient");
const { tanggalHariIniWIB, jamSekarangWIB } = require("../utils/waktuIndonesia");
const { reverseGeocode } = require("../utils/reverseGeocode");

function jamKeDesimal(jamString) {
  const [jam, menit] = jamString.split(":").map(Number);
  return jam + (menit || 0) / 60;
}

async function ambilJamBatasMasuk() {
  const pengaturan = await prisma.pengaturanPotongan.findUnique({ where: { id: 1 } });
  const jamStandar = pengaturan?.jamMasukStandar || "08:00:00";
  return jamKeDesimal(jamStandar);
}

function tanggalHariIni() {
  return tanggalHariIniWIB();
}

function tentukanJamAbsen(waktuAsliDariKlien) {
  const sekarang = new Date();
  if (!waktuAsliDariKlien) return sekarang;

  const waktuKlien = new Date(waktuAsliDariKlien);
  if (isNaN(waktuKlien.getTime())) return sekarang;

  const batasMundur = new Date(sekarang.getTime() - 12 * 60 * 60 * 1000);
  if (waktuKlien > sekarang || waktuKlien < batasMundur) return sekarang;

  return waktuKlien;
}

function alamatBerupaKoordinat(alamat) {
  const teks = String(alamat || "").trim();
  if (!teks) return true;
  return /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?(?:\s*\(akurasi\s*±?\d+m\))?$/i.test(teks);
}

async function tentukanAlamat(latitude, longitude, alamatDariKlien) {
  const alamat = String(alamatDariKlien || "").trim();
  if (!alamatBerupaKoordinat(alamat)) return alamat;

  try {
    const hasil = await reverseGeocode(latitude, longitude);
    if (hasil) return hasil;
  } catch (error) {
    console.warn("Reverse geocoding server gagal:", error?.message || error);
  }

  const lat = Number(latitude);
  const lon = Number(longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return `${lat}, ${lon}`;
  }
  return null;
}

async function absenMasuk(req, res) {
  try {
    const penggunaId = req.user.id;
    const { latitude, longitude, alamat, waktuAsli } = req.body;

    if (!req.file) return res.status(400).json({ pesan: "Foto absen wajib diunggah." });

    const tanggal = tanggalHariIni();
    const sudahAbsen = await prisma.absensi.findUnique({
      where: { penggunaId_tanggal: { penggunaId, tanggal } },
    });

    if (sudahAbsen && sudahAbsen.jamMasuk) {
      return res.status(400).json({ pesan: "Anda sudah melakukan absen masuk hari ini." });
    }

    const jamBatasMasuk = await ambilJamBatasMasuk();
    const sekarang = tentukanJamAbsen(waktuAsli);
    const jamSekarang = jamSekarangWIB(sekarang);
    const statusOtomatis = jamSekarang <= jamBatasMasuk ? "tepat_waktu" : "telat";
    const fotoPath = req.file.filename;
    const alamatFinal = await tentukanAlamat(latitude, longitude, alamat);

    const data = {
      jamMasuk: sekarang,
      fotoMasuk: fotoPath,
      latitudeMasuk: latitude ? parseFloat(latitude) : null,
      longitudeMasuk: longitude ? parseFloat(longitude) : null,
      alamatMasuk: alamatFinal,
      statusOtomatis,
      statusFinal: statusOtomatis,
    };

    const absensi = sudahAbsen
      ? await prisma.absensi.update({ where: { id: sudahAbsen.id }, data })
      : await prisma.absensi.create({ data: { penggunaId, tanggal, ...data } });

    return res.status(201).json({
      pesan: `Absen masuk berhasil! Status: ${statusOtomatis === "tepat_waktu" ? "Tepat Waktu" : "Telat"}.`,
      data: absensi,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ pesan: "Terjadi kesalahan pada server.", detail: error.message });
  }
}

async function absenPulang(req, res) {
  try {
    const penggunaId = req.user.id;
    const { latitude, longitude, alamat, waktuAsli } = req.body;
    if (!req.file) return res.status(400).json({ pesan: "Foto absen wajib diunggah." });

    const tanggal = tanggalHariIni();
    const absensiHariIni = await prisma.absensi.findUnique({
      where: { penggunaId_tanggal: { penggunaId, tanggal } },
    });

    if (!absensiHariIni || !absensiHariIni.jamMasuk) {
      return res.status(400).json({ pesan: "Anda belum melakukan absen masuk hari ini." });
    }
    if (absensiHariIni.jamPulang) {
      return res.status(400).json({ pesan: "Anda sudah melakukan absen pulang hari ini." });
    }

    const alamatFinal = await tentukanAlamat(latitude, longitude, alamat);

    const absensi = await prisma.absensi.update({
      where: { id: absensiHariIni.id },
      data: {
        jamPulang: tentukanJamAbsen(waktuAsli),
        fotoPulang: req.file.filename,
        latitudePulang: latitude ? parseFloat(latitude) : null,
        longitudePulang: longitude ? parseFloat(longitude) : null,
        alamatPulang: alamatFinal,
      },
    });

    return res.status(200).json({ pesan: "Absen pulang berhasil! Terima kasih.", data: absensi });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ pesan: "Terjadi kesalahan pada server.", detail: error.message });
  }
}

async function riwayatSaya(req, res) {
  try {
    const riwayat = await prisma.absensi.findMany({
      where: { penggunaId: req.user.id },
      orderBy: { tanggal: "desc" },
      take: 31,
    });
    return res.json({ data: riwayat });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ pesan: "Terjadi kesalahan pada server." });
  }
}

async function statusHariIni(req, res) {
  try {
    const absensi = await prisma.absensi.findUnique({
      where: { penggunaId_tanggal: { penggunaId: req.user.id, tanggal: tanggalHariIni() } },
    });

    let tahap = "belum_masuk";
    if (absensi?.jamMasuk && !absensi?.jamPulang) tahap = "sudah_masuk";
    if (absensi?.jamMasuk && absensi?.jamPulang) tahap = "selesai";

    return res.json({ tahap, data: absensi || null });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ pesan: "Terjadi kesalahan pada server." });
  }
}

module.exports = { absenMasuk, absenPulang, riwayatSaya, statusHariIni };
