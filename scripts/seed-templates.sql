-- Konten HTML premium untuk 6 template akun preview (PT Maju Bersama).
-- Dollar-quoted ($html$) agar aman dari escaping. Hanya DB lokal/preview.

-- ── 1. Slip Gaji Bulanan (tpl_s2) — sesuai mockup ───────────────────
UPDATE template_versions SET body = $html$<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#16161d;font-size:12px;line-height:1.55;margin:0;padding:44px 52px}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #16161d;padding-bottom:14px}
  .co{font-size:18px;font-weight:800;letter-spacing:-.2px}
  .sub{color:#8a8a99;font-size:11px;margin-top:2px}
  .doc{text-align:right;font-size:11px;color:#8a8a99}
  .doc b{display:block;color:#16161d;font-size:13px;letter-spacing:2px;font-weight:700}
  .emp{display:flex;justify-content:space-between;margin:18px 0 22px}
  .emp .name{font-weight:700;font-size:13px}
  .emp .meta{color:#8a8a99;font-size:11px;margin-top:1px}
  table{width:100%;border-collapse:collapse}
  td{padding:9px 0;border-bottom:1px solid #ededf2}
  td.amt{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .neg{color:#c0392b}
  .net{display:flex;justify-content:space-between;align-items:center;background:#16161d;color:#fff;border-radius:10px;padding:16px 20px;margin-top:18px}
  .net .lbl{font-size:12px;letter-spacing:.3px;opacity:.85}
  .net .val{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums}
  .foot{margin-top:30px;color:#aaaab5;font-size:10px;text-align:center}
</style></head><body>
  <div class="top">
    <div><div class="co">{{nama_perusahaan}}</div><div class="sub">Slip Gaji · {{periode}}</div></div>
    <div class="doc"><b>SLIP GAJI</b>Rahasia &amp; Pribadi</div>
  </div>
  <div class="emp">
    <div><div class="name">{{nama_karyawan}}</div><div class="meta">{{jabatan}}</div></div>
    <div style="text-align:right"><div class="meta">NIP</div><div class="name" style="font-size:12px">{{nip}}</div></div>
  </div>
  <table>
    <tr><td>Gaji pokok</td><td class="amt">{{gaji_pokok}}</td></tr>
    <tr><td>Tunjangan</td><td class="amt">{{tunjangan}}</td></tr>
    <tr><td>Potongan</td><td class="amt neg">- {{potongan}}</td></tr>
  </table>
  <div class="net"><span class="lbl">Gaji bersih (take-home pay)</span><span class="val">{{gaji_bersih}}</span></div>
  <div class="foot">Dokumen ini dihasilkan otomatis dan sah tanpa tanda tangan basah · {{nama_perusahaan}}</div>
</body></html>$html$
WHERE template_id = 'tpl_s2' AND version = 1;

-- ── 2. Invoice Standar (tpl_s1) ─────────────────────────────────────
UPDATE template_versions SET body = $html$<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#16161d;font-size:12px;line-height:1.5;margin:0;padding:44px 52px}
  .hd{display:flex;justify-content:space-between;align-items:flex-start}
  .co{font-size:16px;font-weight:800}
  .co small{display:block;font-weight:400;color:#8a8a99;font-size:10.5px;margin-top:3px;max-width:200px}
  .tag{text-align:right}
  .tag h1{margin:0;font-size:26px;letter-spacing:3px;color:#6c5ce7;font-weight:800}
  .tag .no{color:#8a8a99;font-size:11px;margin-top:4px}
  .parties{display:flex;justify-content:space-between;margin:26px 0 18px;gap:24px}
  .parties .lbl{font-size:9.5px;letter-spacing:1.5px;color:#a0a0ad;text-transform:uppercase;margin-bottom:4px}
  .parties b{font-size:12.5px}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th{text-align:left;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:#a0a0ad;border-bottom:2px solid #16161d;padding:8px 0}
  th.r,td.r{text-align:right;font-variant-numeric:tabular-nums}
  td{padding:10px 0;border-bottom:1px solid #ededf2}
  .sum{margin-left:auto;width:240px;margin-top:14px}
  .sum div{display:flex;justify-content:space-between;padding:5px 0}
  .sum .tot{border-top:2px solid #16161d;margin-top:6px;padding-top:10px;font-weight:800;font-size:15px;color:#6c5ce7}
  .pay{margin-top:26px;background:#f6f5ff;border-left:3px solid #6c5ce7;padding:12px 16px;border-radius:0 8px 8px 0;font-size:11px}
</style></head><body>
  <div class="hd">
    <div class="co">{{nama_perusahaan}}<small>{{alamat_perusahaan}}</small></div>
    <div class="tag"><h1>INVOICE</h1><div class="no">{{nomor}} · {{tanggal}}</div></div>
  </div>
  <div class="parties">
    <div><div class="lbl">Ditagihkan kepada</div><b>{{nama_pembeli}}</b><div style="color:#8a8a99;margin-top:2px">{{alamat}}</div></div>
    <div style="text-align:right"><div class="lbl">Jatuh tempo</div><b>{{tanggal_selesai}}</b></div>
  </div>
  <table>
    <thead><tr><th>Deskripsi</th><th class="r">Qty</th><th class="r">Harga</th><th class="r">Jumlah</th></tr></thead>
    <tbody>
      <tr><td>{{deskripsi}}</td><td class="r">{{jumlah}}</td><td class="r">{{harga}}</td><td class="r">{{subtotal}}</td></tr>
    </tbody>
  </table>
  <div class="sum">
    <div><span>Subtotal</span><span>{{subtotal}}</span></div>
    <div><span>PPN 11%</span><span>{{pajak}}</span></div>
    <div class="tot"><span>Total</span><span>{{total}}</span></div>
  </div>
  <div class="pay"><b>Pembayaran</b> — Transfer ke BCA 123-456-7890 a.n. {{nama_perusahaan}}. Cantumkan nomor invoice pada berita transfer.</div>
</body></html>$html$
WHERE template_id = 'tpl_s1' AND version = 1;

-- ── 3. Sertifikat Pelatihan (tpl_s3) ────────────────────────────────
UPDATE template_versions SET body = $html$<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:Georgia,'Times New Roman',serif;color:#16161d;margin:0;padding:0}
  .frame{margin:24px;border:2px solid #c9a24b;padding:4px}
  .inner{border:1px solid #c9a24b;padding:54px 60px;text-align:center}
  .k{font-family:'Helvetica Neue',Arial,sans-serif;letter-spacing:6px;font-size:11px;color:#c9a24b;text-transform:uppercase}
  h1{font-size:38px;margin:10px 0 4px;letter-spacing:2px}
  .by{font-size:12px;color:#8a8a99;font-family:'Helvetica Neue',Arial,sans-serif}
  .name{font-size:30px;margin:30px 0 6px;color:#6c5ce7;border-bottom:1px solid #e6e1d2;display:inline-block;padding:0 30px 8px}
  .desc{font-size:13px;max-width:460px;margin:18px auto 0;line-height:1.7;color:#444}
  .desc b{color:#16161d}
  .sign{display:flex;justify-content:space-between;margin:54px 70px 0;font-family:'Helvetica Neue',Arial,sans-serif}
  .sign .c{text-align:center;font-size:11px}
  .sign .line{border-top:1px solid #16161d;padding-top:6px;width:170px}
  .sign b{display:block}
</style></head><body>
  <div class="frame"><div class="inner">
    <div class="k">{{nama_perusahaan}}</div>
    <h1>SERTIFIKAT</h1>
    <div class="by">Diberikan dengan bangga kepada</div>
    <div class="name">{{nama}}</div>
    <div class="desc">atas keberhasilan menyelesaikan program <b>{{pelatihan}}</b> yang diselenggarakan pada {{tanggal}}, dengan dedikasi dan hasil yang <b>{{kinerja}}</b>.</div>
    <div class="sign">
      <div class="c"><div class="line"><b>{{nama_direktur}}</b>Direktur</div></div>
      <div class="c"><div class="line"><b>{{nama_hrd}}</b>Kepala Pelatihan</div></div>
    </div>
  </div></div>
</body></html>$html$
WHERE template_id = 'tpl_s3' AND version = 1;

-- ── 4. Kontrak Vendor (tpl_s4) ──────────────────────────────────────
UPDATE template_versions SET body = $html$<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#16161d;font-size:11.5px;line-height:1.6;margin:0;padding:44px 56px}
  .ttl{text-align:center;border-bottom:2px solid #16161d;padding-bottom:12px}
  .ttl h1{margin:0;font-size:16px;letter-spacing:1px}
  .ttl .no{color:#8a8a99;font-size:11px;margin-top:3px}
  p{margin:10px 0}
  .pasal{font-weight:700;margin:16px 0 4px;font-size:11.5px}
  .pihak{display:flex;gap:30px;margin:14px 0}
  .pihak div{flex:1}
  .pihak .lbl{font-size:9.5px;letter-spacing:1px;color:#a0a0ad;text-transform:uppercase}
  .pihak b{font-size:12px}
  ol{margin:4px 0;padding-left:18px}
  li{margin:3px 0}
  .sign{display:flex;justify-content:space-between;margin-top:40px;text-align:center;font-size:11px}
  .sign .line{margin-top:64px;border-top:1px solid #16161d;padding-top:6px;width:190px}
</style></head><body>
  <div class="ttl"><h1>PERJANJIAN KERJA SAMA VENDOR</h1><div class="no">Nomor: {{no_kontrak}} · {{tanggal}}</div></div>
  <p>Pada hari ini, {{tanggal}}, bertempat di {{kota}}, yang bertanda tangan di bawah ini sepakat untuk mengadakan perjanjian kerja sama dengan ketentuan sebagai berikut:</p>
  <div class="pihak">
    <div><div class="lbl">Pihak Pertama</div><b>{{nama_perusahaan}}</b><div>{{alamat_perusahaan}}</div></div>
    <div><div class="lbl">Pihak Kedua (Vendor)</div><b>{{nama_penjual}}</b><div>{{alamat}}</div></div>
  </div>
  <div class="pasal">Pasal 1 — Ruang Lingkup</div>
  <p>Pihak Kedua menyediakan {{deskripsi}} sesuai spesifikasi yang disepakati kedua belah pihak.</p>
  <div class="pasal">Pasal 2 — Nilai &amp; Pembayaran</div>
  <p>Nilai kontrak sebesar <b>{{total}}</b>, dibayarkan sesuai termin yang disepakati setelah barang/jasa diterima dengan baik.</p>
  <div class="pasal">Pasal 3 — Jangka Waktu</div>
  <p>Perjanjian berlaku sejak {{tanggal_mulai}} sampai dengan {{tanggal_selesai}} dan dapat diperpanjang atas kesepakatan bersama.</p>
  <div class="pasal">Pasal 4 — Ketentuan Lain</div>
  <ol><li>Segala perselisihan diselesaikan secara musyawarah.</li><li>Hal yang belum diatur akan dituangkan dalam adendum.</li></ol>
  <div class="sign">
    <div><div>Pihak Pertama</div><div class="line"><b>{{nama_direktur}}</b></div></div>
    <div><div>Pihak Kedua</div><div class="line"><b>{{nama_penjual}}</b></div></div>
  </div>
</body></html>$html$
WHERE template_id = 'tpl_s4' AND version = 1;

-- ── 5. Surat Jalan (tpl_s5) ─────────────────────────────────────────
UPDATE template_versions SET body = $html$<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#16161d;font-size:12px;line-height:1.5;margin:0;padding:44px 52px}
  .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #16161d;padding-bottom:12px}
  .co{font-size:16px;font-weight:800}
  .co small{display:block;font-weight:400;color:#8a8a99;font-size:10.5px;margin-top:2px}
  .tag h1{margin:0;font-size:17px;letter-spacing:1px;text-align:right}
  .tag .no{color:#8a8a99;font-size:11px;text-align:right;margin-top:3px}
  .meta{display:flex;justify-content:space-between;margin:18px 0}
  .meta .lbl{font-size:9.5px;letter-spacing:1px;color:#a0a0ad;text-transform:uppercase}
  .meta b{font-size:12px}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th{text-align:left;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:#a0a0ad;border-bottom:2px solid #16161d;padding:8px 0}
  th.c,td.c{text-align:center}
  td{padding:9px 0;border-bottom:1px solid #ededf2}
  .note{margin-top:14px;font-size:10.5px;color:#8a8a99}
  .sign{display:flex;justify-content:space-between;margin-top:38px;text-align:center;font-size:11px}
  .sign .line{margin-top:56px;border-top:1px solid #16161d;padding-top:6px;width:150px}
</style></head><body>
  <div class="hd">
    <div class="co">{{nama_perusahaan}}<small>{{alamat_perusahaan}}</small></div>
    <div class="tag"><h1>SURAT JALAN</h1><div class="no">{{nomor}} · {{tanggal}}</div></div>
  </div>
  <div class="meta">
    <div><div class="lbl">Dikirim kepada</div><b>{{nama_pembeli}}</b><div style="color:#8a8a99">{{alamat}}</div></div>
    <div style="text-align:right"><div class="lbl">Tujuan</div><b>{{tujuan}}</b><div style="color:#8a8a99">No. PO {{no_po}}</div></div>
  </div>
  <table>
    <thead><tr><th class="c">No</th><th>Nama Barang</th><th class="c">Jumlah</th><th class="c">Satuan</th></tr></thead>
    <tbody>
      <tr><td class="c">1</td><td>{{deskripsi}}</td><td class="c">{{jumlah}}</td><td class="c">unit</td></tr>
    </tbody>
  </table>
  <div class="note">Barang telah diperiksa dan diterima dalam keadaan baik dan sesuai pesanan.</div>
  <div class="sign">
    <div><div>Pengirim</div><div class="line">{{nama_pengirim}}</div></div>
    <div><div>Sopir</div><div class="line">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</div></div>
    <div><div>Penerima</div><div class="line">{{nama_penerima}}</div></div>
  </div>
</body></html>$html$
WHERE template_id = 'tpl_s5' AND version = 1;

-- ── 6. Surat Keterangan Kerja (tpl_s6) ──────────────────────────────
UPDATE template_versions SET body = $html$<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#16161d;font-size:12px;line-height:1.65;margin:0;padding:44px 56px}
  .lh{display:flex;align-items:center;gap:14px;border-bottom:3px double #16161d;padding-bottom:12px}
  .lh .logo{width:42px;height:42px;border-radius:9px;background:#6c5ce7;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px}
  .lh .co{font-size:16px;font-weight:800}
  .lh .co small{display:block;font-weight:400;color:#8a8a99;font-size:10px}
  .title{text-align:center;margin:22px 0 6px}
  .title h1{margin:0;font-size:14px;letter-spacing:1px;text-decoration:underline}
  .title .no{color:#8a8a99;font-size:11px}
  .tbl{margin:14px 0}
  .tbl div{display:flex;margin:2px 0}
  .tbl span:first-child{width:130px;color:#8a8a99}
  p{margin:10px 0;text-align:justify}
  .sign{margin-top:30px;width:230px;margin-left:auto;text-align:center;font-size:11px}
  .sign .line{margin-top:60px;border-top:1px solid #16161d;padding-top:6px}
  .sign b{display:block}
</style></head><body>
  <div class="lh"><div class="logo">{{nama_perusahaan}}</div><div class="co">{{nama_perusahaan}}<small>{{alamat_perusahaan}}</small></div></div>
  <div class="title"><h1>SURAT KETERANGAN KERJA</h1><div class="no">Nomor: {{no_surat}}</div></div>
  <p>Yang bertanda tangan di bawah ini, manajemen <b>{{nama_perusahaan}}</b>, dengan ini menerangkan bahwa:</p>
  <div class="tbl">
    <div><span>Nama</span><b>{{nama_karyawan}}</b></div>
    <div><span>NIP</span><span>{{nip}}</span></div>
    <div><span>Jabatan</span><span>{{jabatan}}</span></div>
    <div><span>Masa kerja</span><span>{{lama_bekerja}}</span></div>
  </div>
  <p>adalah benar karyawan {{status_karyawan}} pada perusahaan kami sejak {{tanggal_bergabung}} hingga saat ini, dengan penilaian kinerja <b>{{penilaian_kinerja}}</b>.</p>
  <p>Surat keterangan ini diterbitkan untuk keperluan <b>{{keperluan}}</b> dan dapat dipergunakan sebagaimana mestinya.</p>
  <div class="sign"><div>{{kota}}, {{tanggal}}</div><div class="line"><b>{{nama_hrd}}</b>HR Manager</div></div>
</body></html>$html$
WHERE template_id = 'tpl_s6' AND version = 1;

SELECT id, name, current_version FROM templates WHERE tenant_id='ten_Blfjz53nq3BXrH9EKEnY3S' ORDER BY name;
