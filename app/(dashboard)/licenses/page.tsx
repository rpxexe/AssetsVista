"use client";

import React, { Suspense } from "react";
import LicenseForm from "@/components/forms/Licenses/LicenseForm";
import { LicenseTable } from "@/components/tables/licenses";

import { FileChartPie, Loader2 } from "lucide-react";

const Licenses = () => {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 ">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <FileChartPie strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold ">All Licenses</h3>
      </div>
      <div className="flex justify-end mt-4">
        <LicenseForm />
      </div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-1 gap-4 auto-rows-min">
        <div className="h-full">
          <Suspense
            fallback={
              <div className="w-full flex items-center justify-center p-8">
                <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
              </div>
            }
          >
            <LicenseTable />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Licenses;
