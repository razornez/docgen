import { createHash } from 'node:crypto';
import { AppError, Errors, ID_PREFIXES, buildStorageKey } from '@docgen/shared';
import type {
  ApiKeyMode,
  Clock,
  Document,
  DocumentId,
  IdGenerator,
  RenderJobData,
  RenderJobResult,
  RenderOptions,
  StoragePort,
  TemplateId,
  TenantId,
} from '@docgen/shared';
import type { CreditGate } from '../wallets/wallet.service.js';
import type { TemplateRepository } from '../templates/template.repository.js';
import type { TemplateVersionRepository } from '../templates/template-version.repository.js';
import type { DocumentRepository } from './document.repository.js';

export interface RenderDocumentInput {
  readonly templateId: TemplateId;
  readonly version?: number;
  readonly data: unknown;
  readonly options: RenderOptions;
}

export interface RenderedDocument {
  readonly document: Document;
  /** Signed URL berumur pendek; null bila dokumen belum/tidak completed. */
  readonly outputUrl: string | null;
  readonly expiresAt: Date | null;
  /** Saldo kredit tersisa setelah render; null bila mode test atau gagal. */
  readonly creditsRemaining: number | null;
}

export interface RenderServiceOptions {
  readonly timeoutMs: number;
  readonly signedUrlTtlSeconds: number;
}

/**
 * Abstraksi produsen antrian render: enqueue lalu tunggu hasil.
 */
export interface RenderEnqueuer {
  /** Enqueue + tunggu hasil (untuk render tunggal sync). */
  enqueueAndWait(
    data: RenderJobData,
    timeoutMs: number,
  ): Promise<RenderJobResult>;
  /** Enqueue saja tanpa menunggu (untuk batch async). */
  enqueue(data: RenderJobData): Promise<void>;
}

/**
 * Orkestrasi render dokumen tunggal (sync) — docs/07 Tahap 4+5. Alur kredit
 * (docs/03 — Alur 2): reserve → render → commit (markCharged) / refund. Mode
 * test (sk_test_) render gratis tanpa potong saldo. Semua disaring per tenant.
 */
export class RenderService {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly versions: TemplateVersionRepository,
    private readonly documents: DocumentRepository,
    private readonly queue: RenderEnqueuer,
    private readonly storage: StoragePort,
    private readonly credits: CreditGate,
    private readonly idGen: IdGenerator,
    private readonly clock: Clock,
    private readonly options: RenderServiceOptions,
  ) {}

  async render(
    tenantId: TenantId,
    input: RenderDocumentInput,
    mode: ApiKeyMode = 'live',
  ): Promise<RenderedDocument> {
    const template = await this.templates.findById(tenantId, input.templateId);
    if (!template) throw Errors.notFound('Template not found', 'template');

    const version = input.version ?? template.currentVersion;
    if (version == null) {
      throw Errors.notFound('Template has no versions', 'version');
    }
    const ver = await this.versions.findByTemplateAndVersion(
      template.id,
      version,
    );
    if (!ver) throw Errors.notFound('Template version not found', 'version');

    const documentId = this.idGen.generate(ID_PREFIXES.document) as DocumentId;
    const inputHash = createHash('sha256')
      .update(JSON.stringify({ t: template.id, v: version, d: input.data }))
      .digest('hex');
    const storageKey = buildStorageKey(tenantId, documentId, this.clock.now());

    await this.documents.create({
      id: documentId,
      tenantId,
      templateId: template.id,
      templateVersion: version,
      inputHash,
    });

    // Mode live: reserve kredit sebelum render (docs/03 — Alur 2 Reserve).
    // Mode test: gratis, tidak memotong saldo.
    let creditsRemaining: number | null = null;
    if (mode === 'live') {
      creditsRemaining = await this.credits.reserve(tenantId, documentId);
    }

    try {
      await this.queue.enqueueAndWait(
        {
          documentId,
          tenantId,
          templateId: template.id,
          version,
          data: input.data,
          options: input.options,
          storageKey,
        },
        this.options.timeoutMs,
      );
    } catch (err) {
      // Render gagal — kembalikan kredit bila mode live (docs/03 — Alur 2 Refund).
      if (mode === 'live') {
        await this.credits.refund(tenantId, documentId).catch(() => undefined);
        creditsRemaining = null;
      }

      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('template_render_error')) {
        throw new AppError('template_render_error', 'Template gagal dirender', {
          httpStatus: 422,
          cause: err,
        });
      }
      if (/timed?\s*out|timeout/i.test(msg)) {
        throw new AppError('render_timeout', 'Render melewati batas waktu', {
          httpStatus: 504,
          cause: err,
        });
      }
      throw new AppError('render_failed', 'Render dokumen gagal', {
        httpStatus: 500,
        cause: err,
      });
    }

    // Render sukses — tandai dokumen sebagai charged (docs/03 — Alur 2 Commit).
    if (mode === 'live') {
      await this.credits
        .markCharged(tenantId, documentId)
        .catch(() => undefined);
    }

    const doc = await this.documents.findById(tenantId, documentId);
    if (!doc) throw Errors.internal();
    return this.withUrl(doc, creditsRemaining);
  }

  /** Ambil dokumen + terbitkan signed URL BARU (tanpa render ulang / potong saldo). */
  async getDocument(
    tenantId: TenantId,
    id: DocumentId,
  ): Promise<RenderedDocument> {
    const doc = await this.documents.findById(tenantId, id);
    if (!doc) throw Errors.notFound('Document not found', 'id');
    return this.withUrl(doc, null);
  }

  private async withUrl(
    doc: Document,
    creditsRemaining: number | null,
  ): Promise<RenderedDocument> {
    if (doc.status === 'completed' && doc.storageKey) {
      const ttl = this.options.signedUrlTtlSeconds;
      const outputUrl = await this.storage.signedUrl(doc.storageKey, ttl);
      const expiresAt = new Date(this.clock.nowMs() + ttl * 1000);
      return { document: doc, outputUrl, expiresAt, creditsRemaining };
    }
    return {
      document: doc,
      outputUrl: null,
      expiresAt: null,
      creditsRemaining,
    };
  }
}
