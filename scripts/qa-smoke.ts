/* eslint-disable no-undef */
/**
 * QA smoke runner — DocGen API (Tahap 1-3). Mengeksekusi Suite A-H dari QA.md
 * terhadap server HIDUP lalu mencetak ringkasan PASS/FAIL. Tanpa dependensi
 * eksternal (pakai fetch & JSON bawaan Node 20). Jalan di Bash maupun PowerShell.
 *
 * Prasyarat (shell lain): docker compose up -d && pnpm db:migrate && pnpm dev:api
 * Pakai:  pnpm qa:smoke        (atau:  BASE=http://localhost:3001 pnpm qa:smoke)
 *
 * Suite manual (A2 matikan Redis, A4 env fail-fast, A5 persistensi, I1 inspeksi
 * log) TIDAK dicakup — lihat QA.md.
 */
const BASE = process.env.BASE ?? 'http://localhost:3001';
const RUN = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

type Json = unknown;
interface Res {
  status: number;
  headers: Headers;
  text: string;
  data: Json;
}

let passCount = 0;
let failCount = 0;

const trunc = (s: string): string => s.replace(/\s+/g, ' ').slice(0, 160);

function ok(name: string): void {
  passCount += 1;
  console.log(`  ✓ ${name}`);
}
function bad(name: string, want: string, got: string, body = ''): void {
  failCount += 1;
  console.log(`  ✗ ${name}\n      want=${want} got=${got} ${trunc(body)}`);
}

async function req(
  method: string,
  path: string,
  opts: { bearer?: string; body?: Json; rawBody?: string } = {},
): Promise<Res> {
  const headers: Record<string, string> = {};
  if (opts.bearer) headers.Authorization = `Bearer ${opts.bearer}`;
  let body: string | undefined;
  if (opts.rawBody !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = opts.rawBody;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  const text = await res.text();
  let data: Json = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* biarkan sebagai teks (mis. preview HTML) */
  }
  return { status: res.status, headers: res.headers, text, data };
}

/** Akses path bertitik: `a.b`, `data.length`, `data.-1.id`. */
function pick(data: Json, path: string): Json {
  let cur: Json = data;
  for (const part of path.split('.')) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      if (part === 'length') return cur.length;
      const idx = part === '-1' ? cur.length - 1 : Number(part);
      cur = cur[idx];
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, Json>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

function expectStatus(name: string, res: Res, want: number): void {
  if (res.status === want) ok(`${name} [${want}]`);
  else bad(name, `code ${want}`, String(res.status), res.text);
}
function expectEq(name: string, actual: Json, want: string | number): void {
  if (String(actual) === String(want)) ok(name);
  else bad(name, String(want), String(actual));
}
function expectJson(
  name: string,
  res: Res,
  path: string,
  want: string | number,
): void {
  expectEq(name, pick(res.data, path), want);
}
function expectHas(name: string, res: Res, needle: string): void {
  if (res.text.includes(needle)) ok(name);
  else bad(name, `contains '${needle}'`, '', res.text);
}
function expectNo(name: string, res: Res, needle: string): void {
  if (!res.text.includes(needle)) ok(name);
  else bad(name, `NOT '${needle}'`, 'found', res.text);
}
function expectNoMatch(name: string, res: Res, re: RegExp): void {
  if (!re.test(res.text)) ok(name);
  else bad(name, `NOT match ${re}`, 'matched', res.text);
}
function expectPrefix(name: string, value: Json, prefix: string): void {
  if (typeof value === 'string' && value.startsWith(prefix)) ok(name);
  else bad(name, `${prefix}*`, String(value));
}

function regBody(
  name: string,
  email: string,
  country?: string,
  mode?: string,
): Json {
  return {
    name,
    email,
    ...(country ? { country } : {}),
    ...(mode ? { mode } : {}),
  };
}

async function main(): Promise<void> {
  console.log(`== DocGen QA smoke ==\nBASE=${BASE}  RUN=${RUN}\n`);

  // --- Preflight ---
  let health: Res;
  try {
    health = await req('GET', '/health');
  } catch (err) {
    console.error(
      `API tidak terjangkau di ${BASE}: ${err instanceof Error ? err.message : String(err)}\n` +
        'Jalankan dulu: docker compose up -d && pnpm db:migrate && pnpm dev:api',
    );
    process.exit(2);
    return;
  }
  if (pick(health.data, 'checks.postgres.ok') !== true) {
    console.error(
      `Postgres tidak sehat (stack belum siap). /health => ${health.text}\n` +
        'Jalankan dulu: docker compose up -d && pnpm db:migrate',
    );
    process.exit(2);
    return;
  }

  console.log('[A] Health');
  expectStatus('A1 health up', health, 200);
  expectJson('A1 status ok', health, 'status', 'ok');

  console.log('\n[B] Registrasi tenant');
  let r = await req('POST', '/v1/tenants', {
    body: regBody(`QA A ${RUN}`, `a-${RUN}@qa.test`, 'ID'),
  });
  expectStatus('B1 create (ID)', r, 201);
  expectJson('B1 default_locale id', r, 'tenant.default_locale', 'id');
  const KEY_A = String(pick(r.data, 'api_key.key'));
  expectPrefix(
    'B1 key sk_live_ (sekali)',
    pick(r.data, 'api_key.key'),
    'sk_live_',
  );

  r = await req('POST', '/v1/tenants', {
    body: regBody(`QA US ${RUN}`, `us-${RUN}@qa.test`, 'US'),
  });
  expectJson('B2 country US -> en', r, 'tenant.default_locale', 'en');

  r = await req('POST', '/v1/tenants', {
    body: regBody(`QA NC ${RUN}`, `nc-${RUN}@qa.test`),
  });
  expectJson('B3 tanpa country -> en', r, 'tenant.default_locale', 'en');

  r = await req('POST', '/v1/tenants', {
    body: regBody(`QA T ${RUN}`, `t-${RUN}@qa.test`, 'ID', 'test'),
  });
  expectPrefix(
    'B4 mode test -> sk_test_',
    pick(r.data, 'api_key.key'),
    'sk_test_',
  );

  const dup = `dup-${RUN}@qa.test`;
  await req('POST', '/v1/tenants', {
    body: regBody(`QA D1 ${RUN}`, dup, 'ID'),
  });
  r = await req('POST', '/v1/tenants', {
    body: regBody(`QA D2 ${RUN}`, dup, 'ID'),
  });
  expectStatus('B5 email duplikat', r, 409);
  expectJson('B5 type conflict', r, 'error.type', 'conflict');

  r = await req('POST', '/v1/tenants', { body: {} });
  expectStatus('B6 body kosong', r, 400);
  expectJson('B6 type invalid_request', r, 'error.type', 'invalid_request');

  r = await req('POST', '/v1/tenants', {
    body: regBody(`QA BC ${RUN}`, `bc-${RUN}@qa.test`, 'Indonesia'),
  });
  expectStatus('B7 country bukan 2 huruf', r, 400);

  r = await req('GET', '/v1/me', { bearer: KEY_A });
  expectStatus('B8 /v1/me', r, 200);
  expectJson('B8 saldo awal 0', r, 'wallet.balance', 0);

  console.log('\n[C] Autentikasi');
  r = await req('GET', '/v1/me');
  expectStatus('C1 tanpa Authorization', r, 401);
  expectJson('C1 type unauthorized', r, 'error.type', 'unauthorized');
  {
    const res = await fetch(`${BASE}/v1/me`, {
      headers: { Authorization: 'Token abc' },
    });
    if (res.status === 401) ok('C2 skema bukan Bearer [401]');
    else bad('C2', '401', String(res.status));
  }
  r = await req('GET', '/v1/me', { bearer: 'abc' });
  expectStatus('C3 token bukan sk_', r, 401);
  r = await req('GET', '/v1/me', {
    bearer: 'dkgen_live_tidakterdaftar000000000',
  });
  expectStatus('C4 key tak terdaftar', r, 401);

  console.log('\n[D] Kelola API key');
  r = await req('POST', '/v1/api-keys', {
    bearer: KEY_A,
    body: { mode: 'test' },
  });
  expectStatus('D1 buat key', r, 201);
  const throwKey = String(pick(r.data, 'api_key.key'));
  const throwId = String(pick(r.data, 'api_key.id'));
  expectPrefix('D1 sk_test_ (sekali)', pick(r.data, 'api_key.key'), 'sk_test_');
  r = await req('GET', '/v1/api-keys', { bearer: KEY_A });
  expectStatus('D2 list', r, 200);
  // Cocokkan pola KEY PENUH (sk_<mode>_ + bagian acak panjang), bukan sekadar
  // substring `prefix` yang memang tampil tersamar di listing.
  expectNoMatch(
    'D2 list tanpa key penuh',
    r,
    /sk_(live|test)_[A-Za-z0-9]{16,}/,
  );
  expectNo('D2 list tanpa key_hash', r, 'key_hash');
  {
    const keys = pick(r.data, 'data');
    const used =
      Array.isArray(keys) && keys.some((k) => pick(k, 'last_used_at') != null);
    if (used) ok('C5 last_used_at ter-update');
    else bad('C5', 'ada last_used_at', 'semua null');
  }
  r = await req('POST', `/v1/api-keys/${throwId}/revoke`, { bearer: KEY_A });
  expectStatus('D3 revoke', r, 200);
  expectJson('D3 status revoked', r, 'api_key.status', 'revoked');
  r = await req('POST', `/v1/api-keys/${throwId}/revoke`, { bearer: KEY_A });
  expectStatus('D4 revoke lagi', r, 404);
  r = await req('POST', '/v1/api-keys/key_tidakada/revoke', { bearer: KEY_A });
  expectStatus('D5 revoke id ngawur', r, 404);
  r = await req('GET', '/v1/me', { bearer: throwKey });
  expectStatus('C6 key dicabut ditolak', r, 401);

  console.log('\n[E] Template & versi');
  const tname = `invoice-${RUN}`;
  r = await req('POST', '/v1/templates', {
    bearer: KEY_A,
    body: {
      name: tname,
      body: '<h1>{{number}}</h1>',
      schema: { type: 'object' },
    },
  });
  expectStatus('E1 buat template', r, 201);
  expectJson('E1 current_version 1', r, 'template.current_version', 1);
  expectJson('E1 version 1', r, 'version.version', 1);
  const tid = String(pick(r.data, 'template.id'));
  expectPrefix('E1 id tpl_', pick(r.data, 'template.id'), 'tpl_');
  r = await req('GET', `/v1/templates/${tid}`, { bearer: KEY_A });
  expectStatus('E2 get template', r, 200);
  expectJson('E2 body v1', r, 'version.body', '<h1>{{number}}</h1>');
  r = await req('POST', `/v1/templates/${tid}/versions`, {
    bearer: KEY_A,
    body: { body: '<h2>v2 {{number}}</h2>' },
  });
  expectStatus('E3 buat versi', r, 201);
  expectJson('E3 version 2', r, 'version.version', 2);
  r = await req('GET', `/v1/templates/${tid}`, { bearer: KEY_A });
  expectJson('E3 current_version 2', r, 'template.current_version', 2);
  r = await req('POST', `/v1/templates/${tid}/preview`, {
    bearer: KEY_A,
    body: { data: { number: 'X' }, version: 1 },
  });
  expectStatus('E4 preview versi 1', r, 200);
  expectHas('E4 versi 1 immutable (h1)', r, '<h1>X</h1>');
  r = await req('POST', '/v1/templates', {
    bearer: KEY_A,
    body: { name: tname, body: 'dup' },
  });
  expectStatus('E5 nama duplikat', r, 409);
  expectJson('E5 type conflict', r, 'error.type', 'conflict');
  r = await req('POST', '/v1/templates', {
    bearer: KEY_A,
    body: { name: '', body: 'x' },
  });
  expectStatus('E9 name kosong', r, 400);
  r = await req('POST', '/v1/templates', {
    bearer: KEY_A,
    body: { name: `eng-${RUN}`, body: 'x', engine: 'pdf' },
  });
  expectStatus('E10 engine selain html', r, 400);

  // Pagination — tenant khusus dgn 3 template
  r = await req('POST', '/v1/tenants', {
    body: regBody(`QA P ${RUN}`, `p-${RUN}@qa.test`, 'ID'),
  });
  const keyP = String(pick(r.data, 'api_key.key'));
  for (const i of [1, 2, 3]) {
    await req('POST', '/v1/templates', {
      bearer: keyP,
      body: { name: `p${i}-${RUN}`, body: 'x' },
    });
  }
  r = await req('GET', '/v1/templates?limit=2', { bearer: keyP });
  expectStatus('E6 list limit 2', r, 200);
  expectJson('E6 data 2 item', r, 'data.length', 2);
  expectJson('E6 has_more true', r, 'has_more', 'true');
  const lastId = String(pick(r.data, 'data.-1.id'));
  r = await req('GET', `/v1/templates?limit=2&starting_after=${lastId}`, {
    bearer: keyP,
  });
  expectJson('E7 halaman 2 (1 item)', r, 'data.length', 1);
  expectJson('E7 has_more false', r, 'has_more', 'false');
  r = await req('GET', '/v1/templates?starting_after=tpl_tidakada', {
    bearer: keyP,
  });
  expectStatus('E8 cursor invalid', r, 400);

  console.log('\n[F] Preview / mesin polos');
  const mkTpl = async (slug: string, body: string): Promise<string> => {
    const c = await req('POST', '/v1/templates', {
      bearer: KEY_A,
      body: { name: `${slug}-${RUN}`, body },
    });
    return String(pick(c.data, 'template.id'));
  };
  const prev = (id: string, data: Json): Promise<Res> =>
    req('POST', `/v1/templates/${id}/preview`, {
      bearer: KEY_A,
      body: { data },
    });

  r = await prev(await mkTpl('f1', '<p>{{name}}</p>'), { name: 'Sam' });
  expectHas('F1 isi var', r, '<p>Sam</p>');
  if ((r.headers.get('content-type') ?? '').includes('text/html'))
    ok('F1 header text/html');
  else bad('F1 header', 'text/html', r.headers.get('content-type') ?? '');
  r = await prev(await mkTpl('f2', '{{total}}'), { total: 77700000 });
  expectHas('F2 angka apa adanya', r, '77700000');
  expectNo('F2 tidak diformat', r, 'Rp');
  r = await prev(await mkTpl('f3', '[{{missing}}]'), {});
  expectHas('F3 var hilang -> kosong', r, '[]');
  r = await prev(await mkTpl('f4', '{{#each items}}<li>{{d}}</li>{{/each}}'), {
    items: [{ d: 'A' }, { d: 'B' }],
  });
  expectHas('F4 each', r, '<li>A</li><li>B</li>');
  r = await prev(await mkTpl('f6', '{{x}}|{{{x}}}'), { x: '<b>&</b>' });
  expectHas('F6 escape {{ }}', r, '&lt;b&gt;');
  expectHas('F6 mentah {{{ }}}', r, '<b>&</b>');
  r = await prev(await mkTpl('f7', '{{rupiah total}}'), { total: 1000 });
  expectStatus('F7 helper kustom -> 422', r, 422);
  expectJson('F7 type render error', r, 'error.type', 'template_render_error');
  r = await prev(await mkTpl('f8', '{{#if x}}tak ditutup'), {});
  expectStatus('F8 sintaks rusak -> 422', r, 422);
  r = await req('GET', '/v1/me', { bearer: KEY_A });
  expectJson('F9 preview tidak menambah saldo', r, 'wallet.balance', 0);

  console.log('\n[G] Isolasi tenant');
  r = await req('POST', '/v1/tenants', {
    body: regBody(`QA B ${RUN}`, `tenantb-${RUN}@qa.test`, 'US'),
  });
  const KEY_B = String(pick(r.data, 'api_key.key'));
  r = await req('GET', '/v1/api-keys', { bearer: KEY_B });
  const keyIdB = String(pick(r.data, 'data.0.id'));
  r = await req('POST', '/v1/templates', {
    bearer: KEY_B,
    body: { name: `secret-${RUN}`, body: 'rahasia {{x}}' },
  });
  const tidB = String(pick(r.data, 'template.id'));
  r = await req('POST', `/v1/api-keys/${keyIdB}/revoke`, { bearer: KEY_A });
  expectStatus('G1 A cabut key B -> 404', r, 404);
  r = await req('GET', '/v1/me', { bearer: KEY_B });
  expectStatus('G1 key B masih aktif', r, 200);
  r = await req('GET', `/v1/templates/${tidB}`, { bearer: KEY_A });
  expectStatus('G3 A get template B -> 404', r, 404);
  r = await req('POST', `/v1/templates/${tidB}/versions`, {
    bearer: KEY_A,
    body: { body: 'x' },
  });
  expectStatus('G4 A buat versi template B -> 404', r, 404);
  r = await req('POST', `/v1/templates/${tidB}/preview`, {
    bearer: KEY_A,
    body: { data: {} },
  });
  expectStatus('G4 A preview template B -> 404', r, 404);
  r = await req('GET', '/v1/templates', { bearer: KEY_A });
  expectNo('G5 list A tak memuat template B', r, tidB);

  console.log('\n[H] Model error & lintas-cutting');
  r = await req('GET', '/v1/anu', { bearer: KEY_A });
  expectStatus('H3 route tak dikenal', r, 404);
  expectJson('H3 type not_found', r, 'error.type', 'not_found');
  // Endpoint yang BELUM dibangun (Tahap 5+) tetap 404. (/v1/documents kini ADA.)
  r = await req('GET', '/v1/wallet', { bearer: KEY_A });
  expectStatus('H5 endpoint di luar lingkup -> 404', r, 404);
  r = await req('POST', '/v1/tenants', { rawBody: '{"name":' });
  expectStatus('H2 JSON rusak -> 400', r, 400);
  r = await req('GET', '/v1/me', { bearer: KEY_A });
  if (r.headers.get('x-request-id')) ok('H1 header x-request-id');
  else bad('H1', 'x-request-id', 'absent');

  console.log('\n================ RINGKASAN ================');
  console.log(`PASS=${passCount}  FAIL=${failCount}`);
  console.log(
    failCount === 0 ? 'SEMUA LULUS' : 'ADA KEGAGALAN — lihat di atas',
  );
  console.log(
    'Catatan: Suite manual (A2 matikan Redis, A4 env fail-fast, A5 persistensi, I1 inspeksi log) lihat QA.md.',
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
