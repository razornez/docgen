-- =============================================================
-- 0002_i18n — Kolom locale (docs/22 — Tambahan Data Model)
-- Melengkapi DDL inti (0001) dengan negara asal & default bahasa tenant,
-- serta override locale per pengguna.
--
-- Aturan default saat pendaftaran (diterapkan di logika aplikasi, docs/22):
--   set default_locale = 'id' bila country = 'ID', selain itu 'en'.
-- =============================================================

-- negara asal + default bahasa tenant
ALTER TABLE tenants ADD COLUMN country TEXT;                          -- mis. 'ID', 'US'
ALTER TABLE tenants ADD COLUMN default_locale TEXT NOT NULL DEFAULT 'en'
  CHECK (default_locale IN ('id', 'en'));

-- override per pengguna; NULL = ikut default tenant
ALTER TABLE users ADD COLUMN locale TEXT
  CHECK (locale IN ('id', 'en'));
