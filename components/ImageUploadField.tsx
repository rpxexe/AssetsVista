"use client";

import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  value?: string;
  onChange: (value: string) => void;
  rounded?: "md" | "full";
  placeholder?: string;
  disabled?: boolean;
}

const MAX_RAW_FILE_BYTES = 10 * 1024 * 1024; // 10 MB raw file limit before compression
const MAX_IMAGE_DIMENSION = 480;

function estimateBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return 0;
  const base64Length = dataUrl.length - commaIdx - 1;
  return Math.round((base64Length * 3) / 4);
}

async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file (PNG, JPG, WebP, GIF, or SVG).");
  }
  if (file.size > MAX_RAW_FILE_BYTES) {
    throw new Error("Image file is too large (max 10 MB).");
  }

  // Handle SVG safely without canvas rasterization so vector logos remain sharp
  if (file.type === "image/svg+xml") {
    const svgText = await file.text();
    if (svgText.length > 120 * 1024) {
      throw new Error("SVG file must be under 120 KB.");
    }
    if (/<script[\s>]/i.test(svgText) || /\son\w+=/i.test(svgText)) {
      throw new Error("Unsafe script content detected in SVG.");
    }
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Canvas image processing is unavailable in this browser.");
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Prefer compact WebP (supports transparency & very small footprint) with JPEG fallback
        let dataUrl = canvas.toDataURL("image/webp", 0.82);
        if (!dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", 0.84);
        }

        resolve(dataUrl);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode the selected image file."));
    };

    img.src = objectUrl;
  });
}

export function ImageUploadField({
  value = "",
  onChange,
  rounded = "md",
  placeholder = "https://example.com/image.png",
  disabled = false,
}: ImageUploadFieldProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<"upload" | "url">(() =>
    value && /^https?:\/\//i.test(value) ? "url" : "upload"
  );
  const [urlDraft, setUrlDraft] = useState(() =>
    value && /^https?:\/\//i.test(value) ? value : ""
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setPreviewError(false);
    if (value && /^https?:\/\//i.test(value)) {
      setUrlDraft(value);
    } else if (!value) {
      setUrlDraft("");
    }
  }, [value]);

  const handleFile = async (file: File | undefined | null) => {
    if (!file || disabled) return;
    setIsProcessing(true);
    try {
      const compressed = await compressImageFile(file);
      setPreviewError(false);
      onChange(compressed);
    } catch (err) {
      toast({
        title: "Image Upload Failed",
        description: err instanceof Error ? err.message : "Unable to process image.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClear = () => {
    setUrlDraft("");
    setPreviewError(false);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sizeLabel = React.useMemo(() => {
    if (!value) return null;
    if (value.startsWith("data:image/")) {
      const kb = Math.max(1, Math.round(estimateBase64Bytes(value) / 1024));
      return `Embedded (${kb} KB)`;
    }
    return "External URL";
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-3">
        {/* Live Preview Box */}
        <div
          className={cn(
            "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border bg-background",
            rounded === "full" ? "rounded-full" : "rounded-lg"
          )}
        >
          {value && !previewError ? (
            <img
              src={value}
              alt="Preview"
              className="h-full w-full object-cover"
              onError={() => setPreviewError(true)}
            />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground/60" />
          )}
        </div>

        {/* Upload / URL Controls */}
        <div className="flex-1 min-w-[200px] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-md border bg-background p-0.5 text-xs">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setMode("upload")}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors",
                  mode === "upload"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Upload className="h-3 w-3" />
                Upload File
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setMode("url")}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors",
                  mode === "url"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Link2 className="h-3 w-3" />
                Image URL
              </button>
            </div>

            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={handleClear}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>

          {mode === "upload" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!disabled) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-1.5 text-xs transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/30 hover:border-muted-foreground/60"
              )}
            >
              <span className="text-muted-foreground truncate">
                {isProcessing
                  ? "Optimizing image..."
                  : sizeLabel || "Drop image or click Browse (auto-compressed)"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                disabled={disabled || isProcessing}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isProcessing}
                className="h-7 px-2.5 text-xs shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Browse"
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Input
                type="url"
                disabled={disabled}
                placeholder={placeholder}
                value={urlDraft}
                onChange={(e) => {
                  const next = e.target.value;
                  setUrlDraft(next);
                  setPreviewError(false);
                  onChange(next.trim());
                }}
                className="h-8 text-xs"
              />
            </div>
          )}

          {previewError && value && (
            <p className="text-[11px] text-muted-foreground">
              Preview unavailable for this URL. Double-check the address or upload a file instead.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

