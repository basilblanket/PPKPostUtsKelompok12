# Ruang Praktikum · Sprint 2

Aplikasi React Native (Expo SDK 54) untuk jadwal, presensi dan pemeriksaan izin. Identitas berasal dari Firebase Authentication. Firestore menjadi sumber data bersama. Tidak ada akun dummy atau pemilih peran di aplikasi.

## Menjalankan aplikasi

1. Gunakan Node.js 22. Buat proyek Firebase, daftarkan aplikasi **Web** untuk memperoleh konfigurasi SDK, aktifkan Authentication → Email/Password, dan buat database Cloud Firestore (default).
2. Di direktori proyek jalankan `npm ci`, lalu `cp .env.example .env`. Isi ketiga variabel dari konfigurasi Firebase Web. Jangan masukkan token AI di sini.
3. Jalankan `npx firebase login` dan `npx firebase use --add` untuk memilih proyek. Jalankan `npx firebase deploy --only firestore:rules`.
4. Dari direktori functions jalankan `npm ci`. Untuk API pengajar, buat file `functions/.env` berisi `AI_URL=https://alamat-api-pengajar/endpoint`. Dari akar proyek jalankan `npx firebase functions:secrets:set AI_TOKEN` dan isi token, atau NONE untuk API tanpa token. Deploy dengan `npx firebase deploy --only functions:classifyLeave`. Deploy Functions generasi kedua memerlukan proyek dengan penagihan diaktifkan.
5. Jalankan `npm start` dan buka dengan runtime Expo Go yang mendukung SDK 54 atau development build Android/iOS. Gunakan dua emulator/perangkat untuk demonstrasi.
6. Daftarkan kedua akun dan simpan nama. Semua akun baru adalah praktikan. Untuk asisten, administrator menjalankan `node functions/grant.cjs PROJECT_ID UID` memakai Application Default Credentials dengan hak Firebase Auth Admin di proyek tersebut. UID terlihat di halaman Kelas saya. Keluar dan login kembali untuk memuat klaim asisten. Simpan kredensial admin di luar repositori.

## Kontrak AI yang perlu dicocokkan

Kontrak asli pengajar belum disertakan. Adaptor di functions/index.js mengirim POST HTTPS dengan JSON `{"reason":"alasan pengguna"}` dan opsional Authorization: Bearer. Respons yang diharapkan: `{"category":"Kesehatan"}`. Jika kontraknya berbeda, sesuaikan pembentukan body/header dan pembacaan category sebelum deploy. Hanya alasan yang dikirim. Saat API gagal, respons tidak valid, atau batas waktu 10 detik terlampaui, izin tetap tersimpan dengan klasifikasi “tidak tersedia”. Jika fungsi belum dipasang, indikator tetap “diproses”. Fungsi tidak menulis keputusan asisten.

## Demonstrasi dua perangkat

- Asisten membuat kelas, menambahkan UID praktikan, lalu membuat dua sesi dengan tanggal dan waktu lokal. Praktikan melihat kelas dan jadwal yang sama.
- Pada sesi pertama, asisten memilih **Buka sesi** dan mengonfirmasi. Praktikan membuka detail sesi dan memilih **Catat kehadiran saya**. Cocokkan nama dan waktu pada rekap asisten, lalu tutup sesi. Buka kembali aplikasi untuk melihat catatan tersimpan.
- Pada sesi kedua, praktikan menulis alasan dan memilih **Ajukan izin**. Kedua akun dapat melihat alasan, progres klasifikasi, dan status menunggu. Asisten membaca kategori jika tersedia, kemudian menerima atau menolak melalui dialog konfirmasi. Praktikan melihat keputusan di detail sesi tanpa memuat ulang.
- Uji batas akses dengan akun ketiga tanpa keanggotaan. Mengeluarkan peserta mencabut akses kelas. Menghapus kelas atau sesi dari jadwal dilakukan melalui arsip agar riwayat tidak terhapus secara fisik.

## Struktur dan konsistensi

| Lokasi Firestore | Isi dan akses |
| --- | --- |
| profiles/{uid} | Nama identitas yang ditetapkan oleh pemilik akun saat pertama masuk. |
| classes/{kelas} | Nama, UID pemilik, daftar UID peserta (maks. 200), status arsip. Asisten hanya mengelola kelas miliknya. |
| classes/{kelas}/sessions/{sesi} | Nama praktikum, waktu Firestore Timestamp, status sesi. Satu sesi mewakili satu entri jadwal. |
| …/sessions/{sesi}/records/{uid} | Satu catatan per peserta: presensi atau izin. Waktu dari server. Praktikan hanya membaca catatannya; asisten pemilik membaca rekap. |

Klien memakai onSnapshot pada kelas, sesi, dan catatan. Permintaan menulis presensi diperiksa terhadap status sesi di server. UID tetap sebagai ID dokumen mencegah presensi ganda termasuk dari perangkat berbeda. Setelah izin diajukan, peserta tidak dapat menggantinya dengan presensi; keputusan asisten bersifat final. Penyimpanan permanen ada di server; status “Mengirim perubahan” atau “Menunggu koneksi” belum merupakan konfirmasi penyimpanan server. Koneksi diperlukan untuk memuat kembali data setelah aplikasi ditutup.

## Verifikasi

Jalankan `npm test` (Java 21 untuk emulator). Uji ini memakai proyek lokal demo-praktikum, menyimulasikan identitas dua peran, memeriksa akses lintas pengguna, menolak presensi di luar sesi atau ganda, mengamati listener rekap dan keputusan, serta memastikan klasifikasi tidak mengubah status izin. Penulisan klasifikasi pada uji ini disimulasikan; verifikasi endpoint pengajar sungguhan dilakukan setelah konfigurasi tersedia. Untuk memeriksa bundling, jalankan `npx expo export --platform android --platform ios`.
