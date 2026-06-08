-- Tambah kolom category ke templates (grouping di UI).
ALTER TABLE templates ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Umum';
