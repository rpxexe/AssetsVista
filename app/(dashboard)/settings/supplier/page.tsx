"use client"
import SupplierForm from "@/components/forms/settings/suppliers/SuppliersForm";
import { SupplierTable } from "@/components/tables/supplier";
import { Cable } from "lucide-react";

const Supplier = () => {
  return (
    <div className="p-3 min-h-screen ">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <Cable strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold ">All Suppliers</h3>
      </div>
      <div className="flex justify-end mt-4"><SupplierForm/></div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-1 gap-4 auto-rows-min">
        <div className="h-full">
          <SupplierTable/>
        </div>
      </div>
    </div>
  );
}
export default Supplier