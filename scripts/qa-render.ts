/* eslint-disable no-undef */
/**
 * QA render runner (Tahap 4) — menguji alur JSON→PDF end-to-end terhadap
 * server HIDUP: register → buat template → POST /v1/documents → unduh signed
 * URL → verifikasi byte PDF → GET /v1/documents/{id}.
 *
 * PRASYARAT (di shell lain): Postgres + Redis hidup, lalu:
 *   pnpm db:migrate
 *   pnpm dev:worker     # WAJIB — yang menjalankan Chromium
 *   pnpm dev:api
 *
 * Pakai:  pnpm qa:render            (default BASE=http://localhost:3001)
 *         BASE=http://localhost:3001 pnpm qa:render
 */
const BASE = process.env.BASE ?? 'http://localhost:3001';
const RUN = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

type Json = unknown;
let passCount = 0;
let failCount = 0;

function ok(name: string): void {
  passCount += 1;
  console.log(`  ✓ ${name}`);
}
function bad(name: string, detail: string): void {
  failCount += 1;
  console.log(`  ✗ ${name}\n      ${detail}`);
}

async function req(
  method: string,
  path: string,
  opts: { bearer?: string; body?: Json } = {},
): Promise<{ status: number; data: Json; text: string }> {
  const headers: Record<string, string> = {};
  if (opts.bearer) headers.Authorization = `Bearer ${opts.bearer}`;
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  const text = await res.text();
  let data: Json = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* biarkan teks */
  }
  return { status: res.status, data, text };
}

function pick(data: Json, path: string): Json {
  let cur: Json = data;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, Json>)[part];
  }
  return cur;
}

async function main(): Promise<void> {
  console.log(`== DocGen QA render (Tahap 4) ==\nBASE=${BASE}\n`);

  // Preflight: Postgres harus sehat (Redis juga, karena render butuh antrian).
  let health;
  try {
    health = await req('GET', '/health');
  } catch (err) {
    console.error(
      `API tidak terjangkau di ${BASE}: ${err instanceof Error ? err.message : String(err)}\n` +
        'Jalankan: pnpm dev:worker (terminal 1) lalu pnpm dev:api (terminal 2).',
    );
    process.exit(2);
    return;
  }
  if (pick(health.data, 'checks.redis.ok') !== true) {
    console.error(
      `Redis tidak sehat — render butuh antrian. /health => ${health.text}`,
    );
    process.exit(2);
    return;
  }

  // 1) Register tenant → key
  let r = await req('POST', '/v1/tenants', {
    body: { name: 'QA Render', email: `render-${RUN}@qa.test`, country: 'ID' },
  });
  const key = String(pick(r.data, 'api_key.key'));
  if (r.status === 201 && key.startsWith('sk_')) ok('register tenant');
  else return void bad('register tenant', `status=${r.status} ${r.text}`);

  // 2) Buat template
  r = await req('POST', '/v1/templates', {
    bearer: key,
    body: {
      name: `inv-${RUN}`,
      body: '<!doctype html><html><body><h1>Invoice {{number}}</h1><p>{{customer.name}} — {{total}}</p></body></html>',
    },
  });
  const templateId = String(pick(r.data, 'template.id'));
  if (r.status === 201 && templateId.startsWith('tpl_')) ok('buat template');
  else return void bad('buat template', `status=${r.status} ${r.text}`);

  // 3) POST /v1/documents (render sync) — butuh worker hidup
  r = await req('POST', '/v1/documents', {
    bearer: key,
    body: {
      template: templateId,
      data: {
        number: 'INV-001',
        customer: { name: 'Acme' },
        total: 'Rp 1.500.000',
      },
      options: { format: 'A4' },
    },
  });
  if (r.status !== 201) {
    return void bad(
      'render dokumen',
      `status=${r.status} ${r.text}\n      (apakah 'pnpm dev:worker' berjalan?)`,
    );
  }
  if (pick(r.data, 'status') === 'completed') ok('dokumen completed');
  else
    bad('dokumen completed', `status field=${String(pick(r.data, 'status'))}`);

  const pageCount = pick(r.data, 'page_count');
  if (typeof pageCount === 'number' && pageCount >= 1)
    ok(`page_count=${pageCount}`);
  else bad('page_count', `=${String(pageCount)}`);

  if (pick(r.data, 'credits_charged') === 0)
    ok('credits_charged=0 (belum billing)');
  else bad('credits_charged', `=${String(pick(r.data, 'credits_charged'))}`);

  const documentId = String(pick(r.data, 'id'));
  const outputUrl = String(pick(r.data, 'output_url'));

  // 4) Unduh signed URL → verifikasi byte PDF
  if (!outputUrl.startsWith('http')) {
    return void bad('output_url', `=${outputUrl}`);
  }
  const dl = await fetch(outputUrl);
  const buf = Buffer.from(await dl.arrayBuffer());
  const magic = buf.subarray(0, 5).toString('latin1');
  if (dl.status === 200 && magic === '%PDF-' && buf.length > 500) {
    ok(`unduh signed URL → PDF (${buf.length} byte, '${magic}')`);
  } else {
    bad('unduh PDF', `status=${dl.status} magic='${magic}' size=${buf.length}`);
  }
  const ctype = dl.headers.get('content-type') ?? '';
  if (ctype.includes('application/pdf')) ok('content-type application/pdf');
  else bad('content-type', `=${ctype}`);

  // 5) GET /v1/documents/{id} → signed URL baru tanpa render ulang
  r = await req('GET', `/v1/documents/${documentId}`, { bearer: key });
  if (
    r.status === 200 &&
    String(pick(r.data, 'output_url')).startsWith('http')
  ) {
    ok('GET dokumen → signed URL baru');
  } else {
    bad('GET dokumen', `status=${r.status} ${r.text}`);
  }

  console.log(`\n================ RINGKASAN ================`);
  console.log(`PASS=${passCount}  FAIL=${failCount}`);
  console.log(
    failCount === 0 ? 'SEMUA LULUS' : 'ADA KEGAGALAN — lihat di atas',
  );
  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error(
    'Runner gagal:',
    err instanceof Error ? err.message : String(err),
  );
  process.exit(2);
});
