"use client"
import CompanyForm from "@/components/forms/settings/company/CompanyForm";
import { CompanyTable } from "@/components/tables/companies";
import { Building2 } from "lucide-react";

const Company = () => {
  return (
    <div className="p-3 min-h-screen ">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <Building2 strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold ">All Company</h3>
      </div>
      <div className="flex justify-end mt-4"><CompanyForm/></div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-1 gap-4 auto-rows-min">
        <div className="h-full">
          <CompanyTable />
        </div>
      </div>
    </div>
  );
}
export default Company