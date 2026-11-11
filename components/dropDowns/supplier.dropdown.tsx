"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SelectOptionsSkullet } from "@/components/skeletons/AppSkeletons";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCachedOptions } from "@/hooks/useCachedOptions";

type Supplier = {
  name: string;
};

interface SupplierProps {
  value: string;
  onChange: (value: string) => void;
}

export function SupplierBox({ value, onChange }: SupplierProps) {
  const { data: suppliers = [], isLoading, isError } = useCachedOptions<Supplier>(
    ["suppliers"],
    "/api/settings/supplier"
  );

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full h-9">
        <SelectValue placeholder="Select a Supplier" />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-48 w-full">
          <SelectGroup>
            <SelectOptionsSkullet
              id="select-suppliers"
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && suppliers.length === 0}
              emptyText="No suppliers found"
            >
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.name} value={supplier.name}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectOptionsSkullet>
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default SupplierBox;
