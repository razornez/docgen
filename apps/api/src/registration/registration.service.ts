import { defaultLocaleForCountry } from '@docgen/i18n';
import { Errors, ID_PREFIXES } from '@docgen/shared';
import type {
  ApiKey,
  ApiKeyMode,
  IdGenerator,
  Tenant,
  TenantId,
  User,
  UserId,
} from '@docgen/shared';
import { buildApiKeyMaterial } from '../api-keys/api-key.factory.js';
import type { ApiKeyHasher } from '../auth/api-key-hasher.js';
import { isUniqueViolation } from '../persistence/pg-errors.js';
import type { RegistrationUnitOfWork } from '../persistence/unit-of-work.js';

/** 100 kredit gratis saat pendaftaran (docs/03 — Alur 1). */
const SIGNUP_BONUS_CREDITS = 100;

export interface RegisterTenantInput {
  readonly name: string;
  readonly email: string;
  readonly country: string | null;
  readonly keyMode: ApiKeyMode;
  /** Hash bcrypt kata sandi (dihitung sebelum transaksi, opsional). */
  readonly passwordHash?: string;
  /** ID Google jika mendaftar via OAuth. */
  readonly googleId?: string;
}

export interface RegisterTenantResult {
  readonly tenant: Tenant;
  readonly user: User;
  readonly apiKey: ApiKey;
  /** Plaintext API key — DITAMPILKAN SEKALI ke klien (docs/09). */
  readonly plaintextKey: string;
}

/**
 * Registrasi tenant (API-first, docs/07 Tahap 2+5). Membuat tenant + user +
 * wallet (saldo 0) + API key awal + 100 kredit bonus pendaftaran, semuanya
 * dalam SATU transaksi DB (atomik, docs/21). default_locale dari country (docs/22).
 */
export class RegistrationService {
  constructor(
    private readonly uow: RegistrationUnitOfWork,
    private readonly idGen: IdGenerator,
    private readonly hasher: ApiKeyHasher,
    /**
     * Sumber jumlah kredit bonus pendaftaran. Default ke konstanta bila tak
     * disuntik. Dipakai owner untuk mengubah "Saldo gratis pendaftar" live.
     */
    private readonly bonusProvider?: () => Promise<number>,
  ) {}

  async register(input: RegisterTenantInput): Promise<RegisterTenantResult> {
    const tenantId = this.idGen.generate(ID_PREFIXES.tenant) as TenantId;
    const userId = this.idGen.generate(ID_PREFIXES.user) as UserId;
    const bonusTxnId = this.idGen.generate(ID_PREFIXES.transaction);
    const defaultLocale = defaultLocaleForCountry(input.country);
    const bonusCredits = this.bonusProvider
      ? await this.bonusProvider().catch(() => SIGNUP_BONUS_CREDITS)
      : SIGNUP_BONUS_CREDITS;

    try {
      return await this.uow.transaction(async (repos) => {
        const tenant = await repos.tenants.create({
          id: tenantId,
          name: input.name,
          country: input.country,
          defaultLocale,
        });
        const user = await repos.users.create({
          id: userId,
          tenantId: tenant.id,
          email: input.email,
          role: 'owner',
          ...(input.passwordHash !== undefined
            ? { passwordHash: input.passwordHash }
            : {}),
          ...(input.googleId !== undefined ? { googleId: input.googleId } : {}),
        });
        await repos.wallets.create(tenant.id);
        // Bonus kredit pendaftaran (docs/03 — Alur 1); jumlahnya dapat diatur
        // owner. Idempoten via UNIQUE(signup_bonus, tenant_id).
        await repos.wallets.grantBonus(tenant.id, bonusCredits, bonusTxnId);

        const material = buildApiKeyMaterial({
          tenantId: tenant.id,
          mode: input.keyMode,
          idGen: this.idGen,
          hasher: this.hasher,
        });
        const apiKey = await repos.apiKeys.create(material.record);

        return { tenant, user, apiKey, plaintextKey: material.plaintext };
      });
    } catch (err) {
      if (isUniqueViolation(err, 'uq_users_email')) {
        throw Errors.conflict('Email already registered', 'email');
      }
      throw err;
    }
  }
}
