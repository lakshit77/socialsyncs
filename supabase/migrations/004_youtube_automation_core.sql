-- YouTube videos selected by users for automation.
CREATE TABLE public.youtube_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  transcript TEXT,
  transcript_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, video_id)
);

ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own youtube videos"
  ON public.youtube_videos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own youtube videos"
  ON public.youtube_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own youtube videos"
  ON public.youtube_videos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own youtube videos"
  ON public.youtube_videos FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_youtube_videos_user_video ON public.youtube_videos(user_id, video_id);
CREATE INDEX idx_youtube_videos_created_at ON public.youtube_videos(created_at DESC);

-- Per-video automation behavior and prompting controls.
CREATE TABLE public.youtube_automation_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  auto_post BOOLEAN NOT NULL DEFAULT FALSE,
  like_comments BOOLEAN NOT NULL DEFAULT FALSE,
  system_prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, video_id)
);

ALTER TABLE public.youtube_automation_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own youtube configs"
  ON public.youtube_automation_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own youtube configs"
  ON public.youtube_automation_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own youtube configs"
  ON public.youtube_automation_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own youtube configs"
  ON public.youtube_automation_configs FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER youtube_automation_configs_updated_at
  BEFORE UPDATE ON public.youtube_automation_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_youtube_automation_configs_user_video
  ON public.youtube_automation_configs(user_id, video_id);

-- Stores analyzed comments and reply lifecycle.
CREATE TABLE public.youtube_comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  comment_id TEXT NOT NULL UNIQUE,
  comment_text TEXT NOT NULL,
  author_name TEXT,
  ai_reply TEXT,
  timestamp_reference TEXT,
  should_like BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'posted', 'skipped', 'liked_only')),
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.youtube_comment_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own youtube replies"
  ON public.youtube_comment_replies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own youtube replies"
  ON public.youtube_comment_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own youtube replies"
  ON public.youtube_comment_replies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own youtube replies"
  ON public.youtube_comment_replies FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_youtube_comment_replies_user_video
  ON public.youtube_comment_replies(user_id, video_id);

CREATE INDEX idx_youtube_comment_replies_status
  ON public.youtube_comment_replies(status);
