"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { MediaInput } from "./media-input";
import { CarouselBuilder } from "./carousel-builder";
import { usePostStatus } from "@/hooks/use-post-status";
import type { InstagramPostType } from "@/lib/validators";
import type { UserMediaRow } from "@/types/database";
import type { SelectedMediaItem } from "@/types/media";
import {
  ImageIcon,
  Film,
  Video,
  LayoutGrid,
  Clapperboard,
  ArrowLeft,
  Send,
  CheckCircle,
  Music,
} from "lucide-react";

interface PostFormProps {
  availablePlatforms: string[];
  galleryItems: UserMediaRow[];
}

type Step = "type" | "media" | "details" | "submitting" | "result";

const POST_TYPES: {
  id: InstagramPostType;
  label: string;
  description: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  mediaLabel: string;
  acceptsVideo: boolean;
}[] = [
  {
    id: "image",
    label: "Image Post",
    description: "Share a single photo with caption",
    icon: ImageIcon,
    mediaLabel: "image",
    acceptsVideo: false,
  },
  {
    id: "story_image",
    label: "Story (Image)",
    description: "Post an image to your story",
    icon: Film,
    mediaLabel: "image",
    acceptsVideo: false,
  },
  {
    id: "story_video",
    label: "Story (Video)",
    description: "Post a video to your story",
    icon: Video,
    mediaLabel: "video",
    acceptsVideo: true,
  },
  {
    id: "reel",
    label: "Reel",
    description: "Share a short-form video reel",
    icon: Clapperboard,
    mediaLabel: "video",
    acceptsVideo: true,
  },
  {
    id: "carousel",
    label: "Carousel",
    description: "Share multiple images in one post",
    icon: LayoutGrid,
    mediaLabel: "images",
    acceptsVideo: false,
  },
];

export function PostForm({
  availablePlatforms,
  galleryItems,
}: PostFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [postType, setPostType] = useState<InstagramPostType | null>(null);
  const [primaryMedia, setPrimaryMedia] = useState<SelectedMediaItem | null>(
    null
  );
  const [carouselItems, setCarouselItems] = useState<SelectedMediaItem[]>([]);
  const [coverItem, setCoverItem] = useState<SelectedMediaItem | null>(null);
  const [caption, setCaption] = useState("");
  const [audioName, setAudioName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resultPostId, setResultPostId] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<string | null>(null);

  const { status: polledStatus } = usePostStatus({
    postId: resultPostId ?? "",
    initialStatus: (resultStatus as "processing") ?? "processing",
    enabled: !!resultPostId && resultStatus === "processing",
  });

  const hasInstagram = availablePlatforms.includes("instagram");
  const selectedTypeConfig = POST_TYPES.find((t) => t.id === postType);
  const needsCaption =
    postType === "image" || postType === "reel" || postType === "carousel";
  const isCarousel = postType === "carousel";
  const isReel = postType === "reel";

  async function handleSubmit() {
    const mediaIds = isCarousel
      ? carouselItems.map((m) => m.mediaId)
      : primaryMedia
        ? [primaryMedia.mediaId]
        : [];

    if (!postType || mediaIds.length === 0) return;

    setSubmitting(true);
    setError(null);
    setStep("submitting");

    try {
      const body: Record<string, unknown> = {
        platform: "instagram",
        post_type: postType,
        media_ids: mediaIds,
      };
      if (caption) body.caption = caption;
      if (isReel && coverItem) body.cover_media_id = coverItem.mediaId;
      if (audioName && isReel) body.audio_name = audioName;

      const res = await fetch("/api/v1/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error.message);
      }

      setResultPostId(json.data.post_id);
      setResultStatus(json.data.status);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
      setStep("details");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasInstagram) {
    return (
      <Card className="text-center py-12">
        <p className="text-text-muted mb-4">
          No platforms connected. Add your credentials in Settings to start
          posting.
        </p>
        <Button onClick={() => router.push("/settings")}>Go to Settings</Button>
      </Card>
    );
  }

  if (step === "result" && resultPostId) {
    const finalStatus = polledStatus ?? resultStatus;
    return (
      <Card className="text-center py-12">
        <div className="flex flex-col items-center gap-4">
          {finalStatus === "published" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle
                  size={28}
                  className="text-success"
                  strokeWidth={1.8}
                />
              </div>
              <h2 className="text-xl font-bold tracking-[-0.8px] font-[family-name:var(--font-heading)]">
                Post Published!
              </h2>
              <p className="text-text-muted text-sm">
                Your post has been successfully published to Instagram.
              </p>
            </>
          ) : (
            <>
              <StatusBadge status={finalStatus as "processing"} />
              <h2 className="text-xl font-bold tracking-[-0.8px] font-[family-name:var(--font-heading)]">
                Post Created
              </h2>
              <p className="text-text-muted text-sm">
                Your post is being processed. This may take a few moments.
              </p>
            </>
          )}
          <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={() => router.push("/history")}>
              View History
            </Button>
            <Button
              onClick={() => {
                setStep("type");
                setPostType(null);
                setPrimaryMedia(null);
                setCarouselItems([]);
                setCoverItem(null);
                setCaption("");
                setAudioName("");
                setResultPostId(null);
                setResultStatus(null);
              }}
            >
              Create Another
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (step === "submitting") {
    return (
      <Card className="text-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Creating your post...</p>
        </div>
      </Card>
    );
  }

  const mediaContinueDisabled = isCarousel
    ? carouselItems.length < 2
    : !primaryMedia;

  return (
    <div className="max-w-2xl space-y-6">
      {step === "type" && (
        <>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="processing">Instagram</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {POST_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  setPostType(type.id);
                  setPrimaryMedia(null);
                  setCarouselItems([]);
                  setCoverItem(null);
                  setStep("media");
                }}
                className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-elevated hover:border-primary/40 hover:bg-primary/5 transition-colors text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                  <type.icon
                    size={20}
                    strokeWidth={1.8}
                    className="text-foreground"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {type.label}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {type.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "media" && postType && (
        <>
          <button
            type="button"
            onClick={() => setStep("type")}
            className="flex items-center gap-1 text-sm text-text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} strokeWidth={1.8} />
            Back to post types
          </button>

          <Card>
            <h2 className="text-base font-bold tracking-[-0.8px] font-[family-name:var(--font-heading)] mb-4">
              Add {selectedTypeConfig?.mediaLabel}
            </h2>

            {isCarousel ? (
              <CarouselBuilder
                galleryItems={galleryItems}
                items={carouselItems}
                onChange={setCarouselItems}
              />
            ) : (
              <MediaInput
                galleryItems={galleryItems}
                allowedKinds={
                  selectedTypeConfig?.acceptsVideo
                    ? (["video"] as const)
                    : (["image"] as const)
                }
                accept={
                  selectedTypeConfig?.acceptsVideo
                    ? "video/mp4,video/quicktime"
                    : "image/jpeg,image/png,image/webp"
                }
                value={primaryMedia}
                onChange={setPrimaryMedia}
              />
            )}

            <div className="mt-6 flex justify-end">
              <Button
                disabled={mediaContinueDisabled}
                onClick={() => setStep("details")}
              >
                Continue
              </Button>
            </div>
          </Card>
        </>
      )}

      {step === "details" && postType && (
        <>
          <button
            type="button"
            onClick={() => setStep("media")}
            className="flex items-center gap-1 text-sm text-text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} strokeWidth={1.8} />
            Back to media
          </button>

          <Card>
            <h2 className="text-base font-bold tracking-[-0.8px] font-[family-name:var(--font-heading)] mb-4">
              Post Details
            </h2>

            <div className="space-y-4">
              {needsCaption && (
                <Textarea
                  id="caption"
                  label="Caption"
                  placeholder="Write your caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  charCount={{ current: caption.length, max: 2200 }}
                />
              )}

              {isReel && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground">
                      Cover image (optional)
                    </p>
                    <p className="text-xs text-text-muted">
                      Upload, pick from gallery, or paste an image URL.
                    </p>
                    <MediaInput
                      galleryItems={galleryItems}
                      allowedKinds={["image"] as const}
                      accept="image/jpeg,image/png,image/webp"
                      value={coverItem}
                      onChange={setCoverItem}
                    />
                  </div>
                  <Input
                    id="audio_name"
                    label="Audio Name (optional)"
                    placeholder="Original audio"
                    icon={Music}
                    value={audioName}
                    onChange={(e) => setAudioName(e.target.value)}
                  />
                </>
              )}

              {error && (
                <div className="bg-error/10 border border-error/20 text-error text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setStep("media")}>
                  Back
                </Button>
                <Button onClick={handleSubmit} loading={submitting}>
                  <Send size={14} strokeWidth={1.8} />
                  Publish Now
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
