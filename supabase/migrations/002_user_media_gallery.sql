-- Library of uploaded or referenced media per user (gallery + post linkage)
CREATE TABLE public.user_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, storage_path)
);

CREATE INDEX idx_user_media_user_id ON public.user_media(user_id);
CREATE INDEX idx_user_media_user_created ON public.user_media(user_id, created_at DESC);

ALTER TABLE public.user_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media library"
  ON public.user_media FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media library"
  ON public.user_media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media library"
  ON public.user_media FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media library"
  ON public.user_media FOR DELETE
  USING (auth.uid() = user_id);

-- Link posts to media rows (ordered slots for carousel)
CREATE TABLE public.post_media (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES public.user_media(id) ON DELETE RESTRICT,
  sort_order INT NOT NULL,
  PRIMARY KEY (post_id, sort_order)
);

CREATE INDEX idx_post_media_media_id ON public.post_media(media_id);

ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

-- Rows are written only via service role; no end-user policies needed for v1

ALTER TABLE public.posts
  ADD COLUMN cover_media_id UUID REFERENCES public.user_media(id) ON DELETE SET NULL;
