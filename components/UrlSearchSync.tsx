"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function UrlSearchSyncInner({ onSearch }: { onSearch: (q: string) => void }) {
  const searchParams = useSearchParams();
  const q = searchParams?.get("search");

  useEffect(() => {
    if (q !== null) {
      onSearch(q);
    }
  }, [q, onSearch]);

  return null;
}

export function UrlSearchSync({ onSearch }: { onSearch: (q: string) => void }) {
  return (
    <Suspense fallback={null}>
      <UrlSearchSyncInner onSearch={onSearch} />
    </Suspense>
  );
}

