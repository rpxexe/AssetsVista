"use client";

import { SkeletonBox } from "skullet/react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("overflow-hidden rounded-md", className)}
      {...props}
    >
      <SkeletonBox width="100%" height="100%" radius="inherit" className="block" />
    </div>
  );
}

export { Skeleton };
