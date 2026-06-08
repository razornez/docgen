-- Migration 0005: Tabel default_templates (library template bawaan)
-- Template ini di-copy ke tenant baru saat registrasi.

CREATE TABLE IF NOT EXISTS default_templates (
  id          TEXT        NOT NULL PRIMARY KEY,
  name        TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'Umum',
  body        TEXT        NOT NULL,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed dari tenant "QA Tester" (template yang sudah dibuat via script sebelumnya).
-- Idempoten: ON CONFLICT DO NOTHING aman untuk re-run.
INSERT INTO default_templates (id, name, category, body, sort_order)
SELECT
  CONCAT('dft_', SUBSTRING(t.id FROM 5)),
  t.name,
  t.category,
  tv.body,
  ROW_NUMBER() OVER (ORDER BY t.category, t.name)::int
FROM templates t
JOIN template_versions tv
  ON tv.template_id = t.id
  AND tv.version = t.current_version
WHERE LEFT(t.name, 2) != '__'
  AND t.current_version IS NOT NULL
  AND t.tenant_id = (
    SELECT id FROM tenants WHERE name = 'QA Tester' LIMIT 1
  )
ON CONFLICT (id) DO NOTHING;
