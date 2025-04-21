"use client";
import AssetForm from "@/components/forms/Assets/AssetForm";
import { AssetsTable } from "@/components/tables/assets";
import { LibraryBig } from "lucide-react";
const Assets = () => {
  return (
    <div className="p-3 min-h-screen ">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <LibraryBig strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold ">All Assets</h3>
      </div>
      <div className="flex justify-end mt-4">
        <AssetForm />
      </div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-1 gap-4 auto-rows-min">
        <div className="h-full">
          <AssetsTable />
        </div>
      </div>
    </div>
  );
};

export default Assets;
