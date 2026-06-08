-- =============================================================
-- 0003_auth — Kolom autentikasi pengguna
-- Menambah dukungan login email+password dan Google OAuth
-- di samping alur API-key yang sudah ada.
-- =============================================================

-- Hash bcrypt kata sandi (NULL untuk pengguna Google-only).
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ID pengguna Google (NULL untuk pengguna email+password).
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;

-- Nama tampilan pengguna (opsional; tenant.name tetap nama organisasi).
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- google_id unik per baris yang bukan NULL.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_google_id
  ON users (google_id)
  WHERE google_id IS NOT NULL;
