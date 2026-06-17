import type { Locale, TenantId, User, UserId } from '@docgen/shared';
import type { Queryable } from '@docgen/db';

export interface CreateUserInput {
  readonly id: UserId;
  readonly tenantId: TenantId;
  readonly email: string;
  readonly passwordHash?: string;
  readonly googleId?: string;
  readonly displayName?: string;
  readonly role?: 'owner' | 'admin' | 'member';
}

/** Row yang dikembalikan hanya untuk keperluan autentikasi (tidak pernah dikirim ke klien). */
export interface AuthUserRow {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
}

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  findForAuth(email: string): Promise<AuthUserRow | null>;
  findForAuthByGoogleId(googleId: string): Promise<AuthUserRow | null>;
  updateGoogleId(userId: UserId, googleId: string): Promise<void>;
  markEmailVerified(userId: string): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}

interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  email_verified_at: Date | null;
  locale: string | null;
  created_at: Date;
  updated_at: Date;
}

function toUser(row: UserRow): User {
  return {
    id: row.id as UserId,
    tenantId: row.tenant_id as TenantId,
    email: row.email,
    emailVerifiedAt: row.email_verified_at,
    locale: (row.locale as Locale | null) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS =
  'id, tenant_id, email, email_verified_at, locale, created_at, updated_at';

export class PgUserRepository implements UserRepository {
  constructor(private readonly db: Queryable) {}

  async create(input: CreateUserInput): Promise<User> {
    const { rows } = await this.db.query<UserRow>(
      `INSERT INTO users (id, tenant_id, email, password_hash, google_id, display_name, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${COLUMNS}`,
      [
        input.id,
        input.tenantId,
        input.email,
        input.passwordHash ?? null,
        input.googleId ?? null,
        input.displayName ?? null,
        input.role ?? 'member',
      ],
    );
    return toUser(rows[0]!);
  }

  async findForAuth(email: string): Promise<AuthUserRow | null> {
    const { rows } = await this.db.query<AuthUserRow>(
      `SELECT id, tenant_id, email, password_hash, google_id
         FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    return rows[0] ?? null;
  }

  async findForAuthByGoogleId(googleId: string): Promise<AuthUserRow | null> {
    const { rows } = await this.db.query<AuthUserRow>(
      `SELECT id, tenant_id, email, password_hash, google_id
         FROM users WHERE google_id = $1`,
      [googleId],
    );
    return rows[0] ?? null;
  }

  async updateGoogleId(userId: UserId, googleId: string): Promise<void> {
    await this.db.query(`UPDATE users SET google_id = $2 WHERE id = $1`, [
      userId,
      googleId,
    ]);
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE users SET email_verified_at = NOW() WHERE id = $1`,
      [userId],
    );
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db.query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [
      userId,
      passwordHash,
    ]);
  }
}
