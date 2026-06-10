import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { KasugaiGateway } from '../src/infra/kasugai.js';

const SECRET = 'whsec_test_secret_123';

function sign(rawBody: string, secret = SECRET): string {
  return 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
}

describe('KasugaiGateway.verifyWebhook', () => {
  const gw = new KasugaiGateway('https://kasugai.example', 'sk_x', SECRET);

  it('menerima payload Kasugai (orderId di TOP-LEVEL) dengan signature valid', () => {
    // Bentuk payload nyata Kasugai: orderId di top-level, bukan nested.
    const raw = JSON.stringify({
      event: 'payment.paid',
      orderId: 'pay_CczIpW7t2rh7xQ2VaFS0BC',
      amount: 25000,
      currency: 'IDR',
      paidAt: '2026-06-10T10:07:08.000Z',
    });
    expect(gw.verifyWebhook(raw, sign(raw))).toEqual({
      ok: true,
      orderId: 'pay_CczIpW7t2rh7xQ2VaFS0BC',
      event: 'payment.paid',
      paid: true,
    });
  });

  it('tetap mendukung orderId nested (body.data.orderId) sbg cadangan', () => {
    const raw = JSON.stringify({
      event: 'payment.paid',
      data: { orderId: 'pay_nested' },
    });
    const r = gw.verifyWebhook(raw, sign(raw));
    expect(r).toMatchObject({ ok: true, orderId: 'pay_nested', paid: true });
  });

  it('signature salah → ok:false reason invalid_signature', () => {
    const raw = JSON.stringify({ event: 'payment.paid', orderId: 'x' });
    expect(gw.verifyWebhook(raw, sign(raw, 'secret_salah'))).toEqual({
      ok: false,
      reason: 'invalid_signature',
    });
  });

  it('raw body diubah sedikit pun → invalid_signature (HMAC atas raw)', () => {
    const raw = JSON.stringify({ event: 'payment.paid', orderId: 'x' });
    const sig = sign(raw);
    const tampered = raw.replace('{', '{ ');
    expect(gw.verifyWebhook(tampered, sig)).toEqual({
      ok: false,
      reason: 'invalid_signature',
    });
  });

  it('signature valid tapi orderId hilang → ok:false reason bad_payload', () => {
    const raw = JSON.stringify({ event: 'payment.paid', amount: 25000 });
    expect(gw.verifyWebhook(raw, sign(raw))).toEqual({
      ok: false,
      reason: 'bad_payload',
    });
  });

  it('event selain payment.paid → paid=false (tidak mengkredit)', () => {
    const raw = JSON.stringify({ event: 'payment.pending', orderId: 'pay_1' });
    expect(gw.verifyWebhook(raw, sign(raw))).toMatchObject({
      ok: true,
      paid: false,
      event: 'payment.pending',
    });
  });

  it('webhook secret kosong → invalid_signature (fail-closed)', () => {
    const noSecret = new KasugaiGateway('https://k', 'sk_x', '');
    const raw = JSON.stringify({ event: 'payment.paid', orderId: 'x' });
    expect(noSecret.verifyWebhook(raw, sign(raw))).toEqual({
      ok: false,
      reason: 'invalid_signature',
    });
  });

  it('signature kosong → invalid_signature (tanpa throw)', () => {
    const raw = JSON.stringify({ event: 'payment.paid', orderId: 'x' });
    expect(gw.verifyWebhook(raw, '')).toEqual({
      ok: false,
      reason: 'invalid_signature',
    });
  });
});
