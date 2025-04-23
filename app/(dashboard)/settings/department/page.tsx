"use client";

import DepartmentForm from "@/components/forms/settings/department/DepartmentForm";
import { DepartmentTable } from "@/components/tables/departments";
import { Users } from "lucide-react";

const Department = () => {
  return (
    <div className="p-3 min-h-screen ">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <Users strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold ">All Departments</h3>
      </div>
      <div className="flex justify-end mt-4"><DepartmentForm/></div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-1 gap-4 auto-rows-min">
        <div className="h-full">
          <DepartmentTable />
        </div>
      </div>
    </div>
  );
};
export default Department;