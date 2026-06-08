import type { Locale } from '@docgen/shared';
import en from './locales/en.json';
import id from './locales/id.json';

/** Katalog pesan: pemetaan datar key → teks. */
export type Catalog = Record<string, string>;

/** Key terjemahan yang valid (diturunkan dari katalog basis `en`). */
export type TranslationKey = keyof typeof en;

export const catalogs: Record<Locale, Catalog> = {
  en,
  id,
};
