/**
 * Tipe locale bersama (docs/22). Basis/fallback selalu `en`.
 * Dipakai lintas paket (config, i18n, api, worker) sebagai satu sumber kebenaran.
 */
export type Locale = 'id' | 'en';

/** Locale basis/fallback. Bila teks belum diterjemahkan, pakai ini. */
export const DEFAULT_LOCALE: Locale = 'en';

/** Daftar locale yang didukung. */
export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'id'] as const;

/** Type guard: apakah sebuah string adalah Locale yang didukung. */
export function isLocale(value: unknown): value is Locale {
  return value === 'id' || value === 'en';
}
