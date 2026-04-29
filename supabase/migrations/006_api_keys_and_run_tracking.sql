-- Per-user API keys for headless/n8n access to the SocialSyncs API.
-- Only the bcrypt hash is stored; the plaintext key is shown once on creation.
CREATE TABLE public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys"
  ON public.user_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys"
  ON public.user_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys"
  ON public.user_api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys"
  ON public.user_api_keys FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_api_keys_user_id ON public.user_api_keys(user_id);
-- Partial index for fast lookup of active (non-revoked) keys by prefix during auth.
CREATE INDEX idx_user_api_keys_prefix ON public.user_api_keys(prefix)
  WHERE revoked_at IS NULL;

-- Run-level tracking for YouTube comment automation jobs.
-- Each row represents one automation attempt for a (user, video) pair.
CREATE TABLE public.youtube_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'completed', 'failed')),
  -- Stage timestamps
  synced_at TIMESTAMPTZ,
  transcript_fetched_at TIMESTAMPTZ,
  automation_started_at TIMESTAMPTZ,
  automation_completed_at TIMESTAMPTZ,
  -- Reply counters
  processed INTEGER NOT NULL DEFAULT 0,
  queued INTEGER NOT NULL DEFAULT 0,
  posted INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.youtube_automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own automation runs"
  ON public.youtube_automation_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own automation runs"
  ON public.youtube_automation_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own automation runs"
  ON public.youtube_automation_runs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_youtube_automation_runs_user_video
  ON public.youtube_automation_runs(user_id, video_id, created_at DESC);

CREATE INDEX idx_youtube_automation_runs_status
  ON public.youtube_automation_runs(status);
