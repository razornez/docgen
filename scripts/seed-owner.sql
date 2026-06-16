-- Data demo platform untuk Owner Console (lintas-tenant). DB lokal/preview.
-- Tenant + payments agar "Tenant teratas", "Pendaftar baru", pendapatan terisi.

-- Tenant demo (selain PT Maju Bersama / preview yang sudah ada)
INSERT INTO tenants (id, name, status, kyc_status, country, default_locale, created_at, updated_at) VALUES
 ('ten_ckd', 'CV Karya Digital',  'active', 'verified', 'ID', 'id', now()-interval '20 days',   now()),
 ('ten_pam', 'PT Aksara Mandiri', 'active', 'verified', 'ID', 'id', now()-interval '3 hours',   now()),
 ('ten_kop', 'Koperasi Sejahtera','active', 'verified', 'ID', 'id', now()-interval '15 days',   now()),
 ('ten_psa', 'PT Sinar Abadi',    'active', 'verified', 'ID', 'id', now()-interval '10 days',   now()),
 ('ten_skn', 'Sekolah Nusantara', 'active', 'pending',  'ID', 'id', now()-interval '12 minutes',now()),
 ('ten_ycy', 'Yayasan Cahaya',    'active', 'pending',  'ID', 'id', now()-interval '26 hours',  now()),
 ('ten_csr', 'CV Sumber Rejeki',  'active', 'verified', 'ID', 'id', now()-interval '28 hours',  now())
ON CONFLICT (id) DO NOTHING;

-- Payments (status paid) — kredit ~ jumlah dokumen, amount_idr = pendapatan.
INSERT INTO payments (id, tenant_id, package_id, amount_idr, credits, currency, gateway, method, status, created_at, paid_at, updated_at) VALUES
 ('pay_o1', 'ten_Blfjz53nq3BXrH9EKEnY3S', 'pack_20k', 6400000, 12840, 'IDR', 'midtrans', 'qris', 'paid', now()-interval '2 days',  now()-interval '2 days',  now()),
 ('pay_o2', 'ten_ckd', 'pack_20k', 4100000, 8420, 'IDR', 'midtrans', 'va',   'paid', now()-interval '6 days',  now()-interval '6 days',  now()),
 ('pay_o3', 'ten_pam', 'pack_20k', 5200000, 7320, 'IDR', 'midtrans', 'qris', 'paid', now()-interval '3 hours', now()-interval '3 hours', now()),
 ('pay_o4', 'ten_kop', 'pack_5k',  1200000, 3100, 'IDR', 'midtrans', 'qris', 'paid', now()-interval '9 days',  now()-interval '9 days',  now()),
 ('pay_o5', 'ten_psa', 'pack_5k',  1900000, 2960, 'IDR', 'midtrans', 'va',   'paid', now()-interval '11 days', now()-interval '11 days', now()),
 ('pay_o6', 'ten_csr', 'pack_1k',   149000,  800, 'IDR', 'midtrans', 'qris', 'paid', now()-interval '20 hours',now()-interval '20 hours',now()),
 -- beberapa top-up tambahan bulan ini agar pendapatan/bln lebih realistis
 ('pay_o7', 'ten_ckd', 'pack_20k', 2290000, 5000, 'IDR', 'midtrans', 'qris', 'paid', now()-interval '4 days',  now()-interval '4 days',  now()),
 ('pay_o8', 'ten_pam', 'pack_5k',   649000, 1500, 'IDR', 'midtrans', 'va',   'paid', now()-interval '1 day',   now()-interval '1 day',   now()),
 ('pay_o9', 'ten_Blfjz53nq3BXrH9EKEnY3S', 'pack_5k', 649000, 1500, 'IDR', 'midtrans', 'qris', 'paid', now()-interval '5 days', now()-interval '5 days', now())
ON CONFLICT (id) DO NOTHING;

SELECT (SELECT count(*) FROM tenants) tenants,
       (SELECT count(*) FROM payments WHERE status='paid') paid,
       (SELECT to_char(sum(amount_idr),'FM999,999,999') FROM payments WHERE status='paid') revenue;
