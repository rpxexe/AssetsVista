"use client";

import React from "react";
import { SkeletonSuspense } from "skullet/react";
import LicenseForm from "@/components/forms/Licenses/LicenseForm";
import { LicenseTable } from "@/components/tables/licenses";
import { TablePageSkeleton } from "@/components/skeletons/AppSkeletons";

import { FileChartPie } from "lucide-react";

const Licenses = () => {
  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <div className="border rounded-[2.5em] p-4 w-full flex items-center space-x-2">
        <FileChartPie strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold">All Licenses</h3>
      </div>
      <div className="flex justify-end">
        <LicenseForm />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <SkeletonSuspense
          id="licenses-page-suspense"
          label="Loading licenses"
          skeleton={
            <TablePageSkeleton
              title="Licenses"
              columns={["checkbox", "thumb", "text", "mono", "text", "number", "date", "actions"]}
            />
          }
        >
          <LicenseTable />
        </SkeletonSuspense>
      </div>
    </div>
  );
};

export default Licenses;
