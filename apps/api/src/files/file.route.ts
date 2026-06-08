import { AppError } from '@docgen/shared';
import type { FilesystemStorage } from '@docgen/storage';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const FileQuery = z.object({
  key: z.string().min(1),
  expires: z.coerce.number().int(),
  sig: z.string().min(1),
});

/**
 * Endpoint unduh PDF DEV untuk adapter filesystem (docs/10): PUBLIK (tanpa API
 * key) karena diamankan oleh signed token pada query. Memverifikasi tanda tangan
 * + masa berlaku, lalu mengalirkan byte PDF. Untuk S3/MinIO, signed URL menunjuk
 * langsung ke object storage sehingga rute ini tidak diperlukan.
 */
export function registerFileRoutes(
  app: FastifyInstance,
  storage: FilesystemStorage,
): void {
  app.get('/files', async (request, reply) => {
    const q = FileQuery.parse(request.query);

    if (!storage.verify(q.key, q.expires, q.sig)) {
      throw new AppError('invalid_link', 'Invalid or expired download link', {
        httpStatus: 403,
      });
    }

    let body: Buffer;
    try {
      body = await storage.read(q.key);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AppError('not_found', 'File not found', { httpStatus: 404 });
      }
      throw err;
    }

    const filename = q.key.split('/').pop() ?? 'document.pdf';
    reply.type('application/pdf');
    reply.header('content-disposition', `inline; filename="${filename}"`);
    return body;
  });
}
