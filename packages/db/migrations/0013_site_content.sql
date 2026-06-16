-- Konten publik yang dikelola owner (footer landing).

INSERT INTO app_settings (key, value) VALUES
  ('footer_tagline', '"Mesin generate dokumen via API."'::jsonb),
  ('footer_columns', '[
    {"head":"Produk","items":[
      {"label":"Fitur","href":"#fitur"},
      {"label":"Harga","href":"#harga"},
      {"label":"Templates","href":"#"},
      {"label":"Status","href":"#"}]},
    {"head":"Developer","items":[
      {"label":"Dokumentasi","href":"#"},
      {"label":"API","href":"#"},
      {"label":"Webhooks","href":"#"},
      {"label":"SDK","href":"#"}]},
    {"head":"Perusahaan","items":[
      {"label":"Tentang","href":"#"},
      {"label":"Blog","href":"#"},
      {"label":"Kontak","href":"#"},
      {"label":"Privasi","href":"#"}]}
  ]'::jsonb)
ON CONFLICT (key) DO NOTHING;
