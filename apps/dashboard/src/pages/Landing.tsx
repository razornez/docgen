import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const features = [
  {
    title: 'Kirim JSON, dapat PDF',
    desc: 'Satu panggilan API: kirim data, terima PDF rapi dalam hitungan detik.',
    icon: '📄',
  },
  {
    title: 'Template HTML milikmu sendiri',
    desc: 'Desain bebas dengan HTML & CSS — atur tata letak, font, dan logo sesukamu.',
    icon: '🎨',
  },
  {
    title: 'Generate massal',
    desc: 'Butuh seribu invoice sekaligus? Kirim sekali, kami proses paralel dan kabari saat selesai.',
    icon: '⚡',
  },
  {
    title: 'Bayar sesuai pakai',
    desc: 'Mulai dengan 100 dokumen gratis. Top-up kapan saja. Saldo tidak hangus, tanpa tagihan bulanan.',
    icon: '💳',
  },
  {
    title: 'Aman',
    desc: 'Data dienkripsi saat dikirim dan saat disimpan, serta terpisah antar pelanggan.',
    icon: '🔒',
  },
  {
    title: 'Bayar lokal',
    desc: 'QRIS, Virtual Account, atau e-wallet — dalam Rupiah, tanpa kartu kredit.',
    icon: '🇮🇩',
  },
];

const steps = [
  {
    num: '1',
    title: 'Buat template',
    desc: 'Tulis HTML dengan bagian yang bisa diisi data, simpan sekali.',
  },
  { num: '2', title: 'Kirim data (JSON)', desc: 'Panggil API dengan datamu.' },
  {
    num: '3',
    title: 'Dapat PDF',
    desc: 'Kami isi template dan kirim PDF-nya.',
  },
];

const packages = [
  { label: 'Gratis', credits: '100', price: 'saat daftar', highlight: false },
  {
    label: '1.000 kredit',
    credits: '1.000',
    price: '~Rp 300/kredit',
    highlight: false,
  },
  {
    label: '10.000 kredit',
    credits: '10.000',
    price: '~Rp 200/kredit',
    highlight: true,
  },
  {
    label: '100.000 kredit',
    credits: '100.000',
    price: '~Rp 120/kredit',
    highlight: false,
  },
];

const faqs = [
  {
    q: 'Apakah perlu kartu kredit?',
    a: 'Tidak. Daftar gratis dan bayar pakai QRIS, Virtual Account, atau e-wallet dalam Rupiah.',
  },
  {
    q: 'Apa itu 1 kredit?',
    a: '1 kredit mencakup sampai 5 halaman. Kebanyakan dokumen (invoice, sertifikat, slip gaji) cuma 1 halaman, jadi 1 kredit = 1 dokumen.',
  },
  {
    q: 'Apakah saldo hangus?',
    a: 'Tidak. Saldo tetap sampai dipakai, tanpa tagihan bulanan.',
  },
  {
    q: 'Dokumen apa saja yang bisa dibuat?',
    a: 'Apa pun yang bisa kamu desain dengan HTML — invoice, faktur, sertifikat, kontrak, slip gaji, surat jalan, dan lainnya.',
  },
];

export default function LandingPage() {
  const { token } = useAuth();
  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="font-bold text-xl tracking-tight text-indigo-700">
          DocGen
        </span>
        <div className="flex items-center gap-4 text-sm">
          <a
            href="#harga"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Harga
          </a>
          <a
            href="#faq"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            FAQ
          </a>
          <Link
            to="/login"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Masuk
          </Link>
          <Link
            to="/login"
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Daftar gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 leading-tight">
          Generate dokumen massal lewat API.{' '}
          <span className="text-indigo-600">Kirim JSON, dapat PDF rapi.</span>
        </h1>
        <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto">
          Buat invoice, sertifikat, kontrak, dan slip gaji secara otomatis —
          ribuan sekaligus. Pakai template HTML-mu sendiri, bayar sesuai pakai
          dalam Rupiah.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            to="/login"
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Daftar gratis
          </Link>
          <a
            href="#cara-kerja"
            className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Lihat cara kerja
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          Tanpa kartu kredit · 100 dokumen gratis · Tanpa langganan
        </p>
      </section>

      {/* Code snippet */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="bg-gray-900 rounded-2xl p-6 text-sm font-mono text-gray-300 overflow-x-auto">
          <div className="text-gray-500 mb-3"># Generate invoice lewat API</div>
          <div>
            <span className="text-blue-400">curl</span>
            <span className="text-gray-300">
              {' '}
              -X POST https://api.docgen.id/v1/documents \
            </span>
          </div>
          <div className="ml-4">
            <span className="text-green-400"> -H</span>
            <span className="text-yellow-300">
              {' '}
              "Authorization: Bearer sk_live_…"
            </span>
            <span className="text-gray-300"> \</span>
          </div>
          <div className="ml-4">
            <span className="text-green-400"> -H</span>
            <span className="text-yellow-300">
              {' '}
              "Content-Type: application/json"
            </span>
            <span className="text-gray-300"> \</span>
          </div>
          <div className="ml-4">
            <span className="text-green-400"> -d</span>
            <span className="text-gray-300">
              {' '}
              {
                '\'{"template":"tmpl_abc","data":{"nama":"Budi","total":"Rp 1.200.000"}}\''
              }
            </span>
          </div>
          <div className="mt-3 text-gray-500">
            {'# → {"output_url":"https://...pdf","credits_charged":1}'}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Fitur
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ title, desc, icon }) => (
              <div
                key={title}
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="cara-kerja" className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Cara Kerja (3 Langkah)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {num}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Kenapa Pilih Kami
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-xl border border-gray-200 text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-gray-500 font-medium"></th>
                  <th className="px-5 py-3 text-center text-indigo-700 font-semibold">
                    Kami
                  </th>
                  <th className="px-5 py-3 text-center text-gray-500 font-medium">
                    Penyedia global
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  [
                    'Pembayaran',
                    'Rupiah — QRIS, VA, e-wallet',
                    'Kartu kredit, USD',
                  ],
                  [
                    'Model',
                    'Prepaid, sesuai pakai, saldo tidak hangus',
                    'Langganan bulanan',
                  ],
                  ['Gratis di awal', '100 dokumen', '20–50 dokumen/bulan'],
                  [
                    'Harga',
                    '1 kredit per 5 halaman, mulai ~Rp 120',
                    '~Rp 300–2.000 per dokumen',
                  ],
                  [
                    'Dokumen Indonesia',
                    'Faktur pajak, slip gaji, surat jalan',
                    'Umumnya tidak',
                  ],
                  ['Bahasa dukungan', 'Bahasa Indonesia, lokal', 'Inggris'],
                ].map(([label, ours, theirs]) => (
                  <tr key={label}>
                    <td className="px-5 py-3 font-medium text-gray-700">
                      {label}
                    </td>
                    <td className="px-5 py-3 text-center text-indigo-700 font-medium">
                      {ours}
                    </td>
                    <td className="px-5 py-3 text-center text-gray-400">
                      {theirs}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Harga
          </h2>
          <p className="text-center text-gray-500 mb-12">
            Bayar hanya untuk yang kamu pakai. 1 kredit mencakup sampai 5
            halaman.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map(({ label, credits, price, highlight }) => (
              <div
                key={label}
                className={`rounded-xl border p-6 text-center ${
                  highlight
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {highlight && (
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                    Populer
                  </span>
                )}
                <p
                  className={`text-2xl font-bold mt-2 ${highlight ? 'text-indigo-700' : 'text-gray-900'}`}
                >
                  {credits}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">kredit</p>
                <p
                  className={`text-sm font-medium mt-3 ${highlight ? 'text-indigo-600' : 'text-gray-600'}`}
                >
                  {price}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">
            Tanpa langganan · Saldo tidak hangus · Bayar via QRIS / VA /
            e-wallet
          </p>
        </div>
      </section>

      {/* Security */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Keamanan</h2>
          <p className="text-gray-500 leading-relaxed">
            Datamu dienkripsi saat dikirim (HTTPS) dan saat disimpan. Data tiap
            pelanggan terpisah — tidak ada yang bisa melihat dokumen pelanggan
            lain. Tautan unduh berumur pendek demi melindungi dokumen sensitif.
            API key disimpan dalam bentuk hash, tidak pernah teks polos.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            FAQ
          </h2>
          <div className="space-y-6">
            {faqs.map(({ q, a }) => (
              <div key={q} className="border-b border-gray-100 pb-6">
                <p className="font-semibold text-gray-900 mb-2">{q}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Mulai gratis hari ini
          </h2>
          <p className="text-indigo-200 mb-8">
            100 dokumen gratis, tanpa kartu kredit.
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm"
          >
            Daftar sekarang
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span className="font-semibold text-gray-700">DocGen</span>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-gray-700 transition-colors">
              Dokumentasi API
            </a>
            <a href="#harga" className="hover:text-gray-700 transition-colors">
              Harga
            </a>
            <a href="#" className="hover:text-gray-700 transition-colors">
              Syarat &amp; Ketentuan
            </a>
            <a href="#" className="hover:text-gray-700 transition-colors">
              Kebijakan Privasi
            </a>
            <a href="#" className="hover:text-gray-700 transition-colors">
              Kontak
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
