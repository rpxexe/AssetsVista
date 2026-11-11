"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

function CreateParamInner({
  onCreate,
  paramName = "create",
}: {
  onCreate: () => void;
  paramName?: string;
}) {
  const searchParams = useSearchParams();
  const triggeredForRef = useRef<string | null>(null);
  const val = searchParams?.get(paramName) ?? null;

  useEffect(() => {
    if ((val === "1" || val === "true") && triggeredForRef.current !== val) {
      triggeredForRef.current = val;
      onCreate();
    } else if (!val) {
      triggeredForRef.current = null;
    }
  }, [val, onCreate]);

  return null;
}

export function CreateParamTrigger({
  onCreate,
  paramName = "create",
}: {
  onCreate: () => void;
  paramName?: string;
}) {
  return (
    <Suspense fallback={null}>
      <CreateParamInner onCreate={onCreate} paramName={paramName} />
    </Suspense>
  );
}

export default CreateParamTrigger;

