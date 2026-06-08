/**
 * Ensures the demo tenant exists every time the API starts.
 * Safe to call repeatedly — exits immediately if account already exists.
 */
import bcrypt from 'bcryptjs';
import type { Pool } from 'pg';
import type { RegistrationService } from '../registration/registration.service.js';
import type { TemplateService } from '../templates/template.service.js';

const DEMO_EMAIL = 'demo@docgen.razornez.net';
const DEMO_PASSWORD = 'demo1234';
const DEMO_NAME = 'DocGen Demo';

export async function ensureDemoAccount(
  pool: Pool,
  registrationService: RegistrationService,
  templateService: TemplateService,
): Promise<void> {
  try {
    const { rows } = await pool.query<{ tenant_id: string }>(
      `SELECT tenant_id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [DEMO_EMAIL],
    );

    if (rows.length > 0) return; // already exists — nothing to do

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const result = await registrationService.register({
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      country: null,
      keyMode: 'live',
      passwordHash,
    });

    void templateService.importDefaults(result.tenant.id);

    console.log(
      `[demo-seeder] Demo account created: ${DEMO_EMAIL} (tenant: ${result.tenant.id})`,
    );
  } catch (err) {
    // Log but never crash the API over this
    console.error('[demo-seeder] Failed to seed demo account:', err);
  }
}
