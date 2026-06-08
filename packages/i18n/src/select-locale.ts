import { DEFAULT_LOCALE, isLocale, type Locale } from '@docgen/shared';

/**
 * Membaca header `Accept-Language` dan mengembalikan locale yang didukung.
 * Aturan docs/22: diawali `id` → `id`, selain itu `en`. `undefined` bila header
 * kosong, sehingga pemanggil bisa lanjut ke sumber preferensi berikutnya.
 */
export function parseAcceptLanguage(
  header: string | undefined | null,
): Locale | undefined {
  if (!header) return undefined;
  // Ambil tag pertama dengan prioritas tertinggi (abaikan bobot q untuk kesederhanaan).
  const first = header.split(',')[0]?.trim().toLowerCase() ?? '';
  if (first.startsWith('id')) return 'id';
  if (first.startsWith('en')) return 'en';
  return undefined;
}

/**
 * Sumber preferensi locale, diurut dari prioritas TERTINGGI ke terendah.
 * Pemanggil mengisi yang relevan dengan konteksnya:
 *   - Pasca-login: `userLocale` (override pengguna) lalu `tenantDefaultLocale`.
 *   - Pra-login: `cookieLocale` lalu `acceptLanguage`.
 * Nilai yang tidak diketahui/`undefined` dilewati. Fallback akhir: `en` (docs/22).
 */
export interface LocalePreferenceInput {
  readonly userLocale?: string | null;
  readonly cookieLocale?: string | null;
  readonly tenantDefaultLocale?: string | null;
  readonly acceptLanguage?: string | null;
}

export function resolveLocale(input: LocalePreferenceInput): Locale {
  if (isLocale(input.userLocale)) return input.userLocale;
  if (isLocale(input.cookieLocale)) return input.cookieLocale;
  if (isLocale(input.tenantDefaultLocale)) return input.tenantDefaultLocale;

  const fromHeader = parseAcceptLanguage(input.acceptLanguage);
  if (fromHeader) return fromHeader;

  return DEFAULT_LOCALE;
}

/**
 * Menentukan `default_locale` tenant saat pendaftaran dari kode negara (docs/22):
 * `ID` → `id`, selain itu `en`.
 */
export function defaultLocaleForCountry(
  country: string | undefined | null,
): Locale {
  return country?.toUpperCase() === 'ID' ? 'id' : 'en';
}
