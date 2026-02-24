-- =============================================================================
-- Migration: 001_security_tables
-- Purpose:   Create security tables that could not be applied via drizzle-kit
--            due to a drizzle-kit Zod validation bug with user_bait_brands index.
-- Repeatable: YES — uses IF NOT EXISTS throughout. Safe to run multiple times.
-- Applied:   2026-02-24 (production DB via executeSql)
-- =============================================================================

-- ── competition_setup_tokens ──────────────────────────────────────────────────
-- Stateful single-use tokens for the competition registration setup wizard.
-- Replaces the previous HMAC-based approach (generateSetupToken) with a
-- DB-backed, SHA-256 hashed, 48h expiry, single-use token.
-- Plain-text token is NEVER stored — only SHA-256 hex hash.

CREATE TABLE IF NOT EXISTS competition_setup_tokens (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash        VARCHAR(64)  NOT NULL UNIQUE,     -- SHA-256 hex of plaintext token
  registration_id   UUID         NOT NULL REFERENCES competition_registrations(id) ON DELETE CASCADE,
  expires_at        TIMESTAMP    NOT NULL,             -- created_at + 48 hours
  used_at           TIMESTAMP,                         -- NULL = unused; set on first valid use
  created_at        TIMESTAMP    DEFAULT NOW()
);

-- Fast lookup by registration (e.g. admin queries)
CREATE INDEX IF NOT EXISTS idx_setup_tokens_registration
  ON competition_setup_tokens(registration_id);

-- Partial index on token_hash for unused tokens only — the hot path
CREATE INDEX IF NOT EXISTS idx_setup_tokens_valid
  ON competition_setup_tokens(token_hash)
  WHERE used_at IS NULL;


-- ── processed_stripe_events ───────────────────────────────────────────────────
-- Idempotency table for Stripe webhook events.
-- The event_id PRIMARY KEY guarantees exactly-once processing:
--   1. Webhook handler opens a DB transaction
--   2. Inserts event_id (throws on PK conflict if already processed)
--   3. All subscription/competition updates run in the same transaction
--   4. On conflict → catch → return 200 OK without any business logic

CREATE TABLE IF NOT EXISTS processed_stripe_events (
  event_id      VARCHAR(255)  PRIMARY KEY,         -- Stripe evt_xxx ID
  event_type    VARCHAR(100)  NOT NULL,             -- checkout.session.completed etc.
  livemode      BOOLEAN       NOT NULL,             -- false in test mode
  processed_at  TIMESTAMP     DEFAULT NOW()
);

-- Index for pruning old records (e.g. DELETE WHERE processed_at < NOW() - INTERVAL '90 days')
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at
  ON processed_stripe_events(processed_at DESC);
