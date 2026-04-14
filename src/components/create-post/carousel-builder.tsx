"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { MediaGalleryGrid } from "@/components/gallery/media-gallery-grid";
import { registerExternalUserMedia } from "@/lib/register-external-user-media";
import { createClient } from "@/lib/supabase/client";
import type { UserMediaRow } from "@/types/database";
import type { SelectedMediaItem } from "@/types/media";
import {
  Plus,
  X,
  GripVertical,
  Link as LinkIcon,
  Upload,
  Images,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CAROUSEL_KINDS = ["image"] as const;

interface CarouselBuilderProps {
  galleryItems: UserMediaRow[];
  items: SelectedMediaItem[];
  onChange: (items: SelectedMediaItem[]) => void;
}

type AddMode = "upload" | "url" | "gallery";

export function CarouselBuilder({
  galleryItems,
  items,
  onChange,
}: CarouselBuilderProps) {
  const [addMode, setAddMode] = useState<AddMode>("upload");
  const [urlInput, setUrlInput] = useState("");
  const [urlWorking, setUrlWorking] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const { upload, isUploading, progress, error: uploadError } = useMediaUpload();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem(slot: SelectedMediaItem) {
    if (items.length >= 10) return;
    onChange([...items, slot]);
  }

  async function handleFileSelect(file: File) {
    const result = await upload(file);
    if (result) {
      addItem({ mediaId: result.mediaId, publicUrl: result.publicUrl });
    }
  }

  async function handleUrlAdd() {
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
        CAROUSEL_KINDS
      );
      if (res.ok) {
        addItem({ mediaId: res.mediaId, publicUrl: res.publicUrl });
        setUrlInput("");
      } else {
        setUrlError(res.error);
      }
    } finally {
      setUrlWorking(false);
    }
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    onChange(next);
    setDragIndex(index);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted font-medium">
            {items.length}/10 images added (min 2 required)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {items.map((item, index) => (
              <div
                key={item.mediaId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "relative group rounded-lg overflow-hidden border border-border cursor-move",
                  dragIndex === index && "opacity-50"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.publicUrl}
                  alt={`Carousel item ${index + 1}`}
                  className="w-full h-24 object-cover"
                />
                <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/30 transition-colors flex items-center justify-center">
                  <GripVertical
                    size={16}
                    className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="absolute top-1 right-1 w-5 h-5 bg-charcoal/70 hover:bg-charcoal rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X size={10} className="text-white" />
                </button>
                <span className="absolute bottom-1 left-1 text-[10px] font-medium bg-charcoal/70 text-white px-1.5 py-0.5 rounded">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length < 10 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1 p-1 bg-surface rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setAddMode("upload")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                addMode === "upload"
                  ? "bg-surface-elevated text-foreground shadow-sm"
                  : "text-text-muted hover:text-foreground"
              )}
            >
              <Upload size={14} strokeWidth={1.8} />
              Upload
            </button>
            <button
              type="button"
              onClick={() => setAddMode("gallery")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                addMode === "gallery"
                  ? "bg-surface-elevated text-foreground shadow-sm"
                  : "text-text-muted hover:text-foreground"
              )}
            >
              <Images size={14} strokeWidth={1.8} />
              Gallery
            </button>
            <button
              type="button"
              onClick={() => setAddMode("url")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                addMode === "url"
                  ? "bg-surface-elevated text-foreground shadow-sm"
                  : "text-text-muted hover:text-foreground"
              )}
            >
              <LinkIcon size={14} strokeWidth={1.8} />
              URL
            </button>
          </div>

          {addMode === "upload" ? (
            <>
              <FileUpload
                accept="image/jpeg,image/png,image/webp"
                onFileSelect={handleFileSelect}
                disabled={isUploading}
              />
              {uploadError && (
                <p className="text-xs text-error">{uploadError}</p>
              )}
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
          ) : addMode === "gallery" ? (
            <MediaGalleryGrid
              items={galleryItems}
              allowedKinds={CAROUSEL_KINDS}
              onSelect={(row) =>
                addItem({ mediaId: row.id, publicUrl: row.public_url })
              }
            />
          ) : (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="https://example.com/image.jpg"
                    icon={LinkIcon}
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUrlAdd()}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleUrlAdd}
                  disabled={!urlInput.trim() || urlWorking}
                  variant="secondary"
                >
                  <Plus size={14} strokeWidth={1.8} />
                  Add
                </Button>
              </div>
              {urlError && <p className="text-xs text-error">{urlError}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
