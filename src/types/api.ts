import type { PostStatus } from "./database";

export interface CreatePostResponse {
  post_id: string;
  container_id: string;
  status: PostStatus;
  status_check_url: string;
}

export interface PostStatusResponse {
  post_id: string;
  platform: string;
  post_type: string;
  status: PostStatus;
  container_id: string | null;
  published_media_id: string | null;
  error_message: string | null;
  created_at: string;
  published_at: string | null;
}

export interface UploadResponse {
  url: string;
  path: string;
}

export interface HealthResponse {
  status: "ok";
  version: string;
  timestamp: string;
}
