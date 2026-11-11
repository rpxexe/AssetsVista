import React, { use } from "react";
import { AssetDetailView } from "@/components/assets/AssetDetailView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AssetViewPage({ params }: PageProps) {
  const { id } = use(params);
  return <AssetDetailView id={id} />;
}

