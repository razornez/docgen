import { DEFAULT_LOCALE, type Locale } from '@docgen/shared';
import { catalogs, type TranslationKey } from './catalog.js';

export type TranslateParams = Record<string, string | number>;

/**
 * Menerjemahkan `key` ke `locale`. Fallback berjenjang (docs/22):
 * locale yang diminta → basis `en` → key itu sendiri (agar tidak pernah crash).
 * Placeholder `{name}` digantikan dari `params`.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: TranslateParams,
): string {
  const template =
    catalogs[locale]?.[key] ?? catalogs[DEFAULT_LOCALE][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Membuat fungsi `t` yang sudah terikat ke satu locale (mempermudah pemakaian). */
export function createTranslator(
  locale: Locale,
): (key: TranslationKey, params?: TranslateParams) => string {
  return (key, params) => translate(locale, key, params);
}
