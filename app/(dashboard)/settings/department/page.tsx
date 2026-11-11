"use client";

import DepartmentForm from "@/components/forms/settings/department/DepartmentForm";
import { DepartmentTable } from "@/components/tables/departments";
import { Users } from "lucide-react";

const Department = () => {
  return (
    <div className="p-4 pt-0 space-y-4">
      <div className="border rounded-[2.5em] p-4 w-full flex items-center space-x-2">
        <Users strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold">All Departments</h3>
      </div>
      <div className="flex justify-end"><DepartmentForm/></div>
      <div className="grid grid-cols-1 gap-4">
        <DepartmentTable />
      </div>
    </div>
  );
};
export default Department;