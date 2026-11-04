# Bawaslu Awards 2026

Starter website voting internal Bawaslu Puslitbangdiklat. Frontend: React + Vite. Database/auth/realtime: Supabase. Hosting: Vercel.

## Fitur yang sudah disiapkan
- Halaman voting dengan 9 kategori dan 48 nama.
- Pemilih memilih namanya, lalu memilih satu kandidat per kategori.
- Semua 9 pilihan dikirim sekaligus melalui RPC database.
- Proteksi satu paket suara per nama (constraint + row lock di PostgreSQL).
- Dashboard admin: statistik pemilih, total suara, perolehan kandidat, pembaruan realtime.
- Admin dapat membuka/menutup voting dan mempublikasikan pemenang per kategori.
- Halaman pemenang untuk reveal manual satu kategori demi satu kategori.
- Tampilan responsif, warna merah Bawaslu, navy, putih, dan gold.

## 1. Siapkan Supabase
1. Buat project baru di https://supabase.com.
2. Buka **SQL Editor** lalu jalankan seluruh isi `supabase-schema.sql`.
3. Buka **Project Settings → API** dan salin Project URL serta anon/public key.
4. Buka **Authentication → Users → Add user** untuk membuat akun admin dengan email dan password.
5. Setelah akun admin dibuat, salin UUID user tersebut dari Authentication → Users.
6. Jalankan SQL berikut di SQL Editor, ganti UUID dengan UUID akun admin:

```sql
insert into public.admin_users(user_id)
values ('PASTE-UUID-AKUN-ADMIN-DI-SINI');
```

7. Aktifkan Realtime untuk tabel `votes` dan `people` melalui **Database → Publications** (publication `supabase_realtime`). Jika belum tercantum, tambahkan kedua tabel tersebut.

## 2. Jalankan lokal

```bash
npm install
```

Salin `.env.example` menjadi `.env` dan isi:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Lalu jalankan:

```bash
npm run dev
```

## 3. Deploy ke Vercel
1. Push folder project ini ke repository GitHub.
2. Import repository tersebut di https://vercel.com.
3. Framework preset: **Vite**; Build command `npm run build`; Output directory `dist`.
4. Di Vercel → Settings → Environment Variables, tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
5. Deploy / redeploy.

`vercel.json` sudah menyiapkan rewrite agar route aplikasi tetap berjalan.

## Catatan penting tentang verifikasi nama
Metode yang dipilih adalah memilih nama dari daftar tanpa PIN/OTP. Sistem dapat memastikan satu record nama hanya mengirim satu ballot, tetapi tidak dapat memastikan orang yang memilih nama tersebut adalah pemilik nama sebenarnya. Siapa pun yang mendapat akses website berpotensi memilih nama orang lain yang belum voting. Untuk acara internal yang membutuhkan validasi identitas lebih kuat, distribusikan kode akses unik atau gunakan login/OTP.

## Catatan operasional
- Tutup voting dengan menonaktifkan akses submit (langkah operasional/SQL tambahan) sebelum malam pengumuman. Jangan menghapus data suara.
- Jika hasil seri, dashboard menolak publikasi otomatis. Admin perlu menentukan mekanisme tie-break yang disepakati sebelum menetapkan pemenang.
- Logo Bawaslu saat ini berupa placeholder huruf “B”. Ganti komponen `Brand` di `src/App.jsx` dengan file logo resmi yang sudah dimiliki/diizinkan untuk digunakan.
- Jangan pernah menaruh Supabase `service_role` key di frontend atau Vercel `VITE_` environment variable. Frontend hanya memakai anon/public key.
