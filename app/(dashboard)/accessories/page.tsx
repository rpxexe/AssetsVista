"use client";

import React from "react";
import AccessoryForm from "@/components/forms/Accessories/AccessoryForm";
import { AccessoriesTable } from "@/components/tables/accessories";
import { Keyboard } from "lucide-react";

const AccessoriesPage = () => {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <Keyboard strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold">All Accessories</h3>
      </div>
      <div className="flex justify-end mt-4">
        <AccessoryForm />
      </div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-1 gap-4 auto-rows-min">
        <div className="h-full">
          <AccessoriesTable />
        </div>
      </div>
    </div>
  );
};

export default AccessoriesPage;

