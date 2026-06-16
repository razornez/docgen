-- Seed data demo untuk akun preview (PT Maju Bersama) agar dashboard tampil
-- populated seperti mockup. Hanya untuk DB lokal/preview.
\set TEN 'ten_Blfjz53nq3BXrH9EKEnY3S'

UPDATE wallets SET balance = 4820, updated_at = now() WHERE tenant_id = :'TEN';

-- Templates (6) — sesuai galeri mockup
DELETE FROM batches WHERE tenant_id = :'TEN';
DELETE FROM template_versions
  WHERE template_id IN (SELECT id FROM templates WHERE tenant_id = :'TEN');
DELETE FROM templates WHERE tenant_id = :'TEN';

INSERT INTO templates (id, tenant_id, name, current_version, category, created_at, updated_at) VALUES
 ('tpl_s1', :'TEN', 'Invoice Standar',        1, 'Keuangan',    now()-interval '40 days', now()-interval '2 days'),
 ('tpl_s2', :'TEN', 'Slip Gaji Bulanan',      1, 'HR',          now()-interval '38 days', now()-interval '5 hours'),
 ('tpl_s3', :'TEN', 'Sertifikat Pelatihan',   1, 'HR',          now()-interval '30 days', now()-interval '1 day'),
 ('tpl_s4', :'TEN', 'Kontrak Vendor',         1, 'Legal',       now()-interval '25 days', now()-interval '3 days'),
 ('tpl_s5', :'TEN', 'Surat Jalan',            1, 'Operasional', now()-interval '20 days', now()-interval '7 days'),
 ('tpl_s6', :'TEN', 'Surat Keterangan Kerja', 1, 'HR',          now()-interval '15 days', now()-interval '7 days');

INSERT INTO template_versions (id, template_id, version, engine, body, variable_schema, created_at) VALUES
 ('tver_s1', 'tpl_s1', 1, 'html', '<h1>Invoice {{number}}</h1><p>{{client}} — {{total}}</p>', '{}', now()-interval '40 days'),
 ('tver_s2', 'tpl_s2', 1, 'html', '<h1>Slip Gaji {{periode}}</h1><p>{{nama}} — {{gaji}}</p>', '{}', now()-interval '38 days'),
 ('tver_s3', 'tpl_s3', 1, 'html', '<h1>Sertifikat</h1><p>{{nama}} — {{pelatihan}}</p>', '{}', now()-interval '30 days'),
 ('tver_s4', 'tpl_s4', 1, 'html', '<h1>Kontrak {{nomor}}</h1><p>{{vendor}}</p>', '{}', now()-interval '25 days'),
 ('tver_s5', 'tpl_s5', 1, 'html', '<h1>Surat Jalan {{nomor}}</h1><p>{{tujuan}}</p>', '{}', now()-interval '20 days'),
 ('tver_s6', 'tpl_s6', 1, 'html', '<h1>Surat Keterangan</h1><p>{{nama}} — {{jabatan}}</p>', '{}', now()-interval '15 days');

-- Batches (6) — sesuai daftar mockup; completed-sum = 1284 (dokumen bln ini)
INSERT INTO batches (id, tenant_id, template_id, template_version, status, total, completed, failed, credits_reserved, created_at, completed_at, updated_at) VALUES
 ('bat_7K2p', :'TEN', 'tpl_s2', 1, 'processing',       312, 218, 0, 312, now()-interval '4 minutes', NULL,                      now()),
 ('bat_7K1m', :'TEN', 'tpl_s1', 1, 'completed',        148, 148, 0, 148, now()-interval '5 hours',   now()-interval '5 hours',  now()),
 ('bat_7K0z', :'TEN', 'tpl_s3', 1, 'completed',        540, 540, 0, 540, now()-interval '1 day',     now()-interval '1 day',    now()),
 ('bat_7Jyx', :'TEN', 'tpl_s5', 1, 'partially_failed', 100,  96, 4, 100, now()-interval '1 day',     now()-interval '1 day',    now()),
 ('bat_7Jw4', :'TEN', 'tpl_s4', 1, 'queued',            24,   0, 0,  24, now()-interval '2 minutes', NULL,                      now()),
 ('bat_7Hm2', :'TEN', 'tpl_s2', 1, 'completed',        282, 282, 0, 282, now()-interval '5 days',    now()-interval '5 days',   now());

-- Transaksi (sesuai kartu Transaksi & Riwayat mockup)
DELETE FROM wallet_transactions WHERE tenant_id = :'TEN';
INSERT INTO wallet_transactions (id, tenant_id, type, amount, balance_after, ref_type, ref_id, unit_price, metadata, created_at) VALUES
 ('wtx_s1', :'TEN', 'debit',  -312, 4820, 'document','bat_7K2p', 1, '{"template_name":"Slip gaji Juni","batch_total":312}', now()-interval '4 minutes'),
 ('wtx_s2', :'TEN', 'debit',    -1, 5132, 'document', 'doc_a91x', 1, '{"template_name":"Invoice","item_ref":"single"}',      now()-interval '22 minutes'),
 ('wtx_s3', :'TEN', 'topup',  5000, 5133, 'payment',  'pay_55kd', 1, '{"gateway":"kasugai","method":"QRIS","amount_idr":649000}', now()-interval '2 hours'),
 ('wtx_s4', :'TEN', 'debit',  -148,  133, 'document','bat_7K1m', 1, '{"template_name":"Invoice klien Q2","batch_total":148}', now()-interval '5 hours'),
 ('wtx_s5', :'TEN', 'refund',    3,  281, 'document','bat_7Jyx', 1, '{"reason":"3 dok gagal render"}',                       now()-interval '1 day'),
 ('wtx_s6', :'TEN', 'debit',  -540,  278, 'document','bat_7K0z', 1, '{"template_name":"Sertifikat pelatihan","batch_total":540}', now()-interval '1 day'),
 ('wtx_s7', :'TEN', 'topup', 20000,  818, 'payment',  'pay_4a0p', 1, '{"gateway":"kasugai","method":"Virtual Account BCA","amount_idr":2290000}', now()-interval '3 days'),
 ('wtx_s8', :'TEN', 'debit',   -96,  722, 'document','bat_7Jw1', 1, '{"template_name":"Surat jalan gudang","batch_total":100}', now()-interval '4 days');

SELECT 'seed done' AS status, (SELECT balance FROM wallets WHERE tenant_id=:'TEN') AS balance,
       (SELECT count(*) FROM templates WHERE tenant_id=:'TEN') AS templates,
       (SELECT count(*) FROM batches WHERE tenant_id=:'TEN') AS batches,
       (SELECT sum(completed) FROM batches WHERE tenant_id=:'TEN') AS docs;
