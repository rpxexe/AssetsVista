"use client"

import AssetModelForm from "@/components/forms/settings/assetmodel/AssetModelForm";
import { AssetModelTable } from "@/components/tables/assetModels";
import { Ratio } from "lucide-react";

const AssetModel = () => {
  return (
    <div className="p-3 min-h-screen ">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <Ratio strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold ">All Asset Models</h3>
      </div>
      <div className="flex justify-end mt-4">
        <AssetModelForm />
        </div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-1 gap-4 auto-rows-min">
        <div className="h-full">
          <AssetModelTable />
        </div>
      </div>
    </div>
  );
}
export default AssetModel;