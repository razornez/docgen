-- =============================================================
-- Skema DDL — Sistem Generate Dokumen Massal (prepaid credit)
-- Target: PostgreSQL 14+
--
-- Konvensi:
--   * Primary key bertipe TEXT, di-generate aplikasi dengan prefix
--     tipe (mis. ten_, usr_, key_, tpl_, doc_, batch_, pay_, txn_).
--     Alternatif: gunakan UUID + kolom public_id terpisah.
--   * Waktu memakai TIMESTAMPTZ (UTC).
--   * Nilai kredit memakai BIGINT (1 kredit = 1 dokumen secara default).
--   * Nominal uang (IDR) memakai BIGINT dalam rupiah penuh.
--   * Himpunan nilai stabil memakai TEXT + CHECK agar mudah diperluas.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- untuk gen_random_uuid() bila diperlukan

-- -------------------------------------------------------------
-- Trigger generik: memperbarui kolom updated_at otomatis
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- TENANTS — organisasi klien
-- =============================================================
CREATE TABLE tenants (
  id            TEXT PRIMARY KEY,                     -- ten_...
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'suspended', 'closed')),
  kyc_status    TEXT NOT NULL DEFAULT 'none'
                  CHECK (kyc_status IN ('none', 'pending', 'verified', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tenants_updated
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- USERS — anggota tenant. Verifikasi di sini menjadi gerbang
-- pengaktifan bonus (lihat dokumen 04 — Pencegahan Fraud).
-- =============================================================
CREATE TABLE users (
  id                  TEXT PRIMARY KEY,               -- usr_...
  tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  email_verified_at   TIMESTAMPTZ,
  phone               TEXT,
  phone_verified_at   TIMESTAMPTZ,
  -- sinyal anti-fraud yang dicatat saat pendaftaran
  signup_ip           INET,
  signup_fingerprint  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- email unik secara global (mendeteksi identitas dipakai lintas tenant)
CREATE UNIQUE INDEX uq_users_email ON users (lower(email));
CREATE INDEX idx_users_tenant ON users (tenant_id);
CREATE INDEX idx_users_fingerprint ON users (signup_fingerprint);

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- API KEYS — disimpan sebagai hash, tidak pernah plaintext
-- =============================================================
CREATE TABLE api_keys (
  id            TEXT PRIMARY KEY,                     -- key_...
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mode          TEXT NOT NULL CHECK (mode IN ('live', 'test')),
  key_hash      TEXT NOT NULL,                        -- hash (mis. SHA-256) dari rahasia
  prefix        TEXT NOT NULL,                        -- 'sk_live_' / 'sk_test_'
  last4         TEXT NOT NULL,                         -- untuk tampilan
  scopes        TEXT[] NOT NULL DEFAULT '{}',
  ip_allowlist  INET[] ,                               -- opsional
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'revoked')),
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_api_keys_hash ON api_keys (key_hash);
CREATE INDEX idx_api_keys_tenant ON api_keys (tenant_id);

-- =============================================================
-- CREDIT PACKAGES — paket kredit untuk top-up
-- =============================================================
CREATE TABLE credit_packages (
  id          TEXT PRIMARY KEY,                       -- pack_...
  name        TEXT NOT NULL,
  credits     BIGINT NOT NULL CHECK (credits > 0),
  price_idr   BIGINT NOT NULL CHECK (price_idr >= 0),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- TEMPLATES — handle stabil; current_version dipelihara aplikasi
-- =============================================================
CREATE TABLE templates (
  id               TEXT PRIMARY KEY,                  -- tpl_...
  tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  current_version  INT,                               -- nomor versi terbaru
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_templates_tenant_name ON templates (tenant_id, name);

CREATE TRIGGER trg_templates_updated
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- TEMPLATE VERSIONS — immutable; tiap versi menyimpan HTML + schema
-- =============================================================
CREATE TABLE template_versions (
  id               TEXT PRIMARY KEY,                  -- tver_...
  template_id      TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  version          INT NOT NULL CHECK (version > 0),
  engine           TEXT NOT NULL DEFAULT 'html'
                     CHECK (engine IN ('html')),
  body             TEXT NOT NULL,                     -- HTML template
  variable_schema  JSONB NOT NULL,                    -- JSON Schema kontrak data
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- satu nomor versi unik per template; versi tidak diubah setelah dibuat
CREATE UNIQUE INDEX uq_template_versions ON template_versions (template_id, version);

-- =============================================================
-- WALLETS — running total (cache cepat). Sumber kebenaran ada di
-- wallet_transactions. CHECK balance >= 0 sebagai jaring pengaman
-- selain guard atomik di aplikasi.
-- =============================================================
CREATE TABLE wallets (
  tenant_id   TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  balance     BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency    TEXT NOT NULL DEFAULT 'credit',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_wallets_updated
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- PAYMENTS — top-up. Kredit hanya ditambahkan setelah status 'paid'
-- dikonfirmasi via webhook gateway terverifikasi (lihat dokumen 03).
-- =============================================================
CREATE TABLE payments (
  id            TEXT PRIMARY KEY,                     -- pay_...
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  package_id    TEXT REFERENCES credit_packages(id),
  amount_idr    BIGINT NOT NULL CHECK (amount_idr >= 0),
  credits       BIGINT NOT NULL CHECK (credits > 0),
  currency      TEXT NOT NULL DEFAULT 'IDR',
  gateway       TEXT NOT NULL CHECK (gateway IN ('xendit', 'midtrans')),
  gateway_ref   TEXT,                                  -- id transaksi di gateway
  method        TEXT CHECK (method IN ('qris', 'va', 'ewallet', 'card')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at       TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_payments_gateway_ref ON payments (gateway, gateway_ref)
  WHERE gateway_ref IS NOT NULL;
CREATE INDEX idx_payments_tenant_created ON payments (tenant_id, created_at DESC);

CREATE TRIGGER trg_payments_updated
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- WALLET TRANSACTIONS — LEDGER append-only (sumber kebenaran saldo)
--
-- Aturan desain yang ditegakkan di sini:
--   * UNIQUE(type, ref_id) = kunci idempotency untuk debit (per
--     document_id), topup (per payment_id), signup_bonus (per
--     tenant_id). Mencegah double-charge / double-credit / double-bonus.
--   * CHECK tanda amount per tipe: bonus/topup/refund positif,
--     debit negatif, adjustment bebas.
--   * Tabel ini hanya di-INSERT, tidak pernah di-UPDATE/DELETE.
--   * ref_id bersifat polimorfik (menunjuk ke documents / payments /
--     tenants) sehingga sengaja TIDAK diberi foreign key.
-- =============================================================
CREATE TABLE wallet_transactions (
  id             TEXT PRIMARY KEY,                    -- txn_...
  tenant_id      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type           TEXT NOT NULL
                   CHECK (type IN ('signup_bonus', 'topup', 'debit',
                                   'refund', 'adjustment')),
  amount         BIGINT NOT NULL CHECK (amount <> 0),
  balance_after  BIGINT NOT NULL CHECK (balance_after >= 0),
  ref_type       TEXT NOT NULL
                   CHECK (ref_type IN ('document', 'payment', 'signup', 'manual')),
  ref_id         TEXT NOT NULL,
  unit_price     INT NOT NULL DEFAULT 1,              -- biaya kredit/unit saat transaksi
  metadata       JSONB NOT NULL DEFAULT '{}',         -- mis. {"template":"invoice","batch_id":"..."}
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_amount_sign CHECK (
       (type IN ('signup_bonus', 'topup', 'refund') AND amount > 0)
    OR (type = 'debit' AND amount < 0)
    OR (type = 'adjustment')
  )
);

-- kunci idempotency lintas seluruh jenis transaksi
CREATE UNIQUE INDEX uq_wallet_tx_idempotency ON wallet_transactions (type, ref_id);
-- listing ledger per tenant (urut waktu terbaru)
CREATE INDEX idx_wallet_tx_tenant_created ON wallet_transactions (tenant_id, created_at DESC);
-- penelusuran: "kredit ini dipakai untuk apa" (join ke documents)
CREATE INDEX idx_wallet_tx_ref ON wallet_transactions (ref_type, ref_id);

-- =============================================================
-- BATCHES — pekerjaan generate massal (async)
-- =============================================================
CREATE TABLE batches (
  id                TEXT PRIMARY KEY,                 -- batch_...
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id       TEXT NOT NULL REFERENCES templates(id),
  template_version  INT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued', 'processing', 'completed',
                                        'partially_failed', 'failed')),
  total             INT NOT NULL DEFAULT 0 CHECK (total >= 0),
  completed         INT NOT NULL DEFAULT 0 CHECK (completed >= 0),
  failed            INT NOT NULL DEFAULT 0 CHECK (failed >= 0),
  credits_reserved  BIGINT NOT NULL DEFAULT 0 CHECK (credits_reserved >= 0),
  webhook_url       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_batches_tenant_created ON batches (tenant_id, created_at DESC);
CREATE INDEX idx_batches_status ON batches (status);

CREATE TRIGGER trg_batches_updated
  BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- DOCUMENTS — tiap dokumen yang dirender (tunggal maupun item batch)
--   * storage_key menyimpan lokasi objek; signed URL diterbitkan
--     saat dibaca, bukan disimpan.
--   * input_hash mendukung determinisme/dedup.
--   * charged menandai apakah saldo sudah terpotong (commit).
-- =============================================================
CREATE TABLE documents (
  id                TEXT PRIMARY KEY,                 -- doc_...
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id          TEXT REFERENCES batches(id) ON DELETE SET NULL,
  template_id       TEXT NOT NULL REFERENCES templates(id),
  template_version  INT NOT NULL,
  item_ref          TEXT,                              -- 'ref' dari item batch
  status            TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  input_hash        TEXT,                              -- hash payload data
  storage_key       TEXT,                              -- lokasi objek di storage
  page_count        INT,
  charged           BOOLEAN NOT NULL DEFAULT FALSE,
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_tenant_created ON documents (tenant_id, created_at DESC);
CREATE INDEX idx_documents_batch ON documents (batch_id);
CREATE INDEX idx_documents_status ON documents (status);
-- mendukung dedup berbasis determinisme (tenant + versi + input sama)
CREATE INDEX idx_documents_dedup ON documents (tenant_id, template_id, template_version, input_hash);

CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- USAGE EVENTS — proyeksi ringan untuk analitik/pelaporan.
-- Bersifat OPSIONAL: ledger debit (wallet_transactions) tetap
-- kanonik untuk billing. Tabel ini mempercepat agregasi pemakaian.
-- =============================================================
CREATE TABLE usage_events (
  id           TEXT PRIMARY KEY,                      -- use_...
  tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  template_id  TEXT NOT NULL REFERENCES templates(id),
  units        INT NOT NULL DEFAULT 1 CHECK (units > 0),
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_usage_events_document ON usage_events (document_id);
CREATE INDEX idx_usage_events_tenant_time ON usage_events (tenant_id, occurred_at);

-- =============================================================
-- IDEMPOTENCY KEYS — menyimpan response untuk request POST yang
-- menghasilkan dokumen, selama 24 jam. Scoped per tenant.
-- =============================================================
CREATE TABLE idempotency_keys (
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  idem_key      TEXT NOT NULL,
  endpoint      TEXT NOT NULL,
  request_hash  TEXT NOT NULL,                        -- mendeteksi key sama, body beda -> 409
  status_code   INT,
  response_body JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, idem_key)
);

CREATE INDEX idx_idempotency_expiry ON idempotency_keys (expires_at);

-- =============================================================
-- WEBHOOK ENDPOINTS — tujuan webhook keluar milik klien
-- =============================================================
CREATE TABLE webhook_endpoints (
  id          TEXT PRIMARY KEY,                       -- whe_...
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  secret      TEXT NOT NULL,                          -- untuk tanda tangan HMAC
  events      TEXT[] NOT NULL DEFAULT '{}',           -- mis. {'batch.completed','balance.low'}
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_endpoints_tenant ON webhook_endpoints (tenant_id);

-- =============================================================
-- WEBHOOK DELIVERIES — antrian & riwayat pengiriman webhook
-- =============================================================
CREATE TABLE webhook_deliveries (
  id              TEXT PRIMARY KEY,                   -- whd_...
  endpoint_id     TEXT NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts        INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_pending
  ON webhook_deliveries (next_retry_at)
  WHERE status = 'pending';

-- =============================================================
-- CATATAN OPERASIONAL (bukan DDL):
--  * Reserve saldo = satu transaksi DB yang berisi:
--      UPDATE wallets SET balance = balance - :n
--        WHERE tenant_id = :t AND balance >= :n RETURNING balance;
--      INSERT INTO wallet_transactions(type='debit', amount=-:n,
--        balance_after=<hasil RETURNING>, ref_type='document', ref_id=:doc, ...);
--    Bila UPDATE mengembalikan 0 baris -> saldo kurang -> 402, batalkan.
--  * Refund render gagal = transaksi DB serupa dengan type='refund'.
--  * Top-up paid = INSERT wallet_transactions(type='topup',
--      ref_id=<payment_id>) + UPDATE wallets, dalam satu transaksi.
--  * Rekonsiliasi berkala: wallets.balance harus sama dengan
--      SUM(amount) wallet_transactions per tenant.
-- =============================================================
