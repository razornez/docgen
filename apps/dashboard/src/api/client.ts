const STORAGE_KEY = 'docgen_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Endpoint di mana 401 BUKAN berarti sesi kedaluwarsa, melainkan kredensial
 * salah (form login/registrasi). Jangan auto-logout/redirect untuk ini —
 * biarkan form menampilkan pesan errornya sendiri.
 */
const AUTH_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/google/exchange',
  '/owner/login',
]);

// Cegah redirect berulang bila beberapa request 401 bersamaan.
let sessionExpiredHandled = false;

/**
 * Sesi tenant/owner sudah kedaluwarsa atau token tidak valid: bersihkan token
 * yang sesuai lalu paksa kembali ke halaman login. Pakai full reload
 * (window.location) supaya state React & cache query benar-benar bersih —
 * sekaligus memuat ulang bundle terbaru.
 */
function handleSessionExpired(path: string): void {
  if (sessionExpiredHandled) return;

  const isOwner = path.startsWith('/owner');
  const here = window.location.pathname;
  if (isOwner) {
    clearOwnerToken();
    if (!here.startsWith('/owner/login')) {
      sessionExpiredHandled = true;
      window.location.replace('/owner/login?expired=1');
    }
  } else {
    clearStoredToken();
    if (here !== '/login' && here !== '/') {
      sessionExpiredHandled = true;
      window.location.replace('/login?expired=1');
    }
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const t = token ?? getStoredToken();
  const headers: Record<string, string> = {
    ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as Record<string, string>),
  };
  if (t) headers['Authorization'] = `Bearer ${t}`;

  const res = await fetch(`/v1${path}`, { ...init, headers });

  if (!res.ok) {
    let code = 'unknown';
    let message = res.statusText;
    try {
      const body = (await res.json()) as {
        error?: { type?: string; message?: string };
      };
      code = body.error?.type ?? code;
      message = body.error?.message ?? message;
    } catch {
      // ignore parse error
    }
    // Sesi kedaluwarsa → auto-logout + redirect ke login (kecuali form auth).
    if (res.status === 401 && !AUTH_ENDPOINTS.has(path)) {
      handleSessionExpired(path);
    }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ---- Auth (session-based) ----

export interface AuthResult {
  token: string;
}

export function authRegister(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function authLogin(
  email: string,
  password: string,
): Promise<AuthResult> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/** Minta link reset sandi. Selalu balas pesan generik (anti enumeration). */
export function forgotPassword(email: string): Promise<{ message: string }> {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/** Set sandi baru memakai token dari email reset. */
export function resetPassword(
  token: string,
  password: string,
): Promise<{ message: string }> {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

/** Verify a token is still valid by calling /me with it explicitly. */
export function verifyToken(token: string): Promise<MeResult> {
  return request('/me', {}, token);
}

export function getGoogleAuthUrl(): string {
  return '/v1/auth/google';
}

export function exchangeOAuthCode(code: string): Promise<{ token: string }> {
  return request('/auth/google/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

// ---- Account ----

export interface MeResult {
  tenant: {
    id: string;
    name: string;
    status: string;
    country?: string | null;
    default_locale?: string;
    created_at?: string;
  };
  wallet: { balance: number; currency: string };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export function getTeam(): Promise<{ data: TeamMember[] }> {
  return request('/team');
}

export function inviteMember(input: {
  email: string;
  name?: string;
  role: 'admin' | 'member';
}): Promise<{ member: TeamMember }> {
  return request('/team', { method: 'POST', body: JSON.stringify(input) });
}

export function updateMemberRole(
  id: string,
  role: 'admin' | 'member',
): Promise<{ member: TeamMember }> {
  return request(`/team/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export function removeMember(id: string): Promise<{ deleted: boolean }> {
  return request(`/team/${id}`, { method: 'DELETE' });
}

// ---- Owner console (platform-wide) ----

export interface OwnerSummary {
  tenants_active: number;
  revenue_month_idr: number;
  documents_30d: number;
  uptime: number;
  revenue: { week_idr: number; delta_pct: number; days14: number[] };
  queue: {
    workers: number;
    running: number;
    queued: number;
    p95: number | null;
  };
  top_tenants: {
    id: string;
    name: string;
    docs: number;
    revenue_idr: number;
  }[];
  recent_signups: {
    id: string;
    name: string;
    plan: string;
    created_at: string;
  }[];
}

// Token owner disimpan TERPISAH dari token tenant.
const OWNER_TOKEN_KEY = 'docgen_owner_token';
export function getOwnerToken(): string | null {
  return localStorage.getItem(OWNER_TOKEN_KEY);
}
export function setOwnerToken(token: string): void {
  localStorage.setItem(OWNER_TOKEN_KEY, token);
}
export function clearOwnerToken(): void {
  localStorage.removeItem(OWNER_TOKEN_KEY);
}

export function ownerLogin(
  email: string,
  password: string,
): Promise<{ token: string; email: string }> {
  return request(
    '/owner/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    '', // publik — jangan kirim token tenant
  );
}

export function getOwnerSummary(): Promise<OwnerSummary> {
  return request('/owner/summary', {}, getOwnerToken() ?? '');
}

export interface OwnerTenant {
  id: string;
  name: string;
  plan: string;
  docs: number;
  balance: number;
  mrr_idr: number;
  status: string;
}

export function getOwnerTenants(): Promise<{ data: OwnerTenant[] }> {
  return request('/owner/tenants', {}, getOwnerToken() ?? '');
}

export function ownerAddCredit(
  id: string,
  amount: number,
): Promise<{ balance: number }> {
  return request(
    `/owner/tenants/${id}/credit`,
    { method: 'POST', body: JSON.stringify({ amount }) },
    getOwnerToken() ?? '',
  );
}

export interface OwnerRender {
  status_ok: boolean;
  stats: { workers: number; running: number; queued: number; p95: number };
  throughput: { per_day: number; days14: number[] };
  recent_jobs: {
    id: string;
    tenant: string;
    template: string;
    status: string;
    duration_s: number | null;
  }[];
}

export function getOwnerRender(): Promise<OwnerRender> {
  return request('/owner/render', {}, getOwnerToken() ?? '');
}

export interface OwnerBilling {
  mrr_idr: number;
  revenue_30d_idr: number;
  topup_30d_idr: number;
  refund_30d_idr: number;
  plan_split: { prepaid: number; trial: number };
  recent_payments: {
    id: string;
    tenant: string;
    method: string;
    amount_idr: number;
    paid_at: string;
  }[];
}

export function getOwnerBilling(): Promise<OwnerBilling> {
  return request('/owner/billing', {}, getOwnerToken() ?? '');
}

export interface OwnerAudit {
  tenant: { id: string; name: string; status: string; created_at: string };
  balance: number;
  documents: { total: number; completed: number; failed: number };
  lifetime_revenue_idr: number;
  payments_count: number;
  transactions: {
    type: string;
    amount: number;
    balance_after: number;
    ref_type: string | null;
    created_at: string;
  }[];
  payments: {
    amount_idr: number;
    method: string;
    status: string;
    at: string;
  }[];
}

export function getOwnerTenantAudit(id: string): Promise<OwnerAudit> {
  return request(`/owner/tenants/${id}/audit`, {}, getOwnerToken() ?? '');
}

export interface OwnerHealth {
  status_ok: boolean;
  systems: { label: string; ok: boolean; meta: string }[];
  incidents: { title: string; at: string }[];
}

export function getOwnerHealth(): Promise<OwnerHealth> {
  return request('/owner/health', {}, getOwnerToken() ?? '');
}

export interface PublicPricing {
  signup_bonus_credits: number;
  packages: {
    id: string;
    name: string;
    credits: number;
    bonus: number;
    price_idr: number;
    highlight: 'none' | 'popular' | 'hemat';
  }[];
}

/** Harga publik (tanpa auth) — dipakai landing & form daftar. */
export function getPublicPricing(): Promise<PublicPricing> {
  return request('/public/pricing', {}, '');
}

export interface Loc {
  id: string;
  en: string;
}
export interface FooterLink {
  label: Loc;
  href: string;
}
export interface FooterColumn {
  head: Loc;
  items: FooterLink[];
}
export interface CmsPage {
  slug: string;
  title: Loc;
  body: Loc;
}
export interface PublicContent {
  footer_tagline: Loc;
  footer_columns: FooterColumn[];
}
export interface OwnerSiteContent extends PublicContent {
  pages: CmsPage[];
}

/** Konten publik (footer) tanpa auth. */
export function getPublicContent(): Promise<PublicContent> {
  return request('/public/content', {}, '');
}

/** Halaman CMS publik per slug. */
export function getPublicPage(slug: string): Promise<CmsPage> {
  return request(`/public/page/${slug}`, {}, '');
}

export interface OwnerEmailTemplate {
  key: string;
  name: Loc;
  description: Loc;
  variables: string[];
  subject: Loc;
  body: Loc;
  from: string;
  enabled: boolean;
}

export function getOwnerEmails(): Promise<{ templates: OwnerEmailTemplate[] }> {
  return request('/owner/emails', {}, getOwnerToken() ?? '');
}

export function saveOwnerEmails(
  templates: Pick<
    OwnerEmailTemplate,
    'key' | 'subject' | 'body' | 'from' | 'enabled'
  >[],
): Promise<{ saved: boolean }> {
  return request(
    '/owner/emails',
    { method: 'PUT', body: JSON.stringify({ templates }) },
    getOwnerToken() ?? '',
  );
}

export function getOwnerEmailPreview(
  key: string,
  lang: 'id' | 'en',
): Promise<{ subject: string; html: string }> {
  return request(
    `/owner/emails/preview?key=${encodeURIComponent(key)}&lang=${lang}`,
    {},
    getOwnerToken() ?? '',
  );
}

export function getOwnerContent(): Promise<OwnerSiteContent> {
  return request('/owner/content', {}, getOwnerToken() ?? '');
}

export function saveOwnerContent(
  body: OwnerSiteContent,
): Promise<{ saved: boolean }> {
  return request(
    '/owner/content',
    { method: 'PUT', body: JSON.stringify(body) },
    getOwnerToken() ?? '',
  );
}

export interface OwnerPackage {
  id?: string;
  name?: string;
  credits: number;
  bonus: number;
  price_idr: number;
  highlight: 'none' | 'popular' | 'hemat';
  active?: boolean;
}
export interface OwnerSettings {
  signup_bonus_credits: number;
  low_balance_threshold: number;
  packages: OwnerPackage[];
}

export function getOwnerSettings(): Promise<OwnerSettings> {
  return request('/owner/settings', {}, getOwnerToken() ?? '');
}

export function saveOwnerSettings(
  body: OwnerSettings,
): Promise<{ saved: boolean }> {
  return request(
    '/owner/settings',
    { method: 'PUT', body: JSON.stringify(body) },
    getOwnerToken() ?? '',
  );
}

export function getMe(): Promise<MeResult> {
  return request('/me');
}

// ---- Wallet ----

export interface WalletResult {
  balance: number;
  currency: string;
}

export function getWallet(): Promise<WalletResult> {
  return request('/wallet');
}

export interface TxDetail {
  gateway?: string;
  amount_idr?: number;
  payment_ref?: string;
  method?: string;
  template_name?: string;
  item_ref?: string;
  batch_total?: number;
  document_id?: string;
  batch_id?: string;
}

export interface TxItem {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  ref_type: string;
  ref_id: string;
  created_at: string;
  detail?: TxDetail;
}

export interface TxListResult {
  data: TxItem[];
  has_more: boolean;
  next_cursor: string | null;
}

export function getTransactions(cursor?: string): Promise<TxListResult> {
  const q = cursor ? `?cursor=${cursor}` : '';
  return request(`/wallet/transactions${q}`);
}

// ---- Credit packages ----

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_idr: number;
}

export interface PackagesResult {
  data: CreditPackage[];
}

export function getPackages(): Promise<PackagesResult> {
  return request('/wallet/packages');
}

export interface TopupResult {
  payment_id: string;
  amount_idr: number;
  credits: number;
  currency: string;
  /** Publishable key Kasugai (pk_) untuk mount widget di browser. */
  public_key: string;
  /** Base URL Kasugai untuk apiBase widget. */
  kasugai_base_url: string;
  status: string;
}

export function createTopup(input: {
  packageId: string;
}): Promise<TopupResult> {
  return request('/wallet/topups', {
    method: 'POST',
    body: JSON.stringify({ package: input.packageId }),
  });
}

export interface ConfirmTopupResult {
  status: string; // 'pending' | 'paid' | 'failed'
  credited: boolean;
  balance: number;
}

/** Konfirmasi cepat status top-up (server cek ke Kasugai & kredit bila lunas). */
export function confirmTopup(paymentId: string): Promise<ConfirmTopupResult> {
  return request(`/wallet/topups/${paymentId}/confirm`, { method: 'POST' });
}

// ---- Templates ----

export interface TemplateItem {
  id: string;
  name: string;
  category: string;
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateListResult {
  data: TemplateItem[];
  has_more: boolean;
  next_cursor: string | null;
}

export function getTemplates(): Promise<TemplateListResult> {
  return request('/templates');
}

export const TEMPLATE_CATEGORIES = [
  'HR',
  'Legal',
  'Keuangan',
  'Operasional',
  'Marketing',
  'Umum',
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export interface CreateTemplateInput {
  name: string;
  body: string;
  category?: string;
  engine?: string;
  schema?: Record<string, unknown>;
}

export function createTemplate(
  input: CreateTemplateInput,
): Promise<{ template: TemplateItem }> {
  return request('/templates', { method: 'POST', body: JSON.stringify(input) });
}

export function getTemplateCategories(): Promise<{ categories: string[] }> {
  return request('/template-categories');
}

export function importDefaultTemplates(): Promise<{ imported: number }> {
  return request('/templates/import-defaults', { method: 'POST', body: '{}' });
}

// ---- Batches ----

export interface BatchItem {
  id: string;
  status: string;
  total: number;
  completed: number;
  failed: number;
  credits_reserved: number;
  created_at: string;
  completed_at: string | null;
}

export interface BatchListResult {
  data: BatchItem[];
  has_more: boolean;
  next_cursor: string | null;
}

export function getBatches(): Promise<BatchListResult> {
  return request('/batches');
}

export function getBatch(id: string): Promise<BatchItem> {
  return request(`/batches/${id}`);
}

export interface BatchCreateItem {
  ref: string;
  data: Record<string, unknown>;
}

export interface BatchCreateInput {
  template: string;
  items: BatchCreateItem[];
  webhook_url?: string;
}

export function createBatch(
  input: BatchCreateInput,
  signal?: AbortSignal,
): Promise<BatchItem> {
  return request('/batches', {
    method: 'POST',
    body: JSON.stringify(input),
    ...(signal ? { signal } : {}),
  });
}

export interface BatchDocumentItem {
  id: string;
  ref: string | null;
  status: string;
  output_url: string | null;
  page_count: number | null;
  error: string | null;
  created_at: string;
}

export interface BatchDocumentListResult {
  data: BatchDocumentItem[];
  has_more: boolean;
}

export function getBatchDocuments(
  batchId: string,
): Promise<BatchDocumentListResult> {
  return request(`/batches/${batchId}/documents`);
}

export function getTemplateBody(id: string): Promise<{
  template: TemplateItem;
  version: {
    body: string;
    version: number;
    engine?: string;
    /** Data contoh tersimpan (dipakai untuk preview & thumbnail). */
    schema?: Record<string, unknown>;
  };
}> {
  return request(`/templates/${id}`);
}

export function createTemplateVersion(
  id: string,
  body: string,
  schema?: Record<string, unknown>,
): Promise<{ version: { body: string; version: number } }> {
  return request(`/templates/${id}/versions`, {
    method: 'POST',
    body: JSON.stringify(schema !== undefined ? { body, schema } : { body }),
  });
}

export async function previewTemplate(
  id: string,
  data: Record<string, unknown>,
): Promise<string> {
  const t = getStoredToken();
  const res = await fetch(`/v1/templates/${id}/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error('Preview gagal');
  return res.text();
}

// ---- API Keys ----

export interface ApiKeyItem {
  id: string;
  mode: string;
  prefix: string;
  last4: string;
  status: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface ApiKeyListResult {
  data: ApiKeyItem[];
}

export function getApiKeys(): Promise<ApiKeyListResult> {
  return request('/api-keys');
}

export interface CreateKeyInput {
  mode: 'live' | 'test';
  name?: string;
}

export interface CreateKeyResult {
  api_key: ApiKeyItem & { key: string };
}

export function createApiKey(input: CreateKeyInput): Promise<CreateKeyResult> {
  return request('/api-keys', { method: 'POST', body: JSON.stringify(input) });
}

export function revokeApiKey(id: string): Promise<void> {
  return request(`/api-keys/${id}/revoke`, { method: 'POST' });
}

// ---- Webhooks ----

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

export interface WebhookListResult {
  data: WebhookEndpoint[];
}

export function getWebhooks(): Promise<WebhookListResult> {
  return request('/webhooks/endpoints');
}

export interface CreateWebhookInput {
  url: string;
  events: string[];
}

export type CreateWebhookResult = WebhookEndpoint & { secret: string };

export function createWebhook(
  input: CreateWebhookInput,
): Promise<CreateWebhookResult> {
  return request('/webhooks/endpoints', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteWebhook(id: string): Promise<void> {
  return request(`/webhooks/endpoints/${id}`, { method: 'DELETE' });
}
