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
    "nda":  "tpl_slg2zBTZfCsblUv3Vt3BQp",
    "mou":  "tpl_dild0ol9KqgDcmeNpiChWk",
    "kuasa":"tpl_3TOHansTxCt6OOLqIeFpm0",
}

NDA = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{CSS}</head><body>
<div class="header">
  <div class="co" style="font-size:14pt;">Perjanjian Kerahasiaan</div>
  <div class="co-sub" style="font-size:12pt;font-style:italic;">Non-Disclosure Agreement (NDA)</div>
</div>

<div class="doc-no">Nomor: {{{{nomor_nda}}}}</div>

<p>Perjanjian Kerahasiaan ini (<em>"Perjanjian"</em>) dibuat dan ditandatangani pada hari <strong>{{{{hari}}}}</strong>, tanggal <strong>{{{{tanggal_perjanjian}}}}</strong>, oleh dan antara:</p>

<h2>Para Pihak</h2>
<table class="ft">
  <tr><td><strong>Pihak Pengungkap</strong></td><td>:</td><td><strong>{{{{nama_pihak_a}}}}</strong>, {{{{bentuk_hukum_a}}}}, berkedudukan di {{{{alamat_pihak_a}}}}, diwakili oleh {{{{nama_ttd_pihak_a}}}} selaku {{{{jabatan_pihak_a}}}} (<em>"Pihak Pertama"</em>)</td></tr>
  <tr><td style="padding-top:8px;"><strong>Pihak Penerima</strong></td><td>:</td><td style="padding-top:8px;"><strong>{{{{nama_pihak_b}}}}</strong>, {{{{bentuk_hukum_b}}}}, berkedudukan di {{{{alamat_pihak_b}}}}, diwakili oleh {{{{nama_ttd_pihak_b}}}} selaku {{{{jabatan_pihak_b}}}} (<em>"Pihak Kedua"</em>)</td></tr>
</table>

<p>Pihak Pertama dan Pihak Kedua secara bersama-sama disebut <em>"Para Pihak"</em>.</p>

<div class="pasal">
<div class="pasal-judul">Pasal 1 &mdash; Latar Belakang dan Tujuan</div>
<div class="ayat">1.1 &nbsp; Para Pihak bermaksud untuk melakukan diskusi dan/atau kerjasama terkait <strong>{{{{tujuan_perjanjian}}}}</strong> (selanjutnya disebut <em>"Tujuan"</em>).</div>
<div class="ayat">1.2 &nbsp; Dalam rangka Tujuan tersebut, masing-masing Pihak mungkin mengungkapkan informasi yang bersifat rahasia kepada pihak lainnya.</div>
<div class="ayat">1.3 &nbsp; Para Pihak sepakat untuk saling menjaga kerahasiaan informasi yang diungkapkan sesuai dengan ketentuan Perjanjian ini.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 2 &mdash; Definisi Informasi Rahasia</div>
<div class="ayat">2.1 &nbsp; <em>"Informasi Rahasia"</em> berarti seluruh informasi, data, dokumen, materi, atau pengetahuan dalam bentuk apapun (tertulis, lisan, elektronik, visual, atau bentuk lainnya) yang diungkapkan oleh Pihak Pertama kepada Pihak Kedua, yang secara wajar dianggap rahasia, termasuk namun tidak terbatas pada:</div>
<div class="ayat" style="margin-left:48px;">
  a. Informasi bisnis: rencana bisnis, strategi, proyeksi keuangan, data penjualan, daftar klien/vendor;<br/>
  b. Informasi teknis: kode program, formula, desain, proses manufaktur, metode;<br/>
  c. Informasi produk: spesifikasi, roadmap, fitur yang belum dipublikasikan;<br/>
  d. Informasi hukum: perjanjian, perizinan, sengketa yang sedang berjalan;<br/>
  e. Informasi sumber daya manusia: data karyawan, kompensasi, evaluasi kinerja.
</div>
<div class="ayat">2.2 &nbsp; Informasi Rahasia tidak mencakup informasi yang: (a) telah atau menjadi milik publik bukan karena pelanggaran Perjanjian ini; (b) telah diketahui Pihak Kedua sebelum pengungkapan tanpa kewajiban kerahasiaan; (c) diterima dari pihak ketiga yang berhak mengungkapkannya; atau (d) dikembangkan secara independen oleh Pihak Kedua tanpa menggunakan Informasi Rahasia.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 3 &mdash; Kewajiban Pihak Kedua</div>
<div class="ayat">3.1 &nbsp; Pihak Kedua wajib: (a) menjaga Informasi Rahasia dengan standar kehati-hatian minimal sama dengan yang diterapkan untuk melindungi informasi rahasianya sendiri, namun tidak kurang dari standar kehati-hatian yang wajar; (b) tidak mengungkapkan Informasi Rahasia kepada pihak ketiga manapun tanpa persetujuan tertulis dari Pihak Pertama; (c) hanya menggunakan Informasi Rahasia untuk Tujuan yang ditetapkan dalam Perjanjian ini.</div>
<div class="ayat">3.2 &nbsp; Pihak Kedua dapat mengungkapkan Informasi Rahasia kepada karyawan, direktur, pejabat, konsultan, atau agennya (<em>"Perwakilan"</em>) yang memiliki kebutuhan untuk mengetahui (<em>need-to-know</em>) dalam rangka Tujuan, dengan syarat Perwakilan tersebut terikat oleh kewajiban kerahasiaan yang setara.</div>
<div class="ayat">3.3 &nbsp; Pihak Kedua wajib segera memberitahu Pihak Pertama apabila mengetahui adanya pengungkapan Informasi Rahasia yang tidak sah.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 4 &mdash; Pengungkapan yang Diwajibkan Hukum</div>
<div class="ayat">4.1 &nbsp; Apabila Pihak Kedua diwajibkan oleh peraturan perundangan atau perintah pengadilan untuk mengungkapkan Informasi Rahasia, Pihak Kedua wajib: (a) segera memberitahu Pihak Pertama secara tertulis; (b) memberikan kesempatan yang wajar kepada Pihak Pertama untuk mengajukan keberatan; dan (c) mengungkapkan hanya sebatas yang diwajibkan.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 5 &mdash; Kepemilikan Informasi</div>
<div class="ayat">5.1 &nbsp; Seluruh Informasi Rahasia tetap merupakan milik eksklusif Pihak Pertama. Perjanjian ini tidak mengalihkan hak kepemilikan apapun atas Informasi Rahasia kepada Pihak Kedua.</div>
<div class="ayat">5.2 &nbsp; Tidak ada lisensi, hak kekayaan intelektual, atau hak lainnya yang diberikan kepada Pihak Kedua atas dasar Perjanjian ini, kecuali hak terbatas untuk menggunakan Informasi Rahasia semata-mata untuk Tujuan.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 6 &mdash; Pengembalian Informasi</div>
<div class="ayat">6.1 &nbsp; Atas permintaan tertulis Pihak Pertama atau pada saat berakhirnya Perjanjian ini, Pihak Kedua wajib dalam waktu {{{{waktu_pengembalian}}}} hari kerja: (a) mengembalikan seluruh Informasi Rahasia dalam bentuk aslinya; atau (b) memusnahkan seluruh salinan Informasi Rahasia dan memberikan konfirmasi tertulis atas pemusnahan tersebut.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 7 &mdash; Jangka Waktu</div>
<div class="ayat">7.1 &nbsp; Perjanjian ini berlaku selama <strong>{{{{masa_berlaku}}}} ({{{{masa_berlaku_teks}}}}) tahun</strong> terhitung sejak tanggal ditandatangani, atau hingga seluruh Informasi Rahasia yang diungkapkan menjadi milik publik yang sah.</div>
<div class="ayat">7.2 &nbsp; Kewajiban kerahasiaan atas Informasi Rahasia yang diklasifikasikan sebagai rahasia dagang tetap berlaku tanpa batas waktu.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 8 &mdash; Ganti Rugi</div>
<div class="ayat">8.1 &nbsp; Para Pihak mengakui bahwa pelanggaran terhadap Perjanjian ini akan menimbulkan kerugian yang tidak dapat diperbaiki semata-mata dengan kompensasi uang. Oleh karena itu, Pihak Pertama berhak untuk mengajukan permohonan putusan sela atau injungsi tanpa perlu membuktikan kerugian aktual, di samping upaya hukum lainnya.</div>
<div class="ayat">8.2 &nbsp; Pihak Kedua setuju untuk membayar ganti rugi kepada Pihak Pertama atas seluruh kerugian, biaya, dan pengeluaran yang timbul akibat pelanggaran Perjanjian ini, termasuk biaya pengacara.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 9 &mdash; Hukum yang Berlaku dan Penyelesaian Sengketa</div>
<div class="ayat">9.1 &nbsp; Perjanjian ini tunduk pada dan ditafsirkan berdasarkan hukum Republik Indonesia.</div>
<div class="ayat">9.2 &nbsp; Setiap sengketa yang timbul dari atau berkaitan dengan Perjanjian ini diselesaikan melalui musyawarah mufakat dalam waktu 30 (tiga puluh) hari. Apabila tidak tercapai kesepakatan, sengketa diselesaikan melalui Pengadilan Negeri {{{{pengadilan_pilihan}}}} dengan yurisdiksi eksklusif.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 10 &mdash; Ketentuan Umum</div>
<div class="ayat">10.1 &nbsp; Perjanjian ini merupakan keseluruhan kesepakatan Para Pihak mengenai hal-hal yang diatur di dalamnya dan menggantikan seluruh diskusi, negosiasi, dan kesepakatan sebelumnya.</div>
<div class="ayat">10.2 &nbsp; Perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai, masing-masing mempunyai kekuatan hukum yang sama.</div>
</div>

<div class="sig-section">
<p>Demikian Perjanjian ini dibuat dan ditandatangani oleh Para Pihak pada tanggal tersebut di atas.</p>
<div class="sig-row">
  <div class="sig-block">
    <p><strong>Pihak Pertama</strong><br/>{{{{nama_pihak_a}}}}</p>
    <div class="materai">Materai<br/>Rp 10.000</div>
    <div class="sig-line">{{{{nama_ttd_pihak_a}}}}</div>
    <div class="sig-title">{{{{jabatan_pihak_a}}}}</div>
  </div>
  <div class="sig-block">
    <p><strong>Pihak Kedua</strong><br/>{{{{nama_pihak_b}}}}</p>
    <div class="materai">Materai<br/>Rp 10.000</div>
    <div class="sig-line">{{{{nama_ttd_pihak_b}}}}</div>
    <div class="sig-title">{{{{jabatan_pihak_b}}}}</div>
  </div>
</div>
</div>
</body></html>"""

MOU = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{CSS}</head><body>
<div class="header">
  <div class="co" style="font-size:14pt;">Surat Perjanjian Kerjasama</div>
  <div class="co-sub" style="font-size:11pt; font-style:italic;">Memorandum of Understanding (MOU)</div>
</div>
<div class="doc-no">Nomor: {{{{nomor_mou}}}}</div>

<p>Pada hari <strong>{{{{hari}}}}</strong>, tanggal <strong>{{{{tanggal_perjanjian}}}}</strong>, bertempat di <strong>{{{{kota_penandatanganan}}}}</strong>, telah disepakati Perjanjian Kerjasama antara:</p>

<h2>Pihak Pertama</h2>
<table class="ft">
  <tr><td>Nama / Instansi</td><td>:</td><td><strong>{{{{nama_pihak_1}}}}</strong></td></tr>
  <tr><td>Bentuk Hukum</td><td>:</td><td>{{{{bentuk_hukum_1}}}}</td></tr>
  <tr><td>Alamat</td><td>:</td><td>{{{{alamat_pihak_1}}}}</td></tr>
  <tr><td>Diwakili oleh</td><td>:</td><td>{{{{nama_wakil_1}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_wakil_1}}}}</td></tr>
</table>

<h2>Pihak Kedua</h2>
<table class="ft">
  <tr><td>Nama / Instansi</td><td>:</td><td><strong>{{{{nama_pihak_2}}}}</strong></td></tr>
  <tr><td>Bentuk Hukum</td><td>:</td><td>{{{{bentuk_hukum_2}}}}</td></tr>
  <tr><td>Alamat</td><td>:</td><td>{{{{alamat_pihak_2}}}}</td></tr>
  <tr><td>Diwakili oleh</td><td>:</td><td>{{{{nama_wakil_2}}}}</td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_wakil_2}}}}</td></tr>
</table>

<p>Selanjutnya Pihak Pertama dan Pihak Kedua secara bersama-sama disebut <em>"Para Pihak"</em>, dengan ini menyatakan sepakat untuk mengadakan Perjanjian Kerjasama dengan syarat dan ketentuan sebagai berikut:</p>

<div class="pasal">
<div class="pasal-judul">Pasal 1 &mdash; Latar Belakang</div>
<div class="ayat">1.1 &nbsp; Pihak Pertama adalah {{{{deskripsi_pihak_1}}}}.</div>
<div class="ayat">1.2 &nbsp; Pihak Kedua adalah {{{{deskripsi_pihak_2}}}}.</div>
<div class="ayat">1.3 &nbsp; Para Pihak berpandangan bahwa kerjasama ini akan saling menguntungkan dalam bidang {{{{bidang_kerjasama}}}}.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 2 &mdash; Maksud dan Tujuan</div>
<div class="ayat">2.1 &nbsp; Perjanjian ini dimaksudkan untuk menetapkan kerangka kerjasama antara Para Pihak dalam rangka {{{{tujuan_kerjasama}}}}.</div>
<div class="ayat">2.2 &nbsp; Tujuan kerjasama ini antara lain:</div>
<div class="ayat" style="margin-left:48px;">
  a. {{{{tujuan_1}}}}<br/>
  b. {{{{tujuan_2}}}}<br/>
  c. {{{{tujuan_3}}}}
</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 3 &mdash; Ruang Lingkup Kerjasama</div>
<div class="ayat">3.1 &nbsp; Ruang lingkup kerjasama meliputi:</div>
<div class="ayat" style="margin-left:48px;">
  a. {{{{ruang_lingkup_1}}}}<br/>
  b. {{{{ruang_lingkup_2}}}}<br/>
  c. {{{{ruang_lingkup_3}}}}
</div>
<div class="ayat">3.2 &nbsp; Hal-hal teknis dan operasional pelaksanaan kerjasama akan diatur lebih lanjut dalam Perjanjian Pelaksanaan (Implementation Agreement) yang merupakan bagian tidak terpisahkan dari Perjanjian ini.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 4 &mdash; Hak dan Kewajiban Para Pihak</div>
<div class="ayat">4.1 &nbsp; <strong>Kewajiban Pihak Pertama:</strong></div>
<div class="ayat" style="margin-left:48px;">
  a. {{{{kewajiban_p1_1}}}}<br/>
  b. {{{{kewajiban_p1_2}}}}<br/>
  c. {{{{kewajiban_p1_3}}}}
</div>
<div class="ayat">4.2 &nbsp; <strong>Kewajiban Pihak Kedua:</strong></div>
<div class="ayat" style="margin-left:48px;">
  a. {{{{kewajiban_p2_1}}}}<br/>
  b. {{{{kewajiban_p2_2}}}}<br/>
  c. {{{{kewajiban_p2_3}}}}
</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 5 &mdash; Ketentuan Keuangan</div>
<div class="ayat">5.1 &nbsp; {{{{ketentuan_keuangan}}}}</div>
<div class="ayat">5.2 &nbsp; Biaya operasional bersama akan ditanggung secara proporsional: Pihak Pertama {{{{porsi_biaya_1}}}}% dan Pihak Kedua {{{{porsi_biaya_2}}}}%, kecuali disepakati lain secara tertulis.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 6 &mdash; Kerahasiaan</div>
<div class="ayat">6.1 &nbsp; Masing-masing pihak wajib merahasiakan informasi yang diperoleh dalam rangka pelaksanaan kerjasama ini dan tidak mengungkapkannya kepada pihak ketiga tanpa persetujuan tertulis dari pihak lainnya, kecuali diwajibkan oleh hukum.</div>
<div class="ayat">6.2 &nbsp; Kewajiban kerahasiaan ini tetap berlaku selama {{{{masa_kerahasiaan}}}} tahun setelah berakhirnya Perjanjian ini.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 7 &mdash; Hak Kekayaan Intelektual</div>
<div class="ayat">7.1 &nbsp; Seluruh hak kekayaan intelektual yang ada sebelum ditandatanganinya Perjanjian ini tetap menjadi milik masing-masing pihak.</div>
<div class="ayat">7.2 &nbsp; Hak kekayaan intelektual yang lahir dari kerjasama ini akan diatur dalam perjanjian terpisah.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 8 &mdash; Jangka Waktu dan Perpanjangan</div>
<div class="ayat">8.1 &nbsp; Perjanjian ini berlaku selama <strong>{{{{jangka_waktu}}}} tahun</strong>, terhitung dari tanggal <strong>{{{{tanggal_mulai}}}}</strong> sampai dengan tanggal <strong>{{{{tanggal_berakhir}}}}</strong>.</div>
<div class="ayat">8.2 &nbsp; Perjanjian ini dapat diperpanjang atas kesepakatan tertulis Para Pihak paling lambat {{{{pemberitahuan_perpanjangan}}}} hari kalender sebelum berakhir.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 9 &mdash; Pengakhiran</div>
<div class="ayat">9.1 &nbsp; Perjanjian ini dapat diakhiri sebelum waktunya apabila: (a) salah satu pihak melanggar ketentuan Perjanjian dan tidak memperbaikinya dalam 30 hari sejak pemberitahuan tertulis; (b) salah satu pihak dinyatakan pailit atau dalam keadaan insolven; (c) terjadi keadaan memaksa (<em>force majeure</em>) yang berlangsung lebih dari {{{{masa_force_majeure}}}} hari berturut-turut.</div>
<div class="ayat">9.2 &nbsp; Pengakhiran Perjanjian tidak membebaskan Para Pihak dari kewajiban yang telah timbul sebelum tanggal pengakhiran.</div>
</div>

<div class="pasal">
<div class="pasal-judul">Pasal 10 &mdash; Penyelesaian Perselisihan</div>
<div class="ayat">10.1 &nbsp; Setiap perselisihan diselesaikan melalui musyawarah mufakat dalam 30 hari. Apabila gagal, para pihak sepakat menyelesaikan melalui arbitrase di {{{{lembaga_arbitrase}}}} sesuai peraturannya yang berlaku.</div>
</div>

<div class="sig-section">
<p>Demikian Perjanjian ini dibuat dalam rangkap 2 (dua) bermeterai, masing-masing mempunyai kekuatan hukum yang sama.</p>
<div class="sig-row">
  <div class="sig-block">
    <p><strong>Pihak Pertama</strong><br/>{{{{nama_pihak_1}}}}</p>
    <div class="materai">Materai<br/>Rp 10.000</div>
    <div class="sig-line">{{{{nama_wakil_1}}}}</div>
    <div class="sig-title">{{{{jabatan_wakil_1}}}}</div>
  </div>
  <div class="sig-block">
    <p><strong>Pihak Kedua</strong><br/>{{{{nama_pihak_2}}}}</p>
    <div class="materai">Materai<br/>Rp 10.000</div>
    <div class="sig-line">{{{{nama_wakil_2}}}}</div>
    <div class="sig-title">{{{{jabatan_wakil_2}}}}</div>
  </div>
</div>
</div>
</body></html>"""

KUASA = f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>{CSS}</head><body>
<div class="header">
  <div class="co">{{{{nama_perusahaan}}}}</div>
  <div class="co-sub">{{{{alamat_perusahaan}}}} &nbsp;|&nbsp; Telp. {{{{telepon_perusahaan}}}}</div>
</div>

<div class="doc-title">Surat Kuasa</div>
<div class="doc-no">Nomor: {{{{nomor_surat}}}}</div>

<p>Yang bertanda tangan di bawah ini, selanjutnya disebut <strong>"Pemberi Kuasa"</strong>:</p>
<table class="ft">
  <tr><td>Nama</td><td>:</td><td><strong>{{{{nama_pemberi_kuasa}}}}</strong></td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_pemberi_kuasa}}}}</td></tr>
  <tr><td>Perusahaan</td><td>:</td><td>{{{{nama_perusahaan}}}}</td></tr>
  <tr><td>Alamat</td><td>:</td><td>{{{{alamat_perusahaan}}}}</td></tr>
  <tr><td>NIK / KTP</td><td>:</td><td>{{{{nik_pemberi_kuasa}}}}</td></tr>
</table>

<p style="margin-top:16px;">Dengan ini memberikan kuasa penuh kepada, selanjutnya disebut <strong>"Penerima Kuasa"</strong>:</p>
<table class="ft">
  <tr><td>Nama</td><td>:</td><td><strong>{{{{nama_penerima_kuasa}}}}</strong></td></tr>
  <tr><td>Jabatan</td><td>:</td><td>{{{{jabatan_penerima_kuasa}}}}</td></tr>
  <tr><td>NIK / KTP</td><td>:</td><td>{{{{nik_penerima_kuasa}}}}</td></tr>
  <tr><td>Alamat</td><td>:</td><td>{{{{alamat_penerima_kuasa}}}}</td></tr>
</table>

<h2>Lingkup Kuasa</h2>
<p>Untuk dan atas nama Pemberi Kuasa, melakukan tindakan-tindakan hukum berikut:</p>
<ol style="margin-left:20px; line-height:2.2;">
  <li>{{{{kuasa_1}}}}</li>
  <li>{{{{kuasa_2}}}}</li>
  <li>{{{{kuasa_3}}}}</li>
  <li>{{{{kuasa_4}}}}</li>
</ol>

<p>Termasuk untuk menandatangani dokumen, surat, atau perjanjian yang diperlukan dalam rangka pelaksanaan kuasa di atas, serta melakukan segala tindakan yang diperlukan yang berkaitan langsung dengan hal-hal tersebut.</p>

<h2>Masa Berlaku</h2>
<p>Surat kuasa ini berlaku terhitung sejak tanggal <strong>{{{{tanggal_mulai}}}}</strong> sampai dengan tanggal <strong>{{{{tanggal_berakhir}}}}</strong>, atau sampai selesainya pelaksanaan kuasa yang dimaksud, mana yang lebih dahulu.</p>

<h2>Ketentuan Khusus</h2>
<div class="note">
  {{{{ketentuan_khusus}}}}
</div>

<p>Kuasa ini diberikan tanpa hak substitusi. Segala tindakan yang dilakukan oleh Penerima Kuasa dalam batas-batas kuasa ini adalah sah dan mengikat Pemberi Kuasa.</p>

<div class="sig-section">
<p>Demikian Surat Kuasa ini dibuat dengan sesungguhnya di {{{{kota}}}}, pada tanggal {{{{tanggal_surat}}}}.</p>
<div class="sig-row">
  <div class="sig-block">
    <p>Pemberi Kuasa</p>
    <div class="materai">Materai<br/>Rp 10.000</div>
    <div class="sig-line">{{{{nama_pemberi_kuasa}}}}</div>
    <div class="sig-title">{{{{jabatan_pemberi_kuasa}}}}</div>
    <div class="sig-title">{{{{nama_perusahaan}}}}</div>
  </div>
  <div class="sig-block">
    <p>Penerima Kuasa</p>
    <div class="sig-space"></div>
    <div class="sig-line">{{{{nama_penerima_kuasa}}}}</div>
    <div class="sig-title">{{{{jabatan_penerima_kuasa}}}}</div>
  </div>
</div>
</div>
</body></html>"""

for tid, name, body in [
    (IDS["nda"],   "NDA",   NDA),
    (IDS["mou"],   "MOU",   MOU),
    (IDS["kuasa"], "Kuasa", KUASA),
]:
    v, err = post_version(tid, body)
    if v: print(f"  [OK v{v}]  {name}")
    else: print(f"  [ERR]    {name}: {err}")
