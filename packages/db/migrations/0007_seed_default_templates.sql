-- Migration 0007: Seed default_templates dengan konten nyata.
-- Migration 0005 bergantung pada tenant "QA Tester" yang tidak ada di produksi
-- sehingga tabel default_templates kosong. Migration ini meng-INSERT langsung.
-- Idempoten: ON CONFLICT (id) DO NOTHING aman untuk re-run.

INSERT INTO default_templates (id, name, category, body, sort_order) VALUES

-- ── Keuangan ─────────────────────────────────────────────────────────────────

('dft_invoice01', 'Invoice', 'Keuangan', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Helvetica Neue",Arial,sans-serif;font-size:11px;color:#1b2a3a;line-height:1.5}
.page{padding:24mm 20mm}
.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
.brand{font-size:16px;font-weight:700;color:#14635c}
.brand small{display:block;font-size:10px;font-weight:400;color:#6b7785;margin-top:2px}
.title{text-align:right}
.title h1{font-size:22px;font-weight:700;color:#14635c;letter-spacing:2px;text-transform:uppercase}
.title .num{color:#6b7785;font-size:10px;margin-top:2px}
.parties{display:flex;justify-content:space-between;gap:24px;margin-bottom:20px}
.block .lbl{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#6b7785;margin-bottom:3px}
.block .val{font-weight:600}
.dates{text-align:right}
.dates div{margin-bottom:3px}
table{width:100%;border-collapse:collapse;margin-top:20px}
thead th{background:#14635c;color:#fff;font-size:9px;text-transform:uppercase;letter-spacing:.5px;padding:8px 10px;text-align:left}
th.r,td.r{text-align:right}
tbody td{padding:9px 10px;border-bottom:1px solid #e3e8ee;vertical-align:top}
tbody tr:nth-child(even) td{background:#f6f8f9}
.totals{display:flex;justify-content:flex-end;margin-top:16px}
.totals table{width:260px;margin:0}
.totals td{padding:5px 4px;border:none;font-size:11px}
.totals .grand td{border-top:2px solid #1b2a3a;font-weight:700;font-size:13px;color:#14635c;padding-top:8px}
.note{margin-top:20px;font-size:10px;color:#6b7785;border-top:1px solid #e3e8ee;padding-top:10px}
</style></head><body><div class="page">
<div class="top">
  <div class="brand">{{nama_perusahaan}}<small>{{alamat_perusahaan}}</small></div>
  <div class="title"><h1>Invoice</h1><div class="num">{{nomor_invoice}}</div></div>
</div>
<div class="parties">
  <div class="block">
    <div class="lbl">Ditagihkan kepada</div>
    <div class="val">{{nama_klien}}</div>
    <div>{{alamat_klien}}</div>
  </div>
  <div class="block dates">
    <div><span class="lbl">Tanggal</span><br><span class="val">{{tanggal}}</span></div>
    <div><span class="lbl">Jatuh Tempo</span><br><span class="val">{{jatuh_tempo}}</span></div>
  </div>
</div>
<table>
  <thead><tr><th style="width:36px">#</th><th>Deskripsi</th><th class="r" style="width:56px">Qty</th><th class="r" style="width:100px">Harga Satuan</th><th class="r" style="width:110px">Jumlah</th></tr></thead>
  <tbody>
    {{#each items}}
    <tr><td>{{@index}}</td><td>{{deskripsi}}</td><td class="r">{{qty}}</td><td class="r">{{harga_satuan}}</td><td class="r">{{jumlah}}</td></tr>
    {{/each}}
  </tbody>
</table>
<div class="totals"><table>
  <tr><td>Subtotal</td><td class="r">{{subtotal}}</td></tr>
  <tr><td>PPN ({{persen_ppn}}%)</td><td class="r">{{ppn}}</td></tr>
  <tr class="grand"><td>Total</td><td class="r">{{total}}</td></tr>
</table></div>
{{#if catatan}}<div class="note">{{catatan}}</div>{{/if}}
</div></body></html>', 10),

('dft_kwitansi01', 'Kwitansi', 'Keuangan', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A5 landscape;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Helvetica Neue",Arial,sans-serif;font-size:12px;color:#1b2a3a}
.page{padding:16mm 20mm}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.brand{font-size:15px;font-weight:700;color:#14635c}
.judul{font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#14635c}
.nomor{font-size:10px;color:#6b7785;margin-top:2px}
table{width:100%;border-collapse:collapse;margin:16px 0}
td{padding:6px 8px;vertical-align:top}
td.lbl{width:36%;font-weight:600;color:#6b7785;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
.jumlah{font-size:18px;font-weight:700;color:#14635c;padding:12px;background:#f0faf8;border-radius:8px;text-align:center;margin:14px 0}
.terbilang{font-style:italic;font-size:11px;color:#6b7785;margin-bottom:14px}
.ttd{display:flex;justify-content:flex-end;margin-top:20px;text-align:center}
.ttd-box{width:160px}
.ttd-line{border-top:1px solid #1b2a3a;margin-top:48px;padding-top:4px;font-size:10px}
</style></head><body><div class="page">
<div class="header">
  <div class="brand">{{nama_perusahaan}}</div>
  <div style="text-align:right"><div class="judul">Kwitansi</div><div class="nomor">No. {{nomor}}</div></div>
</div>
<table>
  <tr><td class="lbl">Tanggal</td><td>: {{tanggal}}</td></tr>
  <tr><td class="lbl">Diterima dari</td><td>: {{diterima_dari}}</td></tr>
  <tr><td class="lbl">Untuk pembayaran</td><td>: {{untuk}}</td></tr>
</table>
<div class="jumlah">{{jumlah}}</div>
<div class="terbilang">Terbilang: {{terbilang}}</div>
<div class="ttd"><div class="ttd-box">{{kota}}, {{tanggal}}<div class="ttd-line">{{nama_penerima}}</div></div></div>
</div></body></html>', 20),

-- ── HR ───────────────────────────────────────────────────────────────────────

('dft_surat_resmi01', 'Surat Resmi', 'HR', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#000;line-height:1.6}
.page{padding:25mm 30mm}
.kop{display:flex;gap:16px;align-items:center;padding-bottom:10px;border-bottom:3px double #000;margin-bottom:20px}
.kop-text .instansi{font-size:15pt;font-weight:700;text-transform:uppercase}
.kop-text .alamat{font-size:9pt;color:#444}
.nomor{margin-bottom:16px;font-size:11pt}
.perihal{margin-bottom:20px}
.perihal table td{padding:1px 0;vertical-align:top}
.perihal td.lbl{width:90px;font-weight:600}
.isi{text-align:justify;margin-bottom:24px}
.isi p{margin-bottom:10px;text-indent:40px}
.ttd{margin-top:36px;display:flex;flex-direction:column}
.ttd-inner{margin-left:auto;text-align:center;width:200px}
.ttd-nama{font-weight:700;border-top:1px solid #000;margin-top:56px;padding-top:4px}
.ttd-nip{font-size:10pt}
</style></head><body><div class="page">
<div class="kop">
  <div class="kop-text">
    <div class="instansi">{{nama_instansi}}</div>
    <div class="alamat">{{alamat_instansi}}</div>
  </div>
</div>
<div class="nomor">Nomor&nbsp;&nbsp;: {{nomor_surat}}</div>
<div class="perihal">
  <table>
    <tr><td class="lbl">Perihal</td><td>: {{perihal}}</td></tr>
    <tr><td class="lbl">Kepada Yth.</td><td>: {{kepada}}</td></tr>
    {{#if jabatan_penerima}}<tr><td class="lbl">Jabatan</td><td>: {{jabatan_penerima}}</td></tr>{{/if}}
    <tr><td class="lbl">Di</td><td>: {{tempat_penerima}}</td></tr>
  </table>
</div>
<div class="isi">
  <p>Dengan hormat,</p>
  {{{isi_surat}}}
  <p>Demikian surat ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.</p>
</div>
<div class="ttd">
  <div class="ttd-inner">
    <div>{{kota}}, {{tanggal}}</div>
    <div class="ttd-nama">{{nama_penanda_tangan}}</div>
    <div class="ttd-nip">{{jabatan_penanda_tangan}}</div>
  </div>
</div>
</div></body></html>', 30),

('dft_sk_karyawan01', 'Surat Keputusan Karyawan', 'HR', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#000;line-height:1.6}
.page{padding:25mm 28mm}
.judul{text-align:center;margin-bottom:20px}
.judul h1{font-size:14pt;font-weight:700;text-transform:uppercase;text-decoration:underline}
.judul .nomor{font-size:11pt;margin-top:4px}
.tentang{text-align:center;font-weight:700;margin-bottom:16px;font-size:12pt}
.menimbang{margin-bottom:12px}
.menimbang .lbl{font-weight:600;margin-bottom:4px}
.menimbang table td{padding:2px 0;vertical-align:top}
.menimbang td.huruf{width:28px}
table.data{width:100%;border-collapse:collapse;margin:14px 0}
table.data td{padding:5px 8px;border:1px solid #999;font-size:11pt}
table.data td.lbl{background:#f0f0f0;font-weight:600;width:38%}
.berlaku{margin:14px 0;font-size:11pt}
.ttd{margin-top:30px;text-align:center}
.ttd-nama{font-weight:700;border-top:1px solid #000;margin-top:56px;padding-top:4px;display:inline-block;min-width:180px}
</style></head><body><div class="page">
<div class="judul">
  <h1>Surat Keputusan</h1>
  <div class="nomor">Nomor: {{nomor_sk}}</div>
</div>
<div class="tentang">Tentang: {{tentang}}</div>
<div class="menimbang">
  <div class="lbl">Menimbang:</div>
  <p>Bahwa berdasarkan pertimbangan dan evaluasi kinerja, dipandang perlu untuk menetapkan keputusan berikut.</p>
</div>
<p style="font-weight:600;margin:14px 0">Memutuskan:</p>
<table class="data">
  <tr><td class="lbl">Nama Karyawan</td><td>{{nama_karyawan}}</td></tr>
  <tr><td class="lbl">Jabatan</td><td>{{jabatan}}</td></tr>
  <tr><td class="lbl">Departemen</td><td>{{departemen}}</td></tr>
  <tr><td class="lbl">Terhitung Mulai</td><td>{{tanggal_berlaku}}</td></tr>
  {{#if gaji}}<tr><td class="lbl">Gaji Pokok</td><td>{{gaji}}</td></tr>{{/if}}
</table>
<div class="berlaku">Keputusan ini berlaku sejak tanggal {{tanggal_berlaku}} dan dapat ditinjau kembali sesuai kebutuhan organisasi.</div>
<div class="ttd">
  <div>{{kota}}, {{tanggal}}</div>
  <div class="ttd-nama">{{nama_pemimpin}}<br><small>{{jabatan_pemimpin}}</small></div>
</div>
</div></body></html>', 40),

-- ── Legal ─────────────────────────────────────────────────────────────────────

('dft_perjanjian01', 'Perjanjian Kerja Sama', 'Legal', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:11.5pt;color:#000;line-height:1.7}
.page{padding:25mm 28mm}
.judul{text-align:center;margin-bottom:24px}
.judul h1{font-size:14pt;font-weight:700;text-transform:uppercase;text-decoration:underline}
.judul .nomor{margin-top:4px;font-size:11pt}
.pasal{margin-top:20px}
.pasal h2{font-size:12pt;font-weight:700;text-align:center;margin-bottom:8px}
.pasal p{text-indent:30px;margin-bottom:8px;text-align:justify}
.pihak{margin:16px 0}
.pihak table{width:100%;border-collapse:collapse}
.pihak td{padding:4px 0;vertical-align:top}
.pihak td.lbl{width:180px;font-weight:600}
.ttd-row{display:flex;justify-content:space-between;margin-top:36px;text-align:center}
.ttd-col{width:46%}
.ttd-line{border-top:1px solid #000;margin-top:56px;padding-top:4px;font-weight:700}
</style></head><body><div class="page">
<div class="judul">
  <h1>Perjanjian Kerja Sama</h1>
  <div class="nomor">Nomor: {{nomor_perjanjian}}</div>
</div>
<p style="text-indent:30px">Pada hari ini <strong>{{hari}}</strong>, tanggal <strong>{{tanggal}}</strong>, bertempat di <strong>{{tempat}}</strong>, telah disepakati Perjanjian Kerja Sama oleh dan antara:</p>
<div class="pihak">
  <table>
    <tr><td class="lbl">Nama / Instansi</td><td>: <strong>{{pihak_pertama}}</strong></td></tr>
    <tr><td class="lbl">Diwakili oleh</td><td>: {{wakil_pertama}}</td></tr>
    <tr><td class="lbl">Jabatan</td><td>: {{jabatan_pertama}}</td></tr>
    <tr><td class="lbl">Selanjutnya disebut</td><td>: <strong>PIHAK PERTAMA</strong></td></tr>
  </table>
  <p style="text-indent:0;margin:8px 0">dan</p>
  <table>
    <tr><td class="lbl">Nama / Instansi</td><td>: <strong>{{pihak_kedua}}</strong></td></tr>
    <tr><td class="lbl">Diwakili oleh</td><td>: {{wakil_kedua}}</td></tr>
    <tr><td class="lbl">Jabatan</td><td>: {{jabatan_kedua}}</td></tr>
    <tr><td class="lbl">Selanjutnya disebut</td><td>: <strong>PIHAK KEDUA</strong></td></tr>
  </table>
</div>
<div class="pasal"><h2>Pasal 1 — Ruang Lingkup</h2>
<p>{{ruang_lingkup}}</p></div>
<div class="pasal"><h2>Pasal 2 — Jangka Waktu</h2>
<p>Perjanjian ini berlaku selama <strong>{{jangka_waktu}}</strong> terhitung sejak tanggal penandatanganan.</p></div>
<div class="pasal"><h2>Pasal 3 — Ketentuan Lain</h2>
<p>{{ketentuan_lain}}</p></div>
<div class="ttd-row">
  <div class="ttd-col">PIHAK PERTAMA<div class="ttd-line">{{wakil_pertama}}</div></div>
  <div class="ttd-col">PIHAK KEDUA<div class="ttd-line">{{wakil_kedua}}</div></div>
</div>
</div></body></html>', 50),

-- ── Operasional ───────────────────────────────────────────────────────────────

('dft_berita_acara01', 'Berita Acara', 'Operasional', '<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#000;line-height:1.6}
.page{padding:25mm 28mm}
.judul{text-align:center;margin-bottom:20px}
.judul h1{font-size:14pt;font-weight:700;text-transform:uppercase}
.judul p{font-size:11pt}
.info{margin-bottom:16px}
.info table{width:100%;border-collapse:collapse}
.info td{padding:3px 0;vertical-align:top}
.info td.lbl{width:180px;font-weight:600}
.isi{text-align:justify;margin:16px 0}
.isi p{margin-bottom:10px;text-indent:30px}
.saksi{margin-top:30px}
.saksi h3{font-weight:700;margin-bottom:12px}
.saksi-row{display:flex;justify-content:space-between}
.saksi-col{width:44%;text-align:center}
.saksi-line{border-top:1px solid #000;margin-top:52px;padding-top:4px;font-weight:600}
</style></head><body><div class="page">
<div class="judul">
  <h1>Berita Acara</h1>
  <p>{{judul_kegiatan}}</p>
</div>
<div class="info"><table>
  <tr><td class="lbl">Hari / Tanggal</td><td>: {{hari_tanggal}}</td></tr>
  <tr><td class="lbl">Waktu</td><td>: {{waktu}}</td></tr>
  <tr><td class="lbl">Tempat</td><td>: {{tempat}}</td></tr>
  <tr><td class="lbl">Peserta</td><td>: {{jumlah_peserta}} orang</td></tr>
</table></div>
<div class="isi">
  <p>Pada hari ini telah dilaksanakan <strong>{{judul_kegiatan}}</strong> dengan hasil sebagai berikut:</p>
  {{{isi_kegiatan}}}
  <p>Demikian berita acara ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.</p>
</div>
<div class="saksi">
  <h3>Mengetahui,</h3>
  <div class="saksi-row">
    <div class="saksi-col">{{peran_pertama}}<div class="saksi-line">{{nama_pertama}}</div></div>
    <div class="saksi-col">{{peran_kedua}}<div class="saksi-line">{{nama_kedua}}</div></div>
  </div>
</div>
</div></body></html>', 60)

ON CONFLICT (id) DO NOTHING;
