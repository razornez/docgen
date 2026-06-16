import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { randomBase62 } from '@docgen/shared';
import { requireAuth } from '../auth/auth-context.js';

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: string | null;
  created_at: string;
}

const ROLE = z.enum(['admin', 'member']);

const InviteSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(120).optional(),
  role: ROLE.default('member'),
});
const RoleSchema = z.object({ role: ROLE });
const IdParam = z.object({ id: z.string().trim().min(1) });

function present(r: UserRow) {
  return {
    id: r.id,
    name: r.display_name ?? r.email.split('@')[0],
    email: r.email,
    role: r.role ?? 'member',
    created_at: r.created_at,
  };
}

/**
 * Rute tim untuk panel Admin (terproteksi, disaring ke tenant — docs/13).
 * GET daftar · POST undang · PATCH ubah peran · DELETE keluarkan.
 * Pemilik (owner) tidak boleh diubah/dihapus.
 */
export function registerTeamRoutes(app: FastifyInstance, pool: Pool): void {
  app.get('/team', async (request) => {
    const ctx = requireAuth(request);
    const { rows } = await pool.query<UserRow>(
      `SELECT id, email, display_name, role, created_at
         FROM users WHERE tenant_id = $1
        ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
                 created_at ASC`,
      [ctx.tenantId],
    );
    return { data: rows.map(present) };
  });

  // Undang anggota — buat user (status undangan: belum bisa login sampai set
  // password). Email unik per sistem; bentrok → 409.
  app.post('/team', async (request, reply) => {
    const ctx = requireAuth(request);
    const body = InviteSchema.parse(request.body ?? {});
    const exists = await pool.query(
      `SELECT 1 FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [body.email],
    );
    if (exists.rowCount && exists.rowCount > 0) {
      reply.code(409);
      return {
        error: {
          type: 'conflict',
          message: 'Email sudah terdaftar',
          param: 'email',
          request_id: request.id,
        },
      };
    }
    const id = `usr_${randomBase62(22)}`;
    const name = body.name ?? body.email.split('@')[0];
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users
         (id, tenant_id, email, locale, password_hash, display_name, role,
          created_at, updated_at)
       VALUES ($1, $2, $3, 'id', 'invited-pending', $4, $5, now(), now())
       RETURNING id, email, display_name, role, created_at`,
      [id, ctx.tenantId, body.email, name, body.role],
    );
    reply.code(201);
    return { member: present(rows[0]!) };
  });

  // Ubah peran (owner tak boleh diubah).
  app.patch('/team/:id', async (request, reply) => {
    const ctx = requireAuth(request);
    const { id } = IdParam.parse(request.params);
    const { role } = RoleSchema.parse(request.body ?? {});
    const { rows } = await pool.query<UserRow>(
      `UPDATE users SET role = $3, updated_at = now()
        WHERE tenant_id = $1 AND id = $2 AND role <> 'owner'
       RETURNING id, email, display_name, role, created_at`,
      [ctx.tenantId, id, role],
    );
    if (rows.length === 0) {
      reply.code(404);
      return {
        error: {
          type: 'not_found',
          message: 'Anggota tidak ditemukan',
          request_id: request.id,
        },
      };
    }
    return { member: present(rows[0]!) };
  });

  // Keluarkan anggota (owner tak boleh dihapus).
  app.delete('/team/:id', async (request, reply) => {
    const ctx = requireAuth(request);
    const { id } = IdParam.parse(request.params);
    const { rowCount } = await pool.query(
      `DELETE FROM users
        WHERE tenant_id = $1 AND id = $2 AND role <> 'owner'`,
      [ctx.tenantId, id],
    );
    if (!rowCount) {
      reply.code(404);
      return {
        error: {
          type: 'not_found',
          message: 'Anggota tidak ditemukan',
          request_id: request.id,
        },
      };
    }
    return { deleted: true };
  });
}
