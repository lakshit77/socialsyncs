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

export type PlatformCredentialsInput = z.infer<
  typeof platformCredentialsSchema
>;
