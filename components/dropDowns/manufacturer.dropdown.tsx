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

type Manufacturer = {
  name: string;
};

interface ManufacturerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ManufacturerBox({ value, onChange }: ManufacturerProps) {
  const { data: manufacturers = [], isLoading, isError } = useCachedOptions<Manufacturer>(
    ["manufacturers"],
    "/api/settings/manufacturer"
  );

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full h-9">
        <SelectValue placeholder="Select a Manufacturer" />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-48 w-full">
          <SelectGroup>
            <SelectOptionsSkullet
              id="select-manufacturers"
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && manufacturers.length === 0}
              emptyText="No manufacturers found"
            >
              {manufacturers.map((manufacturer) => (
                <SelectItem key={manufacturer.name} value={manufacturer.name}>
                  {manufacturer.name}
                </SelectItem>
              ))}
            </SelectOptionsSkullet>
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default ManufacturerBox;
