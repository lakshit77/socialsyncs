export type InstagramPostType =
  | "image"
  | "story_image"
  | "story_video"
  | "reel"
  | "carousel";

export interface InstagramGraphApiResponse {
  id: string;
}

export interface InstagramStatusResponse {
  id: string;
  status_code: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";
}

export interface InstagramGraphApiError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}
