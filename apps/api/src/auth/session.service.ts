import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload } from 'jsonwebtoken';

const { compare, hash } = bcrypt;
const { sign, verify } = jwt;
import { Errors, randomBase62 } from '@docgen/shared';
import type { ApiKeyId, ApiKeyMode, TenantId, UserId } from '@docgen/shared';
import { getRedis } from '../infra/redis.js';
import type { AuthContext } from './auth-context.js';
import type { RegistrationService } from '../registration/registration.service.js';
import type { PgUserRepository } from '../users/user.repository.js';
import type { PgApiKeyRepository } from '../api-keys/api-key.repository.js';
import type { TemplateService } from '../templates/template.service.js';

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = '7d';

interface SessionPayload extends JwtPayload {
  sub: string;
  tenantId: string;
  apiKeyId: string;
  mode: ApiKeyMode;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
}

export class AuthSessionService {
  constructor(
    private readonly jwtSecret: string,
    private readonly registrationService: RegistrationService,
    private readonly userRepo: PgUserRepository,
    private readonly apiKeyRepo: PgApiKeyRepository,
    private readonly dashboardUrl: string,
    private readonly googleClientId: string,
    private readonly googleClientSecret: string,
    private readonly publicBaseUrl: string,
    private readonly templateService: TemplateService,
  ) {}

  // ---- Registration ----

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<{ token: string; tenantId: TenantId; userId: UserId }> {
    const passwordHash = await hash(password, BCRYPT_ROUNDS);
    const result = await this.registrationService.register({
      name,
      email,
      country: null,
      keyMode: 'live',
      passwordHash,
    });
    const token = this.issueToken(
      result.user.id,
      result.tenant.id,
      result.apiKey.id,
      result.apiKey.mode,
    );
    // Fire-and-forget: seed default templates for new tenant
    void this.templateService.importDefaults(result.tenant.id);
    return { token, tenantId: result.tenant.id, userId: result.user.id };
  }

  // ---- Email + password login ----

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; tenantId: TenantId; userId: UserId }> {
    const authUser = await this.userRepo.findForAuth(email);
    if (!authUser) throw Errors.unauthorized('Email atau kata sandi salah');
    if (!authUser.password_hash) {
      throw Errors.unauthorized(
        'Akun ini menggunakan login Google. Gunakan tombol "Masuk dengan Google".',
      );
    }
    const ok = await compare(password, authUser.password_hash);
    if (!ok) throw Errors.unauthorized('Email atau kata sandi salah');

    const apiKey = await this.findPrimaryApiKey(authUser.tenant_id as TenantId);
    const token = this.issueToken(
      authUser.id as UserId,
      authUser.tenant_id as TenantId,
      apiKey.id,
      apiKey.mode,
    );
    return {
      token,
      tenantId: authUser.tenant_id as TenantId,
      userId: authUser.id as UserId,
    };
  }

  // ---- Google OAuth ----

  getGoogleAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.googleClientId,
      redirect_uri: `${this.publicBaseUrl}/v1/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(code: string): Promise<{ redirectUrl: string }> {
    const userInfo = await this.exchangeGoogleCode(code);
    const token = await this.loginOrRegisterGoogle(userInfo);
    // Simpan JWT di Redis dengan kode tukar sekali-pakai (TTL 60 detik).
    // URL hanya membawa kode opaque — bukan JWT itu sendiri.
    const exCode = randomBase62(32);
    await getRedis().set(`oauth:ex:${exCode}`, token, 'EX', 60);
    const redirectUrl = `${this.dashboardUrl}/auth/callback?code=${encodeURIComponent(exCode)}`;
    return { redirectUrl };
  }

  async redeemExchangeCode(code: string): Promise<string> {
    const key = `oauth:ex:${code}`;
    const token = await getRedis().getdel(key);
    if (!token)
      throw Errors.unauthorized(
        'Kode OAuth tidak valid atau sudah kedaluwarsa',
      );
    return token;
  }

  private async exchangeGoogleCode(code: string): Promise<GoogleUserInfo> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        redirect_uri: `${this.publicBaseUrl}/v1/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) throw Errors.unauthorized('Google OAuth gagal');

    const tokenData = (await tokenRes.json()) as { access_token: string };
    const userRes = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
    if (!userRes.ok) throw Errors.unauthorized('Gagal mengambil profil Google');
    return (await userRes.json()) as GoogleUserInfo;
  }

  private async loginOrRegisterGoogle(
    userInfo: GoogleUserInfo,
  ): Promise<string> {
    // 1. Cari berdasarkan google_id
    const existing = await this.userRepo.findForAuthByGoogleId(userInfo.sub);
    if (existing) {
      const apiKey = await this.findPrimaryApiKey(
        existing.tenant_id as TenantId,
      );
      return this.issueToken(
        existing.id as UserId,
        existing.tenant_id as TenantId,
        apiKey.id,
        apiKey.mode,
      );
    }

    // 2. Cari berdasarkan email (akun sudah ada tapi belum link Google)
    const byEmail = await this.userRepo.findForAuth(userInfo.email);
    if (byEmail) {
      await this.userRepo.updateGoogleId(byEmail.id as UserId, userInfo.sub);
      const apiKey = await this.findPrimaryApiKey(
        byEmail.tenant_id as TenantId,
      );
      return this.issueToken(
        byEmail.id as UserId,
        byEmail.tenant_id as TenantId,
        apiKey.id,
        apiKey.mode,
      );
    }

    // 3. Buat akun baru
    const result = await this.registrationService.register({
      name: userInfo.name,
      email: userInfo.email,
      country: null,
      keyMode: 'live',
      googleId: userInfo.sub,
    });
    // Fire-and-forget: seed default templates for new tenant
    void this.templateService.importDefaults(result.tenant.id);
    return this.issueToken(
      result.user.id,
      result.tenant.id,
      result.apiKey.id,
      result.apiKey.mode,
    );
  }

  // ---- Token verification ----

  verifyToken(token: string): AuthContext {
    let payload: SessionPayload;
    try {
      payload = verify(token, this.jwtSecret) as SessionPayload;
    } catch {
      throw Errors.unauthorized('Token sesi tidak valid atau kedaluwarsa');
    }
    return {
      tenantId: payload.tenantId as TenantId,
      apiKeyId: payload.apiKeyId as ApiKeyId,
      mode: payload.mode,
    };
  }

  // ---- Helpers ----

  private issueToken(
    userId: UserId,
    tenantId: TenantId,
    apiKeyId: ApiKeyId,
    mode: ApiKeyMode,
  ): string {
    const payload: Omit<SessionPayload, keyof JwtPayload> = {
      sub: userId,
      tenantId,
      apiKeyId,
      mode,
    };
    return sign(payload, this.jwtSecret, { expiresIn: JWT_EXPIRES_IN });
  }

  private async findPrimaryApiKey(tenantId: TenantId) {
    const keys = await this.apiKeyRepo.listByTenant(tenantId);
    const live = keys.find((k) => k.mode === 'live' && k.status === 'active');
    const any = keys.find((k) => k.status === 'active');
    const key = live ?? any;
    if (!key)
      throw Errors.unauthorized('Tidak ada API key aktif untuk akun ini');
    return key;
  }
}
