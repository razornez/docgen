-- Tambah kolom role dan locale ke tabel users.
-- role: hak akses anggota tenant (owner/admin/member).
-- locale: preferensi bahasa per pengguna (override default tenant).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member'));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'id'
    CHECK (locale IN ('id', 'en'));

-- Jadikan pengguna tertua per tenant sebagai owner.
WITH first_per_tenant AS (
  SELECT DISTINCT ON (tenant_id) id
  FROM users
  ORDER BY tenant_id, created_at ASC
)
UPDATE users
SET role = 'owner'
WHERE id IN (SELECT id FROM first_per_tenant);
