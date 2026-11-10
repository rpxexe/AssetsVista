"use client";

import React, { Suspense } from "react";
import AssetForm from "@/components/forms/Assets/AssetForm";
import { AssetsTable } from "@/components/tables/assets";
import { LibraryBig, Loader2 } from "lucide-react";

const Assets = () => {
  return (
    <div className="p-3 min-h-screen">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <LibraryBig strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold">All Assets</h3>
      </div>
      <div className="flex justify-end mt-4">
        <AssetForm />
      </div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-1 gap-4 auto-rows-min">
        <div className="h-full">
          <Suspense
            fallback={
              <div className="w-full flex items-center justify-center p-8">
                <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
              </div>
            }
          >
            <AssetsTable />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Assets;
