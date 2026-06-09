-- Migration 0008: Tambah 12 template default perusahaan.
-- Idempoten: ON CONFLICT (id) DO NOTHING aman untuk re-run.

INSERT INTO default_templates (id, name, category, body, sort_order) VALUES

-- ── Keuangan ─────────────────────────────────────────────────────────────────

('dft_po01', 'Purchase Order', 'Keuangan', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Helvetica Neue",Arial,sans-serif;font-size:11px;color:#1b2a3a;line-height:1.5}
.page{padding:22mm 20mm}
.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}
.brand{font-size:15px;font-weight:700;color:#1a56db}
.brand small{display:block;font-size:9.5px;font-weight:400;color:#6b7785;margin-top:2px}
.title h1{font-size:22px;font-weight:700;color:#1a56db;letter-spacing:2px;text-transform:uppercase;text-align:right}
.title .num{color:#6b7785;font-size:10px;text-align:right;margin-top:2px}
.meta{display:flex;justify-content:space-between;margin-bottom:18px;gap:20px}
.meta-block .lbl{font-size:8.5px;text-transform:uppercase;letter-spacing:1px;color:#6b7785;margin-bottom:2px}
.meta-block .val{font-weight:600;font-size:11px}
.to{margin-bottom:16px;padding:10px 14px;background:#f5f7fa;border-left:3px solid #1a56db;border-radius:2px}
.to .lbl{font-size:8.5px;text-transform:uppercase;letter-spacing:1px;color:#6b7785;margin-bottom:2px}
.to .val{font-weight:600}
table{width:100%;border-collapse:collapse;margin-top:16px}
thead th{background:#1a56db;color:#fff;font-size:8.5px;text-transform:uppercase;letter-spacing:.5px;padding:8px 10px;text-align:left}
th.r,td.r{text-align:right}
tbody td{padding:8px 10px;border-bottom:1px solid #e3e8ee;vertical-align:top}
tbody tr:nth-child(even) td{background:#f8f9fc}
.totals{display:flex;justify-content:flex-end;margin-top:14px}
.totals table{width:250px;margin:0}
.totals td{padding:4px;border:none;font-size:11px}
.totals .grand td{border-top:2px solid #1b2a3a;font-weight:700;font-size:13px;color:#1a56db;padding-top:7px}
.terms{margin-top:18px;font-size:9.5px;color:#6b7785;border-top:1px solid #e3e8ee;padding-top:10px}
.sign{display:flex;justify-content:space-between;margin-top:28px}
.sign-col{width:44%;text-align:center}
.sign-line{border-top:1px solid #1b2a3a;margin-top:48px;padding-top:4px;font-weight:700;font-size:10px}
</style></head><body><div class="page">
<div class="top">
  <div class="brand">{{nama_perusahaan}}<small>{{alamat_perusahaan}}</small></div>
  <div class="title"><h1>Purchase Order</h1><div class="num">{{nomor_po}}</div></div>
</div>
<div class="meta">
  <div class="meta-block"><div class="lbl">Tanggal PO</div><div class="val">{{tanggal}}</div></div>
  <div class="meta-block"><div class="lbl">Tanggal Pengiriman</div><div class="val">{{tanggal_pengiriman}}</div></div>
  <div class="meta-block"><div class="lbl">Syarat Pembayaran</div><div class="val">{{syarat_pembayaran}}</div></div>
</div>
<div class="to">
  <div class="lbl">Kepada Vendor</div>
  <div class="val">{{nama_vendor}}</div>
  <div>{{alamat_vendor}}</div>
</div>
<table>
  <thead><tr><th style="width:32px">#</th><th>Deskripsi Barang / Jasa</th><th class="r" style="width:50px">Qty</th><th style="width:60px">Satuan</th><th class="r" style="width:90px">Harga Satuan</th><th class="r" style="width:100px">Total</th></tr></thead>
  <tbody>
    {{#each items}}
    <tr><td>{{@index}}</td><td>{{deskripsi}}</td><td class="r">{{qty}}</td><td>{{satuan}}</td><td class="r">{{harga_satuan}}</td><td class="r">{{total}}</td></tr>
    {{/each}}
  </tbody>
</table>
<div class="totals"><table>
  <tr><td>Subtotal</td><td class="r">{{subtotal}}</td></tr>
  <tr><td>PPN ({{persen_ppn}}%)</td><td class="r">{{ppn}}</td></tr>
  <tr class="grand"><td>Total PO</td><td class="r">{{total_po}}</td></tr>
</table></div>
<div class="terms">Catatan: {{catatan}}</div>
<div class="sign">
  <div class="sign-col">Disetujui oleh<div class="sign-line">{{nama_approver}}<br><small>{{jabatan_approver}}</small></div></div>
  <div class="sign-col">Diterima oleh<div class="sign-line">{{nama_vendor}}</div></div>
</div>
</div></body></html>', 70),

('dft_slip_gaji01', 'Slip Gaji', 'Keuangan', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A5;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Helvetica Neue",Arial,sans-serif;font-size:11px;color:#1b2a3a;line-height:1.5}
.page{padding:14mm 16mm}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #1a56db}
.brand{font-size:14px;font-weight:700;color:#1a56db}
.brand small{display:block;font-size:9px;font-weight:400;color:#6b7785;margin-top:1px}
.period{text-align:right;font-size:10px;color:#6b7785}
.period strong{display:block;font-size:12px;color:#1b2a3a;font-weight:700}
.emp{display:flex;gap:16px;margin-bottom:14px;padding:8px 10px;background:#f5f7fa;border-radius:4px}
.emp-item .lbl{font-size:8px;text-transform:uppercase;letter-spacing:.8px;color:#6b7785}
.emp-item .val{font-weight:600;font-size:11px}
.section{margin-bottom:10px}
.section-title{font-size:8.5px;text-transform:uppercase;letter-spacing:1px;color:#6b7785;font-weight:700;margin-bottom:4px;padding-bottom:2px;border-bottom:1px solid #e3e8ee}
.row{display:flex;justify-content:space-between;padding:2.5px 0}
.row .lbl{color:#4a5568}
.row .val{font-weight:600;text-align:right}
.row.plus .val{color:#16a34a}
.row.minus .val{color:#dc2626}
.divider{border-top:1px dashed #cbd5e0;margin:6px 0}
.total-row{display:flex;justify-content:space-between;padding:6px 10px;background:#1a56db;color:#fff;border-radius:4px;margin-top:8px}
.total-row .lbl{font-weight:600}
.total-row .val{font-size:14px;font-weight:700}
.note{margin-top:10px;font-size:9px;color:#6b7785;border-top:1px solid #e3e8ee;padding-top:6px}
</style></head><body><div class="page">
<div class="header">
  <div class="brand">{{nama_perusahaan}}<small>{{alamat_perusahaan}}</small></div>
  <div class="period"><div>Periode Gaji</div><strong>{{periode}}</strong></div>
</div>
<div class="emp">
  <div class="emp-item"><div class="lbl">Nama</div><div class="val">{{nama_karyawan}}</div></div>
  <div class="emp-item"><div class="lbl">Jabatan</div><div class="val">{{jabatan}}</div></div>
  <div class="emp-item"><div class="lbl">Departemen</div><div class="val">{{departemen}}</div></div>
  <div class="emp-item"><div class="lbl">ID Karyawan</div><div class="val">{{id_karyawan}}</div></div>
</div>
<div class="section">
  <div class="section-title">Pendapatan</div>
  <div class="row plus"><span class="lbl">Gaji Pokok</span><span class="val">{{gaji_pokok}}</span></div>
  <div class="row plus"><span class="lbl">Tunjangan Jabatan</span><span class="val">{{tunjangan_jabatan}}</span></div>
  <div class="row plus"><span class="lbl">Tunjangan Transport</span><span class="val">{{tunjangan_transport}}</span></div>
  {{#if tunjangan_lain}}<div class="row plus"><span class="lbl">Tunjangan Lain</span><span class="val">{{tunjangan_lain}}</span></div>{{/if}}
  {{#if bonus}}<div class="row plus"><span class="lbl">Bonus</span><span class="val">{{bonus}}</span></div>{{/if}}
</div>
<div class="section">
  <div class="section-title">Potongan</div>
  <div class="row minus"><span class="lbl">BPJS Kesehatan</span><span class="val">{{potongan_bpjs_kes}}</span></div>
  <div class="row minus"><span class="lbl">BPJS Ketenagakerjaan</span><span class="val">{{potongan_bpjs_tk}}</span></div>
  {{#if potongan_pph}}<div class="row minus"><span class="lbl">PPh 21</span><span class="val">{{potongan_pph}}</span></div>{{/if}}
  {{#if potongan_lain}}<div class="row minus"><span class="lbl">Potongan Lain</span><span class="val">{{potongan_lain}}</span></div>{{/if}}
</div>
<div class="total-row"><span class="lbl">Gaji Bersih (Take Home Pay)</span><span class="val">{{gaji_bersih}}</span></div>
<div class="note">Slip gaji ini dicetak secara otomatis dan sah tanpa tanda tangan. Periode: {{periode}}.</div>
</div></body></html>', 80),

-- ── HR ───────────────────────────────────────────────────────────────────────

('dft_penawaran_kerja01', 'Surat Penawaran Kerja', 'HR', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#000;line-height:1.6}
.page{padding:25mm 30mm}
.kop{padding-bottom:10px;border-bottom:3px double #000;margin-bottom:20px}
.instansi{font-size:15pt;font-weight:700;text-transform:uppercase}
.alamat{font-size:9pt;color:#444}
.nomor{margin-bottom:12px}
.perihal{margin-bottom:18px}
.perihal table td{padding:1px 0;vertical-align:top}
.perihal td.lbl{width:90px;font-weight:600}
.isi p{margin-bottom:10px;text-indent:40px;text-align:justify}
.detail{margin:14px 0}
.detail table{width:100%;border-collapse:collapse}
.detail td{padding:5px 8px;border:1px solid #ccc;font-size:11pt;vertical-align:top}
.detail td.lbl{background:#f5f5f5;font-weight:600;width:38%}
.ttd{margin-top:32px;display:flex;flex-direction:column}
.ttd-inner{margin-left:auto;text-align:center;width:200px}
.ttd-nama{font-weight:700;border-top:1px solid #000;margin-top:56px;padding-top:4px}
</style></head><body><div class="page">
<div class="kop">
  <div class="instansi">{{nama_perusahaan}}</div>
  <div class="alamat">{{alamat_perusahaan}}</div>
</div>
<div class="nomor">Nomor : {{nomor_surat}}</div>
<div class="perihal">
  <table>
    <tr><td class="lbl">Hal</td><td>: Penawaran Kerja</td></tr>
    <tr><td class="lbl">Kepada Yth.</td><td>: {{nama_kandidat}}</td></tr>
    <tr><td class="lbl">Di</td><td>: {{alamat_kandidat}}</td></tr>
  </table>
</div>
<div class="isi">
  <p>Dengan hormat,</p>
  <p>Setelah melalui proses seleksi, kami dengan senang hati menawarkan posisi kepada Saudara/i <strong>{{nama_kandidat}}</strong> untuk bergabung bersama <strong>{{nama_perusahaan}}</strong> dengan rincian sebagai berikut:</p>
</div>
<div class="detail">
  <table>
    <tr><td class="lbl">Posisi</td><td>{{posisi}}</td></tr>
    <tr><td class="lbl">Departemen</td><td>{{departemen}}</td></tr>
    <tr><td class="lbl">Tanggal Mulai Kerja</td><td>{{tanggal_mulai}}</td></tr>
    <tr><td class="lbl">Gaji Pokok</td><td>{{gaji_pokok}}</td></tr>
    <tr><td class="lbl">Fasilitas</td><td>{{fasilitas}}</td></tr>
    <tr><td class="lbl">Status Kepegawaian</td><td>{{status_kepegawaian}}</td></tr>
  </table>
</div>
<div class="isi">
  <p>Penawaran ini berlaku selama <strong>{{masa_berlaku}}</strong> sejak surat ini diterima. Kami memohon konfirmasi penerimaan Saudara/i paling lambat pada tanggal tersebut.</p>
  <p>Demikian penawaran ini kami sampaikan. Kami berharap dapat bekerja sama dengan Saudara/i.</p>
</div>
<div class="ttd">
  <div class="ttd-inner">
    {{kota}}, {{tanggal}}<br>Hormat Kami,
    <div class="ttd-nama">{{nama_penanda_tangan}}<br><small>{{jabatan_penanda_tangan}}</small></div>
  </div>
</div>
</div></body></html>', 90),

('dft_skt_kerja01', 'Surat Keterangan Kerja', 'HR', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#000;line-height:1.6}
.page{padding:25mm 30mm}
.kop{padding-bottom:10px;border-bottom:3px double #000;margin-bottom:20px}
.instansi{font-size:15pt;font-weight:700;text-transform:uppercase}
.alamat{font-size:9pt;color:#444}
.judul{text-align:center;font-size:14pt;font-weight:700;text-transform:uppercase;text-decoration:underline;margin-bottom:8px}
.nomor{text-align:center;margin-bottom:20px;font-size:11pt}
.isi p{margin-bottom:10px;text-indent:40px;text-align:justify}
.data{margin:16px 0}
.data table{width:100%;border-collapse:collapse}
.data td{padding:3px 0;vertical-align:top}
.data td.lbl{width:200px;font-weight:600}
.ttd{margin-top:36px;display:flex;flex-direction:column}
.ttd-inner{margin-left:auto;text-align:center;width:200px}
.ttd-nama{font-weight:700;border-top:1px solid #000;margin-top:56px;padding-top:4px}
</style></head><body><div class="page">
<div class="kop">
  <div class="instansi">{{nama_perusahaan}}</div>
  <div class="alamat">{{alamat_perusahaan}}</div>
</div>
<div class="judul">Surat Keterangan Kerja</div>
<div class="nomor">No: {{nomor_surat}}</div>
<div class="isi">
  <p>Yang bertanda tangan di bawah ini, <strong>{{nama_penanda_tangan}}</strong>, selaku <strong>{{jabatan_penanda_tangan}}</strong> pada <strong>{{nama_perusahaan}}</strong>, dengan ini menerangkan bahwa:</p>
</div>
<div class="data">
  <table>
    <tr><td class="lbl">Nama</td><td>: <strong>{{nama_karyawan}}</strong></td></tr>
    <tr><td class="lbl">Jabatan</td><td>: {{jabatan_karyawan}}</td></tr>
    <tr><td class="lbl">Departemen</td><td>: {{departemen}}</td></tr>
    <tr><td class="lbl">Tanggal Bergabung</td><td>: {{tanggal_bergabung}}</td></tr>
    <tr><td class="lbl">Status Karyawan</td><td>: {{status_karyawan}}</td></tr>
    <tr><td class="lbl">Nomor KTP</td><td>: {{nomor_ktp}}</td></tr>
  </table>
</div>
<div class="isi">
  <p>Adalah benar karyawan pada perusahaan kami dan sampai saat ini masih aktif bekerja dengan baik. Surat keterangan ini dibuat untuk keperluan <strong>{{keperluan}}</strong>.</p>
  <p>Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
</div>
<div class="ttd">
  <div class="ttd-inner">
    {{kota}}, {{tanggal}}
    <div class="ttd-nama">{{nama_penanda_tangan}}<br><small>{{jabatan_penanda_tangan}}</small></div>
  </div>
</div>
</div></body></html>', 100),

('dft_sp1_01', 'Surat Peringatan SP-1', 'HR', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#000;line-height:1.6}
.page{padding:25mm 30mm}
.kop{padding-bottom:10px;border-bottom:3px double #000;margin-bottom:20px}
.instansi{font-size:15pt;font-weight:700;text-transform:uppercase}
.alamat{font-size:9pt;color:#444}
.judul{text-align:center;font-size:14pt;font-weight:700;text-transform:uppercase;text-decoration:underline;margin-bottom:8px}
.nomor{margin-bottom:14px;font-size:11pt}
.kepada{margin-bottom:16px}
.kepada table td{padding:1px 0;vertical-align:top}
.kepada td.lbl{width:130px;font-weight:600}
.isi p{margin-bottom:10px;text-indent:40px;text-align:justify}
.pelanggaran{margin:14px 0;padding:12px 14px;border:1px solid #ccc;background:#fafafa}
.pelanggaran p{text-indent:0;margin-bottom:5px}
.ttd{margin-top:32px}
.ttd-row{display:flex;justify-content:space-between}
.ttd-col{width:44%;text-align:center}
.ttd-line{border-top:1px solid #000;margin-top:56px;padding-top:4px;font-weight:700}
</style></head><body><div class="page">
<div class="kop">
  <div class="instansi">{{nama_perusahaan}}</div>
  <div class="alamat">{{alamat_perusahaan}}</div>
</div>
<div class="judul">Surat Peringatan Pertama (SP-1)</div>
<div class="nomor">No: {{nomor_surat}}</div>
<div class="kepada">
  <table>
    <tr><td class="lbl">Kepada Yth.</td><td>: <strong>{{nama_karyawan}}</strong></td></tr>
    <tr><td class="lbl">Jabatan</td><td>: {{jabatan_karyawan}}</td></tr>
    <tr><td class="lbl">Departemen</td><td>: {{departemen}}</td></tr>
  </table>
</div>
<div class="isi">
  <p>Dengan hormat,</p>
  <p>Sehubungan dengan pelanggaran yang telah dilakukan, dengan ini kami memberikan Surat Peringatan Pertama (SP-1) kepada Saudara/i <strong>{{nama_karyawan}}</strong>.</p>
</div>
<div class="pelanggaran">
  <p><strong>Uraian Pelanggaran:</strong> {{uraian_pelanggaran}}</p>
  <p><strong>Tanggal Kejadian:</strong> {{tanggal_pelanggaran}}</p>
  <p><strong>Pasal yang Dilanggar:</strong> {{pasal_dilanggar}}</p>
</div>
<div class="isi">
  <p>Kami berharap Saudara/i dapat memperbaiki sikap dan kinerja sesuai peraturan perusahaan. Apabila pelanggaran serupa terulang, maka akan diberikan Surat Peringatan Kedua (SP-2).</p>
  <p>Surat peringatan ini berlaku selama <strong>{{masa_berlaku}}</strong> sejak tanggal diterbitkan.</p>
</div>
<div class="ttd">
  <div class="ttd-row">
    <div class="ttd-col">{{kota}}, {{tanggal}}<br>HRD Manager<div class="ttd-line">{{nama_hrd}}</div></div>
    <div class="ttd-col">Mengetahui,<br>Karyawan Bersangkutan<div class="ttd-line">{{nama_karyawan}}</div></div>
  </div>
</div>
</div></body></html>', 110),

('dft_kontrak_kerja01', 'Kontrak Kerja Karyawan', 'HR', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:11.5pt;color:#000;line-height:1.7}
.page{padding:22mm 28mm}
.judul{text-align:center;margin-bottom:16px}
.judul h1{font-size:14pt;font-weight:700;text-transform:uppercase;text-decoration:underline}
.judul .nomor{font-size:11pt;margin-top:4px}
.intro{text-indent:30px;text-align:justify;margin-bottom:12px}
.pihak{margin:14px 0}
.pihak table{width:100%;border-collapse:collapse}
.pihak td{padding:3px 0;vertical-align:top}
.pihak td.lbl{width:170px;font-weight:600}
.pasal{margin-top:16px}
.pasal h2{font-size:12pt;font-weight:700;text-align:center;margin-bottom:6px}
.pasal p{text-indent:30px;margin-bottom:8px;text-align:justify}
.pasal ul{margin-left:40px;margin-bottom:8px}
.pasal li{margin-bottom:3px}
.ttd-row{display:flex;justify-content:space-between;margin-top:32px;text-align:center}
.ttd-col{width:46%}
.ttd-line{border-top:1px solid #000;margin-top:52px;padding-top:4px;font-weight:700}
</style></head><body><div class="page">
<div class="judul">
  <h1>Perjanjian Kerja Waktu Tidak Tertentu (PKWTT)</h1>
  <div class="nomor">Nomor: {{nomor_kontrak}}</div>
</div>
<p class="intro">Pada hari ini <strong>{{hari}}</strong>, tanggal <strong>{{tanggal}}</strong>, bertempat di <strong>{{tempat}}</strong>, telah dibuat dan disepakati Perjanjian Kerja antara:</p>
<div class="pihak">
  <table>
    <tr><td class="lbl">Nama Perusahaan</td><td>: <strong>{{nama_perusahaan}}</strong></td></tr>
    <tr><td class="lbl">Diwakili oleh</td><td>: {{nama_pimpinan}}</td></tr>
    <tr><td class="lbl">Jabatan</td><td>: {{jabatan_pimpinan}}</td></tr>
    <tr><td class="lbl">Selanjutnya disebut</td><td>: <strong>PENGUSAHA</strong></td></tr>
  </table>
  <p style="text-indent:0;margin:8px 0">dan</p>
  <table>
    <tr><td class="lbl">Nama Karyawan</td><td>: <strong>{{nama_karyawan}}</strong></td></tr>
    <tr><td class="lbl">Tempat, Tgl Lahir</td><td>: {{tempat_lahir}}, {{tanggal_lahir}}</td></tr>
    <tr><td class="lbl">Nomor KTP</td><td>: {{nomor_ktp}}</td></tr>
    <tr><td class="lbl">Alamat</td><td>: {{alamat_karyawan}}</td></tr>
    <tr><td class="lbl">Selanjutnya disebut</td><td>: <strong>KARYAWAN</strong></td></tr>
  </table>
</div>
<div class="pasal"><h2>Pasal 1 — Jabatan dan Penempatan</h2>
<p>Karyawan diterima bekerja pada posisi <strong>{{posisi}}</strong> di Departemen <strong>{{departemen}}</strong>, terhitung mulai tanggal <strong>{{tanggal_mulai}}</strong>.</p></div>
<div class="pasal"><h2>Pasal 2 — Kompensasi</h2>
<p>Pengusaha memberikan gaji pokok sebesar <strong>{{gaji_pokok}}</strong> per bulan beserta tunjangan sesuai kebijakan perusahaan yang berlaku.</p></div>
<div class="pasal"><h2>Pasal 3 — Kewajiban Karyawan</h2>
<p>Karyawan wajib melaksanakan tugas sesuai jabatannya, mematuhi peraturan perusahaan, menjaga kerahasiaan informasi perusahaan, serta tidak bekerja untuk perusahaan pesaing selama masa perjanjian berlaku.</p></div>
<div class="pasal"><h2>Pasal 4 — Ketentuan Lain</h2>
<p>{{ketentuan_lain}}</p></div>
<div class="ttd-row">
  <div class="ttd-col">PENGUSAHA<div class="ttd-line">{{nama_pimpinan}}<br><small>{{jabatan_pimpinan}}</small></div></div>
  <div class="ttd-col">KARYAWAN<div class="ttd-line">{{nama_karyawan}}</div></div>
</div>
</div></body></html>', 120),

('dft_referensi_karyawan01', 'Surat Referensi Karyawan', 'HR', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#000;line-height:1.6}
.page{padding:25mm 30mm}
.kop{padding-bottom:10px;border-bottom:3px double #000;margin-bottom:22px}
.instansi{font-size:15pt;font-weight:700;text-transform:uppercase}
.alamat{font-size:9pt;color:#444}
.judul{text-align:center;font-size:14pt;font-weight:700;text-transform:uppercase;text-decoration:underline;margin-bottom:6px}
.nomor{text-align:center;margin-bottom:20px;font-size:11pt}
.isi p{margin-bottom:10px;text-indent:40px;text-align:justify}
.data{margin:16px 0;padding:12px 14px;border:1px solid #ccc;background:#fafafa}
.data table{width:100%;border-collapse:collapse}
.data td{padding:3px 0;vertical-align:top}
.data td.lbl{width:190px;font-weight:600}
.ttd{margin-top:32px;display:flex;flex-direction:column}
.ttd-inner{margin-left:auto;text-align:center;width:200px}
.ttd-nama{font-weight:700;border-top:1px solid #000;margin-top:56px;padding-top:4px}
</style></head><body><div class="page">
<div class="kop">
  <div class="instansi">{{nama_perusahaan}}</div>
  <div class="alamat">{{alamat_perusahaan}}</div>
</div>
<div class="judul">Surat Referensi Karyawan</div>
<div class="nomor">No: {{nomor_surat}}</div>
<div class="isi">
  <p>Yang bertanda tangan di bawah ini menerangkan bahwa karyawan dengan data berikut pernah bekerja di perusahaan kami:</p>
</div>
<div class="data">
  <table>
    <tr><td class="lbl">Nama</td><td>: <strong>{{nama_karyawan}}</strong></td></tr>
    <tr><td class="lbl">Jabatan Terakhir</td><td>: {{jabatan_terakhir}}</td></tr>
    <tr><td class="lbl">Departemen</td><td>: {{departemen}}</td></tr>
    <tr><td class="lbl">Periode Kerja</td><td>: {{tanggal_mulai}} s/d {{tanggal_selesai}}</td></tr>
    <tr><td class="lbl">Alasan Keluar</td><td>: {{alasan_keluar}}</td></tr>
  </table>
</div>
<div class="isi">
  <p>Selama bekerja di perusahaan kami, yang bersangkutan menunjukkan kinerja dan perilaku yang <strong>{{penilaian_kinerja}}</strong>. Kami merekomendasikan yang bersangkutan untuk bergabung di perusahaan Bapak/Ibu.</p>
  <p>Demikian surat referensi ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
</div>
<div class="ttd">
  <div class="ttd-inner">
    {{kota}}, {{tanggal}}
    <div class="ttd-nama">{{nama_penanda_tangan}}<br><small>{{jabatan_penanda_tangan}}</small></div>
  </div>
</div>
</div></body></html>', 130),

-- ── Legal ─────────────────────────────────────────────────────────────────────

('dft_nda01', 'Non-Disclosure Agreement (NDA)', 'Legal', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:11.5pt;color:#000;line-height:1.7}
.page{padding:22mm 28mm}
.judul{text-align:center;margin-bottom:20px}
.judul h1{font-size:14pt;font-weight:700;text-transform:uppercase;text-decoration:underline}
.judul .nomor{font-size:11pt;margin-top:4px}
.intro{text-indent:30px;text-align:justify;margin-bottom:12px}
.pihak{margin:12px 0}
.pihak table{width:100%;border-collapse:collapse}
.pihak td{padding:3px 0;vertical-align:top}
.pihak td.lbl{width:170px;font-weight:600}
.pasal{margin-top:16px}
.pasal h2{font-size:12pt;font-weight:700;text-align:center;margin-bottom:6px}
.pasal p{text-indent:30px;margin-bottom:8px;text-align:justify}
.ttd-row{display:flex;justify-content:space-between;margin-top:32px;text-align:center}
.ttd-col{width:46%}
.ttd-line{border-top:1px solid #000;margin-top:52px;padding-top:4px;font-weight:700}
</style></head><body><div class="page">
<div class="judul">
  <h1>Perjanjian Kerahasiaan (NDA)</h1>
  <div class="nomor">Nomor: {{nomor_perjanjian}}</div>
</div>
<p class="intro">Pada hari ini <strong>{{hari}}</strong>, tanggal <strong>{{tanggal}}</strong>, bertempat di <strong>{{tempat}}</strong>, telah disepakati Perjanjian Kerahasiaan (Non-Disclosure Agreement) oleh dan antara:</p>
<div class="pihak">
  <table>
    <tr><td class="lbl">Nama / Perusahaan</td><td>: <strong>{{pihak_pertama}}</strong></td></tr>
    <tr><td class="lbl">Diwakili oleh</td><td>: {{wakil_pertama}}, {{jabatan_pertama}}</td></tr>
    <tr><td class="lbl">Selanjutnya disebut</td><td>: <strong>PIHAK PERTAMA (Pemilik Informasi)</strong></td></tr>
  </table>
  <p style="text-indent:0;margin:8px 0">dan</p>
  <table>
    <tr><td class="lbl">Nama / Perusahaan</td><td>: <strong>{{pihak_kedua}}</strong></td></tr>
    <tr><td class="lbl">Diwakili oleh</td><td>: {{wakil_kedua}}, {{jabatan_kedua}}</td></tr>
    <tr><td class="lbl">Selanjutnya disebut</td><td>: <strong>PIHAK KEDUA (Penerima Informasi)</strong></td></tr>
  </table>
</div>
<div class="pasal"><h2>Pasal 1 — Definisi Informasi Rahasia</h2>
<p>Informasi Rahasia mencakup seluruh data, dokumen, formula, proses, strategi bisnis, daftar pelanggan, dan informasi lain yang disampaikan PIHAK PERTAMA kepada PIHAK KEDUA baik secara lisan maupun tulisan, yang ditandai atau dinyatakan bersifat rahasia.</p></div>
<div class="pasal"><h2>Pasal 2 — Kewajiban Kerahasiaan</h2>
<p>PIHAK KEDUA berkomitmen untuk: (a) menjaga Informasi Rahasia dengan tingkat kehati-hatian yang sama seperti menjaga informasinya sendiri; (b) tidak mengungkapkan Informasi Rahasia kepada pihak ketiga tanpa persetujuan tertulis PIHAK PERTAMA; (c) hanya menggunakan Informasi Rahasia untuk tujuan yang disepakati dalam perjanjian ini.</p></div>
<div class="pasal"><h2>Pasal 3 — Jangka Waktu</h2>
<p>Perjanjian ini berlaku selama <strong>{{jangka_waktu}}</strong> terhitung sejak tanggal penandatanganan. Kewajiban kerahasiaan tetap berlaku meskipun perjanjian telah berakhir.</p></div>
<div class="pasal"><h2>Pasal 4 — Sanksi</h2>
<p>Pelanggaran terhadap perjanjian ini dapat mengakibatkan tuntutan hukum dan ganti rugi sesuai ketentuan perundang-undangan yang berlaku di Republik Indonesia.</p></div>
<div class="ttd-row">
  <div class="ttd-col">PIHAK PERTAMA<div class="ttd-line">{{wakil_pertama}}<br><small>{{jabatan_pertama}}</small></div></div>
  <div class="ttd-col">PIHAK KEDUA<div class="ttd-line">{{wakil_kedua}}<br><small>{{jabatan_kedua}}</small></div></div>
</div>
</div></body></html>', 140),

('dft_surat_kuasa01', 'Surat Kuasa', 'Legal', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#000;line-height:1.6}
.page{padding:25mm 30mm}
.kop{padding-bottom:10px;border-bottom:3px double #000;margin-bottom:20px}
.instansi{font-size:15pt;font-weight:700;text-transform:uppercase}
.alamat{font-size:9pt;color:#444}
.judul{text-align:center;font-size:16pt;font-weight:700;text-transform:uppercase;text-decoration:underline;margin-bottom:20px}
.isi p{margin-bottom:10px;text-indent:40px;text-align:justify}
.pemberi{margin:16px 0}
.pemberi table td{padding:3px 0;vertical-align:top}
.pemberi td.lbl{width:170px;font-weight:600}
.penerima{margin:16px 0;padding:12px 14px;border:1px solid #ccc;background:#fafafa}
.penerima table td{padding:3px 0;vertical-align:top}
.penerima td.lbl{width:170px;font-weight:600}
.kuasa-box{margin:16px 0;padding:12px 14px;border:2px solid #000;text-align:center;font-weight:700}
.ttd-row{display:flex;justify-content:space-between;margin-top:32px;text-align:center}
.ttd-col{width:44%}
.ttd-line{border-top:1px solid #000;margin-top:56px;padding-top:4px;font-weight:700}
.materai{width:70px;height:70px;border:1px dashed #999;display:flex;align-items:center;justify-content:center;font-size:9px;color:#999;margin:0 auto 8px;text-align:center;line-height:1.3}
</style></head><body><div class="page">
<div class="kop">
  <div class="instansi">{{nama_perusahaan}}</div>
  <div class="alamat">{{alamat_perusahaan}}</div>
</div>
<div class="judul">Surat Kuasa</div>
<div class="isi"><p>Yang bertanda tangan di bawah ini:</p></div>
<div class="pemberi">
  <table>
    <tr><td class="lbl">Nama</td><td>: <strong>{{nama_pemberi_kuasa}}</strong></td></tr>
    <tr><td class="lbl">Jabatan</td><td>: {{jabatan_pemberi_kuasa}}</td></tr>
    <tr><td class="lbl">Perusahaan</td><td>: {{nama_perusahaan}}</td></tr>
  </table>
</div>
<div class="isi"><p>Dengan ini memberikan kuasa kepada:</p></div>
<div class="penerima">
  <table>
    <tr><td class="lbl">Nama</td><td>: <strong>{{nama_penerima_kuasa}}</strong></td></tr>
    <tr><td class="lbl">Jabatan</td><td>: {{jabatan_penerima_kuasa}}</td></tr>
    <tr><td class="lbl">Nomor KTP</td><td>: {{ktp_penerima_kuasa}}</td></tr>
  </table>
</div>
<div class="kuasa-box">Untuk keperluan: {{keperluan_kuasa}}</div>
<div class="isi">
  <p>Demikian surat kuasa ini dibuat untuk dipergunakan sebagaimana mestinya dan tidak dapat dipindahtangankan kepada pihak lain tanpa persetujuan pemberi kuasa.</p>
</div>
<div class="ttd-row">
  <div class="ttd-col">Penerima Kuasa<div class="ttd-line">{{nama_penerima_kuasa}}</div></div>
  <div class="ttd-col">{{kota}}, {{tanggal}}<br>Pemberi Kuasa<div class="materai">Materai<br>Rp 10.000</div><div class="ttd-line">{{nama_pemberi_kuasa}}</div></div>
</div>
</div></body></html>', 150),

-- ── Operasional ───────────────────────────────────────────────────────────────

('dft_surat_tugas01', 'Surat Tugas', 'Operasional', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#000;line-height:1.6}
.page{padding:25mm 30mm}
.kop{padding-bottom:10px;border-bottom:3px double #000;margin-bottom:20px}
.instansi{font-size:15pt;font-weight:700;text-transform:uppercase}
.alamat{font-size:9pt;color:#444}
.judul{text-align:center;font-size:14pt;font-weight:700;text-transform:uppercase;text-decoration:underline;margin-bottom:6px}
.nomor{margin-bottom:18px;font-size:11pt}
.isi p{margin-bottom:10px;text-indent:40px;text-align:justify}
.detail{margin:14px 0}
.detail table{width:100%;border-collapse:collapse}
.detail td{padding:4px 8px;border:1px solid #ccc;font-size:11pt;vertical-align:top}
.detail td.lbl{background:#f5f5f5;font-weight:600;width:36%}
.ttd{margin-top:32px;display:flex;flex-direction:column}
.ttd-inner{margin-left:auto;text-align:center;width:200px}
.ttd-nama{font-weight:700;border-top:1px solid #000;margin-top:56px;padding-top:4px}
</style></head><body><div class="page">
<div class="kop">
  <div class="instansi">{{nama_perusahaan}}</div>
  <div class="alamat">{{alamat_perusahaan}}</div>
</div>
<div class="judul">Surat Tugas</div>
<div class="nomor">No: {{nomor_surat}}</div>
<div class="isi">
  <p>Dengan hormat,</p>
  <p>Yang bertanda tangan di bawah ini, <strong>{{nama_penanda_tangan}}</strong> selaku <strong>{{jabatan_penanda_tangan}}</strong> pada <strong>{{nama_perusahaan}}</strong>, dengan ini menugaskan:</p>
</div>
<div class="detail">
  <table>
    <tr><td class="lbl">Nama</td><td>{{nama_karyawan}}</td></tr>
    <tr><td class="lbl">Jabatan</td><td>{{jabatan_karyawan}}</td></tr>
    <tr><td class="lbl">Departemen</td><td>{{departemen}}</td></tr>
    <tr><td class="lbl">Tujuan Penugasan</td><td>{{tujuan_penugasan}}</td></tr>
    <tr><td class="lbl">Lokasi</td><td>{{lokasi}}</td></tr>
    <tr><td class="lbl">Tanggal Pelaksanaan</td><td>{{tanggal_mulai}} s/d {{tanggal_selesai}}</td></tr>
  </table>
</div>
<div class="isi">
  <p>Untuk melaksanakan tugas tersebut dengan sebaik-baiknya dan melaporkan hasilnya kepada pimpinan setibanya di tempat tujuan.</p>
  <p>Demikian surat tugas ini dibuat untuk dapat dilaksanakan dengan penuh tanggung jawab.</p>
</div>
<div class="ttd">
  <div class="ttd-inner">
    {{kota}}, {{tanggal}}
    <div class="ttd-nama">{{nama_penanda_tangan}}<br><small>{{jabatan_penanda_tangan}}</small></div>
  </div>
</div>
</div></body></html>', 160),

('dft_laporan_dinas01', 'Laporan Perjalanan Dinas', 'Operasional', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Helvetica Neue",Arial,sans-serif;font-size:11px;color:#1b2a3a;line-height:1.5}
.page{padding:22mm 20mm}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid #1b2a3a}
.brand{font-size:14px;font-weight:700;color:#1b2a3a}
.brand small{display:block;font-size:9px;font-weight:400;color:#6b7785;margin-top:1px}
.doc-title{text-align:right}
.doc-title h1{font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
.doc-title .num{font-size:9.5px;color:#6b7785;margin-top:2px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
.info-item{padding:8px 10px;background:#f5f7fa;border-radius:4px}
.info-item .lbl{font-size:8px;text-transform:uppercase;letter-spacing:.8px;color:#6b7785;margin-bottom:2px}
.info-item .val{font-weight:600}
.section{margin-bottom:14px}
.section-title{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#fff;font-weight:700;padding:4px 10px;background:#1b2a3a;border-radius:3px;margin-bottom:8px;display:inline-block}
.section p{text-align:justify;font-size:11px}
table.biaya{width:100%;border-collapse:collapse}
table.biaya thead th{background:#e8edf2;font-size:8.5px;text-transform:uppercase;letter-spacing:.5px;padding:6px 8px;text-align:left;border-bottom:2px solid #1b2a3a}
table.biaya td{padding:6px 8px;border-bottom:1px solid #e3e8ee;font-size:11px}
table.biaya td.r{text-align:right}
table.biaya .total td{font-weight:700;border-top:2px solid #1b2a3a;background:#f5f7fa}
.sign{display:flex;justify-content:space-between;margin-top:24px}
.sign-col{width:44%;text-align:center}
.sign-line{border-top:1px solid #1b2a3a;margin-top:48px;padding-top:4px;font-weight:700;font-size:10px}
</style></head><body><div class="page">
<div class="header">
  <div class="brand">{{nama_perusahaan}}<small>{{alamat_perusahaan}}</small></div>
  <div class="doc-title"><h1>Laporan Perjalanan Dinas</h1><div class="num">{{nomor_laporan}}</div></div>
</div>
<div class="info-grid">
  <div class="info-item"><div class="lbl">Nama Pegawai</div><div class="val">{{nama_karyawan}}</div></div>
  <div class="info-item"><div class="lbl">Jabatan</div><div class="val">{{jabatan_karyawan}}</div></div>
  <div class="info-item"><div class="lbl">Tujuan</div><div class="val">{{tujuan}}</div></div>
  <div class="info-item"><div class="lbl">Periode</div><div class="val">{{tanggal_mulai}} s/d {{tanggal_selesai}}</div></div>
</div>
<div class="section">
  <div class="section-title">Tujuan Perjalanan</div>
  <p>{{tujuan_perjalanan}}</p>
</div>
<div class="section">
  <div class="section-title">Hasil dan Kegiatan</div>
  <p>{{hasil_kegiatan}}</p>
</div>
<div class="section">
  <div class="section-title">Rekapitulasi Biaya</div>
  <table class="biaya">
    <thead><tr><th>Keterangan</th><th class="r">Jumlah</th></tr></thead>
    <tbody>
      <tr><td>Transportasi</td><td class="r">{{biaya_transportasi}}</td></tr>
      <tr><td>Akomodasi</td><td class="r">{{biaya_akomodasi}}</td></tr>
      <tr><td>Uang Harian</td><td class="r">{{uang_harian}}</td></tr>
      {{#if biaya_lain}}<tr><td>Biaya Lain-lain</td><td class="r">{{biaya_lain}}</td></tr>{{/if}}
    </tbody>
    <tfoot><tr class="total"><td>Total Biaya</td><td class="r">{{total_biaya}}</td></tr></tfoot>
  </table>
</div>
<div class="sign">
  <div class="sign-col">{{kota}}, {{tanggal}}<br>Pelaksana<div class="sign-line">{{nama_karyawan}}</div></div>
  <div class="sign-col">Mengetahui<br>Atasan Langsung<div class="sign-line">{{nama_atasan}}<br><small>{{jabatan_atasan}}</small></div></div>
</div>
</div></body></html>', 170),

-- ── Marketing ─────────────────────────────────────────────────────────────────

('dft_penawaran_harga01', 'Surat Penawaran Harga', 'Marketing', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Helvetica Neue",Arial,sans-serif;font-size:11px;color:#1b2a3a;line-height:1.5}
.page{padding:22mm 20mm}
.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
.brand{font-size:15px;font-weight:700;color:#7c3aed}
.brand small{display:block;font-size:9px;font-weight:400;color:#6b7785;margin-top:2px}
.title h1{font-size:20px;font-weight:700;color:#7c3aed;letter-spacing:1.5px;text-transform:uppercase;text-align:right}
.title .num{color:#6b7785;font-size:9.5px;text-align:right;margin-top:2px}
.to-box{margin-bottom:16px;padding:10px 14px;background:#f5f3ff;border-left:3px solid #7c3aed;border-radius:2px}
.to-box .lbl{font-size:8.5px;text-transform:uppercase;letter-spacing:1px;color:#6b7785;margin-bottom:2px}
.to-box .val{font-weight:600}
.intro{margin-bottom:14px;font-size:11px;text-align:justify;line-height:1.6}
table{width:100%;border-collapse:collapse;margin-top:12px}
thead th{background:#7c3aed;color:#fff;font-size:8.5px;text-transform:uppercase;letter-spacing:.5px;padding:8px 10px;text-align:left}
th.r,td.r{text-align:right}
tbody td{padding:8px 10px;border-bottom:1px solid #e3e8ee;vertical-align:top}
tbody tr:nth-child(even) td{background:#f9f7ff}
.totals{display:flex;justify-content:flex-end;margin-top:12px}
.totals table{width:250px;margin:0}
.totals td{padding:4px;border:none;font-size:11px}
.totals .grand td{border-top:2px solid #1b2a3a;font-weight:700;font-size:13px;color:#7c3aed;padding-top:7px}
.validity{margin-top:14px;padding:10px 12px;background:#f5f3ff;border-radius:4px;font-size:10.5px}
.sign{margin-top:24px;display:flex;flex-direction:column}
.sign-inner{margin-left:auto;text-align:center;width:200px}
.sign-line{border-top:1px solid #1b2a3a;margin-top:48px;padding-top:4px;font-weight:700;font-size:10px}
</style></head><body><div class="page">
<div class="top">
  <div class="brand">{{nama_perusahaan}}<small>{{alamat_perusahaan}}</small></div>
  <div class="title"><h1>Penawaran Harga</h1><div class="num">{{nomor_penawaran}}</div></div>
</div>
<div class="to-box">
  <div class="lbl">Kepada Yth.</div>
  <div class="val">{{nama_klien}}</div>
  <div>{{jabatan_klien}} &mdash; {{perusahaan_klien}}</div>
</div>
<div class="intro">Dengan hormat, menanggapi permintaan Bapak/Ibu, bersama ini kami sampaikan penawaran harga untuk <strong>{{nama_produk_jasa}}</strong> dengan rincian sebagai berikut:</div>
<table>
  <thead><tr><th style="width:32px">#</th><th>Deskripsi</th><th class="r" style="width:50px">Qty</th><th style="width:60px">Satuan</th><th class="r" style="width:90px">Harga</th><th class="r" style="width:100px">Total</th></tr></thead>
  <tbody>
    {{#each items}}
    <tr><td>{{@index}}</td><td>{{deskripsi}}</td><td class="r">{{qty}}</td><td>{{satuan}}</td><td class="r">{{harga}}</td><td class="r">{{total}}</td></tr>
    {{/each}}
  </tbody>
</table>
<div class="totals"><table>
  <tr><td>Subtotal</td><td class="r">{{subtotal}}</td></tr>
  <tr><td>PPN ({{persen_ppn}}%)</td><td class="r">{{ppn}}</td></tr>
  <tr class="grand"><td>Total Penawaran</td><td class="r">{{total_penawaran}}</td></tr>
</table></div>
<div class="validity">Penawaran ini berlaku hingga <strong>{{masa_berlaku}}</strong>. Syarat pembayaran: <strong>{{syarat_pembayaran}}</strong>. Untuk informasi lebih lanjut, hubungi kami di {{kontak}}.</div>
<div class="sign">
  <div class="sign-inner">
    {{kota}}, {{tanggal}}<br>Hormat Kami,
    <div class="sign-line">{{nama_penanda_tangan}}<br><small>{{jabatan_penanda_tangan}}</small></div>
  </div>
</div>
</div></body></html>', 180)

ON CONFLICT (id) DO NOTHING;
