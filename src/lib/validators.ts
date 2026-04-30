import { z } from "zod/v4";

export const SUPPORTED_PLATFORMS = ["instagram"] as const;
export type Platform = (typeof SUPPORTED_PLATFORMS)[number];

export const INSTAGRAM_POST_TYPES = [
  "image",
  "story_image",
  "story_video",
  "reel",
  "carousel",
] as const;
export type InstagramPostType = (typeof INSTAGRAM_POST_TYPES)[number];

export const createPostSchema = z.object({
  platform: z.enum(SUPPORTED_PLATFORMS),
  post_type: z.enum(INSTAGRAM_POST_TYPES),
  caption: z.string().max(2200).optional(),
  media_ids: z
    .array(z.string().uuid())
    .min(1, "At least one media item is required")
    .max(10, "Maximum 10 media items allowed"),
  cover_media_id: z.string().uuid().optional(),
  cover_url: z.string().url().optional(),
  audio_name: z.string().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const platformCredentialsSchema = z.object({
  platform: z.enum(SUPPORTED_PLATFORMS),
  credentials: z.object({
    access_token: z.string().min(1, "Access token is required"),
    account_id: z.string().min(1, "Account ID is required"),
  }),
});

export type PlatformCredentialsInput = z.infer<typeof platformCredentialsSchema>;

export const youtubeAutomateSchema = z.object({
  videoId: z.string().min(1, "videoId is required"),
});

export type YouTubeAutomateInput = z.infer<typeof youtubeAutomateSchema>;

export const createApiKeySchema = z.object({
  name: z.string().min(1, "name is required").max(64),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

// Safely coerces string "true"/"false" to boolean without treating any
// non-empty string as true (which z.coerce.boolean() does incorrectly).
const booleanFromAny = z.preprocess((val) => {
  if (typeof val === "boolean") return val;
  if (val === "true" || val === "1") return true;
  if (val === "false" || val === "0") return false;
  return val;
}, z.boolean());

export const youtubeSyncSchema = z.object({
  maxVideos: z.coerce.number().int().min(1).max(50).default(5),
  fetchTranscript: booleanFromAny.default(true),
  skipIfNoCaptions: booleanFromAny.default(false),
  filter: z.enum(["all", "long", "short"]).default("all"),
});

export type YouTubeSyncInput = z.infer<typeof youtubeSyncSchema>;

export const youtubeAutomateLatestSchema = z.object({
  maxVideos: z.coerce.number().int().min(1).max(50).default(5),
  runLimit: z.coerce.number().int().min(1).max(10).default(1),
  requireTranscript: booleanFromAny.default(false),
  autoPostOverride: booleanFromAny.optional(),
  filter: z.enum(["all", "long", "short"]).default("all"),
});

export type YouTubeAutomateLatestInput = z.infer<typeof youtubeAutomateLatestSchema>;
