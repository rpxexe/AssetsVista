"use client";

import React from "react";
import ComponentForm from "@/components/forms/Components/ComponentForm";
import { ComponentsTable } from "@/components/tables/components";
import { Microchip } from "lucide-react";

const ComponentsPage = () => {
  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <div className="border rounded-[2.5em] p-4 w-full flex items-center space-x-2">
        <Microchip strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold">All Components</h3>
      </div>
      <div className="flex justify-end">
        <ComponentForm />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <ComponentsTable />
      </div>
    </div>
  );
};

export default ComponentsPage;

