import { Errors } from '@docgen/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { registerErrorHandler } from '../src/http/error-handler.js';

function buildTestApp(): FastifyInstance {
  const app = Fastify();
  registerErrorHandler(app);
  app.get('/app-error', async () => {
    throw Errors.insufficientCredit();
  });
  app.get('/unauthorized', async () => {
    throw Errors.unauthorized();
  });
  app.get('/zod', async () => {
    z.object({ a: z.string() }).parse({});
    return {};
  });
  app.get('/boom', async () => {
    throw new Error('secret internal detail');
  });
  return app;
}

describe('amplop error (docs/02)', () => {
  it('AppError → status + {error:{type,message,request_id}}', async () => {
    const res = await buildTestApp().inject({
      method: 'GET',
      url: '/app-error',
    });
    expect(res.statusCode).toBe(402);
    const body = res.json();
    expect(body.error.type).toBe('insufficient_credit');
    expect(typeof body.error.message).toBe('string');
    expect(typeof body.error.request_id).toBe('string');
  });

  it('key tidak valid → 401 unauthorized', async () => {
    const res = await buildTestApp().inject({
      method: 'GET',
      url: '/unauthorized',
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.type).toBe('unauthorized');
  });

  it('ZodError → 400 invalid_request dengan param', async () => {
    const res = await buildTestApp().inject({ method: 'GET', url: '/zod' });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.type).toBe('invalid_request');
    expect(body.error.param).toBe('a');
  });

  it('error tak terduga → 500 generik, tidak membocorkan detail internal', async () => {
    const res = await buildTestApp().inject({ method: 'GET', url: '/boom' });
    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.error.type).toBe('internal_error');
    expect(body.error.message).not.toContain('secret internal detail');
  });

  it('route tak dikenal → 404 not_found', async () => {
    const res = await buildTestApp().inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.type).toBe('not_found');
  });
});
