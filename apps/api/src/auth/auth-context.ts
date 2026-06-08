import { Errors } from '@docgen/shared';
import type { ApiKeyId, ApiKeyMode, TenantId } from '@docgen/shared';
import type { FastifyRequest } from 'fastify';

/**
 * Identitas terautentikasi yang dilampirkan ke request oleh auth hook.
 * Semua akses data wajib disaring memakai `tenantId` ini (isolasi tenant, docs/13).
 */
export interface AuthContext {
  readonly tenantId: TenantId;
  readonly apiKeyId: ApiKeyId;
  readonly mode: ApiKeyMode;
}

// Augmentasi: setiap FastifyRequest bisa membawa authContext (diisi auth hook).
declare module 'fastify' {
  interface FastifyRequest {
    authContext?: AuthContext;
  }
}

/**
 * Mengambil AuthContext dari request pada rute terproteksi. Melempar 401 bila
 * tidak ada (mis. hook auth tidak terpasang) — gagal aman, tidak diam-diam lolos.
 */
export function requireAuth(request: FastifyRequest): AuthContext {
  if (!request.authContext) {
    throw Errors.unauthorized();
  }
  return request.authContext;
}
