"use client"
import SupplierForm from "@/components/forms/settings/suppliers/SuppliersForm";
import { SupplierTable } from "@/components/tables/supplier";
import { Cable } from "lucide-react";

const Supplier = () => {
  return (
    <div className="p-4 pt-0 space-y-4">
      <div className="border rounded-[2.5em] p-4 w-full flex items-center space-x-2">
        <Cable strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold">All Suppliers</h3>
      </div>
      <div className="flex justify-end"><SupplierForm/></div>
      <div className="grid grid-cols-1 gap-4">
        <SupplierTable/>
      </div>
    </div>
  );
}
export default Supplier