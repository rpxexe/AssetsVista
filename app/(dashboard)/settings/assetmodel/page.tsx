"use client"

import AssetModelForm from "@/components/forms/settings/assetmodel/AssetModelForm";
import { AssetModelTable } from "@/components/tables/assetModels";
import { Ratio } from "lucide-react";

const AssetModel = () => {
  return (
    <div className="p-4 pt-0 space-y-4">
      <div className="border rounded-[2.5em] p-4 w-full flex items-center space-x-2">
        <Ratio strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold">All Asset Models</h3>
      </div>
      <div className="flex justify-end">
        <AssetModelForm />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <AssetModelTable />
      </div>
    </div>
  );
}
export default AssetModel;