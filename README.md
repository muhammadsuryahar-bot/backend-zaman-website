# Backend - Sistem Absensi & Penggajian Karyawan

Ini backend (server) untuk sistem absensi. Dibuat pakai Node.js + Express + Prisma + MySQL.

## Yang Sudah Ada di Tahap MVP Ini

- Daftar akun karyawan (validasi harus pakai email kantor)
- Login (admin & karyawan)
- Admin: lihat & aktifkan akun karyawan yang baru daftar
- Admin: kelola daftar karyawan (nonaktifkan/aktifkan)
- Karyawan: absen masuk & absen pulang (foto + GPS + jam server otomatis)
- Karyawan: lihat riwayat absensi sendiri
- Admin: lihat rekap absensi hari ini
- Admin: ubah/koreksi status kehadiran karyawan secara manual

## Langkah Menjalankan di Laptop Kamu

### 1. Pastikan sudah terinstall
- Node.js (cek dengan `node -v` di terminal)
- XAMPP, dan **MySQL sudah di-Start** dari XAMPP Control Panel

### 2. Buat database kosong
- Buka `http://localhost/phpmyadmin` di browser
- Klik "New", buat database dengan nama: `absensi_db`

### 3. Install semua library yang dibutuhkan
Buka terminal, masuk ke folder `backend`, lalu jalankan:
```
npm install
```

### 4. Siapkan file environment (.env)
- Copy file `.env.example` menjadi `.env`
- Buka `.env`, sesuaikan `DATABASE_URL` kalau perlu (default sudah cocok untuk XAMPP standar)
- Ganti `ALLOWED_EMAIL_DOMAIN` dengan domain email kantor kamu yang sebenarnya

### 5. Buat tabel-tabel di database (otomatis dari Prisma)
```
npx prisma migrate dev --name init
```
Perintah ini akan otomatis membuatkan semua tabel (`kantor`, `pengguna`, `absensi`) sesuai skema yang sudah dirancang.

### 6. Jalankan server
```
npm run dev
```
Kalau berhasil, akan muncul tulisan: `Server berjalan di http://localhost:5000`

### 7. Coba buka di browser
Buka `http://localhost:5000` — kalau muncul pesan "Server Sistem Absensi berjalan dengan baik", berarti berhasil.

## Cara Melihat Data Database Secara Visual (opsional)
Selain lewat phpMyAdmin, kamu juga bisa pakai Prisma Studio (tampilan lebih modern):
```
npx prisma studio
```
Nanti otomatis terbuka tab browser baru buat lihat/edit data.

## Membuat Akun Admin Pertama Kali

Karena Admin **tidak mendaftar lewat form** (beda dengan karyawan), akun admin pertama perlu dibuat manual lewat Prisma Studio:
1. Jalankan `npx prisma studio`
2. Buka tabel `Pengguna`, klik "Add record"
3. Isi: nama, email, `peran` = `admin`, `statusAkun` = `aktif`
4. Untuk `kataSandi`, isi dulu dengan sembarang teks, nanti kita buatkan halaman khusus generate password hash-nya (untuk sementara, bisa minta bantuan saya generate hash-nya)

## Daftar Endpoint API (untuk dites lewat Postman/Thunder Client, atau nanti dipakai frontend React)

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | /api/auth/daftar | Daftar akun karyawan baru |
| POST | /api/auth/login | Login (admin & karyawan) |
| POST | /api/absensi/masuk | Absen masuk (perlu login + upload foto) |
| POST | /api/absensi/pulang | Absen pulang (perlu login + upload foto) |
| GET | /api/absensi/riwayat-saya | Riwayat absensi pribadi |
| GET | /api/absensi/status-hari-ini | Cek status absen hari ini |
| GET | /api/admin/akun-menunggu | Daftar akun menunggu konfirmasi (admin) |
| PUT | /api/admin/akun/:id/aktifkan | Aktifkan akun karyawan (admin) |
| GET | /api/admin/karyawan | Daftar semua karyawan (admin) |
| PUT | /api/admin/karyawan/:id/status | Nonaktifkan/aktifkan karyawan (admin) |
| GET | /api/admin/rekap-hari-ini | Rekap absensi hari ini (admin) |
| PUT | /api/admin/absensi/:id/edit-status | Koreksi status kehadiran (admin) |

---

Kalau ada error saat menjalankan langkah-langkah di atas, screenshot error-nya dan kirim ke saya, nanti saya bantu perbaiki.
