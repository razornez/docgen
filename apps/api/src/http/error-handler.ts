import { AppError, Errors } from '@docgen/shared';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

/**
 * Amplop error tunggal (docs/02): `{ error: { type, message, param?, request_id } }`.
 * `type` & `param` STABIL dalam Inggris (machine-readable, docs/22); `message`
 * boleh dilokalkan menyusul. `request_id` selalu disertakan untuk debugging.
 */
function sendError(
  reply: FastifyReply,
  requestId: string,
  err: AppError,
): void {
  reply.code(err.httpStatus).send({
    error: {
      type: err.type,
      message: err.message,
      ...(err.param !== undefined ? { param: err.param } : {}),
      request_id: requestId,
    },
  });
}

/**
 * Memasang handler error & not-found yang memetakan ke amplop standar.
 * AppError dipetakan apa adanya; ZodError → 400 invalid_request; error Fastify
 * 4xx (mis. JSON rusak) → 400; sisanya → 500 tanpa membocorkan detail internal.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    sendError(reply, request.id, Errors.notFound('Route not found'));
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      // 5xx dicatat sebagai error, 4xx cukup warn (kesalahan klien).
      if (error.httpStatus >= 500) {
        request.log.error({ err: error, type: error.type }, 'app error');
      } else {
        request.log.warn({ type: error.type, param: error.param }, 'app error');
      }
      sendError(reply, request.id, error);
      return;
    }

    if (error instanceof ZodError) {
      const issue = error.issues[0];
      const path = issue ? issue.path.join('.') : undefined;
      sendError(
        reply,
        request.id,
        Errors.invalidRequest(issue?.message ?? 'Invalid request', path),
      );
      return;
    }

    // Error bawaan Fastify (validasi skema, body JSON rusak) membawa statusCode 4xx.
    const status = error.statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      sendError(reply, request.id, Errors.invalidRequest(error.message));
      return;
    }

    // Tak terduga: jangan bocorkan detail (docs/13/21) — log lengkap, balas generik.
    request.log.error({ err: error }, 'unhandled error');
    sendError(reply, request.id, Errors.internal());
  });
}
