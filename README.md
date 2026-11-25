# Ruang Praktikum — PPKPostUtsKelompok12

Aplikasi React Native / Expo SDK 54 untuk Sprint 1–3. Firebase Authentication menjadi sumber identitas dan Cloud Firestore menjadi penyimpanan bersama. UI web, Android, dan iOS berasal dari proyek yang sama.

## Jalankan Firebase online tanpa Blaze

Node.js 22 diperlukan. Proyek dapat tetap di paket Spark: backend Node.js di laptop menjalankan validasi presensi, AI, dan pengiriman push. Akun dan data tetap tersimpan di **Firebase online**, bukan emulator. Biarkan backend tetap menyala selama demo.

```sh
npm ci
npm ci --prefix functions
# Isi konfigurasi Web Firebase pada .env dari .env.example jika belum ada.
npx firebase login
node scripts/setup-server.cjs
npm run backend
```

Terminal kedua:

```sh
npx expo start --web --localhost --port 8082
```

Buka http://localhost:8082. `EXPO_PUBLIC_BACKEND_URL` mengarah ke http://localhost:8787. Backend hanya mendengarkan loopback secara default. `GET /health` memperlihatkan proyek dan mode koneksinya. Kredensial Firebase CLI yang sudah diizinkan digunakan hanya oleh backend; salinan ADC di `.firebase/local-adc.json` memiliki izin file 0600 dan diabaikan Git. Alternatif: set `GOOGLE_APPLICATION_CREDENTIALS` ke kredensial server sendiri. Jangan membagikan `.firebase`, `.env`, `.env.server`, token, atau service-account JSON.

Pasang aturan Firestore dengan `npx firebase deploy --only firestore:rules`. Jangan memakai aturan lama: presensi harus melalui backend. Daftarkan akun praktikan melalui aplikasi. Akun asisten menggunakan custom claim `asisten: true`, ditetapkan administrator dengan `functions/grant.cjs`. Password akun Firebase online tidak sama dengan password emulator.

Lokasi awal yang diberikan pengguna: **Laboratorium Informatika**, latitude **-7.047849**, longitude **110.440836**, radius awal **100 m**. Radius/nama dapat diubah lewat Peta & Laboratorium oleh pemilik laboratorium. `node scripts/init-lab.cjs` membuat lokasi awal dan menghubungkan sesi tanpa lokasi milik akun asisten yang ditentukan `ASSISTANT_EMAIL` (default akun demo asisten). Script tidak mengubah password atau menghapus presensi.

## Demo lokal Sprint 1

Pilih **Demo lokal Sprint 1** di aplikasi. Pilih peran asisten/praktikan dan identitas dummy, buka sesi melalui Modal, lakukan presensi, lalu ganti ke asisten untuk melihat rekap dan menutup sesi. Data hanya di state dan direset saat keluar dari mode ini. Mode ini tidak memanggil Firebase untuk menyimpan data.

## Demo emulator Sprint 2–3

Untuk pengujian tanpa menyentuh data cloud, perlu Java 21:

```sh
npm run demo
```

Buka http://localhost:8083. Akun emulator `asisten@demo.test` dan `praktikan@demo.test`, password keduanya `Praktikum123`. Port: Auth 19099, Firestore 18180, Functions 15001. Data disimpan di `.demo-data` saat proses dihentikan secara normal dengan Ctrl+C. Konfigurasi AI emulator default sengaja tidak tersedia, sehingga izin tetap menunggu keputusan asisten. `functions/.env.local` dan `.secret.local` dibuat untuk emulator, tidak dikirim ke Git.

## Alur Sprint 2–3

1. Asisten membuat kelas, memasukkan UID praktikan yang telah menyimpan profil, membuat laboratorium atau memakai lokasi yang tersedia, dan membuat sesi dengan laboratorium serta jadwal.
2. Asisten membuka sesi. Praktikan membuka detail → **Buka halaman presensi** → periksa lokasi → catat presensi. Posisi diambil ulang ketika tombol simpan ditekan.
3. Backend memverifikasi ID token, keanggotaan, peran, status sesi, laboratorium aktif, usia lokasi ≤60 detik, akurasi ≤min(radius,100 m), dan jarak Haversine ≤radius. Lokasi simulasi yang ditandai perangkat ditolak. Transaksi membuat dokumen UID hanya sekali; perubahan sesi/lab bersamaan memicu pengulangan validasi transaksi.
4. Rekap asisten dan catatan praktikan diperbarui oleh listener Firestore. Asisten menutup sesi. Presensi tidak pernah dianggap berhasil hanya dari hasil pemeriksaan UI.
5. Untuk izin, praktikan mengisi alasan; backend mengklasifikasikan lewat API. Asisten membaca alasan/kategori dan memutuskan menerima/menolak. AI **tidak** mengubah keputusan. Setelah izin dibuat, peserta tidak dapat menggantinya dengan presensi.
6. Peta menampilkan laboratorium dan radius. **Tampilkan lokasi saya** meminta izin dan mengikuti posisi selama halaman digunakan. Klik marker/daftar lab untuk melihat sesi terbuka dan sesi terjadwal berikutnya dari kelas yang boleh diakses akun.
7. Buka **Notifikasi** dan aktifkan pada perangkat. Event pembukaan sesi, perubahan judul/waktu/laboratorium sesi, dan keputusan izin membuat pemberitahuan bagi peserta terkait. Status “dikirim ke layanan push” bukan bukti perangkat telah menampilkannya. Jika tidak ada perangkat/izin atau layanan gagal, inbox tetap tersedia dan menampilkan statusnya.

Backend lokal mengamati perubahan Firestore dan menyimpan checkpoint untuk melanjutkan pengamatan setelah restart. Ini untuk demo dengan backend tetap menyala; perubahan bolak-balik saat backend mati dapat tidak teramati. Untuk deployment yang harus menangkap setiap event, gunakan Cloud Functions atau backend hosted dengan antrean event. GPS berasal dari perangkat dan bukan jaminan anti-pemalsuan mutlak.

## AI pengajar

Isi **hanya** `.env.server` untuk backend laptop, lalu mulai ulang backend:

```dotenv
AI_PROTOCOL=category
AI_URL=https://alamat-endpoint-pengajar
AI_TOKEN=token_pengajar
AI_MODEL=
```

`category`: POST JSON `{"reason":"..."}`, respons `{"category":"Kesehatan"}`.

`openai`: base URL seperti `https://api.clevecode.com/v1`, ditambahkan `/chat/completions`; isi `AI_MODEL` dengan ID model yang benar dan `AI_TOKEN` dengan key. API harus kompatibel dengan Chat Completions. Model diminta mengembalikan JSON `{"category":"..."}`. Nama model dan key aktif belum dikonfigurasi pada pengerjaan ini; klasifikasi nyata masih perlu diverifikasi dengan layanan pengajar. Hanya alasan yang dikirim. Timeout 15 detik, HTTP error, konfigurasi kosong, atau format tidak valid menghasilkan “tidak tersedia”. Asisten dapat mencoba klasifikasi ulang. AI tidak menerima UID, password, atau koordinat.

## Push dan Maps perangkat

Web menggunakan Web Push/VAPID dan service worker, Maps menggunakan Leaflet/OpenStreetMap. `setup-server.cjs` menghasilkan kunci VAPID lokal; hanya public key yang masuk `.env` klien. Browser memerlukan HTTPS atau localhost, izin notifikasi, dan layanan push yang didukung. Satu profil browser menerima push untuk satu akun; gunakan profil/browser berbeda untuk dua akun. Logout melepaskan registrasi perangkat.

Native menggunakan `expo-location`, `react-native-maps`, dan Expo Push. Konfigurasikan `EAS_PROJECT_ID` serta kredensial FCM/APNs pada EAS dan `GOOGLE_MAPS_ANDROID_API_KEY` sebelum membuat development build. `app.config.js` membaca konfigurasi tersebut; `eas.json` tersedia. Push Android tidak tersedia di Expo Go SDK 54. Build export tidak sama dengan pengujian APK/iPhone fisik.

Untuk HP, `localhost` menunjuk HP itu sendiri. Backend harus tersedia melalui alamat HTTPS yang dapat dijangkau HP dan dimasukkan ke `EXPO_PUBLIC_BACKEND_URL`; jalankan Expo sesuai jaringan perangkat. Jangan mengekspos kredensial admin ke aplikasi.

## Alternatif Cloud Functions

Opsional jika memilih Blaze: isi parameter AI dan VAPID di `functions/.env.PROJECT_ID`; simpan `AI_TOKEN` dan `VAPID_PRIVATE_KEY` dengan Firebase Secret Manager. Deploy Functions dan rules, hapus `EXPO_PUBLIC_BACKEND_URL`, lalu restart Expo. Region callable: `asia-southeast2`. Paket Spark tidak mendukung deployment Cloud Functions; backend laptop disediakan agar tidak perlu upgrade untuk demo.

## Struktur Firestore

- `profiles/{uid}`: nama; peran berasal dari custom claims Auth.
- `labs/{labId}`: nama, koordinat, radius, pemilik, status arsip.
- `classes/{classId}`: judul, pemilik, anggota, arsip.
- `classes/{classId}/sessions/{sessionId}`: judul, Timestamp jadwal, status, `labId`.
- `…/records/{uid}`: presensi dengan lokasi/jarak atau izin dengan alasan/klasifikasi/keputusan.
- `profiles/{uid}/devices/{id}`: registrasi push perangkat, hanya pemilik yang mengakses.
- `profiles/{uid}/notifications/{id}`: inbox buatan backend, pemilik hanya boleh menandai dibaca.
- `_backendState/{id}`: checkpoint internal backend, tidak bisa diakses klien.

Rules menolak presensi langsung dari SDK, perubahan peran oleh pengguna, pembacaan catatan orang lain, dan keputusan izin oleh praktikan. Kelas/sesi dihapus dari daftar dengan arsip agar riwayat dipertahankan. Validasi tanggal server mengikuti hari Asia/Jakarta.

## Pengujian

```sh
npm test                 # Firestore Rules / isolasi pengguna / listener
npm run test:domain      # radius, akurasi, waktu, status, peran
npm run test:integration # Auth + Firestore + callable + event pada emulator
npm run test:backend     # jalur HTTP backend laptop dengan emulator
npx expo export --platform all --output-dir dist
```

Test tidak mengirim push ke perangkat sungguhan dan tidak memanggil model pengajar dengan key asli. Deployment rules, login Firebase online, pembacaan koordinat online, dan penolakan akses backend untuk nonanggota telah diverifikasi. Uji lokasi nyata dan push end-to-end perlu perangkat serta izin pengguna.

Pemeriksaan API Clevecode `GET /v1/models` pada pengerjaan ini mendapat HTTP 403 dengan key yang sebelumnya diberikan. Respons tersebut belum membuktikan model/kontrak yang tersedia; konfigurasi AI nyata tetap perlu akses API yang diterima penyedia.
