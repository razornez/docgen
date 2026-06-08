import type { Locale } from '../locale.js';
import type { TenantId, UserId } from '../ids.js';

/**
 * Anggota tenant (tabel `users`). Tahap 2 minimal: belum ada kata sandi /
 * provider login (itu ditambah lewat migrasi baru di tahap auth/frontend).
 */
export interface User {
  id: UserId;
  tenantId: TenantId;
  email: string;
  emailVerifiedAt: Date | null;
  /** Override locale per pengguna; null = ikut default tenant (docs/22). */
  locale: Locale | null;
  createdAt: Date;
  updatedAt: Date;
}
