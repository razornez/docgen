-- Data tenant untuk Owner Console → halaman Tenant. DB lokal/preview.
-- Satu payment per tenant (kredit=DOKUMEN, amount=MRR; trial amount=0) +
-- wallet (SISA KREDIT). Bersihkan payment owner lama agar angka konsisten.

-- Tenant baru (UD Berkah Jaya) bila belum ada
INSERT INTO tenants (id, name, status, kyc_status, country, default_locale, created_at, updated_at) VALUES
 ('ten_ubj', 'UD Berkah Jaya', 'active', 'verified', 'ID', 'id', now()-interval '18 days', now())
ON CONFLICT (id) DO NOTHING;

-- Reset payment demo lama
DELETE FROM payments WHERE id LIKE 'pay_o%';

-- Satu payment per tenant (kredit = total dokumen/kapasitas; amount = MRR bln ini)
INSERT INTO payments (id, tenant_id, package_id, amount_idr, credits, currency, gateway, method, status, created_at, paid_at, updated_at) VALUES
 ('pay_o1', 'ten_Blfjz53nq3BXrH9EKEnY3S', 'pack_20k', 6400000, 12840, 'IDR', 'midtrans', 'qris', 'paid', now()-interval '2 days',  now()-interval '2 days',  now()),
 ('pay_o2', 'ten_ckd', 'pack_20k', 4100000, 8420, 'IDR', 'midtrans', 'va',   'paid', now()-interval '6 days',  now()-interval '6 days',  now()),
 ('pay_o3', 'ten_kop', 'pack_5k',  1200000, 3100, 'IDR', 'midtrans', 'qris', 'paid', now()-interval '9 days',  now()-interval '9 days',  now()),
 ('pay_o4', 'ten_psa', 'pack_5k',  1900000, 2960, 'IDR', 'midtrans', 'va',   'paid', now()-interval '11 days', now()-interval '11 days', now()),
 ('pay_o5', 'ten_pam', 'pack_20k', 5200000, 7320, 'IDR', 'midtrans', 'qris', 'paid', now()-interval '3 hours', now()-interval '3 hours', now()),
 ('pay_o6', 'ten_ubj', 'pack_1k',   400000,  540, 'IDR', 'midtrans', 'qris', 'paid', now()-interval '5 days',  now()-interval '5 days',  now()),
 ('pay_o7', 'ten_csr', 'pack_1k',   149000,  800, 'IDR', 'midtrans', 'qris', 'paid', now()-interval '20 hours',now()-interval '20 hours',now()),
 -- trial: kredit gratis (amount 0 → MRR "—", status Trial)
 ('pay_o8', 'ten_skn', 'pack_1k', 0,  96, 'IDR', 'midtrans', 'qris', 'paid', now()-interval '8 days', now()-interval '8 days', now()),
 ('pay_o9', 'ten_ycy', 'pack_1k', 0,  12, 'IDR', 'midtrans', 'qris', 'paid', now()-interval '6 days', now()-interval '6 days', now());

-- Wallet (SISA KREDIT) — upsert
INSERT INTO wallets (tenant_id, balance, currency, updated_at) VALUES
 ('ten_Blfjz53nq3BXrH9EKEnY3S', 4820, 'credit', now()),
 ('ten_ckd', 1280, 'credit', now()),
 ('ten_kop',  240, 'credit', now()),
 ('ten_psa', 3100, 'credit', now()),
 ('ten_pam', 9100, 'credit', now()),
 ('ten_ubj',   60, 'credit', now()),
 ('ten_skn',    4, 'credit', now()),
 ('ten_ycy',   88, 'credit', now()),
 ('ten_csr', 1200, 'credit', now())
ON CONFLICT (tenant_id) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();

SELECT count(*) tenants_with_payment FROM (SELECT DISTINCT tenant_id FROM payments WHERE status='paid') x;
