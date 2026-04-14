"use client";

import { cn } from "@/lib/utils";
import { Upload, X, FileImage, FileVideo } from "lucide-react";
import { useCallback, useState, useRef } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onRemove?: () => void;
  accept?: string;
  preview?: string | null;
  className?: string;
  disabled?: boolean;
}

export function FileUpload({
  onFileSelect,
  onRemove,
  accept = "image/jpeg,image/png,image/webp,video/mp4",
  preview,
  className,
  disabled,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      e.target.value = "";
    },
    [onFileSelect]
  );

  if (preview) {
    const isVideo = preview.includes("video") || preview.endsWith(".mp4");
    return (
      <div className={cn("relative group rounded-xl overflow-hidden border border-border", className)}>
        {isVideo ? (
          <div className="flex items-center justify-center h-40 bg-surface">
            <FileVideo size={32} className="text-text-muted" strokeWidth={1.8} />
            <span className="ml-2 text-sm text-text-muted">Video selected</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            className="w-full h-40 object-cover"
          />
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 bg-charcoal/70 hover:bg-charcoal rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={14} className="text-white" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-surface/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-2">
        {isDragging ? (
          <FileImage size={28} className="text-primary" strokeWidth={1.8} />
        ) : (
          <Upload size={28} className="text-text-muted" strokeWidth={1.8} />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">
            {isDragging ? "Drop your file here" : "Click or drag file to upload"}
          </p>
          <p className="text-xs text-text-muted mt-1">
            JPEG, PNG, WebP, or MP4 (max 50MB)
          </p>
        </div>
      </div>
    </div>
  );
}
