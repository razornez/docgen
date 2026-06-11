/**
 * Data & helper murni untuk halaman Templates (tanpa React). Dipisah dari
 * Templates.tsx demi keterbacaan (SRP): konstanta tampilan kategori, HTML
 * placeholder, ekstraksi variabel, dan pemetaan data dummy Indonesia.
 */

export const PLACEHOLDER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; margin: 40px; }
  h1 { font-size: 16pt; }
</style>
</head>
<body>
  <h1>{{judul}}</h1>
  <p>Kepada Yth. <strong>{{nama}}</strong>,</p>
  <p>{{isi}}</p>
</body>
</html>`;

export const CATEGORY_CHIP: Record<string, string> = {
  HR: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
  Legal: 'bg-violet-50 text-violet-600 ring-1 ring-violet-200',
  Keuangan: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
  Operasional: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
  Marketing: 'bg-pink-50 text-pink-600 ring-1 ring-pink-200',
  Umum: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

export const CATEGORY_DOT: Record<string, string> = {
  HR: 'bg-blue-400',
  Legal: 'bg-violet-400',
  Keuangan: 'bg-emerald-400',
  Operasional: 'bg-orange-400',
  Marketing: 'bg-pink-400',
  Umum: 'bg-slate-300',
};

export const CATEGORY_ICON: Record<string, string> = {
  HR: 'bg-blue-100 text-blue-500',
  Legal: 'bg-violet-100 text-violet-500',
  Keuangan: 'bg-emerald-100 text-emerald-500',
  Operasional: 'bg-orange-100 text-orange-500',
  Marketing: 'bg-pink-100 text-pink-500',
  Umum: 'bg-slate-100 text-slate-400',
};

export const inputCls =
  'w-full bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all placeholder:text-slate-300';

/** Ambil daftar variabel unik {{var}} dari HTML template. */
export function extractVars(html: string): string[] {
  const matches = [...html.matchAll(/\{\{(\w+)\}\}/g)];
  return [
    ...new Set(
      matches.map((m) => m[1]).filter((v): v is string => v !== undefined),
    ),
  ];
}

const DUMMY_VALUES: Record<string, string> = {
  nama: 'Budi Santoso',
  nama_lengkap: 'Budi Santoso',
  nama_karyawan: 'Budi Santoso',
  nama_pegawai: 'Budi Santoso',
  nama_penerima: 'Siti Rahayu',
  nama_direktur: 'Ahmad Fauzi, S.E.',
  nama_manager: 'Dian Pertiwi',
  nama_hrd: 'Rina Wulandari',
  nama_penjual: 'PT Maju Bersama',
  nama_pembeli: 'PT Karya Sejahtera',
  nama_perusahaan: 'PT Maju Bersama Indonesia',
  nama_pengirim: 'Arief Budiman',
  jabatan: 'Senior Software Engineer',
  jabatan_baru: 'Lead Engineer',
  jabatan_lama: 'Software Engineer',
  posisi: 'Senior Software Engineer',
  divisi: 'Teknologi Informasi',
  departemen: 'Engineering',
  tanggal: '09 Juni 2026',
  tanggal_mulai: '01 Juli 2026',
  tanggal_selesai: '31 Desember 2026',
  tanggal_lahir: '15 Maret 1990',
  tanggal_bergabung: '01 Januari 2020',
  tanggal_keluar: '31 Desember 2025',
  tanggal_kontrak: '09 Juni 2026',
  tanggal_ttd: '09 Juni 2026',
  periode: 'Januari – Juni 2026',
  tahun: '2026',
  bulan: 'Juni',
  gaji: 'Rp 15.000.000',
  gaji_pokok: 'Rp 12.000.000',
  tunjangan: 'Rp 3.000.000',
  total_gaji: 'Rp 15.000.000',
  gaji_bersih: 'Rp 13.500.000',
  potongan: 'Rp 1.500.000',
  bonus: 'Rp 5.000.000',
  harga: 'Rp 50.000.000',
  total: 'Rp 50.000.000',
  subtotal: 'Rp 45.000.000',
  pajak: 'Rp 5.000.000',
  nominal: 'Rp 10.000.000',
  jumlah: '5 unit',
  alamat: 'Jl. Sudirman No. 123, Jakarta Pusat 10220',
  alamat_perusahaan: 'Jl. Sudirman No. 123, Jakarta Pusat 10220',
  kota: 'Jakarta',
  tempat: 'Jakarta',
  lokasi: 'Jakarta',
  nomor: 'DOC/2026/001',
  no_surat: 'SK/HRD/2026/001',
  nip: '19900315 202001 1 001',
  nik: '3171015503900001',
  no_kontrak: 'KTR/2026/001',
  no_po: 'PO/2026/001',
  no_referensi: 'REF/2026/001',
  judul: 'Surat Keterangan Kerja',
  perihal: 'Permohonan Keterangan Kerja',
  keperluan: 'Pengajuan KPR',
  tujuan: 'Keperluan administrasi perbankan',
  isi: 'Dengan ini kami menerangkan bahwa yang bersangkutan benar merupakan karyawan aktif di perusahaan kami.',
  deskripsi: 'Layanan pengembangan perangkat lunak sesuai kebutuhan klien',
  keterangan: 'Dokumen ini diterbitkan untuk keperluan administrasi.',
  alasan: 'Berdasarkan kebutuhan operasional perusahaan.',
  sanksi: 'Peringatan tertulis pertama.',
  pelanggaran: 'Keterlambatan berulang tanpa pemberitahuan.',
  ttd: 'Ahmad Fauzi, S.E.',
  lama_bekerja: '6 tahun',
  status_karyawan: 'Karyawan Tetap',
  jenis_kontrak: 'Kontrak Kerja Tetap',
  penilaian_kinerja: 'sangat baik dan profesional',
  kinerja: 'sangat baik',
  prestasi: 'menyelesaikan proyek tepat waktu dengan kualitas tinggi',
  rekomendasi: 'sangat direkomendasikan',
  email: 'budi.santoso@email.com',
  telepon: '081234567890',
  no_hp: '081234567890',
  no_telepon: '021-12345678',
};

/** Bangun JSON data contoh (dummy Indonesia) untuk variabel template. */
export function buildDummyJson(vars: string[]): string {
  if (vars.length === 0) return '{}';
  const obj: Record<string, string> = {};
  for (const v of vars) {
    const lower = v.toLowerCase();
    if (DUMMY_VALUES[lower]) {
      obj[v] = DUMMY_VALUES[lower];
    } else {
      const key = Object.keys(DUMMY_VALUES).find(
        (k) => lower.includes(k) || k.includes(lower),
      );
      obj[v] = key ? DUMMY_VALUES[key]! : `[${v}]`;
    }
  }
  return JSON.stringify(obj, null, 2);
}
