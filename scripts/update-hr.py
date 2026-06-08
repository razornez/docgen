import json, urllib.request, urllib.error

TOKEN = open("C:/xampp/htdocs/docgen/scripts/.seed_token").read().strip()
BASE  = "http://127.0.0.1:3001/v1"

CSS = """<style>
  @page { margin: 40px 50px; }
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
  table.data { width:100%; border-collapse:collapse; margin:10px 0; }
  table.data th { background:#222; color:#fff; padding:7px 10px; text-align:left; font-size:11pt; }
  table.data td { padding:6px 10px; border-bottom:1px solid #e0e0e0; }
  table.data tr:nth-child(even) td { background:#f9f9f9; }
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
    "pkwtt":   "tpl_Kl9Ejz7JXWet01yYjlPPgp",
    "offer":   "tpl_ePuOJwnVPlExD4fQQAyt7w",
    "skkj":    "tpl_21b4HiLuz77OQSdSTsWIlc",
    "sp1":     "tpl_qugwn4XByOZB2opEkE4gnV",
}

# ── 1. PKWTT ──────────────────────────────────────────────────────────────────
PKWTT = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{CSS}</head><body>
<div class="header">
  <div class="co">{{{{nama_perusahaan}}}}</div>
  <div class="co-sub">{{{{alamat_perusahaan}}}} &nbsp;|&nbsp; Telp. {{{{telepon_perusahaan}}}} &nbsp;|&nbsp; {{{{email_perusahaan}}}}</div>
</div>

<div class="doc-title">Perjanjian Kerja Waktu Tidak Tertentu</div>
<div class="doc-no">Nomor: {{{{nomor_kontrak}}}}</div>

<p>Pada hari <strong>{{{{hari}}}}</strong>, tanggal <strong>{{{{tanggal_kontrak}}}}</strong>, bertempat di <strong>{{{{kota}}}}</strong>, telah dibuat dan ditandatangani Perjanjian Kerja Waktu Tidak Tertentu (selanjutnya disebut <em>"Perjanjian"</em>) oleh dan antara:</p>

<h2>Pihak Pertama &mdash; Perusahaan</h2>
<table class="ft">
  <tr><td>Nama Perusahaan</td><td>:</td><td><strong>{{{{nama_perusahaan}}}}</strong></td></tr>
  <tr><td>Bentuk Badan Hukum</td><td>:</td><td>{{{{bentuk_badan_hukum}}}}</td></tr>
  <tr><td>Alamat</td><td>:</td><td>{{{{alamat_perusahaan}}}}</td></tr>
  <tr><td>Diwakili oleh</td><td>:</td><td>{{{{nama_direktur}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_direktur}}}}</td></tr>
  <tr><td>Bertindak untuk</td><td>:</td><td>dan atas nama {{{{nama_perusahaan}}}}</td></tr>
</table>
<p>Selanjutnya disebut <strong>"Perusahaan"</strong>.</p>

<h2>Pihak Kedua &mdash; Karyawan</h2>
<table class="ft">
  <tr><td>Nama Lengkap</td><td>:</td><td><strong>{{{{nama_karyawan}}}}</strong></td></tr>
  <tr><td>NIK / KTP</td><td>:</td><td>{{{{nik_karyawan}}}}</td></tr>
  <tr><td>Tempat / Tgl Lahir</td><td>:</td><td>{{{{tempat_lahir}}}}, {{{{tanggal_lahir}}}}</td></tr>
  <tr><td>Jenis Kelamin</td><td>:</td><td>{{{{jenis_kelamin}}}}</td></tr>
  <tr><td>Alamat KTP</td><td>:</td><td>{{{{alamat_ktp}}}}</td></tr>
  <tr><td>Alamat Domisili</td><td>:</td><td>{{{{alamat_domisili}}}}</td></tr>
  <tr><td>No. HP</td><td>:</td><td>{{{{nomor_hp}}}}</td></tr>
  <tr><td>Pendidikan Terakhir</td><td>:</td><td>{{{{pendidikan_terakhir}}}}</td></tr>
</table>
<p>Selanjutnya disebut <strong>"Karyawan"</strong>.</p>

<p>Perusahaan dan Karyawan secara bersama-sama disebut <em>"Para Pihak"</em>, dengan ini sepakat untuk mengadakan Perjanjian dengan ketentuan-ketentuan sebagai berikut:</p>

<div class="pasal">
<div class="pasal-judul">Pasal 1 &mdash; Pengangkatan dan Penempatan</div>
<div class="ayat">1.1 &nbsp; Perusahaan menerima dan mengangkat Karyawan sebagai <strong>{{{{jabatan}}}}</strong> pada Departemen <strong>{{{{departemen}}}}</strong>, terhitung mulai tanggal <strong>{{{{tanggal_mulai}}}}</strong>.</div>
<div class="ayat">1.2 &nbsp; Karyawan ditempatkan di <strong>{{{{lokasi_kerja}}}}</strong>. Perusahaan berhak memindahtugaskan Karyawan ke lokasi lain sesuai kebutuhan bisnis dengan pemberitahuan wajar.</div>
<div class="ayat">1.3 &nbsp; Karyawan menyatakan menerima pengangkatan dan penempatan tersebut dengan penuh kesadaran dan tanpa paksaan.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 2 &mdash; Masa Percobaan</div>
<div class="ayat">2.1 &nbsp; Karyawan menjalani masa percobaan selama <strong>{{{{masa_percobaan}}}} ({{{{masa_percobaan_teks}}}}) bulan</strong>, terhitung dari tanggal mulai bekerja.</div>
<div class="ayat">2.2 &nbsp; Selama masa percobaan, Perusahaan berhak mengakhiri hubungan kerja sewaktu-waktu tanpa pesangon apabila kinerja Karyawan tidak memenuhi standar yang ditetapkan.</div>
<div class="ayat">2.3 &nbsp; Apabila Karyawan lulus evaluasi masa percobaan, status Karyawan akan diangkat menjadi karyawan tetap secara otomatis.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 3 &mdash; Jam Kerja</div>
<div class="ayat">3.1 &nbsp; Jam kerja normal adalah <strong>{{{{jam_kerja}}}} ({{{{jam_kerja_teks}}}}) jam</strong> per hari, <strong>{{{{hari_kerja}}}} hari</strong> per minggu ({{{{hari_kerja_detail}}}}).</div>
<div class="ayat">3.2 &nbsp; Jam kerja: {{{{jam_masuk}}}} &ndash; {{{{jam_keluar}}}} WIB, istirahat {{{{jam_istirahat}}}}.</div>
<div class="ayat">3.3 &nbsp; Karyawan dapat diwajibkan lembur apabila diperlukan. Lembur dibayarkan sesuai ketentuan Undang-Undang Ketenagakerjaan yang berlaku.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 4 &mdash; Kompensasi dan Tunjangan</div>
<div class="ayat">4.1 &nbsp; Perusahaan memberikan kompensasi kepada Karyawan sebagai berikut:</div>
<table class="data" style="margin-left:24px; width:calc(100% - 24px);">
  <tr><td style="width:220px;">Gaji Pokok</td><td>:</td><td><strong>Rp {{{{gaji_pokok}}}}</strong> per bulan</td></tr>
  <tr><td>Tunjangan Jabatan</td><td>:</td><td>Rp {{{{tunjangan_jabatan}}}} per bulan</td></tr>
  <tr><td>Tunjangan Transport</td><td>:</td><td>Rp {{{{tunjangan_transport}}}} per bulan</td></tr>
  <tr><td>Tunjangan Makan</td><td>:</td><td>Rp {{{{tunjangan_makan}}}} per bulan</td></tr>
  <tr><td><strong>Total Take-Home Pay</strong></td><td>:</td><td><strong>Rp {{{{total_thp}}}} per bulan</strong></td></tr>
</table>
<div class="ayat">4.2 &nbsp; Gaji dibayarkan setiap tanggal {{{{tanggal_gajian}}}} melalui transfer ke rekening Bank {{{{bank_karyawan}}}} No. {{{{norek_karyawan}}}} atas nama Karyawan.</div>
<div class="ayat">4.3 &nbsp; Karyawan berhak atas Tunjangan Hari Raya (THR) sesuai ketentuan peraturan perundangan yang berlaku.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 5 &mdash; Cuti dan Izin</div>
<div class="ayat">5.1 &nbsp; Karyawan berhak atas cuti tahunan sebanyak <strong>{{{{cuti_tahunan}}}} hari kerja</strong> setelah bekerja minimal 12 bulan.</div>
<div class="ayat">5.2 &nbsp; Cuti sakit diberikan berdasarkan surat keterangan dokter yang sah. Cuti sakit panjang mengacu pada ketentuan BPJS Kesehatan dan UU Ketenagakerjaan.</div>
<div class="ayat">5.3 &nbsp; Cuti khusus (pernikahan, kelahiran anak, kematian keluarga inti, dll.) diberikan sesuai peraturan perusahaan yang berlaku.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 6 &mdash; Jaminan Sosial</div>
<div class="ayat">6.1 &nbsp; Perusahaan mendaftarkan Karyawan dalam program BPJS Ketenagakerjaan (JHT, JKK, JKM, JP) dan BPJS Kesehatan sesuai ketentuan perundangan yang berlaku.</div>
<div class="ayat">6.2 &nbsp; Iuran BPJS Ketenagakerjaan dan BPJS Kesehatan ditanggung bersama sesuai ketentuan yang berlaku.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 7 &mdash; Kerahasiaan</div>
<div class="ayat">7.1 &nbsp; Karyawan wajib menjaga kerahasiaan seluruh informasi bisnis, data klien, strategi, keuangan, dan aset intelektual Perusahaan, baik selama maupun setelah berakhirnya hubungan kerja.</div>
<div class="ayat">7.2 &nbsp; Pelanggaran kewajiban kerahasiaan memberikan hak kepada Perusahaan untuk menuntut ganti rugi sesuai peraturan perundangan yang berlaku.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 8 &mdash; Kode Etik dan Peraturan Perusahaan</div>
<div class="ayat">8.1 &nbsp; Karyawan wajib menaati seluruh peraturan perusahaan, kode etik, dan kebijakan yang ditetapkan Perusahaan, baik yang berlaku saat ini maupun yang ditetapkan di kemudian hari.</div>
<div class="ayat">8.2 &nbsp; Karyawan dilarang melakukan kegiatan yang menimbulkan konflik kepentingan atau bersaing langsung dengan bisnis Perusahaan.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 9 &mdash; Pengakhiran Perjanjian</div>
<div class="ayat">9.1 &nbsp; Hubungan kerja dapat diakhiri berdasarkan: (a) pengunduran diri Karyawan dengan pemberitahuan tertulis minimal {{{{masa_notice}}}} hari kalender; (b) pemutusan hubungan kerja oleh Perusahaan sesuai UU Ketenagakerjaan No. 13 Tahun 2003 beserta perubahannya; (c) berakhirnya masa kontrak (jika berlaku); atau (d) meninggal dunianya salah satu pihak.</div>
<div class="ayat">9.2 &nbsp; Hak-hak Karyawan pada saat pengakhiran hubungan kerja diselesaikan sesuai dengan peraturan perundangan ketenagakerjaan yang berlaku di Indonesia.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 10 &mdash; Penyelesaian Perselisihan</div>
<div class="ayat">10.1 &nbsp; Setiap perselisihan yang timbul dari Perjanjian ini diselesaikan secara musyawarah mufakat terlebih dahulu dalam jangka waktu 30 (tiga puluh) hari kerja.</div>
<div class="ayat">10.2 &nbsp; Apabila musyawarah tidak menghasilkan kesepakatan, para pihak sepakat untuk menempuh jalur mediasi atau Pengadilan Hubungan Industrial (PHI) sesuai peraturan perundangan yang berlaku.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 11 &mdash; Ketentuan Umum</div>
<div class="ayat">11.1 &nbsp; Perjanjian ini merupakan perjanjian yang lengkap dan menggantikan seluruh perjanjian lisan maupun tertulis sebelumnya antara Para Pihak mengenai hal yang sama.</div>
<div class="ayat">11.2 &nbsp; Setiap perubahan terhadap Perjanjian ini hanya sah apabila dibuat secara tertulis dan ditandatangani oleh Para Pihak.</div>
<div class="ayat">11.3 &nbsp; Perjanjian ini dibuat dalam rangkap 2 (dua), masing-masing bermeterai cukup dan mempunyai kekuatan hukum yang sama.</div>
</div>

<div class="sig-section">
<div class="sig-row">
  <div class="sig-block">
    <p>Pihak Pertama<br/><strong>{{{{nama_perusahaan}}}}</strong></p>
    <div class="materai">Materai<br/>Rp 10.000</div>
    <div class="sig-line">{{{{nama_direktur}}}}</div>
    <div class="sig-title">{{{{jabatan_direktur}}}}</div>
  </div>
  <div class="sig-block">
    <p>Pihak Kedua<br/><strong>Karyawan</strong></p>
    <div class="materai">Materai<br/>Rp 10.000</div>
    <div class="sig-line">{{{{nama_karyawan}}}}</div>
    <div class="sig-title">{{{{jabatan}}}}</div>
  </div>
</div>
<p style="text-align:center; font-size:10pt; color:#777; margin-top:30px;">
  Saksi-saksi:<br/>
  1. {{{{saksi_1}}}} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 2. {{{{saksi_2}}}}
</p>
</div>
</body></html>"""

# ── 2. OFFER LETTER ──────────────────────────────────────────────────────────
OFFER = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{CSS}</head><body>
<div class="header">
  <div class="co">{{{{nama_perusahaan}}}}</div>
  <div class="co-sub">{{{{alamat_perusahaan}}}} &nbsp;|&nbsp; {{{{telepon_perusahaan}}}} &nbsp;|&nbsp; {{{{email_perusahaan}}}}</div>
</div>

<p style="text-align:right;">{{{{kota}}}}, {{{{tanggal_surat}}}}</p>

<p>
Kepada Yth.<br/>
<strong>{{{{nama_kandidat}}}}</strong><br/>
{{{{alamat_kandidat}}}}<br/>
{{{{kota_kandidat}}}}
</p>

<p>Dengan Hormat,</p>

<p>Atas nama manajemen <strong>{{{{nama_perusahaan}}}}</strong>, kami mengucapkan terima kasih atas waktu dan antusiasme Anda selama proses rekrutmen. Setelah melalui evaluasi yang cermat, dengan bangga kami menyampaikan bahwa Anda terpilih untuk bergabung bersama kami.</p>

<div class="doc-title">Surat Penawaran Kerja</div>
<div class="doc-no">No. {{{{nomor_surat}}}}</div>

<h2>1. Posisi dan Penempatan</h2>
<table class="ft">
  <tr><td>Jabatan</td><td>:</td><td><strong>{{{{jabatan}}}}</strong></td></tr>
  <tr><td>Departemen</td><td>:</td><td>{{{{departemen}}}}</td></tr>
  <tr><td>Atasan Langsung</td><td>:</td><td>{{{{nama_atasan}}}}, {{{{jabatan_atasan}}}}</td></tr>
  <tr><td>Lokasi Kerja</td><td>:</td><td>{{{{lokasi_kerja}}}}</td></tr>
  <tr><td>Tanggal Mulai</td><td>:</td><td><strong>{{{{tanggal_mulai}}}}</strong></td></tr>
  <tr><td>Status Kepegawaian</td><td>:</td><td>{{{{status_kepegawaian}}}}</td></tr>
  <tr><td>Masa Percobaan</td><td>:</td><td>{{{{masa_percobaan}}}} bulan</td></tr>
</table>

<h2>2. Paket Kompensasi</h2>
<table class="data">
  <tr><th>Komponen</th><th>Jumlah (per bulan)</th><th>Keterangan</th></tr>
  <tr><td>Gaji Pokok</td><td>Rp {{{{gaji_pokok}}}}</td><td>Dibayar tanggal {{{{tanggal_gajian}}}}</td></tr>
  <tr><td>Tunjangan Jabatan</td><td>Rp {{{{tunjangan_jabatan}}}}</td><td>Sesuai level jabatan</td></tr>
  <tr><td>Tunjangan Transport</td><td>Rp {{{{tunjangan_transport}}}}</td><td>Hari kerja</td></tr>
  <tr><td>Tunjangan Makan</td><td>Rp {{{{tunjangan_makan}}}}</td><td>Hari kerja</td></tr>
  <tr><td><strong>Total Take-Home Pay</strong></td><td><strong>Rp {{{{total_thp}}}}</strong></td><td>&mdash;</td></tr>
</table>

<h2>3. Fasilitas dan Benefit</h2>
<ul style="margin-left:20px; line-height:2;">
  <li>BPJS Ketenagakerjaan dan BPJS Kesehatan (ditanggung perusahaan sesuai ketentuan)</li>
  <li>Cuti tahunan {{{{cuti_tahunan}}}} hari kerja (setelah 12 bulan bekerja)</li>
  <li>Tunjangan Hari Raya (THR) sesuai peraturan perundangan</li>
  <li>{{{{benefit_tambahan}}}}</li>
</ul>

<h2>4. Kewajiban Khusus</h2>
<p>Dalam peran ini, Anda akan bertanggung jawab untuk:</p>
<ul style="margin-left:20px; line-height:2;">
  <li>{{{{kewajiban_1}}}}</li>
  <li>{{{{kewajiban_2}}}}</li>
  <li>{{{{kewajiban_3}}}}</li>
</ul>

<h2>5. Syarat dan Ketentuan</h2>
<p>Penawaran ini berlaku selama <strong>{{{{masa_berlaku_offer}}}} hari kerja</strong> sejak tanggal surat ini diterbitkan. Sebelum memulai bekerja, Anda dimohon untuk:</p>
<ol style="margin-left:20px; line-height:2;">
  <li>Menandatangani dan mengembalikan salinan surat ini sebagai tanda persetujuan.</li>
  <li>Menyerahkan dokumen: fotokopi KTP, KK, ijazah terakhir, NPWP, buku rekening bank, dan pas foto {{{{ukuran_foto}}}}.</li>
  <li>Mengikuti program orientasi karyawan baru selama {{{{masa_orientasi}}}}.</li>
</ol>

<p>Penawaran ini tunduk pada kebijakan dan peraturan internal <strong>{{{{nama_perusahaan}}}}</strong>. Bergabungnya Anda sebagai anggota tim kami merupakan keputusan strategis dan kami yakin kontribusi Anda akan sangat berarti bagi pertumbuhan perusahaan.</p>

<p>Kami berharap dapat segera menyambut Anda di keluarga besar {{{{nama_perusahaan}}}}. Untuk konfirmasi dan pertanyaan, silakan hubungi Tim HRD kami di {{{{email_hrd}}}} atau {{{{telepon_hrd}}}}.</p>

<div class="sig-section">
<p>Hormat kami,</p>
<div class="sig-row" style="justify-content:flex-start; gap:80px;">
  <div class="sig-block" style="text-align:left;">
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_hr}}}}</div>
    <div class="sig-title">{{{{jabatan_hr}}}}</div>
    <div class="sig-title">{{{{nama_perusahaan}}}}</div>
  </div>
</div>
<br/>
<p style="margin-top:30px;">Saya yang bertanda tangan di bawah ini, <strong>{{{{nama_kandidat}}}}</strong>, menyatakan <strong>menerima / menolak*</strong> penawaran di atas.</p>
<div class="sig-row" style="justify-content:flex-start;">
  <div class="sig-block" style="text-align:left;">
    <p>{{{{kota}}}}, ___________________</p>
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_kandidat}}}}</div>
  </div>
</div>
<p style="font-size:10pt; color:#777;">*coret yang tidak perlu</p>
</div>
</body></html>"""

# ── 3. SURAT KETERANGAN KERJA ─────────────────────────────────────────────────
SKKJ = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{CSS}</head><body>
<div class="header">
  <div class="co">{{{{nama_perusahaan}}}}</div>
  <div class="co-sub">{{{{alamat_perusahaan}}}} &nbsp;|&nbsp; Telp. {{{{telepon_perusahaan}}}} &nbsp;|&nbsp; {{{{website_perusahaan}}}}</div>
</div>

<div class="doc-title">Surat Keterangan Kerja</div>
<div class="doc-no">Nomor: {{{{nomor_surat}}}}</div>

<p>Yang bertanda tangan di bawah ini:</p>
<table class="ft">
  <tr><td>Nama</td><td>:</td><td><strong>{{{{nama_penandatangan}}}}</strong></td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_penandatangan}}}}</td></tr>
  <tr><td>Perusahaan</td><td>:</td><td>{{{{nama_perusahaan}}}}</td></tr>
  <tr><td>Alamat</td><td>:</td><td>{{{{alamat_perusahaan}}}}</td></tr>
</table>

<p>Dengan ini menerangkan dengan sesungguhnya bahwa:</p>

<table class="ft" style="background:#f9f9f9; border:1px solid #ddd; padding:10px; border-radius:4px;">
  <tr><td>Nama Lengkap</td><td>:</td><td><strong>{{{{nama_karyawan}}}}</strong></td></tr>
  <tr><td>Tempat / Tgl Lahir</td><td>:</td><td>{{{{tempat_lahir}}}}, {{{{tanggal_lahir}}}}</td></tr>
  <tr><td>NIK / KTP</td><td>:</td><td>{{{{nik_karyawan}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td><strong>{{{{jabatan_karyawan}}}}</strong></td></tr>
  <tr><td>Departemen / Divisi</td><td>:</td><td>{{{{departemen}}}}</td></tr>
  <tr><td>Mulai Bekerja</td><td>:</td><td>{{{{tanggal_bergabung}}}}</td></tr>
  <tr><td>Masa Kerja</td><td>:</td><td>{{{{masa_kerja}}}}</td></tr>
  <tr><td>Status Kepegawaian</td><td>:</td><td>{{{{status_kepegawaian}}}}</td></tr>
  <tr><td>Gaji Pokok</td><td>:</td><td>Rp {{{{gaji_pokok}}}} per bulan</td></tr>
</table>

<p>Adalah benar merupakan <strong>{{{{status_kepegawaian}}}}</strong> pada <strong>{{{{nama_perusahaan}}}}</strong> yang <strong>masih aktif bekerja</strong> hingga saat surat ini diterbitkan.</p>

<p>Selama bekerja di {{{{nama_perusahaan}}}}, yang bersangkutan dikenal sebagai karyawan yang berdedikasi, memiliki integritas tinggi, dan memberikan kontribusi positif bagi perusahaan.</p>

<p>Surat keterangan ini diterbitkan atas permintaan yang bersangkutan dan digunakan khusus untuk keperluan <strong>{{{{keperluan}}}}</strong>. Perusahaan tidak bertanggung jawab apabila surat ini digunakan untuk keperluan lain.</p>

<p>Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>

<div class="sig-section">
<div class="sig-row" style="justify-content:flex-start;">
  <div class="sig-block" style="text-align:left;">
    <p>{{{{kota}}}}, {{{{tanggal_surat}}}}</p>
    <div class="materai" style="width:80px; height:80px;">Materai<br/>Rp 10.000</div>
    <div class="sig-line">{{{{nama_penandatangan}}}}</div>
    <div class="sig-title">{{{{jabatan_penandatangan}}}}</div>
    <div class="sig-title">{{{{nama_perusahaan}}}}</div>
  </div>
</div>
</div>

<p style="margin-top:30px; font-size:10pt; color:#777; border-top:1px dashed #ccc; padding-top:10px;">
  <em>Surat ini diterbitkan secara resmi oleh {{{{nama_perusahaan}}}} dan dapat diverifikasi dengan menghubungi HRD di {{{{email_hrd}}}} atau {{{{telepon_perusahaan}}}}.</em>
</p>
</body></html>"""

# ── 4. SP-1 ─────────────────────────────────────────────────────────────────
SP1 = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{CSS}</head><body>
<div class="header">
  <div class="co">{{{{nama_perusahaan}}}}</div>
  <div class="co-sub">{{{{alamat_perusahaan}}}} &nbsp;|&nbsp; Telp. {{{{telepon_perusahaan}}}}</div>
</div>

<div class="doc-title">Surat Peringatan Pertama (SP-I)</div>
<div class="doc-no">Nomor: {{{{nomor_surat}}}}</div>

<p>Pada hari <strong>{{{{hari}}}}</strong>, tanggal <strong>{{{{tanggal_surat}}}}</strong>, bertempat di {{{{kota}}}}, yang bertanda tangan di bawah ini:</p>
<table class="ft">
  <tr><td>Nama</td><td>:</td><td>{{{{nama_hrd}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_hrd}}}}</td></tr>
</table>
<p>Dengan ini menyampaikan Surat Peringatan Pertama kepada:</p>
<table class="ft">
  <tr><td>Nama Karyawan</td><td>:</td><td><strong>{{{{nama_karyawan}}}}</strong></td></tr>
  <tr><td>NIK</td><td>:</td><td>{{{{nik_karyawan}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_karyawan}}}}</td></tr>
  <tr><td>Departemen</td><td>:</td><td>{{{{departemen}}}}</td></tr>
  <tr><td>Mulai Bekerja</td><td>:</td><td>{{{{tanggal_bergabung}}}}</td></tr>
</table>

<h2>Kronologi dan Uraian Pelanggaran</h2>
<div class="note">
  <strong>Jenis Pelanggaran:</strong> {{{{jenis_pelanggaran}}}}<br/><br/>
  <strong>Tanggal Kejadian:</strong> {{{{tanggal_kejadian}}}}<br/><br/>
  <strong>Uraian:</strong><br/>
  {{{{uraian_pelanggaran}}}}<br/><br/>
  <strong>Pasal yang Dilanggar:</strong> Peraturan Perusahaan Pasal {{{{pasal_dilanggar}}}} tentang {{{{nama_pasal}}}}
</div>

<p>Berdasarkan pemeriksaan dan klarifikasi yang telah dilakukan, pelanggaran tersebut terbukti secara sah.</p>

<h2>Dampak Pelanggaran</h2>
<p>{{{{dampak_pelanggaran}}}}</p>

<h2>Tindakan Korektif yang Diharapkan</h2>
<ol style="margin-left:20px; line-height:2;">
  <li>{{{{tindakan_korektif_1}}}}</li>
  <li>{{{{tindakan_korektif_2}}}}</li>
  <li>{{{{tindakan_korektif_3}}}}</li>
</ol>

<h2>Konsekuensi</h2>
<p>Surat Peringatan Pertama ini berlaku selama <strong>{{{{masa_berlaku_sp}}}}</strong>. Apabila dalam masa berlaku ini Karyawan kembali melakukan pelanggaran &mdash; baik pelanggaran yang sama maupun pelanggaran lain &mdash; maka Perusahaan akan menerbitkan <strong>Surat Peringatan Kedua (SP-II)</strong>, dan apabila terjadi pelanggaran berikutnya, <strong>Surat Peringatan Ketiga (SP-III)</strong> yang dapat mengakibatkan Pemutusan Hubungan Kerja (PHK) sesuai ketentuan perundangan yang berlaku.</p>

<p>Kami berharap Karyawan dapat memahami dan memperbaiki perilaku serta kinerjanya, sehingga dapat terus berkontribusi secara positif bagi perusahaan dan rekan-rekan kerja.</p>

<div class="sig-section">
<div class="sig-row">
  <div class="sig-block">
    <p>Pemberi Peringatan</p>
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_hrd}}}}</div>
    <div class="sig-title">{{{{jabatan_hrd}}}}</div>
  </div>
  <div class="sig-block">
    <p>Atasan Langsung</p>
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_atasan}}}}</div>
    <div class="sig-title">{{{{jabatan_atasan}}}}</div>
  </div>
  <div class="sig-block">
    <p>Yang Bersangkutan</p>
    <div class="materai" style="width:80px; height:80px;">Materai<br/>Rp 10.000</div>
    <div class="sig-line">{{{{nama_karyawan}}}}</div>
    <div class="sig-title">Karyawan</div>
  </div>
</div>
<p style="font-size:10pt; color:#777; margin-top:20px;">
  Surat peringatan ini dibuat dalam 2 (dua) rangkap dan masing-masing dipegang oleh Perusahaan dan Karyawan yang bersangkutan.
</p>
</div>
</body></html>"""

UPDATES = [
    (IDS["pkwtt"], "Kontrak Kerja Tetap (PKWTT)", PKWTT),
    (IDS["offer"], "Surat Penawaran Kerja",        OFFER),
    (IDS["skkj"],  "Surat Keterangan Kerja",       SKKJ),
    (IDS["sp1"],   "Surat Peringatan SP-1",         SP1),
]

for tid, name, body in UPDATES:
    v, err = post_version(tid, body)
    if v:
        print(f"  [OK v{v}]  {name}")
    else:
        print(f"  [ERR]    {name}: {err}")
