import type { Locale } from '../locale.js';
import type { TenantId } from '../ids.js';

export type TenantStatus = 'active' | 'suspended' | 'closed';
export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';

/**
 * Organisasi klien (tabel `tenants`, migrasi 0001 + kolom locale 0002).
 * Kolom nullable dimodelkan sebagai `| null` (selaras NULL di SQL).
 */
export interface Tenant {
  id: TenantId;
  name: string;
  status: TenantStatus;
  kycStatus: KycStatus;
  country: string | null;
  defaultLocale: Locale;
  createdAt: Date;
  updatedAt: Date;
}
