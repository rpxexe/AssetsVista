"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundBackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/admin");
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleBack} className="gap-2">
      <ArrowLeft className="h-4 w-4" />
      Go Back
    </Button>
  );
}

export default NotFoundBackButton;

