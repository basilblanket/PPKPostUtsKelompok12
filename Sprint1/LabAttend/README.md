# LabAttend — Sprint 1

Aplikasi Expo React Native dan TypeScript dengan Expo Router. Tidak memakai backend atau penyimpanan permanen.

## Menjalankan

```sh
npm install
npm start
# atau
npm run web
```

Gunakan emulator Android/iOS atau Expo Go yang mendukung SDK proyek. Untuk web, buka alamat yang diberikan Expo.

## Verifikasi

```sh
npm run typecheck
npm test
npm run export:web
```

## Demo alur utama

1. Pilih Asisten dan identitas, masuk, lalu buka Jadwal → detail → Buka Sesi. Konfirmasikan modal.
2. Kembali → Profil → Ganti peran atau identitas. Pilih Praktikan dan Andi.
3. Buka sesi tadi → Lakukan Presensi → konfirmasi. Waktu lokal muncul dan tombol menjadi nonaktif.
4. Lihat Riwayat. Ganti menjadi Budi untuk mencoba presensi independen.
5. Ganti menjadi Asisten. Lihat Rekap atau daftar hadir pada detail, lalu Tutup Sesi dan konfirmasi.
6. Ganti ke praktikan lain. Tombol presensi sesi yang ditutup tidak aktif.
7. Coba Batal di setiap modal; data tidak berubah. Refresh menghapus seluruh perubahan demo.

Semua sesi awalnya Belum Dibuka dan daftar presensi kosong agar alur dapat diuji dari awal. Jadwal menggunakan tanggal dummy 11–12 November 2026; tanggal tidak membatasi sesi demo. Seluruh asisten dapat mengelola jadwal demo.

## Struktur

- `app/`: route utama dan detail sesi.
- `src/screens/`: pemilihan peran, halaman utama bertab, detail.
- `src/components/`: tombol, badge, modal, empty state, card jadwal.
- `src/data/`: identitas, jadwal, sesi dan presensi awal.
- `src/state/`: Context bersama, validasi transisi sesi dan presensi unik per identitas/sesi.
- `src/types/`: tipe data domain.


Tes menggunakan Node.js 22.18+ (dukungan TypeScript bawaan). Tes memeriksa transisi sesi, larangan presensi sebelum sesi dibuka, waktu presensi, presensi ganda, pemisahan identitas/sesi, serta larangan presensi dan pembukaan ulang setelah penutupan.

Catatan lingkungan implementasi: akses npm registry gagal karena DNS (`EAI_AGAIN`), sehingga dependensi untuk pemeriksaan lokal disalin dari `../my-app/node_modules` yang sudah tersedia, tanpa mengubah proyek sumber. Pada mesin dengan jaringan normal, `npm install` akan memasang dependensi sesuai `package.json`. Uji interaktif browser/perangkat tetap perlu dilakukan; lingkungan implementasi membatasi socket lokal dan eksekusi browser.

## Hasil pemeriksaan implementasi

- `npm run typecheck`: lulus.
- `npm test`: lulus (skenario domain dengan beberapa pemeriksaan transisi dan presensi).
- `npm run export:web`: lulus.
- `EXPO_OFFLINE=1 npx expo export --platform all --no-bytecode --max-workers 2`: lulus untuk bundle JavaScript Android, iOS, dan web. Opsi tanpa bytecode digunakan hanya untuk verifikasi bundling.
- Belum diuji secara interaktif di browser, emulator, atau perangkat. Ekspor bundle bukan pengujian runtime perangkat atau pembuatan APK/IPA.
