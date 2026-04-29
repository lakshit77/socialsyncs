-- Generic OAuth connection storage for all platforms (YouTube, Instagram, Facebook, LinkedIn, etc.).
-- Each user has at most one active connection per platform (UNIQUE on user_id, platform).
-- The oauth_provider column distinguishes whether the connection was made through the
-- system-level OAuth app (SaaS mode) or a user-supplied custom OAuth app (self-hosted mode).
CREATE TABLE public.platform_oauth_connections (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Lowercase platform slug, e.g. "youtube", "instagram", "facebook", "linkedin".
  platform                TEXT        NOT NULL,
  -- Platform-side account identifier (channel ID, page ID, profile URN, etc.).
  account_id              TEXT        NOT NULL,
  -- Human-readable account name shown in the UI.
  account_title           TEXT        NOT NULL,
  -- AES-256-GCM encrypted refresh token stored as "<iv_hex>:<tag_hex>:<ciphertext_hex>".
  refresh_token_encrypted TEXT        NOT NULL,
  -- Cached encrypted access token; NULL when cache is cold.
  access_token_encrypted  TEXT,
  -- UTC timestamp at which the cached access token expires.
  token_expiry            TIMESTAMPTZ,
  -- "system" = environment-variable credentials (SaaS); "custom" = user-supplied OAuth app.
  oauth_provider          TEXT        NOT NULL CHECK (oauth_provider IN ('system', 'custom')),
  -- The client_id used to obtain these tokens; required to perform refresh with the same app.
  client_id_used          TEXT        NOT NULL,
  -- AES-256-GCM encrypted client_secret; only populated when oauth_provider = 'custom'.
  client_secret_encrypted TEXT,
  -- "active"       = tokens valid and usable.
  -- "expired"      = refresh token rejected (invalid_grant); user must reconnect.
  -- "disconnected" = user explicitly revoked/disconnected.
  status                  TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'expired', 'disconnected')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform)
);

ALTER TABLE public.platform_oauth_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own platform oauth connections"
  ON public.platform_oauth_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own platform oauth connections"
  ON public.platform_oauth_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own platform oauth connections"
  ON public.platform_oauth_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own platform oauth connections"
  ON public.platform_oauth_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER platform_oauth_connections_updated_at
  BEFORE UPDATE ON public.platform_oauth_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_platform_oauth_connections_user_platform
  ON public.platform_oauth_connections(user_id, platform);

CREATE INDEX idx_platform_oauth_connections_status
  ON public.platform_oauth_connections(status);
