/**
 * Pondasi i18n (docs/22) — infrastruktur sisi-server saja.
 * Switcher UI di halaman login dibangun saat tahap auth (lihat catatan di bawah).
 *
 * REQUIREMENT TAHAP BERIKUTNYA (auth/login):
 *   Pemilih bahasa (ID/EN) WAJIB muncul mulai di halaman login & daftar,
 *   menyimpan pilihan ke cookie `locale` pra-login dan ke `users.locale`
 *   pasca-login, serta menyetel atribut `<html lang>` (docs/22).
 */
export { catalogs } from './catalog.js';
export type { Catalog, TranslationKey } from './catalog.js';

export { translate, createTranslator } from './translate.js';
export type { TranslateParams } from './translate.js';

export {
  parseAcceptLanguage,
  resolveLocale,
  defaultLocaleForCountry,
} from './select-locale.js';
export type { LocalePreferenceInput } from './select-locale.js';
