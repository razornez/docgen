import type {
  ApiKey,
  Document,
  Template,
  TemplateVersion,
  Tenant,
  Wallet,
} from '@docgen/shared';

/**
 * Pemetaan model domain → DTO response API (docs/02): snake_case, timestamp
 * ISO 8601 UTC. SENGAJA tidak pernah memuat `key_hash` atau plaintext kecuali
 * di `presentNewApiKey` (sekali saat pembuatan).
 */

const iso = (d: Date): string => d.toISOString();
const isoOrNull = (d: Date | null): string | null =>
  d ? d.toISOString() : null;

export function presentTenant(t: Tenant) {
  return {
    id: t.id,
    name: t.name,
    status: t.status,
    country: t.country,
    default_locale: t.defaultLocale,
    created_at: iso(t.createdAt),
  };
}

export function presentWallet(w: Wallet) {
  return { balance: w.balance, currency: w.currency };
}

/** Tampilan API key tersamar (tanpa rahasia) untuk listing & setelah revoke. */
export function presentApiKey(k: ApiKey) {
  return {
    id: k.id,
    mode: k.mode,
    prefix: k.prefix,
    last4: k.last4,
    status: k.status,
    last_used_at: isoOrNull(k.lastUsedAt),
    created_at: iso(k.createdAt),
    revoked_at: isoOrNull(k.revokedAt),
  };
}

/** Tampilan API key SAAT DIBUAT — memuat plaintext `key` yang hanya tampil sekali. */
export function presentNewApiKey(k: ApiKey, plaintext: string) {
  return { ...presentApiKey(k), key: plaintext };
}

/**
 * Dokumen hasil render (docs/02). `output_url` adalah signed URL berumur pendek
 * yang diterbitkan saat dibaca; `credits_charged` selalu 0 di Tahap 4 (billing
 * = Tahap 5).
 */
export function presentDocument(
  doc: Document,
  outputUrl: string | null,
  expiresAt: Date | null,
) {
  return {
    id: doc.id,
    ref: doc.itemRef ?? null,
    status: doc.status,
    template: doc.templateId,
    version: doc.templateVersion,
    output_url: outputUrl,
    expires_at: expiresAt ? iso(expiresAt) : null,
    page_count: doc.pageCount,
    credits_charged: doc.charged ? 1 : 0,
    error: doc.error,
    created_at: iso(doc.createdAt),
  };
}

/** Ringkasan template (untuk listing & header GET). */
export function presentTemplate(t: Template) {
  return {
    id: t.id,
    name: t.name,
    category: t.category,
    current_version: t.currentVersion,
    created_at: iso(t.createdAt),
    updated_at: iso(t.updatedAt),
  };
}

/** Satu versi template (immutable): HTML `body` + `schema` (dokumentasi bentuk data). */
export function presentTemplateVersion(v: TemplateVersion) {
  return {
    id: v.id,
    version: v.version,
    engine: v.engine,
    body: v.body,
    schema: v.variableSchema,
    created_at: iso(v.createdAt),
  };
}
