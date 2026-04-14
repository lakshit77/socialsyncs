export type { UserMediaRow } from "@/types/database";

export type MediaKind = "image" | "video";

/** One slot of media selected for a post (upload, gallery, or registered pasted URL). */
export interface SelectedMediaItem {
  mediaId: string;
  publicUrl: string;
}
