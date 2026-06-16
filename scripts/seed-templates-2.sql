-- 6 template premium tambahan untuk akun preview, lalu sinkron ke
-- default_templates (akun baru ikut dapat set premium). DB lokal/preview.
\set TEN 'ten_Blfjz53nq3BXrH9EKEnY3S'

INSERT INTO templates (id, tenant_id, name, current_version, category, created_at, updated_at) VALUES
 ('tpl_s7',  :'TEN', 'Kuitansi Pembayaran',         1, 'Keuangan',    now()-interval '12 days', now()-interval '6 hours'),
 ('tpl_s8',  :'TEN', 'Purchase Order',              1, 'Keuangan',    now()-interval '11 days', now()-interval '1 day'),
 ('tpl_s9',  :'TEN', 'Surat Penawaran Harga',       1, 'Marketing',   now()-interval '9 days',  now()-interval '2 days'),
 ('tpl_s10', :'TEN', 'Surat Tugas',                 1, 'Operasional', now()-interval '7 days',  now()-interval '3 days'),
 ('tpl_s11', :'TEN', 'Berita Acara Serah Terima',   1, 'Operasional', now()-interval '5 days',  now()-interval '1 day'),
 ('tpl_s12', :'TEN', 'Surat Peringatan (SP-1)',     1, 'HR',          now()-interval '3 days',  now()-interval '5 hours')
ON CONFLICT (id) DO NOTHING;

-- ── 7. Kuitansi Pembayaran ──────────────────────────────────────────
INSERT INTO template_versions (id, template_id, version, engine, body, variable_schema, created_at) VALUES
('tver_s7','tpl_s7',1,'html',$html$<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#16161d;font-size:13px;margin:0;padding:48px 54px}
  .box{border:2px solid #16161d;border-radius:16px;padding:32px 36px 28px;position:relative}
  .k{position:absolute;top:-11px;left:30px;background:#fff;padding:0 12px;font-size:11px;letter-spacing:4px;color:#6c5ce7;font-weight:800}
  .no{text-align:right;color:#8a8a99;font-size:12px;margin-bottom:6px}
  .row{display:flex;margin:13px 0;align-items:baseline}
  .row .l{width:160px;color:#8a8a99;font-size:12px}
  .row .v{flex:1;border-bottom:1px dotted #cdcdda;padding-bottom:3px;font-weight:600}
  .amt{display:inline-block;margin-top:20px;background:#16161d;color:#fff;font-weight:800;font-size:19px;padding:11px 24px;border-radius:11px;font-variant-numeric:tabular-nums}
  .sign{text-align:right;margin-top:24px;font-size:12px;color:#555}
  .sign .line{display:inline-block;margin-top:56px;border-top:1px solid #16161d;padding-top:5px;width:190px;text-align:center;font-weight:600;color:#16161d}
</style></head><body>
  <div class="box">
    <div class="k">KUITANSI</div>
    <div class="no">No. {{nomor}}</div>
    <div class="row"><div class="l">Telah terima dari</div><div class="v">{{nama_penerima}}</div></div>
    <div class="row"><div class="l">Untuk pembayaran</div><div class="v">{{keperluan}}</div></div>
    <span class="amt">{{nominal}}</span>
    <div class="sign">{{kota}}, {{tanggal}}<div class="line">{{nama_pengirim}}</div></div>
  </div>
</body></html>$html$,'{}',now());

-- ── 8. Purchase Order ───────────────────────────────────────────────
INSERT INTO template_versions (id, template_id, version, engine, body, variable_schema, created_at) VALUES
('tver_s8','tpl_s8',1,'html',$html$<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#16161d;font-size:12px;line-height:1.5;margin:0;padding:44px 52px}
  .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #16161d;padding-bottom:12px}
  .co{font-size:16px;font-weight:800}.co small{display:block;font-weight:400;color:#8a8a99;font-size:10.5px;margin-top:2px;max-width:220px}
  .tag h1{margin:0;font-size:22px;letter-spacing:2px;color:#6c5ce7;text-align:right}.tag .no{color:#8a8a99;font-size:11px;text-align:right;margin-top:3px}
  .to{margin:20px 0 14px}.lbl{font-size:9.5px;letter-spacing:1.5px;color:#a0a0ad;text-transform:uppercase;margin-bottom:3px}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th{text-align:left;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:#a0a0ad;border-bottom:2px solid #16161d;padding:8px 0}
  th.r,td.r{text-align:right;font-variant-numeric:tabular-nums}td{padding:10px 0;border-bottom:1px solid #ededf2}
  .sum{margin-left:auto;width:230px;margin-top:12px}.sum div{display:flex;justify-content:space-between;padding:5px 0}
  .sum .tot{border-top:2px solid #16161d;margin-top:6px;padding-top:9px;font-weight:800;font-size:15px;color:#6c5ce7}
  .terms{margin-top:24px;font-size:10.5px;color:#8a8a99;border-left:3px solid #6c5ce7;padding:8px 14px;background:#f6f5ff;border-radius:0 8px 8px 0}
</style></head><body>
  <div class="hd"><div class="co">{{nama_perusahaan}}<small>{{alamat_perusahaan}}</small></div>
    <div class="tag"><h1>PURCHASE ORDER</h1><div class="no">{{no_po}} · {{tanggal}}</div></div></div>
  <div class="to"><div class="lbl">Kepada (Supplier)</div><b>{{nama_penjual}}</b><div style="color:#8a8a99">{{alamat}}</div></div>
  <table><thead><tr><th>Deskripsi Barang/Jasa</th><th class="r">Qty</th><th class="r">Harga</th><th class="r">Jumlah</th></tr></thead>
    <tbody><tr><td>{{deskripsi}}</td><td class="r">{{jumlah}}</td><td class="r">{{harga}}</td><td class="r">{{subtotal}}</td></tr></tbody></table>
  <div class="sum"><div><span>Subtotal</span><span>{{subtotal}}</span></div><div><span>PPN 11%</span><span>{{pajak}}</span></div>
    <div class="tot"><span>Total</span><span>{{total}}</span></div></div>
  <div class="terms"><b>Syarat:</b> Pengiriman maksimal sesuai kesepakatan. Faktur wajib mencantumkan nomor PO ini. Pembayaran NET 30 hari setelah barang diterima.</div>
</body></html>$html$,'{}',now());

-- ── 9. Surat Penawaran Harga ────────────────────────────────────────
INSERT INTO template_versions (id, template_id, version, engine, body, variable_schema, created_at) VALUES
('tver_s9','tpl_s9',1,'html',$html$<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#16161d;font-size:12px;line-height:1.6;margin:0;padding:44px 54px}
  .lh{display:flex;align-items:center;gap:13px;border-bottom:3px solid #6c5ce7;padding-bottom:12px}
  .lh .logo{width:40px;height:40px;border-radius:9px;background:linear-gradient(135deg,#9b5de5,#f15bb5);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px}
  .lh .co{font-size:15px;font-weight:800}.lh .co small{display:block;font-weight:400;color:#8a8a99;font-size:10px}
  .meta{display:flex;justify-content:space-between;margin:18px 0 4px;font-size:11.5px}.meta .lbl{color:#8a8a99}
  h1{font-size:13px;letter-spacing:.5px;margin:16px 0 4px}
  p{margin:9px 0;text-align:justify}
  table{width:100%;border-collapse:collapse;margin:10px 0}
  th{text-align:left;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:#a0a0ad;border-bottom:2px solid #16161d;padding:7px 0}
  th.r,td.r{text-align:right;font-variant-numeric:tabular-nums}td{padding:9px 0;border-bottom:1px solid #ededf2}
  .tot{display:flex;justify-content:space-between;font-weight:800;color:#6c5ce7;border-top:2px solid #16161d;padding-top:9px;margin-top:4px;font-size:14px}
  .sign{margin-top:26px;width:220px;text-align:center;font-size:11.5px}.sign .line{margin-top:54px;border-top:1px solid #16161d;padding-top:5px;font-weight:600}
</style></head><body>
  <div class="lh"><div class="logo">{{nama_perusahaan}}</div><div class="co">{{nama_perusahaan}}<small>{{alamat_perusahaan}}</small></div></div>
  <div class="meta"><div><span class="lbl">Nomor:</span> {{nomor}}</div><div>{{kota}}, {{tanggal}}</div></div>
  <p>Kepada Yth. <b>{{nama_pembeli}}</b><br/>di {{kota}}</p>
  <h1>Perihal: {{perihal}}</h1>
  <p>Dengan hormat, bersama surat ini kami sampaikan penawaran harga untuk <b>{{deskripsi}}</b> dengan rincian sebagai berikut:</p>
  <table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Harga Satuan</th><th class="r">Total</th></tr></thead>
    <tbody><tr><td>{{deskripsi}}</td><td class="r">{{jumlah}}</td><td class="r">{{harga}}</td><td class="r">{{subtotal}}</td></tr></tbody></table>
  <div class="tot"><span>Total Penawaran</span><span>{{total}}</span></div>
  <p>Harga sudah termasuk PPN. Penawaran berlaku 14 hari. Kami siap mendiskusikan kebutuhan lebih lanjut. Atas perhatian Bapak/Ibu kami ucapkan terima kasih.</p>
  <div class="sign">Hormat kami,<div class="line">{{nama_pengirim}}</div></div>
</body></html>$html$,'{}',now());

-- ── 10. Surat Tugas ─────────────────────────────────────────────────
INSERT INTO template_versions (id, template_id, version, engine, body, variable_schema, created_at) VALUES
('tver_s10','tpl_s10',1,'html',$html$<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#16161d;font-size:12px;line-height:1.65;margin:0;padding:44px 56px}
  .lh{text-align:center;border-bottom:3px double #16161d;padding-bottom:10px}.lh .co{font-size:16px;font-weight:800}
  .lh small{color:#8a8a99;font-size:10px}
  .title{text-align:center;margin:20px 0 4px}.title h1{margin:0;font-size:14px;letter-spacing:1px;text-decoration:underline}.title .no{color:#8a8a99;font-size:11px}
  p{margin:10px 0;text-align:justify}
  .tbl{margin:12px 0 12px 8px}.tbl div{display:flex;margin:2px 0}.tbl span:first-child{width:120px;color:#8a8a99}
  .sign{margin-top:28px;width:230px;margin-left:auto;text-align:center;font-size:11.5px}.sign .line{margin-top:58px;border-top:1px solid #16161d;padding-top:5px;font-weight:700}
</style></head><body>
  <div class="lh"><div class="co">{{nama_perusahaan}}</div><small>{{alamat_perusahaan}}</small></div>
  <div class="title"><h1>SURAT TUGAS</h1><div class="no">Nomor: {{no_surat}}</div></div>
  <p>Yang bertanda tangan di bawah ini, pimpinan {{nama_perusahaan}}, dengan ini menugaskan:</p>
  <div class="tbl"><div><span>Nama</span><b>{{nama_karyawan}}</b></div><div><span>NIP</span><span>{{nip}}</span></div>
    <div><span>Jabatan</span><span>{{jabatan}}</span></div></div>
  <p>untuk melaksanakan <b>{{keperluan}}</b> di {{tujuan}}, terhitung sejak {{tanggal_mulai}} sampai dengan {{tanggal_selesai}}.</p>
  <p>Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.</p>
  <div class="sign">{{kota}}, {{tanggal}}<div class="line">{{nama_direktur}}</div></div>
</body></html>$html$,'{}',now());

-- ── 11. Berita Acara Serah Terima ───────────────────────────────────
INSERT INTO template_versions (id, template_id, version, engine, body, variable_schema, created_at) VALUES
('tver_s11','tpl_s11',1,'html',$html$<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#16161d;font-size:12px;line-height:1.65;margin:0;padding:44px 56px}
  .title{text-align:center;margin-bottom:4px}.title h1{margin:0;font-size:15px;letter-spacing:.5px}.title .no{color:#8a8a99;font-size:11px}
  hr{border:none;border-top:2px solid #16161d;margin:10px 0 16px}
  p{margin:9px 0;text-align:justify}
  .pihak{display:flex;gap:28px;margin:10px 0}.pihak div{flex:1}.pihak .lbl{font-size:9.5px;letter-spacing:1px;color:#a0a0ad;text-transform:uppercase}.pihak b{font-size:12px}
  table{width:100%;border-collapse:collapse;margin:8px 0}th{text-align:left;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:#a0a0ad;border-bottom:2px solid #16161d;padding:7px 0}
  th.c,td.c{text-align:center}td{padding:8px 0;border-bottom:1px solid #ededf2}
  .sign{display:flex;justify-content:space-between;margin-top:34px;text-align:center;font-size:11.5px}.sign .line{margin-top:56px;border-top:1px solid #16161d;padding-top:5px;font-weight:600;width:170px}
</style></head><body>
  <div class="title"><h1>BERITA ACARA SERAH TERIMA</h1><div class="no">Nomor: {{nomor}}</div></div><hr/>
  <p>Pada hari ini, {{tanggal}}, bertempat di {{kota}}, telah dilakukan serah terima antara:</p>
  <div class="pihak"><div><div class="lbl">Pihak yang Menyerahkan</div><b>{{nama_pengirim}}</b></div>
    <div><div class="lbl">Pihak yang Menerima</div><b>{{nama_penerima}}</b></div></div>
  <p>dengan rincian barang/dokumen sebagai berikut:</p>
  <table><thead><tr><th class="c">No</th><th>Uraian</th><th class="c">Jumlah</th><th>Keterangan</th></tr></thead>
    <tbody><tr><td class="c">1</td><td>{{deskripsi}}</td><td class="c">{{jumlah}}</td><td>{{keterangan}}</td></tr></tbody></table>
  <p>Barang/dokumen tersebut telah diserahterimakan dalam keadaan baik dan lengkap. Berita acara ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
  <div class="sign"><div><div>Yang Menyerahkan</div><div class="line">{{nama_pengirim}}</div></div>
    <div><div>Yang Menerima</div><div class="line">{{nama_penerima}}</div></div></div>
</body></html>$html$,'{}',now());

-- ── 12. Surat Peringatan (SP-1) ─────────────────────────────────────
INSERT INTO template_versions (id, template_id, version, engine, body, variable_schema, created_at) VALUES
('tver_s12','tpl_s12',1,'html',$html$<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#16161d;font-size:12px;line-height:1.65;margin:0;padding:44px 56px}
  .lh{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #c0392b;padding-bottom:10px}
  .co{font-size:15px;font-weight:800}.co small{display:block;font-weight:400;color:#8a8a99;font-size:10px}
  .badge{background:#c0392b;color:#fff;font-size:10px;font-weight:700;letter-spacing:1px;padding:6px 12px;border-radius:8px}
  .title{text-align:center;margin:20px 0 4px}.title h1{margin:0;font-size:14px;letter-spacing:1px}.title .no{color:#8a8a99;font-size:11px}
  p{margin:9px 0;text-align:justify}
  .tbl{margin:10px 0 10px 8px}.tbl div{display:flex;margin:2px 0}.tbl span:first-child{width:120px;color:#8a8a99}
  .warn{background:#fdecea;border-left:3px solid #c0392b;border-radius:0 8px 8px 0;padding:10px 14px;margin:12px 0}
  .sign{margin-top:26px;width:230px;margin-left:auto;text-align:center;font-size:11.5px}.sign .line{margin-top:56px;border-top:1px solid #16161d;padding-top:5px;font-weight:700}
</style></head><body>
  <div class="lh"><div class="co">{{nama_perusahaan}}<small>{{alamat_perusahaan}}</small></div><span class="badge">SP-1</span></div>
  <div class="title"><h1>SURAT PERINGATAN PERTAMA</h1><div class="no">Nomor: {{no_surat}}</div></div>
  <p>Manajemen {{nama_perusahaan}} dengan ini memberikan Surat Peringatan Pertama kepada:</p>
  <div class="tbl"><div><span>Nama</span><b>{{nama_karyawan}}</b></div><div><span>NIP</span><span>{{nip}}</span></div>
    <div><span>Jabatan</span><span>{{jabatan}}</span></div></div>
  <div class="warn"><b>Pelanggaran:</b> {{pelanggaran}}</div>
  <p>Sehubungan dengan hal tersebut, yang bersangkutan dikenakan <b>{{sanksi}}</b>. Diharapkan tidak mengulangi pelanggaran serupa; pelanggaran berikutnya dapat berakibat sanksi yang lebih berat sesuai peraturan perusahaan.</p>
  <div class="sign">{{kota}}, {{tanggal}}<div class="line">{{nama_hrd}}</div></div>
</body></html>$html$,'{}',now());

-- ── Sinkron default_templates dari set premium akun preview ──────────
DELETE FROM default_templates;
INSERT INTO default_templates (id, name, category, body, sort_order)
SELECT 'dft_' || substr(md5(t.id),1,22), t.name, t.category, tv.body,
       (row_number() OVER (ORDER BY t.created_at))::int
FROM templates t
JOIN template_versions tv ON tv.template_id = t.id AND tv.version = t.current_version
WHERE t.tenant_id = :'TEN';

SELECT (SELECT count(*) FROM templates WHERE tenant_id=:'TEN') AS preview_tpl,
       (SELECT count(*) FROM default_templates) AS defaults;
