/**
 * Prefix ID berbasis tipe (docs/02, docs/05, docs/21). ID di-generate aplikasi,
 * bukan database. Branded types mencegah `tenant_id` tertukar dengan `document_id`.
 */
export const ID_PREFIXES = {
  tenant: 'ten',
  user: 'usr',
  apiKey: 'key',
  template: 'tpl',
  templateVersion: 'tver',
  document: 'doc',
  batch: 'batch',
  payment: 'pay',
  transaction: 'txn',
  usageEvent: 'use',
  webhookEndpoint: 'whe',
  webhookDelivery: 'whd',
  creditPackage: 'pack',
  adminUser: 'adm',
  adminAction: 'aac',
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

/** Branded string ID agar tidak tertukar antar entitas (docs/21 — Type Safety). */
export type Id<Brand extends string> = string & { readonly __brand: Brand };

export type TenantId = Id<'tenant'>;
export type UserId = Id<'user'>;
export type ApiKeyId = Id<'apiKey'>;
export type TemplateId = Id<'template'>;
export type TemplateVersionId = Id<'templateVersion'>;
export type DocumentId = Id<'document'>;
export type BatchId = Id<'batch'>;
export type PaymentId = Id<'payment'>;
export type TransactionId = Id<'transaction'>;
