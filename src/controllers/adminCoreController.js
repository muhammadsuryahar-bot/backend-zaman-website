const prisma = require("../utils/prismaClient");
const { tanggalHariIniWIB } = require("../utils/waktuIndonesia");

function validTanggal(tanggal) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(tanggal || ""));
}

async function daftarMenungguKonfirmasi(req, res) {
  try {
    const data = await prisma.pengguna.findMany({
      where: { statusAkun: "menunggu_konfirmasi" },
      select: { id: true, nama: true, email: true, dibuatPada: true },
      orderBy: { dibuatPada: "desc" },
    });
    return res.json({ data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ pesan: "Terjadi kesalahan pada server." });
  }
}

async function aktifkanAkun(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const jabatan = String(req.body?.jabatan || "").trim();
    const divisi = String(req.body?.divisi || "").trim();
    const kantorId = Number.parseInt(req.body?.kantorId, 10);

    if (!Number.isInteger(id)) return res.status(400).json({ pesan: "ID akun tidak valid." });
    if (!jabatan || !divisi) return res.status(400).json({ pesan: "Jabatan dan divisi wajib diisi." });
    if (!Number.isInteger(kantorId)) return res.status(400).json({ pesan: "Homebase karyawan wajib dipilih." });

    const kantor = await prisma.kantor.findUnique({ where: { id: kantorId }, select: { id: true } });
    if (!kantor) return res.status(400).json({ pesan: "Homebase yang dipilih tidak ditemukan." });

    const pengguna = await prisma.pengguna.update({
      where: { id },
      data: { jabatan, divisi, kantorId, statusAkun: "aktif" },
      select: { id: true, nama: true, email: true, jabatan: true, divisi: true, kantorId: true, statusAkun: true },
    });

    return res.json({ pesan: `Akun ${pengguna.nama} berhasil diaktifkan.`, data: pengguna });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ pesan: "Terjadi kesalahan pada server." });
  }
}

async function daftarKaryawan(req, res) {
  try {
    const data = await prisma.pengguna.findMany({
      where: { peran: "karyawan", statusAkun: { not: "menunggu_konfirmasi" } },
      select: {
        id: true,
        nama: true,
        email: true,
        jabatan: true,
        divisi: true,
        kantorId: true,
        statusAkun: true,
        kantor: { select: { id: true, namaKantor: true } },
      },
      orderBy: { nama: "asc" },
    });
    return res.json({ data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ pesan: "Terjadi kesalahan pada server." });
  }
}

async function queryRekap(tanggal) {
  const [data, karyawanAktif] = await Promise.all([
    prisma.absensi.findMany({
      where: { tanggal },
      select: {
        id: true,
        tanggal: true,
        jamMasuk: true,
        jamPulang: true,
        fotoMasuk: true,
        fotoPulang: true,
        latitudeMasuk: true,
        longitudeMasuk: true,
        latitudePulang: true,
        longitudePulang: true,
        alamatMasuk: true,
        alamatPulang: true,
        statusOtomatis: true,
        statusFinal: true,
        pengguna: { select: { id: true, nama: true, jabatan: true, divisi: true } },
      },
      orderBy: [{ jamMasuk: "asc" }, { id: "asc" }],
    }),
    prisma.pengguna.findMany({
      where: { peran: "karyawan", statusAkun: "aktif" },
      select: { id: true, nama: true, jabatan: true, divisi: true },
      orderBy: { nama: "asc" },
    }),
  ]);

  const sudahAbsen = new Set(data.map((item) => item.pengguna?.id).filter((id) => id != null));
  const belumAbsen = karyawanAktif.filter((item) => !sudahAbsen.has(item.id));

  const dataTampil = data.map((item) => ({
    ...item,
    alamatMasuk:
      item.alamatMasuk ||
      (item.latitudeMasuk != null && item.longitudeMasuk != null
        ? `Lokasi GPS · ${item.latitudeMasuk}, ${item.longitudeMasuk}`
        : null),
    alamatPulang:
      item.alamatPulang ||
      (item.latitudePulang != null && item.longitudePulang != null
        ? `Lokasi GPS · ${item.latitudePulang}, ${item.longitudePulang}`
        : null),
  }));

  return { data: dataTampil, belumAbsen, jumlahKaryawanAktif: karyawanAktif.length };
}

async function rekapHariIni(req, res) {
  try {
    const tanggal = tanggalHariIniWIB();
    const hasil = await queryRekap(tanggal);
    return res.json({ ...hasil, tanggal });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ pesan: "Terjadi kesalahan pada server." });
  }
}

async function rekapTanggal(req, res) {
  try {
    const tanggal = String(req.query?.tanggal || "").trim();
    const hariIni = tanggalHariIniWIB();
    if (!validTanggal(tanggal)) return res.status(400).json({ pesan: "Format tanggal harus YYYY-MM-DD." });
    if (tanggal > hariIni) return res.status(400).json({ pesan: "Tanggal rekap tidak boleh melebihi hari ini." });

    const hasil = await queryRekap(tanggal);
    return res.json({ ...hasil, tanggal });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ pesan: "Terjadi kesalahan pada server." });
  }
}

module.exports = {
  daftarMenungguKonfirmasi,
  aktifkanAkun,
  daftarKaryawan,
  rekapHariIni,
  rekapTanggal,
};
