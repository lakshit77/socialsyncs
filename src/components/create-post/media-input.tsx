"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { MediaGalleryGrid } from "@/components/gallery/media-gallery-grid";
import { registerExternalUserMedia } from "@/lib/register-external-user-media";
import { createClient } from "@/lib/supabase/client";
import type { UserMediaRow } from "@/types/database";
import type { MediaKind, SelectedMediaItem } from "@/types/media";
import { Upload, Link as LinkIcon, Images } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaInputProps {
  accept?: string;
  galleryItems: UserMediaRow[];
  allowedKinds: readonly MediaKind[];
  value: SelectedMediaItem | null;
  onChange: (value: SelectedMediaItem | null) => void;
}

type Mode = "upload" | "url" | "gallery";

export function MediaInput({
  accept = "image/jpeg,image/png,image/webp",
  galleryItems,
  allowedKinds,
  value,
  onChange,
}: MediaInputProps) {
  const [mode, setMode] = useState<Mode>("upload");
  const [urlInput, setUrlInput] = useState("");
  const [urlWorking, setUrlWorking] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const { upload, isUploading, progress, error: uploadError } = useMediaUpload();

  async function handleFileSelect(file: File) {
    const result = await upload(file);
    if (result) {
      onChange({ mediaId: result.mediaId, publicUrl: result.publicUrl });
    }
  }

  async function handleUrlSubmit() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    setUrlWorking(true);
    setUrlError(null);
    try {
      const supabase = createClient();
      await supabase.auth.getSession();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUrlError("Sign in to add a URL.");
        return;
      }

      const res = await registerExternalUserMedia(
        supabase,
        user.id,
        trimmed,
        allowedKinds
      );
      if (res.ok) {
        onChange({ mediaId: res.mediaId, publicUrl: res.publicUrl });
        setUrlInput("");
      } else {
        setUrlError(res.error);
      }
    } finally {
      setUrlWorking(false);
    }
  }

  function pickFromGallery(row: UserMediaRow) {
    onChange({ mediaId: row.id, publicUrl: row.public_url });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 p-1 bg-surface rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
            mode === "upload"
              ? "bg-surface-elevated text-foreground shadow-sm"
              : "text-text-muted hover:text-foreground"
          )}
        >
          <Upload size={14} strokeWidth={1.8} />
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setMode("gallery")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
            mode === "gallery"
              ? "bg-surface-elevated text-foreground shadow-sm"
              : "text-text-muted hover:text-foreground"
          )}
        >
          <Images size={14} strokeWidth={1.8} />
          Gallery
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
            mode === "url"
              ? "bg-surface-elevated text-foreground shadow-sm"
              : "text-text-muted hover:text-foreground"
          )}
        >
          <LinkIcon size={14} strokeWidth={1.8} />
          Paste URL
        </button>
      </div>

      {mode === "upload" ? (
        <>
          <FileUpload
            accept={accept}
            onFileSelect={handleFileSelect}
            preview={value?.publicUrl ?? null}
            onRemove={() => onChange(null)}
            disabled={isUploading}
          />
          {uploadError && <p className="text-xs text-error">{uploadError}</p>}
          {isUploading && (
            <div className="space-y-1">
              <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-text-muted text-right">
                {progress}% uploaded
              </p>
            </div>
          )}
        </>
      ) : mode === "gallery" ? (
        <MediaGalleryGrid
          items={galleryItems}
          allowedKinds={allowedKinds}
          selectedId={value?.mediaId ?? null}
          onSelect={pickFromGallery}
        />
      ) : (
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="https://example.com/media.jpg"
              icon={LinkIcon}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            />
          </div>
          <button
            type="button"
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim() || urlWorking}
            className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      )}

      {mode === "url" && urlError && (
        <p className="text-xs text-error">{urlError}</p>
      )}
    </div>
  );
}
