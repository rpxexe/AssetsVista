"use client"
import ManufacturerForm from "@/components/forms/settings/manufacturer/ManufacturerForm";
import { ManufacturerTable } from "@/components/tables/manufacturers";
import { Factory } from "lucide-react";

const Manfacturer = () => {
  return (
    <div className="p-4 pt-0 space-y-4">
      <div className="border rounded-[2.5em] p-4 w-full flex items-center space-x-2">
        <Factory strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold">All Manufacturers</h3>
      </div>
      <div className="flex justify-end">
        <ManufacturerForm />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <ManufacturerTable />
      </div>
    </div>
  );
}
export default Manfacturer