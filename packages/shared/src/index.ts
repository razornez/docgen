// Tipe & kontrak bersama (docs/21). packages/* lain dan apps/* mengimpor dari sini.

// Locale (docs/22)
export { DEFAULT_LOCALE, SUPPORTED_LOCALES, isLocale } from './locale.js';
export type { Locale } from './locale.js';

// ID & branded types
export { ID_PREFIXES } from './ids.js';
export type {
  IdPrefix,
  Id,
  TenantId,
  UserId,
  ApiKeyId,
  TemplateId,
  TemplateVersionId,
  DocumentId,
  BatchId,
  PaymentId,
  TransactionId,
} from './ids.js';

// Error
export { AppError, NotImplementedError, Errors } from './errors.js';
export type { AppErrorOptions } from './errors.js';

// Util acak (token & bagian acak ID)
export { randomBase62 } from './random.js';

// Render (job & opsi PDF — dipakai bersama api/worker/renderer)
export { RENDER_QUEUE, buildStorageKey } from './render.js';
export type {
  RenderOptions,
  RenderJobData,
  RenderJobResult,
} from './render.js';

// Model domain
export type {
  Tenant,
  TenantStatus,
  KycStatus,
  User,
  ApiKey,
  ApiKeyMode,
  ApiKeyStatus,
  Wallet,
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionRefType,
  Template,
  TemplateVersion,
  TemplateEngine,
  Document,
  DocumentStatus,
  Batch,
  BatchStatus,
} from './models/index.js';
export { API_KEY_PREFIX } from './models/index.js';

// Ports (interface infra yang bisa ditukar)
export type {
  Clock,
  IdGenerator,
  StoragePort,
  PaymentGatewayPort,
  CreateTxInput,
  PaymentMethod,
  WebhookVerification,
  QueuePort,
  EnqueueOptions,
  MailerPort,
  EmailMessage,
} from './ports/index.js';

// Adapter nyata (Clock & IdGenerator) — aman dipakai sejak tahap 1
export { SystemClock } from './adapters/system-clock.js';
export { PrefixedIdGenerator } from './adapters/prefixed-id-generator.js';

// Adapter stub (diganti implementasi nyata per tahap)
export {
  StubStorage,
  StubPaymentGateway,
  StubQueue,
  StubMailer,
} from './adapters/stubs.js';
