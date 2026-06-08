import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Locale } from '@docgen/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Katalog pesan: pemetaan datar key → teks. */
export type Catalog = Record<string, string>;

// Load JSON locales using fs to avoid ESM import assertion issues
const en = JSON.parse(
  readFileSync(join(__dirname, 'locales', 'en.json'), 'utf-8')
) as Record<string, string>;

const id = JSON.parse(
  readFileSync(join(__dirname, 'locales', 'id.json'), 'utf-8')
) as Record<string, string>;

/** Key terjemahan yang valid (diturunkan dari katalog basis `en`). */
export type TranslationKey = keyof typeof en;

export const catalogs: Record<Locale, Catalog> = {
  en,
  id,
};
