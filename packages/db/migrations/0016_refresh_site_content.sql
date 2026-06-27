-- Refresh konten publik (CMS) ke DEFAULT_CONTENT terbaru di kode, yang kini
-- memuat halaman legal baru (Syarat & Ketentuan, dst) + kolom footer "Legal".
-- Sama seperti 0014: hapus override 'site' agar default terbaru tampil. Owner
-- tetap bisa menyunting ulang lewat menu Konten (perubahan tersimpan kembali).
DELETE FROM app_settings WHERE key = 'site';
