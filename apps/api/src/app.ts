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
import { PgDocumentRepository } from './documents/document.repository.js';
import { RenderService } from './documents/render.service.js';
import { registerDocumentRoutes } from './documents/document.route.js';
import { registerFileRoutes } from './files/file.route.js';
import { RenderQueue } from './infra/render-queue.js';
import { HealthRepository } from './health/health.repository.js';
import { HealthService } from './health/health.service.js';
import { registerHealthRoutes } from './health/health.route.js';
import { registerErrorHandler } from './http/error-handler.js';
import { registerMeRoutes } from './me/me.route.js';
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
import { MidtransGateway } from './infra/midtrans.js';
import { PaymentService } from './payments/payment.service.js';
import {
  registerPaymentRoutes,
  registerPaymentWebhookRoute,
} from './payments/payment.route.js';

/**
 * Composition root (docs/21 — Ports & Adapters / Dependency Injection).
 * Adapter konkret di-instansiasi dan disuntikkan ke service, lalu rute
 * didaftarkan. Rute publik dan terproteksi dipisah lewat dua plugin Fastify.
 */
export function buildApp(config: AppConfig): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    genReqId: () => `req_${randomBase62(20)}`,
    // Percaya X-Forwarded-For / X-Forwarded-Proto dari reverse proxy (nginx/Cloudflare).
    trustProxy: config.NODE_ENV === 'production',
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  // Security headers (HSTS, nosniff, frameguard, dsb.) — docs/13.
  void app.register(helmet, {
    contentSecurityPolicy: false, // API server, bukan HTML app
    crossOriginResourcePolicy: false, // PDF harus bisa diakses lintas asal
  });

  registerErrorHandler(app);

  // --- Adapter & infra ---
  const pool = getPool();
  const clock = new SystemClock();
  const idGen = new PrefixedIdGenerator();
  const hasher = new ApiKeyHasher(config.APIKEY_HASH_PEPPER);

  // --- Repository ---
  const tenantRepo = new PgTenantRepository(pool);
  const walletRepo = new PgWalletRepository(pool);
  const apiKeyRepo = new PgApiKeyRepository(pool);
  const templateRepo = new PgTemplateRepository(pool);
  const templateVersionRepo = new PgTemplateVersionRepository(pool);
  const documentRepo = new PgDocumentRepository(pool);

  // Storage (docs/10): filesystem untuk dev, s3 untuk prod (R2/S3/MinIO).
  // fsStorage hanya diisi saat driver=filesystem — dipakai oleh /v1/files.
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

  const renderQueue = new RenderQueue(config.REDIS_URL);
  app.addHook('onClose', async () => {
    await renderQueue.close();
  });

  // --- Service ---
  const healthService = new HealthService(new HealthRepository(clock));
  const apiKeyService = new ApiKeyService(apiKeyRepo, hasher, idGen, clock);
  const registrationService = new RegistrationService(
    new PgRegistrationUnitOfWork(),
    idGen,
    hasher,
  );
  const accountService = new AccountService(tenantRepo, walletRepo);
  const templateService = new TemplateService(
    new PgTemplateUnitOfWork(),
    templateRepo,
    templateVersionRepo,
    idGen,
  );
  const walletService = new WalletService(idGen);
  const sessionService = new AuthSessionService(
    config.SESSION_SECRET,
    registrationService,
    new PgUserRepository(pool),
    new PgApiKeyRepository(pool),
    config.DASHBOARD_URL,
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.PUBLIC_BASE_URL,
    templateService,
  );
  const paymentService = new PaymentService(
    pool,
    new MidtransGateway(
      config.MIDTRANS_SERVER_KEY,
      config.MIDTRANS_IS_PRODUCTION,
    ),
    idGen,
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

  // --- Rute ---
  registerHealthRoutes(app, healthService);

  void app.register(
    async (instance) => {
      registerRegistrationRoutes(
        instance,
        registrationService,
        templateService,
      );
      registerSessionRoutes(instance, sessionService);
      // /v1/files hanya diperlukan saat driver=filesystem; S3/R2 punya signed URL sendiri.
      if (fsStorage) registerFileRoutes(instance, fsStorage);
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
      // Rate limiting per API key (docs/01 — token bucket Redis). Jalan setelah
      // auth agar apiKeyId tersedia di context. Gagal ringan bila Redis mati.
      instance.addHook('preHandler', async (request) => {
        const ctx = request.authContext;
        if (!ctx) return;
        try {
          await checkRateLimit(getRedis(), ctx.apiKeyId, ctx.mode);
        } catch (err) {
          // Bila error Redis (bukan 429), biarkan request lewat — jangan blokir
          // karena infrastruktur mati (prinsip graceful degradation).
          const e = err as { type?: string };
          if (e.type === 'rate_limited') throw err;
        }
      });
      registerMeRoutes(instance, accountService);
      registerApiKeyRoutes(instance, apiKeyService);
      registerTemplateRoutes(instance, templateService);
      registerDocumentRoutes(instance, renderService);
      registerBatchRoutes(instance, batchService, storage);
      registerWebhookRoutes(instance, new PgWebhookRepository(pool));
      registerPaymentRoutes(instance, paymentService, idGen);
      registerWalletRoutes(instance, walletRepo, pool);
    },
    { prefix: '/v1' },
  );

  return app;
}
