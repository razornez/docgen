-- Pastikan halaman publik (CMS) memakai konten default terbaru di kode.
-- Menghapus override 'site' lama (bila ada) yang menimpa DEFAULT_CONTENT,
-- sehingga konten baru yang profesional & lengkap langsung tampil di produksi.
-- Owner tetap bisa menyunting ulang lewat menu Konten setelahnya.
DELETE FROM app_settings WHERE key = 'site';
