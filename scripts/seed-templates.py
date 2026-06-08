#!/usr/bin/env python3
"""Seed company document templates via the API."""
import sys, json, urllib.request, urllib.error

TOKEN = open("C:/xampp/htdocs/docgen/scripts/.seed_token").read().strip()
BASE = "http://127.0.0.1:3001/v1"

STYLE = """<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; margin: 40px 50px; color: #111; line-height: 1.6; }
  .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 16px; }
  .company-name { font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
  .company-sub { font-size: 10pt; color: #555; }
  h1 { text-align: center; font-size: 14pt; text-transform: uppercase; text-decoration: underline; margin: 20px 0; }
  h2 { font-size: 12pt; margin-top: 20px; }
  .field-table { width: 100%; }
  .field-table td { padding: 3px 6px; vertical-align: top; }
  .field-table td:first-child { width: 200px; white-space: nowrap; }
  .field-table td:nth-child(2) { width: 16px; }
  .signature-row { display: flex; justify-content: space-between; margin-top: 60px; }
  .sig-block { text-align: center; width: 200px; }
  .sig-line { border-top: 1px solid #333; margin-top: 70px; padding-top: 6px; font-weight: bold; }
  .sig-title { font-size: 10pt; color: #555; }
  .pasal { margin-top: 18px; }
  .number { margin-left: 20px; }
</style>"""

T = [
  # ── HR ──────────────────────────────────────────────────────
  ("Kontrak Kerja Tetap (PKWTT)", "HR", f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{STYLE}</head><body>
<div class="header">
  <div class="company-name">{{{{nama_perusahaan}}}}</div>
  <div class="company-sub">{{{{alamat_perusahaan}}}} | {{{{telepon_perusahaan}}}}</div>
</div>
<h1>Perjanjian Kerja Waktu Tidak Tertentu (PKWTT)</h1>
<p>Nomor: <strong>{{{{nomor_kontrak}}}}</strong></p>
<p>Perjanjian kerja ini dibuat dan ditandatangani pada hari <strong>{{{{hari}}}}</strong>, tanggal <strong>{{{{tanggal_kontrak}}}}</strong>, antara:</p>
<h2>Pihak Pertama (Pemberi Kerja)</h2>
<table class="field-table">
  <tr><td>Nama Perusahaan</td><td>:</td><td>{{{{nama_perusahaan}}}}</td></tr>
  <tr><td>Diwakili oleh</td><td>:</td><td>{{{{nama_direktur}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_direktur}}}}</td></tr>
  <tr><td>Alamat</td><td>:</td><td>{{{{alamat_perusahaan}}}}</td></tr>
</table>
<h2>Pihak Kedua (Karyawan)</h2>
<table class="field-table">
  <tr><td>Nama Lengkap</td><td>:</td><td>{{{{nama_karyawan}}}}</td></tr>
  <tr><td>NIK / KTP</td><td>:</td><td>{{{{nik_karyawan}}}}</td></tr>
  <tr><td>Tempat / Tgl Lahir</td><td>:</td><td>{{{{tempat_lahir}}}}, {{{{tanggal_lahir}}}}</td></tr>
  <tr><td>Alamat</td><td>:</td><td>{{{{alamat_karyawan}}}}</td></tr>
</table>
<div class="pasal">
<h2>Pasal 1 – Posisi dan Tanggung Jawab</h2>
<p>Pihak Kedua diterima bekerja sebagai <strong>{{{{jabatan}}}}</strong> di Departemen <strong>{{{{departemen}}}}</strong>, mulai tanggal <strong>{{{{tanggal_mulai}}}}</strong>.</p>
</div>
<div class="pasal">
<h2>Pasal 2 – Kompensasi</h2>
<p>Gaji Pokok: Rp {{{{gaji_pokok}}}} / bulan | Tunjangan: Rp {{{{tunjangan}}}} / bulan.</p>
</div>
<div class="pasal">
<h2>Pasal 3 – Jam Kerja</h2>
<p>{{{{jam_kerja}}}} jam per hari, {{{{hari_kerja}}}} hari per minggu.</p>
</div>
<div class="pasal">
<h2>Pasal 4 – Ketentuan Lain</h2>
<p>Hal-hal yang belum diatur diselesaikan berdasarkan peraturan perusahaan dan perundangan ketenagakerjaan Indonesia.</p>
</div>
<div class="signature-row">
  <div class="sig-block"><p>Pihak Pertama</p><div class="sig-line">{{{{nama_direktur}}}}</div><div class="sig-title">{{{{jabatan_direktur}}}}</div></div>
  <div class="sig-block"><p>Pihak Kedua</p><div class="sig-line">{{{{nama_karyawan}}}}</div><div class="sig-title">Karyawan</div></div>
</div></body></html>"""),

  ("Surat Penawaran Kerja (Offer Letter)", "HR", f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{STYLE}</head><body>
<div class="header"><div class="company-name">{{{{nama_perusahaan}}}}</div><div class="company-sub">{{{{alamat_perusahaan}}}}</div></div>
<p>{{{{kota}}}}, {{{{tanggal_surat}}}}</p>
<p>Kepada Yth.<br/><strong>{{{{nama_kandidat}}}}</strong><br/>di Tempat</p>
<h1>Surat Penawaran Kerja</h1>
<p>Dengan hormat,</p>
<p>Setelah melalui proses seleksi, dengan senang hati kami menyampaikan bahwa Anda diterima bergabung di <strong>{{{{nama_perusahaan}}}}</strong>:</p>
<table class="field-table" style="margin:16px 0;">
  <tr><td>Jabatan</td><td>:</td><td><strong>{{{{jabatan}}}}</strong></td></tr>
  <tr><td>Departemen</td><td>:</td><td>{{{{departemen}}}}</td></tr>
  <tr><td>Tanggal Mulai</td><td>:</td><td>{{{{tanggal_mulai}}}}</td></tr>
  <tr><td>Gaji Pokok</td><td>:</td><td>Rp {{{{gaji_pokok}}}} / bulan</td></tr>
  <tr><td>Total Paket</td><td>:</td><td>Rp {{{{total_paket}}}} / bulan</td></tr>
  <tr><td>Status</td><td>:</td><td>{{{{status_karyawan}}}}</td></tr>
</table>
<p>Surat ini berlaku hingga <strong>{{{{batas_konfirmasi}}}}</strong>.</p>
<p>Hormat kami,</p>
<div class="signature-row" style="justify-content:flex-start;">
  <div class="sig-block" style="text-align:left;"><div class="sig-line">{{{{nama_hr}}}}</div><div class="sig-title">{{{{jabatan_hr}}}}</div></div>
</div></body></html>"""),

  ("Surat Keterangan Kerja", "HR", f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{STYLE}</head><body>
<div class="header"><div class="company-name">{{{{nama_perusahaan}}}}</div><div class="company-sub">{{{{alamat_perusahaan}}}} | {{{{telepon_perusahaan}}}}</div></div>
<h1>Surat Keterangan Kerja</h1>
<p style="text-align:center;">No: {{{{nomor_surat}}}}</p>
<p>Yang bertanda tangan di bawah ini:</p>
<table class="field-table">
  <tr><td>Nama</td><td>:</td><td>{{{{nama_penandatangan}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_penandatangan}}}}</td></tr>
</table>
<p style="margin-top:16px;">Menerangkan bahwa:</p>
<table class="field-table">
  <tr><td>Nama Lengkap</td><td>:</td><td><strong>{{{{nama_karyawan}}}}</strong></td></tr>
  <tr><td>NIK / KTP</td><td>:</td><td>{{{{nik_karyawan}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_karyawan}}}}</td></tr>
  <tr><td>Departemen</td><td>:</td><td>{{{{departemen}}}}</td></tr>
  <tr><td>Tanggal Bergabung</td><td>:</td><td>{{{{tanggal_bergabung}}}}</td></tr>
  <tr><td>Status</td><td>:</td><td>{{{{status_karyawan}}}}</td></tr>
</table>
<p style="margin-top:16px;">Adalah benar karyawan tetap kami yang masih aktif bekerja hingga saat ini.</p>
<p>Surat ini dibuat untuk keperluan <strong>{{{{keperluan}}}}</strong>.</p>
<p>{{{{kota}}}}, {{{{tanggal_surat}}}}</p>
<div class="signature-row" style="justify-content:flex-start;">
  <div class="sig-block" style="text-align:left;"><div class="sig-line">{{{{nama_penandatangan}}}}</div><div class="sig-title">{{{{jabatan_penandatangan}}}}</div></div>
</div></body></html>"""),

  ("Surat Peringatan SP-1", "HR", f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{STYLE}</head><body>
<div class="header"><div class="company-name">{{{{nama_perusahaan}}}}</div><div class="company-sub">{{{{alamat_perusahaan}}}}</div></div>
<h1>Surat Peringatan Pertama (SP-1)</h1>
<p style="text-align:center;">No: {{{{nomor_surat}}}}</p>
<p>Kepada:<br/><strong>{{{{nama_karyawan}}}}</strong> — {{{{jabatan_karyawan}}}} / {{{{departemen}}}}</p>
<p>Dengan hormat, berdasarkan evaluasi ditemukan pelanggaran sebagai berikut:</p>
<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:14px;margin:12px 0;">
  <strong>Pelanggaran:</strong><br/>{{{{deskripsi_pelanggaran}}}}
</div>
<p>Hal tersebut melanggar Peraturan Perusahaan Pasal {{{{pasal_dilanggar}}}} mengenai {{{{nama_pasal}}}}.</p>
<p>Apabila dalam <strong>{{{{masa_berlaku}}}}</strong> ke depan terjadi pelanggaran lagi, akan diterbitkan SP-2.</p>
<div class="signature-row">
  <div class="sig-block"><p>HRD Manager</p><div class="sig-line">{{{{nama_hrd}}}}</div></div>
  <div class="sig-block"><p>Yang Bersangkutan</p><div class="sig-line">{{{{nama_karyawan}}}}</div></div>
</div></body></html>"""),

  # ── LEGAL ──────────────────────────────────────────────────────
  ("Non-Disclosure Agreement (NDA)", "Legal", f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{STYLE}</head><body>
<div class="header"><div class="company-name">Perjanjian Kerahasiaan</div><div class="company-sub">Non-Disclosure Agreement</div></div>
<p>Perjanjian ini dibuat pada tanggal <strong>{{{{tanggal_perjanjian}}}}</strong> antara:</p>
<table class="field-table" style="margin:12px 0;">
  <tr><td><b>Pihak Pengungkap</b></td><td>:</td><td>{{{{nama_pihak_a}}}}, beralamat di {{{{alamat_pihak_a}}}}</td></tr>
  <tr><td><b>Pihak Penerima</b></td><td>:</td><td>{{{{nama_pihak_b}}}}, beralamat di {{{{alamat_pihak_b}}}}</td></tr>
</table>
<div class="pasal"><h2>Pasal 1 – Definisi Informasi Rahasia</h2>
<p>Informasi Rahasia mencakup seluruh informasi teknis, bisnis, keuangan, strategi yang diungkapkan Pihak Pengungkap.</p></div>
<div class="pasal"><h2>Pasal 2 – Kewajiban Kerahasiaan</h2>
<p>Pihak Penerima wajib merahasiakan, tidak mengungkapkan, dan hanya menggunakan untuk tujuan <strong>{{{{tujuan_perjanjian}}}}</strong>.</p></div>
<div class="pasal"><h2>Pasal 3 – Masa Berlaku</h2>
<p>Berlaku selama <strong>{{{{masa_berlaku}}}}</strong> tahun dari tanggal ditandatangani.</p></div>
<div class="pasal"><h2>Pasal 4 – Hukum yang Berlaku</h2>
<p>Perjanjian tunduk hukum Indonesia. Sengketa diselesaikan di Pengadilan Negeri {{{{pengadilan_pilihan}}}}.</p></div>
<div class="signature-row">
  <div class="sig-block"><p>Pihak Pengungkap</p><div class="sig-line">{{{{nama_ttd_pihak_a}}}}</div><div class="sig-title">{{{{jabatan_pihak_a}}}}</div></div>
  <div class="sig-block"><p>Pihak Penerima</p><div class="sig-line">{{{{nama_ttd_pihak_b}}}}</div><div class="sig-title">{{{{jabatan_pihak_b}}}}</div></div>
</div></body></html>"""),

  ("Surat Perjanjian Kerjasama (MOU)", "Legal", f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{STYLE}</head><body>
<div class="header"><div class="company-name">Surat Perjanjian Kerjasama</div><div class="company-sub">Memorandum of Understanding (MOU)</div></div>
<p>Pada hari <strong>{{{{hari}}}}</strong> tanggal <strong>{{{{tanggal_perjanjian}}}}</strong> telah disepakati Perjanjian Kerjasama antara:</p>
<h2>Pihak Pertama</h2>
<table class="field-table">
  <tr><td>Nama</td><td>:</td><td>{{{{nama_pihak_1}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_pihak_1}}}}</td></tr>
  <tr><td>Perusahaan</td><td>:</td><td>{{{{perusahaan_pihak_1}}}}</td></tr>
</table>
<h2>Pihak Kedua</h2>
<table class="field-table">
  <tr><td>Nama</td><td>:</td><td>{{{{nama_pihak_2}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_pihak_2}}}}</td></tr>
  <tr><td>Perusahaan</td><td>:</td><td>{{{{perusahaan_pihak_2}}}}</td></tr>
</table>
<div class="pasal"><h2>Pasal 1 – Ruang Lingkup</h2><p>Para pihak bekerjasama dalam bidang <strong>{{{{bidang_kerjasama}}}}</strong>: {{{{ruang_lingkup}}}}.</p></div>
<div class="pasal"><h2>Pasal 2 – Jangka Waktu</h2><p>Berlaku sejak <strong>{{{{tanggal_mulai}}}}</strong> hingga <strong>{{{{tanggal_selesai}}}}</strong>.</p></div>
<div class="pasal"><h2>Pasal 3 – Pembatalan</h2><p>Dapat dibatalkan dengan pemberitahuan tertulis minimal <strong>{{{{notifikasi_hari}}}}</strong> hari.</p></div>
<div class="signature-row">
  <div class="sig-block"><p>Pihak Pertama</p><div class="sig-line">{{{{nama_pihak_1}}}}</div><div class="sig-title">{{{{perusahaan_pihak_1}}}}</div></div>
  <div class="sig-block"><p>Pihak Kedua</p><div class="sig-line">{{{{nama_pihak_2}}}}</div><div class="sig-title">{{{{perusahaan_pihak_2}}}}</div></div>
</div></body></html>"""),

  ("Surat Kuasa", "Legal", f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{STYLE}</head><body>
<div class="header"><div class="company-name">{{{{nama_perusahaan}}}}</div><div class="company-sub">{{{{alamat_perusahaan}}}}</div></div>
<h1>Surat Kuasa</h1><p style="text-align:center;">No: {{{{nomor_surat}}}}</p>
<p>Yang bertanda tangan di bawah ini (<b>Pemberi Kuasa</b>):</p>
<table class="field-table">
  <tr><td>Nama</td><td>:</td><td><strong>{{{{nama_pemberi_kuasa}}}}</strong></td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_pemberi_kuasa}}}}</td></tr>
</table>
<p style="margin-top:14px;">Memberikan kuasa kepada (<b>Penerima Kuasa</b>):</p>
<table class="field-table">
  <tr><td>Nama</td><td>:</td><td><strong>{{{{nama_penerima_kuasa}}}}</strong></td></tr>
  <tr><td>NIK / KTP</td><td>:</td><td>{{{{nik_penerima_kuasa}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_penerima_kuasa}}}}</td></tr>
</table>
<p style="margin-top:14px;">Untuk:</p>
<div style="background:#f8f9fa;border-left:4px solid #6c757d;padding:12px 16px;margin:8px 0;">{{{{deskripsi_kuasa}}}}</div>
<p>Berlaku dari <strong>{{{{tanggal_mulai}}}}</strong> hingga <strong>{{{{tanggal_berakhir}}}}</strong>.</p>
<div class="signature-row">
  <div class="sig-block"><p>Pemberi Kuasa</p><div class="sig-line">{{{{nama_pemberi_kuasa}}}}</div><div class="sig-title">{{{{jabatan_pemberi_kuasa}}}}</div></div>
  <div class="sig-block"><p>Penerima Kuasa</p><div class="sig-line">{{{{nama_penerima_kuasa}}}}</div></div>
</div></body></html>"""),

  # ── KEUANGAN ─────────────────────────────────────────────────
  ("Invoice / Faktur Penjualan", "Keuangan", f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{STYLE}
<style>
  .inv-header {{ display:flex; justify-content:space-between; margin-bottom:24px; }}
  .inv-table {{ width:100%; border-collapse:collapse; margin:16px 0; }}
  .inv-table th {{ background:#374151; color:#fff; text-align:left; padding:8px 10px; }}
  .inv-table td {{ padding:8px 10px; border-bottom:1px solid #e5e7eb; }}
  .inv-table tr:nth-child(even) td {{ background:#f9fafb; }}
  .inv-total {{ text-align:right; }}
</style></head><body>
<div class="inv-header">
  <div><div class="company-name" style="font-size:18pt;">{{{{nama_perusahaan}}}}</div><div>{{{{alamat_perusahaan}}}}</div></div>
  <div style="text-align:right;">
    <div style="font-size:24pt;font-weight:bold;color:#4f46e5;">INVOICE</div>
    <div>No: <strong>{{{{nomor_invoice}}}}</strong></div>
    <div>Tanggal: {{{{tanggal_invoice}}}}</div>
    <div>Jatuh Tempo: {{{{jatuh_tempo}}}}</div>
  </div>
</div>
<div style="background:#f3f4f6;padding:14px;border-radius:8px;margin-bottom:20px;">
  <strong>Tagihan kepada:</strong><br/><strong>{{{{nama_klien}}}}</strong><br/>{{{{alamat_klien}}}}<br/>{{{{email_klien}}}}
</div>
<table class="inv-table">
  <thead><tr><th>#</th><th>Deskripsi</th><th>Qty</th><th style="text-align:right;">Harga</th><th style="text-align:right;">Total</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>{{{{deskripsi_item_1}}}}</td><td>{{{{qty_1}}}}</td><td style="text-align:right;">Rp {{{{harga_1}}}}</td><td style="text-align:right;">Rp {{{{subtotal_1}}}}</td></tr>
    <tr><td>2</td><td>{{{{deskripsi_item_2}}}}</td><td>{{{{qty_2}}}}</td><td style="text-align:right;">Rp {{{{harga_2}}}}</td><td style="text-align:right;">Rp {{{{subtotal_2}}}}</td></tr>
  </tbody>
</table>
<div class="inv-total">
  <p>Subtotal: Rp {{{{subtotal}}}}</p>
  <p>PPN {{{{persen_ppn}}}}%: Rp {{{{ppn}}}}</p>
  <p><strong style="font-size:14pt;">TOTAL: Rp {{{{total}}}}</strong></p>
</div>
<div style="border-top:1px solid #e5e7eb;margin-top:20px;padding-top:12px;font-size:10pt;color:#555;">
  <p><strong>Rekening:</strong> Bank {{{{nama_bank}}}} | No. Rek: {{{{nomor_rekening}}}} | a/n {{{{nama_rekening}}}}</p>
</div></body></html>"""),

  ("Purchase Order (PO)", "Keuangan", f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{STYLE}
<style>
  .po-table {{ width:100%; border-collapse:collapse; margin:16px 0; }}
  .po-table th {{ background:#1e3a5f; color:#fff; padding:8px 10px; text-align:left; }}
  .po-table td {{ padding:8px 10px; border-bottom:1px solid #e5e7eb; }}
</style></head><body>
<div class="header"><div class="company-name">{{{{nama_perusahaan}}}}</div><div class="company-sub">{{{{alamat_perusahaan}}}}</div></div>
<div style="display:flex;justify-content:space-between;margin-bottom:16px;">
  <h1 style="text-align:left;margin:0;font-size:18pt;color:#1e3a5f;text-decoration:none;">PURCHASE ORDER</h1>
  <div style="text-align:right;"><div>No PO: <strong>{{{{nomor_po}}}}</strong></div><div>Tanggal: {{{{tanggal_po}}}}</div><div>Pengiriman: {{{{tanggal_kirim}}}}</div></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
  <div style="background:#f8f9fa;padding:12px;border-radius:6px;"><strong>Dari (Pembeli):</strong><br/>{{{{nama_perusahaan}}}}<br/>{{{{alamat_perusahaan}}}}</div>
  <div style="background:#f8f9fa;padding:12px;border-radius:6px;"><strong>Kepada (Vendor):</strong><br/><strong>{{{{nama_vendor}}}}</strong><br/>{{{{alamat_vendor}}}}</div>
</div>
<table class="po-table">
  <thead><tr><th>No</th><th>Kode</th><th>Nama Barang/Jasa</th><th>Qty</th><th>Satuan</th><th style="text-align:right;">Harga</th><th style="text-align:right;">Total</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>{{{{kode_1}}}}</td><td>{{{{nama_barang_1}}}}</td><td>{{{{qty_1}}}}</td><td>{{{{satuan_1}}}}</td><td style="text-align:right;">Rp {{{{harga_1}}}}</td><td style="text-align:right;">Rp {{{{total_1}}}}</td></tr>
    <tr><td>2</td><td>{{{{kode_2}}}}</td><td>{{{{nama_barang_2}}}}</td><td>{{{{qty_2}}}}</td><td>{{{{satuan_2}}}}</td><td style="text-align:right;">Rp {{{{harga_2}}}}</td><td style="text-align:right;">Rp {{{{total_2}}}}</td></tr>
  </tbody>
</table>
<div style="text-align:right;font-size:13pt;"><p>PPN: Rp {{{{total_ppn}}}}</p><p><strong>TOTAL: Rp {{{{grand_total}}}}</strong></p></div>
<p><strong>Syarat Pembayaran:</strong> {{{{syarat_bayar}}}}</p>
<div class="signature-row" style="margin-top:40px;">
  <div class="sig-block"><p>Dibuat oleh</p><div class="sig-line">{{{{nama_pembuat}}}}</div><div class="sig-title">{{{{jabatan_pembuat}}}}</div></div>
  <div class="sig-block"><p>Disetujui oleh</p><div class="sig-line">{{{{nama_approver}}}}</div><div class="sig-title">{{{{jabatan_approver}}}}</div></div>
</div></body></html>"""),

  ("Kuitansi Pembayaran", "Keuangan", f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{STYLE}</head><body>
<div class="header"><div class="company-name">{{{{nama_perusahaan}}}}</div><div class="company-sub">{{{{alamat_perusahaan}}}}</div></div>
<h1>Kuitansi</h1><p style="text-align:center;">No: {{{{nomor_kuitansi}}}}</p>
<div style="border:2px solid #333;padding:20px;border-radius:8px;margin:20px 0;">
  <table class="field-table" style="font-size:13pt;">
    <tr><td>Telah terima dari</td><td>:</td><td><strong>{{{{nama_pembayar}}}}</strong></td></tr>
    <tr><td>Uang sejumlah</td><td>:</td><td><strong style="color:#166534;">Rp {{{{jumlah}}}}</strong></td></tr>
    <tr><td>Terbilang</td><td>:</td><td><em>{{{{terbilang}}}}</em></td></tr>
    <tr><td>Untuk pembayaran</td><td>:</td><td>{{{{keterangan}}}}</td></tr>
    <tr><td>Metode bayar</td><td>:</td><td>{{{{metode_bayar}}}}</td></tr>
  </table>
</div>
<div style="display:flex;justify-content:space-between;align-items:flex-end;">
  <p style="font-size:10pt;color:#555;">Kuitansi ini sah tanpa tanda tangan basah bila dicetak sistem.</p>
  <div class="sig-block"><p>{{{{kota}}}}, {{{{tanggal_bayar}}}}</p><div class="sig-line">{{{{nama_penerima}}}}</div><div class="sig-title">Penerima</div></div>
</div></body></html>"""),

  # ── OPERASIONAL ───────────────────────────────────────────────
  ("Surat Tugas", "Operasional", f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{STYLE}</head><body>
<div class="header"><div class="company-name">{{{{nama_perusahaan}}}}</div><div class="company-sub">{{{{alamat_perusahaan}}}}</div></div>
<h1>Surat Tugas</h1><p style="text-align:center;">No: {{{{nomor_surat}}}}</p>
<p>Yang bertanda tangan di bawah ini, <strong>{{{{nama_pemberi_tugas}}}}</strong> selaku <strong>{{{{jabatan_pemberi_tugas}}}}</strong>, dengan ini memberikan tugas kepada:</p>
<table class="field-table" style="margin:16px 0;">
  <tr><td>Nama</td><td>:</td><td><strong>{{{{nama_pegawai}}}}</strong></td></tr>
  <tr><td>NIK</td><td>:</td><td>{{{{nik_pegawai}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_pegawai}}}}</td></tr>
  <tr><td>Departemen</td><td>:</td><td>{{{{departemen}}}}</td></tr>
</table>
<p>Untuk melaksanakan tugas:</p>
<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;margin:8px 0;">
  <strong>{{{{judul_tugas}}}}</strong><br/>{{{{deskripsi_tugas}}}}
</div>
<table class="field-table" style="margin:16px 0;">
  <tr><td>Lokasi</td><td>:</td><td>{{{{lokasi}}}}</td></tr>
  <tr><td>Tanggal</td><td>:</td><td>{{{{tanggal_mulai}}}} s/d {{{{tanggal_selesai}}}}</td></tr>
  <tr><td>Biaya Perjalanan</td><td>:</td><td>Rp {{{{biaya_perjalanan}}}}</td></tr>
</table>
<p>{{{{kota}}}}, {{{{tanggal_surat}}}}</p>
<div class="signature-row" style="justify-content:flex-start;">
  <div class="sig-block" style="text-align:left;"><div class="sig-line">{{{{nama_pemberi_tugas}}}}</div><div class="sig-title">{{{{jabatan_pemberi_tugas}}}}</div></div>
</div></body></html>"""),

  ("Berita Acara", "Operasional", f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{STYLE}</head><body>
<div class="header"><div class="company-name">{{{{nama_perusahaan}}}}</div><div class="company-sub">{{{{alamat_perusahaan}}}}</div></div>
<h1>Berita Acara</h1>
<h2 style="text-align:center;font-weight:normal;font-size:13pt;">{{{{judul_ba}}}}</h2>
<p style="text-align:center;">No: {{{{nomor_ba}}}}</p>
<p>Pada hari <strong>{{{{hari}}}}</strong>, tanggal <strong>{{{{tanggal_ba}}}}</strong>, bertempat di <strong>{{{{lokasi}}}}</strong>, telah dilaksanakan {{{{judul_ba}}}}.</p>
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;"><strong>Uraian:</strong><br/>{{{{uraian_ba}}}}</div>
<p><strong>Peserta yang hadir:</strong></p>
<table style="width:100%;border-collapse:collapse;margin:8px 0;">
  <thead><tr style="background:#374151;color:#fff;"><th style="padding:8px;">No</th><th style="padding:8px;">Nama</th><th style="padding:8px;">Jabatan</th><th style="padding:8px;">TTD</th></tr></thead>
  <tbody>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">1</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">{{{{peserta_1_nama}}}}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">{{{{peserta_1_jabatan}}}}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;"> </td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">2</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">{{{{peserta_2_nama}}}}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">{{{{peserta_2_jabatan}}}}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;"> </td></tr>
  </tbody>
</table>
<p><strong>Kesimpulan:</strong></p><p>{{{{kesimpulan}}}}</p>
<div class="signature-row">
  <div class="sig-block"><p>Dibuat oleh</p><div class="sig-line">{{{{nama_pembuat}}}}</div><div class="sig-title">{{{{jabatan_pembuat}}}}</div></div>
  <div class="sig-block"><p>Mengetahui</p><div class="sig-line">{{{{nama_mengetahui}}}}</div><div class="sig-title">{{{{jabatan_mengetahui}}}}</div></div>
</div></body></html>"""),

  # ── MARKETING ─────────────────────────────────────────────────
  ("Surat Penawaran Produk/Jasa", "Marketing", f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{STYLE}
<style>
  .highlight-box {{ background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:#fff; padding:20px 24px; border-radius:10px; margin:16px 0; }}
  .price-badge {{ background:#fff; color:#4f46e5; font-size:18pt; font-weight:bold; padding:6px 16px; border-radius:6px; display:inline-block; }}
</style></head><body>
<div class="header"><div class="company-name">{{{{nama_perusahaan}}}}</div><div class="company-sub">{{{{tagline_perusahaan}}}}</div></div>
<p>{{{{kota}}}}, {{{{tanggal_surat}}}}</p>
<p>Kepada Yth.<br/><strong>{{{{nama_kontak}}}}</strong><br/>{{{{nama_perusahaan_tujuan}}}}</p>
<h1>Penawaran {{{{nama_produk_jasa}}}}</h1>
<p>Dengan hormat, kami dari <strong>{{{{nama_perusahaan}}}}</strong> menawarkan solusi <strong>{{{{nama_produk_jasa}}}}</strong> untuk kebutuhan bisnis Anda.</p>
<div class="highlight-box">
  <h2 style="color:#fff;margin-bottom:8px;">Paket {{{{nama_paket}}}}</h2>
  <ul style="color:#fff;list-style:none;padding:0;">
    <li>✓ {{{{benefit_1}}}}</li>
    <li>✓ {{{{benefit_2}}}}</li>
    <li>✓ {{{{benefit_3}}}}</li>
  </ul>
  <div style="margin-top:14px;">Harga Spesial: <span class="price-badge">Rp {{{{harga}}}}</span></div>
  <div style="font-size:10pt;margin-top:6px;opacity:0.85;">Berlaku hingga {{{{berlaku_hingga}}}}</div>
</div>
<p>Hubungi kami: {{{{email_perusahaan}}}} | {{{{telepon_perusahaan}}}}</p>
<p>Hormat kami,</p>
<div class="signature-row" style="justify-content:flex-start;">
  <div class="sig-block" style="text-align:left;"><div class="sig-line">{{{{nama_sales}}}}</div><div class="sig-title">{{{{jabatan_sales}}}}</div></div>
</div></body></html>"""),
]

def create(name, category, body):
    payload = json.dumps({"name": name, "category": category, "body": body}).encode()
    req = urllib.request.Request(
        f"{BASE}/templates",
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            resp = json.load(r)
            return resp["template"]["id"], True
    except urllib.error.HTTPError as e:
        body_err = e.read().decode()
        if "already exists" in body_err or "conflict" in body_err.lower():
            return None, "exists"
        return body_err[:80], False

ok, skip, err = 0, 0, 0
for name, category, body in T:
    tid, status = create(name, category, body)
    if status is True:
        ok += 1
        print(f"  [OK]     [{category:10}] {name}")
    elif status == "exists":
        skip += 1
        print(f"  [SKIP]   [{category:10}] {name}")
    else:
        err += 1
        print(f"  [ERR]    [{category:10}] {name}: {tid}")

print(f"\nHasil: {ok} dibuat, {skip} sudah ada, {err} error")
