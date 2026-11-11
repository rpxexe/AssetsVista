"use client";

import React from "react";
import { SkeletonSuspense } from "skullet/react";
import AssetForm from "@/components/forms/Assets/AssetForm";
import { AssetsTable } from "@/components/tables/assets";
import { TablePageSkeleton } from "@/components/skeletons/AppSkeletons";
import { usePermissions } from "@/hooks/usePermissions";
import { LibraryBig } from "lucide-react";

const Assets = () => {
  const { permissions } = usePermissions();

  return (
    <div className="p-4 pt-0 space-y-4">
      <div className="border rounded-[2.5em] p-4 w-full flex items-center space-x-2">
        <LibraryBig strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold">All Assets</h3>
      </div>
      {permissions.canCreateEditAssets && (
        <div className="flex justify-end">
          <AssetForm />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">
        <SkeletonSuspense
            id="assets-page-suspense"
            label="Loading assets"
            skeleton={
              <TablePageSkeleton
                title="Assets"
                columns={["checkbox", "thumb", "mono", "text", "mono", "text", "number", "badge", "text", "actions"]}
              />
            }
          >
            <AssetsTable />
          </SkeletonSuspense>
      </div>
    </div>
  );
};

export default Assets;
