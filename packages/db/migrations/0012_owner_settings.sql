-- Owner settings: signup bonus + paket harga (bonus & sorot).

CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings (key, value)
VALUES ('signup_bonus_credits', '100'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE credit_packages
  ADD COLUMN IF NOT EXISTS bonus bigint NOT NULL DEFAULT 0;
ALTER TABLE credit_packages
  ADD COLUMN IF NOT EXISTS highlight text NOT NULL DEFAULT 'none';

ALTER TABLE credit_packages
  DROP CONSTRAINT IF EXISTS credit_packages_highlight_check;
ALTER TABLE credit_packages
  ADD CONSTRAINT credit_packages_highlight_check
  CHECK (highlight IN ('none', 'popular', 'hemat'));

-- Seed bonus & sorot mengikuti paket bawaan.
UPDATE credit_packages SET bonus = 0,    highlight = 'none'    WHERE id = 'pack_1k';
UPDATE credit_packages SET bonus = 250,  highlight = 'popular' WHERE id = 'pack_5k';
UPDATE credit_packages SET bonus = 1500, highlight = 'none'    WHERE id = 'pack_20k';
UPDATE credit_packages SET bonus = 5000, highlight = 'hemat'   WHERE id = 'pack_50k';
