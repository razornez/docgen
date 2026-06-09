-- Migration 0009: Push semua default_templates yang belum ada ke setiap tenant.
-- Idempoten: cek EXISTS sebelum INSERT, aman untuk re-run.

DO $$
DECLARE
  v_tenant  RECORD;
  v_default RECORD;
  v_tpl_id  TEXT;
  v_ver_id  TEXT;
BEGIN
  FOR v_tenant IN SELECT id FROM tenants LOOP
    FOR v_default IN
      SELECT name, category, body FROM default_templates ORDER BY sort_order
    LOOP
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM templates
        WHERE tenant_id = v_tenant.id AND name = v_default.name
      );

      v_tpl_id := concat('tpl_', replace(gen_random_uuid()::text, '-', ''));
      v_ver_id := concat('tver_', replace(gen_random_uuid()::text, '-', ''));

      INSERT INTO templates (id, tenant_id, name, category)
      VALUES (v_tpl_id, v_tenant.id, v_default.name, v_default.category);

      INSERT INTO template_versions (id, template_id, version, body, variable_schema)
      VALUES (v_ver_id, v_tpl_id, 1, v_default.body, '{}');

      UPDATE templates SET current_version = 1 WHERE id = v_tpl_id;
    END LOOP;
  END LOOP;
END $$;
