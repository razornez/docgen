-- Migration 0011: seed paket kredit default.
-- Tabel credit_packages dibuat di 0001 tapi tak pernah diisi → dashboard
-- menampilkan "Paket belum tersedia". Seed idempoten (ON CONFLICT DO NOTHING)
-- agar aman dijalankan ulang dan tak menimpa paket yang sudah ada.

INSERT INTO credit_packages (id, name, credits, price_idr, active) VALUES
  ('pack_starter', 'Starter',  100,   25000, TRUE),
  ('pack_basic',   'Basic',    500,  100000, TRUE),
  ('pack_pro',     'Pro',     1000,  180000, TRUE),
  ('pack_business','Business',5000,  750000, TRUE)
ON CONFLICT (id) DO NOTHING;
