import { getPool } from '@docgen/db';
import { PrefixedIdGenerator, SystemClock, randomBase62 } from '@docgen/shared';
import { FilesystemStorage, S3Storage } from '@docgen/storage';
import type { StoragePort } from '@docgen/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import type { AppConfig } from '@docgen/config';
import { ApiKeyService } from './api-keys/api-key.service.js';
import { PgApiKeyRepository } from './api-keys/api-key.repository.js';
import { registerApiKeyRoutes } from './api-keys/api-key.route.js';
import { ApiKeyHasher } from './auth/api-key-hasher.js';
import { makeAuthHook } from './auth/auth.hook.js';
import { AuthSessionService } from './auth/session.service.js';
import { registerSessionRoutes } from './auth/session.route.js';
import { registerEmailAuthRoutes } from './auth/email-auth.route.js';
import { PgDocumentRepository } from './documents/document.repository.js';
import { RenderService } from './documents/render.service.js';
import { registerDocumentRoutes } from './documents/document.route.js';
import { registerFileRoutes } from './files/file.route.js';
import { RenderQueue } from './infra/render-queue.js';
import { createBrevoMailer } from './infra/brevo-mailer.js';
import { makeEmailSender } from './email/send.js';
import { HealthRepository } from './health/health.repository.js';
import { HealthService } from './health/health.service.js';
import { registerHealthRoutes } from './health/health.route.js';
import { registerErrorHandler } from './http/error-handler.js';
import { registerMeRoutes } from './me/me.route.js';
import { registerTeamRoutes } from './team/team.route.js';
import { registerOwnerRoutes } from './owner/owner.route.js';
import { registerPublicRoutes } from './public/public.route.js';
import { PgTemplateUnitOfWork } from './persistence/template-unit-of-work.js';
import { PgRegistrationUnitOfWork } from './persistence/unit-of-work.js';
import { RegistrationService } from './registration/registration.service.js';
import { registerRegistrationRoutes } from './registration/registration.route.js';
import { AccountService } from './tenants/account.service.js';
import { PgTenantRepository } from './tenants/tenant.repository.js';
import { PgUserRepository } from './users/user.repository.js';
import { PgTemplateRepository } from './templates/template.repository.js';
import { PgTemplateVersionRepository } from './templates/template-version.repository.js';
import { TemplateService } from './templates/template.service.js';
import { registerTemplateRoutes } from './templates/template.route.js';
import { PgWalletRepository } from './wallets/wallet.repository.js';
import { WalletService } from './wallets/wallet.service.js';
import { registerWalletRoutes } from './wallets/wallet.route.js';
import { checkRateLimit } from './infra/rate-limiter.js';
import { getRedis } from './infra/redis.js';
import { PgBatchRepository } from './batches/batch.repository.js';
import { DefaultBatchService } from './batches/batch.service.js';
import { registerBatchRoutes } from './batches/batch.route.js';
import { PgWebhookRepository } from './webhooks/webhook.repository.js';
import { registerWebhookRoutes } from './webhooks/webhook.route.js';
import { KasugaiGateway } from './infra/kasugai.js';
import { PaymentService } from './payments/payment.service.js';
import {
  registerPaymentRoutes,
  registerPaymentWebhookRoute,
} from './payments/payment.route.js';
import { ensureDemoAccount } from './demo/demo-seeder.js';

export function buildApp(config: AppConfig): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    genReqId: () => `req_${randomBase62(20)}`,
    trustProxy: config.NODE_ENV === 'production',
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  void app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  });

  registerErrorHandler(app);

  const pool = getPool();
  const clock = new SystemClock();
  const idGen = new PrefixedIdGenerator();
  const hasher = new ApiKeyHasher(config.APIKEY_HASH_PEPPER);

  const tenantRepo = new PgTenantRepository(pool);
  const walletRepo = new PgWalletRepository(pool);
  const apiKeyRepo = new PgApiKeyRepository(pool);
  const templateRepo = new PgTemplateRepository(pool);
  const templateVersionRepo = new PgTemplateVersionRepository(pool);
  const documentRepo = new PgDocumentRepository(pool);
  const userRepo = new PgUserRepository(pool);

  let storage: StoragePort;
  let fsStorage: FilesystemStorage | null = null;
  if (config.STORAGE_DRIVER === 's3') {
    storage = new S3Storage({
      endpoint: config.STORAGE_ENDPOINT,
      region: config.STORAGE_REGION,
      accessKeyId: config.STORAGE_ACCESS_KEY,
      secretAccessKey: config.STORAGE_SECRET_KEY,
      bucket: config.STORAGE_BUCKET,
      forcePathStyle: config.STORAGE_FORCE_PATH_STYLE,
    });
  } else {
    fsStorage = new FilesystemStorage({
      baseDir: config.STORAGE_DIR,
      publicBaseUrl: config.PUBLIC_BASE_URL,
      secret: config.SESSION_SECRET,
    });
    storage = fsStorage;
  }

  // Buat mailer Brevo jika SMTP dikonfigurasi, null jika tidak (dev mode)
  const mailer = config.EMAIL_SMTP_USER
    ? createBrevoMailer({
        host: config.EMAIL_SMTP_HOST,
        port: config.EMAIL_SMTP_PORT,
        user: config.EMAIL_SMTP_USER,
        pass: config.EMAIL_SMTP_PASS,
      })
    : null;

  // Pengirim email transaksional terkelola owner (no-op bila SMTP belum diisi).
  const emailSender = makeEmailSender(pool, mailer, config);

  const renderQueue = new RenderQueue(config.REDIS_URL);
  app.addHook('onClose', async () => {
    await renderQueue.close();
  });

  const healthService = new HealthService(new HealthRepository(clock));
  const apiKeyService = new ApiKeyService(apiKeyRepo, hasher, idGen, clock);
  const registrationService = new RegistrationService(
    new PgRegistrationUnitOfWork(),
    idGen,
    hasher,
    // Jumlah bonus pendaftaran dibaca live dari app_settings (diatur owner).
    async () => {
      const { rows } = await pool.query<{ value: unknown }>(
        `SELECT value FROM app_settings WHERE key='signup_bonus_credits'`,
      );
      const n = Number(rows[0]?.value);
      return Number.isFinite(n) && n >= 0 ? n : 100;
    },
  );
  const accountService = new AccountService(tenantRepo, walletRepo);
  const templateService = new TemplateService(
    new PgTemplateUnitOfWork(),
    templateRepo,
    templateVersionRepo,
    idGen,
  );
  const walletService = new WalletService(idGen, {
    pool,
    emailSender,
    dashboardUrl: config.DASHBOARD_URL,
  });
  const sessionService = new AuthSessionService(
    config.SESSION_SECRET,
    registrationService,
    userRepo,
    new PgApiKeyRepository(pool),
    config.DASHBOARD_URL,
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.PUBLIC_BASE_URL,
    templateService,
    mailer,
    config,
    emailSender,
  );
  const paymentService = new PaymentService(
    pool,
    new KasugaiGateway(
      config.KASUGAI_BASE_URL,
      config.KASUGAI_SECRET_KEY,
      config.KASUGAI_WEBHOOK_SECRET,
      config.KASUGAI_PUBLISHABLE_KEY,
    ),
    idGen,
    config.KASUGAI_PUBLISHABLE_KEY,
    config.KASUGAI_BASE_URL,
  );
  const batchService = new DefaultBatchService(
    new PgBatchRepository(pool),
    templateRepo,
    templateVersionRepo,
    documentRepo,
    renderQueue,
    walletService,
    idGen,
    clock,
  );
  const renderService = new RenderService(
    templateRepo,
    templateVersionRepo,
    documentRepo,
    renderQueue,
    storage,
    walletService,
    idGen,
    clock,
    {
      timeoutMs: config.RENDER_TIMEOUT_MS,
      signedUrlTtlSeconds: config.SIGNED_URL_TTL_SECONDS,
    },
  );

  registerHealthRoutes(app, healthService);

  void app.register(
    async (instance) => {
      registerRegistrationRoutes(
        instance,
        registrationService,
        templateService,
      );
      registerSessionRoutes(instance, sessionService);
      registerEmailAuthRoutes(
        instance,
        pool,
        userRepo,
        mailer,
        config,
        emailSender,
      );
      registerPublicRoutes(instance, pool);
      if (fsStorage) registerFileRoutes(instance, fsStorage);
    },
    { prefix: '/v1' },
  );

  // Webhook Kasugai dalam scope terisolasi: parser content-type khusus yang
  // MENYIMPAN raw body (wajib untuk verifikasi HMAC). Parser ini hanya berlaku
  // di scope ini — route lain tetap memakai JSON parser default Fastify.
  void app.register(
    async (instance) => {
      instance.addContentTypeParser(
        'application/json',
        { parseAs: 'string' },
        (req, body, done) => {
          (req as typeof req & { rawBody?: string }).rawBody =
            typeof body === 'string' ? body : '';
          // Body tidak di-JSON.parse di sini: handler memakai rawBody, dan kita
          // ingin selalu balas 200 (parse gagal tak boleh memicu 400).
          done(null, {});
        },
      );
      registerPaymentWebhookRoute(instance, paymentService, idGen);
    },
    { prefix: '/v1' },
  );

  void app.register(
    async (instance) => {
      instance.addHook(
        'preHandler',
        makeAuthHook(apiKeyService, sessionService),
      );
      instance.addHook('preHandler', async (request) => {
        const ctx = request.authContext;
        if (!ctx) return;
        try {
          await checkRateLimit(getRedis(), ctx.apiKeyId, ctx.mode);
        } catch (err) {
          const e = err as { type?: string };
          if (e.type === 'rate_limited') throw err;
        }
      });
      registerMeRoutes(instance, accountService);
      registerTeamRoutes(instance, pool, emailSender, config);
      registerApiKeyRoutes(instance, apiKeyService);
      registerTemplateRoutes(instance, templateService);
      registerDocumentRoutes(instance, renderService);
      registerBatchRoutes(instance, batchService, storage);
      registerWebhookRoutes(instance, new PgWebhookRepository(pool));
      registerPaymentRoutes(
        instance,
        paymentService,
        idGen,
        emailSender,
        pool,
        config,
      );
      registerWalletRoutes(instance, walletRepo, pool);
    },
    { prefix: '/v1' },
  );

  // Owner platform — scope TERPISAH (auth owner sendiri, bukan auth tenant).
  void app.register(
    async (instance) => {
      registerOwnerRoutes(instance, pool, config);
    },
    { prefix: '/v1' },
  );

  app.addHook('onReady', async () => {
    await ensureDemoAccount(pool, registrationService, templateService);
  });

  return app;
}
