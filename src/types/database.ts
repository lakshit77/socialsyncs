export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformCredentialRow {
  id: string;
  user_id: string;
  platform: string;
  credentials: {
    access_token: string;
    account_id: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PostStatus =
  | "pending"
  | "processing"
  | "finished"
  | "published"
  | "error";

export interface UserMediaRow {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  public_url: string;
  mime_type: string;
  file_size_bytes: number | null;
  kind: "image" | "video";
  created_at: string;
}

export interface PostRow {
  id: string;
  user_id: string;
  platform: string;
  post_type: string;
  caption: string | null;
  media_urls: string[];
  cover_url: string | null;
  cover_media_id: string | null;
  audio_name: string | null;
  container_id: string | null;
  published_media_id: string | null;
  status: PostStatus;
  error_message: string | null;
  platform_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}
