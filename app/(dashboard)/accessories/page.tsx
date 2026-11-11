"use client";

import React from "react";
import AccessoryForm from "@/components/forms/Accessories/AccessoryForm";
import { AccessoriesTable } from "@/components/tables/accessories";
import { Keyboard } from "lucide-react";

const AccessoriesPage = () => {
  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <div className="border rounded-[2.5em] p-4 w-full flex items-center space-x-2">
        <Keyboard strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold">All Accessories</h3>
      </div>
      <div className="flex justify-end">
        <AccessoryForm />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <AccessoriesTable />
      </div>
    </div>
  );
};

export default AccessoriesPage;

