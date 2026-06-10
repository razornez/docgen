import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { KasugaiGateway } from '../src/infra/kasugai.js';

const SECRET = 'whsec_test_secret_123';

function sign(rawBody: string, secret = SECRET): string {
  return 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
}

describe('KasugaiGateway.verifyWebhook', () => {
  const gw = new KasugaiGateway('https://kasugai.example', 'sk_x', SECRET);

  it('menerima signature valid atas raw body dan mengekstrak orderId', () => {
    const raw = JSON.stringify({
      event: 'payment.paid',
      data: { orderId: 'pay_abc123' },
    });
    const result = gw.verifyWebhook(raw, sign(raw));
    expect(result).toEqual({
      orderId: 'pay_abc123',
      event: 'payment.paid',
      paid: true,
    });
  });

  it('menolak signature yang tidak cocok', () => {
    const raw = JSON.stringify({
      event: 'payment.paid',
      data: { orderId: 'x' },
    });
    expect(gw.verifyWebhook(raw, sign(raw, 'secret_salah'))).toBeNull();
  });

  it('menolak bila raw body diubah sedikit pun (HMAC atas raw)', () => {
    const raw = JSON.stringify({
      event: 'payment.paid',
      data: { orderId: 'x' },
    });
    const sig = sign(raw);
    // Body di-re-serialize dengan spasi berbeda → signature tak lagi cocok.
    const tampered = raw.replace('{', '{ ');
    expect(gw.verifyWebhook(tampered, sig)).toBeNull();
  });

  it('event selain payment.paid → paid=false (tidak mengkredit)', () => {
    const raw = JSON.stringify({
      event: 'payment.pending',
      data: { orderId: 'pay_1' },
    });
    const result = gw.verifyWebhook(raw, sign(raw));
    expect(result).toMatchObject({ paid: false, event: 'payment.pending' });
  });

  it('mendukung order_id (snake_case) selain orderId', () => {
    const raw = JSON.stringify({
      event: 'payment.paid',
      data: { order_id: 'pay_snake' },
    });
    expect(gw.verifyWebhook(raw, sign(raw))?.orderId).toBe('pay_snake');
  });

  it('null bila webhook secret kosong (fail-closed)', () => {
    const noSecret = new KasugaiGateway('https://k', 'sk_x', '');
    const raw = JSON.stringify({
      event: 'payment.paid',
      data: { orderId: 'x' },
    });
    expect(noSecret.verifyWebhook(raw, sign(raw))).toBeNull();
  });

  it('signature kosong → null (tanpa throw)', () => {
    const raw = JSON.stringify({
      event: 'payment.paid',
      data: { orderId: 'x' },
    });
    expect(gw.verifyWebhook(raw, '')).toBeNull();
  });
});
