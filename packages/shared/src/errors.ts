/**
 * Hierarki error aplikasi (docs/21 — Penanganan Error). `type` & `param`
 * stabil dalam Inggris/machine-readable (docs/22); hanya `message` yang boleh
 * dilokalkan untuk ditampilkan. Mapping ke kode HTTP mengikuti docs/02.
 */
export interface AppErrorOptions {
  readonly httpStatus: number;
  readonly param?: string;
  readonly cause?: unknown;
}

export class AppError extends Error {
  /** Kode machine-readable yang stabil (mis. 'insufficient_credit'). */
  readonly type: string;
  readonly httpStatus: number;
  readonly param: string | undefined;

  constructor(type: string, message: string, options: AppErrorOptions) {
    super(message, options.cause === undefined ? {} : { cause: options.cause });
    this.name = 'AppError';
    this.type = type;
    this.httpStatus = options.httpStatus;
    this.param = options.param;
  }
}

/** Dilempar oleh adapter stub yang belum diimplementasikan (tahap berikutnya). */
export class NotImplementedError extends AppError {
  constructor(what: string) {
    super('not_implemented', `Belum diimplementasikan: ${what}`, {
      httpStatus: 501,
    });
    this.name = 'NotImplementedError';
  }
}

// Helper internal: rakit opsi tanpa menaruh `param: undefined`
// (patuh exactOptionalPropertyTypes).
function opts(httpStatus: number, param?: string): AppErrorOptions {
  return param === undefined ? { httpStatus } : { httpStatus, param };
}

/**
 * Pabrik error standar dengan `type` machine-readable yang STABIL (docs/02, 22).
 * Pemetaan kode HTTP: 400/401/402/404/409/422/429/5xx. `message` boleh
 * dilokalkan menyusul; `type` & `param` tidak boleh diterjemahkan.
 */
export const Errors = {
  /** 400 — request malformed / field wajib hilang. */
  invalidRequest: (message: string, param?: string): AppError =>
    new AppError('invalid_request', message, opts(400, param)),

  /** 401 — API key tidak valid, dicabut, atau hilang. */
  unauthorized: (message = 'Authentication required'): AppError =>
    new AppError('unauthorized', message, opts(401)),

  /** 402 — saldo kredit tidak cukup (perlu top-up). */
  insufficientCredit: (message = 'Insufficient credit balance'): AppError =>
    new AppError('insufficient_credit', message, opts(402)),

  /** 404 — resource tidak ditemukan (termasuk milik tenant lain). */
  notFound: (message = 'Resource not found', param?: string): AppError =>
    new AppError('not_found', message, opts(404, param)),

  /** 409 — konflik (mis. email sudah dipakai, idempotency key beda body). */
  conflict: (message: string, param?: string): AppError =>
    new AppError('conflict', message, opts(409, param)),

  /** 422 — payload `data` tidak sesuai schema template (Tahap 3+). */
  schemaValidation: (message: string, param?: string): AppError =>
    new AppError('schema_validation_error', message, opts(422, param)),

  /** 429 — rate limit (dipetakan; limiter sungguhan ditunda ke pengerasan). */
  rateLimited: (message = 'Too many requests'): AppError =>
    new AppError('rate_limited', message, opts(429)),

  /** 5xx — kesalahan server tak terduga. */
  internal: (message = 'Internal server error'): AppError =>
    new AppError('internal_error', message, opts(500)),
} as const;
