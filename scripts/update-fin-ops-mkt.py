import json, urllib.request, urllib.error

TOKEN = open("C:/xampp/htdocs/docgen/scripts/.seed_token").read().strip()
BASE  = "http://127.0.0.1:3001/v1"

CSS = """<style>
  body { font-family:'Times New Roman',Times,serif; font-size:12pt; margin:40px 50px; color:#111; line-height:1.8; }
  .header { text-align:center; margin-bottom:24px; padding-bottom:14px; border-bottom:3px double #222; }
  .co { font-size:18pt; font-weight:bold; text-transform:uppercase; letter-spacing:2px; }
  .co-sub { font-size:10pt; color:#555; margin-top:2px; }
  .doc-title { text-align:center; font-size:14pt; font-weight:bold; text-transform:uppercase; text-decoration:underline; margin:22px 0 6px; }
  .doc-no { text-align:center; font-size:10pt; color:#555; margin-bottom:18px; }
  h2 { font-size:12pt; font-weight:bold; text-transform:uppercase; margin:22px 0 6px; border-bottom:1px solid #ddd; padding-bottom:3px; }
  .ft { width:100%; border-collapse:collapse; }
  .ft td { padding:3px 6px; vertical-align:top; }
  .ft td:first-child { width:210px; white-space:nowrap; }
  .ft td:nth-child(2) { width:20px; }
  .pasal { margin-top:18px; }
  .pasal-judul { font-weight:bold; margin-bottom:4px; }
  .ayat { margin-left:24px; margin-bottom:4px; }
  .note { background:#f9f9f9; border-left:3px solid #bbb; padding:10px 14px; margin:10px 0; font-size:11pt; }
  .sig-section { margin-top:60px; }
  .sig-row { display:flex; justify-content:space-between; }
  .sig-block { text-align:center; min-width:180px; }
  .sig-space { height:72px; }
  .sig-line { border-top:1px solid #333; padding-top:5px; font-weight:bold; }
  .sig-title { font-size:10pt; color:#555; }
  .materai { border:1px dashed #aaa; width:90px; height:90px; margin:6px auto; display:flex; align-items:center; justify-content:center; font-size:8pt; color:#aaa; text-align:center; border-radius:4px; }
  .inv-table { width:100%; border-collapse:collapse; margin:12px 0; }
  .inv-table th { background:#1e293b; color:#fff; padding:8px 10px; text-align:left; font-size:11pt; }
  .inv-table td { padding:8px 10px; border-bottom:1px solid #e2e8f0; }
  .inv-table tr:nth-child(even) td { background:#f8fafc; }
  .inv-total { text-align:right; margin-top:8px; }
  .badge { display:inline-block; padding:3px 12px; border-radius:99px; font-size:10pt; font-weight:bold; }
  .badge-paid { background:#dcfce7; color:#166534; }
  .badge-unpaid { background:#fef9c3; color:#854d0e; }
  .badge-overdue { background:#fee2e2; color:#991b1b; }
</style>"""

def post_version(tid, body):
    payload = json.dumps({"body": body}).encode()
    req = urllib.request.Request(
        f"{BASE}/templates/{tid}/versions",
        data=payload,
        headers={"Content-Type":"application/json","Authorization":f"Bearer {TOKEN}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            v = json.load(r)["version"]["version"]
            return v, None
    except urllib.error.HTTPError as e:
        return None, e.read().decode()[:120]

IDS = {
    "inv":    "tpl_r4ZrniyMQErU09IsfEqm92",
    "po":     "tpl_QVuI6wsRnCZwLTPIZymcZf",
    "kuitansi":"tpl_4HhGada4voY5ymnoW5g4pW",
    "tugas":  "tpl_LoVhpRF2LOAc7xcHtTOzDN",
    "ba":     "tpl_JLB2O0QhCYQ70N2O9k6EPg",
    "penawaran":"tpl_FWnHF97KvimLadSamFDaP5",
}

# ── INVOICE ───────────────────────────────────────────────────────────────────
INV = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{CSS}
<style>
  .inv-header {{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; }}
  .inv-meta {{ text-align:right; }}
  .inv-number {{ font-size:28pt; font-weight:bold; color:#4f46e5; letter-spacing:-1px; }}
  .client-box {{ background:#f1f5f9; border-radius:8px; padding:14px 18px; margin-bottom:20px; }}
  .total-box {{ background:#1e293b; color:#fff; border-radius:8px; padding:16px 20px; text-align:right; margin-top:16px; }}
  .total-box .label {{ font-size:10pt; opacity:0.7; }}
  .total-box .amount {{ font-size:22pt; font-weight:bold; }}
  .bank-box {{ background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 18px; margin-top:16px; }}
  .footer-note {{ font-size:10pt; color:#64748b; margin-top:20px; border-top:1px solid #e2e8f0; padding-top:12px; }}
</style>
</head><body>

<div class="inv-header">
  <div>
    <div class="co" style="font-size:20pt;">{{{{nama_perusahaan}}}}</div>
    <div style="font-size:10pt; color:#555; margin-top:4px;">{{{{alamat_perusahaan}}}}</div>
    <div style="font-size:10pt; color:#555;">{{{{email_perusahaan}}}} &nbsp;|&nbsp; {{{{telepon_perusahaan}}}}</div>
    <div style="font-size:10pt; color:#555;">NPWP: {{{{npwp_perusahaan}}}}</div>
  </div>
  <div class="inv-meta">
    <div class="inv-number">INVOICE</div>
    <div style="margin-top:6px;">
      <strong>No. Invoice</strong><br/>{{{{nomor_invoice}}}}<br/>
    </div>
    <div style="margin-top:6px;">
      <strong>Tanggal Invoice</strong><br/>{{{{tanggal_invoice}}}}<br/>
    </div>
    <div style="margin-top:6px;">
      <strong>Jatuh Tempo</strong><br/>{{{{jatuh_tempo}}}}<br/>
    </div>
    <div style="margin-top:8px;">
      <span class="badge {{{{css_status}}}}">{{{{status_pembayaran}}}}</span>
    </div>
  </div>
</div>

<div class="client-box">
  <div style="font-size:10pt; color:#64748b; margin-bottom:4px;">TAGIHAN KEPADA</div>
  <div style="font-size:13pt; font-weight:bold;">{{{{nama_klien}}}}</div>
  <div>{{{{alamat_klien}}}}</div>
  <div>{{{{email_klien}}}} &nbsp;|&nbsp; {{{{telepon_klien}}}}</div>
  <div style="margin-top:4px;">NPWP: {{{{npwp_klien}}}}</div>
  <div>Attn: {{{{nama_pic_klien}}}}</div>
</div>

<table class="inv-table">
  <thead>
    <tr>
      <th style="width:40px;">#</th>
      <th>Deskripsi</th>
      <th style="text-align:center; width:60px;">Qty</th>
      <th style="text-align:center; width:70px;">Satuan</th>
      <th style="text-align:right; width:130px;">Harga Satuan</th>
      <th style="text-align:right; width:140px;">Subtotal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:center;">1</td>
      <td>
        <strong>{{{{nama_item_1}}}}</strong><br/>
        <span style="font-size:10pt; color:#64748b;">{{{{deskripsi_item_1}}}}</span>
      </td>
      <td style="text-align:center;">{{{{qty_1}}}}</td>
      <td style="text-align:center;">{{{{satuan_1}}}}</td>
      <td style="text-align:right;">Rp {{{{harga_1}}}}</td>
      <td style="text-align:right;">Rp {{{{subtotal_1}}}}</td>
    </tr>
    <tr>
      <td style="text-align:center;">2</td>
      <td>
        <strong>{{{{nama_item_2}}}}</strong><br/>
        <span style="font-size:10pt; color:#64748b;">{{{{deskripsi_item_2}}}}</span>
      </td>
      <td style="text-align:center;">{{{{qty_2}}}}</td>
      <td style="text-align:center;">{{{{satuan_2}}}}</td>
      <td style="text-align:right;">Rp {{{{harga_2}}}}</td>
      <td style="text-align:right;">Rp {{{{subtotal_2}}}}</td>
    </tr>
    <tr>
      <td style="text-align:center;">3</td>
      <td>
        <strong>{{{{nama_item_3}}}}</strong><br/>
        <span style="font-size:10pt; color:#64748b;">{{{{deskripsi_item_3}}}}</span>
      </td>
      <td style="text-align:center;">{{{{qty_3}}}}</td>
      <td style="text-align:center;">{{{{satuan_3}}}}</td>
      <td style="text-align:right;">Rp {{{{harga_3}}}}</td>
      <td style="text-align:right;">Rp {{{{subtotal_3}}}}</td>
    </tr>
  </tbody>
</table>

<div style="display:flex; justify-content:flex-end;">
  <table style="width:280px; border-collapse:collapse;">
    <tr><td style="padding:5px 0;">Subtotal</td><td style="text-align:right; padding:5px 0;">Rp {{{{subtotal}}}}</td></tr>
    <tr><td style="padding:5px 0;">Diskon ({{{{persen_diskon}}}}%)</td><td style="text-align:right; padding:5px 0; color:#dc2626;">- Rp {{{{diskon}}}}</td></tr>
    <tr><td style="padding:5px 0;">PPN {{{{persen_ppn}}}}%</td><td style="text-align:right; padding:5px 0;">Rp {{{{ppn}}}}</td></tr>
    <tr><td style="padding:5px 0; border-top:2px solid #333; font-weight:bold;">TOTAL</td><td style="text-align:right; padding:5px 0; border-top:2px solid #333; font-weight:bold; font-size:14pt;">Rp {{{{total}}}}</td></tr>
  </table>
</div>

<div class="bank-box">
  <div style="font-size:10pt; color:#64748b; margin-bottom:6px; font-weight:bold;">INFORMASI PEMBAYARAN</div>
  <table class="ft">
    <tr><td style="width:160px;">Bank</td><td>:</td><td><strong>{{{{nama_bank}}}}</strong></td></tr>
    <tr><td>Nomor Rekening</td><td>:</td><td><strong>{{{{nomor_rekening}}}}</strong></td></tr>
    <tr><td>Atas Nama</td><td>:</td><td><strong>{{{{nama_rekening}}}}</strong></td></tr>
    <tr><td>Referensi</td><td>:</td><td>{{{{nomor_invoice}}}}</td></tr>
  </table>
</div>

<div class="footer-note">
  <strong>Syarat Pembayaran:</strong> {{{{syarat_pembayaran}}}}<br/>
  <strong>Catatan:</strong> {{{{catatan_invoice}}}}<br/><br/>
  Mohon cantumkan nomor invoice sebagai referensi transfer. Keterlambatan pembayaran dikenakan denda {{{{persen_denda}}}}% per bulan dari total tagihan.
  Apabila ada pertanyaan, hubungi kami di {{{{email_perusahaan}}}} atau {{{{telepon_perusahaan}}}}.
</div>

<div class="sig-section">
<div class="sig-row" style="justify-content:flex-start;">
  <div class="sig-block" style="text-align:left;">
    <p>Hormat kami,</p>
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_pembuat}}}}</div>
    <div class="sig-title">{{{{jabatan_pembuat}}}}</div>
    <div class="sig-title">{{{{nama_perusahaan}}}}</div>
  </div>
</div>
</div>
</body></html>"""

# ── PURCHASE ORDER ────────────────────────────────────────────────────────────
PO = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{CSS}
<style>
  .po-header {{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }}
  .po-badge {{ font-size:26pt; font-weight:bold; color:#1e3a5f; border:3px solid #1e3a5f; padding:4px 16px; display:inline-block; border-radius:4px; }}
  .po-meta {{ text-align:right; }}
  .grid2 {{ display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:16px 0; }}
  .info-box {{ background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 18px; }}
  .info-box .label {{ font-size:9pt; text-transform:uppercase; color:#64748b; font-weight:bold; letter-spacing:0.5px; margin-bottom:6px; }}
  .terms-grid {{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin:12px 0; }}
  .term-item {{ background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px; text-align:center; }}
  .term-item .t-label {{ font-size:9pt; color:#64748b; }}
  .term-item .t-value {{ font-weight:bold; font-size:11pt; margin-top:4px; }}
</style>
</head><body>

<div class="po-header">
  <div>
    <div class="co" style="font-size:18pt;">{{{{nama_perusahaan}}}}</div>
    <div style="font-size:10pt; color:#555;">{{{{alamat_perusahaan}}}}</div>
    <div style="font-size:10pt; color:#555;">NPWP: {{{{npwp_perusahaan}}}}</div>
  </div>
  <div class="po-meta">
    <div class="po-badge">PURCHASE ORDER</div>
    <div style="margin-top:10px; font-size:11pt;">
      No. PO: <strong>{{{{nomor_po}}}}</strong><br/>
      Tanggal: {{{{tanggal_po}}}}<br/>
      Berlaku s/d: {{{{berlaku_sampai}}}}
    </div>
  </div>
</div>

<div class="grid2">
  <div class="info-box">
    <div class="label">Dari (Pembeli)</div>
    <strong>{{{{nama_perusahaan}}}}</strong><br/>
    {{{{alamat_perusahaan}}}}<br/>
    Telp: {{{{telepon_perusahaan}}}}<br/>
    Dept. Pengadaan: {{{{dept_pengadaan}}}}<br/>
    Contact: {{{{contact_pengadaan}}}}
  </div>
  <div class="info-box">
    <div class="label">Kepada (Vendor/Supplier)</div>
    <strong>{{{{nama_vendor}}}}</strong><br/>
    {{{{alamat_vendor}}}}<br/>
    Telp: {{{{telepon_vendor}}}}<br/>
    Contact: {{{{contact_vendor}}}}<br/>
    NPWP: {{{{npwp_vendor}}}}
  </div>
</div>

<div class="terms-grid">
  <div class="term-item">
    <div class="t-label">Syarat Pembayaran</div>
    <div class="t-value">{{{{syarat_pembayaran}}}}</div>
  </div>
  <div class="term-item">
    <div class="t-label">Syarat Pengiriman</div>
    <div class="t-value">{{{{syarat_pengiriman}}}}</div>
  </div>
  <div class="term-item">
    <div class="t-label">Tanggal Pengiriman</div>
    <div class="t-value">{{{{tanggal_kirim}}}}</div>
  </div>
</div>

<table class="inv-table">
  <thead>
    <tr>
      <th style="width:35px;">No</th>
      <th style="width:100px;">Kode Barang</th>
      <th>Nama Barang / Jasa</th>
      <th style="text-align:center; width:55px;">Qty</th>
      <th style="text-align:center; width:60px;">Satuan</th>
      <th style="text-align:right; width:130px;">Harga Satuan</th>
      <th style="text-align:right; width:140px;">Total</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:center;">1</td>
      <td>{{{{kode_1}}}}</td>
      <td>
        <strong>{{{{nama_barang_1}}}}</strong><br/>
        <span style="font-size:10pt; color:#64748b;">Spesifikasi: {{{{spesifikasi_1}}}}</span>
      </td>
      <td style="text-align:center;">{{{{qty_1}}}}</td>
      <td style="text-align:center;">{{{{satuan_1}}}}</td>
      <td style="text-align:right;">Rp {{{{harga_1}}}}</td>
      <td style="text-align:right;">Rp {{{{total_1}}}}</td>
    </tr>
    <tr>
      <td style="text-align:center;">2</td>
      <td>{{{{kode_2}}}}</td>
      <td>
        <strong>{{{{nama_barang_2}}}}</strong><br/>
        <span style="font-size:10pt; color:#64748b;">Spesifikasi: {{{{spesifikasi_2}}}}</span>
      </td>
      <td style="text-align:center;">{{{{qty_2}}}}</td>
      <td style="text-align:center;">{{{{satuan_2}}}}</td>
      <td style="text-align:right;">Rp {{{{harga_2}}}}</td>
      <td style="text-align:right;">Rp {{{{total_2}}}}</td>
    </tr>
    <tr>
      <td style="text-align:center;">3</td>
      <td>{{{{kode_3}}}}</td>
      <td>
        <strong>{{{{nama_barang_3}}}}</strong><br/>
        <span style="font-size:10pt; color:#64748b;">Spesifikasi: {{{{spesifikasi_3}}}}</span>
      </td>
      <td style="text-align:center;">{{{{qty_3}}}}</td>
      <td style="text-align:center;">{{{{satuan_3}}}}</td>
      <td style="text-align:right;">Rp {{{{harga_3}}}}</td>
      <td style="text-align:right;">Rp {{{{total_3}}}}</td>
    </tr>
  </tbody>
</table>

<div style="display:flex; justify-content:flex-end; margin-top:8px;">
  <table style="width:280px; border-collapse:collapse;">
    <tr><td style="padding:4px 0;">Subtotal Barang</td><td style="text-align:right;">Rp {{{{subtotal}}}}</td></tr>
    <tr><td style="padding:4px 0;">PPN {{{{persen_ppn}}}}%</td><td style="text-align:right;">Rp {{{{ppn}}}}</td></tr>
    <tr><td style="padding:4px 0; border-top:2px solid #333; font-weight:bold;">TOTAL PO</td><td style="text-align:right; border-top:2px solid #333; font-weight:bold; font-size:14pt;">Rp {{{{grand_total}}}}</td></tr>
  </table>
</div>

<h2>Syarat dan Ketentuan PO</h2>
<ol style="margin-left:20px; line-height:2; font-size:11pt;">
  <li>Barang/jasa harus sesuai dengan spesifikasi yang tercantum. Barang yang tidak sesuai akan dikembalikan atas biaya vendor.</li>
  <li>Pengiriman dilakukan ke: <strong>{{{{alamat_pengiriman}}}}</strong>. Contact penerima: {{{{contact_penerima}}}}.</li>
  <li>Setiap pengiriman harus disertai surat jalan, faktur pajak, dan dokumen pendukung lainnya.</li>
  <li>Pembayaran diproses dalam {{{{waktu_proses_bayar}}}} hari kerja setelah invoice diterima dan diverifikasi.</li>
  <li>Vendor wajib menyertakan garansi produk selama {{{{masa_garansi}}}} dari tanggal penerimaan barang.</li>
  <li>Keterlambatan pengiriman tanpa pemberitahuan dikenakan penalti {{{{persen_penalti}}}}% dari nilai PO per hari keterlambatan.</li>
</ol>

<div class="note" style="margin-top:12px;">
  <strong>Catatan Khusus:</strong> {{{{catatan_khusus}}}}
</div>

<div class="sig-section">
<div class="sig-row">
  <div class="sig-block">
    <p>Dibuat oleh</p>
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_pembuat}}}}</div>
    <div class="sig-title">{{{{jabatan_pembuat}}}}</div>
  </div>
  <div class="sig-block">
    <p>Disetujui oleh</p>
    <div class="materai">Materai<br/>Rp 10.000</div>
    <div class="sig-line">{{{{nama_approver}}}}</div>
    <div class="sig-title">{{{{jabatan_approver}}}}</div>
  </div>
  <div class="sig-block">
    <p>Konfirmasi Vendor</p>
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_vendor_ttd}}}}</div>
    <div class="sig-title">{{{{nama_vendor}}}}</div>
  </div>
</div>
</div>
</body></html>"""

# ── KUITANSI ──────────────────────────────────────────────────────────────────
KUITANSI = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{CSS}
<style>
  .kuitansi-wrap {{ border:2px solid #222; border-radius:10px; padding:30px 36px; max-width:600px; margin:20px auto; }}
  .kuitansi-no {{ font-size:10pt; color:#555; text-align:right; margin-bottom:16px; }}
  .amount-display {{ font-size:26pt; font-weight:bold; color:#166534; text-align:center; border:2px dashed #166534; border-radius:8px; padding:14px; margin:20px 0; }}
  .terbilang-box {{ font-style:italic; text-align:center; font-size:11pt; color:#374151; background:#f0fdf4; border-radius:6px; padding:10px; margin-bottom:20px; }}
  .barcode-placeholder {{ border:1px solid #ddd; border-radius:4px; height:50px; display:flex; align-items:center; justify-content:center; font-size:9pt; color:#999; margin:16px 0; }}
  .qr-placeholder {{ border:1px solid #ddd; border-radius:4px; width:70px; height:70px; display:flex; align-items:center; justify-content:center; font-size:8pt; color:#999; text-align:center; float:right; margin:0 0 10px 16px; }}
</style>
</head><body>

<div class="header">
  <div class="co">{{{{nama_perusahaan}}}}</div>
  <div class="co-sub">{{{{alamat_perusahaan}}}} &nbsp;|&nbsp; {{{{telepon_perusahaan}}}}</div>
</div>

<div class="kuitansi-wrap">
  <div class="kuitansi-no">No. Kuitansi: <strong>{{{{nomor_kuitansi}}}}</strong></div>

  <div class="qr-placeholder">QR<br/>Verifikasi</div>

  <table class="ft">
    <tr><td>Tanggal</td><td>:</td><td><strong>{{{{tanggal_bayar}}}}</strong></td></tr>
    <tr><td>Telah diterima dari</td><td>:</td><td><strong>{{{{nama_pembayar}}}}</strong></td></tr>
    <tr><td>Alamat</td><td>:</td><td>{{{{alamat_pembayar}}}}</td></tr>
    <tr><td>Untuk pembayaran</td><td>:</td><td><strong>{{{{keterangan_pembayaran}}}}</strong></td></tr>
    <tr><td>Referensi / No. Inv.</td><td>:</td><td>{{{{nomor_referensi}}}}</td></tr>
    <tr><td>Metode Pembayaran</td><td>:</td><td>{{{{metode_bayar}}}}</td></tr>
    <tr><td>No. Transaksi</td><td>:</td><td>{{{{nomor_transaksi}}}}</td></tr>
  </table>

  <div class="amount-display">Rp {{{{jumlah}}}}</div>

  <div class="terbilang-box">
    Terbilang: <em>{{{{terbilang}}}}</em>
  </div>

  <div style="clear:both;"></div>
  <div class="barcode-placeholder">||||  {{{{nomor_kuitansi}}}}  ||||  {{{{tanggal_bayar}}}}  ||||  {{{{nama_perusahaan}}}}  ||||</div>

  <div class="sig-section">
  <div class="sig-row" style="justify-content:flex-end;">
    <div class="sig-block">
      <p>{{{{kota}}}}, {{{{tanggal_bayar}}}}</p>
      <div class="materai">Materai<br/>Rp 10.000</div>
      <div class="sig-line">{{{{nama_penerima}}}}</div>
      <div class="sig-title">{{{{jabatan_penerima}}}}</div>
      <div class="sig-title">{{{{nama_perusahaan}}}}</div>
    </div>
  </div>
  </div>
</div>

<p style="text-align:center; font-size:9pt; color:#9ca3af; margin-top:16px;">
  Kuitansi ini merupakan bukti pembayaran yang sah. Harap simpan sebagai arsip Anda.<br/>
  Untuk verifikasi: hubungi {{{{email_perusahaan}}}} atau scan QR code di atas.
</p>
</body></html>"""

# ── SURAT TUGAS ───────────────────────────────────────────────────────────────
TUGAS = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{CSS}</head><body>
<div class="header">
  <div class="co">{{{{nama_perusahaan}}}}</div>
  <div class="co-sub">{{{{alamat_perusahaan}}}} &nbsp;|&nbsp; Telp. {{{{telepon_perusahaan}}}}</div>
</div>

<div class="doc-title">Surat Tugas</div>
<div class="doc-no">Nomor: {{{{nomor_surat}}}}</div>

<p>Yang bertanda tangan di bawah ini:</p>
<table class="ft">
  <tr><td>Nama</td><td>:</td><td><strong>{{{{nama_pemberi_tugas}}}}</strong></td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_pemberi_tugas}}}}</td></tr>
  <tr><td>Departemen</td><td>:</td><td>{{{{departemen_pemberi}}}}</td></tr>
</table>

<p>Dengan ini memberikan <strong>TUGAS DINAS</strong> kepada:</p>
<table class="ft" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
  <tr><td>Nama</td><td>:</td><td><strong>{{{{nama_pegawai}}}}</strong></td></tr>
  <tr><td>NIK</td><td>:</td><td>{{{{nik_pegawai}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_pegawai}}}}</td></tr>
  <tr><td>Departemen</td><td>:</td><td>{{{{departemen_pegawai}}}}</td></tr>
  <tr><td>No. HP Aktif</td><td>:</td><td>{{{{nohp_pegawai}}}}</td></tr>
</table>

<h2>Uraian Tugas</h2>
<div class="note" style="border-left-color:#3b82f6; background:#eff6ff;">
  <strong>{{{{judul_tugas}}}}</strong><br/><br/>
  {{{{deskripsi_tugas}}}}
</div>

<h2>Rincian Penugasan</h2>
<table class="ft">
  <tr><td>Tujuan / Lokasi</td><td>:</td><td><strong>{{{{lokasi_tugas}}}}</strong></td></tr>
  <tr><td>Tanggal Berangkat</td><td>:</td><td>{{{{tanggal_berangkat}}}}</td></tr>
  <tr><td>Tanggal Kembali</td><td>:</td><td>{{{{tanggal_kembali}}}}</td></tr>
  <tr><td>Durasi</td><td>:</td><td>{{{{durasi_hari}}}} hari kerja</td></tr>
  <tr><td>Moda Transportasi</td><td>:</td><td>{{{{moda_transportasi}}}}</td></tr>
  <tr><td>Akomodasi</td><td>:</td><td>{{{{akomodasi}}}}</td></tr>
</table>

<h2>Anggaran Perjalanan Dinas</h2>
<table class="inv-table">
  <thead>
    <tr><th>Komponen</th><th style="text-align:right;">Jumlah</th><th>Keterangan</th></tr>
  </thead>
  <tbody>
    <tr><td>Uang Harian ({{{{durasi_hari}}}} hari × Rp {{{{uang_harian_per_hari}}}})</td><td style="text-align:right;">Rp {{{{uang_harian}}}}</td><td>Termasuk makan</td></tr>
    <tr><td>Transportasi (PP)</td><td style="text-align:right;">Rp {{{{biaya_transportasi}}}}</td><td>{{{{moda_transportasi}}}}</td></tr>
    <tr><td>Akomodasi ({{{{malam_menginap}}}} malam)</td><td style="text-align:right;">Rp {{{{biaya_akomodasi}}}}</td><td>{{{{akomodasi}}}}</td></tr>
    <tr><td>Lain-lain</td><td style="text-align:right;">Rp {{{{biaya_lainnya}}}}</td><td>{{{{keterangan_lainnya}}}}</td></tr>
    <tr style="font-weight:bold;"><td>TOTAL</td><td style="text-align:right;">Rp {{{{total_anggaran}}}}</td><td>&mdash;</td></tr>
  </tbody>
</table>

<h2>Output / Deliverables</h2>
<ol style="margin-left:20px; line-height:2;">
  <li>{{{{output_1}}}}</li>
  <li>{{{{output_2}}}}</li>
  <li>{{{{output_3}}}}</li>
</ol>

<p>Pegawai yang bersangkutan diwajibkan menyerahkan laporan perjalanan dinas beserta bukti pengeluaran paling lambat <strong>{{{{batas_laporan}}}}</strong> hari kerja setelah kembali.</p>

<div class="sig-section">
<p>Demikian surat tugas ini dibuat untuk dapat dilaksanakan dengan sebaik-baiknya dan penuh tanggung jawab.</p>
<p>{{{{kota}}}}, {{{{tanggal_surat}}}}</p>
<div class="sig-row">
  <div class="sig-block">
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_pemberi_tugas}}}}</div>
    <div class="sig-title">{{{{jabatan_pemberi_tugas}}}}</div>
  </div>
  <div class="sig-block">
    <p>Yang Menerima Tugas</p>
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_pegawai}}}}</div>
    <div class="sig-title">{{{{jabatan_pegawai}}}}</div>
  </div>
</div>
</div>
</body></html>"""

# ── BERITA ACARA ──────────────────────────────────────────────────────────────
BA = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{CSS}</head><body>
<div class="header">
  <div class="co">{{{{nama_perusahaan}}}}</div>
  <div class="co-sub">{{{{alamat_perusahaan}}}} &nbsp;|&nbsp; Telp. {{{{telepon_perusahaan}}}}</div>
</div>

<div class="doc-title">Berita Acara</div>
<div style="text-align:center; font-size:13pt; margin-bottom:6px;">{{{{judul_ba}}}}</div>
<div class="doc-no">Nomor: {{{{nomor_ba}}}}</div>

<p>Pada hari <strong>{{{{hari}}}}</strong>, tanggal <strong>{{{{tanggal_ba}}}}</strong>, pukul <strong>{{{{waktu_mulai}}}} s/d {{{{waktu_selesai}}}} WIB</strong>, bertempat di <strong>{{{{lokasi_ba}}}}</strong>, telah dilaksanakan <strong>{{{{judul_ba}}}}</strong>.</p>

<h2>I. Informasi Umum</h2>
<table class="ft">
  <tr><td>Agenda</td><td>:</td><td>{{{{agenda}}}}</td></tr>
  <tr><td>Dipimpin oleh</td><td>:</td><td>{{{{nama_pemimpin}}}}, {{{{jabatan_pemimpin}}}}</td></tr>
  <tr><td>Sekretaris / Notulis</td><td>:</td><td>{{{{nama_notulis}}}}</td></tr>
</table>

<h2>II. Peserta</h2>
<table class="inv-table">
  <thead>
    <tr><th style="width:35px;">No</th><th>Nama</th><th>Jabatan / Instansi</th><th>Keterangan</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align:center;">1</td><td>{{{{peserta_1_nama}}}}</td><td>{{{{peserta_1_jabatan}}}}</td><td>{{{{peserta_1_ket}}}}</td></tr>
    <tr><td style="text-align:center;">2</td><td>{{{{peserta_2_nama}}}}</td><td>{{{{peserta_2_jabatan}}}}</td><td>{{{{peserta_2_ket}}}}</td></tr>
    <tr><td style="text-align:center;">3</td><td>{{{{peserta_3_nama}}}}</td><td>{{{{peserta_3_jabatan}}}}</td><td>{{{{peserta_3_ket}}}}</td></tr>
    <tr><td style="text-align:center;">4</td><td>{{{{peserta_4_nama}}}}</td><td>{{{{peserta_4_jabatan}}}}</td><td>{{{{peserta_4_ket}}}}</td></tr>
    <tr><td style="text-align:center;">5</td><td>{{{{peserta_5_nama}}}}</td><td>{{{{peserta_5_jabatan}}}}</td><td>{{{{peserta_5_ket}}}}</td></tr>
  </tbody>
</table>

<h2>III. Jalannya Acara / Pembahasan</h2>
<div class="pasal">
<div class="pasal-judul">1. Pembukaan</div>
<div class="ayat">{{{{pembukaan}}}}</div>
</div>
<div class="pasal">
<div class="pasal-judul">2. Pembahasan Agenda</div>
<div class="ayat"><strong>Agenda 1: {{{{agenda_1_judul}}}}</strong><br/>{{{{agenda_1_pembahasan}}}}</div>
<div class="ayat" style="margin-top:10px;"><strong>Agenda 2: {{{{agenda_2_judul}}}}</strong><br/>{{{{agenda_2_pembahasan}}}}</div>
<div class="ayat" style="margin-top:10px;"><strong>Agenda 3: {{{{agenda_3_judul}}}}</strong><br/>{{{{agenda_3_pembahasan}}}}</div>
</div>
<div class="pasal">
<div class="pasal-judul">3. Sesi Tanya Jawab</div>
<div class="ayat">{{{{sesi_tanya_jawab}}}}</div>
</div>

<h2>IV. Keputusan dan Tindak Lanjut</h2>
<table class="inv-table">
  <thead>
    <tr><th style="width:35px;">No</th><th>Keputusan / Tindak Lanjut</th><th style="width:160px;">Penanggung Jawab</th><th style="width:120px;">Target Selesai</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align:center;">1</td><td>{{{{tindaklanjut_1}}}}</td><td>{{{{pj_1}}}}</td><td>{{{{target_1}}}}</td></tr>
    <tr><td style="text-align:center;">2</td><td>{{{{tindaklanjut_2}}}}</td><td>{{{{pj_2}}}}</td><td>{{{{target_2}}}}</td></tr>
    <tr><td style="text-align:center;">3</td><td>{{{{tindaklanjut_3}}}}</td><td>{{{{pj_3}}}}</td><td>{{{{target_3}}}}</td></tr>
  </tbody>
</table>

<h2>V. Penutup</h2>
<p>{{{{penutup}}}}</p>
<p>Demikian Berita Acara ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>

<div class="sig-section">
<div class="sig-row">
  <div class="sig-block">
    <p>Pemimpin Rapat</p>
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_pemimpin}}}}</div>
    <div class="sig-title">{{{{jabatan_pemimpin}}}}</div>
  </div>
  <div class="sig-block">
    <p>Notulis</p>
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_notulis}}}}</div>
  </div>
  <div class="sig-block">
    <p>Mengetahui</p>
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_mengetahui}}}}</div>
    <div class="sig-title">{{{{jabatan_mengetahui}}}}</div>
  </div>
</div>
</div>
</body></html>"""

# ── SURAT PENAWARAN PRODUK/JASA ───────────────────────────────────────────────
PENAWARAN = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{CSS}
<style>
  .hero {{ background:linear-gradient(135deg,#1e40af,#7c3aed); color:#fff; border-radius:12px; padding:30px 36px; margin:16px 0 24px; }}
  .hero h1 {{ color:#fff; font-size:22pt; margin:0 0 8px; text-decoration:none; text-transform:none; font-weight:bold; }}
  .hero p {{ margin:0; opacity:0.9; font-size:12pt; }}
  .price-card {{ border:2px solid #4f46e5; border-radius:10px; padding:20px 24px; margin:16px 0; }}
  .price-card .price {{ font-size:28pt; font-weight:bold; color:#4f46e5; }}
  .price-card .period {{ font-size:12pt; color:#64748b; }}
  .feature-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:12px 0; }}
  .feature-item {{ display:flex; gap:8px; align-items:flex-start; padding:8px; background:#f8fafc; border-radius:6px; }}
  .check {{ color:#16a34a; font-weight:bold; font-size:14pt; line-height:1; }}
  .testimonial {{ background:#fefce8; border:1px solid #fef08a; border-radius:8px; padding:16px 20px; margin:16px 0; font-style:italic; }}
  .cta-box {{ background:#1e293b; color:#fff; border-radius:10px; padding:24px 28px; margin:20px 0; text-align:center; }}
  .cta-box h2 {{ color:#fff; text-decoration:none; text-transform:none; font-size:16pt; margin:0 0 10px; border:none; }}
  .cta-btn {{ display:inline-block; background:#4f46e5; color:#fff; padding:12px 28px; border-radius:8px; font-weight:bold; font-size:13pt; margin-top:10px; text-decoration:none; }}
  .timeline {{ border-left:3px solid #4f46e5; padding-left:20px; margin:12px 0; }}
  .timeline-item {{ margin-bottom:16px; position:relative; }}
  .timeline-item::before {{ content:"●"; position:absolute; left:-26px; color:#4f46e5; font-size:12pt; }}
  .timeline-item .step {{ font-weight:bold; font-size:10pt; text-transform:uppercase; color:#4f46e5; }}
</style>
</head><body>

<div class="header">
  <div class="co">{{{{nama_perusahaan}}}}</div>
  <div class="co-sub">{{{{tagline_perusahaan}}}}</div>
</div>

<p style="text-align:right; margin-top:-10px; color:#64748b; font-size:10pt;">{{{{kota}}}}, {{{{tanggal_surat}}}}</p>

<p>
Kepada Yth.<br/>
<strong>{{{{nama_kontak}}}}</strong><br/>
{{{{jabatan_kontak}}}}<br/>
<strong>{{{{nama_perusahaan_tujuan}}}}</strong><br/>
{{{{alamat_perusahaan_tujuan}}}}
</p>

<p>Dengan hormat,</p>
<p>Terima kasih atas ketertarikan Bapak/Ibu terhadap solusi yang kami tawarkan. Setelah mempelajari kebutuhan <strong>{{{{nama_perusahaan_tujuan}}}}</strong>, kami dengan penuh keyakinan mempersembahkan proposal berikut:</p>

<div class="hero">
  <h1>{{{{nama_produk_jasa}}}}</h1>
  <p>{{{{deskripsi_singkat_produk}}}}</p>
</div>

<h2>Profil Singkat {{{{nama_perusahaan}}}}</h2>
<p>{{{{profil_perusahaan}}}} Hingga saat ini, kami telah melayani lebih dari <strong>{{{{jumlah_klien}}}}</strong> klien dari berbagai industri di <strong>{{{{area_layanan}}}}</strong> dengan tingkat kepuasan pelanggan <strong>{{{{rating_kepuasan}}}}%</strong>.</p>

<h2>Permasalahan yang Kami Selesaikan</h2>
<p>Kami memahami bahwa {{{{nama_perusahaan_tujuan}}}} mungkin menghadapi tantangan seperti:</p>
<div class="feature-grid">
  <div class="feature-item"><span style="color:#dc2626; font-weight:bold;">✗</span><span>{{{{pain_point_1}}}}</span></div>
  <div class="feature-item"><span style="color:#dc2626; font-weight:bold;">✗</span><span>{{{{pain_point_2}}}}</span></div>
  <div class="feature-item"><span style="color:#dc2626; font-weight:bold;">✗</span><span>{{{{pain_point_3}}}}</span></div>
  <div class="feature-item"><span style="color:#dc2626; font-weight:bold;">✗</span><span>{{{{pain_point_4}}}}</span></div>
</div>
<p>Solusi kami dirancang khusus untuk mengatasi semua tantangan di atas.</p>

<h2>Fitur dan Keunggulan</h2>
<div class="feature-grid">
  <div class="feature-item"><span class="check">✓</span><span><strong>{{{{fitur_1_judul}}}}</strong><br/><small>{{{{fitur_1_desc}}}}</small></span></div>
  <div class="feature-item"><span class="check">✓</span><span><strong>{{{{fitur_2_judul}}}}</strong><br/><small>{{{{fitur_2_desc}}}}</small></span></div>
  <div class="feature-item"><span class="check">✓</span><span><strong>{{{{fitur_3_judul}}}}</strong><br/><small>{{{{fitur_3_desc}}}}</small></span></div>
  <div class="feature-item"><span class="check">✓</span><span><strong>{{{{fitur_4_judul}}}}</strong><br/><small>{{{{fitur_4_desc}}}}</small></span></div>
  <div class="feature-item"><span class="check">✓</span><span><strong>{{{{fitur_5_judul}}}}</strong><br/><small>{{{{fitur_5_desc}}}}</small></span></div>
  <div class="feature-item"><span class="check">✓</span><span><strong>{{{{fitur_6_judul}}}}</strong><br/><small>{{{{fitur_6_desc}}}}</small></span></div>
</div>

<h2>Paket dan Harga</h2>
<div class="price-card">
  <div style="display:flex; justify-content:space-between; align-items:center;">
    <div>
      <div style="font-size:10pt; text-transform:uppercase; color:#4f46e5; font-weight:bold;">{{{{nama_paket}}}}</div>
      <div class="price">Rp {{{{harga_normal}}}}</div>
      <div class="period">{{{{periode_harga}}}}</div>
    </div>
    <div style="text-align:right;">
      <div style="background:#dcfce7; color:#166534; padding:6px 14px; border-radius:99px; font-weight:bold; font-size:13pt;">HEMAT {{{{persen_hemat}}}}%</div>
      <div style="font-size:10pt; color:#64748b; margin-top:6px; text-decoration:line-through;">Normal: Rp {{{{harga_normal_coret}}}}</div>
    </div>
  </div>
  <div style="border-top:1px solid #e2e8f0; margin-top:14px; padding-top:14px;">
    <strong>Termasuk:</strong>
    <ul style="margin:8px 0 0 20px; line-height:2;">
      <li>{{{{inclus_1}}}}</li>
      <li>{{{{inclus_2}}}}</li>
      <li>{{{{inclus_3}}}}</li>
      <li>{{{{inclus_4}}}}</li>
    </ul>
  </div>
  <div style="border-top:1px solid #e2e8f0; margin-top:12px; padding-top:12px; font-size:10pt; color:#64748b;">
    * Harga belum termasuk PPN {{{{persen_ppn}}}}%. Penawaran berlaku hingga <strong>{{{{berlaku_hingga}}}}</strong>.
  </div>
</div>

<h2>Apa Kata Klien Kami</h2>
<div class="testimonial">
  <p>"{{{{testimoni_1}}}}"</p>
  <p style="font-style:normal; margin-top:8px; font-size:10pt; color:#374151;">
    — <strong>{{{{testimoni_1_nama}}}}</strong>, {{{{testimoni_1_jabatan}}}}, {{{{testimoni_1_perusahaan}}}}
  </p>
</div>

<h2>Langkah Selanjutnya</h2>
<div class="timeline">
  <div class="timeline-item">
    <div class="step">Langkah 1 &mdash; {{{{langkah_1_judul}}}}</div>
    <div>{{{{langkah_1_desc}}}}</div>
  </div>
  <div class="timeline-item">
    <div class="step">Langkah 2 &mdash; {{{{langkah_2_judul}}}}</div>
    <div>{{{{langkah_2_desc}}}}</div>
  </div>
  <div class="timeline-item">
    <div class="step">Langkah 3 &mdash; {{{{langkah_3_judul}}}}</div>
    <div>{{{{langkah_3_desc}}}}</div>
  </div>
</div>

<div class="cta-box">
  <h2>Siap Memulai?</h2>
  <p>Hubungi kami sekarang dan dapatkan konsultasi gratis selama {{{{durasi_konsultasi}}}} menit.</p>
  <div style="margin-top:14px;">
    📧 <strong>{{{{email_perusahaan}}}}</strong> &nbsp;&nbsp;
    📱 <strong>{{{{telepon_perusahaan}}}}</strong> &nbsp;&nbsp;
    🌐 <strong>{{{{website_perusahaan}}}}</strong>
  </div>
</div>

<div class="sig-section">
<p>Demikian proposal ini kami sampaikan. Kami berharap dapat menjadi mitra terpercaya <strong>{{{{nama_perusahaan_tujuan}}}}</strong>.</p>
<div class="sig-row" style="justify-content:flex-start;">
  <div class="sig-block" style="text-align:left;">
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_sales}}}}</div>
    <div class="sig-title">{{{{jabatan_sales}}}}</div>
    <div class="sig-title">{{{{nama_perusahaan}}}}</div>
  </div>
</div>
</div>
</body></html>"""

for tid, name, body in [
    (IDS["inv"],       "Invoice",           INV),
    (IDS["po"],        "Purchase Order",    PO),
    (IDS["kuitansi"],  "Kuitansi",          KUITANSI),
    (IDS["tugas"],     "Surat Tugas",       TUGAS),
    (IDS["ba"],        "Berita Acara",      BA),
    (IDS["penawaran"], "Surat Penawaran",   PENAWARAN),
]:
    v, err = post_version(tid, body)
    if v: print(f"  [OK v{v}]  {name}")
    else: print(f"  [ERR]    {name}: {err}")
