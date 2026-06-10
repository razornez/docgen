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
    throw new ApiError(res.status, code, message);
  }

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
  tenant: { id: string; name: string; status: string };
  wallet: { balance: number; currency: string };
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
  payment_url: string;
  snap_token: string | null;
  client_key: string | null;
  status: string;
}

export function createTopup(input: {
  packageId: string;
  method: string;
}): Promise<TopupResult> {
  return request('/wallet/topups', {
    method: 'POST',
    body: JSON.stringify({ package: input.packageId, method: input.method }),
  });
}

export interface PaymentMethodItem {
  code: string;
  name: string;
}

export function getPaymentMethods(): Promise<{ data: PaymentMethodItem[] }> {
  return request('/wallet/payment-methods');
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

export function createBatch(input: BatchCreateInput): Promise<BatchItem> {
  return request('/batches', { method: 'POST', body: JSON.stringify(input) });
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
  version: { body: string; version: number };
}> {
  return request(`/templates/${id}`);
}

export function createTemplateVersion(
  id: string,
  body: string,
): Promise<{ version: { body: string; version: number } }> {
  return request(`/templates/${id}/versions`, {
    method: 'POST',
    body: JSON.stringify({ body }),
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
