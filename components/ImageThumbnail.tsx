"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Cpu,
  Droplets,
  Factory,
  KeyRound,
  Laptop,
  Layers,
  MapPin,
  Package,
  User,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ImageFallbackKind =
  | "asset"
  | "model"
  | "accessory"
  | "component"
  | "consumable"
  | "license"
  | "person"
  | "company"
  | "location"
  | "manufacturer";

interface ImageThumbnailProps {
  src?: string | null;
  alt: string;
  fallback?: ImageFallbackKind;
  size?: "sm" | "md" | "lg";
  rounded?: "md" | "full";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ImageThumbnailProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const ICON_SIZE_CLASSES: Record<NonNullable<ImageThumbnailProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

function renderFallbackIcon(kind: ImageFallbackKind, className: string) {
  switch (kind) {
    case "asset":
      return <Laptop className={className} />;
    case "model":
      return <Layers className={className} />;
    case "accessory":
      return <Package className={className} />;
    case "component":
      return <Cpu className={className} />;
    case "consumable":
      return <Droplets className={className} />;
    case "license":
      return <KeyRound className={className} />;
    case "person":
      return <User className={className} />;
    case "company":
      return <Building2 className={className} />;
    case "location":
      return <MapPin className={className} />;
    case "manufacturer":
      return <Factory className={className} />;
  }
}

export function ImageThumbnail({
  src,
  alt,
  fallback = "asset",
  size = "md",
  rounded = "md",
  className,
}: ImageThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const shapeClass = rounded === "full" ? "rounded-full" : "rounded-lg";
  const boxClass = SIZE_CLASSES[size];
  const iconClass = cn(ICON_SIZE_CLASSES[size], "text-muted-foreground/70");

  if (!src || hasError) {
    return (
      <div
        title={alt}
        className={cn(
          "flex shrink-0 items-center justify-center border bg-muted/40",
          shapeClass,
          boxClass,
          className
        )}
      >
        {renderFallbackIcon(fallback, iconClass)}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`View image: ${alt}`}
        className={cn(
          "group relative shrink-0 overflow-hidden border bg-background transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring",
          shapeClass,
          boxClass,
          className
        )}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{alt}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center rounded-xl border bg-muted/20 p-4">
            <img
              src={src}
              alt={alt}
              className="max-h-[65vh] w-auto rounded-lg object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

