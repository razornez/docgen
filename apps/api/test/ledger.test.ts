import { describe, expect, it } from 'vitest';
import { applyWalletCredit, reserveWalletCredits } from '@docgen/db';

interface FakeResult {
  rows: unknown[];
  rowCount: number;
}
function fakeDb(responses: FakeResult[]) {
  const calls: { text: string; params: unknown[] }[] = [];
  let i = 0;
  const db = {
    calls,
    query: (text: string, params: unknown[]) => {
      calls.push({ text, params });
      return Promise.resolve(responses[i++] ?? { rows: [], rowCount: 0 });
    },
  };
  return db;
}

describe('ledger.applyWalletCredit', () => {
  it('menambah saldo lalu mencatat ledger (amount positif, balance_after dari UPDATE)', async () => {
    const db = fakeDb([
      { rows: [{ balance: '150' }], rowCount: 1 },
      { rows: [], rowCount: 1 },
    ]);
    const r = await applyWalletCredit(db as never, {
      id: 'txn_1',
      tenantId: 't1',
      type: 'topup',
      amount: 100,
      refType: 'payment',
      refId: 'pay_1',
    });
    expect(r.balanceAfter).toBe(150);
    expect(db.calls[0]!.text).toMatch(
      /UPDATE wallets SET balance = balance \+/,
    );
    expect(db.calls[0]!.params).toEqual([100, 't1']);
    expect(db.calls[1]!.text).toMatch(/INSERT INTO wallet_transactions/);
    expect(db.calls[1]!.params).toEqual([
      'txn_1',
      't1',
      'topup',
      100,
      150,
      'payment',
      'pay_1',
      1,
    ]);
  });
});

describe('ledger.reserveWalletCredits', () => {
  it('null saat saldo kurang (0 baris ter-update) — TIDAK menulis ledger', async () => {
    const db = fakeDb([{ rows: [], rowCount: 0 }]);
    const r = await reserveWalletCredits(db as never, {
      id: 'txn_2',
      tenantId: 't1',
      type: 'debit',
      amount: 5,
      refType: 'document',
      refId: 'doc_1',
    });
    expect(r).toBeNull();
    expect(db.calls).toHaveLength(1);
  });

  it('mengurangi saldo & catat ledger amount NEGATIF saat saldo cukup', async () => {
    const db = fakeDb([
      { rows: [{ balance: '95' }], rowCount: 1 },
      { rows: [], rowCount: 1 },
    ]);
    const r = await reserveWalletCredits(db as never, {
      id: 'txn_3',
      tenantId: 't1',
      type: 'debit',
      amount: 5,
      refType: 'document',
      refId: 'doc_1',
      unitPrice: 5,
    });
    expect(r?.balanceAfter).toBe(95);
    expect(db.calls[0]!.text).toMatch(/balance >= \$1/); // guard saldo cukup
    expect(db.calls[1]!.params).toEqual([
      'txn_3',
      't1',
      'debit',
      -5,
      95,
      'document',
      'doc_1',
      5,
    ]);
  });
});
