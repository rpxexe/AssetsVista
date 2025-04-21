"use client"
import ManufacturerForm from "@/components/forms/settings/manufacturer/ManufacturerForm";
import { ManufacturerTable } from "@/components/tables/manufacturers";
import { Factory } from "lucide-react";

const Manfacturer = () => {
  return (
    <div className="p-3 min-h-screen ">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <Factory strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold ">All Manufacturers</h3>
      </div>
      <div className="flex justify-end mt-4">
        <ManufacturerForm />

      </div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-1 gap-4 auto-rows-min">
        <div className="h-full">
          <ManufacturerTable />
        </div>
      </div>
    </div>
  );
}
export default Manfacturer